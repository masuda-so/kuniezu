import json
import shutil
from pathlib import Path

import pytest
from django.conf import settings

from kuniezu.history import dates
from kuniezu.history.importer import CATALOG
from kuniezu.history.importer import MONTH_TABLE
from kuniezu.history.importer import RESEARCH
from kuniezu.history.importer import import_history
from kuniezu.history.models import ImportRun
from kuniezu.history.models import Mode
from kuniezu.history.models import Participation
from kuniezu.history.models import Phenomenon
from kuniezu.history.models import PhenomenonKind
from kuniezu.history.models import Place
from kuniezu.history.models import Record
from kuniezu.history.models import RecordType
from kuniezu.history.models import RecordVersion
from kuniezu.history.models import Status
from kuniezu.history.models import Thing
from kuniezu.history.models import ThingKind

pytestmark = pytest.mark.django_db
ROOT = Path(settings.BASE_DIR)
INPUTS = (
    "sources.jsonl",
    "people.jsonl",
    "places.jsonl",
    "claims.jsonl",
    "location-observations.jsonl",
    "implemented-events.jsonl",
    "implemented-sites.jsonl",
)


def lines(path: Path) -> list[dict]:
    with path.open(encoding="utf-8") as stream:
        return [json.loads(line) for line in stream if line.strip()]


@pytest.fixture
def inputs(tmp_path):
    """A copy of the repository's inputs that a test may change."""
    for name in INPUTS:
        target = tmp_path / RESEARCH / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(ROOT / RESEARCH / name, target)
    for name in (CATALOG, MONTH_TABLE):
        (tmp_path / name).parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(ROOT / name, tmp_path / name)
    return tmp_path


def test_every_input_record_is_kept_once(inputs):
    summary = import_history(inputs)

    catalog = [row for row in lines(inputs / CATALOG) if row["kind"] != "request"]
    expected = {
        RecordType.PERSON: len(lines(inputs / RESEARCH / "people.jsonl")),
        RecordType.PLACE: len(lines(inputs / RESEARCH / "places.jsonl")),
        RecordType.CLAIM: len(lines(inputs / RESEARCH / "claims.jsonl")),
        RecordType.LOCATION: len(
            lines(inputs / RESEARCH / "location-observations.jsonl")
        ),
        RecordType.IMPLEMENTED_EVENT: len(
            lines(inputs / RESEARCH / "implemented-events.jsonl")
        ),
        RecordType.IMPLEMENTED_SITE: len(
            lines(inputs / RESEARCH / "implemented-sites.jsonl")
        ),
        RecordType.CATALOG: len(catalog),
    }
    for record_type, count in expected.items():
        assert Record.objects.filter(record_type=record_type).count() == count
    assert summary.records == {str(key): value for key, value in expected.items()}
    assert Record.objects.count() == sum(expected.values())
    # A record keeps its input unchanged.
    claim = lines(inputs / RESEARCH / "claims.jsonl")[0]
    assert Record.objects.get(key="claim:" + claim["id"]).payload == claim


def test_things_and_phenomena_fall_into_exactly_one_class(inputs):
    import_history(inputs)

    assert not Thing.objects.exclude(kind__in=ThingKind.values).exists()
    assert not Phenomenon.objects.exclude(kind__in=PhenomenonKind.values).exists()
    assert not Phenomenon.objects.exclude(mode__in=Mode.values).exists()
    # Nothing exists without the record it came from.
    assert not Thing.objects.filter(records__isnull=True).exists()
    assert not Phenomenon.objects.filter(records__isnull=True).exists()
    # The whole timeline is there, every event at its day.
    timeline = lines(inputs / RESEARCH / "implemented-events.jsonl")
    events = Phenomenon.objects.filter(key__startswith="event:")
    assert events.count() == len(timeline)
    assert not events.exclude(mode=Mode.EVENT).exists()
    assert not events.filter(jd_exact=False).exists()
    # Only timeline notes are left without a class of their own.
    other = Phenomenon.objects.filter(kind=PhenomenonKind.OTHER)
    assert set(other.values_list("subtype", flat=True)) == {"note"}


def test_people_are_one_thing_under_all_their_names(inputs):
    import_history(inputs)

    hideyoshi = Thing.objects.get(key="person:toyotomi-hideyoshi")
    names = set(hideyoshi.names.values_list("name", flat=True))
    assert {"木下秀吉", "羽柴秀吉", "豊臣秀吉"} <= names
    # The game's display name and the registry entry are the same person.
    assert not Thing.objects.filter(key="person:羽柴秀吉").exists()
    assert hideyoshi.records.filter(record_type=RecordType.CATALOG).exists()
    assert hideyoshi.authorities.filter(scheme="wikidata").exists()


def test_a_verified_date_keeps_its_calendar_and_its_day_number(inputs):
    import_history(inputs)

    death = Phenomenon.objects.get(key="claim:death-date-maeda-toshiie")
    assert death.status == Status.VERIFIED
    assert death.mode == Mode.EVENT
    assert death.kind == PhenomenonKind.EXISTENCE
    assert (death.year, death.month, death.day, death.leap_month) == (1599, 3, 3, True)
    assert death.jd_exact
    assert death.jd_start is not None
    assert death.jd_start == death.jd_end
    assert dates.jd_to_western(death.jd_start) == (1599, 4, 27)
    # The timeline event of the same day is a separate, unverified record.
    event = Phenomenon.objects.get(title="前田利家の死", key__startswith="event:")
    assert event.status == Status.IMPLEMENTATION
    assert event.jd_start == death.jd_start


def test_a_battle_is_the_timeline_event_seen_as_a_conflict(inputs):
    import_history(inputs)

    battle = Phenomenon.objects.get(title="桶狭間の戦い")
    assert battle.kind == PhenomenonKind.CONFLICT
    types = set(battle.records.values_list("record_type", flat=True))
    assert types == {RecordType.IMPLEMENTED_EVENT, RecordType.CATALOG}
    # A claim about a battle is a part of it.
    part = Phenomenon.objects.filter(parent__title="長篠の戦い").first()
    assert part is not None
    assert part.status == Status.VERIFIED


def test_importing_twice_changes_nothing(inputs):
    first = import_history(inputs)
    things = Thing.objects.count()
    phenomena = Phenomenon.objects.count()
    links = Participation.objects.count()
    places = Place.objects.count()

    second = import_history(inputs)

    assert first.new_versions == Record.objects.count()
    assert second.new_versions == 0
    assert second.retired == 0
    assert RecordVersion.objects.count() == Record.objects.count()
    assert not Record.objects.exclude(last_run=ImportRun.objects.latest("id")).exists()
    assert (things, phenomena, links, places) == (
        Thing.objects.count(),
        Phenomenon.objects.count(),
        Participation.objects.count(),
        Place.objects.count(),
    )
    assert second.as_json() | {"new_versions": 0} == first.as_json() | {
        "new_versions": 0
    }


def test_earlier_contents_stay_reachable(inputs):
    from kuniezu.history import queries  # noqa: PLC0415

    import_history(inputs)
    first_run = ImportRun.objects.get()
    path = inputs / RESEARCH / "claims.jsonl"
    claims = lines(path)
    changed, removed = claims[0], claims[1]
    before = dict(changed)
    changed["uncertainty"] = "書き換えた"
    with path.open("w", encoding="utf-8") as stream:
        for row in [changed, *claims[2:]]:
            stream.write(json.dumps(row, ensure_ascii=False) + "\n")

    summary = import_history(inputs)

    second_run = ImportRun.objects.latest("id")
    record = Record.objects.get(key="claim:" + changed["id"])
    assert summary.new_versions == 1
    assert summary.retired == 1
    assert record.payload["uncertainty"] == "書き換えた"
    assert [v.payload for v in record.versions.all()] == [before, changed]
    gone = Record.objects.get(key="claim:" + removed["id"])
    assert gone.retired_run == second_run
    assert [v.payload for v in gone.versions.all()] == [removed, None]
    assert not Phenomenon.objects.filter(key="claim:" + removed["id"]).exists()
    # The first import's view of the database is still there.
    then = {v.record.key: v.payload for v in queries.records_as_of(first_run.pk)}
    assert then["claim:" + changed["id"]] == before
    assert "claim:" + removed["id"] in then
    now = {v.record.key: v.payload for v in queries.records_as_of(second_run.pk)}
    assert now["claim:" + changed["id"]] == changed
    assert "claim:" + removed["id"] not in now
    # A record that comes back is held again, and its absence stays on record.
    with path.open("w", encoding="utf-8") as stream:
        for row in [changed, removed, *claims[2:]]:
            stream.write(json.dumps(row, ensure_ascii=False) + "\n")
    import_history(inputs)
    third_run = ImportRun.objects.latest("id")
    back = {v.record.key for v in queries.records_as_of(third_run.pk)}
    assert "claim:" + removed["id"] in back
    still = {v.record.key for v in queries.records_as_of(second_run.pk)}
    assert "claim:" + removed["id"] not in still
