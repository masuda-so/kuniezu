"""Link the game's castles to the county that covers each castle's point.

Castles come from data/research/implemented-sites.jsonl: ``castle-node`` rows
are march nodes (waypoint), ``城`` rows are the other castles. Every castle is
keyed ``castle:<id>`` (docs/designs/county-territory.md).

A castle outside every county stops the command unless
kuniezu/map/admin/castle-gun-overrides.json names it: ``assign`` gives a
county by hand (with a source), ``outsideJapan`` lists castles that have no
Japanese county (Korea).
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from django.conf import settings
from django.contrib.gis.geos import Point
from django.core.management.base import BaseCommand
from django.core.management.base import CommandError
from django.db import transaction

from kuniezu.geo.models import CastlePoint
from kuniezu.geo.models import Gun

SITES = Path("data/research/implemented-sites.jsonl")
OVERRIDES = Path("kuniezu/map/admin/castle-gun-overrides.json")


def castle_key(row: dict) -> tuple[str, bool] | None:
    if row.get("kind") == "castle-node":
        return "castle:" + row["id"].removeprefix("node:"), True
    if row.get("kind") == "城":
        return "castle:" + row["id"], False
    return None


def castle_rows(path: Path) -> list[dict]:
    rows = []
    with path.open(encoding="utf-8") as handle:
        for line in handle:
            row = json.loads(line)
            found = castle_key(row)
            if found:
                key, waypoint = found
                rows.append(
                    {
                        "key": key,
                        "name": row["name"],
                        "waypoint": waypoint,
                        "point": row["point"],
                    }
                )
    return sorted(rows, key=lambda r: r["key"])


class Command(BaseCommand):
    help = "Link castles to counties (castle point covered by the county)."

    def add_arguments(self, parser: Any) -> None:
        root = Path(settings.BASE_DIR)
        parser.add_argument("--sites", type=Path, default=root / SITES)
        parser.add_argument("--overrides", type=Path, default=root / OVERRIDES)

    def handle(self, *args: Any, **options: Any) -> None:
        rows = castle_rows(options["sites"])
        overrides = json.loads(options["overrides"].read_text(encoding="utf-8"))
        assign = {k: v["gun"] for k, v in overrides.get("assign", {}).items()}
        outside_japan = set(overrides.get("outsideJapan", []))
        ambiguous, unlinked = [], []
        with transaction.atomic():
            CastlePoint.objects.all().delete()
            for row in rows:
                lon, lat = row["point"]
                point = Point(lon, lat, srid=4326)
                if row["key"] in assign:
                    gun = Gun.objects.get(codh_id=assign[row["key"]])
                else:
                    hits = sorted(
                        Gun.objects.filter(geom__covers=point), key=lambda g: g.codh_id
                    )
                    if len(hits) > 1:
                        ambiguous.append(
                            f"{row['key']} -> {', '.join(g.codh_id for g in hits)}"
                        )
                    gun = hits[0] if hits else None
                    if gun is None and row["key"] not in outside_japan:
                        unlinked.append(row["key"])
                CastlePoint.objects.create(
                    key=row["key"],
                    name=row["name"],
                    waypoint=row["waypoint"],
                    point=point,
                    gun=gun,
                )
            if unlinked:
                message = "castles outside every county (add them to "
                message += "castle-gun-overrides.json): " + ", ".join(unlinked)
                raise CommandError(message)
        linked = CastlePoint.objects.exclude(gun=None).count()
        outside = len(outside_japan)
        self.stdout.write(f"linked {linked} of {len(rows)}; {outside} outside Japan")
        for line in ambiguous:
            self.stdout.write(f"on a border (first county taken): {line}")
