"""Resample local GSI or Terrarium elevation PNG tiles to the shared province grid."""
import argparse
import hashlib
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image

# Code 0 is reserved for missing elevations. Heights are quarter-metres.
OFFSET_METRES = -500
CODES_PER_METRE = 4


def build(grid_file, source_root, zoom, output, provider="gsi", factor=1):
    if provider == "gsi":
        offset, codes_per_metre = OFFSET_METRES, CODES_PER_METRE
        source = "https://maps.gsi.go.jp/development/demtile.html"
    elif provider == "terrarium":
        # The source includes bathymetry. Retain valid negative values.
        offset, codes_per_metre = -12000, 2
        source = "https://registry.opendata.aws/terrain-tiles/"
    else:
        raise ValueError(f"Unsupported provider: {provider}")
    grid = json.loads(grid_file.read_text(encoding="utf-8"))
    p = grid["projection"]
    x0, y0 = p["origin"]
    level = grid if factor == 1 else next(
        (row for row in grid.get("levels", []) if row["factor"] == factor), None)
    if level is None:
        raise ValueError(f"Grid does not define factor {factor}")
    step, tile_size = p["stepUnits"] * factor, grid["tile"]
    width, height = level["width"], level["height"]
    world = 2 ** zoom
    sources = {}
    targets = set()
    source_hashes = {}

    def latitude(row):
        return math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * row / world))))

    for file in sorted((source_root / str(zoom)).glob("*/*.png")):
        col, row = int(file.parent.name), int(file.stem)
        with Image.open(file) as image:
            if image.size != (256, 256):
                raise ValueError(f"Unexpected source tile dimensions: {file}")
            rgba = np.asarray(image.convert("RGBA"), dtype=np.int32)
        r, g, b, alpha = np.moveaxis(rgba, -1, 0)
        valid = alpha > 0
        if provider == "gsi":
            values = (r << 16) | (g << 8) | b
            metres = np.where(values < (1 << 23), values, values - (1 << 24)) / 100
            valid &= values != (1 << 23)
        else:
            metres = r * 256 + g + b / 256 - 32768
        codes = np.rint((metres - offset) * codes_per_metre) + 1
        if (valid & ((codes < 1) | (codes > 65535))).any():
            raise ValueError(f"Elevation out of range: {file}")
        sources[col, row] = np.where(valid, codes, 0).astype(np.uint16)
        source_hashes[f"{zoom}/{col}/{row}"] = hashlib.sha256(file.read_bytes()).hexdigest()

        west, east = (v / world * 360 - 180 for v in (col, col + 1))
        north, south = latitude(row), latitude(row + 1)
        left, right = (((lon - p["LON0"]) * p["K"] * p["CX"] - x0) / step
                       for lon in (west, east))
        top, bottom = (((p["LAT0"] - lat) * p["K"] - y0) / step for lat in (north, south))
        for ty in range(max(0, math.floor(top)) // tile_size,
                        (min(height, math.ceil(bottom)) + tile_size - 1) // tile_size):
            for tx in range(max(0, math.floor(left)) // tile_size,
                            (min(width, math.ceil(right)) + tile_size - 1) // tile_size):
                targets.add((tx, ty))
    if not targets:
        raise ValueError("No source tiles overlap the province grid")

    output.mkdir(parents=True, exist_ok=False)
    files = []
    for tx, ty in sorted(targets):
        xs = np.arange(tx * tile_size, min((tx + 1) * tile_size, width))
        ys = np.arange(ty * tile_size, min((ty + 1) * tile_size, height))
        lon = p["LON0"] + (x0 + (xs + .5) * step) / (p["K"] * p["CX"])
        lat = p["LAT0"] - (y0 + (ys + .5) * step) / p["K"]
        px = np.floor((lon + 180) / 360 * world * 256).astype(int)
        py = np.floor((1 - np.arcsinh(np.tan(np.deg2rad(lat))) / np.pi) * world * 128).astype(int)
        result = np.zeros((len(ys), len(xs)), dtype=np.uint16)
        for col in np.unique(px // 256):
            mask_x = px // 256 == col
            for row in np.unique(py // 256):
                data = sources.get((col, row))
                if data is None:
                    continue
                mask_y = py // 256 == row
                result[np.ix_(mask_y, mask_x)] = data[np.ix_(py[mask_y] % 256, px[mask_x] % 256)]
        count = int(np.count_nonzero(result))
        if count == 0:
            continue
        file = output / f"{tx}-{ty}.png"
        Image.fromarray(result).save(file)
        files.append({"file": file.name, "validPixels": count,
                      "sha256": hashlib.sha256(file.read_bytes()).hexdigest()})

    manifest = {
        "gridSha256": hashlib.sha256(grid_file.read_bytes()).hexdigest(),
        "source": source,
        "provider": provider,
        "factor": factor,
        "sourceTiles": source_hashes,
        "encoding": {"noData": 0, "offsetMetres": offset, "codesPerMetre": codes_per_metre,
                     "decode": "offsetMetres + (code - 1) / codesPerMetre"},
        "resampling": "source cell containing the destination pixel centre",
        "tiles": files,
    }
    (output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return files


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("grid_manifest", type=Path)
    parser.add_argument("source_root", type=Path, help="Directory containing source z/x/y.png tiles")
    parser.add_argument("output", type=Path)
    parser.add_argument("--zoom", type=int, required=True)
    parser.add_argument("--provider", choices=["gsi", "terrarium"], default="gsi")
    parser.add_argument("--factor", type=int, choices=[1, 4, 8], default=1)
    args = parser.parse_args()
    print(build(args.grid_manifest, args.source_root, args.zoom, args.output, args.provider, args.factor))
