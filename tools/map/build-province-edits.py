"""Generate changed province tiles from a verified base and geographic edit inputs."""
import argparse
import csv
import hashlib
import json
import math
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
EDITS = ROOT / "game/map/edits"


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def contains(ring, x, y):
    inside = False
    for (ax, ay), (bx, by) in zip(ring, ring[1:]):
        if (ay > y) != (by > y) and x < ax + (bx - ax) * (y - ay) / (by - ay):
            inside = not inside
    return inside


def build(base, out, year):
    ledger = read_json(EDITS / "baseline-ledger.json")
    for name, key in [("manifest.json", "manifestSha256"), ("definition.csv", "definitionSha256")]:
        if digest(base / name) != ledger[key]:
            raise ValueError(f"Unexpected baseline {name}")
    manifest = read_json(base / "manifest.json")
    with (base / "definition.csv").open(encoding="utf-8", newline="") as file:
        colors = {row["key"]: tuple(int(row[c]) for c in "rgb")
                  for row in csv.DictReader(file, delimiter=";")}
    applied = {row["id"] for row in ledger["applied"]}
    proj = manifest["projection"]
    x0, y0 = proj["origin"]
    step = proj["stepUnits"]
    size = manifest["tile"]
    tiles = {(row["col"], row["row"]): row for row in manifest["tiles"]}
    changed = {}
    writes = set()
    counts = {}

    for path in sorted(EDITS.glob("*.json")):
        if path.name == "baseline-ledger.json":
            continue
        edit = read_json(path)
        edit_id = edit["id"]
        if edit["layer"] != "provinces" or edit["baseRevision"] != ledger["baselineCommit"]:
            raise ValueError(f"Unsupported layer or revision: {edit_id}")
        if edit_id in applied or edit_id in counts:
            raise ValueError(f"Duplicate or already baked edit: {edit_id}")
        if not edit["validFrom"] <= year < edit["validUntil"]:
            continue
        payload = edit["payload"]
        geometry = read_json(path.parent / payload["file"])["features"][payload["feature"]]["geometry"]
        if geometry["type"] != "Polygon":
            raise ValueError(f"Expected a polygon: {edit_id}")
        rings = [[((lon - proj["LON0"]) * proj["K"] * proj["CX"],
                   (proj["LAT0"] - lat) * proj["K"]) for lon, lat in ring]
                 for ring in geometry["coordinates"]]
        if any(len(ring) < 4 or ring[0] != ring[-1] for ring in rings):
            raise ValueError(f"Unclosed polygon: {edit_id}")
        xs, ys = zip(*rings[0])
        c0, c1 = math.floor((min(xs) - x0) / step), math.ceil((max(xs) - x0) / step)
        r0, r1 = math.floor((min(ys) - y0) / step), math.ceil((max(ys) - y0) / step)
        if not (0 <= c0 < c1 <= manifest["width"] and 0 <= r0 < r1 <= manifest["height"]):
            raise ValueError(f"Polygon outside the baseline: {edit_id}")
        counts[edit_id] = 0
        for r in range(r0, r1):
            for c in range(c0, c1):
                x, y = x0 + (c + .5) * step, y0 + (r + .5) * step
                if sum(contains(ring, x, y) for ring in rings) % 2 == 0:
                    continue
                if (c, r) in writes:
                    raise ValueError(f"Overlapping edits at {c},{r}")
                tile = c // size, r // size
                if tile not in changed:
                    row = tiles.get(tile)
                    if row:
                        file = base / "provinces" / row["file"]
                        if digest(file) != row["sha256"]:
                            raise ValueError(f"Unexpected tile revision: {file.name}")
                        with Image.open(file) as image:
                            changed[tile] = image.convert("RGB")
                    else:
                        width = min(size, manifest["width"] - tile[0] * size)
                        height = min(size, manifest["height"] - tile[1] * size)
                        changed[tile] = Image.new("RGB", (width, height), colors["sea"])
                image = changed[tile]
                pixel = c % size, r % size
                if image.getpixel(pixel) != colors[payload["fromKey"]]:
                    raise ValueError(f"Unexpected original value at {c},{r}: {edit_id}")
                image.putpixel(pixel, colors[payload["toKey"]])
                writes.add((c, r))
                counts[edit_id] += 1
        if not counts[edit_id]:
            raise ValueError(f"Edit has no pixels at this scale: {edit_id}")

    out.mkdir(parents=True, exist_ok=False)
    outputs = []
    for (col, row), image in sorted(changed.items()):
        file = out / f"{col}-{row}.png"
        image.save(file)
        outputs.append({"file": file.name, "sha256": digest(file)})
    (out / "manifest.json").write_text(json.dumps({
        "baseRevision": ledger["baselineCommit"],
        "year": year,
        "editPixels": counts,
        "tiles": outputs,
    }, indent=2) + "\n", encoding="utf-8")
    return counts


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("base", type=Path)
    parser.add_argument("output", type=Path, help="New directory for replacement tiles")
    parser.add_argument("--year", type=int, required=True)
    args = parser.parse_args()
    print(build(args.base, args.output, args.year))
