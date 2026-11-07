"""Verify retained CODH vector inputs and prepare versioned GeoJSON references."""
import argparse
from collections import Counter
import gzip
import hashlib
from io import BytesIO
import json
import math
from pathlib import Path
from typing import Any
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[2]
CRS84 = "urn:ogc:def:crs:OGC:1.3:CRS84"
WGS84_WKT = 'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]'
DEPTH = {"Point": 0, "MultiPoint": 1, "LineString": 1,
         "MultiLineString": 2, "Polygon": 2, "MultiPolygon": 3}


def inspect_collection(data, id_field):
    if data.get("type") != "FeatureCollection" or not isinstance(data.get("features"), list):
        raise ValueError("Expected a GeoJSON FeatureCollection")
    crs = data.get("crs")
    if crs is not None and crs.get("properties", {}).get("name") != CRS84:
        raise ValueError("Unknown coordinate reference system; transformation required")
    types: Counter[str] = Counter()
    ids: Counter[str] = Counter()
    bounds, vertices = [math.inf, math.inf, -math.inf, -math.inf], 0

    def coordinates(value, depth):
        nonlocal vertices
        if not isinstance(value, list) or not value:
            raise ValueError("Empty or invalid coordinates")
        if depth:
            for child in value:
                coordinates(child, depth - 1)
            return
        if len(value) != 2 or any(type(n) not in (int, float) or not math.isfinite(n) for n in value):
            raise ValueError("Expected finite longitude/latitude pairs")
        x, y = value
        if not -180 <= x <= 180 or not -90 <= y <= 90:
            raise ValueError("Coordinates outside longitude/latitude bounds")
        bounds[0], bounds[1] = min(bounds[0], x), min(bounds[1], y)
        bounds[2], bounds[3] = max(bounds[2], x), max(bounds[3], y)
        vertices += 1

    for feature in data["features"]:
        if feature.get("type") != "Feature" or not isinstance(feature.get("properties"), dict):
            raise ValueError("Invalid GeoJSON feature")
        if "id" in feature:
            raise ValueError("Source feature id needs an explicit preservation rule")
        properties = feature["properties"]
        if id_field not in properties:
            raise ValueError("Missing source identity field: " + id_field)
        ids[str(properties[id_field])] += 1
        geometry = feature.get("geometry")
        if geometry is None:
            types["null"] += 1
            continue
        if not isinstance(geometry, dict):
            raise ValueError("Invalid geometry object")
        kind = geometry.get("type")
        if kind not in DEPTH:
            raise ValueError("Unsupported geometry type: " + str(kind))
        types[kind] += 1
        value = geometry.get("coordinates")
        if not isinstance(value, list):
            raise ValueError("Expected coordinate arrays")
        coordinates(value, DEPTH[kind])
        lines = [value] if kind == "LineString" else value if kind == "MultiLineString" else []
        if any(len(line) < 2 for line in lines):
            raise ValueError("Line needs at least two positions")
        polygons = [value] if kind == "Polygon" else value if kind == "MultiPolygon" else []
        if any(len(ring) < 4 or ring[0] != ring[-1] for polygon in polygons for ring in polygon):
            raise ValueError("Polygon rings must be closed with at least four positions")
    return {"features": len(data["features"]), "geometryTypes": dict(sorted(types.items())),
            "vertices": vertices, "bbox": bounds if vertices else None,
            "sourceIdField": id_field, "uniqueSourceIds": len(ids),
            "duplicateSourceIds": {key: n for key, n in sorted(ids.items()) if n > 1},
            "coordinateSystem": "OGC:CRS84", "coordinateOrder": "longitude-latitude"}


def relationships(prepared):
    layers = dict(prepared)
    report = {}
    if "roads" in layers and "posts" in layers:
        roads, posts = layers["roads"]["features"], layers["posts"]["features"]
        road_ids = Counter(row["properties"]["numbering"] for row in roads)
        bases = {key[:4] for key in road_ids}
        post_roads = {row["properties"]["road_id"] for row in posts}
        groups: dict[str, list[dict[str, Any]]] = {}
        for row in posts:
            groups.setdefault(row["properties"]["shukuba_id"], []).append(row)
        if any(row["geometry"] is not None and row["geometry"]["type"] != "Point" for row in posts):
            raise ValueError("Post reference requires Point geometry or null")
        missing_coordinates = [row["id"] for row in posts if row["geometry"] is None]
        variants = {key: sorted({tuple(row["geometry"]["coordinates"]) for row in rows if row["geometry"] is not None})
                    for key, rows in groups.items()}
        report["roadPost"] = {
            "roadFeatures": len(roads), "roadBaseIds": len(bases),
            "postFeatures": len(posts), "uniquePostIds": len(groups),
            "postRowsWithoutCoordinates": missing_coordinates,
            "postRoadIds": len(post_roads),
            "postRoadIdsWithoutLines": sorted(post_roads - bases),
            "repeatedRoadIds": {key: n for key, n in road_ids.items() if n > 1},
            "postIdsWithDifferentCoordinates": {key: points for key, points in variants.items() if len(points) > 1},
            "automaticMergeOrConnectionPerformed": False,
        }
    if "lake-points" in layers and "lake-polygons" in layers:
        points, polygons = layers["lake-points"]["features"], layers["lake-polygons"]["features"]
        point_ids = {row["properties"]["id"] for row in points}
        polygon_ids = {row["properties"]["id"] for row in polygons}
        report["lake"] = {
            "pointRows": len(points), "uniquePointIds": len(point_ids),
            "polygonRows": len(polygons), "uniquePolygonIds": len(polygon_ids),
            "pointRowsWithoutPolygon": sum(row["properties"]["id"] not in polygon_ids for row in points),
            "polygonIdsWithoutPoint": sorted(polygon_ids - point_ids),
            "polygonInferredFromPoint": False,
        }
    return report


def shapefile_collection(raw, row):
    import shapefile

    base = row["memberBase"]
    with ZipFile(BytesIO(raw)) as archive:
        wkt = archive.read(base + ".prj").decode("utf-8").strip()
        if wkt != WGS84_WKT or wkt != row["projectionWkt"]:
            raise ValueError("Unsupported Shapefile projection; no relabelling performed")
        if archive.read(base + ".cpg").decode("ascii").strip().upper() != "UTF-8":
            raise ValueError("Unexpected Shapefile character encoding")
        with shapefile.Reader(
            shp=BytesIO(archive.read(base + ".shp")),
            shx=BytesIO(archive.read(base + ".shx")),
            dbf=BytesIO(archive.read(base + ".dbf")), encoding="utf-8",
        ) as reader:
            if reader.shapeType != shapefile.POLYGON:
                raise ValueError("Expected the official 2D polygon Shapefile")
            features = [{"type": "Feature", "properties": record.record.as_dict(),
                         "geometry": None if record.shape.shapeType == shapefile.NULL
                         else record.shape.__geo_interface__}
                        for record in reader.iterShapeRecords()]
    # Serialize the public geo-interface, preserving values while making tuples JSON arrays.
    return json.loads(json.dumps({"type": "FeatureCollection", "features": features,
                                 "crs": {"properties": {"name": CRS84}}})), wkt


def prepare(manifest_path, output=None):
    manifest_path = Path(manifest_path)
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    prepared, summaries, keys = [], [], set()
    for row in manifest["datasets"]:
        key = row["key"]
        if key in keys or not key or any(c not in "abcdefghijklmnopqrstuvwxyz-" for c in key):
            raise ValueError("Invalid or duplicate dataset key")
        keys.add(key)
        source = (manifest_path.parent / row["file"]).resolve()
        if source.parent != manifest_path.parent.resolve():
            raise ValueError("Source archive must be in the manifest directory")
        packed = source.read_bytes()
        if hashlib.sha256(packed).hexdigest() != row["archiveSha256"]:
            raise ValueError("Archive SHA mismatch: " + key)
        raw = packed if row.get("format") == "shapefile-zip" else gzip.decompress(packed)
        if len(raw) != row["bytes"] or hashlib.sha256(raw).hexdigest() != row["sha256"]:
            raise ValueError("Original SHA/size mismatch: " + key)
        if row.get("format") == "shapefile-zip":
            data, declared_crs = shapefile_collection(raw, row)
        else:
            data = json.loads(raw)
            declared_crs = data.get("crs", {}).get("properties", {}).get("name")
        if declared_crs != row["sourceCrs"]:
            raise ValueError("Source CRS metadata differs from retained data: " + key)
        if row["temporalScope"] != "Edo-reference-not-Sengoku-assertion":
            raise ValueError("CODH reference must not be promoted to Sengoku evidence")
        summary = inspect_collection(data, row["sourceIdField"])
        if summary["features"] != row["features"]:
            raise ValueError("Feature count mismatch: " + key)
        summary.update(key=key, sourceSha256=row["sha256"], credit=row["credit"],
                       url=row["url"], dataset=row["dataset"], license=row["license"],
                       sourceCrs=row["sourceCrs"], crsInterpretation=row["interpretation"],
                       temporalScope=row["temporalScope"],
                       featureIdentity=row.get("sourceLocator", "sourceSha256 + /features/<zero-based-row>"))
        normalized = {key: value for key, value in data.items() if key != "crs"}
        normalized["features"] = [
            {**feature, "id": index} for index, feature in enumerate(data["features"])]
        prepared.append((key, normalized))
        summaries.append(summary)
    report = {"datasets": summaries, "relationships": relationships(prepared)}
    # Validate every input before creating output; never overwrite another build.
    if output is not None:
        output = Path(output)
        output.mkdir(parents=True, exist_ok=False)
        for key, data in prepared:
            (output / (key + ".geojson")).write_text(
                json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        (output / "manifest.json").write_text(
            json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path,
                        default=ROOT / "data/inputs/codh-edo/manifest.json")
    parser.add_argument("--output", type=Path, help="New directory for derived GeoJSON")
    args = parser.parse_args()
    print(json.dumps(prepare(args.manifest, args.output), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
