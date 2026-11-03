"""Exercise edit compilation against a tiny raster, including negative cases."""
from datetime import date
import importlib.util
import json
import tempfile
from pathlib import Path

from PIL import Image

source = Path(__file__).resolve().parents[1] / "map/build-province-edits.py"
spec = importlib.util.spec_from_file_location("province_edits", source)
compiler = importlib.util.module_from_spec(spec)
spec.loader.exec_module(compiler)


def write(path, value):
    path.write_text(json.dumps(value), encoding="utf-8")


def rejected(base, out, phrase):
    try:
        compiler.build(base, out, 1600)
    except ValueError as exc:
        assert phrase in str(exc), str(exc)
    else:
        raise AssertionError(f"Expected rejection: {phrase}")
    assert not out.exists(), "invalid edits must not publish replacement tiles"


with tempfile.TemporaryDirectory() as folder:
    root = Path(folder)
    base, edits = root / "base", root / "edits"
    base.mkdir()
    edits.mkdir()
    compiler.EDITS = edits
    write(base / "manifest.json", {
        "width": 2, "height": 2, "tile": 1, "tiles": [],
        "levels": [{"factor": f, "dir": f"provinces-{f}", "width": 1, "height": 1, "tiles": []}
                   for f in (4, 8)],
        "projection": {"origin": [0, 0], "stepUnits": 1, "K": 1, "CX": 1, "LON0": 0, "LAT0": 0},
    })
    definition = base / "definition.csv"
    definition.write_text("id;r;g;b;key;name;kind;pixels\n0;8;24;48;sea;sea;sea;4\n"
                          "1;1;2;3;castle:a;A;land;0\n", encoding="utf-8")
    write(edits / "baseline-ledger.json", {
        "baselineCommit": "fixture", "manifestSha256": compiler.digest(base / "manifest.json"),
        "definitionSha256": compiler.digest(definition), "applied": [{"id": "baked"}],
    })
    write(root / "one.geojson", {"features": [{"geometry": {
        "type": "Polygon", "coordinates": [[[0, 0], [1, 0], [1, -1], [0, -1], [0, 0]]],
    }}]})
    edit = {
        "id": "one", "baseRevision": "fixture", "layer": "provinces",
        "validFrom": [1560, 1, 1], "validUntil": [1616, 1, 1],
        "payload": {"file": "../one.geojson", "feature": 0, "fromKey": "sea", "toKey": "castle:a"},
    }
    primary, secondary = edits / "a.json", edits / "b.json"
    write(primary, edit)
    assert compiler.build(base, root / "good", 1600) == {"one": 1}
    with Image.open(root / "good/provinces/0-0@15600101-16160101.png") as tile:
        assert tile.getpixel((0, 0)) == (1, 2, 3)
    assert compiler.build(base, root / "expired", 1616) == {}

    # The last coarse cell samples the clamped fine-grid centre at (1, 1).
    write(root / "corner.geojson", {"features": [{"geometry": {
        "type": "Polygon", "coordinates": [[[1, -1], [2, -1], [2, -2], [1, -2], [1, -1]]],
    }}]})
    transition = {**edit, "validFrom": [1600, 9, 15], "validUntil": [1600, 9, 17],
                  "payload": {**edit["payload"], "file": "../corner.geojson"}}
    write(primary, transition)
    assert compiler.build(base, root / "pre-transition", date(1600, 9, 14)) == {}
    active = root / "transition"
    assert compiler.build(base, active, date(1600, 9, 15)) == {"one": 1}
    generated = compiler.read_json(active / "manifest.json")
    base_bytes = (base / "manifest.json").read_bytes() + (base / "definition.csv").read_bytes()
    assert generated["baseProvincesSha256"] == compiler.hashlib.sha256(base_bytes).hexdigest()
    assert [entry["factor"] for entry in generated["tiles"]] == [1, 4, 8]
    assert generated["versions"][0]["period"] == [[1600, 9, 15], [1600, 9, 17]]
    for tile in generated["tiles"]:
        assert tile["period"] == generated["versions"][0]["period"]
        assert compiler.digest(active / tile["file"]) == tile["sha256"]
        with Image.open(active / tile["file"]) as png:
            assert png.getpixel((0, 0)) == (1, 2, 3)
    assert compiler.build(base, root / "post-transition", date(1600, 9, 17)) == {}
    write(primary, edit)

    write(secondary, {**edit, "id": "two"})
    rejected(base, root / "overlap", "Overlapping edits")
    write(secondary, {**edit, "validFrom": [1616, 1, 1], "validUntil": [1620, 1, 1]})
    rejected(base, root / "duplicate", "Duplicate or already baked edit")
    write(secondary, {**edit, "id": "baked"})
    rejected(base, root / "baked", "Duplicate or already baked edit")
    secondary.unlink()
    write(primary, {**edit, "payload": {**edit["payload"], "fromKey": "castle:a"}})
    rejected(base, root / "wrong-color", "Unexpected original value")
    definition.write_text("changed", encoding="utf-8")
    rejected(base, root / "wrong-base", "Unexpected baseline definition.csv")

print("PASS: raster edit pixels, half-open dates, conflicts, duplicate IDs and baseline guards")
