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
        # Every item of the catalog is either counted or listed as having no input.
        assert not set(result[group]["states"]) & set(result[group]["noContainer"])
    rows = {row["key"]: row for row in result["rows"]["castles"]}
    # The Tokai trial's control record makes Yoshida's owner confirmed.
    assert rows["node:yoshida"]["owner"] == "confirmed"
    # The surrender in the control record is one of the castle's events.
    assert rows["node:yoshida"]["events"] == "confirmed"
    # A game birth year alone is only a comparison value.
    people = {row["name"]: row for row in result["rows"]["people"]}
    # Nobuyasu's death claim links Ieyasu as a relative; it is not his death.
    assert people["徳川家康"]["death"] != "confirmed"
    # Hidetada is a related person of the verified Ueda battle claim.
    assert people["徳川秀忠"]["events"] == "confirmed"
    assert people["佐々成政"]["birth"] in {"comparison", "confirmed"}


@pytest.mark.django_db
def test_the_command_prints_the_tables(repository, capsys):
    import_history(repository)
    call_command("history_inventory")
    answer = json.loads(capsys.readouterr().out)
    assert set(answer) == {"people", "castles"}
    call_command("history_inventory", "--markdown")
    table = capsys.readouterr().out
    assert "| 生年 |" in table
    assert "| 名前の変遷 |" in table
    assert "家族（器なし）" in table


@pytest.mark.django_db
def test_renamed_generals_and_castle_keys_end_on_one_thing(repository):
    from kuniezu.history.models import Phenomenon  # noqa: PLC0415
    from kuniezu.history.models import ThingKey  # noqa: PLC0415

    observations = repository / "data/research/location-observations.jsonl"
    row = json.loads(observations.read_text(encoding="utf-8").splitlines()[0])
    row.update(id="location:test-castle-key", person="person:織田信長")
    row["place"] = "castle:kiyosu"
    with observations.open("a", encoding="utf-8") as stream:
        stream.write(json.dumps(row, ensure_ascii=False) + "\n")
    import_history(repository)

    def thing(key):
        return ThingKey.objects.get(key=key).thing

    # A chain of renames ends on one person.
    assert thing("person:上杉謙信") == thing("person:上杉政虎")
    # A renamed general joins the registered person, not a new one.
    from kuniezu.history import queries  # noqa: PLC0415

    assert list(queries.find_things("徳川家康")) == [thing("person:tokugawa-ieyasu")]
    assert thing("person:松平家康") == thing("person:tokugawa-ieyasu")
    # A location record that names a game castle lands on the castle node.
    item = Phenomenon.objects.get(key="location:test-castle-key")
    assert item.place == thing("node:kiyosu")
