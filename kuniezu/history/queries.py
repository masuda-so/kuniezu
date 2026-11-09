"""Questions the history database answers.

The ideas follow time geography (Hägerstrand 1970). A thing's dated places make
its *path* through space and time; the places where it stays are *stations*;
several things sharing one phenomenon form a *bundle*; and two dated places
bound a *prism* of what could be reached in between, so a pair that would need
an impossible speed points at a wrong date or a wrong place.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from itertools import pairwise
from typing import TYPE_CHECKING

from django.db.models import Count
from django.db.models import Q

from kuniezu.history import dates
from kuniezu.history.models import Phenomenon
from kuniezu.history.models import PhenomenonKind
from kuniezu.history.models import RecordVersion
from kuniezu.history.models import Representation
from kuniezu.history.models import Thing

if TYPE_CHECKING:
    from django.db.models import QuerySet

EARTH_RADIUS_KM = 6371.0088


def find_things(name: str) -> QuerySet[Thing]:
    """Things that go by a name (people under any of their names).

    An identifier such as ``place:edo`` finds the one thing known by it.
    """
    by_key = Thing.objects.filter(keys__key=name)
    if by_key.exists():
        return by_key
    return Thing.objects.filter(names__name=name).distinct().order_by("key")


def about(thing: Thing) -> QuerySet[Phenomenon]:
    """Everything recorded about a thing, in order of time."""
    return (
        Phenomenon.objects.filter(participations__thing=thing)
        .distinct()
        .order_by("jd_start", "jd_end", "key")
    )


def meeting(
    found: QuerySet[Phenomenon], jd_start: int, jd_end: int, *, asserted_only: bool
) -> QuerySet[Phenomenon]:
    """Narrow phenomena to those whose time extent meets a span of days.

    An end that is unknown does not limit the extent. A phenomenon without any
    date is never found by time.
    """
    found = (
        found.exclude(jd_start__isnull=True, jd_end__isnull=True)
        .filter(Q(jd_start__isnull=True) | Q(jd_start__lte=jd_end))
        .filter(Q(jd_end__isnull=True) | Q(jd_end__gte=jd_start))
    )
    if asserted_only:
        found = found.filter(bounds_asserted=True)
    return found.order_by("jd_start", "jd_end", "key")


def during(
    jd_start: int, jd_end: int, *, asserted_only: bool = False
) -> QuerySet[Phenomenon]:
    """Phenomena whose time extent meets a span of days.

    A period the source only names ("early Edo") is found by its search window
    and carries ``bounds_asserted=False``; ``asserted_only`` leaves it out.
    """
    return meeting(
        Phenomenon.objects.all(), jd_start, jd_end, asserted_only=asserted_only
    )


def in_year(year: int, *, asserted_only: bool = False) -> QuerySet[Phenomenon]:
    return during(*dates.year_bounds(year), asserted_only=asserted_only)


def in_box(  # noqa: PLR0913
    west: float,
    east: float,
    south: float,
    north: float,
    *,
    jd_start: int | None = None,
    jd_end: int | None = None,
) -> QuerySet[Phenomenon]:
    """Phenomena placed inside a box of longitude and latitude, and a time span."""
    found = Phenomenon.objects.filter(
        place__place__longitude__gte=west,
        place__place__longitude__lte=east,
        place__place__latitude__gte=south,
        place__place__latitude__lte=north,
    )
    if jd_start is not None and jd_end is not None:
        return meeting(found, jd_start, jd_end, asserted_only=False)
    return found.order_by("jd_start", "jd_end", "key")


@dataclass(frozen=True)
class Stop:
    """One dated place on a path."""

    phenomenon: str
    title: str
    place: str
    longitude: float
    latitude: float
    jd_start: int
    jd_end: int
    exact: bool


def path(thing: Thing) -> list[Stop]:
    """The thing's path: its dated, located movements and stays, in order."""
    found = (
        about(thing)
        .filter(kind=PhenomenonKind.MOVEMENT)
        .filter(jd_start__isnull=False, jd_end__isnull=False)
        .filter(place__place__isnull=False)
        .select_related("place__place")
    )
    return [
        Stop(
            item.key,
            item.title,
            item.place.name,
            item.place.place.longitude,
            item.place.place.latitude,
            item.jd_start,
            item.jd_end,
            item.jd_exact,
        )
        for item in found
        if item.place is not None
        and item.jd_start is not None
        and item.jd_end is not None
    ]


def distance_km(a: Stop, b: Stop) -> float:
    """Great-circle distance between two stops."""
    lat_a, lat_b = math.radians(a.latitude), math.radians(b.latitude)
    half_lat = (lat_b - lat_a) / 2
    half_lon = math.radians(b.longitude - a.longitude) / 2
    h = (
        math.sin(half_lat) ** 2
        + math.cos(lat_a) * math.cos(lat_b) * math.sin(half_lon) ** 2
    )
    return 2 * EARTH_RADIUS_KM * math.asin(math.sqrt(h))


@dataclass(frozen=True)
class Leg:
    """Two consecutive stops and the speed that joins them."""

    start: Stop
    end: Stop
    km: float
    days: int
    km_per_day: float
    possible: bool


def legs(thing: Thing, max_km_per_day: float = 60.0) -> list[Leg]:
    """The speed each pair of consecutive, exactly dated stops would need.

    A straight line is the shortest way, so a leg marked impossible stays
    impossible on any road. Stops on the same day need a speed of the whole
    distance in one day.
    """
    stops = [stop for stop in path(thing) if stop.exact]
    found = []
    for start, end in pairwise(stops):
        km = distance_km(start, end)
        days = max(end.jd_start - start.jd_end, 1)
        speed = km / days
        found.append(Leg(start, end, km, days, speed, speed <= max_km_per_day))
    return found


def bundle(thing: Thing) -> list[tuple[Thing, int]]:
    """The things that share phenomena with a thing, most shared first."""
    shared = (
        Thing.objects.filter(participations__phenomenon__participations__thing=thing)
        .exclude(pk=thing.pk)
        .annotate(shared=Count("participations__phenomenon", distinct=True))
        .order_by("-shared", "key")
    )
    return [(other, other.shared) for other in shared]


def records_as_of(run_id: int) -> list[RecordVersion]:
    """What the database held after an import: the content of each record then."""
    latest: dict[int, RecordVersion] = {}
    changes = (
        RecordVersion.objects.filter(run_id__lte=run_id)
        .select_related("record")
        .order_by("record_id", "run_id")
    )
    for version in changes:
        latest[version.record_id] = version
    held = [version for version in latest.values() if version.payload is not None]
    return sorted(held, key=lambda version: version.record.key)


@dataclass(frozen=True)
class Standing:
    """A representation that may hold on a day, and whether it surely does."""

    place: Thing
    site: Thing
    sure: bool


def _standing_on(found: QuerySet[Representation], jd: int) -> list[Standing]:
    possible = found.filter(
        Q(start_early__isnull=True) | Q(start_early__lte=jd),
        Q(end_late__isnull=True) | Q(end_late__gt=jd),
    ).select_related("place", "site")
    return [
        Standing(
            place=item.place,
            site=item.site,
            sure=(item.start_late is None or item.start_late <= jd)
            and (item.end_early is None or jd < item.end_early),
        )
        for item in possible.order_by("place__key", "site__key")
    ]


def stands_for(site: Thing, jd: int) -> list[Standing]:
    """The places a game site may stand for on a day.

    A period runs from its start (included) to its end (left out). On a day
    inside a year that is given only as a year, both the place before and the
    place after are listed and neither is sure.
    """
    return _standing_on(Representation.objects.filter(site=site), jd)


def represented_by(place: Thing, jd: int) -> list[Standing]:
    """The game sites that may stand for a place on a day."""
    return _standing_on(Representation.objects.filter(place=place), jd)


def settled(standings: list[Standing]) -> Standing | None:
    """The one representation that surely holds when no other may, else None."""
    return standings[0] if len(standings) == 1 and standings[0].sure else None
