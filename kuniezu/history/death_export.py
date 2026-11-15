"""The game's death years, exported from the history database.

The game lets a person die of age in the year ``TK.DEATH_Y`` gives (engine.js,
``aging``); until now that table was written by hand in hist.js. The export
writes the deaths the database holds as confirmed (``death-date`` claims whose
source was read), and the game uses them in place of the hand-written years
(death-years.js). People the database has no confirmed death for keep the
hand-written year. The timeline's own death events (``k:'death'``, ``kill``)
are not changed.

Rules:

* Only verified ``death-date`` phenomena, with the person as subject.
* The year is the western year (as the game reads dates: Julian before 15
  October 1582) of the earliest day the death can fall on. A death known only
  to a lunisolar year that runs into the next western year is therefore given
  the first of the two; the days are kept alongside (``fromJD``/``toJD``).
* A person with more than one confirmed death (variants) takes the first by
  key; the check of the inputs (claims) keeps one per person.
* A person is written under every name the database knows them by, so the
  game finds them by its own name (木下秀吉 for 豊臣秀吉). A name that two
  people share is left out, so no one dies by another's record.
"""

from __future__ import annotations

import hashlib
import json
from collections import defaultdict
from typing import TYPE_CHECKING
from typing import Any

from kuniezu.history import dates
from kuniezu.history.models import Phenomenon
from kuniezu.history.models import Role
from kuniezu.history.models import Status
from kuniezu.history.models import Thing
from kuniezu.history.models import ThingKind

if TYPE_CHECKING:
    from pathlib import Path

Json = dict[str, Any]
VERSION = 1
SUBTYPE = "death-date"


def person_names() -> dict[int, set[str]]:
    """Every name of every person, by thing id."""
    names: dict[int, set[str]] = defaultdict(set)
    for thing_id, name in Thing.objects.filter(kind=ThingKind.PERSON).values_list(
        "id", "name"
    ):
        names[thing_id].add(name)
    for thing_id, name in Thing.objects.filter(kind=ThingKind.PERSON).values_list(
        "id", "names__name"
    ):
        if name:
            names[thing_id].add(name)
    return names


def death_rows() -> list[tuple[int, Phenomenon]]:
    """(person id, death) for every confirmed death, in key order."""
    rows: list[tuple[int, Phenomenon]] = []
    deaths = (
        Phenomenon.objects.filter(subtype=SUBTYPE, status=Status.VERIFIED)
        .exclude(jd_start__isnull=True)
        .prefetch_related("participations", "records")
        .order_by("key")
    )
    for death in deaths:
        rows.extend(
            (part.thing_id, death)
            for part in death.participations.all()
            if part.role == Role.SUBJECT
        )
    return rows


def death_years() -> dict[str, Json]:
    """Death year and days by name, sorted by name."""
    names = person_names()
    owners: dict[str, set[int]] = defaultdict(set)
    for thing_id, own in names.items():
        for name in own:
            owners[name].add(thing_id)
    result: dict[str, Json] = {}
    for thing_id, death in death_rows():
        start = death.jd_start
        if start is None:  # excluded by death_rows; for the type checker
            continue
        end = death.jd_end if death.jd_end is not None else start
        row = {
            "y": dates.jd_to_western(start)[0],
            "fromJD": start,
            "toJD": end,
            "precision": death.precision,
            "sources": sorted(death.records.values_list("key", flat=True)),
        }
        for name in names.get(thing_id, ()):
            if len(owners[name]) == 1:
                result.setdefault(name, row)
    return dict(sorted(result.items()))


def inputs_sha256(table: dict[str, Json]) -> str:
    body = json.dumps(table, ensure_ascii=False, sort_keys=True).encode()
    return hashlib.sha256(body).hexdigest()


def deaths_script(table: dict[str, Json]) -> str:
    data = {"version": VERSION, "sha256": inputs_sha256(table), "people": table}
    body = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    return (
        "/* 武将の没年。史実 DB の確認済みの没日から manage.py export_game_data が"
        "書き出す。手で直さない。 */\n"
        "window.TK=window.TK||{};\n"
        f"TK.DEATH_YEARS={body};\n"
    )


def write(output: Path) -> int:
    table = death_years()
    (output / "deaths.js").write_text(deaths_script(table), encoding="utf-8")
    return len(table)
