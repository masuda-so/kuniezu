import hashlib
import json
from io import BytesIO
from pathlib import Path
from zipfile import ZipFile

import shapefile
import shapely
from pyproj import Transformer
from pyproj import network
from shapely.geometry import Point
from shapely.geometry import shape

ROOT = Path(__file__).resolve().parents[1]
CENTRES = {
    "lake:towada": (140.87117750808818, 40.458659),
    "lake:tazawa": (140.663234237704, 39.724741),
    "lake:inawashiro": (140.09889753212292, 37.4733445),
    "lake:kiba": (136.44419477540106, 36.366313),
    "lake:yogo": (136.19439179474546, 35.522787),
}


def test_direct_geojson_sources_have_valid_surfaces_and_preserve_lake_centres():
    for directory in ("physical", "admin", "control"):
        for file in (ROOT / "kuniezu/map" / directory).rglob("*.geojson"):
            data = json.loads(file.read_text(encoding="utf-8"))
            assert data["type"] == "FeatureCollection"
            for feature in data["features"]:
                if feature["geometry"] is not None:
                    assert shapely.is_valid(shape(feature["geometry"])), str(file)
    file = ROOT / "kuniezu/map/physical/lakes-reference.geojson"
    data = json.loads(file.read_text(encoding="utf-8"))
    features = {f["id"]: f for f in data["features"]}
    assert set(CENTRES) <= set(features)
    for key, centre in CENTRES.items():
        feature = features[key]
        assert shape(feature["geometry"]).contains(Point(centre))
        assert feature["properties"]["shapeRole"] == "modern-comparison"
        assert feature["properties"]["exactHistoricalShoreline"] is False


def test_retained_mlit_source_and_coordinate_operation():
    folder = ROOT / "data/inputs/mlit-w09-2005"
    metadata = json.loads((folder / "manifest.json").read_text(encoding="utf-8"))
    archive_bytes = (folder / "W09-05_GML.zip").read_bytes()
    assert hashlib.sha256(archive_bytes).hexdigest() == metadata["sha256"]
    network.set_network_enabled(False)
    transformer = Transformer.from_crs(
        "EPSG:4612", "OGC:CRS84", always_xy=True, allow_ballpark=False, only_best=True
    )
    assert transformer.accuracy == metadata["coordinateOperation"]["accuracyMetres"]
    with ZipFile(BytesIO(archive_bytes)) as archive:
        declared = archive.read("KS-META-W09-05-g.xml").decode("cp932")
        assert "JGD2000 / (B,L)" in declared
        reader = shapefile.Reader(
            shp=BytesIO(archive.read("W09-05-g_Lake.shp")),
            shx=BytesIO(archive.read("W09-05-g_Lake.shx")),
            dbf=BytesIO(archive.read("W09-05-g_Lake.dbf")),
            encoding="cp932",
        )
        for row in metadata["selected"]:
            assert reader.record(row["sourceRecord"])["W09_001"] == row["sourceName"]
            source = shape(reader.shape(row["sourceRecord"]).__geo_interface__)
            point = source.representative_point()
            longitude, latitude = transformer.transform(point.x, point.y, errcheck=True)
            assert longitude > latitude
            assert row["id"] in CENTRES
