"""Audit region adjacency from lossless raster tiles, including tile seams."""
import argparse
import csv
import json
from pathlib import Path

import numpy as np
from PIL import Image


def audit(root):
    manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
    with (root / "definition.csv").open(encoding="utf-8", newline="") as stream:
        rows = list(csv.DictReader(stream, delimiter=";"))
    ids = {int(row["id"]): row for row in rows}
    sea = next(int(row["id"]) for row in rows if row["kind"] == "sea")
    codes = np.full(1 << 24, -1, dtype=np.int32)
    for identifier, row in ids.items():
        r, g, b = (int(row[channel]) for channel in "rgb")
        codes[(r << 16) | (g << 8) | b] = identifier
    tiles = {(t["col"], t["row"]): t for t in manifest["tiles"]}
    size, width, height = (manifest[k] for k in ("tile", "width", "height"))
    stride = max(ids) + 1
    land = np.zeros(stride, dtype=bool)
    for identifier, row in ids.items():
        land[identifier] = row["key"].startswith(("castle:", "neutral:"))
    cardinal, diagonal = set(), set()
    pixel_counts = np.zeros(stride, dtype=np.int64)
    previous = None

    def add_pairs(left, right, target):
        different = (left != right) & land[left] & land[right]
        a, b = left[different], right[different]
        target.update(np.unique(np.minimum(a, b) * stride + np.maximum(a, b)).tolist())

    for row in range((height + size - 1) // size):
        band = np.full((min(size, height - row * size), width), sea, dtype=np.int32)
        for col in range((width + size - 1) // size):
            tile = tiles.get((col, row))
            if not tile:
                continue
            with Image.open(root / "provinces" / tile["file"]) as image:
                rgb = np.asarray(image.convert("RGB"), dtype=np.int32)
            expected = (band.shape[0], min(size, width - col * size))
            if rgb.shape[:2] != expected:
                raise ValueError(f"Unexpected dimensions for {tile['file']}")
            pixels = codes[(rgb[:, :, 0] << 16) | (rgb[:, :, 1] << 8) | rgb[:, :, 2]]
            if (pixels < 0).any():
                raise ValueError(f"Undefined color in {tile['file']}")
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
        if pixel_counts[identifier] != int(row["pixels"]):
            raise ValueError(f"Pixel count differs for {row['key']}")
    return {
        "width": width,
        "height": height,
        "fourNeighbourPairs": len(cardinal),
        "eightNeighbourPairs": len(cardinal | diagonal),
        "diagonalOnly": [[ids[a]["key"], ids[b]["key"]]
                         for a, b in (divmod(pair, stride) for pair in sorted(diagonal - cardinal))],
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("map", type=Path)
    args = parser.parse_args()
    print(json.dumps(audit(args.map), ensure_ascii=False, indent=2))
