"""Write the game's castle owner intervals from the history database."""

import json
from pathlib import Path
from typing import Any

from django.conf import settings
from django.core.management.base import BaseCommand
from django.core.management.base import CommandError

from kuniezu.history import death_export
from kuniezu.history import export
from kuniezu.history.models import Record
from kuniezu.history.models import RecordType


class Command(BaseCommand):
    help = (
        "史実 DB から、ゲーム用の城の持ち主の区間（owners.js）と"
        "武将の没年（deaths.js）を書き出す"
    )

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument("--output", required=True, type=Path)

    def handle(self, *args: Any, **options: Any) -> None:
        output: Path = options["output"]
        records = Record.objects.filter(
            record_type=RecordType.CONTROL, retired_run__isnull=True
        ).count()
        timeline = export.owner_timeline()
        intervals = sum(len(rows) for rows in timeline.values())
        if records and not intervals:
            message = f"{records} control records gave no owner interval"
            raise CommandError(message)
        digest = export.inputs_sha256(Path(settings.BASE_DIR))
        output.mkdir(parents=True, exist_ok=True)
        (output / "owners.js").write_text(
            export.owners_script(timeline, digest), encoding="utf-8"
        )
        deaths = death_export.write(output)
        manifest = {
            "version": export.VERSION,
            "inputsSha256": digest,
            "counts": {
                "records": records,
                "castles": len(timeline),
                "intervals": intervals,
                "deathNames": deaths,
            },
        }
        (output / "manifest.json").write_text(
            json.dumps(manifest, ensure_ascii=False, indent=1) + "\n", encoding="utf-8"
        )
        self.stdout.write(json.dumps(manifest["counts"], ensure_ascii=False))
