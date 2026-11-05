import json
import shutil
from pathlib import Path

import pytest
from django.conf import settings

from kuniezu.history import dates
from kuniezu.history import queries
from kuniezu.history.importer import CATALOG
from kuniezu.history.importer import CLAIM_KIND_OF
from kuniezu.history.importer import IDENTITIES
from kuniezu.history.importer import MONTH_TABLE
from kuniezu.history.importer import RESEARCH
from kuniezu.history.importer import import_history
from kuniezu.history.models import Calendar
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
from kuniezu.history.models import ThingKey
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
    summary = import_history(inputs)

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
    # What has no class of its own is counted in the summary, word by word. A
    # new word in the inputs lands there until the importer's table names it.
    other = Phenomenon.objects.filter(kind=PhenomenonKind.OTHER)
    words = set(other.values_list("subtype", flat=True))
    assert words == {word for word, count in summary.unclassified.items() if count}
    assert "note" in words
    assert sum(summary.unclassified.values()) == other.count()


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


def test_a_named_period_is_found_by_its_window_but_not_asserted(inputs):
    import_history(inputs)

    building = Phenomenon.objects.get(key="claim:tomori-area6-momoyama-building1")
    assert building.calendar == Calendar.DESCRIBED
    assert building.time_label == "安土桃山時代（考古学的時期区分）"
    assert not building.bounds_asserted
    assert building.year is None
    # The window finds it, and a search for asserted periods leaves it out.
    assert building in queries.in_year(1600)
    assert building not in queries.in_year(1600, asserted_only=True)
    death = Phenomenon.objects.get(key="claim:death-date-maeda-toshiie")
    assert death.bounds_asserted
    assert death in queries.in_year(1599, asserted_only=True)


def test_a_period_with_one_known_end_stays_open(inputs):
    import_history(inputs)

    # Enryaku-ji: known to end in 1571, start not given.
    temple = Phenomenon.objects.get(
        key__startswith="site-period:", title="延暦寺", jd_start__isnull=True
    )
    assert temple.jd_end == dates.western_to_jd(1571, 12, 31)
    assert temple in queries.in_year(1560)
    assert temple in queries.in_year(1200)
    assert temple not in queries.in_year(1572)
    # Iwami silver mine: known from 1533, end not given.
    mine = Phenomenon.objects.get(key__startswith="site-period:", title="石見銀山")
    assert mine.jd_start == dates.western_to_jd(1533, 1, 1)
    assert mine.jd_end is None
    assert mine in queries.in_year(1600)
    assert mine not in queries.in_year(1532)
    # A site with several periods keeps each of them.
    periods = Phenomenon.objects.filter(key__startswith="site-period:", title="奉先寺")
    spans = sorted((p.jd_start, p.jd_end) for p in periods)
    assert spans == [
        (dates.western_to_jd(1469, 1, 1), dates.western_to_jd(1592, 12, 31)),
        (dates.western_to_jd(1593, 1, 1), None),
    ]


def test_each_part_of_a_compound_claim_keeps_its_own_year(inputs):
    import_history(inputs)

    whole = Phenomenon.objects.get(key="claim:takatenjin-six-forts-preparation-years")
    early = Thing.objects.get(key="place:ogasayama-fort")
    late = Thing.objects.get(key="place:nogesaka-fort")
    parts = list(whole.parts.order_by("key"))

    assert [(p.year, p.precision) for p in parts] == [(1579, "year"), (1580, "year")]
    assert early in [link.thing for link in parts[0].participations.all()]
    assert late in [link.thing for link in parts[1].participations.all()]
    # A fort is found in the year it was prepared, and not in the other year.
    assert list(queries.about(early).filter(pk__in=queries.in_year(1579))) == [parts[0]]
    assert not queries.about(early).filter(pk__in=queries.in_year(1580)).exists()
    assert list(queries.about(late).filter(pk__in=queries.in_year(1580))) == [parts[1]]
    assert not queries.about(late).filter(pk__in=queries.in_year(1579)).exists()
    # The whole keeps the castle the claim is about.
    castle = Thing.objects.get(key="place:takatenjin")
    assert whole in queries.about(castle)


def test_a_claim_is_placed_where_it_says_and_nowhere_else(inputs):
    import_history(inputs)

    # The claim is about the game's node, but names the castle site it means.
    order = Phenomenon.objects.get(key="claim:agata-receipt-order")
    assert order.place == Thing.objects.get(key="place:agata")
    # Two named places: the claim does not single one out.
    outer = Phenomenon.objects.get(key="claim:tonokori-sadowara-outer-castle")
    assert outer.place is None
    # A timeline event that moves several castles has no single place.
    timeline = Record.objects.filter(record_type=RecordType.IMPLEMENTED_EVENT)
    several = next(r for r in timeline if len(r.payload["castles"]) > 1)
    single = next(r for r in timeline if len(r.payload["castles"]) == 1)
    assert several.phenomena.get().place is None
    assert single.phenomena.get().place is not None


def test_every_word_for_a_claim_has_one_class():
    # A deposit of wind-blown sand found by excavation is a natural phenomenon.
    assert CLAIM_KIND_OF["windblown-sand-deposition"] == PhenomenonKind.NATURE
    assert CLAIM_KIND_OF["fall-date"] == PhenomenonKind.CONFLICT
    assert CLAIM_KIND_OF["reclamation-permission"] == PhenomenonKind.DOCUMENT
    assert CLAIM_KIND_OF["described-custody"] == PhenomenonKind.MOVEMENT
    assert CLAIM_KIND_OF["person-name-identity"] == PhenomenonKind.NAMING
    assert set(CLAIM_KIND_OF.values()) <= set(PhenomenonKind) - {PhenomenonKind.OTHER}


SUWAHARA = "yosho:諏訪原城:138.12:34.82"


def identity(inputs, name, relation, things, **changes):
    """Write an identity record into the copied inputs."""
    row = {
        "id": "identity:" + name,
        "relation": relation,
        "things": things,
        "basis": "試験用の根拠",
        "source": "suwaharaChronology",
        "locator": "試験",
        "checked": "2026-11-05",
        "status": "verified-in-specified-scope",
    } | changes
    folder = inputs / IDENTITIES
    folder.mkdir(parents=True, exist_ok=True)
    (folder / f"{name}.json").write_text(
        json.dumps(row, ensure_ascii=False), encoding="utf-8"
    )
    return row


def test_two_identifiers_shown_to_be_one_site_become_one_thing(inputs):
    import_history(inputs)
    apart = Thing.objects.count()
    assert Thing.objects.filter(key=SUWAHARA).exists()
    # Two things share the name, so a claim about "site:諏訪原城" made a third.
    assert Thing.objects.filter(key="site:諏訪原城").exists()

    row = identity(inputs, "suwahara", "same-site", ["place:suwahara", SUWAHARA])
    summary = import_history(inputs)

    castle = Thing.objects.get(key="place:suwahara")
    # The game's site joins the registry place, and the claim's subject, now
    # naming one thing only, is that thing too.
    assert Thing.objects.count() == apart - 2
    assert summary.merged_things == 1
    assert not Thing.objects.filter(key=SUWAHARA).exists()
    assert not Thing.objects.filter(key="site:諏訪原城").exists()
    capture = Phenomenon.objects.get(key="claim:suwahara-capture-date")
    assert castle in [link.thing for link in capture.participations.all()]
    # Either identifier finds the one thing.
    assert ThingKey.objects.get(key=SUWAHARA).thing == castle
    assert list(queries.find_things(SUWAHARA)) == [castle]
    assert list(queries.find_things("諏訪原城")) == [castle]
    # It carries the registry entry, the game's site and the identity record.
    types = set(castle.records.values_list("record_type", flat=True))
    assert {RecordType.PLACE, RecordType.IMPLEMENTED_SITE, RecordType.IDENTITY} <= types
    assert Record.objects.get(key=row["id"]).payload == row
    # The sourced point of the registry is kept; the game's position is not used.
    assert castle.place.basis == "site-representative"
    # Running again changes nothing.
    assert import_history(inputs).new_versions == 0
    assert Thing.objects.count() == apart - 2


def test_a_game_site_that_stands_for_a_place_lends_its_point(inputs):
    import_history(inputs)
    things = Thing.objects.count()
    edo = Thing.objects.get(key="place:edo")
    assert not Place.objects.filter(thing=edo).exists()
    ieyasu = Thing.objects.get(key="person:tokugawa-ieyasu")
    assert "江戸" not in [stop.place for stop in queries.path(ieyasu)]

    identity(inputs, "edo", "represented-by", ["place:edo", "node:edo"])
    # A place that has a sourced point keeps it.
    identity(inputs, "suwahara", "represented-by", ["place:suwahara", SUWAHARA])
    summary = import_history(inputs)

    # The two stay separate things; the place takes the site's point, marked.
    assert Thing.objects.count() == things
    assert summary.represented_points == 1
    site = Thing.objects.get(key="node:edo")
    edo = Thing.objects.get(key="place:edo")
    assert edo.place.basis == "represented-by-game-site"
    assert (edo.place.longitude, edo.place.latitude) == (
        site.place.longitude,
        site.place.latitude,
    )
    assert site.place.basis == "game-position"
    assert Thing.objects.get(key="place:suwahara").place.basis == "site-representative"
    # The dated stay at Edo is now on the path.
    ieyasu = Thing.objects.get(key="person:tokugawa-ieyasu")
    assert "江戸" in [stop.place for stop in queries.path(ieyasu)]


@pytest.mark.parametrize(
    "changes",
    [
        {"basis": ""},
        {"source": "no-such-source"},
        {"relation": "same-name"},
        {"things": ["place:suwahara"]},
        {"things": ["place:suwahara", "yosho:no-such-site"]},
    ],
)
def test_an_identity_without_grounds_is_refused(inputs, changes):
    values = {"relation": "same-site", "things": ["place:suwahara", SUWAHARA]}
    values |= changes
    identity(inputs, "bad", values.pop("relation"), values.pop("things"), **values)

    with pytest.raises(ValueError, match=r"identity|source"):
        import_history(inputs)

    # Nothing of the failed import stays.
    assert not Record.objects.exists()
