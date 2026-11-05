from pathlib import Path

from django.conf import settings

from kuniezu.history import dates

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


def test_year_bounds_cover_whole_years():
    start, end = dates.year_bounds(1600)

    assert dates.jd_to_western(start) == (1600, 1, 1)
    assert dates.jd_to_western(end) == (1600, 12, 31)
    assert dates.year_bounds(1589, 1599)[1] == dates.western_to_jd(1599, 12, 31)
