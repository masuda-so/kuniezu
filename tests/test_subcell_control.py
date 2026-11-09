"""Retained upland, period surfaces and explicit game control share geometry."""

import json
from pathlib import Path
from typing import Any

from shapely.geometry import shape
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parents[1]
AREA_TOLERANCE = 1e-15
RESTORED_AREA_RANGE = (9.69e-7, 9.70e-7)


def collection(file: str) -> dict[str, Any]:
    return json.loads((ROOT / file).read_text())


def active(feature: dict[str, Any], year: int) -> bool:
    props = feature["properties"]
    return (
        props.get("validFrom", [1560])[0] <= year < props.get("validUntil", [1616])[0]
    )


def test_hayashima_upland_and_control_keep_the_adopted_source() -> None:
    reference = collection(
        "data/inputs/kojima-coast-review/hayashima-upland-comparison.geojson"
    )
    upland = shape(reference["features"][0]["geometry"])
    controls = collection("kuniezu/map/control/subcell.geojson")
    definition = collection("kuniezu/map/edits/applied/hayashima-upland.json")
    control = controls["features"][0]
    geometry = shape(control["geometry"])
    assert control["properties"]["key"] == definition["payload"]["toKey"]
    assert control["properties"]["sourceCorrection"] == definition["id"]
    assert geometry.difference(upland).area < AREA_TOLERANCE
    assert RESTORED_AREA_RANGE[0] < geometry.area < RESTORED_AREA_RANGE[1]
    lands = collection("kuniezu/map/physical/land.geojson")["features"]
    waters = collection("kuniezu/map/physical/water.geojson")["features"]
    for year in (1560, 1583, 1584, 1615):
        land = unary_union([shape(f["geometry"]) for f in lands if active(f, year)])
        water = unary_union([shape(f["geometry"]) for f in waters if active(f, year)])
        assert upland.difference(land).area < AREA_TOLERANCE
        assert geometry.difference(land).area < AREA_TOLERANCE
        assert geometry.intersection(water).area < AREA_TOLERANCE
        assert active(control, year)


def test_simultaneous_subcell_controls_do_not_overlap() -> None:
    controls = collection("kuniezu/map/control/subcell.geojson")["features"]
    for index, feature in enumerate(controls):
        assert feature["properties"]["drawRole"] == "control"
        assert feature["properties"]["key"].startswith("castle:")
        first = shape(feature["geometry"])
        assert first.is_valid
        for other in controls[index + 1 :]:
            a, b = feature["properties"], other["properties"]
            if max(a["validFrom"], b["validFrom"]) < min(
                a["validUntil"], b["validUntil"]
            ):
                assert (
                    first.intersection(shape(other["geometry"])).area < AREA_TOLERANCE
                )
