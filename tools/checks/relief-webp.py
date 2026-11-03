"""Verify distributed WebP relief tiles against the generated hillshade PNGs."""
import argparse
from hashlib import sha256
import json
from pathlib import Path

from PIL import Image


def grid_geometry(manifest):
    projection = manifest["projection"]
    return (
        tuple(projection[key] for key in ("K", "CX", "LON0", "LAT0", "origin", "stepUnits")),
        manifest["tile"],
        manifest["width"],
        manifest["height"],
        sorted((level["factor"], level["width"], level["height"]) for level in manifest["levels"]),
    )


def verify(map_dir, generated_dir, source_grid=None):
    relief = json.loads((map_dir / "relief.json").read_text())
    current_grid = (map_dir / "manifest.json").read_bytes()
    original_grid = source_grid.read_bytes() if source_grid else current_grid
    if grid_geometry(json.loads(current_grid)) != grid_geometry(json.loads(original_grid)):
        raise ValueError("Distribution grid geometry differs from the source")
    grid_hash = sha256(original_grid).hexdigest()
    if relief["gridSha256"] != grid_hash:
        raise ValueError("Distribution grid checksum mismatch")
    levels = relief["levels"]
    if sorted(level["factor"] for level in levels) != [1, 4, 8]:
        raise ValueError("Expected exactly one relief level per factor")
    for level in levels:
        factor = level["factor"]
        source_dir = generated_dir / f"shade-{factor}"
        source = json.loads((source_dir / "manifest.json").read_text())
        if source["factor"] != factor or source["gridSha256"] != grid_hash:
            raise ValueError(f"Source grid mismatch at factor {factor}")
        for field in ("source", "product", "acquired", "license", "notice", "disclaimer", "shading"):
            if source[field] != relief[field]:
                raise ValueError(f"Source metadata mismatch at factor {factor}: {field}")
        if factor == 1 and source["elevationManifestSha256"] != relief["elevationManifestSha256"]:
            raise ValueError("Elevation manifest checksum mismatch")
        originals = {(tile["col"], tile["row"]): tile for tile in source["tiles"]}
        tiles = level["tiles"]
        if len(tiles) != len(originals) or {(t["col"], t["row"]) for t in tiles} != originals.keys():
            raise ValueError(f"Tile coverage mismatch at factor {factor}")
        for tile in tiles:
            original = originals[tile["col"], tile["row"]]
            png_path = source_dir / original["file"]
            webp_path = map_dir / level["dir"] / tile["file"]
            if sha256(png_path.read_bytes()).hexdigest() != original["sha256"] or tile.get("regeneratedSourceSha256", tile["sourceSha256"]) != original["sha256"]:
                raise ValueError(f"Source checksum mismatch: {png_path}")
            if sha256(webp_path.read_bytes()).hexdigest() != tile["sha256"]:
                raise ValueError(f"Distribution checksum mismatch: {webp_path}")
            with Image.open(png_path) as png, Image.open(webp_path) as webp:
                if webp.format != "WEBP" or png.size != webp.size or webp.size != (tile["width"], tile["height"]):
                    raise ValueError(f"Format or dimensions differ: {webp_path}")
                rgba = png.convert("RGBA")
                # PNG compression may change without changing its pixels. A reused
                # WebP keeps the checksum of the PNG originally fed to its encoder.
                pixel_hash = tile.get("sourcePixelSha256")
                if tile["sourceSha256"] != original["sha256"] and not pixel_hash:
                    raise ValueError(f"Reused tile lacks a pixel checksum: {png_path}")
                if pixel_hash and sha256(rgba.tobytes()).hexdigest() != pixel_hash:
                    raise ValueError(f"Source pixel checksum mismatch: {png_path}")
                if rgba.getchannel("A").tobytes() != webp.convert("RGBA").getchannel("A").tobytes():
                    raise ValueError(f"Alpha differs: {webp_path}")
        print(f"PASS: factor {factor}, {len(tiles)} WebP tiles")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("map", type=Path)
    parser.add_argument("generated", type=Path)
    parser.add_argument("--source-grid", type=Path,
                        help="Original grid manifest when province assignments have been updated")
    args = parser.parse_args()
    verify(args.map, args.generated, args.source_grid)
