"""Prepare valid CODH reference surfaces while retaining originals and residuals."""

import argparse
import hashlib
import importlib
import json
from pathlib import Path
from tempfile import TemporaryDirectory

import shapely
from shapely.geometry import GeometryCollection, MultiPolygon, mapping, shape

references = importlib.import_module(
    "tools.geo.codh_reference" if __package__ else "codh_reference"
)
ROOT = references.ROOT
prepare_references = references.prepare


def positions(geometry):
    return {tuple(point) for point in shapely.get_coordinates(geometry)}


def parts(geometry):
    if geometry.is_empty:
        return [], []
    if geometry.geom_type == "Polygon":
        return [geometry], []
    if geometry.geom_type in {"MultiPolygon", "GeometryCollection"}:
        polygons, residuals = [], []
        for member in geometry.geoms:
            areas, lines = parts(member)
            polygons.extend(areas)
            residuals.extend(lines)
        return polygons, residuals
    return [], [geometry]


def normalize_layer(data):
    features, leftovers, repairs = [], [], []
    for index, feature in enumerate(data["features"]):
        geometry = feature["geometry"]
        if geometry is None:
            features.append(feature)
            continue
        original = shape(geometry)
        if original.geom_type not in {"Polygon", "MultiPolygon"}:
            raise ValueError("Expected Polygon or MultiPolygon reference")
        if shapely.is_valid(original):
            features.append(feature)
            continue
        fixed = shapely.make_valid(original, method="linework", keep_collapsed=True)
        if not shapely.is_valid(fixed):
            raise ValueError("Invalid result from linework repair")
        old_points, new_points = positions(original), positions(fixed)
        missing = old_points - new_points
        if missing:
            raise ValueError("Linework repair removed source vertices")
        areas, residuals = parts(fixed)
        surface = (
            None if not areas else areas[0] if len(areas) == 1 else MultiPolygon(areas)
        )
        if surface is not None and not shapely.is_valid(surface):
            raise ValueError("Invalid reconstructed surface")
        features.append(
            {**feature, "geometry": mapping(surface) if surface is not None else None}
        )
        if residuals:
            residual = (
                residuals[0] if len(residuals) == 1 else GeometryCollection(residuals)
            )
            leftovers.append({**feature, "geometry": mapping(residual)})
        repairs.append(
            {
                "row": index,
                "featureId": feature.get("id"),
                "reason": str(shapely.is_valid_reason(original)),
                "method": "linework",
                "sourceCoordinatePositions": len(old_points),
                "retainedSourceCoordinatePositions": len(old_points),
                "insertedIntersectionPositions": len(new_points - old_points),
                "surfaceType": surface.geom_type if surface is not None else None,
                "residualParts": len(residuals),
            }
        )
    return (
        {**data, "features": features},
        {
            "type": "FeatureCollection",
            "purpose": "retained-collapsed-linework-not-land-or-coast",
            "features": leftovers,
        },
        repairs,
    )


def union(collection):
    geometries = [
        shape(f["geometry"])
        for f in collection["features"]
        if f["geometry"] is not None
    ]
    geometry = shapely.union_all(geometries)
    if not shapely.is_valid(geometry):
        raise ValueError("Invalid reference surface union")
    return geometry


def surface_collection(geometry, role, components=False):
    if geometry.is_empty:
        features = []
    else:
        if geometry.geom_type not in {
            "Polygon",
            "MultiPolygon",
        } or not shapely.is_valid(geometry):
            raise ValueError("Expected a valid combined surface")
        members = (
            list(geometry.geoms)
            if components and geometry.geom_type == "MultiPolygon"
            else [geometry]
        )
        features = [
            {
                "type": "Feature",
                "id": index,
                "properties": {
                    "role": role,
                    "temporalScope": "Edo-reference-not-Sengoku-assertion",
                },
                "geometry": mapping(member),
            }
            for index, member in enumerate(members)
        ]
    return {"type": "FeatureCollection", "features": features}


def prepare(manifest_path=ROOT / "data/inputs/codh-edo/manifest.json", output=None):
    layers, summaries = {}, []
    with TemporaryDirectory(prefix="kuniezu-codh-topology-") as temporary:
        directory = Path(temporary) / "references"
        sources = prepare_references(manifest_path, directory)
        for key in ("coast-polygons", "lake-polygons"):
            data = json.loads(
                (directory / (key + ".geojson")).read_text(encoding="utf-8")
            )
            surface, residuals, repairs = normalize_layer(data)
            layers[key], layers[key + "-residuals"] = surface, residuals
            source = next(row for row in sources["datasets"] if row["key"] == key)
            summaries.append(
                {
                    "key": key,
                    "source": source,
                    "repairs": repairs,
                    "surfaceFeatures": sum(
                        f["geometry"] is not None for f in surface["features"]
                    ),
                    "residualFeatures": len(residuals["features"]),
                }
            )
    coast, lakes = union(layers["coast-polygons"]), union(layers["lake-polygons"])
    land = shapely.difference(coast, lakes)
    layers["coast-union"] = surface_collection(
        coast, "Edo-reference-land-before-lake-subtraction"
    )
    layers["lake-union"] = surface_collection(lakes, "Edo-reference-lake-union")
    layers["land-with-water"] = surface_collection(
        land, "Edo-reference-land-with-lakes-removed", components=True
    )
    encoded = {
        key + ".geojson": json.dumps(value, ensure_ascii=False, separators=(",", ":"))
        + "\n"
        for key, value in layers.items()
    }
    report = {
        "schemaVersion": 1,
        "sourceManifestSha256": hashlib.sha256(Path(manifest_path).read_bytes()).hexdigest(),
        "temporalScope": "Edo-reference-not-Sengoku-assertion",
        "algorithm": "make_valid(method=linework, keep_collapsed=True); union_all; difference",
        "shapely": shapely.__version__,
        "geos": shapely.geos_version_string,
        "layers": summaries,
        "outputs": [
            {"file": key, "sha256": hashlib.sha256(value.encode()).hexdigest()}
            for key, value in encoded.items()
        ],
    }
    if output is not None:
        output = Path(output)
        output.mkdir(parents=True, exist_ok=False)
        for name, content in encoded.items():
            (output / name).write_text(content, encoding="utf-8")
        (output / "manifest.json").write_text(
            json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--manifest", type=Path, default=ROOT / "data/inputs/codh-edo/manifest.json"
    )
    parser.add_argument(
        "--output", required=True, type=Path, help="New output directory"
    )
    args = parser.parse_args()
    result = prepare(args.manifest, args.output)
    print(
        json.dumps(
            {
                "output": str(args.output),
                "layers": [
                    {
                        "key": row["key"],
                        "repairs": len(row["repairs"]),
                        "residualFeatures": row["residualFeatures"],
                    }
                    for row in result["layers"]
                ],
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
