"""Build display-only RGBA hillshade tiles from a local elevation raster."""
import argparse
from functools import lru_cache
from hashlib import sha256
import json
from pathlib import Path

import numpy as np
from PIL import Image


def gradient(before, center, after, spacing):
    left, right = np.isfinite(before), np.isfinite(after)
    count = left.astype(int) + right.astype(int)
    return (np.where(right, after, center) - np.where(left, before, center)) / (
        np.maximum(count, 1) * spacing)


def build(grid_file, heights, output):
    grid_bytes = grid_file.read_bytes()
    grid = json.loads(grid_bytes)
    manifest_file = heights / "manifest.json"
    manifest_bytes = manifest_file.read_bytes()
    manifest = json.loads(manifest_bytes)
    grid_hash = sha256(grid_bytes).hexdigest()
    if manifest["gridSha256"] != grid_hash:
        raise ValueError("Elevation raster uses a different grid")
    factor = manifest.get("factor", 1)
    level = grid if factor == 1 else next(
        (row for row in grid.get("levels", []) if row["factor"] == factor), None)
    if level is None:
        raise ValueError(f"Grid does not define factor {factor}")
    tile_size = grid["tile"]
    projection = grid["projection"]
    encoding = manifest["encoding"]
    records = {}
    for row in manifest["tiles"]:
        col, line = map(int, Path(row["file"]).stem.split("-"))
        key = col, line
        if key in records or not (0 <= col * tile_size < level["width"] and
                                  0 <= line * tile_size < level["height"]):
            raise ValueError(f"Invalid elevation tile: {key}")
        records[key] = row

    @lru_cache(maxsize=16)
    def read(col, line):
        record = records.get((col, line))
        if record is None:
            return None
        file = heights / record["file"]
        if sha256(file.read_bytes()).hexdigest() != record["sha256"]:
            raise ValueError(f"Checksum mismatch: {file}")
        with Image.open(file) as image:
            codes = np.asarray(image, dtype=np.float32)
        shape = (min(tile_size, level["height"] - line * tile_size),
                 min(tile_size, level["width"] - col * tile_size))
        if codes.shape != shape:
            raise ValueError(f"Invalid dimensions: {file}")
        values = encoding["offsetMetres"] + (codes - 1) / encoding["codesPerMetre"]
        return np.where(codes == encoding["noData"], np.nan, values)

    output.mkdir(parents=True, exist_ok=False)
    tiles = []
    metres = projection["stepMetres"] * factor
    for col, line in sorted(records, key=lambda key: (key[1], key[0])):
        center = read(col, line)
        halo = np.pad(center, 1, constant_values=np.nan)
        for dc, dr, destination, edge in (
            (-1, 0, (slice(1, -1), 0), (slice(None), -1)),
            (1, 0, (slice(1, -1), -1), (slice(None), 0)),
            (0, -1, (0, slice(1, -1)), (-1, slice(None))),
            (0, 1, (-1, slice(1, -1)), (0, slice(None))),
        ):
            neighbour = read(col + dc, line + dr)
            if neighbour is not None:
                halo[destination] = neighbour[edge]
        latitude = projection["LAT0"] - (projection["origin"][1] +
            (line * tile_size + np.arange(center.shape[0]) + .5) * projection["stepUnits"] * factor) / projection["K"]
        metres_x = metres * np.cos(np.deg2rad(latitude))[:, None] / projection["CX"]
        dx = gradient(halo[1:-1, :-2], center, halo[1:-1, 2:], metres_x)
        dy = gradient(halo[:-2, 1:-1], center, halo[2:, 1:-1], metres)
        light = (dx * .5 + dy * .5 + .7071) / np.sqrt(dx * dx + dy * dy + 1)
        ink = np.clip((.78 - np.nan_to_num(light, nan=.78)) * 1.65, 0, 1)
        rgba = np.empty((*center.shape, 4), dtype=np.uint8)
        rgba[:, :, :3] = np.floor([245, 240, 221] - ink[:, :, None] * [90, 93, 89] + .5)
        rgba[:, :, 3] = np.where(np.isfinite(center), 255, 0)
        file = output / f"{col}-{line}.png"
        Image.fromarray(rgba).save(file)
        tiles.append({"file": file.name, "col": col, "row": line,
                      "sha256": sha256(file.read_bytes()).hexdigest()})
    result = {"gridSha256": grid_hash, "elevationManifestSha256": sha256(manifest_bytes).hexdigest(),
              "source": manifest["source"], "factor": factor, "format": "RGBA8", "noDataAlpha": 0,
              "shading": "northwest light, one-pixel neighbour halo", "tiles": tiles}
    for field in ("product", "acquired", "license", "notice", "disclaimer"):
        if field in manifest:
            result[field] = manifest[field]
    (output / "manifest.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("grid", type=Path)
    parser.add_argument("heights", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    print(f"Generated {len(build(args.grid, args.heights, args.output)['tiles'])} hillshade tiles")
