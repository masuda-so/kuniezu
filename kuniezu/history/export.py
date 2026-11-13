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


def order(items: list[Evidence]) -> list[Evidence]:
    """By last possible day, then first, then id (territory-control.md)."""
    return sorted(items, key=lambda e: (e.end, e.start, e.id))


class Timeline:
    """Intervals for one castle, built by reading its records in order."""

    def __init__(self) -> None:
        self.intervals: list[Interval] = []
        self.held: str | None = None  # the last confirmed or carried clan

    def close(self, day: int) -> None:
        if self.intervals and self.intervals[-1].end is None:
            last = self.intervals[-1]
            if day <= last.start:
                # A record that starts on or before the open interval replaces it.
                self.intervals.pop()
            else:
                last.end = day

    def open(self, interval: Interval) -> None:
        self.close(interval.start)
        last = self.intervals[-1] if self.intervals else None
        if (
            last is not None
            and last.end == interval.start
            and (last.clan, last.status, last.claimants)
            == (interval.clan, interval.status, interval.claimants)
        ):
            last.end = interval.end
            last.sources = sorted({*last.sources, *interval.sources})
            return
        self.intervals.append(interval)

    def carry(self, day: int, source: str) -> None:
        if self.held:
            self.open(Interval(day, self.held, CARRIED, [source]))

    def read(self, item: Evidence) -> None:
        row = item.row
        if item.change:
            gained = clan_key(row["to"])
            self.close(item.end)
            self.held = gained
            if gained:
                self.open(Interval(item.end, gained, CONFIRMED, [item.id]))
            return
        value = row["value"]
        after = item.end + 1
        if value == "held":
            self.held = clan_key(row["holder"])
            self.open(
                Interval(item.start, self.held or "", CONFIRMED, [item.id], end=after)
            )
            self.carry(after, item.id)
        elif value == "contested":
            claimants = [clan_key(c) or "" for c in row["claimants"]]
            colour = self.held or claimants[0]
            self.open(
                Interval(item.start, colour, CONTESTED, [item.id], claimants, end=after)
            )
            self.carry(after, item.id)
        elif value == "undetermined":
            self.carry(item.start, item.id)
        else:  # not-applicable
            self.close(item.start)
            self.held = None


def owner_timeline() -> dict[str, list[Json]]:
    """Intervals by castle id, sorted by castle id and start."""
    result: dict[str, list[Json]] = {}
    for castle, items in sorted(evidence().items()):
        variants = {e.id for e in items if e.row.get("variantOf")}
        timeline = Timeline()
        for item in order(items):
            if item.id in variants or not item.certain:
                continue
            timeline.read(item)
        rows = [interval_json(i) for i in timeline.intervals if i.clan]
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
