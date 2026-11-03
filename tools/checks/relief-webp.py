"""Verify distributed WebP relief tiles against the generated hillshade PNGs."""
import argparse
from hashlib import sha256
import json
from pathlib import Path

from PIL import Image


def verify(map_dir, generated_dir):
    relief = json.loads((map_dir / "relief.json").read_text())
    levels = relief["levels"]
    if sorted(level["factor"] for level in levels) != [1, 4, 8]:
        raise ValueError("Expected exactly one relief level per factor")
    for level in levels:
        factor = level["factor"]
        source_dir = generated_dir / f"shade-{factor}"
        source = json.loads((source_dir / "manifest.json").read_text())
        originals = {(tile["col"], tile["row"]): tile for tile in source["tiles"]}
        tiles = level["tiles"]
        if len(tiles) != len(originals) or {(t["col"], t["row"]) for t in tiles} != originals.keys():
            raise ValueError(f"Tile coverage mismatch at factor {factor}")
        for tile in tiles:
            original = originals[tile["col"], tile["row"]]
            png_path = source_dir / original["file"]
            webp_path = map_dir / level["dir"] / tile["file"]
            if sha256(png_path.read_bytes()).hexdigest() != original["sha256"] or tile["sourceSha256"] != original["sha256"]:
                raise ValueError(f"Source checksum mismatch: {png_path}")
            if sha256(webp_path.read_bytes()).hexdigest() != tile["sha256"]:
                raise ValueError(f"Distribution checksum mismatch: {webp_path}")
            with Image.open(png_path) as png, Image.open(webp_path) as webp:
                if webp.format != "WEBP" or png.size != webp.size or webp.size != (tile["width"], tile["height"]):
                    raise ValueError(f"Format or dimensions differ: {webp_path}")
                if png.convert("RGBA").getchannel("A").tobytes() != webp.convert("RGBA").getchannel("A").tobytes():
                    raise ValueError(f"Alpha differs: {webp_path}")
        print(f"PASS: factor {factor}, {len(tiles)} WebP tiles")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("map", type=Path)
    parser.add_argument("generated", type=Path)
    args = parser.parse_args()
    verify(args.map, args.generated)
