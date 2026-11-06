import json

import pytest

from tools.geo.prepare_era_overrides import ROOT
from tools.geo.prepare_era_overrides import prepare

MANIFEST = ROOT / "kuniezu/map/edits/vector/manifest.json"
SELECTED_FEATURES = 8
OPEN_BOUNDARIES = 5


@pytest.mark.parametrize(
    ("day", "count"),
    [("1559-12-31", 0), ("1560-01-01", 1), ("1615-12-31", 1), ("1616-01-01", 0)],
)
def test_half_open_year_scope(day, count):
    assert len(prepare(MANIFEST, at=day)["overrides"]) == count


def test_preserves_coordinates_and_paired_land_and_open_boundaries(tmp_path):
    out = tmp_path / "prepared"
    result = prepare(MANIFEST, out)
    row = result["overrides"][0]
    original = json.loads((ROOT / row["source"]).read_text(encoding="utf-8"))
    features = {f["properties"]["id"]: f for f in original["features"]}
    emitted = json.loads((out / (row["id"] + ".geojson")).read_text(encoding="utf-8"))
    chosen = emitted["features"]
    assert len(chosen) == SELECTED_FEATURES
    assert all(f == features[f["properties"]["id"]] for f in chosen)
    assert row["components"]["protectedLand"] == ["protected-southeast-land"]
    assert len(row["components"]["openBoundaries"]) == OPEN_BOUNDARIES
    assert row["exactHistoricalShoreline"] is False
    assert "outer-lake-wide-perimeter" not in [f["properties"]["id"] for f in chosen]


@pytest.mark.parametrize(
    "failure", ["missing-cut", "missing-land", "sha", "exact", "period", "path"]
)
def test_rejects_invalid_assembly_before_writing(tmp_path, failure):
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    row = manifest["overrides"][0]
    if failure == "missing-cut":
        row["components"]["openBoundaries"].pop()
    elif failure == "missing-land":
        row["components"]["protectedLand"] = []
    elif failure == "sha":
        row["sha256"] = "0" * 64
    elif failure == "exact":
        row["exactHistoricalShoreline"] = True
    elif failure == "period":
        row["validUntil"] = [1559, 1, 1]
    else:
        row["source"] = "../outside.geojson"
    source = tmp_path / "input.json"
    source.write_text(json.dumps(manifest), encoding="utf-8")
    out = tmp_path / "output"
    with pytest.raises(
        ValueError,
        match=r"exclusions|inseparable|SHA|exact historical|period|outside",
    ):
        prepare(source, out)
    assert not out.exists()


def test_existing_output_is_preserved(tmp_path):
    out = tmp_path / "existing"
    out.mkdir()
    marker = out / "keep.txt"
    marker.write_text("keep", encoding="utf-8")
    with pytest.raises(FileExistsError):
        prepare(MANIFEST, out)
    assert list(out.iterdir()) == [marker]
    assert marker.read_text(encoding="utf-8") == "keep"
