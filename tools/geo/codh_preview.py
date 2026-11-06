# ruff: noqa: INP001
"""Build a local, standalone CODH reference viewer; never alter the game map."""

import argparse
import hashlib
import importlib
import json
import sys
from pathlib import Path

references = importlib.import_module(
    "tools.geo.codh_reference" if __package__ else "codh_reference"
)
ROOT = references.ROOT
prepare = references.prepare


def load_surfaces(directory, expected_sources):
    directory = Path(directory)
    manifest = json.loads((directory / "manifest.json").read_text(encoding="utf-8"))
    if (
        manifest.get("schemaVersion") != 1
        or manifest.get("temporalScope") != "Edo-reference-not-Sengoku-assertion"
    ):
        msg = "Expected versioned Edo reference surfaces"
        raise ValueError(msg)
    sources = {row["key"]: row["source"]["sourceSha256"] for row in manifest["layers"]}
    if any(sources.get(key) != value for key, value in expected_sources.items()):
        msg = "Prepared surfaces use different source versions"
        raise ValueError(msg)
    hashes = {row["file"]: row["sha256"] for row in manifest["outputs"]}
    if len(hashes) != len(manifest["outputs"]):
        msg = "Duplicate prepared output identity"
        raise ValueError(msg)
    result = {}
    for key, name in (
        ("coast-polygons", "land-with-water.geojson"),
        ("lake-polygons", "lake-polygons.geojson"),
    ):
        raw = (directory / name).read_bytes()
        if hashlib.sha256(raw).hexdigest() != hashes.get(name):
            msg = "Prepared surface SHA mismatch"
            raise ValueError(msg)
        result[key] = json.loads(raw)
    return result


def build(output, surfaces=None, canonical=None):
    if surfaces is not None and canonical is not None:
        msg = "Choose prepared reference or edited canonical surfaces"
        raise ValueError(msg)
    template = Path(__file__).with_name("codh_preview.html").read_text(encoding="utf-8")
    projection = json.loads(
        (ROOT / "kuniezu/map/projection.json").read_text(encoding="utf-8")
    )
    source_manifest = ROOT / "data/inputs/codh-edo/manifest.json"
    adopted = {}
    if surfaces is not None:
        expected = {
            row["key"]: row["sha256"]
            for row in json.loads(source_manifest.read_text(encoding="utf-8"))[
                "datasets"
            ]
            if row["key"] in {"coast-polygons", "lake-polygons"}
        }
        adopted = load_surfaces(surfaces, expected)
    if canonical is not None:
        for key, name, role in (
            ("coast-polygons", "land.geojson", "land"),
            ("lake-polygons", "water.geojson", "water"),
        ):
            collection = json.loads((Path(canonical) / name).read_bytes())
            if (
                collection.get("type") != "FeatureCollection"
                or not isinstance(collection.get("features"), list)
                or any(
                    feature.get("properties", {}).get("drawRole") != role
                    for feature in collection.get("features", [])
                )
            ):
                raise ValueError("Edited surface needs explicit drawRole: " + name)
            adopted[key] = collection
    report = prepare(source_manifest, output)
    layers = {}
    for key in ("coast-polygons", "lake-polygons", "roads", "posts"):
        layers[key] = json.loads(
            (output / (key + ".geojson")).read_text(encoding="utf-8")
        )
    layers.update(adopted)
    # An inert JSON script must not be terminated by source attribute strings.
    payload = json.dumps(
        {"projection": projection, "layers": layers, "sources": report["datasets"]},
        ensure_ascii=False,
        separators=(",", ":"),
    ).replace("<", "\\u003c")
    (output / "index.html").write_text(
        template.replace("__CODH_DATA__", payload).replace(
            "__VECTOR_RENDERER__",
            (ROOT / "kuniezu/static/kuniezu/vector-map.js").read_text(encoding="utf-8"),
        ),
        encoding="utf-8",
    )
    return output / "index.html"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output", required=True, type=Path, help="New output directory"
    )
    parser.add_argument(
        "--surfaces",
        type=Path,
        help="Prepared topology directory; SHA and source versions are checked",
    )
    parser.add_argument(
        "--canonical",
        type=Path,
        help="Read edited land.geojson/water.geojson unchanged",
    )
    args = parser.parse_args()
    sys.stdout.write(str(build(args.output, args.surfaces, args.canonical)) + "\n")


if __name__ == "__main__":
    main()
