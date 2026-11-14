import json
import shutil
from pathlib import Path

import pytest
from django.conf import settings
from django.core.management import call_command

from kuniezu.history.importer import MONTH_TABLE
from kuniezu.history.importer import import_history
from kuniezu.history.inventory import STATES
from kuniezu.history.inventory import inventory

ROOT = Path(settings.BASE_DIR)


@pytest.fixture
def repository(tmp_path):
    for name in ("data/research", "docs/work/catalog.jsonl", MONTH_TABLE):
        source, target = ROOT / name, tmp_path / name
        target.parent.mkdir(parents=True, exist_ok=True)
        if source.is_dir():
            shutil.copytree(source, target)
        else:
            shutil.copy(source, target)
    return tmp_path


@pytest.mark.django_db
def test_every_person_and_castle_has_exactly_one_state_per_record(repository):
    import_history(repository)
    result = inventory()
    for group in ("people", "castles"):
        total = result[group]["total"]
        assert total > 0
        for counts in result[group]["states"].values():
            assert sum(counts[state] for state in STATES) == total
    rows = {row["key"]: row for row in result["rows"]["castles"]}
    # The Tokai trial's control record makes Yoshida's owner confirmed.
    assert rows["node:yoshida"]["owner"] == "confirmed"
    # A game birth year alone is only a comparison value.
    people = {row["name"]: row for row in result["rows"]["people"]}
    # Nobuyasu's death claim links Ieyasu as a relative; it is not his death.
    assert people["徳川家康"]["death"] != "confirmed"
    assert people["佐々成政"]["birth"] in {"comparison", "confirmed"}


@pytest.mark.django_db
def test_the_command_prints_the_tables(repository, capsys):
    import_history(repository)
    call_command("history_inventory")
    answer = json.loads(capsys.readouterr().out)
    assert set(answer) == {"people", "castles"}
    call_command("history_inventory", "--markdown")
    assert "| 生年 |" in capsys.readouterr().out
