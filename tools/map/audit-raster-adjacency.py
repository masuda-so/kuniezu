"""Audit region adjacency from lossless raster tiles, including tile seams."""
import argparse
import csv
import hashlib
import json
from pathlib import Path
import subprocess
import sys

import numpy as np
from PIL import Image


def audit(root, overlay=None):
    root = Path(root).resolve()
    manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
    canonical = manifest.get("source", {}).get("dir")
    if canonical:
        sys.path.insert(0, str(Path(__file__).resolve().parent))
        from map_data import read_definition, source_sha256
        source_dir = Path(__file__).resolve().parents[2] / canonical  # 生成物の置き場（game/map/build）の深さに依らずリポジトリから引く
        rows = read_definition(source_dir)
        baseline_sha = source_sha256(source_dir)
        if baseline_sha != manifest["source"]["sha256"]:
            raise ValueError("Province tiles target a different canonical source")
    else:
        with (root / "definition.csv").open(encoding="utf-8", newline="") as stream:
            rows = list(csv.DictReader(stream, delimiter=";"))
        baseline_sha = hashlib.sha256((root / "manifest.json").read_bytes()
                                     + (root / "definition.csv").read_bytes()).hexdigest()
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
        if edits.get("baseProvincesSha256") != baseline_sha:
            raise ValueError("Replacement tiles target a different province baseline")
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

    def read_pixels(path, expected, digest=None):
        if digest and hashlib.sha256(path.read_bytes()).hexdigest() != digest:
            raise ValueError(f"Checksum differs for {path}")
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
            pixels = (read_pixels(root / "provinces" / tile["file"], expected, tile.get("sha256"))
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

    if canonical:
        # 全域 PNG は展開すると約 1.5 GB。共有デコーダで行ごとに読み、
        # 正本の画素数を配信タイルとは独立に集計する。
        decoder = Path(__file__).resolve().parent / "png-big.cjs"
        if not decoder.exists():
            decoder = Path(__file__).resolve().parents[2] / "tools/map/png-big.cjs"
        script = """const {readRGB}=require(process.argv[1]);
const counts=new Uint32Array(1<<24);
readRGB(process.argv[2],(y,row)=>{for(let i=0;i<row.length;i+=3)counts[(row[i]<<16)|(row[i+1]<<8)|row[i+2]]++;})
.then(dim=>{const pixels={};for(let i=0;i<counts.length;i++)if(counts[i])pixels[i]=counts[i];
console.log(JSON.stringify({...dim,pixels}));}).catch(e=>{console.error(e.message);process.exit(1);});"""
        result = subprocess.run(["node", "-e", script, str(decoder), str(source_dir / manifest["source"].get("provinces", "provinces.png"))],
                                check=True, capture_output=True, text=True)
        source = json.loads(result.stdout)
        if (source["width"], source["height"]) != (width, height):
            raise ValueError("Canonical image dimensions differ from province grid")
        expected_counts = np.zeros(stride, dtype=np.int64)
        for color, count in source["pixels"].items():
            identifier = codes[int(color)]
            if identifier < 0:
                raise ValueError(f"Undefined color in canonical image: {color}")
            expected_counts[identifier] += count
    else:
        expected_counts = np.zeros(stride, dtype=np.int64)
        for identifier, row in ids.items():
            expected_counts[identifier] = int(row["pixels"])
    for identifier, row in ids.items():
        if pixel_counts[identifier] != expected_counts[identifier] + delta[identifier]:
            raise ValueError(f"Pixel count differs for {row['key']}")
    return {
        "sourceSha256": baseline_sha,
        "pixelCountSource": "canonical-image" if canonical else "legacy-definition",
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
