"""Fill the history database from the repository's inputs.

The inputs stay the reviewed originals (one JSON file per record, kept in Git).
An import reads all of them, keeps each record's content and its earlier
contents (``Record``, ``RecordVersion``), and rebuilds the things and phenomena
that the current records describe. Running it twice changes nothing.
"""

from __future__ import annotations

import hashlib
import json
import subprocess
from dataclasses import dataclass
from dataclasses import field
from datetime import date
from typing import TYPE_CHECKING
from typing import Any
from typing import NoReturn

from django.db import transaction

from kuniezu.history import dates
from kuniezu.history.models import Authority
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
from kuniezu.history.models import RecordVersion
from kuniezu.history.models import Representation
from kuniezu.history.models import Role
from kuniezu.history.models import Source
from kuniezu.history.models import Status
from kuniezu.history.models import Thing
from kuniezu.history.models import ThingKey
from kuniezu.history.models import ThingKind
from kuniezu.history.models import ThingName

if TYPE_CHECKING:
    from pathlib import Path

Json = dict[str, Any]

RESEARCH = "data/research"
CATALOG = "docs/work/catalog.jsonl"
IDENTITIES = "data/research/curated/identities"
# The index of 綱文 (one row per article), by year. It holds where each article
# is, never its text; every article starts unclassified.
KOBUN_INDEX = "data/research/kobun-index"
# Which battles a campaign is made of. A campaign has no battle map of its own;
# each battle in it does (the user's decision, 2026-11-07).
CONFLICTS = "data/research/conflicts.json"
KOBUN_UNCLASSIFIED = "kobun-unclassified"
MONTH_TABLE = "kuniezu/static/kuniezu/koyomi.js"
TITLE_LENGTH = 80

# The prefix of an identifier names the kind of thing it stands for. ``battle``
# and ``campaign`` are not things: they name a larger phenomenon.
THING_PREFIX = {
    "person": ThingKind.PERSON,
    "polity": ThingKind.GROUP,
    "clan": ThingKind.GROUP,
    "site": ThingKind.SITE,
    "node": ThingKind.SITE,
    "place": ThingKind.SITE,
    "structure": ThingKind.SITE,
    "yosho": ThingKind.SITE,
    "road": ThingKind.ROUTE,
    "link": ThingKind.ROUTE,
    "water": ThingKind.WATER,
    "region": ThingKind.REGION,
}
PHENOMENON_PREFIX = ("battle", "campaign")

# An identity record says how two identifiers relate.
PAIR = 2
SAME = "same-site"  # one thing under two identifiers
REPRESENTED = "represented-by"  # the game's site stands for a registry place
IDENTITY_FIELDS = ("id", "relation", "things", "basis", "source", "locator", "checked")

# What each word of the inputs is about. A word that is missing here is counted
# as ``other`` and shows up in the import summary.
TIMELINE_KIND = {
    "death": PhenomenonKind.EXISTENCE,
    "newclan": PhenomenonKind.EXISTENCE,
    "appear": PhenomenonKind.MOVEMENT,
    "move": PhenomenonKind.MOVEMENT,
    "leave": PhenomenonKind.MOVEMENT,
    "take": PhenomenonKind.CONTROL,
    "takeall": PhenomenonKind.CONTROL,
    "hegemon": PhenomenonKind.CONTROL,
    "unify": PhenomenonKind.CONTROL,
    "absorb": PhenomenonKind.CONTROL,
    "submit": PhenomenonKind.RELATION,
    "ally": PhenomenonKind.RELATION,
    "rename": PhenomenonKind.NAMING,
    "cname": PhenomenonKind.NAMING,
}
LOCATION_KIND = {
    "attested-presence": PhenomenonKind.MOVEMENT,
    "residence-transfer": PhenomenonKind.MOVEMENT,
    "principal-base": PhenomenonKind.MOVEMENT,
    "held-castle-lordship": PhenomenonKind.CONTROL,
}
LOCATION_EVENTS = {"residence-transfer"}
CLAIM_KIND = {
    PhenomenonKind.EXISTENCE: (
        "death-date death-year birth-year abandoned burned survived-invasion "
        "foundation-year foundation-tradition opening-tradition "
        "adopted-abandonment-hypothesis"
    ),
    PhenomenonKind.MOVEMENT: (
        "departure adopted-departure-date headquarters-move passes-through "
        "residence residence-transfer residence-after-succession "
        "principal-residence stationed site-relocation relative-position "
        "military-civilian-withdrawal route-change described-custody"
    ),
    PhenomenonKind.CONFLICT: (
        "siege-and-field-battle documented-siege-phase military-event castle-fall "
        "campaign-action military-side command hoifa-conquest ula-conquest "
        "jianzhou-unification amur-expedition encirclement-fort-preparation "
        "military-corridor fall-date outer-defence-breached castle-surrender "
        "castle-handover"
    ),
    PhenomenonKind.CONTROL: (
        "captured-and-renamed territorial-transfer territory-confirmation "
        "castle-assignment family-head-succession regional-distribution "
        "administrative-seat"
    ),
    PhenomenonKind.RELATION: (
        "relationship-to-ming recorded-ming-tribute-missions alliance-formation "
        "submission-accepted submission diplomatic-audience peace-agreement"
    ),
    PhenomenonKind.OFFICE: (
        "central-office military-role military-religious-role historical-castle-role"
    ),
    PhenomenonKind.NAMING: "renamed same-person-alias person-name-identity",
    PhenomenonKind.WORKS: (
        "castle-construction construction-year rebuilt road-improvement "
        "land-development-period archaeological-building-observation "
        "reclamation-stage land-improvement-project-period "
        "river-mouth-work-commencement river-mouth-work-completion "
        "reclamation-district-completion drying-plan-cancellation "
        "land-improvement-commencement levee-construction-commencement "
        "reclamation-development-success river-diversion reclamation-commencement"
    ),
    PhenomenonKind.DOCUMENT: (
        "administrative-document grant-order new-field-development-order "
        "reclamation-permission document-reports-receipt-and-attendance"
    ),
    PhenomenonKind.NATURE: (
        "windblown-sand-deposition channel-siltation flood-induced-channel-change"
    ),
}
CLAIM_KIND_OF = {
    word: kind for kind, words in CLAIM_KIND.items() for word in words.split()
}
CLAIM_EVENT_TIMES = {"dated-event", "year-window", "dated-components"}
# 時点の出来事を表す述語。時刻の精度（日・月・季節・時期の呼び名）にかかわらず
# 出来事（event）にする。期間で書かれた降伏は「冬のあいだ降伏が続いた」のではなく
# 「冬のいつかに降った」なので、精度は jd_exact・bounds_asserted に残し、あり方は
# 述語で決める。工事や攻城の段階のように、出典ごとに過程か完成の時点かが変わる述語は
# ここに入れず、時刻の形式で決める。時刻が無くても、死去や誕生そのものは出来事なので、
# 時点の出来事の述語は時刻の有無にかかわらず出来事にし、
# 分からなさは validYears の窓に任せる。
CLAIM_POINT_PREDICATES = frozenset(
    [
        "castle-fall",
        "castle-surrender",
        "castle-handover",
        "castle-assignment",
        "military-event",
        "campaign-action",
        "departure",
        "headquarters-move",
        "residence-transfer",
        "territorial-transfer",
        "grant-order",
        "administrative-document",
        "alliance-formation",
        "submission",
        "submission-accepted",
        "diplomatic-audience",
        "death-date",
        "death-year",
        "birth-year",
        "renamed",
        "family-head-succession",
        "levee-construction-commencement",
        "reclamation-commencement",
        "reclamation-permission",
        "reclamation-development-success",
        "river-mouth-work-commencement",
        "river-mouth-work-completion",
        "reclamation-district-completion",
        "land-improvement-commencement",
        "drying-plan-cancellation",
    ]
)


def claim_mode(predicate: str, time: dict | None) -> str:
    """命題のあり方。時刻の形式だけでなく、述語が時点の出来事かどうかで決める。"""
    kind = (time or {}).get("kind")
    if kind in CLAIM_EVENT_TIMES:
        return Mode.EVENT
    if predicate in CLAIM_POINT_PREDICATES:
        return Mode.EVENT
    return Mode.STATE


@dataclass
class When:
    """A time extent: the source's own date and its span of day numbers."""

    precision: str = Precision.UNDATED
    calendar: str = ""
    year: int | None = None
    month: int | None = None
    day: int | None = None
    leap: bool = False
    jd_start: int | None = None
    jd_end: int | None = None
    exact: bool = False
    label: str = ""
    asserted: bool = True


@dataclass
class Summary:
    """What one import did."""

    records: dict[str, int] = field(default_factory=dict)
    new_versions: int = 0
    borrowed_points: int = 0
    merged_things: int = 0
    represented_points: int = 0
    timed_representations: int = 0
    conflict_links: int = 0
    retired: int = 0
    things: dict[str, int] = field(default_factory=dict)
    phenomena: dict[str, int] = field(default_factory=dict)
    unclassified: dict[str, int] = field(default_factory=dict)

    def as_json(self) -> Json:
        return {
            "records": self.records,
            "new_versions": self.new_versions,
            "retired": self.retired,
            "things": self.things,
            "borrowed_points": self.borrowed_points,
            "merged_things": self.merged_things,
            "represented_points": self.represented_points,
            "timed_representations": self.timed_representations,
            "conflict_links": self.conflict_links,
            "phenomena": self.phenomena,
            "unclassified": self.unclassified,
        }


def read_jsonl(path: Path) -> list[Json]:
    with path.open(encoding="utf-8") as stream:
        return [json.loads(line) for line in stream if line.strip()]


def content_hash(payload: Json) -> str:
    text = json.dumps(
        payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    )
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def git_commit(root: Path) -> str:
    try:
        result = subprocess.run(  # noqa: S603
            ["git", "-C", str(root), "rev-parse", "HEAD"],  # noqa: S607
            capture_output=True,
            text=True,
            check=False,
        )
    except OSError:
        return ""
    return result.stdout.strip() if result.returncode == 0 else ""


def refuse_conflict(row_id: str, why: str) -> NoReturn:
    message = f"conflicts: {row_id} {why}"
    raise ValueError(message)


def conflict_rows(data: Json) -> dict[str, Json]:
    """The records by id, each naming its kind, with no id or title twice."""
    if data.get("schemaVersion") != 1:
        refuse_conflict("file", "has an unknown schemaVersion")
    rows: dict[str, Json] = {}
    titles: set[str] = set()
    for row in data["conflicts"]:
        row_id, kind = row["id"], row.get("kind")
        if kind not in {"campaign", "battle"} or not row_id.startswith(kind + ":"):
            refuse_conflict(row_id, "does not name its kind")
        if row_id in rows or not row.get("title") or row["title"] in titles:
            refuse_conflict(row_id, "repeats an id or a title")
        if not row.get("sources"):
            refuse_conflict(row_id, "has no source")
        rows[row_id] = row
        titles.add(row["title"])
    return rows


def check_conflicts(data: Json) -> None:
    """Refuse a campaign and battle record that does not hold together.

    The same conditions as ``tools/research/export-conflicts.cjs``: every id
    names its kind, ids and titles are unique, a campaign lists its battles and
    each of them names that campaign back, and only a battle has a parent.
    """
    rows = conflict_rows(data)
    for row_id, row in rows.items():
        if row["kind"] == "campaign":
            children = row.get("children") or []
            if row.get("parent") or not children or len(set(children)) != len(children):
                refuse_conflict(row_id, "must list its battles once and have no parent")
            for child_id in children:
                child = rows.get(child_id) or {}
                if child.get("kind") != "battle" or child.get("parent") != row_id:
                    refuse_conflict(
                        row_id, f"lists {child_id}, which does not name it back"
                    )
        elif row.get("parent"):
            parent = rows.get(row["parent"]) or {}
            if parent.get("kind") != "campaign":
                refuse_conflict(row_id, "names a parent that is not a campaign")
            if row_id not in (parent.get("children") or []):
                refuse_conflict(row_id, "is not listed by its campaign")


class Importer:
    def __init__(self, root: Path) -> None:
        self.root = root
        self.table = root / MONTH_TABLE
        self.summary = Summary()
        self.run: ImportRun
        self.seen: set[str] = set()
        self.known: dict[str, Record] = {}
        self.sources: dict[str, Source] = {}
        self.by_name: dict[tuple[str, str], list[Thing]] = {}
        # From identity records: an identifier and the one it is the same as,
        # a registry place and the game site that stands for it, and the
        # records to attach to the things they name.
        self.same: dict[str, str] = {}
        self.represented: dict[str, str] = {}
        # Representations for a period: (place, site, period, record, file name).
        self.timed: list[tuple[str, str, Json, Record, str]] = []
        # Water bodies the catalog of this import names; a claim may only link these.
        self.catalog_water: set[str] = set()
        self.identity_records: dict[str, list[Record]] = {}
        # The identifiers the inputs themselves use, before any identity is applied.
        self.used: set[str] = set()
        # Every identifier an input has used, and the thing it turned out to be.
        # The identifiers an input gives a name to. Any other identifier is
        # itself the name, as in ``site:岩石城``.
        self.titled: set[str] = set()
        self.keyed: dict[str, Thing] = {}
        self.phenomena: dict[str, Phenomenon] = {}
        self.by_title: dict[str, list[Phenomenon]] = {}
        self.timeline: dict[tuple[str, str, str], list[Phenomenon]] = {}

    # ---- records (what the inputs say, and what they said before) ----

    def record(self, key: str, record_type: str, status: str, payload: Json) -> Record:
        digest = content_hash(payload)
        checked = payload.get("checked") or payload.get("recordedAt")
        values = {
            "record_type": record_type,
            "status": status,
            "source": self.sources.get(str(payload.get("source") or "")),
            "locator": str(payload.get("locator") or ""),
            "uncertainty": str(payload.get("uncertainty") or ""),
            "checked": date.fromisoformat(checked) if checked else None,
            "payload": payload,
            "content_hash": digest,
            "last_run": self.run,
            "retired_run": None,
        }
        record = self.known.get(key)
        if record is None:
            record = Record.objects.create(key=key, first_run=self.run, **values)
            self.known[key] = record
            changed = True
        else:
            changed = record.content_hash != digest or record.retired_run_id is not None
            if changed:
                for name, value in values.items():
                    setattr(record, name, value)
                record.save()
        if changed:
            RecordVersion.objects.create(
                record=record, run=self.run, content_hash=digest, payload=payload
            )
            self.summary.new_versions += 1
        self.seen.add(key)
        self.summary.records[record_type] = self.summary.records.get(record_type, 0) + 1
        return record

    def retire_missing(self) -> None:
        """Mark the records the inputs no longer hold, keeping what they said."""
        gone = [
            record
            for key, record in self.known.items()
            if key not in self.seen and record.retired_run_id is None
        ]
        for record in gone:
            record.retired_run = self.run
            record.save(update_fields=["retired_run"])
            RecordVersion.objects.create(record=record, run=self.run)
        self.summary.retired = len(gone)
        Record.objects.filter(retired_run__isnull=True).update(last_run=self.run)

    # ---- things (what persists) ----

    def find(self, identifier: str) -> Thing | None:
        """The thing an identifier already stands for, by any route.

        Either an input settled the identifier itself, or an identity record
        merges it into an identifier that is settled.
        """
        kept = self.same.get(identifier, identifier)
        return self.keyed.get(identifier) or self.keyed.get(kept)

    def thing(  # noqa: PLR0913
        self,
        key: str,
        kind: str,
        name: str,
        record: Record,
        *,
        registered: bool = False,
        names: tuple[str, ...] = (),
    ) -> Thing:
        given, key = key, self.same.get(key, key)
        self.titled.add(given)
        thing = self.find(given)
        if thing is None:
            thing = Thing.objects.create(
                key=key, kind=kind, name=name, registered=registered
            )
            self.summary.things[kind] = self.summary.things.get(kind, 0) + 1
        elif registered and not thing.registered:
            thing.registered = True
            thing.name = name
            thing.save(update_fields=["registered", "name"])
        thing.records.add(record)
        self.known_as(thing, given)
        self.label(thing, name, *names)
        return thing

    def label(self, thing: Thing, *names: str) -> None:
        """Let a thing be found by each of these names."""
        for name in dict.fromkeys(names):
            _, created = ThingName.objects.get_or_create(thing=thing, name=name)
            if created:
                self.by_name.setdefault((thing.kind, name), []).append(thing)

    def known_as(self, thing: Thing, identifier: str) -> None:
        """Note that an input names a thing by an identifier."""
        self.used.add(identifier)
        kept = self.same.get(identifier, identifier)
        for key in dict.fromkeys((thing.key, identifier, kept)):
            if self.keyed.setdefault(key, thing) != thing:
                message = f"{key} names two things: {self.keyed[key].key}, {thing.key}"
                raise ValueError(message)
            _, added = ThingKey.objects.get_or_create(
                key=key, defaults={"thing": thing}
            )
            if added and key in self.same:
                self.summary.merged_things += 1
        for identity in self.identity_records.get(identifier, []):
            thing.records.add(identity)

    def resolve(self, identifier: str, record: Record) -> Thing | None:
        """The thing an identifier such as ``person:羽柴秀吉`` stands for."""
        # An identifier that an identity record merges is read as the one kept,
        # so both end at the same thing whichever an input uses first.
        kept = self.same.get(identifier, identifier)
        kind = THING_PREFIX.get(kept.partition(":")[0])
        if kind is None or identifier.partition(":")[0] not in THING_PREFIX:
            return None
        known = self.find(identifier)
        if known is None:
            # A record may name a registered thing by one of its names.
            same = self.by_name.get((kind, kept.partition(":")[2]), [])
            if len(same) == 1:
                known = same[0]
        if known is None:
            return self.thing(identifier, kind, identifier.partition(":")[2], record)
        # However it was found, the thing is now known by this identifier too,
        # and by the name the identifier carries when no input names it.
        self.known_as(known, identifier)
        if identifier not in self.titled:
            self.label(known, identifier.partition(":")[2])
        known.records.add(record)
        return known

    def place(self, thing: Thing, point: list[float] | None, basis: str) -> None:
        if point and not Place.objects.filter(thing=thing).exists():
            Place.objects.create(
                thing=thing, longitude=point[0], latitude=point[1], basis=basis
            )

    # ---- phenomena (what happens or holds) ----

    def phenomenon(  # noqa: PLR0913
        self,
        key: str,
        record: Record,
        *,
        mode: str,
        kind: str,
        subtype: str,
        title: str,
        when: When,
        status: str,
        summary: str = "",
        place: Thing | None = None,
        parent: Phenomenon | None = None,
    ) -> Phenomenon:
        if kind == PhenomenonKind.OTHER:
            self.summary.unclassified[subtype] = (
                self.summary.unclassified.get(subtype, 0) + 1
            )
        item = Phenomenon.objects.create(
            key=key,
            mode=mode,
            kind=kind,
            subtype=subtype,
            title=title,
            summary=summary,
            status=status,
            place=place,
            parent=parent,
            calendar=when.calendar,
            precision=when.precision,
            year=when.year,
            month=when.month,
            day=when.day,
            leap_month=when.leap,
            jd_start=when.jd_start,
            jd_end=when.jd_end,
            jd_exact=when.exact,
            time_label=when.label,
            bounds_asserted=when.asserted,
        )
        item.records.add(record)
        self.phenomena[key] = item
        if title:
            self.by_title.setdefault(title, []).append(item)
        label = f"{mode}/{kind}"
        self.summary.phenomena[label] = self.summary.phenomena.get(label, 0) + 1
        return item

    def take_part(self, item: Phenomenon, thing: Thing | None, role: str) -> None:
        if thing is not None:
            Participation.objects.get_or_create(
                phenomenon=item, thing=thing, defaults={"role": role}
            )

    # ---- time ----

    def western_day(self, value: list[int]) -> When:
        year, month, day = value
        number = dates.western_to_jd(year, month, day)
        return When(
            precision=Precision.DAY,
            calendar=Calendar.WESTERN,
            year=year,
            month=month,
            day=day,
            jd_start=number,
            jd_end=number,
            exact=True,
        )

    def years(self, first: int, last: int) -> When:
        start, end = dates.year_bounds(first, last)
        return When(
            precision=Precision.YEAR if first == last else Precision.PERIOD,
            calendar=Calendar.CE_YEAR,
            year=first,
            jd_start=start,
            jd_end=end,
        )

    def lunisolar_day(self, value: list[int], *, leap: bool) -> When:
        year, month, day = value
        number = dates.lunisolar_to_jd(self.table, year, month, day, leap=leap)
        # Outside the month table the date is kept and bounded by its year.
        start, end = (number, number) if number else dates.year_bounds(year)
        return When(
            precision=Precision.DAY,
            calendar=Calendar.LUNISOLAR,
            year=year,
            month=month,
            day=day,
            leap=leap,
            jd_start=start,
            jd_end=end,
            exact=number is not None,
        )

    def event_time(self, time: Json | None, valid: list[int]) -> When:
        kind = (time or {}).get("kind")
        if time and kind == "dated-event":
            return self.lunisolar_day(time["date"], leap=bool(time.get("leapMonth")))
        if time and kind == "year-window":
            return self.years(time["year"], time["year"])
        if time and kind == "year-interval":
            return self.years(time["from"], time["untilExclusive"] - 1)
        if time and kind == "described-period":
            # The source names a period; the years only help to find it.
            start, end = dates.year_bounds(*time["indexYears"])
            return When(
                precision=Precision.PERIOD,
                calendar=time["calendar"],
                jd_start=start,
                jd_end=end,
                label=time["label"],
                asserted=bool(time.get("boundsAreHistoricalStartEnd")),
            )
        return self.years(valid[0], valid[1])

    def open_years(self, first: int | None, last: int | None) -> When:
        """A span of years whose start or end may be unknown."""
        return When(
            precision=Precision.PERIOD,
            calendar=Calendar.CE_YEAR,
            year=first,
            jd_start=dates.western_to_jd(first, 1, 1) if first else None,
            jd_end=dates.western_to_jd(last, 12, 31) if last else None,
        )

    # ---- the inputs ----

    def load_sources(self) -> None:
        for row in read_jsonl(self.root / RESEARCH / "sources.jsonl"):
            self.sources[row["id"]], _ = Source.objects.update_or_create(
                key=row["id"],
                defaults={
                    "title": row.get("title") or "",
                    "author": row.get("author") or "",
                    "url": row.get("url") or "",
                    "payload": row,
                },
            )

    def read_identity(self, path: Path) -> Json:
        """One identity record, refused unless it is complete and makes sense."""
        row = json.loads(path.read_text(encoding="utf-8"))
        lacking = [name for name in IDENTITY_FIELDS if not row.get(name)]
        things = row.get("things") or []
        if lacking or len(set(things)) != PAIR:
            message = f"{path.name}: an identity needs {', '.join(IDENTITY_FIELDS)}"
            raise ValueError(message)
        if row["relation"] not in (SAME, REPRESENTED):
            message = f"{path.name}: unknown relation of an identity"
            raise ValueError(message)
        if row["source"] not in self.sources:
            message = f"{path.name}: unknown source {row['source']}"
            raise ValueError(message)
        kinds = {THING_PREFIX.get(key.partition(":")[0]) for key in things}
        if len(kinds) != 1 or None in kinds:
            message = f"{path.name}: an identity joins two things of one kind"
            raise ValueError(message)
        if row["relation"] == REPRESENTED and kinds != {ThingKind.SITE}:
            message = f"{path.name}: only a site stands for a place (identity)"
            raise ValueError(message)
        if "period" in row:
            self.read_period(path.name, row)
        return row

    def read_period(self, name: str, row: Json) -> None:
        """A period is allowed on a representation only, and must make sense.

        Two names for one thing are one thing at every time, so ``same-site``
        never takes a period.
        """
        period = row["period"]
        if row["relation"] != REPRESENTED:
            message = f"{name}: only a representation has a period (identity)"
            raise ValueError(message)
        if not isinstance(period, dict) or set(period) - {"from", "until", "basis"}:
            message = f"{name}: a period has from, until and basis only"
            raise ValueError(message)
        basis = period.get("basis")
        has_basis = isinstance(basis, str) and basis.strip() != ""
        if not has_basis or not (period.get("from") or period.get("until")):
            message = f"{name}: a period needs a basis and at least one end"
            raise ValueError(message)
        start_early, _ = self.period_end(name, period.get("from"))
        _, end_late = self.period_end(name, period.get("until"))
        if start_early is not None and end_late is not None and start_early >= end_late:
            message = f"{name}: a period ends before it starts"
            raise ValueError(message)

    def period_end(self, name: str, end: Json | None) -> tuple[int | None, int | None]:
        """The span of day numbers where an end of a period may lie.

        A day given in the lunisolar calendar is one day. A year is the whole
        year, from its first day to the first day of the next, so a year is
        never read as a day that the input does not give.
        """
        if end is None:
            return None, None
        message = f"{name}: an end of a period is a lunisolar day or a year"
        # Anything but a mapping falls through to the refusal below.
        end = end if isinstance(end, dict) else {}
        precision, calendar = end.get("precision"), end.get("calendar")
        if precision == Precision.DAY and calendar == Calendar.LUNISOLAR:
            date, leap = end.get("date"), end.get("leapMonth", False)
            fields = {"date", "calendar", "leapMonth", "precision"}
            if (
                set(end) <= fields
                and isinstance(date, list)
                and len(date) == DAY_PARTS
                and all(is_number(part) for part in date)
                and isinstance(leap, bool)
            ):
                year, month, day = date
                length = dates.lunisolar_month_length(
                    self.table, year, month, leap=leap
                )
                # A day the month does not have is refused, not carried on into
                # a later month.
                if length is not None and 1 <= day <= length:
                    number = dates.lunisolar_to_jd(
                        self.table, year, month, day, leap=leap
                    )
                    if number is not None:
                        return number, number
        elif precision == Precision.YEAR and calendar == Calendar.CE_YEAR:
            year = end.get("year")
            if (
                set(end) <= {"year", "calendar", "precision"}
                and is_number(year)
                and isinstance(year, int)
            ):
                return dates.western_to_jd(year, 1, 1), dates.western_to_jd(
                    year + 1, 1, 1
                )
        raise ValueError(message)

    def period_span(self, name: str, period: Json | None) -> tuple[int | None, ...]:
        if period is None:
            return None, None, None, None
        start = self.period_end(name, period.get("from"))
        end = self.period_end(name, period.get("until"))
        return (*start, *end)

    def load_identities(self) -> None:
        """Read which identifiers name one thing, before any thing is made."""
        folder = self.root / IDENTITIES
        merged_into: dict[str, str] = {}
        for path in sorted(folder.glob("*.json")) if folder.is_dir() else []:
            row = self.read_identity(path)
            record = self.record(row["id"], RecordType.IDENTITY, Status.VERIFIED, row)
            kept, other = row["things"]
            if row["relation"] == SAME:
                # An identifier is merged into one thing only.
                if merged_into.setdefault(other, kept) != kept:
                    message = f"{path.name}: {other} is merged by another identity too"
                    raise ValueError(message)
            elif row.get("period"):
                self.timed.append((kept, other, row["period"], record, path.name))
            elif self.represented.setdefault(kept, other) != other:
                # A place has one site that stands for it.
                message = f"{path.name}: {kept} is represented by another site too"
                raise ValueError(message)
            for key in row["things"]:
                self.identity_records.setdefault(key, []).append(record)
        # An identifier that is merged away plays no other part: it is not kept
        # by another identity, and neither stands for a place nor is one.
        others = {*merged_into.values(), *self.represented, *self.represented.values()}
        others |= {key for kept, other, *_ in self.timed for key in (kept, other)}
        tangled = sorted(set(merged_into) & others)
        if tangled:
            message = f"identity: {', '.join(tangled)} is merged and used again"
            raise ValueError(message)
        self.same = merged_into

    def check_periods(self) -> None:
        """Refuse two representations that surely hold on one day.

        One place has one representative and one site stands for one place at
        any day. Only the part of each period that surely holds counts: two
        periods that meet in a year given only as a year are both possible
        there, and a query reads that year as not settled.
        """
        spans = [
            (place, site, self.period_span(name, period), name)
            for place, site, period, _, name in self.timed
        ]
        spans += [
            (place, site, (None,) * 4, "") for place, site in self.represented.items()
        ]
        # Compare the things the identifiers end at, so that two names for one
        # thing (an identifier settled by name, a merged one) cannot hide a clash.
        resolved = [
            (self.find(place), self.find(site), span, name, place, site)
            for place, site, span, name in spans
        ]
        for number, (place, site, span, name, place_key, site_key) in enumerate(
            resolved
        ):
            for other in resolved[number + 1 :]:
                same_place = place is not None and place == other[0]
                same_site = site is not None and site == other[1]
                if (same_place or same_site) and surely_overlap(span, other[2]):
                    which = name or other[3] or "identity"
                    message = (
                        f"{which}: {site_key} and {other[5]} for {place_key} and "
                        f"{other[4]} surely overlap in time"
                    )
                    raise ValueError(message)

    def load_registry(self) -> None:
        for row in read_jsonl(self.root / RESEARCH / "people.jsonl"):
            record = self.record(
                "registry:" + row["id"], RecordType.PERSON, Status.REGISTERED, row
            )
            names = (*row.get("gameNames", []), *row.get("aliases", []))
            thing = self.thing(
                row["id"],
                ThingKind.PERSON,
                row["name"],
                record,
                registered=True,
                names=tuple(names),
            )
            for identifier in row.get("authorityIds", []):
                scheme, _, value = identifier.partition(":")
                Authority.objects.get_or_create(
                    scheme=scheme, identifier=value, defaults={"thing": thing}
                )
        for row in read_jsonl(self.root / RESEARCH / "places.jsonl"):
            record = self.record(
                "registry:" + row["id"], RecordType.PLACE, Status.REGISTERED, row
            )
            thing = self.thing(
                row["id"],
                ThingKind.SITE,
                row["name"],
                record,
                registered=True,
                names=tuple(row.get("aliases", [])),
            )
            geometry = row.get("geometry")
            if geometry and geometry.get("type") == "Point":
                self.place(thing, geometry["coordinates"], row["geometryStatus"])

    def load_sites(self) -> None:
        for row in read_jsonl(self.root / RESEARCH / "implemented-sites.jsonl"):
            record = self.record(
                "implemented-site:" + row["id"],
                RecordType.IMPLEMENTED_SITE,
                Status.IMPLEMENTATION,
                row,
            )
            thing = self.thing(row["id"], ThingKind.SITE, row["name"], record)
            self.place(thing, row.get("point"), "game-position")
            periods = row.get("activityPeriods") or [row]
            for number, period in enumerate(periods):
                first, last = period.get("fromYear"), period.get("toYear")
                if not (first or last):
                    continue
                item = self.phenomenon(
                    f"site-period:{row['id']}" + (f"#{number}" if number else ""),
                    record,
                    mode=Mode.STATE,
                    kind=PhenomenonKind.EXISTENCE,
                    subtype="active-period",
                    title=row["name"],
                    when=self.open_years(first, last),
                    status=Status.IMPLEMENTATION,
                    place=thing,
                )
                self.take_part(item, thing, Role.SUBJECT)

    def load_timeline(self) -> None:
        for row in read_jsonl(self.root / RESEARCH / "implemented-events.jsonl"):
            record = self.record(
                "timeline:" + row["id"],
                RecordType.IMPLEMENTED_EVENT,
                Status.IMPLEMENTATION,
                row,
            )
            sites = [self.resolve("node:" + key, record) for key in row["castles"]]
            item = self.phenomenon(
                row["id"],
                record,
                mode=Mode.EVENT,
                kind=TIMELINE_KIND.get(row["kind"], PhenomenonKind.OTHER),
                subtype=row["kind"],
                title=row.get("title") or "",
                when=self.western_day(row["date"]),
                status=Status.IMPLEMENTATION,
                # With several castles the event has no single place.
                place=sites[0] if len(sites) == 1 else None,
            )
            if row.get("clan"):
                clan = self.resolve("clan:" + row["clan"], record)
                self.take_part(item, clan, Role.SUBJECT)
            for site in sites:
                self.take_part(item, site, Role.PARTICIPANT)
            signature = (
                ",".join(map(str, row["date"])),
                row["kind"],
                row.get("title") or "",
            )
            self.timeline.setdefault(signature, []).append(item)

    def catalog_water_thing(self, subject: str, record: Record) -> Thing:
        key = "water:" + subject
        self.catalog_water.add(key)
        return self.thing(key, ThingKind.WATER, subject, record)

    def linked_water(self, key: str, record: Record) -> Thing:
        """A water body a claim links, which this import's catalog must name.

        A water left in an old database or made first by another input does
        not count, and no name is matched: a misspelt key is refused rather
        than becoming a new water body.
        """
        thing = self.find(key) if key in self.catalog_water else None
        if thing is None or thing.kind != ThingKind.WATER:
            message = f"claim links a water the catalog does not name: {key}"
            raise ValueError(message)
        # Like any thing a claim names, the water keeps the claim as a record.
        thing.records.add(record)
        return thing

    def load_catalog(self) -> None:
        things = {
            "person": lambda subject, record: self.resolve("person:" + subject, record),
            "road": lambda subject, record: self.thing(
                "road:" + subject, ThingKind.ROUTE, subject, record
            ),
            "link": lambda subject, record: self.thing(
                "link:" + subject, ThingKind.ROUTE, subject, record
            ),
            "water": self.catalog_water_thing,
        }
        for row in read_jsonl(self.root / CATALOG):
            kind, subject, context = row["kind"], row["subject"], row["context"]
            if kind == "request":
                # A work request about the project, not a piece of history.
                continue
            record = self.record(
                "catalog:" + row["id"], RecordType.CATALOG, Status.IMPLEMENTATION, row
            )
            if kind in things:
                things[kind](subject, record)
            elif kind == "site":
                self.catalog_site(subject, context.get("siteId") or "", record)
            elif kind == "battle":
                self.attach_battle(subject, record)
            elif kind == "transfer":
                self.attach_transfer(context, record)

    def catalog_site(self, subject: str, key: str, record: Record) -> None:
        """A site in the work catalog is the game's site of that identifier."""
        # The identifier may have been merged into another thing by an identity.
        found = self.keyed.get("node:" + key) or self.keyed.get(key)
        if found is None:
            self.resolve("site:" + subject, record)
        else:
            found.records.add(record)

    def attach_battle(self, subject: str, record: Record) -> None:
        """A battle is the timeline event of the same title, seen as a conflict."""
        same = self.by_title.get(subject, [])
        if len(same) == 1:
            item = same[0]
            item.records.add(record)
            if item.kind != PhenomenonKind.CONFLICT:
                self.recount(item, PhenomenonKind.CONFLICT)
            return
        self.phenomenon(
            "battle:" + subject,
            record,
            mode=Mode.EVENT,
            kind=PhenomenonKind.CONFLICT,
            subtype="battle",
            title=subject,
            when=When(),
            status=Status.IMPLEMENTATION,
        )

    def recount(self, item: Phenomenon, kind: str) -> None:
        old = f"{item.mode}/{item.kind}"
        self.summary.phenomena[old] -= 1
        if item.kind == PhenomenonKind.OTHER:
            self.summary.unclassified[item.subtype] -= 1
        item.kind = kind
        item.save(update_fields=["kind"])
        new = f"{item.mode}/{kind}"
        self.summary.phenomena[new] = self.summary.phenomena.get(new, 0) + 1

    def attach_transfer(self, context: Json, record: Record) -> None:
        """A transfer in the work catalog is a timeline event, listed again."""
        signature = (
            ",".join(map(str, context["date"])),
            context["kind"],
            context.get("title") or "",
        )
        for item in self.timeline.get(signature, []):
            item.records.add(record)

    def load_claims(self) -> None:
        for row in read_jsonl(self.root / RESEARCH / "claims.jsonl"):
            record = self.record(
                "claim:" + row["id"], RecordType.CLAIM, Status.VERIFIED, row
            )
            time = row.get("eventTime")
            value = row["value"]
            text = (
                value
                if isinstance(value, str)
                else json.dumps(value, ensure_ascii=False)
            )
            subject = self.resolve(row["entity"], record)
            linked = {
                key: (
                    self.linked_water(key, record)
                    if key.startswith("water:")
                    else self.resolve(key, record)
                )
                for key in row.get("linkedEntities", [])
            }
            parts = (time or {}).get("components") or []
            in_parts = {key for part in parts for key in part["entities"]}
            kind = CLAIM_KIND_OF.get(row["predicate"], PhenomenonKind.OTHER)
            item = self.phenomenon(
                "claim:" + row["id"],
                record,
                mode=claim_mode(row["predicate"], time),
                kind=kind,
                subtype=row["predicate"],
                title=text
                if len(text) <= TITLE_LENGTH
                else text[: TITLE_LENGTH - 1] + "…",
                summary=text,
                when=self.event_time(time, row["validYears"]),
                status=Status.VERIFIED,
                place=self.claim_place(subject, linked),
                parent=self.larger(row["entity"], record),
            )
            self.take_part(item, subject, Role.SUBJECT)
            for key, thing in linked.items():
                # A thing dated by a component belongs to that component only.
                if key not in in_parts:
                    self.take_part(item, thing, Role.PARTICIPANT)
            for number, part in enumerate(parts):
                piece = self.phenomenon(
                    f"claim:{row['id']}#{number}",
                    record,
                    mode=Mode.EVENT,
                    kind=kind,
                    subtype=row["predicate"],
                    title=item.title,
                    when=self.years(part["year"], part["year"]),
                    status=Status.VERIFIED,
                    parent=item,
                )
                for key in part["entities"]:
                    self.take_part(piece, linked.get(key), Role.PARTICIPANT)

    def claim_place(
        self, subject: Thing | None, linked: dict[str, Thing | None]
    ) -> Thing | None:
        """Where a claim places its phenomenon, when it says so without doubt.

        A registered place among the linked things is the place the source
        names. The subject may be a game site that stands for a different spot,
        so it counts only when the claim links no place at all.
        """
        named = [thing for key, thing in linked.items() if key.startswith("place:")]
        if len(named) == 1:
            return named[0]
        if not named and subject is not None and subject.kind == ThingKind.SITE:
            return subject
        return None

    def larger(self, identifier: str, record: Record) -> Phenomenon | None:
        """The battle or campaign a claim is about, when it names one."""
        prefix, _, name = identifier.partition(":")
        if prefix not in PHENOMENON_PREFIX:
            return None
        known = self.phenomena.get(identifier)
        if known is None:
            # A campaign is never found by the name of a battle, nor the other
            # way round: only things of the same kind share a name.
            same = [
                item
                for item in self.by_title.get(name, [])
                if (item.subtype == "campaign") == (prefix == "campaign")
            ]
            if len(same) == 1:
                known = same[0]
        if known is None:
            return self.phenomenon(
                identifier,
                record,
                mode=Mode.EVENT,
                kind=PhenomenonKind.CONFLICT,
                subtype=prefix,
                title=name,
                when=When(),
                status=Status.VERIFIED,
            )
        known.records.add(record)
        return known

    def load_conflicts(self) -> None:
        """Campaigns and the battles they are made of, from their own record.

        Identifiers are matched whole: a campaign and a battle of the same name
        are different things, and nothing is merged by its name alone. Only a
        battle whose record states the title of an existing timeline event
        (``existingSceneTitle``) is that event; every other entry becomes a
        conflict of its own. Each battle then points at its campaign as its
        parent, and claims that name the same identifier reach the same
        phenomenon. Dates, units and people in a battle's scene are not read:
        they are not claims checked against a source.
        """
        path = self.root / CONFLICTS
        if not path.exists():
            return
        data = json.loads(path.read_text(encoding="utf-8"))
        check_conflicts(data)
        rows = data["conflicts"]
        events = {item.pk for items in self.timeline.values() for item in items}
        for row in rows:
            record = self.record(
                "conflict:" + row["id"], RecordType.CONFLICT, Status.REGISTERED, row
            )
            known = self.phenomena.get(row["id"])
            scene = row.get("existingSceneTitle")
            if scene:
                # The named scene must be one timeline event, whatever else
                # already goes by this identifier or this title.
                same = [
                    item for item in self.by_title.get(scene, []) if item.pk in events
                ]
                if len(same) != 1 or (known is not None and known != same[0]):
                    message = f"{row['id']}: no single timeline event is {scene}"
                    raise ValueError(message)
                known = same[0]
            if known is None:
                known = self.phenomenon(
                    row["id"],
                    record,
                    mode=Mode.EVENT,
                    kind=PhenomenonKind.CONFLICT,
                    subtype=row["kind"],
                    title=row["title"],
                    summary=row.get("summary") or "",
                    when=When(label=row.get("dateLabel") or ""),
                    status=Status.REGISTERED,
                )
            else:
                known.records.add(record)
                if known.kind != PhenomenonKind.CONFLICT:
                    self.recount(known, PhenomenonKind.CONFLICT)
            self.phenomena[row["id"]] = known
        for row in rows:
            parent = row.get("parent")
            if not parent:
                continue
            child = self.phenomena[row["id"]]
            child.parent = self.phenomena[parent]
            child.save(update_fields=["parent"])
            self.summary.conflict_links += 1

    def load_locations(self) -> None:
        for row in read_jsonl(self.root / RESEARCH / "location-observations.jsonl"):
            record = self.record(row["id"], RecordType.LOCATION, Status.VERIFIED, row)
            person = self.resolve(row["person"], record)
            place = self.resolve(row["place"], record)
            relation = row["relation"]
            item = self.phenomenon(
                row["id"],
                record,
                mode=Mode.EVENT if relation in LOCATION_EVENTS else Mode.STATE,
                kind=LOCATION_KIND.get(relation, PhenomenonKind.OTHER),
                subtype=relation,
                title=f"{person.name if person else ''}・{place.name if place else ''}",
                when=self.event_time(row["time"], []),
                status=Status.VERIFIED,
                place=place,
            )
            self.take_part(item, person, Role.SUBJECT)
            self.take_part(item, place, Role.PARTICIPANT)

    def borrow_points(self) -> None:
        """Give a site without a point the point of its one namesake.

        A registered place often has no surveyed point while the game places a
        site of the same name. The borrowed point is marked as such: it locates
        the place for searches, it does not assert the two are the same site.
        """
        located = {
            thing_id: (longitude, latitude)
            for thing_id, longitude, latitude in Place.objects.values_list(
                "thing_id", "longitude", "latitude"
            )
        }
        for (kind, _), same in self.by_name.items():
            if kind != ThingKind.SITE:
                continue
            points = {located[t.pk] for t in same if t.pk in located}
            if len(points) != 1:
                continue
            point = next(iter(points))
            for thing in same:
                if thing.pk not in located:
                    Place.objects.create(
                        thing=thing,
                        longitude=point[0],
                        latitude=point[1],
                        basis="borrowed-from-namesake",
                    )
                    located[thing.pk] = point
                    self.summary.borrowed_points += 1

    def represent_points(self) -> None:
        """Give a registry place the point of the game site that stands for it.

        Only a place without a point of its own takes one; a sourced point is
        never replaced. The basis keeps the two apart. This runs before points
        are borrowed by name, so what a record states wins over a guess.
        """
        located = {
            thing_id: (longitude, latitude)
            for thing_id, longitude, latitude in Place.objects.values_list(
                "thing_id", "longitude", "latitude"
            )
        }
        for place_key, site_key in self.represented.items():
            place, site = self.keyed[place_key], self.keyed[site_key]
            if place.pk not in located and site.pk in located:
                point = located[site.pk]
                Place.objects.create(
                    thing=place,
                    longitude=point[0],
                    latitude=point[1],
                    basis="represented-by-game-site",
                )
                located[place.pk] = point
                self.summary.represented_points += 1
        self.record_representations()

    def record_representations(self) -> None:
        """Keep every representation, for all time or for its period.

        Only one for all time lends its point: a point has no time of its own.
        """
        self.check_periods()
        for place_key, site_key in self.represented.items():
            records = self.identity_records.get(place_key, [])
            record = next(
                item for item in records if item.payload["things"][1] == site_key
            )
            Representation.objects.create(
                place=self.keyed[place_key], site=self.keyed[site_key], record=record
            )
        for place_key, site_key, period, record, name in self.timed:
            span = self.period_span(name, period)
            start_early, start_late, end_early, end_late = span
            Representation.objects.create(
                place=self.keyed[place_key],
                site=self.keyed[site_key],
                record=record,
                start_early=start_early,
                start_late=start_late,
                end_early=end_early,
                end_late=end_late,
                label=json.dumps(
                    {key: period.get(key) for key in ("from", "until")},
                    ensure_ascii=False,
                ),
                basis=period["basis"],
            )
        self.summary.timed_representations = len(self.timed)

    def check_identities(self) -> None:
        """Refuse an identity that names an identifier no input uses.

        Both sides count: a misspelt identifier on the side that is kept would
        move a real thing under a key that stands for nothing.
        """
        named = {*self.same, *self.same.values(), *self.represented}
        named |= set(self.represented.values())
        named |= {key for kept, other, *_ in self.timed for key in (kept, other)}
        missing = sorted(named - self.used)
        if missing:
            message = f"identity names a thing no input has: {', '.join(missing)}"
            raise ValueError(message)

    # ---- the 綱文 index ----

    def kobun_time(self, row: Json) -> When:
        """The article's own date, kept in its calendar and to its precision."""
        year = row["year"]
        if row["precision"] == "day":
            when = self.lunisolar_day(
                [year, row["month"], row["day"]], leap=bool(row["leapMonth"])
            )
        else:
            start, end = dates.year_bounds(year)
            when = When(
                precision=Precision.PERIOD,
                calendar=Calendar.LUNISOLAR,
                year=year,
                month=row["month"],
                leap=bool(row["leapMonth"]),
                jd_start=start,
                jd_end=end,
                label=row["jcDate"],
                asserted=False,
            )
        if not when.exact:
            # Outside the month table the lunar year runs into the next
            # western year, so the bounds are widened and not asserted.
            when.jd_end = dates.year_bounds(year + 1)[1]
            when.asserted = False
        return when

    def load_kobun_index(self) -> None:
        folder = self.root / KOBUN_INDEX
        if not folder.exists():
            return
        for path in sorted(folder.glob("*.jsonl")):
            for row in read_jsonl(path):
                record = self.record(
                    row["id"], RecordType.KOBUN, Status.REGISTERED, row
                )
                self.phenomenon(
                    row["id"],
                    record,
                    mode=Mode.EVENT,
                    kind=PhenomenonKind.OTHER,
                    subtype=KOBUN_UNCLASSIFIED,
                    title=f"{row['jcDate']} 第{row['article']}条",
                    when=self.kobun_time(row),
                    status=Status.REGISTERED,
                )

    # ---- one import ----

    @transaction.atomic
    def import_all(self) -> Summary:
        self.run = ImportRun.objects.create(git_commit=git_commit(self.root))
        self.known = {record.key: record for record in Record.objects.all()}
        # Things and phenomena are derived from the records: build them afresh.
        Phenomenon.objects.all().delete()
        Thing.objects.all().delete()
        self.load_sources()
        self.load_identities()
        self.load_registry()
        self.load_sites()
        self.load_timeline()
        self.load_catalog()
        self.load_conflicts()
        self.load_claims()
        self.load_locations()
        self.load_kobun_index()
        self.check_identities()
        self.represent_points()
        self.borrow_points()
        self.retire_missing()
        self.run.counts = self.summary.as_json()
        self.run.save(update_fields=["counts"])
        return self.summary


DAY_PARTS = 3


def is_number(value: object) -> bool:
    """A whole number written as one, not a flag or a string."""
    return isinstance(value, int) and not isinstance(value, bool)


def surely_overlap(a: tuple[int | None, ...], b: tuple[int | None, ...]) -> bool:
    """Whether the parts of two periods that surely hold share a day.

    A period surely holds from its late start to its early end (left out); an
    empty end is open.
    """
    a_from, a_to, b_from, b_to = a[1], a[2], b[1], b[2]
    # A period whose sure part is empty (a short span known only to its year)
    # surely holds on no day, so it meets nothing.
    for start, end in ((a_from, a_to), (b_from, b_to)):
        if start is not None and end is not None and start >= end:
            return False
    return (a_from is None or b_to is None or a_from < b_to) and (
        b_from is None or a_to is None or b_from < a_to
    )


def import_history(root: Path) -> Summary:
    return Importer(root).import_all()
