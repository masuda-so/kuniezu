"""A game site standing for a registry place, for all time or for a period."""

import json
import shutil
from pathlib import Path

import pytest
from django.conf import settings

from kuniezu.history import dates
from kuniezu.history import queries
from kuniezu.history.importer import CATALOG
from kuniezu.history.importer import CONFLICTS
from kuniezu.history.importer import IDENTITIES
from kuniezu.history.importer import KOBUN_INDEX
from kuniezu.history.importer import MONTH_TABLE
from kuniezu.history.importer import RESEARCH
from kuniezu.history.importer import import_history
from kuniezu.history.models import Place
from kuniezu.history.models import Representation
from kuniezu.history.models import Thing

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
SITE = "node:tottori"
BEFORE = "place:kakegawa"
AFTER = "place:tottori-castle"
OTHER_SITE = "node:kakegawa"


@pytest.fixture
def inputs(tmp_path):
    """The repository's inputs without its identity records."""
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


def year(value):
    return {"year": value, "calendar": "CE-year", "precision": "year"}


def day(value):
    return {
        "date": value,
        "calendar": "Japanese-lunisolar",
        "leapMonth": False,
        "precision": "day",
    }


def stands(inputs, name, place, site, period=None, *, relation="represented-by"):  # noqa: PLR0913
    row = {
        "id": "identity:" + name,
        "relation": relation,
        "things": [place, site],
        "basis": "試験用の根拠",
        "source": "hiDainihonshiryoKobun",
        "locator": "試験",
        "checked": "2026-11-09",
        "status": "verified-in-specified-scope",
    }
    if period is not None:
        row["period"] = {"basis": "試験用の実装の境界"} | period
    folder = inputs / IDENTITIES
    folder.mkdir(parents=True, exist_ok=True)
    (folder / f"{name}.json").write_text(
        json.dumps(row, ensure_ascii=False), encoding="utf-8"
    )


def mid(value):
    return dates.western_to_jd(value, 7, 1)


def on(site_key, jd):
    return [
        (item.place.key, item.sure)
        for item in queries.stands_for(Thing.objects.get(key=site_key), jd)
    ]


def lunisolar(inputs, value):
    return dates.lunisolar_to_jd(inputs / MONTH_TABLE, *value, leap=False)


def two_periods_by_year(inputs):
    stands(inputs, "before", BEFORE, SITE, {"until": year(1573)})
    stands(inputs, "after", AFTER, SITE, {"from": year(1573)})


def test_a_site_stands_for_one_place_inside_a_period(inputs):
    two_periods_by_year(inputs)
    import_history(inputs)
    assert on(SITE, mid(1572)) == [(BEFORE, True)]
    assert on(SITE, mid(1574)) == [(AFTER, True)]
    sure = queries.settled(queries.stands_for(Thing.objects.get(key=SITE), mid(1574)))
    assert sure is not None
    assert sure.place.key == AFTER


def test_a_year_given_only_as_a_year_is_not_settled(inputs):
    # The switch is known to the year only: anywhere in 1573 both may hold.
    two_periods_by_year(inputs)
    import_history(inputs)
    site = Thing.objects.get(key=SITE)
    first, last = dates.western_to_jd(1573, 1, 1), dates.western_to_jd(1573, 12, 31)
    for jd in (first, mid(1573), last):
        assert sorted(on(SITE, jd)) == [(BEFORE, False), (AFTER, False)]
        assert queries.settled(queries.stands_for(site, jd)) is None


def test_a_day_end_includes_its_start_and_leaves_out_its_end(inputs):
    switch = [1573, 7, 28]
    stands(inputs, "before", BEFORE, SITE, {"until": day(switch)})
    stands(inputs, "after", AFTER, SITE, {"from": day(switch)})
    import_history(inputs)
    jd = lunisolar(inputs, switch)
    assert on(SITE, jd - 1) == [(BEFORE, True)]
    assert on(SITE, jd) == [(AFTER, True)]


def test_a_place_may_have_several_sites_one_after_another(inputs):
    stands(inputs, "first", AFTER, SITE, {"until": year(1580)})
    stands(inputs, "second", AFTER, OTHER_SITE, {"from": year(1581)})
    import_history(inputs)
    place = Thing.objects.get(key=AFTER)
    sites = [
        (item.site.key, item.sure) for item in queries.represented_by(place, mid(1585))
    ]
    assert sites == [(OTHER_SITE, True)]


@pytest.mark.parametrize(
    "second",
    [
        # Two sites for one place on the same days.
        ("other", AFTER, OTHER_SITE, {"from": year(1575)}),
        # One site for two places on the same days.
        ("other", BEFORE, SITE, {"from": year(1575)}),
        # A representation for all time meets any other on its place.
        ("other", AFTER, OTHER_SITE, None),
    ],
)
def test_two_representations_that_surely_meet_are_refused(inputs, second):
    stands(inputs, "first", AFTER, SITE, {"from": year(1573)})
    name, place, site, period = second
    stands(inputs, name, place, site, period)
    with pytest.raises(ValueError, match="surely overlap"):
        import_history(inputs)


def test_periods_that_meet_only_in_an_uncertain_year_are_kept(inputs):
    stands(inputs, "first", AFTER, SITE, {"until": year(1580)})
    stands(inputs, "second", AFTER, OTHER_SITE, {"from": year(1580)})
    import_history(inputs)
    place = Thing.objects.get(key=AFTER)
    assert {item.site.key for item in queries.represented_by(place, mid(1580))} == {
        SITE,
        OTHER_SITE,
    }


@pytest.mark.parametrize(
    ("period", "relation", "why"),
    [
        ({"from": year(1573)}, "same-site", "only a representation"),
        ({}, "represented-by", "at least one end"),
        ({"from": year(1580), "until": year(1573)}, "represented-by", "ends before"),
        (
            {"from": {"year": 1573, "calendar": "Gregorian", "precision": "year"}},
            "represented-by",
            "lunisolar day or a year",
        ),
        ({"from": year(1573), "since": year(1573)}, "represented-by", "only"),
    ],
)
def test_a_period_that_makes_no_sense_is_refused(inputs, period, relation, why):
    stands(inputs, "bad", AFTER, SITE, period, relation=relation)
    with pytest.raises(ValueError, match=why):
        import_history(inputs)


def test_a_period_with_an_unknown_site_is_refused(inputs):
    stands(inputs, "bad", AFTER, "node:存在しない拠点", {"from": year(1573)})
    with pytest.raises(ValueError, match="no input has"):
        import_history(inputs)


def test_a_representation_for_a_period_lends_no_point(inputs):
    two_periods_by_year(inputs)
    import_history(inputs)
    place = Thing.objects.get(key=AFTER)
    assert not Place.objects.filter(thing=place, basis="represented-by-game-site")


def test_importing_twice_and_dropping_a_record(inputs):
    two_periods_by_year(inputs)
    import_history(inputs)
    import_history(inputs)
    places = Representation.objects.filter(site__key=SITE).values_list(
        "place__key", flat=True
    )
    assert sorted(places) == sorted([BEFORE, AFTER])
    (inputs / IDENTITIES / "after.json").unlink()
    import_history(inputs)
    assert on(SITE, mid(1574)) == []
    assert on(SITE, mid(1572)) == [(BEFORE, True)]
