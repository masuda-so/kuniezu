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
        # The western dates the game shows (Julian before 15 October 1582) and
        # ISO 8601 (proleptic Gregorian). A year or a period is an interval,
        # never a single day it does not know.
        **day_forms(item.jd_start, item.jd_end),
        "place": item.place.name if item.place else None,
        "placePoint": [point.longitude, point.latitude] if point else None,
        "placeBasis": point.basis if point else None,
        "records": sorted(record.key for record in item.records.all()),
    }


def day_forms(start: int | None, end: int | None) -> dict[str, Any]:
    """The western dates the game shows and ISO 8601 for a span of days."""
    return {
        "western": [
            None if number is None else dates.jd_to_western(number)
            for number in (start, end)
        ],
        "iso8601": dates.iso_extent(start, end),
    }


class Command(BaseCommand):
    help = "史実データベースを、対象・年・範囲・軌跡で引く"

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument(
            "--about", help="対象の名前（人物は改名前後のどの名でも）か、対象のキー"
        )
        parser.add_argument("--year", type=int, help="西暦の年")
        parser.add_argument(
            "--box", type=float, nargs=4, metavar=("WEST", "EAST", "SOUTH", "NORTH")
        )
        parser.add_argument("--path", help="対象の軌跡（日付と場所のある移動・所在）")
        parser.add_argument("--legs", help="軌跡の隣り合う 2 点を結ぶのに要る速さ")
        parser.add_argument("--bundle", help="同じ事象に関わった対象")
        parser.add_argument(
            "--phenomenon",
            help="事象のキー（campaign:文禄の役 など）。その事象と、親・部分の事象",
        )

    def thing(self, name: str) -> Thing:
        found = list(queries.find_things(name))
        if len(found) != 1:
            # Several things share the name: list them so one can be picked by key.
            listed = "".join(
                f"\n  {thing.key} [{thing.get_kind_display()}] {thing.name} "
                f"(point: {getattr(getattr(thing, 'place', None), 'basis', 'none')})"
                for thing in found
            )
            message = (
                f"「{name}」に当たる対象が {len(found)} 件。キーで指定する{listed}"
            )
            raise CommandError(message)
        return found[0]

    def handle(self, *args: Any, **options: Any) -> None:
        answer: Any
        if options["phenomenon"]:
            others = [
                name
                for name in ("about", "year", "box", "path", "legs", "bundle")
                if options.get(name) is not None
            ]
            if others:
                # One phenomenon and its parent and parts: nothing to combine.
                listed = ", ".join("--" + name for name in others)
                message = f"--phenomenon は {listed} と一緒には使えない"
                raise CommandError(message)
            key = options["phenomenon"]
            item = Phenomenon.objects.filter(key=key).first()
            if item is None:
                message = f"事象のキー「{key}」は無い"
                raise CommandError(message)
            answer = describe(item) | {
                "parent": item.parent.key if item.parent else None,
                "parts": [
                    describe(part)
                    for part in item.parts.order_by("jd_start", "jd_end", "key")
                ],
            }
        elif options["path"]:
            answer = [
                {**stop.__dict__, **day_forms(stop.jd_start, stop.jd_end)}
                for stop in queries.path(self.thing(options["path"]))
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
