import json
import shutil
from pathlib import Path

import pytest
from django.conf import settings

from kuniezu.history import dates
from kuniezu.history import queries
from kuniezu.history.importer import CATALOG
from kuniezu.history.importer import CLAIM_KIND_OF
from kuniezu.history.importer import CLAIM_POINT_PREDICATES
from kuniezu.history.importer import CONFLICTS
from kuniezu.history.importer import IDENTITIES
from kuniezu.history.importer import KOBUN_INDEX
from kuniezu.history.importer import MONTH_TABLE
from kuniezu.history.importer import RESEARCH
from kuniezu.history.importer import claim_mode
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
from kuniezu.history.models import Role
from kuniezu.history.models import Status
from kuniezu.history.models import Thing
from kuniezu.history.models import ThingKey
from kuniezu.history.models import ThingKind
from kuniezu.history.models import ThingName

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
    shutil.copytree(ROOT / KOBUN_INDEX, tmp_path / KOBUN_INDEX)
    shutil.copy(ROOT / CONFLICTS, tmp_path / CONFLICTS)
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
        RecordType.CONFLICT: len(
            json.loads((inputs / CONFLICTS).read_text(encoding="utf-8"))["conflicts"]
        ),
        RecordType.KOBUN: sum(
            len(lines(path)) for path in (inputs / KOBUN_INDEX).glob("*.jsonl")
        ),
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


@pytest.mark.parametrize(
    "identity",
    [
        (
            "person:hosokawa-fujitaka",
            {"細川藤孝", "細川幽斎"},
            "細川藤孝",
            {("wikidata", "Q1207509"), ("ndlna", "00269750")},
        ),
        (
            "person:oda-nagamasu",
            {"織田長益", "織田有楽斎", "織田有楽"},
            "織田長益",
            {("wikidata", "Q837903")},
        ),
        (
            "person:toyotomi-hideyoshi",
            {"木下秀吉", "羽柴秀吉", "豊臣秀吉"},
            "羽柴秀吉",
            {("wikidata", "Q187550"), ("ndlna", "00272338")},
        ),
        (
            "person:otomo-sorin",
            {"大友宗麟", "大友義鎮"},
            "大友義鎮",
            {("ndlna", "00625175")},
        ),
        (
            "person:miyoshi-jikkyu",
            {"三好実休", "三好義賢"},
            "三好実休",
            {("wikidata", "Q1058953")},
        ),
        (
            "person:sanada-yukitsuna",
            {"真田幸綱", "真田幸隆"},
            "真田幸綱",
            {("wikidata", "Q1373396"), ("ndlna", "001178988")},
        ),
        (
            "person:tachibana-dosetsu",
            {"立花道雪", "戸次鑑連", "戸次道雪"},
            "戸次鑑連",
            {("wikidata", "Q6379490")},
        ),
    ],
)
def test_people_are_one_thing_under_all_their_names(inputs, identity):
    person_key, names, game_name, authorities = identity
    import_history(inputs)

    person = Thing.objects.get(key=person_key)
    assert names <= set(person.names.values_list("name", flat=True))
    # Import the game's catalog alias into the curated identity, not a new thing.
    assert not Thing.objects.filter(key="person:" + game_name).exists()
    assert person.records.filter(record_type=RecordType.CATALOG).exists()
    assert set(person.authorities.values_list("scheme", "identifier")) == authorities
    for scheme, identifier in authorities:
        assert (
            Thing.objects.filter(
                authorities__scheme=scheme, authorities__identifier=identifier
            ).get()
            == person
        )
    for name in names:
        assert Thing.objects.filter(names__name=name).distinct().get() == person


def test_preperiod_person_names_do_not_invent_a_playable_catalog_entry(inputs):
    import_history(inputs)

    person = Thing.objects.get(key="person:saito-dosan")
    assert set(person.names.values_list("name", flat=True)) >= {"斎藤道三", "斎藤利政"}
    assert person.records.filter(record_type=RecordType.PERSON).exists()
    assert not person.records.filter(record_type=RecordType.CATALOG).exists()
    assert not Thing.objects.filter(key="person:斎藤道三").exists()
    assert set(person.authorities.values_list("scheme", "identifier")) == {
        ("wikidata", "Q1202670"),
        ("ndlna", "00623391"),
    }
    for name in ("斎藤道三", "斎藤利政"):
        assert Thing.objects.filter(names__name=name).distinct().get() == person


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
    # The timeline battle, not the campaign of the same name.
    part = Phenomenon.objects.filter(
        parent__title="長篠の戦い",
        parent__records__record_type=RecordType.IMPLEMENTED_EVENT,
    ).first()
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


def test_an_event_known_only_to_a_season_is_still_an_event(inputs):
    import_history(inputs)

    # 永禄11年の冬のいつかに降った。冬のあいだ降伏が続いたのではない。
    surrender = Phenomenon.objects.get(key="claim:urio-surrender-1568")
    assert surrender.mode == Mode.EVENT
    assert surrender.calendar == Calendar.DESCRIBED
    assert not surrender.jd_exact
    assert not surrender.bounds_asserted
    assert surrender in queries.in_year(1568)
    assert surrender not in queries.in_year(1568, asserted_only=True)
    # 時期の呼び名で書かれた発掘の観察は、出来事にしない。
    building = Phenomenon.objects.get(key="claim:tomori-area6-momoyama-building1")
    assert building.mode == Mode.STATE
    # 時刻の無い役職の在任は状態のまま。
    office = Phenomenon.objects.get(key="claim:toyotomi-office-1")
    assert office.mode == Mode.STATE
    # 年しか分からない死去も、死去そのものは出来事。
    death = Phenomenon.objects.get(key="claim:lifetime-朝倉景鏡")
    assert death.mode == Mode.EVENT


def test_the_mode_of_a_claim_comes_from_its_predicate_and_its_time():
    period = {"kind": "described-period", "label": "是冬"}
    assert claim_mode("castle-surrender", period) == Mode.EVENT
    assert claim_mode("death-date", period) == Mode.EVENT
    assert claim_mode("castle-construction", period) == Mode.STATE
    assert claim_mode("central-office", None) == Mode.STATE
    assert claim_mode("castle-surrender", None) == Mode.EVENT
    assert claim_mode("death-year", None) == Mode.EVENT
    assert claim_mode("central-office", {"kind": "dated-event"}) == Mode.EVENT
    assert set(CLAIM_KIND_OF) >= CLAIM_POINT_PREDICATES


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
    # An alliance, or a surrender that is accepted, is a relation between parties.
    assert CLAIM_KIND_OF["alliance-formation"] == PhenomenonKind.RELATION
    assert CLAIM_KIND_OF["submission-accepted"] == PhenomenonKind.RELATION
    assert CLAIM_KIND_OF["submission"] == PhenomenonKind.RELATION
    assert CLAIM_KIND_OF["diplomatic-audience"] == PhenomenonKind.RELATION
    assert CLAIM_KIND_OF["peace-agreement"] == PhenomenonKind.RELATION
    assert CLAIM_KIND_OF["castle-surrender"] == PhenomenonKind.CONFLICT
    assert CLAIM_KIND_OF["castle-handover"] == PhenomenonKind.CONFLICT
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
        # A misspelt identifier on the side that is kept.
        {"things": ["place:no-such-place", SUWAHARA]},
        {"things": [SUWAHARA, SUWAHARA]},
        # Two things of different kinds, or an identifier that names no thing.
        {"things": ["person:oda-nobunaga", "place:edo"]},
        {"things": ["place:suwahara", "battle:長篠の戦い"]},
        {
            "relation": "represented-by",
            "things": ["person:oda-nobunaga", "person:織田信忠"],
        },
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


@pytest.mark.parametrize(
    ("first", "second"),
    [
        # Two sites cannot both stand for one place.
        (
            ("represented-by", ["place:edo", "node:edo"]),
            ("represented-by", ["place:edo", "node:kiyosu"]),
        ),
        # An identifier is merged into one thing only.
        (
            ("same-site", ["place:suwahara", SUWAHARA]),
            ("same-site", ["place:takatenjin", SUWAHARA]),
        ),
        # An identifier that is merged away plays no other part.
        (
            ("same-site", ["place:suwahara", SUWAHARA]),
            ("represented-by", ["place:edo", SUWAHARA]),
        ),
        (
            ("same-site", ["place:suwahara", SUWAHARA]),
            ("same-site", [SUWAHARA, "site:諏訪原城"]),
        ),
    ],
)
def test_identities_that_contradict_each_other_are_refused(inputs, first, second):
    identity(inputs, "a", *first)
    identity(inputs, "b", *second)

    with pytest.raises(ValueError, match=r"represented by another|merged"):
        import_history(inputs)

    assert not Record.objects.exists()


def test_one_place_may_gather_several_identifiers(inputs):
    # The game's site and the name a claim uses are both the registry place.
    identity(inputs, "site", "same-site", ["place:suwahara", SUWAHARA])
    identity(inputs, "claim", "same-site", ["place:suwahara", "site:諏訪原城"])

    import_history(inputs)

    castle = Thing.objects.get(key="place:suwahara")
    keys = set(castle.keys.values_list("key", flat=True))
    assert keys == {"place:suwahara", SUWAHARA, "site:諏訪原城"}
    assert list(queries.find_things("site:諏訪原城")) == [castle]
    capture = Phenomenon.objects.get(key="claim:suwahara-capture-date")
    assert castle in [link.thing for link in capture.participations.all()]
    assert castle.records.filter(record_type=RecordType.IDENTITY).count() == 2  # noqa: PLR2004


def test_an_identifier_only_a_claim_uses_can_be_merged(inputs):
    identity(inputs, "claim", "same-site", ["place:suwahara", "site:諏訪原城"])

    import_history(inputs)

    castle = Thing.objects.get(key="place:suwahara")
    assert ThingKey.objects.get(key="site:諏訪原城").thing == castle
    assert not Thing.objects.filter(key="site:諏訪原城").exists()
    # The game's site of the same name is not merged by this record.
    assert Thing.objects.filter(key=SUWAHARA).exists()


def test_a_stated_representative_wins_over_a_namesake(inputs):
    import_history(inputs)
    # Without a record, the registry castle borrows the point of its namesake.
    castle = Thing.objects.get(key="place:kiyosu-castle")
    assert castle.place.basis == "borrowed-from-namesake"
    kiyosu = Thing.objects.get(key="node:kiyosu").place

    identity(inputs, "kiyosu", "represented-by", ["place:kiyosu-castle", "node:kiyosu"])
    import_history(inputs)

    castle = Thing.objects.get(key="place:kiyosu-castle")
    assert castle.place.basis == "represented-by-game-site"
    assert (castle.place.longitude, castle.place.latitude) == (
        kiyosu.longitude,
        kiyosu.latitude,
    )

    # A record naming another site decides, whatever the names say.
    identity(inputs, "kiyosu", "represented-by", ["place:kiyosu-castle", "node:edo"])
    import_history(inputs)

    castle = Thing.objects.get(key="place:kiyosu-castle")
    edo = Thing.objects.get(key="node:edo").place
    assert castle.place.basis == "represented-by-game-site"
    assert (castle.place.longitude, castle.place.latitude) == (
        edo.longitude,
        edo.latitude,
    )


def test_an_identifier_settled_by_name_is_kept_as_a_key(inputs):
    import_history(inputs)

    # A claim names the castle "site:岩石城"; only the registry place has that name.
    castle = Thing.objects.get(key="place:ganjaku")
    assert ThingKey.objects.get(key="site:岩石城").thing == castle
    assert list(queries.find_things("site:岩石城")) == [castle]
    assert not Thing.objects.filter(key="site:岩石城").exists()
    # Nothing was merged: no identity record says so.
    assert import_history(inputs).merged_things == 0

    # Being an identifier the inputs use, an identity record may name it.
    identity(inputs, "edo", "represented-by", ["place:edo", "site:岩石城"])
    import_history(inputs)

    edo = Thing.objects.get(key="place:edo")
    castle = Thing.objects.get(key="place:ganjaku")
    assert edo.place.basis == "represented-by-game-site"
    assert (edo.place.longitude, edo.place.latitude) == (
        castle.place.longitude,
        castle.place.latitude,
    )


def test_a_merged_game_site_keeps_its_catalog_entry(inputs):
    import_history(inputs)
    # The work catalog lists the game's node "agata" under the name 縣城, while
    # the node is Matsuo castle and the registry keeps 縣城 as another site.
    entry = Record.objects.get(
        record_type=RecordType.CATALOG, payload__context__siteId="agata"
    )
    assert [thing.key for thing in entry.things.all()] == ["node:agata"]

    identity(inputs, "matsuo", "same-site", ["place:matsuo-hyuga", "node:agata"])
    import_history(inputs)

    entry.refresh_from_db()
    assert [thing.key for thing in entry.things.all()] == ["place:matsuo-hyuga"]
    other = Thing.objects.get(key="place:agata")
    assert entry not in other.records.all()


@pytest.mark.parametrize("first", ["site", "structure"])
def test_merged_identifiers_end_at_one_thing_in_either_order(inputs, first):
    # A second claim names the castle of "site:岩石城" as "structure:岩石城".
    path = inputs / RESEARCH / "claims.jsonl"
    claims = lines(path)
    fall = next(row for row in claims if row["id"] == "ganjaku-fall")
    assert fall["entity"] == "site:岩石城"
    again = fall | {"id": "ganjaku-fall-again", "entity": "structure:岩石城"}
    rest = [row for row in claims if row["id"] != "ganjaku-fall"]
    ordered = [fall, again] if first == "site" else [again, fall]
    with path.open("w", encoding="utf-8") as stream:
        for row in [*ordered, *rest]:
            stream.write(json.dumps(row, ensure_ascii=False) + "\n")
    identity(inputs, "ganjaku", "same-site", ["site:岩石城", "structure:岩石城"])

    import_history(inputs)

    # Both identifiers, and the name they share, are the registry castle.
    castle = Thing.objects.get(key="place:ganjaku")
    for key in ("site:岩石城", "structure:岩石城"):
        assert ThingKey.objects.get(key=key).thing == castle
        assert not Thing.objects.filter(key=key).exists()
    for claim in ("claim:ganjaku-fall", "claim:ganjaku-fall-again"):
        subject = Phenomenon.objects.get(key=claim).participations.get(role="subject")
        assert subject.thing == castle


@pytest.mark.parametrize("first", ["old", "new"])
def test_a_merged_name_still_finds_the_thing(inputs, first):
    # Two claims name one castle, which no registry holds, by two names.
    path = inputs / RESEARCH / "claims.jsonl"
    claims = lines(path)
    fall = next(row for row in claims if row["id"] == "ganjaku-fall")
    old = fall | {"id": "castle-old", "entity": "site:試験旧城"}
    new = fall | {"id": "castle-new", "entity": "site:試験新城"}
    ordered = [old, new] if first == "old" else [new, old]
    with path.open("w", encoding="utf-8") as stream:
        for row in [*ordered, *claims]:
            stream.write(json.dumps(row, ensure_ascii=False) + "\n")
    identity(inputs, "renamed", "same-site", ["site:試験新城", "site:試験旧城"])

    import_history(inputs)

    castle = Thing.objects.get(key="site:試験新城")
    for name in ("試験旧城", "試験新城"):
        assert list(queries.find_things(name)) == [castle]
    # A registry identifier is not a name: it finds the place only as a key.
    assert not ThingName.objects.filter(name="ganjaku").exists()


def test_dated_water_works_do_not_invent_locations(inputs):
    import_history(inputs)
    water = Thing.objects.get(key="water:塩津潟")
    prefix = "claim:shiotsugata-reclamation-"
    found = queries.about(water).filter(key__startswith=prefix)
    expected_by_year = {
        1721: {"initial"},
        1722: {"blockage"},
        1728: {"reopening", "sakaigawa"},
        1732: {"drainage", "flood"},
    }
    for year, suffixes in expected_by_year.items():
        assert set(
            found.filter(pk__in=queries.in_year(year)).values_list("key", flat=True)
        ) == {prefix + suffix for suffix in suffixes}
    expected_by_kind = {
        PhenomenonKind.WORKS: {"initial", "reopening", "sakaigawa", "drainage"},
        PhenomenonKind.NATURE: {"blockage", "flood"},
    }
    for kind, suffixes in expected_by_kind.items():
        assert set(found.filter(kind=kind).values_list("key", flat=True)) == {
            prefix + suffix for suffix in suffixes
        }
    for suffix in ["sakaigawa", "drainage"]:
        event = found.get(key=prefix + suffix)
        assert event.place is None
        assert event.mode == Mode.EVENT
        assert event.calendar == Calendar.CE_YEAR
        assert event.participations.count() == 1
        assert event.participations.filter(thing=water).exists()
        record = Record.objects.get(key=prefix + suffix)
        assert record.payload["linkedEntities"] == []
    for suffix in ["initial", "blockage", "reopening", "flood"]:
        event = found.get(key=prefix + suffix)
        assert event.place is not None
        assert event.place.key == "place:chojabori"
    chojabori = Thing.objects.get(key="place:chojabori")
    assert not Place.objects.filter(thing=chojabori).exists()
    assert not queries.in_box(139, 140, 37, 39).filter(key__startswith=prefix).exists()


def add_linked_water_claim(
    inputs, key, *, entity="region:試験の事業域", ident="water-link"
):
    path = inputs / RESEARCH / "claims.jsonl"
    template = next(
        row for row in lines(path) if row["id"] == "shiotsugata-reclamation-drainage"
    )
    row = {
        **template,
        "id": ident,
        "entity": entity,
        "linkedEntities": [key],
    }
    with path.open("a", encoding="utf-8") as stream:
        stream.write(json.dumps(row, ensure_ascii=False) + "\n")


def drop_catalog_water(inputs, subject):
    path = inputs / CATALOG
    kept = [
        row
        for row in lines(path)
        if not (row["kind"] == "water" and row["subject"] == subject)
    ]
    path.write_text(
        "".join(json.dumps(row, ensure_ascii=False) + "\n" for row in kept),
        encoding="utf-8",
    )


def test_a_claim_links_a_water_the_current_catalog_names(inputs):
    add_linked_water_claim(inputs, "water:中海")
    import_history(inputs)
    lake = Thing.objects.get(key="water:中海")
    assert lake.kind == ThingKind.WATER
    assert Thing.objects.filter(kind=ThingKind.WATER, names__name="中海").count() == 1
    event = Phenomenon.objects.get(key="claim:water-link")
    assert event.participations.get(thing=lake).role == Role.PARTICIPANT
    subject = event.participations.get(role=Role.SUBJECT).thing
    assert subject.key == "region:試験の事業域"
    assert event.place is None
    assert not Place.objects.filter(thing=lake).exists()
    assert lake.records.filter(key="claim:water-link").exists()
    import_history(inputs)
    lake = Thing.objects.get(key="water:中海")
    assert lake.records.filter(key="claim:water-link").count() == 1


@pytest.mark.parametrize("key", ["water:中ノ海", "water:存在しない湖"])
def test_a_linked_water_the_catalog_does_not_name_is_refused(inputs, key):
    add_linked_water_claim(inputs, key)
    with pytest.raises(ValueError, match="catalog does not name"):
        import_history(inputs)
    assert not Thing.objects.filter(key=key).exists()


def test_a_water_another_claim_made_is_not_enough(inputs):
    # The subject of one claim makes a water body, but the catalog never names it.
    add_linked_water_claim(inputs, "water:中海", entity="water:幻の潟", ident="maker")
    add_linked_water_claim(inputs, "water:幻の潟", ident="user")
    with pytest.raises(ValueError, match="catalog does not name"):
        import_history(inputs)


def test_a_water_left_from_an_earlier_import_is_not_enough(inputs):
    import_history(inputs)
    assert Thing.objects.filter(key="water:中海").exists()
    drop_catalog_water(inputs, "中海")
    add_linked_water_claim(inputs, "water:中海")
    with pytest.raises(ValueError, match="catalog does not name"):
        import_history(inputs)
    assert not Phenomenon.objects.filter(key="claim:water-link").exists()


ARTICLES_1534 = 478


def test_every_kobun_article_of_a_year_is_listed_once_and_unclassified(inputs):
    summary = import_history(inputs)

    listed = Record.objects.filter(record_type=RecordType.KOBUN, retired_run=None)
    # The 1534 index holds every article of 天文3年 that the database returns.
    assert listed.count() == ARTICLES_1534
    assert len({record.payload["mgno"] for record in listed}) == ARTICLES_1534
    assert not any("kobun" in record.payload for record in listed)
    articles = Phenomenon.objects.filter(records__record_type=RecordType.KOBUN)
    assert articles.count() == ARTICLES_1534
    assert set(articles.values_list("kind", flat=True)) == {PhenomenonKind.OTHER}
    assert summary.unclassified["kobun-unclassified"] == ARTICLES_1534
    # The extended month table converts an indexed day; that does not classify
    # the article or turn its contents into a verified historical claim.
    first = articles.get(key="kobun:020100200909")
    assert (first.calendar, first.year, first.month, first.day) == (
        Calendar.LUNISOLAR,
        1534,
        1,
        1,
    )
    assert first.jd_exact
    assert first.bounds_asserted
    expected = dates.lunisolar_to_jd(inputs / MONTH_TABLE, 1534, 1, 1, leap=False)
    assert expected is not None
    assert first.jd_start == first.jd_end == expected
    leap = articles.get(key="kobun:020100200950")
    assert leap.leap_month
    year_only = articles.get(key="kobun:020100201384")
    assert year_only.precision == "period"
    assert year_only.time_label == "天文3年是歳"
    assert not year_only.jd_exact
    assert not year_only.bounds_asserted


def test_a_campaign_holds_its_battles_and_has_no_map_of_its_own(inputs):
    summary = import_history(inputs)

    rows = json.loads((inputs / CONFLICTS).read_text(encoding="utf-8"))["conflicts"]
    campaign = Phenomenon.objects.get(key="campaign:文禄の役")
    assert campaign.kind == PhenomenonKind.CONFLICT
    assert campaign.subtype == "campaign"
    assert campaign.parent is None
    battles = [row for row in rows if row.get("parent") == "campaign:文禄の役"]
    assert summary.conflict_links == sum(1 for row in rows if row.get("parent"))
    assert campaign.parts.count() == len(battles)
    # A battle the timeline already holds is that event, not a second one.
    okpo = campaign.parts.get(title="玉浦海戦")
    assert okpo.records.filter(record_type=RecordType.IMPLEMENTED_EVENT).exists()
    assert not Phenomenon.objects.filter(key="battle:玉浦海戦").exists()
    # A battle the timeline does not hold becomes a conflict of its own.
    busan = campaign.parts.get(key="battle:釜山鎮の戦い")
    assert busan.kind == PhenomenonKind.CONFLICT
    assert busan.status == Status.REGISTERED
    # The campaign is not merged into the timeline event of the same name.
    event = Phenomenon.objects.filter(
        title="文禄の役", records__record_type=RecordType.IMPLEMENTED_EVENT
    )
    assert campaign not in event


def bad_conflicts(rows):
    """Change the campaign and battle record in place, as one wrong edit."""
    return {row["id"]: row for row in rows}


@pytest.mark.parametrize(
    ("change", "why"),
    [
        (lambda rows: rows.remove(bad_conflicts(rows)["campaign:文禄の役"]), "name"),
        (
            lambda rows: bad_conflicts(rows)["battle:釜山鎮の戦い"].update(
                parent="battle:東萊城の戦い"
            ),
            "does not name it back",
        ),
        (
            lambda rows: bad_conflicts(rows)["battle:釜山鎮の戦い"].update(
                parent="battle:釜山鎮の戦い"
            ),
            "does not name it back",
        ),
        (
            lambda rows: bad_conflicts(rows)["campaign:文禄の役"].update(
                parent="campaign:長篠の戦い"
            ),
            "have no parent",
        ),
        (
            lambda rows: bad_conflicts(rows)["campaign:文禄の役"]["children"].pop(),
            "not listed by its campaign",
        ),
        (
            lambda rows: bad_conflicts(rows)["battle:釜山鎮の戦い"].update(
                kind="campaign"
            ),
            "does not name its kind",
        ),
        (lambda rows: rows.append(dict(rows[0])), "repeats an id"),
    ],
)
def test_a_campaign_record_that_does_not_hold_together_is_refused(inputs, change, why):
    path = inputs / CONFLICTS
    data = json.loads(path.read_text(encoding="utf-8"))
    change(data["conflicts"])
    path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")

    with pytest.raises(ValueError, match=why):
        import_history(inputs)
    assert not Record.objects.exists()


def test_a_named_scene_must_be_one_timeline_event(inputs):
    path = inputs / CONFLICTS
    data = json.loads(path.read_text(encoding="utf-8"))
    for row in data["conflicts"]:
        if row.get("existingSceneTitle"):
            row["existingSceneTitle"] = "存在しない合戦"
            break
    path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")

    with pytest.raises(ValueError, match="no single timeline event"):
        import_history(inputs)


def test_a_named_scene_is_checked_against_the_timeline_itself(inputs):
    # Without its timeline event, the catalog still makes "battle:玉浦海戦".
    path = inputs / RESEARCH / "implemented-events.jsonl"
    rows = [row for row in lines(path) if row.get("title") != "玉浦海戦"]
    with path.open("w", encoding="utf-8") as stream:
        for row in rows:
            stream.write(json.dumps(row, ensure_ascii=False) + "\n")

    with pytest.raises(ValueError, match="no single timeline event is 玉浦海戦"):
        import_history(inputs)


def test_a_campaign_is_not_the_battle_of_the_same_name(inputs):
    import_history(inputs)

    campaign = Phenomenon.objects.get(key="campaign:長篠の戦い")
    battle = Phenomenon.objects.get(
        title="長篠の戦い", records__record_type=RecordType.IMPLEMENTED_EVENT
    )
    assert campaign != battle
    assert battle.parent is None
    assert set(campaign.parts.values_list("key", flat=True)) >= {"battle:設楽原の戦い"}
    # A claim naming "battle:長篠の戦い" stays with the timeline battle.
    assert not Phenomenon.objects.filter(
        parent=campaign, records__record_type=RecordType.CLAIM
    ).exists()


def test_contact_peace_and_surrender_keep_their_narrow_meaning(inputs):
    import_history(inputs)
    for key in (
        "submission-date-masamune",
        "submission-tokugawa-ieyasu",
        "submission-uesugi-kagekatsu",
    ):
        item = Phenomenon.objects.get(key="claim:" + key)
        assert item.subtype == "diplomatic-audience"
        assert item.kind == PhenomenonKind.RELATION
        assert item.mode == Mode.EVENT
    audience = Phenomenon.objects.get(key="claim:submission-date-masamune")
    assert "翌日" not in audience.summary
    assert "帰国" not in audience.summary
    assert "黒川城" not in audience.summary
    peace = Phenomenon.objects.get(key="claim:peace-hashiba-nobukatsu")
    assert peace.subtype == "peace-agreement"
    assert peace.kind == PhenomenonKind.RELATION
    surrender = Phenomenon.objects.get(key="claim:submission-ryukyu-shuri")
    assert surrender.subtype == "castle-surrender"
    assert surrender.kind == PhenomenonKind.CONFLICT
    assert "大島" not in surrender.summary
    assert "運天" not in surrender.summary
    assert not Participation.objects.filter(
        phenomenon=surrender, thing__name="樺山久高"
    ).exists()


@pytest.mark.parametrize(
    ("person_key", "names", "authorities"),
    [
        (
            "person:hori-hidemasa",
            ["堀秀政"],
            [("ndlna", "01071990"), ("wikidata", "Q8190166")],
        ),
        ("person:hori-hideharu", ["堀秀治"], [("wikidata", "Q9755540")]),
        (
            "person:shima-kiyooki",
            ["島左近", "島清興"],
            [("ndlna", "00863084"), ("wikidata", "Q1926883")],
        ),
        (
            "person:tanaka-yoshimasa",
            ["田中吉政"],
            [("ndlna", "01013675"), ("wikidata", "Q11575390")],
        ),
        (
            "person:torii-mototada",
            ["鳥居元忠"],
            [("ndlna", "00800190"), ("wikidata", "Q665518")],
        ),
        ("person:maeno-nagayasu", ["前野長康"], [("wikidata", "Q1059898")]),
        (
            "person:nakamura-kazuuji",
            ["中村一氏"],
            [("ndlna", "00625369"), ("wikidata", "Q10875670")],
        ),
        (
            "person:takayama-ukon",
            ["高山右近"],
            [("ndlna", "00623123"), ("wikidata", "Q749873")],
        ),
        ("person:ishikawa-kazumasa", ["石川数正"], [("wikidata", "Q873166")]),
        (
            "person:shibata-katsuie",
            ["柴田勝家"],
            [("ndlna", "01052712"), ("wikidata", "Q707587")],
        ),
        (
            "person:tsutsui-junkei",
            ["筒井順慶"],
            [("ndlna", "00625865"), ("wikidata", "Q8192220")],
        ),
        ("person:tsutsui-sadatsugu", ["筒井定次"], [("wikidata", "Q2748477")]),
        (
            "person:hachisuka-masakatsu",
            ["蜂須賀正勝"],
            [("ndlna", "00626437"), ("wikidata", "Q1201825")],
        ),
        ("person:hachisuka-iemasa", ["蜂須賀家政"], [("wikidata", "Q1073557")]),
        ("person:hachisuka-yoshishige", ["蜂須賀至鎮"], [("wikidata", "Q3125481")]),
        (
            "person:kuki-yoshitaka",
            ["九鬼嘉隆"],
            [("ndlna", "01226769"), ("wikidata", "Q921113")],
        ),
        (
            "person:chosokabe-morichika",
            ["長宗我部盛親"],
            [("ndlna", "00625511"), ("wikidata", "Q589151")],
        ),
        ("person:kosokabe-chikayasu", ["香宗我部親泰"], [("wikidata", "Q11365662")]),
    ],
)
def test_eighteen_authorities_share_stable_identity(
    inputs, person_key, names, authorities
):
    import_history(inputs)
    person = Thing.objects.get(key=person_key)
    assert person.records.filter(record_type=RecordType.PERSON).count() == 1
    assert set(person.authorities.values_list("scheme", "identifier")) == {
        tuple(authority) for authority in authorities
    }
    for name in names:
        assert Thing.objects.filter(names__name=name).distinct().get() == person
        assert not Thing.objects.filter(key="person:" + name).exists()
    for scheme, identifier in authorities:
        assert (
            Thing.objects.filter(
                authorities__scheme=scheme, authorities__identifier=identifier
            ).get()
            == person
        )


def test_kai_campaign_keeps_the_two_local_engagements_and_dates_separate(inputs):
    import_history(inputs)

    campaign = Phenomenon.objects.get(key="campaign:甲州征伐")
    assert campaign.subtype == "campaign"
    expected_titles = {"高遠城の戦い", "天目山の戦い"}
    assert set(campaign.parts.values_list("title", flat=True)) == expected_titles
    assert campaign.parts.count() == len(expected_titles)
    takato = campaign.parts.get(title="高遠城の戦い")
    assert takato.records.filter(record_type=RecordType.IMPLEMENTED_EVENT).exists()
    assert [takato.year, takato.month, takato.day] == [1582, 3, 25]
    tenmoku = campaign.parts.get(key="battle:天目山の戦い1582")
    assert tenmoku.status == Status.REGISTERED
    assert not tenmoku.records.filter(record_type=RecordType.IMPLEMENTED_EVENT).exists()
    assert tenmoku.jd_start is None
    assert tenmoku.jd_end is None
    # A named engagement and a dated, checked claim have different scopes.
    tano = Phenomenon.objects.get(key="claim:tano-katsuyori-1582")
    assert [tano.year, tano.month, tano.day] == [1582, 3, 11]
    assert tano.calendar == Calendar.LUNISOLAR
    assert tano.parent is None
    assert tano != tenmoku
    final_event = Phenomenon.objects.get(
        title="甲州征伐", records__record_type=RecordType.IMPLEMENTED_EVENT
    )
    assert [final_event.year, final_event.month, final_event.day] == [1582, 4, 3]
    assert final_event != campaign
    assert final_event.parent is None
