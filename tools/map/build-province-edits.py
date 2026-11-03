"""Generate changed province tiles from a verified base and geographic edit inputs."""
import argparse
import csv
from datetime import date
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


def build(base, out, day):
    day = date(day, 1, 1) if isinstance(day, int) else day
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
    seen = set(applied)
    boundaries = set()

    for path in sorted(EDITS.glob("*.json")):
        if path.name == "baseline-ledger.json":
            continue
        edit = read_json(path)
        edit_id = edit["id"]
        if edit["layer"] != "provinces" or edit["baseRevision"] != ledger["baselineCommit"]:
            raise ValueError(f"Unsupported layer or revision: {edit_id}")
        if edit_id in seen:
            raise ValueError(f"Duplicate or already baked edit: {edit_id}")
        seen.add(edit_id)
        start, end = (date(*edit[key]) for key in ("validFrom", "validUntil"))
        boundaries.update((start, end))
        if start >= end:
            raise ValueError(f"Invalid validity interval: {edit_id}")
        if not start <= day < end:
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

    levels = [(1, "provinces", changed)]
    for level in manifest.get("levels", []):
        factor = level["factor"]
        originals = {(t["col"], t["row"]): t for t in level["tiles"]}
        replacements = {}
        for c, r in sorted(writes):
            x, y = c // factor, r // factor
            # Match the base builder: sample the fine-grid pixel at each coarse centre.
            if (c != min(manifest["width"] - 1, x * factor + factor // 2)
                    or r != min(manifest["height"] - 1, y * factor + factor // 2)):
                continue
            key = x // size, y // size
            if key not in replacements:
                original = originals.get(key)
                if original:
                    file = base / level["dir"] / original["file"]
                    if digest(file) != original["sha256"]:
                        raise ValueError(f"Unexpected tile revision: {file}")
                    with Image.open(file) as image:
                        replacements[key] = image.convert("RGB")
                else:
                    replacements[key] = Image.new(
                        "RGB", (min(size, level["width"] - key[0] * size),
                                min(size, level["height"] - key[1] * size)), colors["sea"])
            rgb = changed[c // size, r // size].getpixel((c % size, r % size))
            replacements[key].putpixel((x % size, y % size), rgb)
        levels.append((factor, level["dir"], replacements))

    out.mkdir(parents=True, exist_ok=False)
    outputs = []
    versions = []
    if counts:
        start = max(v for v in boundaries if v <= day)
        end = min(v for v in boundaries if v > day)
        period = [[v.year, v.month, v.day] for v in (start, end)]
        version = f"{start:%Y%m%d}-{end:%Y%m%d}"
    for factor, directory, replacements in levels:
        if replacements:
            (out / directory).mkdir(exist_ok=True)
        for (col, row), image in sorted(replacements.items()):
            file = out / directory / f"{col}-{row}@{version}.png"
            image.save(file)
            outputs.append({"file": file.relative_to(out).as_posix(), "factor": factor,
                            "col": col, "row": row, "period": period, "width": image.width,
                            "height": image.height, "sha256": digest(file)})
    if counts:
        sha = hashlib.sha256(json.dumps(outputs, sort_keys=True).encode()).hexdigest()
        versions.append({"id": version, "period": period, "edits": sorted(counts), "sha256": sha})
    (out / "manifest.json").write_text(json.dumps({
        "baseRevision": ledger["baselineCommit"],
        "baseProvincesSha256": hashlib.sha256(
            (base / "manifest.json").read_bytes() + (base / "definition.csv").read_bytes()
        ).hexdigest(),
        "date": day.isoformat(),
        "versions": versions,
        "editPixels": counts,
        "tiles": outputs,
    }, indent=2) + "\n", encoding="utf-8")
    return counts


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("base", type=Path)
    parser.add_argument("output", type=Path, help="New directory for replacement tiles")
    dates = parser.add_mutually_exclusive_group(required=True)
    dates.add_argument("--year", type=int)
    dates.add_argument("--date", type=date.fromisoformat)
    args = parser.parse_args()
    print(build(args.base, args.output, args.date or args.year))
