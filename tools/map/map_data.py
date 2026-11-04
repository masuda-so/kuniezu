"""Read the canonical map source in game/map (Crusader Kings III style map_data names).

definition.csv has no header: the first row is the reserved `0;0;0;0;x;x;` and the rest are
`id;R;G;B;name;x;`, where name is the region key. Sea and lake ids come from default.map
(`sea_zones = LIST { ... }`, `lakes = LIST { ... }`); every other id is land.
Mirrors tools/map/map-data.cjs, including the source hash written into generated manifests.
"""
import hashlib
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MAP_DATA = ROOT / "game/map"
FILES = ("control/provinces.png", "control/definition.csv", "control/default.map", "projection.json")


def _lists(text):
    text = re.sub(r"#[^\n]*", "", text)
    return {m.group(1): [int(v) for v in m.group(2).split()]
            for m in re.finditer(r"(\w+)\s*=\s*LIST\s*\{([^}]*)\}", text)}


def read_definition(directory=MAP_DATA):
    """Return rows as dicts with id, r, g, b, key and kind (sea, lake or land)."""
    directory = Path(directory)
    lists = _lists((directory / "control/default.map").read_text(encoding="utf-8"))
    sea, lake = set(lists.get("sea_zones", [])), set(lists.get("lakes", []))
    rows = []
    for line in (directory / "control/definition.csv").read_text(encoding="utf-8").splitlines():
        parts = line.split(";")
        if not line.strip() or int(parts[0]) == 0:
            continue
        identifier = int(parts[0])
        rows.append({"id": identifier, "r": int(parts[1]), "g": int(parts[2]), "b": int(parts[3]),
                     "key": parts[4],
                     "kind": "sea" if identifier in sea else "lake" if identifier in lake else "land"})
    return rows


def source_sha256(directory=MAP_DATA):
    directory = Path(directory)
    digests = [hashlib.sha256((directory / name).read_bytes()).hexdigest() for name in FILES]
    return hashlib.sha256("\n".join(digests).encode()).hexdigest()
