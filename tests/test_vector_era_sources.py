import json
from functools import cache
from pathlib import Path

import numpy as np
import shapely
from PIL import Image
from pyproj import Transformer
from shapely.geometry import MultiLineString
from shapely.geometry import shape

ROOT = Path(__file__).resolve().parents[1]
UKITA_ADOPTED_CELLS = 366
DEFERRED_POND_COUNT = 7


def read(name):
    return json.loads((ROOT / name).read_bytes())


def active(feature, year):
    p = feature["properties"]
    return p["validFrom"][0] <= year < p["validUntil"][0]


@cache
def surfaces():
    folder = "kuniezu/map/physical/"
    land = read(folder + "land.geojson")["features"]
    water = read(folder + "water.geojson")["features"]
    shore = read(folder + "coastline.geojson")["features"]
    return land, water, shore


@cache
def land_at(year):
    return shapely.union_all(
        [shape(f["geometry"]) for f in surfaces()[0] if active(f, year)]
    )


def test_katori_protected_land_and_ukita_period_from_original_inputs():
    projection = read("kuniezu/map/projection.json")
    contract = read("kuniezu/map/edits/vector/manifest.json")["overrides"][0]
    source = read(contract["source"])
    protected = shape(
        next(
            f["geometry"]
            for f in source["features"]
            if f["properties"]["id"] == "protected-southeast-land"
        )
    )
    for year in (1560, 1584):
        assert protected.difference(land_at(year)).area == 0
        assert all(
            shape(f["geometry"]).intersection(protected).area == 0
            for f in surfaces()[1]
            if active(f, year)
        )
    edit_file = ROOT / "kuniezu/map/edits/kojima-bay-ukita-land-from-1584.json"
    edit = json.loads(edit_file.read_bytes())["payload"]
    with Image.open(edit_file.parent / edit["mask"]) as image:
        pixels = np.asarray(image.convert("RGB"))
    values = pixels[:, :, 1].astype(np.uint16) * 256 + pixels[:, :, 2]
    rows, cols = np.nonzero(values)
    assert len(cols) == UKITA_ADOPTED_CELLS
    cols = cols + edit["window"][0] + 0.5
    rows = rows + edit["window"][1] + 0.5
    lon = (projection["origin"][0] + cols * projection["stepUnits"]) / (
        projection["K"] * projection["CX"]
    ) + projection["LON0"]
    lat = (
        projection["LAT0"]
        - (projection["origin"][1] + rows * projection["stepUnits"]) / projection["K"]
    )
    assert not shapely.contains_xy(land_at(1560), lon, lat).any()
    assert shapely.contains_xy(land_at(1584), lon, lat).all()


def test_edited_shore_matches_land_and_preserves_non_shore_openings():
    forward = Transformer.from_crs("OGC:CRS84", "EPSG:6677", always_xy=True)
    back = Transformer.from_crs("EPSG:6677", "OGC:CRS84", always_xy=True)
    masks = read("kuniezu/map/physical/shoreline_masks.geojson")
    suppress = shapely.union_all(
        [
            shapely.transform(
                shapely.transform(
                    shape(f["geometry"]), forward.transform, interleaved=False
                ).buffer(f["properties"]["bufferMetres"]),
                back.transform,
                interleaved=False,
            )
            for f in masks["features"]
        ]
    )
    for year in (1560, 1584):
        rows = [f for f in surfaces()[2] if active(f, year)]
        assert all(f["properties"]["drawRole"] == "shore" for f in rows)
        actual = MultiLineString([f["geometry"]["coordinates"] for f in rows])
        expected = land_at(year).boundary.difference(suppress)
        assert actual.equals(expected), (
            year,
            actual.symmetric_difference(expected).length,
        )


def test_deferred_ponds_do_not_become_historical_terrain_facts():
    deferred = read("data/inputs/vector-map-migration/deferred-waters.geojson")
    removed = {f["id"] for f in deferred["features"]}
    assert len(removed) == DEFERRED_POND_COUNT
    assert removed.isdisjoint(f["id"] for f in surfaces()[1])
    backgrounds = [
        f for f in surfaces()[0]
        if f["properties"].get("shapeRole") == "unresolved-prior-surface-background"
    ]
    assert backgrounds
    for feature in backgrounds:
        p = feature["properties"]
        assert p["allowTerrainInference"] is False
        assert p["noHistoricalDryLandAssertion"] is True
        assert p["exactHistoricalShoreline"] is False
        assert set(p["deferredWaterIds"]) == removed


def test_water_evidence_is_separate_from_physical_water():
    source = read("kuniezu/map/physical/water-evidence.geojson")
    assert source["coordinateReferenceSystem"] == "OGC:CRS84"
    evidence = source["features"]
    assert {f["properties"]["id"] for f in evidence} == {
        "iinuma", "minuma", "tsubaki", "shiunji"
    }
    physical_ids = {f["id"] for f in surfaces()[1]}
    for feature in evidence:
        p = feature["properties"]
        assert feature["id"] not in physical_ids
        assert p["changesLandMask"] is False
        assert p["affectsMovement"] is False
        assert p["exactHistoricalShoreline"] is False
        assert p["periodSemantics"] == "display-applicability-only"
        assert p["label"] == p["name"]
        assert p["provenance"]["sources"]
        if p["drawRole"] == "water-label":
            assert feature["geometry"]["type"] == "Point"
            assert p["shapeRole"] == "label-only"
        else:
            assert p["drawRole"] == "inferred-water"
            assert feature["geometry"]["type"] == "Polygon"
            assert p["shapeRole"] == "source-traced-approximate"
