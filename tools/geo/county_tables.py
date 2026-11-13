"""Build the county shapes the game reads (docs/designs/county-territory.md).

This module does not start Django. The management command
``write_county_tables`` (GeoDjango, config.settings.geo) passes it plain
GeoJSON-like dicts and writes the result to kuniezu/map/admin/:

* gun-shapes.geojson: every county, simplified so that neighbours still share
  their borders, with the keys of the castles inside it.
* gun-cells.geojson: counties with two or more castles, cut into the part
  nearest to each castle.
* gun-exceptions.geojson: counties whose colour comes from the exception list
  (properties only; the game joins them to gun-shapes on ``gun``).

The shapes derive from the CODH old county boundaries (CC BY-NC 4.0).
"""

from __future__ import annotations

import json
from collections.abc import Iterable
from typing import Any

import shapely
from shapely.geometry import MultiPolygon
from shapely.geometry import Point
from shapely.geometry import Polygon
from shapely.geometry import mapping
from shapely.geometry import shape

# coverage_simplify tolerance in degrees. Measured on 2026-11-13 over the 806
# counties: the largest gap between source and simplified border is about
# 85 m (0.00085°), under one 100 m pixel of the existing map; no island is
# lost and no county changes area by more than 1.3 %.
SIMPLIFY_TOLERANCE = 0.0002
# Gaps between counties narrower than this (about 0.1 m) are refused as
# digitising slivers. Wider gaps can be real narrow straits or channels: on
# 2026-11-13 the CODH source had none under 1e-6 degrees and a few of 1-10 m.
GAP_WIDTH = 0.000001
# Five decimals of a degree is about 1 m; it keeps gun-shapes.geojson under the
# 25 MiB Cloudflare asset limit (22 MB on 2026-11-13).
DIGITS = 5
CREDIT = (
    "『旧国・旧郡境界データセット』（CODH作成） 「幕末明治地勢地図境界データ」"
    "（人間文化研究機構作成）を加工 doi:10.20676/00000454"
)


def _multi(geom: Any) -> MultiPolygon:
    if isinstance(geom, Polygon):
        return MultiPolygon([geom])
    if isinstance(geom, MultiPolygon):
        return geom
    parts = [g for g in getattr(geom, "geoms", []) if isinstance(g, Polygon)]
    for g in getattr(geom, "geoms", []):
        if isinstance(g, MultiPolygon):
            parts.extend(g.geoms)
    return MultiPolygon(parts)


def _geometry(geom: Any) -> dict:
    rounded = shapely.set_precision(_multi(geom), 10**-DIGITS)
    return json.loads(json.dumps(mapping(_multi(rounded))))


def _collection(name: str, features: list[dict]) -> dict:
    return {
        "type": "FeatureCollection",
        "name": name,
        "license": "CC-BY-NC-4.0",
        "credit": CREDIT,
        "features": features,
    }


def simplify(guns: list[dict]) -> list[Any]:
    """Simplify all counties together so shared borders stay shared."""
    geoms = [shape(g["geometry"]) for g in guns]
    if not shapely.coverage_is_valid(geoms, gap_width=GAP_WIDTH):
        message = "county shapes overlap or have gaps; refusing to simplify"
        raise ValueError(message)
    return list(shapely.coverage_simplify(geoms, SIMPLIFY_TOLERANCE))


def cells(gun_geom: Any, castles: list[dict]) -> list[tuple[str, Any]]:
    """Cut one county into the part nearest to each of its castles."""
    coords = [tuple(c["point"]) for c in castles]
    if len(set(coords)) != len(coords):
        message = f"castles share a point: {[c['key'] for c in castles]}"
        raise ValueError(message)
    points = shapely.MultiPoint([Point(c["point"]) for c in castles])
    regions = shapely.voronoi_polygons(points, extend_to=gun_geom)
    out = []
    for castle in castles:
        point = Point(castle["point"])
        region = next(r for r in regions.geoms if r.covers(point))
        piece = region.intersection(gun_geom)
        if piece.is_empty or piece.area == 0:
            message = f"no cell for {castle['key']}: its point is outside the simplified county"
            raise ValueError(message)
        out.append((castle["key"], piece))
    return out


def build(
    guns: list[dict], castles: list[dict], exceptions: Iterable[dict]
) -> dict[str, dict]:
    """Return the three FeatureCollections, keyed by file name.

    ``guns``: ``{"id", "name", "yomi", "kuni", "kuniName", "geometry"}``.
    ``castles``: ``{"key", "gun", "point": [lon, lat]}``; ``gun`` may be None.
    ``exceptions``: entries of kuniezu/map/admin/gun-exceptions.json.
    """
    guns = sorted(guns, key=lambda g: g["id"])
    simplified = simplify(guns)
    by_gun: dict[str, list[dict]] = {}
    for castle in sorted(castles, key=lambda c: c["key"]):
        if castle.get("gun"):
            by_gun.setdefault(castle["gun"], []).append(castle)

    shapes, cell_features = [], []
    for gun, geom in zip(guns, simplified, strict=True):
        inside = by_gun.get(gun["id"], [])
        props = {
            "id": gun["id"],
            "name": gun["name"],
            "yomi": gun["yomi"],
            "kuni": gun["kuni"],
            "kuniName": gun["kuniName"],
            "castles": [c["key"] for c in inside],
        }
        shapes.append(
            {"type": "Feature", "properties": props, "geometry": _geometry(geom)}
        )
        if len(inside) >= 2:  # noqa: PLR2004
            for key, piece in cells(geom, inside):
                cell_features.append(
                    {
                        "type": "Feature",
                        "properties": {"gun": gun["id"], "castle": key},
                        "geometry": _geometry(piece),
                    }
                )

    geom_by_id = {g["id"]: geom for g, geom in zip(guns, simplified, strict=True)}
    exception_features = []
    for entry in sorted(exceptions, key=lambda e: (e["gun"], e.get("from") or 0)):
        props = {
            k: entry.get(k) for k in ("gun", "from", "to", "rule", "key", "source")
        }
        if entry["gun"] not in geom_by_id:
            message = f"exception for unknown county {entry['gun']}"
            raise ValueError(message)
        # The shape is in gun-shapes.geojson; the game joins on "gun".
        exception_features.append(
            {"type": "Feature", "properties": props, "geometry": None}
        )
    return {
        "gun-shapes.geojson": _collection("gun-shapes", shapes),
        "gun-cells.geojson": _collection("gun-cells", cell_features),
        "gun-exceptions.geojson": _collection("gun-exceptions", exception_features),
    }


def dumps(collection: dict) -> str:
    """Stable text: one feature per line, no timestamps."""
    head = {k: v for k, v in collection.items() if k != "features"}
    lines = [
        json.dumps(f, ensure_ascii=False, separators=(",", ":"))
        for f in collection["features"]
    ]
    body = ",\n".join(lines)
    text = json.dumps(head, ensure_ascii=False, separators=(",", ":"))[:-1]
    return text + ',"features":[\n' + body + "\n]}\n"
