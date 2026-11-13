"""Loading, linking and writing county shapes with GeoDjango (config.settings.geo).

Run with ``uv run pytest --ds=config.settings.geo tests_geo``. The fixtures are
small hand-made shapes, not CODH data.
"""

from pathlib import Path

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError

from kuniezu.geo.models import CastlePoint
from kuniezu.geo.models import Gun
from kuniezu.geo.models import Kuni

FIXTURES = Path(__file__).parent / "fixtures"
MINI = FIXTURES / "codh-kg-mini"
PROVINCES = 2
COUNTIES = 5
ISLAND_PARTS = 2


def load_and_link(overrides="overrides.json"):
    call_command("load_codh_kg", source=MINI)
    call_command(
        "link_places", sites=FIXTURES / "sites.jsonl", overrides=FIXTURES / overrides
    )


@pytest.mark.django_db
def test_load_codh_kg_reads_provinces_and_counties():
    call_command("load_codh_kg", source=MINI)

    assert Kuni.objects.count() == PROVINCES
    assert Gun.objects.count() == COUNTIES
    assert Gun.objects.get(codh_id="G01002").kuni.codh_id == "K01"
    assert all(g.geom.valid for g in Gun.objects.all())


@pytest.mark.django_db
def test_parts_of_one_county_become_one_valid_shape():
    call_command("load_codh_kg", source=MINI)

    touching = Gun.objects.get(codh_id="G02002").geom
    island = Gun.objects.get(codh_id="G02003").geom
    assert touching.valid
    assert touching.area == pytest.approx(0.5 + 0.5)
    assert len(island) == ISLAND_PARTS


@pytest.mark.django_db
def test_loading_again_gives_the_same_rows():
    call_command("load_codh_kg", source=MINI)
    first = sorted((g.codh_id, g.geom.wkt) for g in Gun.objects.all())
    call_command("load_codh_kg", source=MINI)
    second = sorted((g.codh_id, g.geom.wkt) for g in Gun.objects.all())

    assert first == second


@pytest.mark.django_db
def test_a_single_broken_shape_is_refused_not_repaired():
    with pytest.raises(CommandError, match="invalid shapes: G01002"):
        call_command("load_codh_kg", source=FIXTURES / "codh-kg-broken")


@pytest.mark.django_db
def test_a_folder_without_shapes_stops(tmp_path):
    with pytest.raises(CommandError, match="no K"):
        call_command("load_codh_kg", source=tmp_path)


@pytest.mark.django_db
def test_castles_are_linked_to_the_county_that_covers_them():
    load_and_link()

    links = dict(CastlePoint.objects.values_list("key", "gun__codh_id"))
    assert links == {
        "castle:a": "G01001",
        "castle:yosho:乙城:0.75:0.5": "G01001",
        "castle:b": "G01002",
        "castle:far": None,
    }
    assert CastlePoint.objects.get(key="castle:a").waypoint
    assert not CastlePoint.objects.get(key="castle:yosho:乙城:0.75:0.5").waypoint


@pytest.mark.django_db
def test_a_castle_outside_every_county_stops_unless_listed():
    with pytest.raises(CommandError, match="castle:far"):
        load_and_link("overrides-strict.json")


@pytest.mark.django_db
def test_written_tables_are_byte_identical_and_cut_cells(tmp_path):
    load_and_link()
    first, second = tmp_path / "1", tmp_path / "2"
    for out in (first, second):
        call_command(
            "write_county_tables", output=out, exceptions=FIXTURES / "exceptions.json"
        )

    for name in ("gun-shapes.geojson", "gun-cells.geojson", "gun-exceptions.geojson"):
        assert (first / name).read_bytes() == (second / name).read_bytes()
    cells = (first / "gun-cells.geojson").read_text(encoding="utf-8")
    assert '"castle":"castle:a"' in cells
    assert '"castle":"castle:yosho:乙城:0.75:0.5"' in cells


@pytest.mark.django_db
def test_overlapping_counties_are_refused_when_written(tmp_path):
    call_command("load_codh_kg", source=FIXTURES / "codh-kg-overlap")
    call_command(
        "link_places",
        sites=FIXTURES / "sites.jsonl",
        overrides=FIXTURES / "overrides.json",
    )

    with pytest.raises(ValueError, match="overlap"):
        call_command(
            "write_county_tables",
            output=tmp_path,
            exceptions=FIXTURES / "exceptions.json",
        )


@pytest.mark.django_db
def test_writing_without_linked_castles_stops(tmp_path):
    call_command("load_codh_kg", source=MINI)

    with pytest.raises(CommandError, match="link_places"):
        call_command(
            "write_county_tables",
            output=tmp_path,
            exceptions=FIXTURES / "exceptions.json",
        )
