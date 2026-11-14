import json
from datetime import date
from pathlib import Path

import pytest
from django.conf import settings

from kuniezu.history import dates

NAGASHINO_JD = 2296506
JAPANESE_FOURTEENTH_JD = 2302671
BUSAN_KOREAN_JD = 2302670
UNIX_EPOCH_JD = 2440588

TABLE = Path(settings.BASE_DIR) / "kuniezu/static/kuniezu/koyomi.js"


def test_western_dates_switch_calendars_in_october_1582():
    last_julian = dates.western_to_jd(1582, 10, 4)
    first_gregorian = dates.western_to_jd(1582, 10, 15)

    assert first_gregorian == dates.GREGORIAN_START
    # The ten skipped days do not exist: the day numbers are consecutive.
    assert first_gregorian - last_julian == 1
    assert dates.jd_to_western(last_julian) == (1582, 10, 4)
    assert dates.jd_to_western(first_gregorian) == (1582, 10, 15)


def test_day_numbers_reach_back_before_the_common_era():
    number = dates.western_to_jd(-500, 3, 1)

    assert dates.jd_to_western(number) == (-500, 3, 1)
    assert number < dates.western_to_jd(1, 1, 1) < dates.western_to_jd(1560, 1, 1)


def test_lunisolar_dates_follow_the_month_table():
    # Okehazama: Eiroku 3, 5th month, 19th day.
    okehazama = dates.lunisolar_to_jd(TABLE, 1560, 5, 19, leap=False)
    # Oda Nobutaka: Tensho 11, 5th month, 2nd day, after the calendar reform.
    nobutaka = dates.lunisolar_to_jd(TABLE, 1583, 5, 2, leap=False)
    # Maeda Toshiie: Keicho 4, intercalary 3rd month, 3rd day.
    toshiie = dates.lunisolar_to_jd(TABLE, 1599, 3, 3, leap=True)
    plain_third_month = dates.lunisolar_to_jd(TABLE, 1599, 3, 3, leap=False)

    assert okehazama is not None
    assert nobutaka is not None
    assert toshiie is not None
    assert plain_third_month is not None
    assert dates.jd_to_western(okehazama) == (1560, 6, 12)
    assert dates.jd_to_western(nobutaka) == (1583, 6, 21)
    assert dates.jd_to_western(toshiie) == (1599, 4, 27)
    assert toshiie > plain_third_month


def test_a_lunisolar_date_outside_the_table_has_no_day_number():
    assert dates.lunisolar_to_jd(TABLE, 1400, 1, 1, leap=False) is None


def test_1534_table_uses_absolute_days_before_the_western_reform():
    # The upstream first column is proleptic Gregorian, not Julian.
    first = dates.lunisolar_to_jd(TABLE, 1534, 5, 1, leap=False)
    assert first == (date(1534, 6, 22) - date(1970, 1, 1)).days + UNIX_EPOCH_JD
    assert first is not None
    assert dates.jd_to_western(first + 11) == (1534, 6, 23)
    assert dates.lunisolar_month_length(TABLE, 1534, 5, leap=False) in (29, 30)


def test_database_reads_all_legacy_months_without_changing_day_numbers():
    legacy_path = (
        Path(settings.BASE_DIR)
        / "data/inputs/japanese-calendar/legacy-month-starts.json"
    )
    legacy = json.loads(legacy_path.read_text(encoding="utf-8"))
    starts = dates.month_starts(TABLE)
    for year, month, leap, offset in legacy["m"]:
        assert starts[(year, month, bool(leap))] == legacy["j0"] + offset


def test_year_bounds_cover_whole_years():
    start, end = dates.year_bounds(1600)

    assert dates.jd_to_western(start) == (1600, 1, 1)
    assert dates.jd_to_western(end) == (1600, 12, 31)
    assert dates.year_bounds(1589, 1599)[1] == dates.western_to_jd(1599, 12, 31)


@pytest.mark.parametrize("day", range(5, 15))
def test_missing_hybrid_dates_are_rejected(day):
    with pytest.raises(ValueError, match="do not exist"):
        dates.western_to_jd(1582, 10, day)


def test_all_days_roundtrip_across_the_calendar_reform():
    first = dates.western_to_jd(1582, 1, 1)
    last = dates.western_to_jd(1582, 12, 31)
    for number in range(first, last + 1):
        assert dates.western_to_jd(*dates.jd_to_western(number)) == number


def test_nagashino_and_japanese_calendar_busanjin_are_distinct_cases():
    nagashino = dates.lunisolar_to_jd(TABLE, 1575, 5, 21, leap=False)
    assert nagashino == NAGASHINO_JD
    assert dates.jd_to_western(nagashino) == (1575, 6, 29)
    # Proleptic Gregorian 1575-07-09 is the same JDN, not a second event.
    assert (date(1575, 7, 9) - date(1970, 1, 1)).days + UNIX_EPOCH_JD == nagashino
    japan = dates.lunisolar_to_jd(TABLE, 1592, 4, 14, leap=False)
    korea = dates.western_to_jd(1592, 5, 24)
    assert japan == JAPANESE_FOURTEENTH_JD
    assert korea == BUSAN_KOREAN_JD
    assert japan - korea == 1


def test_iso_8601_is_proleptic_gregorian_and_never_invents_a_day():
    # Okehazama, Eiroku 3.5.19: Julian 1560-06-12, ISO 8601 1560-06-22.
    okehazama = 2291011
    assert dates.jd_to_western(okehazama) == (1560, 6, 12)
    assert dates.jd_to_iso(okehazama) == "1560-06-22"
    # After the reform both calendars agree.
    reform = dates.western_to_jd(1582, 10, 15)
    assert dates.jd_to_iso(reform) == "1582-10-15"
    assert dates.iso_extent(okehazama, okehazama) == "1560-06-22"
    assert dates.iso_extent(reform, reform + 9) == "1582-10-15/1582-10-24"
    assert dates.iso_extent(None, reform) == "../1582-10-15"
    assert dates.iso_extent(reform, None) == "1582-10-15/.."
    assert dates.iso_extent(None, None) is None
