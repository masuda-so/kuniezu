"""The game's castle owners, exported from the history database.

The game decides who holds each castle from its own timeline (``TK.HIST``).
Where the control records in the database (``RecordType.CONTROL``) say who
held a castle, the export writes intervals that the game uses instead
(docs/designs/county-territory.md, technical plan 2). Periods with no
interval are left to the timeline.

Rules, per castle, reading the records in time order:

* A change gives the receiving clan a ``confirmed`` interval from the change's
  last possible day until the next record. A change to ``none`` (abandoned)
  ends the interval.
* A certain observation (one day, or a period whose bounds the source states)
  of ``held`` gives a ``confirmed`` interval over its period; after it, the
  same clan is ``carried`` until the next record.
* A certain ``contested`` observation gives a ``contested`` interval with the
  claimants, coloured by the clan held before; after it, that clan is carried.
* ``undetermined`` carries the clan held before through and past the period.
  With no clan before, no interval.
* ``not-applicable`` ends the interval; nothing is carried past it.
* Windows (an observation known only to a year, or a period whose bounds the
  source does not state) and records that are variants of one another
  (``variantOf``) give no interval: they are counted in the coverage only.

An interval no later record ends has ``to`` empty. The game ends it at its
own timeline's next change of that castle (owner-timeline.js), so a record
never overrides later history that no record covers.

The owner is decided day by day (state_on) at every day a record starts or
stops deciding, so overlapping observations give one interval, never two.
Changes on the same day apply in the order their clans hand over.

Intervals include ``from`` and exclude ``to``. Dates are western dates as the
game reads them (Julian before 15 October 1582, Gregorian after), with the
Julian Day Numbers alongside for checking.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from dataclasses import field
from typing import TYPE_CHECKING
from typing import Any

from kuniezu.history import dates
from kuniezu.history.models import Phenomenon
from kuniezu.history.models import PhenomenonKind
from kuniezu.history.models import RecordType

if TYPE_CHECKING:
    from pathlib import Path

Json = dict[str, Any]
VERSION = 1
CONFIRMED, CONTESTED, CARRIED = "confirmed", "contested", "carried"
NONE_CLAN = "none"


@dataclass
class Evidence:
    """One control record as the export reads it from the database."""

    id: str
    castle: str
    start: int
    end: int
    row: Json

    @property
    def change(self) -> bool:
        return self.row["type"] == "change"

    @property
    def certain(self) -> bool:
        if self.change:
            return True
        if self.row["time"].keys() >= {"from", "to"}:
            return bool(self.row.get("boundsAsserted"))
        return self.start == self.end


@dataclass
class Interval:
    start: int
    clan: str
    status: str
    sources: list[str]
    claimants: list[str] = field(default_factory=list)
    end: int | None = None


def clan_key(value: str | None) -> str | None:
    if not value or not value.startswith("clan:"):
        return None
    return value.removeprefix("clan:")


def evidence() -> dict[str, list[Evidence]]:
    """The live control records, grouped by castle id (castle: removed)."""
    found: dict[str, list[Evidence]] = {}
    # Claims also describe control (castle falls), but only the control
    # records drive the game: their phenomena carry the record's own id.
    items = Phenomenon.objects.filter(
        kind=PhenomenonKind.CONTROL, key__startswith="control:"
    ).prefetch_related("records")
    for item in items:
        record = next(
            r
            for r in item.records.all()
            if r.record_type == RecordType.CONTROL and r.retired_run_id is None
        )
        row = record.payload
        castle = row["site"].removeprefix("castle:")
        if item.jd_start is None or item.jd_end is None:
            message = f"{row['id']} has no day numbers"
            raise ValueError(message)
        found.setdefault(castle, []).append(
            Evidence(row["id"], castle, item.jd_start, item.jd_end, row)
        )
    return found


def effect(item: Evidence) -> int:
    """The first day a record decides the owner from: a change on its last
    possible day, an observation on the day after it ends."""
    return item.end if item.change else item.end + 1


def order(items: list[Evidence]) -> list[Evidence]:
    """By the day each record takes effect, then first day, then id.

    On the same day, observations that end the day before come first, then
    changes in the order their clans hand over (A→B before B→C,
    territory-control.md); id decides only what that leaves.
    """
    ranked = sorted(items, key=lambda e: (effect(e), e.start, e.id))
    result: list[Evidence] = []
    while ranked:
        day = effect(ranked[0])
        group = [e for e in ranked if effect(e) == day]
        ranked = [e for e in ranked if effect(e) != day]
        # An observation that ends the day before carries its clan up to the
        # day; a change on that day then hands the castle on, so it goes last.
        result.extend(e for e in group if not e.change)
        group = [e for e in group if e.change]
        while group:
            gained = {e.row.get("to") for e in group}
            # A change whose giving clan no other remaining change receives goes first.
            first = next(
                (e for e in group if e.row.get("from") not in gained), group[0]
            )
            result.append(first)
            group.remove(first)
    return result


State = tuple[str, str, tuple[str, ...], tuple[str, ...]] | None


def covered(covering: list[Evidence], held: str | None) -> State:
    """The state on a day that certain observations cover.

    The input check refuses certain observations that disagree, so the
    covering ones say the same thing.
    """
    row, ids = covering[0].row, tuple(sorted(e.id for e in covering))
    value = row["value"]
    if value == "held":
        return clan_key(row["holder"]) or "", CONFIRMED, (), ids
    if value == "contested":
        claimants = tuple(clan_key(c) or "" for c in row["claimants"])
        return held or claimants[0], CONTESTED, claimants, ids
    if value == "undetermined" and held:
        return held, CARRIED, (), ids
    return None


def state_on(day: int, ordered: list[Evidence]) -> State:
    """Who holds the castle on ``day``: (clan, status, claimants, sources)."""
    held: str | None = None
    last: Evidence | None = None
    for item in ordered:
        if effect(item) > day:
            break
        last = item
        if item.change:
            held = clan_key(item.row["to"])
        elif item.row["value"] == "held":
            held = clan_key(item.row["holder"])
        elif item.row["value"] == "not-applicable":
            held = None
    covering = [e for e in ordered if not e.change and e.start <= day <= e.end]
    if covering:
        return covered(covering, held)
    if last is None or not held:
        return None
    status = CONFIRMED if last.change else CARRIED
    return held, status, (), (last.id,)


def build(items: list[Evidence]) -> list[Interval]:
    """Non-overlapping intervals in time order, from the records of one castle."""
    used = [e for e in items if e.certain and not e.row.get("variantOf")]
    ordered = order(used)
    points = sorted({effect(e) for e in used} | {e.start for e in used if not e.change})
    intervals: list[Interval] = []
    for number, day in enumerate(points):
        end = points[number + 1] if number + 1 < len(points) else None
        found = state_on(day, ordered)
        if found is None:
            continue
        clan, status, claimants, sources = found
        last = intervals[-1] if intervals else None
        if (
            last is not None
            and last.end == day
            and (last.clan, last.status, last.claimants)
            == (clan, status, list(claimants))
        ):
            last.end = end
            last.sources = sorted({*last.sources, *sources})
            continue
        intervals.append(
            Interval(day, clan, status, list(sources), list(claimants), end)
        )
    return intervals


def owner_timeline() -> dict[str, list[Json]]:
    """Intervals by castle id, sorted by castle id and start."""
    result: dict[str, list[Json]] = {}
    for castle, items in sorted(evidence().items()):
        rows = [interval_json(i) for i in build(items) if i.clan]
        if rows:
            result[castle] = rows
    return result


def interval_json(interval: Interval) -> Json:
    row: Json = {
        "from": list(dates.jd_to_western(interval.start)),
        "fromJD": interval.start,
        "to": list(dates.jd_to_western(interval.end)) if interval.end else None,
        "toJD": interval.end,
        "clan": interval.clan,
        "status": interval.status,
    }
    if interval.claimants:
        row["claimants"] = interval.claimants
    row["sources"] = interval.sources
    return row


def coverage() -> dict[str, Json]:
    """Per castle, how many records gave intervals and how many days each status covers.

    Open intervals are not counted in days.
    """
    timeline = owner_timeline()
    found = evidence()
    result: dict[str, Json] = {}
    for castle, items in sorted(found.items()):
        days: dict[str, int] = {}
        for row in timeline.get(castle, []):
            if row["toJD"] is not None:
                days[row["status"]] = (
                    days.get(row["status"], 0) + row["toJD"] - row["fromJD"]
                )
        result[castle] = {
            "records": len(items),
            "windows": sum(1 for e in items if not e.certain),
            "variants": sum(1 for e in items if e.row.get("variantOf")),
            "intervals": len(timeline.get(castle, [])),
            "days": days,
        }
    return result


def inputs_sha256(root: Path) -> str:
    return hashlib.sha256(
        (root / "data/research/control.jsonl").read_bytes()
    ).hexdigest()


def owners_script(timeline: dict[str, list[Json]], digest: str) -> str:
    data = {"version": VERSION, "inputsSha256": digest, "castles": timeline}
    body = json.dumps(data, ensure_ascii=False, separators=(",", ":"), sort_keys=False)
    return (
        "/* 城の持ち主の区間。史実 DB から manage.py export_game_data が書き出す。"
        "手で直さない。 */\n"
        "window.TK=window.TK||{};\n"
        f"TK.OWNER_TIMELINE={body};\n"
    )
