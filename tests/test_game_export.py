import json
import re
import shutil
from pathlib import Path

import pytest
from django.conf import settings
from django.core.management import call_command
from django.core.management.base import CommandError

from kuniezu.history import dates
from kuniezu.history import export
from kuniezu.history.export import Evidence
from kuniezu.history.importer import MONTH_TABLE
from kuniezu.history.importer import import_history
from kuniezu.history.models import Phenomenon
from kuniezu.history.models import PhenomenonKind
from kuniezu.history.models import Record
from kuniezu.history.models import RecordType

ROOT = Path(settings.BASE_DIR)
TABLE = ROOT / MONTH_TABLE
DEFAULT_OWNERS = ROOT / "kuniezu/static/kuniezu/history/owners.js"


def day(year, month, number, *, leap=False):
    return {
        "kind": "dated-event",
        "date": [year, month, number],
        "calendar": "Japanese-lunisolar",
        "leapMonth": leap,
        "precision": "day",
    }


def year(value):
    return {
        "kind": "year-window",
        "year": value,
        "calendar": "Japanese-year",
        "precision": "year",
    }


def jd(time):
    if "date" in time:
        return (
            dates.lunisolar_to_jd(TABLE, *time["date"], leap=time["leapMonth"]),
        ) * 2
    return dates.lunisolar_year_bounds(TABLE, time["year"])


def change(rid, source, target, time, **extra):
    row = {
        "id": rid,
        "type": "change",
        "from": source,
        "to": target,
        "time": time,
        **extra,
    }
    start, end = jd(time)
    return Evidence(rid, "x", start, end, row)


def observe(rid, value, time, **extra):
    if "from" in time:
        start, end = jd(time["from"])[0], jd(time["to"])[1]
    else:
        start, end = jd(time)
    row = {"id": rid, "type": "observation", "value": value, "time": time, **extra}
    return Evidence(rid, "x", start, end, row)


def run(*items):
    return [
        (i.start, i.end, i.clan, i.status, i.claimants)
        for i in export.build(list(items))
    ]


def test_lunisolar_years_run_from_new_year_to_the_day_before_the_next():
    start, end = dates.lunisolar_year_bounds(TABLE, 1560)
    assert start == dates.lunisolar_to_jd(TABLE, 1560, 1, 1, leap=False)
    after = dates.lunisolar_to_jd(TABLE, 1561, 1, 1, leap=False)
    assert after is not None
    assert end == after - 1
    with pytest.raises(ValueError, match="outside"):
        dates.lunisolar_year_bounds(TABLE, 1623)


def test_a_change_gives_the_receiving_clan_until_the_next_record():
    a = change("a", "clan:aaa", "clan:bbb", day(1560, 5, 19))
    b = change("b", "clan:bbb", "clan:ccc", day(1561, 3, 1, leap=True))
    assert run(a, b) == [
        (a.start, b.start, "bbb", "confirmed", []),
        (b.start, None, "ccc", "confirmed", []),
    ]


def test_a_change_known_only_to_its_year_takes_effect_on_its_last_day():
    a = change("a", "none", "clan:aaa", year(1578), cause="construction")
    assert run(a) == [(a.end, None, "aaa", "confirmed", [])]


def test_abandonment_and_not_applicable_end_the_interval():
    a = change("a", "none", "clan:aaa", day(1560, 5, 19))
    b = change("b", "clan:aaa", "none", day(1562, 1, 5))
    assert run(a, b) == [(a.start, b.start, "aaa", "confirmed", [])]
    period = {"from": year(1563), "to": year(1564)}
    c = observe("c", "not-applicable", period, boundsAsserted=True)
    assert run(a, c) == [(a.start, c.start, "aaa", "confirmed", [])]


def test_held_is_confirmed_over_its_period_and_carried_after():
    period = {"from": year(1570), "to": year(1571)}
    a = observe("a", "held", period, holder="clan:aaa", boundsAsserted=True)
    assert run(a) == [
        (a.start, a.end + 1, "aaa", "confirmed", []),
        (a.end + 1, None, "aaa", "carried", []),
    ]


def test_contested_keeps_every_claimant_and_the_clan_held_before():
    a = change("a", "none", "clan:aaa", day(1560, 5, 19))
    b = observe(
        "b",
        "contested",
        day(1563, 1, 5),
        claimants=["clan:bbb", "clan:ccc", "clan:aaa"],
    )
    assert run(a, b) == [
        (a.start, b.start, "aaa", "confirmed", []),
        (b.start, b.end + 1, "aaa", "contested", ["bbb", "ccc", "aaa"]),
        (b.end + 1, None, "aaa", "carried", []),
    ]


def test_undetermined_carries_the_last_clan_and_needs_one():
    period = {"from": year(1575), "to": year(1579)}
    a = change("a", "none", "clan:aaa", day(1560, 5, 19))
    b = observe("b", "undetermined", period, boundsAsserted=True)
    assert run(a, b) == [
        (a.start, b.start, "aaa", "confirmed", []),
        (b.start, None, "aaa", "carried", []),
    ]
    # With no clan before, there is nothing to carry.
    assert run(b) == []


def test_overlapping_observations_give_one_interval_in_time_order():
    period = {"from": year(1570), "to": year(1572)}
    a = observe("a", "held", period, holder="clan:aaa", boundsAsserted=True)
    inside = observe("b", "held", day(1571, 3, 1), holder="clan:aaa")
    later = {"from": year(1571), "to": year(1573)}
    c = observe("c", "held", later, holder="clan:aaa", boundsAsserted=True)
    result = run(a, inside, c)
    assert result == [
        (a.start, c.end + 1, "aaa", "confirmed", []),
        (c.end + 1, None, "aaa", "carried", []),
    ]


def test_same_day_changes_follow_the_handover_chain():
    first = change("control:x-1560-2", "clan:aaa", "clan:bbb", day(1560, 5, 19))
    second = change("control:x-1560-1", "clan:bbb", "clan:ccc", day(1560, 5, 19))
    assert run(first, second) == [(first.start, None, "ccc", "confirmed", [])]


def test_windows_and_variants_give_no_interval():
    window = observe("w", "held", year(1574), holder="clan:aaa")
    v1 = change("v1", "clan:aaa", "clan:bbb", day(1580, 6, 1), variantOf=["v2"])
    v2 = change("v2", "clan:aaa", "clan:ccc", day(1580, 6, 1), variantOf=["v1"])
    assert not window.certain
    assert run(window, v1, v2) == []


def test_every_territory_control_category_maps_to_one_status():
    """territory-control.md has ten day categories; the export has three statuses."""
    mapping = {
        "confirmed": "confirmed",
        "bracketed": "confirmed",
        "carried": "confirmed",  # after a change, until the next record
        "contested": "contested",
        "undetermined": "carried",
        "not-applicable": None,
        "transition-window": None,  # the change takes effect on its last day
        "window-observation": None,
        "variant": None,
        "unsurveyed": None,
    }
    categories = 10
    assert len(mapping) == categories
    assert set(mapping.values()) == {"confirmed", "contested", "carried", None}


@pytest.fixture
def repository(tmp_path):
    """A copy of the inputs the import reads."""
    for name in ("data/research", "docs/work/catalog.jsonl", MONTH_TABLE):
        source, target = ROOT / name, tmp_path / name
        target.parent.mkdir(parents=True, exist_ok=True)
        if source.is_dir():
            shutil.copytree(source, target)
        else:
            shutil.copy(source, target)
    return tmp_path


def owners(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    found = re.search(r"TK\.OWNER_TIMELINE=(.*);\n", text)
    assert found is not None
    return json.loads(found.group(1))


@pytest.mark.django_db
def test_the_export_follows_the_database_and_is_stable(repository, tmp_path, settings):
    settings.BASE_DIR = repository
    import_history(repository)
    rows = [
        json.loads(line)
        for line in (repository / "data/research/control.jsonl")
        .read_text(encoding="utf-8")
        .splitlines()
        if line.strip()
    ]
    assert Record.objects.filter(record_type=RecordType.CONTROL).count() == len(rows)
    # A year is a window: its bounds are not what the source states.
    window = Phenomenon.objects.get(key__startswith="control:yosho:馬伏塚城")
    assert window.bounds_asserted is False
    first, second = tmp_path / "a", tmp_path / "b"
    call_command("export_game_data", "--output", str(first))
    call_command("export_game_data", "--output", str(second))
    assert (first / "owners.js").read_bytes() == (second / "owners.js").read_bytes()
    data = owners(first / "owners.js")
    assert data["version"] == export.VERSION
    for intervals in data["castles"].values():
        for row in intervals:
            assert dates.western_to_jd(*row["from"]) == row["fromJD"]
            if row["to"] is not None:
                assert dates.western_to_jd(*row["to"]) == row["toJD"]
    # Changing the database changes what the game reads.
    item = Phenomenon.objects.get(key="control:yoshida-1564-1")
    record = item.records.get(record_type=RecordType.CONTROL)
    record.payload = {**record.payload, "to": "clan:oda"}
    record.save()
    call_command("export_game_data", "--output", str(second))
    assert owners(second / "owners.js")["castles"]["yoshida"][0]["clan"] == "oda"
    assert owners(first / "owners.js")["castles"]["yoshida"][0]["clan"] == "tokugawa"


@pytest.mark.django_db
def test_records_that_give_no_interval_fail_the_export(repository, tmp_path, settings):
    settings.BASE_DIR = repository
    import_history(repository)
    Phenomenon.objects.filter(
        kind=PhenomenonKind.CONTROL, key__startswith="control:"
    ).delete()
    with pytest.raises(CommandError, match="gave no owner interval"):
        call_command("export_game_data", "--output", str(tmp_path / "out"))


def test_the_committed_owners_file_is_the_empty_default():
    text = DEFAULT_OWNERS.read_text(encoding="utf-8")
    assert re.search(r"^TK\.OWNER_TIMELINE=null;$", text, re.MULTILINE)
