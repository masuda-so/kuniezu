import json

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError

from kuniezu.history import dates
from kuniezu.history import queries
from kuniezu.history.models import Calendar
from kuniezu.history.models import ImportRun
from kuniezu.history.models import Mode
from kuniezu.history.models import Participation
from kuniezu.history.models import Phenomenon
from kuniezu.history.models import PhenomenonKind
from kuniezu.history.models import Place
from kuniezu.history.models import Precision
from kuniezu.history.models import Record
from kuniezu.history.models import RecordType
from kuniezu.history.models import Role
from kuniezu.history.models import Status
from kuniezu.history.models import Thing
from kuniezu.history.models import ThingKey
from kuniezu.history.models import ThingKind
from kuniezu.history.models import ThingName

pytestmark = pytest.mark.django_db
# Approximate points: Osaka, Fushimi, Edo.
OSAKA = (135.526, 34.687)
FUSHIMI = (135.770, 34.938)
EDO = (139.754, 35.688)
OSAKA_TO_FUSHIMI_KM = (30, 40)
FUSHIMI_TO_EDO_KM = (360, 380)
TWO_DAYS = 2


@pytest.fixture
def world():
    """A traveller and a companion between three places in 1600."""
    run = ImportRun.objects.create()
    record = Record.objects.create(
        key="test",
        record_type=RecordType.LOCATION,
        status=Status.VERIFIED,
        payload={},
        content_hash="",
        first_run=run,
        last_run=run,
    )

    def thing(key, kind, name, point=None):
        made = Thing.objects.create(key=key, kind=kind, name=name)
        made.records.add(record)
        ThingName.objects.create(thing=made, name=name)
        if point:
            Place.objects.create(
                thing=made, longitude=point[0], latitude=point[1], basis="test"
            )
        return made

    def stay(key, who, where, day, kind=PhenomenonKind.MOVEMENT):
        number = dates.western_to_jd(*day)
        made = Phenomenon.objects.create(
            key=key,
            mode=Mode.STATE,
            kind=kind,
            title=key,
            status=Status.VERIFIED,
            place=where,
            calendar=Calendar.WESTERN,
            precision=Precision.DAY,
            year=day[0],
            month=day[1],
            day=day[2],
            jd_start=number,
            jd_end=number,
            jd_exact=True,
        )
        made.records.add(record)
        for member in who:
            Participation.objects.create(
                phenomenon=made, thing=member, role=Role.SUBJECT
            )
        return made

    traveller = thing("person:traveller", ThingKind.PERSON, "旅人")
    companion = thing("person:companion", ThingKind.PERSON, "同行者")
    osaka = thing("place:osaka", ThingKind.SITE, "大坂", OSAKA)
    fushimi = thing("place:fushimi", ThingKind.SITE, "伏見", FUSHIMI)
    edo = thing("place:edo", ThingKind.SITE, "江戸", EDO)
    nowhere = thing("place:nowhere", ThingKind.SITE, "座標のない所")
    stay("a-osaka", [traveller, companion], osaka, (1600, 7, 26))
    stay("b-fushimi", [traveller], fushimi, (1600, 7, 27))
    stay("c-edo", [traveller], edo, (1600, 7, 29))
    stay("d-nowhere", [traveller], nowhere, (1600, 8, 1))
    stay("e-office", [traveller], edo, (1600, 8, 2), PhenomenonKind.OFFICE)
    return traveller, companion


def test_a_path_is_the_dated_located_movements_in_order(world):
    traveller, _ = world

    stops = queries.path(traveller)

    assert [stop.place for stop in stops] == ["大坂", "伏見", "江戸"]
    assert [stop.jd_start for stop in stops] == sorted(stop.jd_start for stop in stops)


def test_legs_tell_which_journeys_are_impossible(world):
    traveller, _ = world

    first, second = queries.legs(traveller)

    # Osaka to Fushimi is a day's journey.
    assert first.days == 1
    assert OSAKA_TO_FUSHIMI_KM[0] < first.km < OSAKA_TO_FUSHIMI_KM[1]
    assert first.possible
    # Fushimi to Edo in two days is not: the dates or the places are wrong.
    assert second.days == TWO_DAYS
    assert FUSHIMI_TO_EDO_KM[0] < second.km < FUSHIMI_TO_EDO_KM[1]
    assert not second.possible
    assert queries.legs(traveller, max_km_per_day=200)[1].possible


def test_a_bundle_is_who_shares_a_phenomenon(world):
    traveller, companion = world

    shared = queries.bundle(traveller)

    assert shared[0] == (companion, 1)
    assert [other for other, _ in queries.bundle(companion)] == [traveller]


def test_time_and_space_are_searched_together(world):
    in_july = queries.during(
        dates.western_to_jd(1600, 7, 1), dates.western_to_jd(1600, 7, 31)
    )
    kinai = queries.in_box(135, 136, 34, 36)
    kinai_on_27th = queries.in_box(
        135,
        136,
        34,
        36,
        jd_start=dates.western_to_jd(1600, 7, 27),
        jd_end=dates.western_to_jd(1600, 7, 27),
    )

    assert [item.key for item in in_july] == ["a-osaka", "b-fushimi", "c-edo"]
    assert [item.key for item in kinai] == ["a-osaka", "b-fushimi"]
    assert [item.key for item in kinai_on_27th] == ["b-fushimi"]
    assert queries.in_year(1600).count() == Phenomenon.objects.count()
    assert not queries.in_year(1599).exists()


def test_about_lists_everything_recorded_for_a_thing(world):
    traveller, companion = world

    assert queries.about(traveller).count() == Phenomenon.objects.count()
    assert [item.key for item in queries.about(companion)] == ["a-osaka"]
    assert list(queries.find_things("旅人")) == [traveller]


def test_a_shared_name_is_settled_by_key(world):
    traveller, _ = world
    twin = Thing.objects.create(key="person:twin", kind=ThingKind.PERSON, name="旅人")
    ThingName.objects.create(thing=twin, name="旅人")
    ThingKey.objects.create(thing=twin, key="person:twin")
    ThingKey.objects.create(thing=traveller, key="person:traveller")

    with pytest.raises(CommandError) as failure:
        call_command("history_query", about="旅人")

    # The candidates are listed with their keys.
    assert "person:traveller" in str(failure.value)
    assert "person:twin" in str(failure.value)
    assert list(queries.find_things("person:twin")) == [twin]


def test_the_query_command_prints_json(world, capsys):
    call_command("history_query", about="同行者", year=1600)

    answer = json.loads(capsys.readouterr().out)
    assert [row["key"] for row in answer] == ["a-osaka"]
    assert answer[0]["western"] == [[1600, 7, 26], [1600, 7, 26]]
    assert answer[0]["place"] == "大坂"
    # The point is the place's representative point, with how it was obtained.
    assert answer[0]["placePoint"] == list(OSAKA)
    assert answer[0]["placeBasis"] == "test"

    call_command("history_query", legs="旅人")

    legs = json.loads(capsys.readouterr().out)
    assert [leg["possible"] for leg in legs] == [True, False]
