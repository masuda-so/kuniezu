"""Write the county shapes the game reads into kuniezu/map/admin/.

Run after load_codh_kg and link_places, with config.settings.geo. The
simplification and cells are done by tools/geo/county_tables.py, which does
not start Django (docs/designs/county-territory.md, technical plan 1).
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from django.conf import settings
from django.core.management.base import BaseCommand
from django.core.management.base import CommandError

from kuniezu.geo.models import CastlePoint
from kuniezu.geo.models import Gun
from tools.geo.county_tables import build
from tools.geo.county_tables import dumps

ADMIN = Path("kuniezu/map/admin")


class Command(BaseCommand):
    help = "Write gun-shapes, gun-cells and gun-exceptions GeoJSON."

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument("--output", type=Path, default=None)
        parser.add_argument("--exceptions", type=Path, default=None)

    def handle(self, *args: Any, **options: Any) -> None:
        root = Path(settings.BASE_DIR)
        output = options["output"] or root / ADMIN
        guns = [
            {
                "id": g.codh_id,
                "name": g.name,
                "yomi": g.yomi,
                "kuni": g.kuni.codh_id,
                "kuniName": g.kuni.name,
                "geometry": json.loads(g.geom.geojson),
            }
            for g in Gun.objects.select_related("kuni")
        ]
        castles = [
            {
                "key": c.key,
                "gun": c.gun.codh_id if c.gun else None,
                "point": [c.point.x, c.point.y],
            }
            for c in CastlePoint.objects.select_related("gun")
        ]
        if not any(c["gun"] for c in castles):
            message = "no castle is linked to a county; run link_places first"
            raise CommandError(message)
        exceptions_path = options["exceptions"] or root / ADMIN / "gun-exceptions.json"
        exceptions = json.loads(exceptions_path.read_text(encoding="utf-8"))
        files = build(guns, castles, exceptions["exceptions"])
        output.mkdir(parents=True, exist_ok=True)
        for name, collection in files.items():
            (output / name).write_text(dumps(collection), encoding="utf-8")
            self.stdout.write(f"wrote {name}: {len(collection['features'])} features")
