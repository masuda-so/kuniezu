"""Inspect the local Fujito passage in a province raster, optionally with replacement tiles."""
import argparse
from collections import deque
from functools import lru_cache
import json
from pathlib import Path

from PIL import Image

import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "map"))
from map_data import read_definition, source_sha256  # noqa: E402


def inspect(base, overlay):
    manifest = json.loads((base / "manifest.json").read_text())
    kinds = {(row["r"], row["g"], row["b"]): row["kind"] for row in read_definition()}
    projection = manifest["projection"]
    origin_x, origin_y = projection["origin"]
    step, tile_size = projection["stepUnits"], manifest["tile"]
    scale = projection["K"]
    expected = {(row["col"], row["row"]) for row in manifest["tiles"]}
    replacements = {}
    if overlay:
        version = json.loads((overlay / "manifest.json").read_text())
        baseline = source_sha256()
        if version.get("baseProvincesSha256") != baseline:
            raise ValueError("Replacement tiles target a different province baseline")
        replacements = {
            (row["col"], row["row"]): overlay / row["file"]
            for row in version["tiles"] if row["factor"] == 1
        }

    def cell(lon, lat):
        x = (lon - projection["LON0"]) * scale * projection["CX"]
        y = (projection["LAT0"] - lat) * scale
        return int((x - origin_x) // step), int((y - origin_y) // step)

    @lru_cache(maxsize=16)
    def tile(col, row):
        file = replacements.get((col, row), base / "provinces" / f"{col}-{row}.png")
        if file.exists():
            with Image.open(file) as image:
                return image.convert("RGB")
        if (col, row) in expected or (col, row) in replacements:
            raise FileNotFoundError(file)
        return None

    def kind(x, y):
        image = tile(x // tile_size, y // tile_size)
        if image is None:
            return "sea"
        return kinds[image.getpixel((x % tile_size, y % tile_size))]

    def sea(x, y):
        return kind(x, y) == "sea"

    # Limit the flood fill to the northern corridor so the open sea south of Kojima
    # cannot make an unbroken land bridge look like a passage.
    left, top = cell(133.675, 34.625)
    right, bottom = cell(133.925, 34.530)
    west = cell(133.6858034, 34.5730514)
    east = cell(133.9000368, 34.5722033)
    # At the longitude of Kyogashima, require the local Fujito passage rather
    # than accepting the existing water route farther north.
    gate, gate_top = cell(133.811, 34.562)
    _, gate_bottom = cell(133.811, 34.556)
    def reachable(start, target, allowed):
        seen = {start}
        queue = deque(seen)
        while queue:
            x, y = queue.popleft()
            if (x, y) == target:
                return True
            for point in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if point not in seen and allowed(*point):
                    seen.add(point)
                    queue.append(point)
        return False

    def fujito_water(x, y):
        return (left <= x <= right and top <= y <= bottom
                and (x != gate or gate_top <= y <= gate_bottom) and sea(x, y))

    # Include the eastern and western sides of the peninsula when testing whether
    # a land connection still exists. Sea surrounding the peninsula stays inside this window.
    land_left, land_top = cell(133.59, 34.69)
    land_right, land_bottom = cell(134.09, 34.35)
    mainland = cell(133.771, 34.645)
    kojima = cell(133.835, 34.488)

    def local_land(x, y):
        return (land_left <= x <= land_right and land_top <= y <= land_bottom
                and kind(x, y) == "land")

    return {
        "westEndpointIsSea": sea(*west),
        "eastEndpointIsSea": sea(*east),
        "fujitoPassageConnected": fujito_water(*west) and reachable(west, east, fujito_water),
        "mainlandControlIsLand": local_land(*mainland),
        "kojimaControlIsLand": local_land(*kojima),
        "kojimaConnectedToMainland": local_land(*kojima) and reachable(kojima, mainland, local_land),
        "kyogashimaIsLand": kind(*cell(133.8108903, 34.5610021)) == "land",
        "fujitoTempleIsLand": kind(*cell(133.8095872, 34.5601554)) == "land",
        "shionasuSiteIsLand": kind(*cell(133.771388, 34.476388)) == "land",
        "ukisuiwaSiteKind": kind(*cell(133.8052177, 34.5598924)),
        "mizushimaControlIsSea": sea(*cell(133.718, 34.517)),
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("base", type=Path)
    parser.add_argument("--overlay", type=Path)
    args = parser.parse_args()
    print(json.dumps(inspect(args.base, args.overlay), indent=2))
