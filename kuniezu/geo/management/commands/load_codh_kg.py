"""Load the CODH old provinces and counties into the geography database.

Gaps and overlaps between counties are checked when the shapes are written
(tools/geo/county_tables.py refuses a coverage that is not valid).
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from django.conf import settings
from django.contrib.gis.geos import GEOSException
from django.contrib.gis.geos import GEOSGeometry
from django.contrib.gis.geos import MultiPolygon
from django.contrib.gis.utils import LayerMapping
from django.core.management.base import BaseCommand
from django.core.management.base import CommandError
from django.db import transaction

from kuniezu.geo.models import Gun
from kuniezu.geo.models import Kuni

KUNI_MAPPING = {"codh_id": "id", "name": "name", "yomi": "yomi", "geom": "POLYGON"}
GUN_MAPPING = {
    "codh_id": "id",
    "name": "name",
    "yomi": "yomi",
    "kuni": {"codh_id": "kuni_id"},
    "geom": "POLYGON",
}


def as_multi(geom: GEOSGeometry) -> MultiPolygon:
    if geom.geom_type == "Polygon":
        return MultiPolygon(geom, srid=geom.srid)
    if geom.geom_type == "MultiPolygon":
        return MultiPolygon(*geom, srid=geom.srid)
    message = f"dissolving gave {geom.geom_type}"
    raise ValueError(message)


def dissolve_parts() -> list[str]:
    """Dissolve touching parts of one id; return ids that stay invalid."""
    bad = []
    for model in (Kuni, Gun):
        for row in model.objects.all():
            if row.geom.valid:
                continue
            if row.geom.num_geom < 2:  # noqa: PLR2004
                bad.append(row.codh_id)
                continue
            try:
                merged = as_multi(row.geom.unary_union)
            except GEOSException, ValueError:
                bad.append(row.codh_id)
                continue
            if not merged.valid:
                bad.append(row.codh_id)
                continue
            row.geom = merged
            row.save(update_fields=["geom"])
    return bad


class Command(BaseCommand):
    help = "Load CODH province (K*.geojson) and county (G*.geojson) shapes."

    def add_arguments(self, parser: Any) -> None:
        default = Path(settings.BASE_DIR) / ".cache" / "codh-kg" / "geojson"
        parser.add_argument("--source", type=Path, default=default)

    def handle(self, *args: Any, **options: Any) -> None:
        source: Path = options["source"]
        kunis = sorted(source.glob("K*.geojson"))
        guns = sorted(source.glob("G*.geojson"))
        if not kunis or not guns:
            message = f"no K*/G*.geojson in {source}"
            raise CommandError(message)
        with transaction.atomic():
            Gun.objects.all().delete()
            Kuni.objects.all().delete()
            # unique= collects every polygon of one id into one MultiPolygon.
            for path in kunis:
                LayerMapping(Kuni, str(path), KUNI_MAPPING, unique="codh_id").save(
                    strict=True
                )
            for path in guns:
                LayerMapping(Gun, str(path), GUN_MAPPING, unique="codh_id").save(
                    strict=True
                )
            # LayerMapping(unique=) collects the polygons of one id into one
            # MultiPolygon without dissolving them. Touching parts of one id
            # are dissolved; a single invalid polygon is refused, not repaired.
            bad = dissolve_parts()
            if bad:
                message = "invalid shapes: " + ", ".join(sorted(bad))
                raise CommandError(message)
        self.stdout.write(
            f"loaded {Kuni.objects.count()} provinces, {Gun.objects.count()} counties"
        )
