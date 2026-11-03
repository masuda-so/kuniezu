"""Rasterize source river segments to one RGB PNG on the province grid.

Initial migration: projection.json (or a grid manifest), normalized JSON or game
directory, and a NEW output directory. --tiles also writes derivative tiles.
Normal derivation: --from-image rivers.png --manifest manifest.json
--grid projection.json NEW_OUTPUT. Reads no old JS or source-line JSON.
After editing the image, explicitly update manifest.sha256 before deriving.
This is Kuniezu's feature-membership encoding, NOT the CK3 river palette.
Only sparse river pixels and one output scanline are kept in memory.
"""
import argparse
from collections import Counter, defaultdict
import hashlib
import json
import math
import os
from pathlib import Path
import re
import struct
import subprocess
import time
import zlib


RUNTIME_EXPORT = r"""
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),crypto=require('node:crypto');
const root=process.argv[1],ctx={TK:{RESEARCH_SOURCES:{}},window:{}},inputs=[];vm.createContext(ctx);
for(const file of ['geo.js','regional-rivers.js','korean-rivers-major.js','japan-rivers-osm.js','hydrography-policy.js']){
 const name=path.join(root,file),bytes=fs.readFileSync(name);inputs.push({path:name,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});vm.runInContext(bytes.toString('utf8'),ctx,{filename:name});
}
const {TK,window:{TKGEO:g}}=ctx,rows=[];
const push=(name,id,part,points,file,index)=>rows.push({name,id:String(id),part,points,origin:{file,index}});
g.rivers.forEach((r,i)=>{if(!r.every((v,j)=>j%2?g.LAT0-v/g.K>34.8:v/g.K/g.CX+g.LON0>124&&v/g.K/g.CX+g.LON0<131))
 push('geo:'+i,'geo:'+i,0,Array.from({length:r.length/2},(_,j)=>[r[j*2]/g.K/g.CX+g.LON0,g.LAT0-r[j*2+1]/g.K]),'geo.js',i);});
const regional=TK.regionalRiverRecords(TK.REGIONAL_RIVERS,TK.KOREAN_RIVERS_DETAIL,(a,b)=>[a,b]),used=new Set(regional.flatMap(r=>r.detailRows));
for(const r of regional)r.geometries.forEach((line,i)=>{const detail=r.detailRows[i];push(r.name,detail?detail.id:'regional:'+r.name,i,line.points,detail?'korean-rivers-major.js':'regional-rivers.js',detail?TK.KOREAN_RIVERS_DETAIL.indexOf(detail):TK.REGIONAL_RIVERS.findIndex(v=>v.name===r.name));});
TK.KOREAN_RIVERS_DETAIL.forEach((r,i)=>{if(!used.has(r))push(r.name,r.id,r.part||0,r.points,'korean-rivers-major.js',i);});
TK.JAPAN_RIVERS_OSM.rivers.forEach((r,i)=>push(r.name,r.id,r.part||0,r.points,'japan-rivers-osm.js',i));
console.log(JSON.stringify({basis:'modern-reference',source:'Current runtime river selection, before cosmetic smoothing or land clipping',license:'Mixed; see sourceAttribution',attribution:'See sourceAttribution',inputs,
 sourceAttribution:{'geo.js':'Legacy projected lines; individual original source IDs unavailable. Retain input hash and array index.','regional-rivers.js':'Natural Earth, public domain','korean-rivers-major.js':'OpenStreetMap contributors / Geofabrik, ODbL 1.0','japan-rivers-osm.js':TK.JAPAN_RIVERS_OSM},rivers:rows}));
"""


def digest(file):
    value = hashlib.sha256()
    with Path(file).open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            value.update(chunk)
    return value.hexdigest()


def write_json(file, data):
    file.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def load_source(file):
    if file.is_dir():
        root = file / "game" if (file / "game/geo.js").exists() else file
        result = subprocess.run(["node", "-e", RUNTIME_EXPORT, str(root.resolve())],
                                check=True, capture_output=True, text=True)
        source = json.loads(result.stdout)
        # The metadata must not duplicate the Japan geometry array.
        source["sourceAttribution"]["japan-rivers-osm.js"].pop("rivers", None)
        return source
    source = json.loads(file.read_text(encoding="utf-8"))
    source.setdefault("inputs", []).append({"path": str(file.resolve()), "sha256": digest(file)})
    return source


def load_grid(file):
    grid = json.loads(file.read_text(encoding="utf-8"))
    projection = grid.get("projection", grid)
    width, height = grid["width"], grid["height"]
    if any(not isinstance(v, int) or v <= 0 for v in (width, height)):
        raise ValueError("Grid dimensions must be positive integers")
    if (any(projection[k] <= 0 for k in ("K", "CX", "stepUnits"))
            or not all(math.isfinite(float(projection[k])) for k in ("K", "CX", "LON0", "LAT0", "stepUnits"))
            or len(projection["origin"]) != 2 or not all(math.isfinite(v) for v in projection["origin"])):
        raise ValueError("Invalid projection")
    return projection, width, height, grid.get("tile", 1024)


def project(point, projection):
    lon, lat = point
    x = (lon - projection["LON0"]) * projection["K"] * projection["CX"]
    y = (projection["LAT0"] - lat) * projection["K"]
    result = ((x - projection["origin"][0]) / projection["stepUnits"],
              (y - projection["origin"][1]) / projection["stepUnits"])
    if not all(math.isfinite(v) for v in result):
        raise ValueError("Nonfinite river vertex")
    return result


def clip_segment(a, b, width, height):
    """Liang-Barsky against the half-open raster rectangle, before rounding.

    Clip each original segment separately; deleting outside vertices would join
    unrelated entry/exit points into artificial chords along the map edge.
    """
    xmax, ymax = math.nextafter(float(width), -math.inf), math.nextafter(float(height), -math.inf)
    dx, dy = b[0] - a[0], b[1] - a[1]
    lo, hi = 0.0, 1.0
    for p, q in ((-dx, a[0]), (dx, xmax - a[0]), (-dy, a[1]), (dy, ymax - a[1])):
        if p == 0:
            if q < 0:
                return None
        elif p < 0:
            lo = max(lo, q / p)
        else:
            hi = min(hi, q / p)
        if lo > hi:
            return None
    def quantize(t):
        return (min(width - 1, max(0, math.floor(a[0] + t * dx))),
                min(height - 1, max(0, math.floor(a[1] + t * dy))))
    return quantize(lo), quantize(hi)


def line_pixels(a, b):
    """Integer Bresenham; tie steps point toward the original segment end."""
    x, y = a
    dx, dy = abs(b[0] - x), -abs(b[1] - y)
    sx, sy = (1 if x < b[0] else -1), (1 if y < b[1] else -1)
    error = dx + dy
    while True:
        yield x, y
        if (x, y) == b:
            break
        twice = 2 * error
        if twice >= dy:
            error += dy
            x += sx
        if twice <= dx:
            error += dx
            y += sy


def rgb(code):
    # Odd multiplication modulo 2^24 is one-to-one, including reserved black 0.
    value = (code * 0x9E3779) & 0xFFFFFF
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255]


def write_png(file, width, height, rows):
    temporary = file.with_suffix(file.suffix + ".partial")
    with temporary.open("xb") as stream:
        stream.write(b"\x89PNG\r\n\x1a\n")
        def chunk(kind, data):
            stream.write(struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data)))
        chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
        compressor = zlib.compressobj(6)
        count = 0
        for row in rows:
            if len(row) != width * 3:
                raise ValueError("Invalid output scanline width")
            data = compressor.compress(b"\0" + row)
            if data:
                chunk(b"IDAT", data)
            count += 1
        if count != height:
            raise ValueError("Invalid output scanline count")
        chunk(b"IDAT", compressor.flush())
        chunk(b"IEND", b"")
        stream.flush()
        os.fsync(stream.fileno())
    temporary.rename(file)


def rows_for(width, height, rows, codes, x0=0, y0=0):
    for y in range(y0, y0 + height):
        row = bytearray(width * 3)
        for x, code in rows.get(y, ()):
            if x0 <= x < x0 + width:
                row[(x-x0)*3:(x-x0+1)*3] = bytes(codes[code]["rgb"])
        yield row


def image_rows(file, width, height):
    """Stream opaque, noninterlaced RGB8 PNG, including editor filters 0..4."""
    with file.open("rb") as stream:
        def read(size):
            data = stream.read(size)
            if len(data) != size:
                raise ValueError("Truncated PNG")
            return data
        if read(8) != b"\x89PNG\r\n\x1a\n":
            raise ValueError("Invalid PNG signature")
        inflater, pending = zlib.decompressobj(), bytearray()
        stride, previous, count, state = width * 3, bytearray(width * 3), 0, 0
        header, palette = False, False
        while True:
            length, kind = struct.unpack(">I4s", read(8))
            if length > 0x7fffffff or not re.fullmatch(rb"[A-Za-z]{2}[A-Z][A-Za-z]", kind):
                raise ValueError("Invalid PNG chunk")
            if not header and kind != b"IHDR":
                raise ValueError("IHDR must be first")
            if kind == b"IHDR" and (header or length != 13):
                raise ValueError("Invalid IHDR")
            if kind == b"IEND" and length:
                raise ValueError("IEND must be empty")
            if kind in (b"tRNS", b"acTL", b"fcTL", b"fdAT"):
                raise ValueError("River source must be opaque and static")
            if kind == b"PLTE":
                if palette or state or not length or length % 3 or length > 768:
                    raise ValueError("Invalid optional palette")
                palette = True
            elif kind not in (b"IHDR", b"IDAT", b"IEND") and not kind[0] & 32:
                raise ValueError("Unsupported critical PNG chunk")
            if kind == b"IDAT":
                if state == 2:
                    raise ValueError("Nonconsecutive IDAT")
                state = 1
            elif state == 1:
                state = 2
            crc, collected = zlib.crc32(kind), bytearray()
            remaining = length
            while remaining:
                data = read(min(remaining, 65536))
                remaining -= len(data)
                crc = zlib.crc32(data, crc)
                if kind == b"IHDR":
                    collected.extend(data)
                elif kind == b"IDAT":
                    while data:
                        pending.extend(inflater.decompress(data, 65536))
                        data = inflater.unconsumed_tail
                        if inflater.unused_data:
                            raise ValueError("Unused IDAT bytes")
                        while len(pending) >= stride + 1:
                            if count >= height:
                                raise ValueError("Too many decoded rows")
                            filter_type = pending[0]
                            if filter_type > 4:
                                raise ValueError("Invalid PNG filter")
                            row = bytearray(pending[1:stride+1])
                            del pending[:stride+1]
                            if filter_type:
                                for i in range(stride):
                                    a, b, c = (row[i-3] if i >= 3 else 0), previous[i], (previous[i-3] if i >= 3 else 0)
                                    if filter_type == 1:
                                        predictor = a
                                    elif filter_type == 2:
                                        predictor = b
                                    elif filter_type == 3:
                                        predictor = (a+b)//2
                                    else:
                                        p = a+b-c
                                        da, db, dc = abs(p-a), abs(p-b), abs(p-c)
                                        predictor = a if da <= db and da <= dc else b if db <= dc else c
                                    row[i] = (row[i] + predictor) & 255
                            yield row
                            previous, count = row, count+1
            if struct.unpack(">I", read(4))[0] != crc:
                raise ValueError("PNG CRC mismatch")
            if kind == b"IHDR":
                if struct.unpack(">IIBBBBB", collected) != (width, height, 8, 2, 0, 0, 0):
                    raise ValueError("PNG dimensions or format differ from metadata")
                header = True
            elif kind == b"IEND":
                if not inflater.eof or pending or count != height or stream.read(1):
                    raise ValueError("Incomplete or trailing PNG data")
                break


def derive_from_image(image, metadata_file, grid_file, output):
    """Create only distribution tiles; authoritative image/table are inputs."""
    start = time.monotonic()
    output.mkdir(parents=True, exist_ok=False)
    try:
        metadata_bytes = metadata_file.read_bytes()
        metadata_sha = hashlib.sha256(metadata_bytes).hexdigest()
        metadata = json.loads(metadata_bytes)
        projection, width, height, _ = load_grid(grid_file)
        grid_sha = digest(grid_file)
        if metadata["projection"] != projection or (metadata["width"], metadata["height"]) != (width, height) or metadata["gridSha256"] != grid_sha:
            raise ValueError("Projection/grid differs from declared authoritative metadata")
        expected_sha = metadata.get("sha256", "")
        if not re.fullmatch(r"[0-9a-f]{64}", expected_sha) or digest(image) != expected_sha:
            raise ValueError("Image SHA mismatch; update metadata.sha256 explicitly after editing")
        size = metadata["tile"]
        if not isinstance(size, int) or size <= 0 or width * min(size, height) * 3 > 256 * 1024 * 1024:
            raise ValueError("Invalid tile size or tile band exceeds 256 MiB")
        encoding = metadata["encoding"]
        if (encoding["name"] != "kuniezu-river-membership-rgb-v1" or encoding["bitDepth"] != 8 or encoding["colourType"] != 2 or encoding["noRiverRGB"] != [0, 0, 0]):
            raise ValueError("Unsupported authoritative river encoding")
        features = {row["id"]: row for row in metadata["features"]}
        if len(features) != len(metadata["features"]) or any(not isinstance(i, int) or i <= 0 for i in features):
            raise ValueError("Invalid feature identities")
        codes, by_rgb, memberships = {}, {}, set()
        for row in encoding["codes"]:
            code, colour, members = row["code"], row["rgb"], row["featureIds"]
            if (not isinstance(code, int) or not 0 <= code < (1 << 24) or colour != rgb(code)
                    or code in codes or members != sorted(set(members)) or any(i not in features for i in members)
                    or tuple(members) in memberships or bool(code) != bool(members)):
                raise ValueError("Invalid membership colour table")
            codes[code] = row
            by_rgb[bytes(colour)] = code
            memberships.add(tuple(members))
        if 0 not in codes:
            raise ValueError("Missing empty river colour")
        (output / "tiles").mkdir()
        tile_files, histogram, feature_pixels = [], Counter(), Counter()
        nonzero = re.compile(rb"[^\x00]")
        tile_band, current_band, peak_band = {}, -1, 0
        def flush_band():
            for col, pixels in sorted(tile_band.items()):
                w, h = min(size, width-col*size), min(size, height-current_band*size)
                file = output / "tiles" / f"{col}-{current_band}.png"
                write_png(file, w, h, (pixels[y*w*3:(y+1)*w*3] for y in range(h)))
                tile_files.append({"file": "tiles/"+file.name, "col": col, "row": current_band, "width": w, "height": h, "sha256": digest(file)})
        for y, row in enumerate(image_rows(image, width, height)):
            band = y // size
            if band != current_band:
                flush_band()
                tile_band, current_band = {}, band
            columns, previous_pixel, nonempty_count = set(), -1, 0
            for match in nonzero.finditer(row):
                x = match.start() // 3
                if x == previous_pixel:
                    continue
                previous_pixel = x
                colour = bytes(row[x*3:(x+1)*3])
                if colour not in by_rgb:
                    raise ValueError(f"Unknown river colour at {x},{y}: {list(colour)}")
                code = by_rgb[colour]
                histogram[code] += 1
                feature_pixels.update(codes[code]["featureIds"])
                columns.add(x // size)
                nonempty_count += 1
            histogram[0] += width-nonempty_count
            for col in columns:
                w, h = min(size, width-col*size), min(size, height-band*size)
                if col not in tile_band:
                    tile_band[col] = bytearray(w*h*3)
                local = y % size
                tile_band[col][local*w*3:(local+1)*w*3] = row[col*size*3:(col*size+w)*3]
            peak_band = max(peak_band, sum(len(buffer) for buffer in tile_band.values()))
        flush_band()
        if digest(image) != expected_sha or metadata_file.read_bytes() != metadata_bytes or digest(grid_file) != grid_sha:
            raise ValueError("Authoritative inputs changed during tile generation")
        result = {"schemaVersion": 2, "generated": "tools/map/build-river-raster.py", "mode": "from-image", "ok": True,
                  "width": width, "height": height, "tile": size, "projection": projection, "gridSha256": grid_sha,
                  "sourceImage": {"path": str(image.resolve()), "sha256": expected_sha},
                  "sourceMetadata": {"path": str(metadata_file.resolve()), "sha256": metadata_sha},
                  "sourceGrid": {"path": str(grid_file.resolve()), "sha256": grid_sha},
                  "encoding": {**encoding, "codes": [{**row, "pixels": histogram[row["code"]]} for row in codes.values()]},
                  "features": [{**row, "pixels": feature_pixels[row["id"]]} for row in features.values()],
                  "basis": metadata.get("basis"), "license": metadata.get("license"), "attribution": metadata.get("attribution"),
                  "tiles": tile_files, "statistics": {"pixels": width*height, "riverPixels": width*height-histogram[0],
                      "multiFeaturePixels": sum(count for code, count in histogram.items() if len(codes[code]["featureIds"]) > 1)},
                  "peakTileBandBytes": peak_band, "elapsedSeconds": round(time.monotonic()-start, 3),
                  "authority": "Source PNG + explicit membership table + projection; no JS/source polyline inputs were read",
                  "editContract": "Update authoritative metadata.sha256 explicitly after editing RGB pixels. Update the membership table only when introducing a new defined colour. Source-line observations are not regenerated from edits."}
        write_json(output / "manifest.json", result)
        return result
    except Exception as error:
        write_json(output / "failure.json", {"ok": False, "error": type(error).__name__, "message": str(error), "partialOutputsRetained": True})
        raise


def build(grid_file, source_file, output, tiles=False):
    start = time.monotonic()
    output.mkdir(parents=True, exist_ok=False)
    try:
        projection, width, height, size = load_grid(grid_file)
        source = load_source(source_file)
        source["inputs"].append({"path": str(grid_file.resolve()), "sha256": digest(grid_file)})
        write_json(output / "source.json", source)
        source_hash = digest(output / "source.json")
        rivers = source["rivers"]
        names = sorted({river["name"] for river in rivers})
        ids = {name: index for index, name in enumerate(names, 1)}
        owners, ways, stats = {}, [], Counter()
        for index, river in enumerate(rivers):
            if len(river["points"]) < 2:
                raise ValueError(f"River needs two vertices: {index}")
            points = [project(point, projection) for point in river["points"]]
            outside = sum(not (0 <= x < width and 0 <= y < height) for x, y in points)
            stats["vertices"] += len(points)
            stats["outsideVertices"] += outside
            line_set, visits = set(), 0
            for a, b in zip(points, points[1:]):
                stats["segments"] += 1
                clipped = clip_segment(a, b, width, height)
                if clipped is None:
                    stats["outsideSegments"] += 1
                    continue
                if any(not (0 <= x < width and 0 <= y < height) for x, y in (a, b)):
                    stats["clippedSegments"] += 1
                for x, y in line_pixels(*clipped):
                    line_set.add(y * width + x)
                    visits += 1
            for key in line_set:
                owners.setdefault(key, set()).add(index)
            stats["segmentPixelVisits"] += visits
            stats["withinLineRepeatedVisits"] += visits - len(line_set)
            ways.append({"index": index, "id": river["id"], "part": river.get("part", 0),
                         "name": river["name"], "featureId": ids[river["name"]],
                         "origin": river.get("origin"), "vertices": len(points),
                         "outsideVertices": outside, "pixels": len(line_set)})
        memberships = {key: tuple(sorted({ways[i]["featureId"] for i in indices})) for key, indices in owners.items()}
        combinations = sorted(set(memberships.values()) - {(i,) for i in ids.values()})
        members_to_code = {(i,): i for i in ids.values()}
        members_to_code.update({members: len(ids) + i + 1 for i, members in enumerate(combinations)})
        if max(members_to_code.values(), default=0) >= 1 << 24:
            raise ValueError("River membership colour space exhausted")
        codes = {0: {"code": 0, "rgb": [0, 0, 0], "featureIds": [], "pixels": width * height - len(owners)}}
        code_counts = Counter(members_to_code[members] for members in memberships.values())
        for members, code in members_to_code.items():
            codes[code] = {"code": code, "rgb": rgb(code), "featureIds": list(members), "pixels": code_counts[code]}
        rows, overlaps = defaultdict(list), []
        for key, members in sorted(memberships.items()):
            y, x = divmod(key, width)
            code = members_to_code[members]
            rows[y].append((x, code))
            if len(owners[key]) > 1:
                overlaps.append({"pixel": [x, y], "lineIndices": sorted(owners[key]), "featureIds": list(members), "code": code})
        stats["lineRecords"] = len(rivers)
        stats["uniqueGroups"] = len(ids)
        stats["rasterPixels"] = len(owners)
        stats["crossGroupPixels"] = sum(len(row["featureIds"]) > 1 for row in overlaps)
        stats["multiLinePixels"] = len(overlaps)
        stats["repeatedLinePixelMemberships"] = sum(len(value) - 1 for value in owners.values())
        write_json(output / "overlaps.json", {"note": "Source-line coincidences, not assertions of confluences or duplicate historical channels", "pixels": overlaps})
        write_png(output / "rivers.png", width, height, rows_for(width, height, rows, codes))
        tile_files = []
        if tiles:
            (output / "tiles").mkdir()
            occupied = sorted({(x // size, y // size) for y, row in rows.items() for x, _ in row})
            for col, row in occupied:
                w, h = min(size, width-col*size), min(size, height-row*size)
                file = output / "tiles" / f"{col}-{row}.png"
                write_png(file, w, h, rows_for(w, h, rows, codes, col*size, row*size))
                tile_files.append({"file": "tiles/" + file.name, "col": col, "row": row, "width": w, "height": h, "sha256": digest(file)})
        for record in source["inputs"]:
            if digest(record["path"]) != record["sha256"]:
                raise ValueError("Input changed during generation: " + record["path"])
        feature_pixels = Counter()
        for members in memberships.values():
            feature_pixels.update(members)
        result = {"schemaVersion": 2, "generated": "tools/map/build-river-raster.py", "ok": True,
                  "width": width, "height": height, "tile": size, "projection": projection,
                  "gridSha256": digest(grid_file), "inputSha256": source_hash, "inputs": source["inputs"],
                  "source": "source.json", "sourceFileSha256": source_hash, "basis": source.get("basis"),
                  "attribution": source.get("sourceAttribution", source.get("attribution")), "license": source.get("license"),
                  "image": "rivers.png", "sha256": digest(output / "rivers.png"), "encoding": {
                      "name": "kuniezu-river-membership-rgb-v1", "bitDepth": 8, "colourType": 2,
                      "noRiverRGB": [0, 0, 0], "codes": list(codes.values()), "ck3Compatible": False,
                      "meaning": "One-pixel source centerlines; colour identifies all feature memberships at that pixel, not width, depth, flow direction, or historical certainty"},
                  "rasterization": "Liang-Barsky clip to half-open rectangle, floor to pixels, Bresenham per original segment; no smoothing, snapping, bridging, or land clipping",
                  "features": [{"id": identifier, "name": name, "pixels": feature_pixels[identifier]} for name, identifier in ids.items()],
                  "ways": ways, "overlaps": "overlaps.json", "overlapsSha256": digest(output / "overlaps.json"),
                  "statistics": dict(stats), "tiles": tile_files, "elapsedSeconds": round(time.monotonic()-start, 3),
                  "limits": "Modern reference lines retain legacy approximate/detail coincidences. Overlap membership preserves evidence without declaring all contacts to be real confluences. Cosmetic runtime curve smoothing is not baked into authoritative geometry."}
        write_json(output / "manifest.json", result)
        return result
    except Exception as error:
        write_json(output / "failure.json", {"ok": False, "error": type(error).__name__, "message": str(error), "partialOutputsRetained": True})
        raise


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", type=Path, nargs="*", help="Migration: GRID SOURCE OUTPUT; derivation: OUTPUT")
    parser.add_argument("--from-image", type=Path, help="Authoritative RGB8 PNG; normal tile derivation mode")
    parser.add_argument("--manifest", type=Path, help="Authoritative colour table and explicit image SHA")
    parser.add_argument("--grid", type=Path, help="Authoritative projection.json for independent grid validation")
    parser.add_argument("--tiles", action="store_true", help="Also emit sparse derivative tiles")
    args = parser.parse_args()
    if args.from_image:
        if len(args.paths) != 1 or not args.manifest or not args.grid or args.tiles:
            parser.error("--from-image requires --manifest, --grid and one NEW_OUTPUT path")
        report = derive_from_image(args.from_image, args.manifest, args.grid, args.paths[0])
    else:
        if len(args.paths) != 3 or args.manifest or args.grid:
            parser.error("Initial migration requires GRID SOURCE NEW_OUTPUT")
        report = build(*args.paths, tiles=args.tiles)
    print(json.dumps({"ok": True, "output": str(args.paths[-1]), "sha256": report.get("sha256", report.get("sourceImage", {}).get("sha256")), "statistics": report["statistics"]}, ensure_ascii=False))
