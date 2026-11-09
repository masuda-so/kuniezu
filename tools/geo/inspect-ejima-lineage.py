"""Report Eshima source/current topology without modifying map sources."""
# ruff: noqa: INP001

import gzip
import hashlib
import json
import sys
from pathlib import Path

from shapely.geometry import Polygon
from shapely.geometry import shape

ROOT = Path(__file__).resolve().parents[2]


def main():
    paths = {
        "original": "data/inputs/codh-edo/lake-polygons.geojson.gz",
        "water": "kuniezu/map/physical/water.geojson",
        "land": "kuniezu/map/physical/land.geojson",
        "coast": "kuniezu/map/physical/coastline.geojson",
    }
    raw = {key: (ROOT / path).read_bytes() for key, path in paths.items()}
    collections = {
        key: json.loads(gzip.decompress(value) if key == "original" else value)
        for key, value in raw.items()
    }

    def feature(layer, identifier):
        return next(f for f in collections[layer]["features"] if f["id"] == identifier)

    original = collections["original"]["features"][511]
    water = feature("water", "water:codh-lake:511")
    land = feature("land", "land:baseline:01403")
    coast = feature("coast", "shore:common:01469")
    # Explicit source indices identify the inspected island; no nearest-feature guess.
    source_island = Polygon(shape(original["geometry"]).geoms[0].interiors[1])
    current_geometry = shape(water["geometry"])
    current_part = (
        current_geometry.geoms[0]
        if current_geometry.geom_type == "MultiPolygon" else current_geometry
    )
    current_island = Polygon(current_part.interiors[1])
    result = {
        "purpose": "source-lineage-observation, not historical shoreline verification",
        "inputs": {
            key: {"path": path, "sha256": hashlib.sha256(raw[key]).hexdigest()}
            for key, path in paths.items()
        },
        "sourceRow": 511,
        "sourceProperties": original["properties"],
        "currentWaterProperties": water["properties"],
        "islandBoundsCRS84": list(source_island.bounds),
        "topologicalEquality": {
            "sourceHole_currentHole": source_island.equals(current_island),
            "currentHole_land": current_island.equals(shape(land["geometry"])),
            "landBoundary_coast": shape(land["geometry"]).boundary.equals(
                shape(coast["geometry"])
            ),
        },
    }
    sys.stdout.write(json.dumps(result, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
