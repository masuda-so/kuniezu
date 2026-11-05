"""Fill the history database from the inputs kept in the repository."""

import json
from typing import Any

from django.conf import settings
from django.core.management.base import BaseCommand

from kuniezu.history.importer import import_history


class Command(BaseCommand):
    help = "史実データベースを data/research/ と docs/work/ の入力から作り直す"

    def handle(self, *args: Any, **options: Any) -> None:
        summary = import_history(settings.BASE_DIR)
        self.stdout.write(json.dumps(summary.as_json(), ensure_ascii=False, indent=1))
