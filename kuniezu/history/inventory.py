"""How far the history database covers each person and each castle.

The starting point for filling the database in a MECE way
(docs/designs/space-time-records.md, section 4). For every person and every
castle, and for each kind of record, exactly one state:

* ``confirmed``: a record checked against a source.
* ``comparison``: only a value from the game or another unchecked input.
* ``undetermined``: searched, and the sources do not settle it.
* ``untouched``: nothing yet.

The items follow the catalog in docs/designs/space-time-records.md. An item
the database has no input for yet is listed under ``noContainer`` instead of
being counted, so a zero is never mistaken for "searched and found nothing".

The counts are derived from the database, so the same import gives the same
table.
"""

from __future__ import annotations

from collections import Counter
from typing import TYPE_CHECKING
from typing import Any

from kuniezu.history.models import Participation
from kuniezu.history.models import Phenomenon
from kuniezu.history.models import PhenomenonKind
from kuniezu.history.models import Role
from kuniezu.history.models import Status
from kuniezu.history.models import Thing
from kuniezu.history.models import ThingKey
from kuniezu.history.models import ThingKind

if TYPE_CHECKING:
    from collections.abc import Callable
    from collections.abc import Iterable

Json = dict[str, Any]
CONFIRMED, COMPARISON, UNDETERMINED, UNTOUCHED = (
    "confirmed",
    "comparison",
    "undetermined",
    "untouched",
)
STATES = (CONFIRMED, COMPARISON, UNDETERMINED, UNTOUCHED)
PERSON_ITEMS = (
    "birth",
    "death",
    "names",
    "office",
    "whereabouts",
    "relations",
    "events",
)
CASTLE_ITEMS = ("built", "ended", "names", "position", "owner", "lord", "events")
# Items of the catalog with no input yet (docs/designs/space-time-records.md).
NO_CONTAINER = {
    "people": (
        "status-and-religion",
        "burial",
        "family",
        "affiliation",
        "service",
        "fief",
    ),
    "castles": ("type-and-structure", "castle-town"),
}
# A point whose position a source checked, as opposed to the game's own point.
CHECKED_POINTS = {"site-representative"}
BIRTH = {"birth", "birth-date", "birth-year"}
DEATH = {"death", "death-date", "death-year"}
CONSTRUCTION = {"change:construction", "castle-construction", "construction-year"}
END = {"change:abandonment", "abandoned", "burned"}
# Game castles are the castle nodes and the sites the game lists as 城.
CASTLE_KINDS = {"castle-node", "城"}


def state_of(items: Iterable[Phenomenon]) -> str:
    """The best state the phenomena give: a checked one wins over the rest."""
    statuses = {item.status for item in items}
    if Status.VERIFIED in statuses:
        return CONFIRMED
    if Status.REGISTERED in statuses:
        # An undetermined control observation is a registered record.
        return UNDETERMINED
    if Status.IMPLEMENTATION in statuses:
        return COMPARISON
    return UNTOUCHED


def phenomena_of(thing: Thing, *, subject_only: bool = False) -> list[Phenomenon]:
    parts = Participation.objects.filter(thing=thing)
    if subject_only:
        parts = parts.filter(role=Role.SUBJECT)
    ids = parts.values_list("phenomenon_id", flat=True)
    if subject_only:
        return list(Phenomenon.objects.filter(id__in=ids))
    placed = Phenomenon.objects.filter(place=thing).values_list("id", flat=True)
    return list(Phenomenon.objects.filter(id__in=[*ids, *placed]))


def person_row(thing: Thing) -> Json:
    # Only what the records say about the person: a death claim that names a
    # relative as a related person is not the relative's death.
    found = phenomena_of(thing, subject_only=True)

    def pick(test: Callable[[Phenomenon], bool]) -> str:
        return state_of(item for item in found if test(item))

    return {
        "key": thing.keys.order_by("key").values_list("key", flat=True).first(),
        "name": thing.name,
        "birth": pick(
            lambda p: p.kind == PhenomenonKind.EXISTENCE and p.subtype in BIRTH
        ),
        "death": pick(
            lambda p: p.kind == PhenomenonKind.EXISTENCE and p.subtype in DEATH
        ),
        "whereabouts": pick(lambda p: p.kind == PhenomenonKind.MOVEMENT),
        "names": pick(lambda p: p.kind == PhenomenonKind.NAMING),
        "office": pick(lambda p: p.kind == PhenomenonKind.OFFICE),
        # Alliances, submissions and hostility the person is the subject of.
        "relations": pick(lambda p: p.kind == PhenomenonKind.RELATION),
        # Taking part in an event counts whatever the role: a battle claim names
        # its commanders as related people, not as its subject.
        "events": state_of(
            p for p in phenomena_of(thing) if p.kind == PhenomenonKind.CONFLICT
        ),
    }


def castle_row(thing: Thing) -> Json:
    found = phenomena_of(thing)

    def pick(test: Callable[[Phenomenon], bool]) -> str:
        return state_of(item for item in found if test(item))

    control = [p for p in found if p.key.startswith("control:")]
    site_periods = [p for p in found if p.subtype == "active-period"]
    built = state_of(p for p in found if p.subtype in CONSTRUCTION)
    ended = state_of(p for p in found if p.subtype in END)
    # The game's own active period is a comparison value for both ends.
    if built == UNTOUCHED and any(p.jd_start is not None for p in site_periods):
        built = COMPARISON
    if ended == UNTOUCHED and any(p.jd_end is not None for p in site_periods):
        ended = COMPARISON
    owner = state_of(control)
    if owner == UNTOUCHED and any(
        p.kind == PhenomenonKind.CONTROL and p.status == Status.IMPLEMENTATION
        for p in found
    ):
        owner = COMPARISON
    return {
        "key": thing.keys.order_by("key").values_list("key", flat=True).first(),
        "name": thing.name,
        "built": built,
        "ended": ended,
        "owner": owner,
        "lord": pick(lambda p: p.subtype == "held-castle-lordship"),
        "names": pick(lambda p: p.kind == PhenomenonKind.NAMING),
        "position": position_state(thing),
        "events": pick(lambda p: p.kind == PhenomenonKind.CONFLICT),
    }


def position_state(thing: Thing) -> str:
    point = getattr(thing, "place", None)
    if point is None:
        return UNTOUCHED
    return CONFIRMED if point.basis in CHECKED_POINTS else COMPARISON


def castles() -> list[Thing]:
    """The game's castles, from the implemented sites the import records."""
    keys = []
    for thing_key in ThingKey.objects.filter(
        thing__kind=ThingKind.SITE, key__regex=r"^(node|yosho):"
    ).select_related("thing"):
        record = thing_key.thing.records.filter(
            key="implemented-site:" + thing_key.key
        ).first()
        if record and record.payload.get("kind") in CASTLE_KINDS:
            keys.append(thing_key.thing)
    return sorted(set(keys), key=lambda t: t.name)


def people() -> list[Thing]:
    return list(Thing.objects.filter(kind=ThingKind.PERSON).order_by("name"))


def inventory() -> Json:
    person_rows = [person_row(thing) for thing in people()]
    castle_rows = [castle_row(thing) for thing in castles()]

    def table(rows: list[Json], fields: tuple[str, ...]) -> Json:
        return {
            field: {state: Counter(r[field] for r in rows)[state] for state in STATES}
            for field in fields
        }

    return {
        "people": {
            "total": len(person_rows),
            "states": table(person_rows, PERSON_ITEMS),
            "noContainer": list(NO_CONTAINER["people"]),
        },
        "castles": {
            "total": len(castle_rows),
            "states": table(castle_rows, CASTLE_ITEMS),
            "noContainer": list(NO_CONTAINER["castles"]),
        },
        "rows": {"people": person_rows, "castles": castle_rows},
    }
