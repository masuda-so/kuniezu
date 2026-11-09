"""Calendar dates as Julian Day Numbers.

A Julian Day Number counts days without a break, so dates in any calendar and
any period of history can be compared as integers. Western dates follow the
game: the Julian calendar up to 4 October 1582 and the Gregorian calendar from
15 October 1582. Japanese lunisolar dates are looked up in the game's own
month table (kuniezu/static/kuniezu/koyomi.js, built from the National
Astronomical Observatory of Japan's calendar data).
"""

from __future__ import annotations

import re
from functools import lru_cache
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from pathlib import Path

GREGORIAN_START = 2299161  # 15 October 1582
LAST_JULIAN_DATE = (1582, 10, 4)
FIRST_GREGORIAN_DATE = (1582, 10, 15)
MONTH_TABLE = re.compile(r"\[(\d+),(\d+),([01]),(\d+)\]")


def western_to_jd(year: int, month: int, day: int) -> int:
    """Convert a hybrid Western date, rejecting the calendar reform gap."""
    if LAST_JULIAN_DATE < (year, month, day) < FIRST_GREGORIAN_DATE:
        message = (
            "1582-10-05 through 1582-10-14 do not exist in the hybrid western calendar"
        )
        raise ValueError(message)
    a = (14 - month) // 12
    y = year + 4800 - a
    m = month + 12 * a - 3
    julian = day + (153 * m + 2) // 5 + 365 * y + y // 4 - 32083
    if julian < GREGORIAN_START:
        return julian
    return day + (153 * m + 2) // 5 + 365 * y + y // 4 - y // 100 + y // 400 - 32045


def jd_to_western(jd: int) -> tuple[int, int, int]:
    if jd >= GREGORIAN_START:
        a = jd + 32044
        b = (4 * a + 3) // 146097
        c = a - 146097 * b // 4
    else:
        b = 0
        c = jd + 32082
    d = (4 * c + 3) // 1461
    e = c - 1461 * d // 4
    m = (5 * e + 2) // 153
    return (
        100 * b + d - 4800 + m // 10,
        m + 3 - 12 * (m // 10),
        e - (153 * m + 2) // 5 + 1,
    )


def year_bounds(first: int, last: int | None = None) -> tuple[int, int]:
    """The first and last day of a span of whole western years."""
    return western_to_jd(first, 1, 1), western_to_jd(
        first if last is None else last, 12, 31
    )


@lru_cache(maxsize=4)
def month_starts(table: Path) -> dict[tuple[int, int, bool], int]:
    """The Julian Day Number of day 1 of each lunisolar month in the table."""
    text = table.read_text(encoding="utf-8")
    origin = re.search(r"j0:(\d+)", text)
    if origin is None:
        message = f"{table} has no month table"
        raise ValueError(message)
    return {
        (int(year), int(month), leap == "1"): int(origin.group(1)) + int(offset)
        for year, month, leap, offset in MONTH_TABLE.findall(text)
    }


def lunisolar_to_jd(
    table: Path, year: int, month: int, day: int, *, leap: bool
) -> int | None:
    """The Julian Day Number of a lunisolar date, or None outside the table."""
    start = month_starts(table).get((year, month, leap))
    return None if start is None else start + day - 1


def lunisolar_month_length(
    table: Path, year: int, month: int, *, leap: bool
) -> int | None:
    """How many days a lunisolar month has, or None outside the table."""
    starts = month_starts(table)
    start = starts.get((year, month, leap))
    if start is None:
        return None
    later = [day for day in starts.values() if day > start]
    return min(later) - start if later else None
