"""The admin site for reading the history database (kuniezu/history/admin.py).

Only the development settings install the admin, so these checks run it in a
child process with config.settings.local and a database of their own. The
test settings (used by the static export) must not serve it.
"""

import os
import subprocess
import sys
from http import HTTPStatus
from typing import TYPE_CHECKING

from django.conf import settings as django_settings
from django.test import Client

if TYPE_CHECKING:
    from pathlib import Path

CHILD = r"""
import django
from http import HTTPStatus
django.setup()
from django.core.management import call_command
call_command("migrate", verbosity=0)
from django.contrib.auth import get_user_model
from django.test import Client
from django.urls import reverse
from kuniezu.history.models import ImportRun, Participation, Phenomenon, Record, Thing

run = ImportRun.objects.create()
record = Record.objects.create(
    key="claim:test", record_type="claim", status="verified",
    payload={}, content_hash="0" * 64, first_run=run, last_run=run,
)
person = Thing.objects.create(key="person:test", kind="person", name="試験太郎")
person.records.add(record)
death = Phenomenon.objects.create(
    key="death:test", mode="event", kind="existence", subtype="death-date",
    title="試験太郎の死去", status="verified", calendar="Japanese-lunisolar",
    precision="day", year=1582, month=6, day=2, jd_start=2299055,
    jd_end=2299055,
)
death.records.add(record)
Participation.objects.create(phenomenon=death, thing=person, role="subject")

client = Client(HTTP_HOST="127.0.0.1")
assert client.get("/admin/").status_code == HTTPStatus.FOUND  # login first
user = get_user_model().objects.create_superuser("tester", password=None)
client.force_login(user)
pages = [
    "/admin/",
    reverse("admin:history_thing_changelist") + "?q=試験",
    reverse("admin:history_thing_change", args=[person.pk]),
    reverse("admin:history_phenomenon_changelist"),
    reverse("admin:history_phenomenon_change", args=[death.pk]),
    reverse("admin:history_record_changelist"),
    reverse("admin:history_source_changelist"),
    reverse("admin:history_representation_changelist"),
    reverse("admin:history_importrun_changelist"),
    reverse("admin:history_recordversion_changelist"),
]
for page in pages:
    response = client.get(page)
    assert response.status_code == HTTPStatus.OK, (page, response.status_code)
thing_page = reverse("admin:history_thing_change", args=[person.pk])
html = client.get(thing_page).content.decode()
assert "1582-07-01" in html, "the ISO 8601 date of the death"
assert "旧暦 1582年6月2日" in html, "the date as the source gives it"
# Read-only: no adding, and changing or deleting is refused.
add_page = reverse("admin:history_thing_add")
assert client.get(add_page).status_code == HTTPStatus.FORBIDDEN
assert client.post(
    reverse("admin:history_thing_delete", args=[person.pk]), {"post": "yes"}
).status_code == HTTPStatus.FORBIDDEN
assert client.post(
    reverse("admin:history_thing_change", args=[person.pk]), {"name": "x"}
).status_code == HTTPStatus.FORBIDDEN
assert Thing.objects.get(pk=person.pk).name == "試験太郎"
print("ok")
"""


def test_the_admin_reads_the_history_database_but_does_not_edit_it(
    tmp_path: Path,
) -> None:
    env = {
        **os.environ,
        "DJANGO_SETTINGS_MODULE": "config.settings.local",
        "DATABASE_URL": f"sqlite:///{tmp_path / 'db.sqlite3'}",
    }
    result = subprocess.run(  # noqa: S603
        [sys.executable, "-c", CHILD],
        cwd=django_settings.BASE_DIR,
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode == 0, result.stderr
    assert result.stdout.strip() == "ok"


def test_the_settings_of_the_static_export_do_not_serve_the_admin() -> None:
    assert "django.contrib.admin" not in django_settings.INSTALLED_APPS
    assert Client().get("/admin/").status_code == HTTPStatus.NOT_FOUND
