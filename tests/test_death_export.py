"""The death years the game reads, exported from the history database."""

import json
import re
from pathlib import Path

import pytest
from django.core.management import call_command

from kuniezu.history import dates
from kuniezu.history import death_export
from kuniezu.history.models import ImportRun
from kuniezu.history.models import Participation
from kuniezu.history.models import Phenomenon
from kuniezu.history.models import Record
from kuniezu.history.models import Thing
from kuniezu.history.models import ThingName

ROOT = Path(__file__).resolve().parent.parent
HIDEYOSHI_DIED, SHO_GEN_DIED, TEST_DIED = 1598, 1572, 1582
DEFAULT = ROOT / "kuniezu/static/kuniezu/history/deaths.js"


def person(key: str, name: str, *aliases: str) -> Thing:
    thing = Thing.objects.create(key=key, kind="person", name=name, registered=True)
    for alias in aliases:
        ThingName.objects.create(thing=thing, name=alias)
    return thing


def death(  # noqa: PLR0913
    who: Thing,
    key: str,
    start: int,
    end: int,
    *,
    status: str = "verified",
    role: str = "subject",
) -> Phenomenon:
    run = ImportRun.objects.first() or ImportRun.objects.create()
    record = Record.objects.create(
        key=f"claim:{key}",
        record_type="claim",
        status=status,
        payload={},
        content_hash="0" * 64,
        first_run=run,
        last_run=run,
    )
    item = Phenomenon.objects.create(
        key=key,
        mode="event",
        kind="existence",
        subtype="death-date",
        status=status,
        precision="day" if start == end else "year",
        jd_start=start,
        jd_end=end,
    )
    item.records.add(record)
    Participation.objects.create(phenomenon=item, thing=who, role=role)
    return item


def jd(year: int, month: int, day: int) -> int:
    return dates.western_to_jd(year, month, day)


@pytest.mark.django_db
def test_confirmed_deaths_give_the_year_under_every_name():
    hideyoshi = person("person:豊臣秀吉", "豊臣秀吉", "木下秀吉", "羽柴秀吉")
    death(hideyoshi, "death:hideyoshi", jd(1598, 9, 18), jd(1598, 9, 18))

    table = death_export.death_years()

    assert set(table) == {"豊臣秀吉", "木下秀吉", "羽柴秀吉"}
    row = table["木下秀吉"]
    assert row["y"] == HIDEYOSHI_DIED
    assert row["fromJD"] == row["toJD"] == jd(1598, 9, 18)
    assert row["sources"] == ["claim:death:hideyoshi"]


@pytest.mark.django_db
def test_a_lunisolar_year_running_into_the_next_gives_the_first():
    # 元亀3年 runs from 1572-01-15 to 1573-02-02 in the game's western dates.
    sho = person("person:尚元", "尚元")
    death(sho, "death:sho", jd(1572, 1, 15), jd(1573, 2, 2))

    assert death_export.death_years()["尚元"]["y"] == SHO_GEN_DIED


@pytest.mark.django_db
def test_unconfirmed_others_and_shared_names_are_left_out():
    a = person("person:a", "甲", "同名")
    b = person("person:b", "乙", "同名")
    c = person("person:c", "丙")
    d = person("person:d", "丁")
    death(a, "death:a", jd(1580, 1, 1), jd(1580, 1, 1))
    death(b, "death:b", jd(1590, 1, 1), jd(1590, 1, 1))
    death(c, "death:c", jd(1600, 1, 1), jd(1600, 1, 1), status="implementation")
    death(d, "death:d", jd(1610, 1, 1), jd(1610, 1, 1), role="participant")

    table = death_export.death_years()

    assert set(table) == {"甲", "乙"}


@pytest.mark.django_db
def test_the_command_writes_the_deaths_script(tmp_path):
    person_ = person("person:x", "試験")
    death(person_, "death:x", jd(1582, 6, 21), jd(1582, 6, 21))

    call_command("export_game_data", "--output", str(tmp_path))

    text = (tmp_path / "deaths.js").read_text(encoding="utf-8")
    found = re.search(r"TK\.DEATH_YEARS=(.*);\n", text)
    assert found is not None
    data = json.loads(found.group(1))
    assert data["version"] == death_export.VERSION
    assert data["people"]["試験"]["y"] == TEST_DIED
    manifest = json.loads((tmp_path / "manifest.json").read_text(encoding="utf-8"))
    assert manifest["counts"]["deathNames"] == 1


def test_the_committed_deaths_file_is_the_empty_default():
    text = DEFAULT.read_text(encoding="utf-8")
    assert re.search(r"^TK\.DEATH_YEARS=null;$", text, re.MULTILINE)
