import copy
import hashlib
import json

import pytest
import shapely
from shapely.geometry import Point
from shapely.geometry import shape

from tools.geo import codh_topology
from tools.geo.codh_preview import load_surfaces

TWO_TRIANGLE_AREA = 2
LAND_MINUS_LAKE_AREA = 96


def collection(coordinates):
    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "id": 0,
                "properties": {"period": "Edo", "source": "fixture"},
                "geometry": {"type": "Polygon", "coordinates": coordinates},
            }
        ],
    }


def test_valid_source_and_null_are_unchanged():
    data = collection([[[0, 0], [3, 0], [3, 3], [0, 3], [0, 0]]])
    data["features"].append({"type": "Feature", "properties": {}, "geometry": None})
    before = copy.deepcopy(data)
    surface, residuals, repairs = codh_topology.normalize_layer(data)
    assert surface == before
    assert data == before
    assert residuals["features"] == repairs == []


def test_crossing_is_noded_without_moving_source_vertices():
    data = collection([[[0, 0], [2, 2], [2, 0], [0, 2], [0, 0]]])
    original = copy.deepcopy(data)
    surface, residuals, repairs = codh_topology.normalize_layer(data)
    geometry = shape(surface["features"][0]["geometry"])
    assert geometry.is_valid
    assert geometry.area == TWO_TRIANGLE_AREA
    assert (1, 1) in codh_topology.positions(geometry)
    assert codh_topology.positions(
        shape(data["features"][0]["geometry"])
    ) <= codh_topology.positions(geometry)
    assert surface["features"][0]["properties"] == original["features"][0]["properties"]
    assert data == original
    assert repairs[0]["insertedIntersectionPositions"] == 1
    assert residuals["features"] == []


def test_collapsed_edges_remain_available_but_are_not_land():
    data = collection([[[0, 0], [1, 0], [2, 0], [0, 0]]])
    surface, residuals, repairs = codh_topology.normalize_layer(data)
    assert surface["features"][0]["geometry"] is None
    residual = shape(residuals["features"][0]["geometry"])
    assert residual.is_valid
    assert codh_topology.positions(residual) == {(0, 0), (1, 0), (2, 0)}
    assert repairs[0]["surfaceType"] is None


def test_render_components_keep_the_exact_union():
    geometry = shape(
        {
            "type": "MultiPolygon",
            "coordinates": [
                [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
                [[[3, 0], [4, 0], [4, 1], [3, 1], [3, 0]]],
            ],
        }
    )
    result = codh_topology.surface_collection(geometry, "reference", components=True)
    assert len(result["features"]) == len(geometry.geoms)
    assert all(f["geometry"]["type"] == "Polygon" for f in result["features"])
    assert shapely.symmetric_difference(codh_topology.union(result), geometry).is_empty


@pytest.fixture
def small_references(monkeypatch):
    def references(_manifest, output):
        output.mkdir()
        for key, coords in {
            "coast-polygons": [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]],
            "lake-polygons": [[[2, 2], [4, 2], [4, 4], [2, 4], [2, 2]]],
        }.items():
            (output / (key + ".geojson")).write_text(
                json.dumps(collection(coords)), encoding="utf-8"
            )
        return {
            "datasets": [
                {
                    "key": key,
                    "sourceSha256": hashlib.sha256(
                        (output / (key + ".geojson")).read_bytes()
                    ).hexdigest(),
                }
                for key in ("coast-polygons", "lake-polygons")
            ]
        }

    monkeypatch.setattr(codh_topology, "prepare_references", references)


@pytest.mark.usefixtures("small_references")
def test_combined_land_excludes_lake_and_keeps_reference_scope(tmp_path):
    output = tmp_path / "result"
    report = codh_topology.prepare(output=output)
    land = json.loads((output / "land-with-water.geojson").read_text(encoding="utf-8"))
    geometry = shape(land["features"][0]["geometry"])
    assert geometry.area == LAND_MINUS_LAKE_AREA
    assert geometry.contains(Point(1, 1))
    assert not geometry.contains(Point(3, 3))
    assert report["temporalScope"] == "Edo-reference-not-Sengoku-assertion"
    assert len(report["outputs"]) == len(list(output.glob("*.geojson")))


@pytest.mark.usefixtures("small_references")
def test_existing_output_is_preserved(tmp_path):
    output = tmp_path / "existing"
    output.mkdir()
    marker = output / "keep.txt"
    marker.write_text("keep", encoding="utf-8")
    with pytest.raises(FileExistsError):
        codh_topology.prepare(output=output)
    assert list(output.iterdir()) == [marker]


@pytest.mark.usefixtures("small_references")
def test_comparison_checks_surface_bytes_and_source_versions(tmp_path):
    output = tmp_path / "prepared"
    report = codh_topology.prepare(output=output)
    expected = {row["key"]: row["source"]["sourceSha256"] for row in report["layers"]}
    assert load_surfaces(output, expected)["coast-polygons"]["features"]
    stale = {**expected, "coast-polygons": "0" * 64}
    with pytest.raises(ValueError, match="different source versions"):
        load_surfaces(output, stale)
    file = output / "land-with-water.geojson"
    file.write_bytes(file.read_bytes() + b" ")
    with pytest.raises(ValueError, match="SHA mismatch"):
        load_surfaces(output, expected)


def test_real_inputs_produce_valid_surfaces_without_discarding_source_rows(tmp_path):
    output = tmp_path / "adopted"
    report = codh_topology.prepare(output=output)
    expected = {"coast-polygons": 29, "lake-polygons": 11}
    for layer in report["layers"]:
        assert len(layer["repairs"]) == expected[layer["key"]]
        assert all(
            row["retainedSourceCoordinatePositions"] == row["sourceCoordinatePositions"]
            for row in layer["repairs"]
        )
        data = json.loads(
            (output / (layer["key"] + ".geojson")).read_text(encoding="utf-8")
        )
        assert len(data["features"]) == layer["source"]["features"]
    for file in output.glob("*.geojson"):
        data = json.loads(file.read_text(encoding="utf-8"))
        assert all(
            shapely.is_valid(shape(f["geometry"]))
            for f in data["features"]
            if f["geometry"] is not None
        )
