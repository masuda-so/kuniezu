"""Prepare evidence-backed vector overrides without applying them to the map."""

import argparse
from datetime import date
import hashlib
import importlib
import json
from pathlib import Path

inspect_collection = importlib.import_module(
    "tools.geo.codh_reference" if __package__ else "codh_reference"
).inspect_collection

ROOT = Path(__file__).resolve().parents[2]
ROLES = {
    "water": ("inferred-water-area-union", {"Polygon", "MultiPolygon"}),
    "protectedLand": ("protect-land", {"Polygon", "MultiPolygon"}),
    "comparisonShores": ("comparison-shore-lines", {"LineString", "MultiLineString"}),
    "openBoundaries": ("water-mask-boundary", {"LineString", "MultiLineString"}),
}


def calendar(value):
    if (
        not isinstance(value, list)
        or len(value) != 3
        or any(type(v) is not int for v in value)
    ):
        raise ValueError("Expected a year/month/day array")
    return date(*value)


def prepare(manifest_path, output=None, at=None, root=ROOT):
    manifest = json.loads(Path(manifest_path).read_text(encoding="utf-8"))
    if (
        manifest.get("schemaVersion") != 1
        or manifest.get("coordinateOrder") != "longitude-latitude"
    ):
        raise ValueError("Unsupported vector override contract")
    selected = date.fromisoformat(at) if at else None
    root = Path(root).resolve()
    bundles, identifiers = [], set()
    for row in manifest["overrides"]:
        key = row["id"]
        if (
            not key
            or any(c not in "abcdefghijklmnopqrstuvwxyz0123456789-" for c in key)
            or key in identifiers
        ):
            raise ValueError("Invalid or duplicate override identity")
        identifiers.add(key)
        start, end = calendar(row["validFrom"]), calendar(row["validUntil"])
        if (
            start >= end
            or row.get("datePrecision") != "year"
            or row["validFrom"][1:] != [1, 1]
            or row["validUntil"][1:] != [1, 1]
        ):
            raise ValueError("Invalid override period or precision")
        if row.get("exactHistoricalShoreline") is not False:
            raise ValueError(
                "Inferred override must not become an exact historical shoreline"
            )
        source = (root / row["source"]).resolve()
        if not source.is_relative_to(root):
            raise ValueError("Override source is outside the repository")
        raw = source.read_bytes()
        if hashlib.sha256(raw).hexdigest() != row["sha256"]:
            raise ValueError("Override source SHA mismatch")
        data = json.loads(raw)
        inspect_collection(data, "id")
        features = {}
        for feature in data["features"]:
            feature_id = feature["properties"]["id"]
            if feature_id in features:
                raise ValueError("Duplicate source feature identity")
            features[feature_id] = feature
        components = row["components"]
        if set(components) != set(ROLES) or any(
            not values for values in components.values()
        ):
            raise ValueError(
                "Water, protected land, reference shores and open boundaries are inseparable"
            )
        chosen, seen = [], set()
        for role, ids in components.items():
            expected_role, geometry_types = ROLES[role]
            for feature_id in ids:
                if feature_id in seen or feature_id not in features:
                    raise ValueError("Repeated or missing override feature")
                seen.add(feature_id)
                feature = features[feature_id]
                props = feature["properties"]
                if (
                    props.get("role") != expected_role
                    or feature["geometry"]["type"] not in geometry_types
                ):
                    raise ValueError("Override feature role or geometry mismatch")
                # The protected-land feature is a processing constraint, without
                # its own historical date/shoreline assertion. Preserve that absence.
                if (
                    props.get("exactSixteenthCenturyShoreline") is not False
                    and role != "protectedLand"
                ):
                    raise ValueError("Missing source uncertainty")
                if props.get("exactSixteenthCenturyShoreline") is True:
                    raise ValueError(
                        "Protected land must not become an exact shoreline"
                    )
                if (role != "protectedLand" or "targetYears" in props) and props.get(
                    "targetYears"
                ) != [start.year, end.year - 1]:
                    raise ValueError("Source and override target years differ")
                if role == "openBoundaries" and props.get("drawCoastline") is not False:
                    raise ValueError("Open boundary must never be rendered as coast")
                if role == "water":
                    if props.get("drawWholePolygonBoundary") is not False:
                        raise ValueError("Water polygon includes non-shore cuts")
                    if set(props["waterMaskBoundaryIds"]) != set(
                        components["openBoundaries"]
                    ):
                        raise ValueError("Required coastline exclusions are missing")
                chosen.append(feature)
        if selected is None or start <= selected < end:
            # Preserve every selected coordinate and property, including uncertainty.
            bundles.append(
                {
                    "metadata": row,
                    "geojson": {"type": "FeatureCollection", "features": chosen},
                }
            )
    result = {
        "schemaVersion": 1,
        "at": at,
        "overrides": [b["metadata"] for b in bundles],
    }
    if output is not None:
        output = Path(output)
        output.mkdir(parents=True, exist_ok=False)
        for bundle in bundles:
            (output / (bundle["metadata"]["id"] + ".geojson")).write_text(
                json.dumps(
                    bundle["geojson"], ensure_ascii=False, separators=(",", ":")
                ),
                encoding="utf-8",
            )
        (output / "manifest.json").write_text(
            json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--manifest",
        type=Path,
        default=ROOT / "kuniezu/map/edits/vector/manifest.json",
    )
    parser.add_argument("--output", type=Path, help="New output directory")
    parser.add_argument("--at", help="ISO date; start inclusive, end exclusive")
    args = parser.parse_args()
    print(
        json.dumps(
            prepare(args.manifest, args.output, args.at), ensure_ascii=False, indent=2
        )
    )


if __name__ == "__main__":
    main()
