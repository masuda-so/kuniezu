import gzip
import hashlib
import json
from pathlib import Path
from zipfile import ZipFile

import pytest
import shapefile

from tools.geo.codh_reference import CRS84
from tools.geo.codh_reference import WGS84_WKT
from tools.geo.codh_reference import inspect_collection
from tools.geo.codh_reference import prepare
from tools.geo.codh_reference import relationships


def collection(features):
    return {
        "type": "FeatureCollection",
        "crs": {"properties": {"name": CRS84}},
        "features": features,
    }


def feature(geometry):
    return {"type": "Feature", "properties": {"id": "shared"}, "geometry": geometry}


def retained(tmp_path, data):
    raw = json.dumps(data).encode()
    packed = gzip.compress(raw, mtime=0)
    (tmp_path / "reference.gz").write_bytes(packed)
    row = {
        "key": "reference",
        "file": "reference.gz",
        "bytes": len(raw),
        "sha256": hashlib.sha256(raw).hexdigest(),
        "archiveSha256": hashlib.sha256(packed).hexdigest(),
        "features": len(data["features"]),
        "sourceIdField": "id",
        "url": "https://example.test/reference",
        "dataset": "reference",
        "license": "CC-BY-4.0",
        "credit": "reference",
        "sourceCrs": CRS84,
        "interpretation": "declared-CRS84",
        "temporalScope": "Edo-reference-not-Sengoku-assertion",
    }
    manifest = tmp_path / "manifest.json"
    manifest.write_text(json.dumps({"datasets": [row]}))
    return manifest, packed


def test_null_and_duplicate_ids_remain_separate_source_rows(tmp_path):
    features = [feature(None), feature({"type": "Point", "coordinates": [139, 35]})]
    data = {**collection(features), "name": "original collection"}
    manifest, packed = retained(tmp_path, data)
    output = tmp_path / "output"
    report = prepare(manifest, output)
    result = json.loads((output / "reference.geojson").read_text())
    assert result["features"] == [
        {**row, "id": index} for index, row in enumerate(features)
    ]
    assert "crs" not in result
    assert result["name"] == data["name"]
    assert report["datasets"][0]["duplicateSourceIds"] == {"shared": len(features)}
    assert (tmp_path / "reference.gz").read_bytes() == packed
    assert (
        report["datasets"][0]["temporalScope"] == "Edo-reference-not-Sengoku-assertion"
    )


@pytest.mark.parametrize(
    "geometry",
    [
        {"type": "Point", "coordinates": [139, float("nan")]},
        {"type": "Point", "coordinates": [139, 95]},
        {"type": "LineString", "coordinates": [[139, 35]]},
        {"type": "Polygon", "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 1]]]},
    ],
)
def test_invalid_geometry_is_not_silently_repaired(geometry):
    with pytest.raises(ValueError, match=r"finite|bounds|Line needs|Polygon rings"):
        inspect_collection(collection([feature(geometry)]), "id")


def test_unknown_crs_is_not_relabelled_as_wgs84():
    data = collection([feature(None)])
    data["crs"]["properties"]["name"] = "EPSG:3857"
    with pytest.raises(ValueError, match="reference system"):
        inspect_collection(data, "id")


def test_tampered_archive_produces_no_output(tmp_path):
    manifest, packed = retained(tmp_path, collection([feature(None)]))
    (tmp_path / "reference.gz").write_bytes(packed + b"changed")
    output = tmp_path / "output"
    with pytest.raises(ValueError, match="SHA"):
        prepare(manifest, output)
    assert not output.exists()


def test_existing_output_is_preserved(tmp_path):
    manifest, _ = retained(tmp_path, collection([feature(None)]))
    output = tmp_path / "output"
    output.mkdir()
    (output / "marker").write_text("preserve")
    with pytest.raises(FileExistsError):
        prepare(manifest, output)
    assert (output / "marker").read_text() == "preserve"


def test_real_inputs_report_missing_geometry_without_inventing_connections():
    root = Path(__file__).resolve().parents[1]
    report = prepare(root / "data/inputs/codh-edo/manifest.json")
    road = report["relationships"]["roadPost"]
    assert "R505" in road["postRoadIdsWithoutLines"]
    assert "R200" in road["repeatedRoadIds"]
    assert road["postIdsWithDifferentCoordinates"]
    assert road["automaticMergeOrConnectionPerformed"] is False
    assert report["relationships"]["lake"]["polygonIdsWithoutPoint"] == []
    assert report["relationships"]["lake"]["polygonInferredFromPoint"] is False


@pytest.mark.parametrize(
    ("field", "value", "error"),
    [
        ("sourceCrs", "EPSG:3857", "metadata differs"),
        ("temporalScope", "Sengoku-confirmed", "must not be promoted"),
    ],
)
def test_reference_metadata_cannot_change_coordinates_or_historical_scope(
    tmp_path, field, value, error
):
    manifest, _ = retained(tmp_path, collection([feature(None)]))
    data = json.loads(manifest.read_text())
    data["datasets"][0][field] = value
    manifest.write_text(json.dumps(data))
    with pytest.raises(ValueError, match=error):
        prepare(manifest)


def test_post_with_unknown_coordinates_remains_unlocated():
    post = {
        "id": 0,
        "properties": {"id": "R200-001", "shukuba_id": "S1", "road_id": "R200"},
        "geometry": None,
    }
    layers = [("roads", {"features": []}), ("posts", {"features": [post]})]
    report = relationships(layers)["roadPost"]
    assert report["postRowsWithoutCoordinates"] == [post["id"]]
    assert report["postIdsWithDifferentCoordinates"] == {}
    assert report["postRoadIdsWithoutLines"] == ["R200"]
    assert report["automaticMergeOrConnectionPerformed"] is False


def retained_polygons(tmp_path, wkt=WGS84_WKT, encoding="UTF-8"):
    base = tmp_path / "shape"
    with shapefile.Writer(str(base), shapeType=shapefile.POLYGON) as writer:
        writer.field("data_name", "C", size=10)
        writer.field("object_id", "C", size=10)
        writer.poly(
            [
                [[0, 0], [0, 4], [4, 4], [4, 0], [0, 0]],
                [[1, 1], [2, 1], [2, 2], [1, 2], [1, 1]],
            ]
        )
        writer.record("coastline", "1929")
        writer.null()
        writer.record("coastline", "1929")
    base.with_suffix(".prj").write_text(wkt)
    base.with_suffix(".cpg").write_text(encoding)
    archive_path = tmp_path / "polygons.zip"
    with ZipFile(archive_path, "w") as archive:
        for extension in [".shp", ".shx", ".dbf", ".prj", ".cpg"]:
            archive.write(base.with_suffix(extension), arcname="shape" + extension)
    raw = archive_path.read_bytes()
    manifest, _ = retained(tmp_path, collection([feature(None), feature(None)]))
    data = json.loads(manifest.read_text())
    data["datasets"][0].update(
        file="polygons.zip",
        format="shapefile-zip",
        memberBase="shape",
        projectionWkt=wkt,
        sourceCrs=wkt,
        sourceIdField="object_id",
        archiveSha256=hashlib.sha256(raw).hexdigest(),
        sha256=hashlib.sha256(raw).hexdigest(),
        bytes=len(raw),
    )
    manifest.write_text(json.dumps(data))
    return manifest


def test_shapefile_preserves_hole_null_and_original_attributes(tmp_path):
    manifest = retained_polygons(tmp_path)
    output = tmp_path / "output"
    prepare(manifest, output)
    features = json.loads((output / "reference.geojson").read_text())["features"]
    polygon, empty = features
    assert polygon["geometry"] == {
        "type": "Polygon",
        "coordinates": [
            [[0, 0], [0, 4], [4, 4], [4, 0], [0, 0]],
            [[1, 1], [2, 1], [2, 2], [1, 2], [1, 1]],
        ],
    }
    assert polygon["properties"] == {"data_name": "coastline", "object_id": "1929"}
    assert empty["geometry"] is None
    assert empty["properties"] == polygon["properties"]
    assert polygon["id"] != empty["id"]


@pytest.mark.parametrize(
    ("wkt", "encoding", "error"),
    [
        ("EPSG:3857", "UTF-8", "Unsupported Shapefile projection"),
        (WGS84_WKT, "CP932", "Unexpected Shapefile character encoding"),
    ],
)
def test_shapefile_unknown_projection_or_encoding_is_rejected(
    tmp_path, wkt, encoding, error
):
    manifest = retained_polygons(tmp_path, wkt, encoding)
    with pytest.raises(ValueError, match=error):
        prepare(manifest)
