"""The county shapes committed in kuniezu/map/admin/ and the tool that makes them.

The shapes are written by ``write_county_tables`` on a machine with the CODH
source (docs/designs/county-territory.md). CI has no source, so these tests
check the committed files and the tool on small hand-made shapes.
"""

import json
import subprocess
from functools import cache
from pathlib import Path

import pytest
from shapely.geometry import Point
from shapely.geometry import shape

from tools.geo.county_tables import build
from tools.geo.county_tables import dumps

ROOT = Path(__file__).resolve().parents[1]
ADMIN = ROOT / "kuniezu" / "map" / "admin"
JAPAN_COUNTIES = 806
JAPANESE_CASTLES = 358
MIN_CASTLES_FOR_CELLS = 2


@cache
def read(name):
    return json.loads((ADMIN / name).read_text(encoding="utf-8"))


@cache
def castle_points():
    points = {}
    for line in (ROOT / "data/research/implemented-sites.jsonl").open(encoding="utf-8"):
        row = json.loads(line)
        if row.get("kind") == "castle-node":
            points["castle:" + row["id"].removeprefix("node:")] = row["point"]
        elif row.get("kind") == "城":
            points["castle:" + row["id"]] = row["point"]
    return points


@pytest.mark.parametrize(
    "name",
    [
        "gun-shapes.geojson",
        "gun-cells.geojson",
        "gun-exceptions.geojson",
        "gun-edges.geojson",
    ],
)
def test_collections_pass_the_game_vector_loader_rules(name):
    collection = read(name)

    # kuniezu/static/kuniezu/vector-assets.js refuses anything else.
    assert collection["type"] == "FeatureCollection"
    assert isinstance(collection["features"], list)
    assert "crs" not in collection
    assert collection["coordinateReferenceSystem"] == "OGC:CRS84"


def test_every_japanese_county_has_a_shape_in_id_order():
    features = read("gun-shapes.geojson")["features"]
    ids = [f["properties"]["id"] for f in features]

    assert len(ids) == JAPAN_COUNTIES
    assert ids == sorted(ids)
    assert read("gun-shapes.geojson")["license"] == "CC-BY-NC-4.0"
    for feature in features:
        assert set(feature["properties"]) == {
            "id",
            "name",
            "yomi",
            "kuni",
            "kuniName",
            "castles",
        }
        assert feature["geometry"]["type"] == "MultiPolygon"


def test_every_japanese_castle_is_in_exactly_one_county():
    points = castle_points()
    overrides = json.loads(
        (ADMIN / "castle-gun-overrides.json").read_text(encoding="utf-8")
    )
    listed = [
        key
        for f in read("gun-shapes.geojson")["features"]
        for key in f["properties"]["castles"]
    ]
    japanese = set(points) - set(overrides["outsideJapan"])

    assert len(listed) == len(set(listed))
    assert set(listed) == japanese
    assert len(japanese) == JAPANESE_CASTLES


def test_listed_castles_lie_in_their_county_unless_assigned_by_hand():
    points = castle_points()
    overrides = json.loads(
        (ADMIN / "castle-gun-overrides.json").read_text(encoding="utf-8")
    )
    for feature in read("gun-shapes.geojson")["features"]:
        county = shape(feature["geometry"]).buffer(0.002)  # simplified border
        for key in feature["properties"]["castles"]:
            if key in overrides["assign"]:
                assert overrides["assign"][key]["gun"] == feature["properties"]["id"]
                continue
            assert county.covers(Point(points[key])), key


def test_counties_with_two_or_more_castles_are_cut_into_one_cell_per_castle():
    shapes = {f["properties"]["id"]: f for f in read("gun-shapes.geojson")["features"]}
    points = castle_points()
    by_gun: dict[str, list] = {}
    for feature in read("gun-cells.geojson")["features"]:
        by_gun.setdefault(feature["properties"]["gun"], []).append(feature)
    expected = {
        gid
        for gid, f in shapes.items()
        if len(f["properties"]["castles"]) >= MIN_CASTLES_FOR_CELLS
    }

    assert set(by_gun) == expected
    for gid, cells in by_gun.items():
        keys = [c["properties"]["castle"] for c in cells]
        assert sorted(keys) == sorted(shapes[gid]["properties"]["castles"]), gid
        county = shape(shapes[gid]["geometry"])
        assert sum(shape(c["geometry"]).area for c in cells) == pytest.approx(
            county.area, rel=1e-3
        ), gid
        for cell in cells:
            key = cell["properties"]["castle"]
            if (
                key
                in json.loads(
                    (ADMIN / "castle-gun-overrides.json").read_text(encoding="utf-8")
                )["assign"]
            ):
                continue
            assert shape(cell["geometry"]).buffer(1e-5).covers(Point(points[key])), key


def test_castle_keys_match_the_game():
    script = (
        "const {model}=require('./tools/checks/history-focus.cjs');"
        "const {G,TK}=model();"
        "const main=TK.CASTLES.map(c=>'castle:'+c[0]);"
        "const others=G.YOSHO.filter(y=>y.kind==='城').map(y=>'castle:'+y.id);"
        "process.stdout.write(JSON.stringify([...main,...others].sort()))"
    )
    result = subprocess.run(  # noqa: S603
        ["node", "-e", script],  # noqa: S607
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=True,
    )
    game = set(json.loads(result.stdout))

    assert set(castle_points()) == game


def test_edges_join_existing_units_with_non_empty_lines():
    shapes = read("gun-shapes.geojson")["features"]
    units = {
        "gun:" + f["properties"]["id"]
        for f in shapes
        if len(f["properties"]["castles"]) < MIN_CASTLES_FOR_CELLS
    }
    units |= {
        "cell:" + f["properties"]["gun"] + "|" + f["properties"]["castle"]
        for f in read("gun-cells.geojson")["features"]
    }
    pairs = []
    for feature in read("gun-edges.geojson")["features"]:
        a, b = feature["properties"]["a"], feature["properties"]["b"]
        assert a < b
        assert a in units, a
        assert b in units, b
        assert feature["geometry"]["type"] == "MultiLineString"
        assert all(len(line) >= 2 for line in feature["geometry"]["coordinates"])  # noqa: PLR2004
        pairs.append((a, b))
    assert pairs == sorted(set(pairs))


def test_exceptions_name_known_counties_and_carry_no_shape():
    ids = {f["properties"]["id"] for f in read("gun-shapes.geojson")["features"]}
    source = json.loads((ADMIN / "gun-exceptions.json").read_text(encoding="utf-8"))
    features = read("gun-exceptions.geojson")["features"]

    assert len(features) == len(source["exceptions"])
    for feature in features:
        assert feature["properties"]["gun"] in ids
        assert feature["properties"]["rule"] in {"context", "neutral-without-castle"}
        assert feature["geometry"] is None


def square(x, y, w=1.0, h=1.0):
    return {
        "type": "Polygon",
        "coordinates": [[[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]]],
    }


def county(gid, geometry):
    return {
        "id": gid,
        "name": gid,
        "yomi": "",
        "kuni": "K1",
        "kuniName": "国",
        "geometry": geometry,
    }


def test_build_keeps_shared_borders_and_cuts_cells():
    guns = [county("G2", square(1, 0)), county("G1", square(0, 0))]
    castles: list[dict] = [
        {"key": "castle:a", "gun": "G1", "point": [0.25, 0.5]},
        {"key": "castle:b", "gun": "G1", "point": [0.75, 0.5]},
        {"key": "castle:c", "gun": "G2", "point": [1.5, 0.5]},
        {"key": "castle:far", "gun": None, "point": [9, 9]},
    ]
    files = build(guns, castles, [{"gun": "G2", "rule": "context", "key": "context:x"}])

    shapes = files["gun-shapes.geojson"]["features"]
    assert [f["properties"]["id"] for f in shapes] == ["G1", "G2"]
    assert shapes[0]["properties"]["castles"] == ["castle:a", "castle:b"]
    left, right = (shape(f["geometry"]) for f in shapes)
    assert left.intersection(right).length == pytest.approx(1.0)
    cells = files["gun-cells.geojson"]["features"]
    assert [c["properties"]["castle"] for c in cells] == ["castle:a", "castle:b"]
    assert sum(shape(c["geometry"]).area for c in cells) == pytest.approx(1.0)


def test_build_refuses_a_sliver_gap_between_counties():
    guns = [county("G1", square(0, 0)), county("G2", square(1.0000001, 0))]

    with pytest.raises(ValueError, match="gaps"):
        build(guns, [], [])


def test_build_refuses_castles_sharing_a_point():
    guns = [county("G1", square(0, 0))]
    castles = [
        {"key": "castle:a", "gun": "G1", "point": [0.5, 0.5]},
        {"key": "castle:b", "gun": "G1", "point": [0.5, 0.5]},
    ]

    with pytest.raises(ValueError, match="share a point"):
        build(guns, castles, [])


def test_build_refuses_overlapping_counties():
    guns = [county("G1", square(0, 0)), county("G2", square(0.5, 0))]

    with pytest.raises(ValueError, match="overlap"):
        build(guns, [], [])


def test_build_refuses_an_exception_for_an_unknown_county():
    with pytest.raises(ValueError, match="unknown county"):
        build([county("G1", square(0, 0))], [], [{"gun": "G9", "rule": "context"}])


def test_written_text_is_stable():
    guns = [county("G1", square(0, 0))]
    first = dumps(build(guns, [], [])["gun-shapes.geojson"])
    second = dumps(build(guns, [], [])["gun-shapes.geojson"])

    assert first == second
    assert json.loads(first)["features"][0]["properties"]["id"] == "G1"
