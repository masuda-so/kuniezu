"""Audit region adjacency from lossless raster tiles, including tile seams."""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from map_data import read_definition  # noqa: E402


def audit(root, overlay=None):
    manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
    rows = read_definition()  # 正本 game/map_data（id は1から、kind は default.map）
    ids = {int(row["id"]): row for row in rows}
    sea = next(int(row["id"]) for row in rows if row["kind"] == "sea")
    codes = np.full(1 << 24, -1, dtype=np.int32)
    for identifier, row in ids.items():
        r, g, b = (int(row[channel]) for channel in "rgb")
        codes[(r << 16) | (g << 8) | b] = identifier
    tiles = {(t["col"], t["row"]): t for t in manifest["tiles"]}
    size, width, height = (manifest[k] for k in ("tile", "width", "height"))
    overrides = {}
    if overlay:
        edits = json.loads((overlay / "manifest.json").read_text(encoding="utf-8"))
        for tile in edits["tiles"]:
            if tile["factor"] != 1:
                continue
            key = tile["col"], tile["row"]
            if key in overrides or not (0 <= key[0] * size < width and 0 <= key[1] * size < height):
                raise ValueError(f"Invalid override location: {key}")
            overrides[key] = tile
    stride = max(ids) + 1
    land = np.zeros(stride, dtype=bool)
    for identifier, row in ids.items():
        land[identifier] = row["key"].startswith(("castle:", "neutral:"))
    cardinal, diagonal = set(), set()
    pixel_counts = np.zeros(stride, dtype=np.int64)
    delta = np.zeros_like(pixel_counts)
    previous = None

    def read_pixels(path, expected):
        with Image.open(path) as image:
            rgb = np.asarray(image.convert("RGB"), dtype=np.int32)
        if rgb.shape[:2] != expected:
            raise ValueError(f"Unexpected dimensions for {path}")
        pixels = codes[(rgb[:, :, 0] << 16) | (rgb[:, :, 1] << 8) | rgb[:, :, 2]]
        if (pixels < 0).any():
            raise ValueError(f"Undefined color in {path}")
        return pixels

    def add_pairs(left, right, target):
        different = (left != right) & land[left] & land[right]
        a, b = left[different], right[different]
        target.update(np.unique(np.minimum(a, b) * stride + np.maximum(a, b)).tolist())

    for row in range((height + size - 1) // size):
        band = np.full((min(size, height - row * size), width), sea, dtype=np.int32)
        for col in range((width + size - 1) // size):
            tile = tiles.get((col, row))
            override = overrides.get((col, row))
            if not tile and not override:
                continue
            expected = (band.shape[0], min(size, width - col * size))
            pixels = (read_pixels(root / "provinces" / tile["file"], expected)
                      if tile else np.full(expected, sea, dtype=np.int32))
            if override:
                path = overlay / override["file"]
                if hashlib.sha256(path.read_bytes()).hexdigest() != override["sha256"]:
                    raise ValueError(f"Checksum differs for {path}")
                changed = read_pixels(path, expected)
                delta += np.bincount(changed.ravel(), minlength=stride)
                delta -= np.bincount(pixels.ravel(), minlength=stride)
                pixels = changed
            band[:, col * size:col * size + pixels.shape[1]] = pixels
        pixel_counts += np.bincount(band.ravel(), minlength=stride)
        add_pairs(band[:, :-1], band[:, 1:], cardinal)
        add_pairs(band[:-1], band[1:], cardinal)
        add_pairs(band[:-1, :-1], band[1:, 1:], diagonal)
        add_pairs(band[:-1, 1:], band[1:, :-1], diagonal)
        if previous is not None:
            add_pairs(previous, band[0], cardinal)
            add_pairs(previous[:-1], band[0, 1:], diagonal)
            add_pairs(previous[1:], band[0, :-1], diagonal)
        previous = band[-1].copy()

    for identifier, row in ids.items():
        if pixel_counts[identifier] != int(row["pixels"]) + delta[identifier]:
            raise ValueError(f"Pixel count differs for {row['key']}")
    return {
        "width": width,
        "height": height,
        "fourNeighbourPairs": len(cardinal),
        "eightNeighbourPairs": len(cardinal | diagonal),
        "overriddenTiles": len(overrides),
        "pixelDeltas": {row["key"]: int(delta[i]) for i, row in ids.items() if delta[i]},
        "fourNeighbourPairHash": hashlib.sha256(json.dumps(sorted(cardinal)).encode()).hexdigest(),
        "eightNeighbourPairHash": hashlib.sha256(json.dumps(sorted(cardinal | diagonal)).encode()).hexdigest(),
        "diagonalOnly": [[ids[a]["key"], ids[b]["key"]]
                         for a, b in (divmod(pair, stride) for pair in sorted(diagonal - cardinal))],
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("map", type=Path)
    parser.add_argument("--overlay", type=Path, help="compiled directory for a single date")
    args = parser.parse_args()
    print(json.dumps(audit(args.map, args.overlay), ensure_ascii=False, indent=2))
