"""Ask the history database a question and print the answer as JSON."""

import json
from typing import Any

from django.core.management.base import BaseCommand
from django.core.management.base import CommandError
from django.core.management.base import CommandParser

from kuniezu.history import dates
from kuniezu.history import queries
from kuniezu.history.models import Phenomenon
from kuniezu.history.models import Thing


def describe(item: Phenomenon) -> dict[str, Any]:
    # The point is the place's representative point, and ``placeBasis`` says how
    # it was obtained. It is not the exact spot of the phenomenon.
    point = getattr(item.place, "place", None) if item.place else None
    return {
        "key": item.key,
        "mode": item.mode,
        "kind": item.kind,
        "subtype": item.subtype,
        "title": item.title,
        "status": item.status,
        "calendar": item.calendar,
        "date": [item.year, item.month, item.day] if item.year else None,
        "leapMonth": item.leap_month,
        "precision": item.precision,
        "label": item.time_label,
        "boundsAsserted": item.bounds_asserted,
        "exact": item.jd_exact,
        "days": [item.jd_start, item.jd_end],
        "western": [
            None if number is None else dates.jd_to_western(number)
            for number in (item.jd_start, item.jd_end)
        ],
        "place": item.place.name if item.place else None,
        "placePoint": [point.longitude, point.latitude] if point else None,
        "placeBasis": point.basis if point else None,
        "records": sorted(record.key for record in item.records.all()),
    }


class Command(BaseCommand):
    help = "史実データベースを、対象・年・範囲・軌跡で引く"

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("--about", help="対象の名前（人物は改名前後のどの名でも）")
        parser.add_argument("--year", type=int, help="西暦の年")
        parser.add_argument(
            "--box", type=float, nargs=4, metavar=("WEST", "EAST", "SOUTH", "NORTH")
        )
        parser.add_argument("--path", help="対象の軌跡（日付と場所のある移動・所在）")
        parser.add_argument("--legs", help="軌跡の隣り合う 2 点を結ぶのに要る速さ")
        parser.add_argument("--bundle", help="同じ事象に関わった対象")

    def thing(self, name: str) -> Thing:
        found = list(queries.find_things(name))
        if len(found) != 1:
            message = f"「{name}」に当たる対象が {len(found)} 件"
            raise CommandError(message)
        return found[0]

    def handle(self, *args: Any, **options: Any) -> None:
        answer: Any
        if options["path"]:
            answer = [
                stop.__dict__ for stop in queries.path(self.thing(options["path"]))
            ]
        elif options["legs"]:
            answer = [
                {
                    "from": leg.start.place,
                    "to": leg.end.place,
                    "km": round(leg.km, 1),
                    "days": leg.days,
                    "kmPerDay": round(leg.km_per_day, 1),
                    "possible": leg.possible,
                }
                for leg in queries.legs(self.thing(options["legs"]))
            ]
        elif options["bundle"]:
            answer = [
                {
                    "key": thing.key,
                    "name": thing.name,
                    "kind": thing.kind,
                    "shared": shared,
                }
                for thing, shared in queries.bundle(self.thing(options["bundle"]))
            ]
        else:
            found = Phenomenon.objects.all()
            if options["about"]:
                found = queries.about(self.thing(options["about"]))
            if options["year"] is not None:
                found = found.filter(pk__in=queries.in_year(options["year"]))
            if options["box"]:
                found = found.filter(pk__in=queries.in_box(*options["box"]))
            found = found.order_by("jd_start", "jd_end", "key")
            answer = [
                describe(item)
                for item in found.select_related("place__place").prefetch_related(
                    "records"
                )
            ]
        self.stdout.write(json.dumps(answer, ensure_ascii=False, indent=1))
