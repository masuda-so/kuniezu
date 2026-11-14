"""How far the history database covers each person and each castle.

The starting point for filling the database in a MECE way
(docs/designs/space-time-records.md, section 4). For every person and every
castle, and for each kind of record, exactly one state:

* ``confirmed``: a record checked against a source.
* ``comparison``: only a value from the game or another unchecked input.
* ``undetermined``: searched, and the sources do not settle it.
* ``untouched``: nothing yet.

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


def phenomena_of(thing: Thing) -> list[Phenomenon]:
    ids = Participation.objects.filter(thing=thing).values_list(
        "phenomenon_id", flat=True
    )
    placed = Phenomenon.objects.filter(place=thing).values_list("id", flat=True)
    return list(Phenomenon.objects.filter(id__in=[*ids, *placed]))


def person_row(thing: Thing) -> Json:
    found = phenomena_of(thing)

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
    }


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
            "states": table(person_rows, ("birth", "death", "whereabouts")),
        },
        "castles": {
            "total": len(castle_rows),
            "states": table(castle_rows, ("built", "ended", "owner", "lord")),
        },
        "rows": {"people": person_rows, "castles": castle_rows},
    }
