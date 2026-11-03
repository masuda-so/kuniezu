"""Rasterize a river-centerline dataset on the same grid as province tiles."""
import argparse
import hashlib
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw


def build(grid_file, source_file, output):
    grid = json.loads(grid_file.read_text(encoding="utf-8"))
    source = json.loads(source_file.read_text(encoding="utf-8"))
    projection = grid["projection"]
    x0, y0 = projection["origin"]
    step = projection["stepUnits"]
    size = grid["tile"]
    width, height = grid["width"], grid["height"]

    def pixel(point):
        lon, lat = point
        x = (lon - projection["LON0"]) * projection["K"] * projection["CX"]
        y = (projection["LAT0"] - lat) * projection["K"]
        return math.floor((x - x0) / step), math.floor((y - y0) / step)

    ids = {name: index for index, name in enumerate(
        sorted({river["name"] for river in source["rivers"]}), 1)}
    if len(ids) > 255:
        raise ValueError("8-bit river layer has at most 255 feature IDs")
    tiles = {}
    ways = {name: [] for name in ids}
    for river in source["rivers"]:
        name = river["name"]
        points = list(map(pixel, river["points"]))
        if not points or any(not (0 <= x < width and 0 <= y < height) for x, y in points):
            raise ValueError(f"River outside grid: {name} / {river['id']}")
        ways[name].append([river["id"], river["part"]])
        for a, b in zip(points, points[1:]):
            left, right = sorted((a[0], b[0]))
            top, bottom = sorted((a[1], b[1]))
            # Render once per segment before cutting at tile boundaries.
            # This keeps the same pixel sequence when a segment crosses a seam.
            segment = Image.new("1", (right - left + 1, bottom - top + 1))
            ImageDraw.Draw(segment).line([(x - left, y - top) for x, y in (a, b)], fill=1)
            for sy in range(segment.height):
                for sx in range(segment.width):
                    if not segment.getpixel((sx, sy)):
                        continue
                    x, y = left + sx, top + sy
                    col, row = x // size, y // size
                    key = col, row
                    if key not in tiles:
                        tiles[key] = Image.new("L", (min(size, width - col * size),
                                                     min(size, height - row * size)))
                    tile = tiles[key]
                    point = x % size, y % size
                    if tile.getpixel(point) not in (0, ids[name]):
                        raise ValueError(f"Two river IDs at pixel {x},{y}")
                    tile.putpixel(point, ids[name])

    output.mkdir(parents=True, exist_ok=False)
    files = []
    counts = {name: 0 for name in ids}
    for (col, row), tile in sorted(tiles.items()):
        histogram = tile.histogram()
        for name, identifier in ids.items():
            counts[name] += histogram[identifier]
        filename = f"{col}-{row}.png"
        path = output / filename
        tile.save(path)
        files.append({"file": filename, "col": col, "row": row,
                      "sha256": hashlib.sha256(path.read_bytes()).hexdigest()})
    result = {
        "gridSha256": hashlib.sha256(grid_file.read_bytes()).hexdigest(),
        "inputSha256": hashlib.sha256(source_file.read_bytes()).hexdigest(),
        "encoding": "PNG 8-bit grayscale, 0 is no river, 1..255 are feature IDs",
        "basis": source["basis"],
        "source": source["source"],
        "license": source["license"],
        "attribution": source["attribution"],
        "features": [{"id": identifier, "name": name, "ways": ways[name], "pixels": counts[name]}
                     for name, identifier in ids.items()],
        "tiles": files,
    }
    (output / "manifest.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n",
                                          encoding="utf-8")
    return counts


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("grid_manifest", type=Path)
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    print(build(args.grid_manifest, args.source, args.output))
