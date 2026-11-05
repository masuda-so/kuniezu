"""Verify elevation and hillshade files against the shared province grid."""
import argparse
from collections import Counter
import csv
from hashlib import sha256
import json
from pathlib import Path
import sys

import numpy as np
from PIL import Image


def load(root):
    return json.loads((root / "manifest.json").read_text())


def pixels(file, digest, mode=None):
    if sha256(file.read_bytes()).hexdigest() != digest:
        raise ValueError(f"Checksum mismatch: {file}")
    with Image.open(file) as image:
        return np.array(image.convert(mode) if mode else image)


def audit(base, output):
    base = Path(base).resolve()
    grid = load(base)
    grid_hash = sha256((base / "manifest.json").read_bytes()).hexdigest()
    canonical = grid.get("source", {}).get("dir")
    if canonical:
        sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "map"))
        from map_data import read_definition, source_sha256
        directory = Path(__file__).resolve().parents[2] / canonical  # 生成物の置き場（kuniezu/static/kuniezu/map/build）の深さに依らずリポジトリから引く
        if source_sha256(directory) != grid["source"]["sha256"]:
            raise ValueError("Province tiles target a different canonical source")
        definition = read_definition(directory)
    else:
        with (base / "definition.csv").open(newline="") as stream:
            definition = list(csv.DictReader(stream, delimiter=";"))
    colors = {row["key"]: sum(int(row[c]) << shift for c, shift in zip("rgb", (16, 8, 0)))
              for row in definition}
    water = [colors[row["key"]] for row in definition if row["kind"] in ("sea", "lake")]

    results = []
    for level in [grid, *grid["levels"]]:
        factor = level.get("factor", 1)
        elevation, shade = output / f"height-{factor}", output / f"shade-{factor}"
        em, sm = load(elevation), load(shade)
        if not (em["gridSha256"] == sm["gridSha256"] == grid_hash and em["factor"] == sm["factor"] == factor):
            raise ValueError(f"Grid mismatch at factor {factor}")
        if sm["elevationManifestSha256"] != sha256((elevation / "manifest.json").read_bytes()).hexdigest():
            raise ValueError(f"Elevation manifest mismatch at factor {factor}")
        heights = {tuple(map(int, Path(t["file"]).stem.split("-"))): t for t in em["tiles"]}
        shadows = {(t["col"], t["row"]): t for t in sm["tiles"]}
        if heights.keys() != shadows.keys():
            raise ValueError(f"Different tile coverage at factor {factor}")
        provinces = {(t["col"], t["row"]): t for t in level["tiles"]}
        folder = "provinces" if factor == 1 else f"provinces-{factor}"
        counts, missing = Counter(), Counter()
        for key in provinces.keys() | heights.keys():
            pr, el, sh = provinces.get(key), heights.get(key), shadows.get(key)
            if el:
                values = pixels(elevation / el["file"], el["sha256"])
                alpha = pixels(shade / sh["file"], sh["sha256"], "RGBA")[:, :, 3]
                valid = values != em["encoding"]["noData"]
                if not np.array_equal(alpha, valid.astype(np.uint8) * 255) or valid.sum() != el["validPixels"]:
                    raise ValueError(f"Shade and elevation validity differ at {factor}:{key}")
                counts["elevationPixels"] += int(valid.sum())
            if not pr:
                continue
            rgb = pixels(base / folder / pr["file"], pr["sha256"], "RGB").astype(np.int32)
            code = (rgb[:, :, 0] << 16) | (rgb[:, :, 1] << 8) | rgb[:, :, 2]
            land = ~np.isin(code, water)
            if el and valid.shape != land.shape:
                raise ValueError(f"Tile dimensions differ at {factor}:{key}")
            gap = land & ~valid if el else land
            counts["landPixels"] += int(land.sum())
            counts["landMissing"] += int(gap.sum())
            counts["assignedLandMissing"] += int((gap & (code != colors["unassigned"])).sum())
            if gap.any():
                missing[f"{key[0]}-{key[1]}"] = int(gap.sum())
        results.append({"factor": factor, "tiles": len(heights), **counts,
                        "largestMissingTiles": missing.most_common(10)})
    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("map", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    print(json.dumps(audit(args.map, args.output), indent=2))
