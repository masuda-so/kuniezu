"""Independent river raster verification and small regression fixtures.

No generator imports: source segments use Cohen-Sutherland clipping and a
major-axis integer DDA, independently of its Liang-Barsky/Bresenham algorithm.
The RGB image is checked row by row without allocating a full raster.
"""
import argparse
from collections import Counter, defaultdict
import hashlib
import json
import math
from pathlib import Path
import re
import resource
import struct
import subprocess
import sys
import tempfile
import zlib


def sha(file):
    result = hashlib.sha256()
    with Path(file).open("rb") as stream:
        for data in iter(lambda: stream.read(1 << 20), b""):
            result.update(data)
    return result.hexdigest()


def require(condition, message):
    if not condition:
        raise ValueError(message)


def projected(point, p):
    return (((point[0] - p["LON0"]) * p["K"] * p["CX"] - p["origin"][0]) / p["stepUnits"],
            ((p["LAT0"] - point[1]) * p["K"] - p["origin"][1]) / p["stepUnits"])


def reference_clip(a, b, width, height):
    x0, y0 = a
    x1, y1 = b
    right, bottom = math.nextafter(float(width), -math.inf), math.nextafter(float(height), -math.inf)
    def outcode(x, y):
        return (1 if x < 0 else 2 if x > right else 0) | (4 if y < 0 else 8 if y > bottom else 0)
    for _ in range(12):
        c0, c1 = outcode(x0, y0), outcode(x1, y1)
        if not (c0 | c1):
            return ((min(width-1, max(0, math.floor(x0))), min(height-1, max(0, math.floor(y0)))),
                    (min(width-1, max(0, math.floor(x1))), min(height-1, max(0, math.floor(y1)))))
        if c0 & c1:
            return None
        selected = c0 or c1
        if selected & 8:
            x, y = x0 + (x1-x0) * (bottom-y0) / (y1-y0), bottom
        elif selected & 4:
            x, y = x0 + (x1-x0) * -y0 / (y1-y0), 0.0
        elif selected & 2:
            x, y = right, y0 + (y1-y0) * (right-x0) / (x1-x0)
        else:
            x, y = 0.0, y0 + (y1-y0) * -x0 / (x1-x0)
        if selected == c0:
            x0, y0 = x, y
        else:
            x1, y1 = x, y
    raise ValueError("Reference clipping did not converge")


def reference_pixels(a, b):
    dx, dy = b[0]-a[0], b[1]-a[1]
    n = max(abs(dx), abs(dy))
    if n == 0:
        yield a
        return
    sx, sy = (1 if dx >= 0 else -1), (1 if dy >= 0 else -1)
    for i in range(n+1):
        yield (a[0] + sx * ((2 * abs(dx) * i + n) // (2 * n)),
               a[1] + sy * ((2 * abs(dy) * i + n) // (2 * n)))


def png_rows(file, width, height):
    """Independent RGB8 decoder, including all standard row filters."""
    with file.open("rb") as stream:
        def read(n):
            data = stream.read(n)
            require(len(data) == n, "Truncated PNG: " + str(file))
            return data
        require(read(8) == b"\x89PNG\r\n\x1a\n", "Bad PNG signature")
        inflater, pending, count, header, ended_data = zlib.decompressobj(), bytearray(), 0, False, False
        seen_data = False
        previous = bytes(width*3)
        while True:
            length, kind = struct.unpack(">I4s", read(8))
            require(length <= 0x7fffffff, "Invalid PNG chunk size")
            crc, collected = zlib.crc32(kind), bytearray()
            require(header or kind == b"IHDR", "IHDR not first")
            if kind == b"IDAT":
                require(not ended_data, "Nonconsecutive IDAT")
                seen_data = True
            elif seen_data:
                ended_data = True
            while length:
                data = read(min(length, 65536))
                length -= len(data)
                crc = zlib.crc32(data, crc)
                if kind == b"IDAT":
                    while data:
                        decoded = inflater.decompress(data, 65536)
                        data = inflater.unconsumed_tail
                        require(not inflater.unused_data, "Trailing compressed data")
                        pending.extend(decoded)
                        stride = width * 3 + 1
                        while len(pending) >= stride:
                            require(count < height, "Too many PNG rows")
                            kind_filter = pending[0]
                            require(kind_filter <= 4, "Invalid PNG row filter")
                            row = bytearray(pending[1:stride])
                            if kind_filter:
                                for x in range(width*3):
                                    left = row[x-3] if x >= 3 else 0
                                    above, upper_left = previous[x], previous[x-3] if x >= 3 else 0
                                    prediction = left if kind_filter == 1 else above if kind_filter == 2 else (left+above)//2
                                    if kind_filter == 4:
                                        estimate = left+above-upper_left
                                        values = [left, above, upper_left]
                                        prediction = min(enumerate(values), key=lambda pair: (abs(estimate-pair[1]), pair[0]))[1]
                                    row[x] = (row[x]+prediction) % 256
                            previous = bytes(row)
                            yield previous
                            del pending[:stride]
                            count += 1
                elif kind == b"IHDR":
                    collected.extend(data)
            require(struct.unpack(">I", read(4))[0] == crc, "PNG CRC mismatch")
            if kind == b"IHDR":
                require(not header and len(collected) == 13, "Invalid IHDR")
                require(struct.unpack(">IIBBBBB", collected) == (width, height, 8, 2, 0, 0, 0), "PNG grid/format mismatch")
                header = True
            elif kind == b"IEND":
                require(inflater.eof and not pending and count == height, "Incomplete PNG raster")
                require(not stream.read(1), "Trailing bytes after IEND")
                break
            elif kind != b"IDAT":
                require(kind[0] & 32, "Unexpected critical PNG chunk")


def verify(directory):
    m = json.loads((directory / "manifest.json").read_text())
    if m.get("mode") == "from-image":
        return verify_image_derivatives(directory, m)
    width, height, p = m["width"], m["height"], m["projection"]
    source_file = directory / m["source"]
    require(sha(source_file) == m["sourceFileSha256"], "Source hash differs")
    source = json.loads(source_file.read_text())
    for record in m["inputs"]:
        require(sha(record["path"]) == record["sha256"], "Input changed: " + record["path"])
    require(m["inputs"] == source["inputs"], "Source input provenance differs")
    grid_inputs = [record for record in m["inputs"] if record["sha256"] == m["gridSha256"]]
    require(bool(grid_inputs), "Grid input provenance missing")
    grid = json.loads(Path(grid_inputs[-1]["path"]).read_text())
    require(grid.get("projection", grid) == p and (grid["width"], grid["height"]) == (width, height), "Projection differs from original grid")
    require(sha(directory / m["overlaps"]) == m["overlapsSha256"], "Overlap hash differs")
    codes = m["encoding"]["codes"]
    require(m["encoding"]["ck3Compatible"] is False, "Unexpected compatibility claim")
    require(codes[0]["rgb"] == [0, 0, 0] and codes[0]["featureIds"] == [], "Wrong empty colour")
    lookup = {tuple(row["featureIds"]): row for row in codes}
    require(len(lookup) == len(codes), "Repeated membership code")
    require(len({tuple(row["rgb"]) for row in codes}) == len(codes), "Repeated RGB colour")
    for row in codes:
        value = row["code"] * 0x9e3779 % (1 << 24)
        require(row["rgb"] == list(value.to_bytes(3, "big")), "Invalid code colour")
    features = {row["name"]: row["id"] for row in m["features"]}
    require(features == {name: i+1 for i, name in enumerate(sorted({r["name"] for r in source["rivers"]}))}, "Feature identity differs")
    owners, line_counts, visits = {}, [], 0
    for index, river in enumerate(source["rivers"]):
        points, line_set = [projected(point, p) for point in river["points"]], set()
        for a, b in zip(points, points[1:]):
            clipped = reference_clip(a, b, width, height)
            if clipped:
                for x, y in reference_pixels(*clipped):
                    line_set.add(y*width+x)
                    visits += 1
        line_counts.append(len(line_set))
        for key in line_set:
            owners.setdefault(key, set()).add(index)
    rows, histogram, overlaps, feature_counts = defaultdict(list), Counter(), [], Counter()
    for key, lines in sorted(owners.items()):
        y, x = divmod(key, width)
        members = tuple(sorted({features[source["rivers"][i]["name"]] for i in lines}))
        require(members in lookup, "Missing source overlap membership")
        code = lookup[members]
        feature_counts.update(members)
        rows[y].append((x, bytes(code["rgb"])))
        histogram[code["code"]] += 1
        if len(lines) > 1:
            overlaps.append({"pixel": [x, y], "lineIndices": sorted(lines), "featureIds": list(members), "code": code["code"]})
    require(json.loads((directory / m["overlaps"]).read_text())["pixels"] == overlaps, "Source overlap membership differs")
    require([row["pixels"] for row in m["ways"]] == line_counts, "Per-line pixel counts differ")
    for way, river in zip(m["ways"], source["rivers"]):
        require((way["id"], way["part"], way["name"], way["origin"]) ==
                (river["id"], river.get("part", 0), river["name"], river.get("origin")), "Source-line identity differs")
    require(all(row["pixels"] == feature_counts[row["id"]] for row in m["features"]), "Feature pixel counts differ")
    require(m["statistics"]["segmentPixelVisits"] == visits, "Segment visit counts differ")
    require(m["statistics"]["rasterPixels"] == len(owners), "River pixel count differs")
    require(m["statistics"]["crossGroupPixels"] == sum(len(r["featureIds"]) > 1 for r in overlaps), "Cross-group contact count differs")
    require(m["statistics"]["multiLinePixels"] == len(overlaps), "Multi-line contact count differs")
    histogram[0] = width*height-len(owners)
    require(all(row["pixels"] == histogram[row["code"]] for row in codes), "Colour pixel counts differ")
    compared = 0
    for y, row in enumerate(png_rows(directory / m["image"], width, height)):
        expected = bytearray(width*3)
        for x, colour in rows[y]:
            expected[x*3:(x+1)*3] = colour
        if row != expected:
            i = next(i for i, (a, b) in enumerate(zip(row, expected)) if a != b)
            raise ValueError(f"Pixel differs from original source at {i//3},{y}")
        compared += width
    require(compared == width*height, "Not all pixels compared")
    require(sha(directory / m["image"]) == m["sha256"], "PNG hash differs")
    # Optional tile output must equal exactly the corresponding source pixels.
    for tile in m["tiles"]:
        x0, y0 = tile["col"]*m["tile"], tile["row"]*m["tile"]
        file = directory / tile["file"]
        for y, row in enumerate(png_rows(file, tile["width"], tile["height"])):
            expected = bytearray(tile["width"]*3)
            for x, colour in rows[y0+y]:
                if x0 <= x < x0+tile["width"]:
                    expected[(x-x0)*3:(x-x0+1)*3] = colour
            require(row == expected, "Tile/source mismatch: " + tile["file"])
        require(sha(file) == tile["sha256"], "Tile hash differs")
    return {"ok": True, "comparedPixels": compared, "riverPixels": len(owners),
            "lineRecords": len(source["rivers"]), "vertices": sum(len(r["points"]) for r in source["rivers"]),
            "crossGroupPixels": sum(len(r["featureIds"]) > 1 for r in overlaps),
            "tiles": len(m["tiles"]), "sha256": m["sha256"],
            "peakRssBytes": resource.getrusage(resource.RUSAGE_SELF).ru_maxrss * (1 if sys.platform == "darwin" else 1024),
            "method": "Independent Cohen-Sutherland + integer DDA, exact RGB on every pixel, source ownership/overlap table and optional tile agreement"}


def verify_image_derivatives(directory, m):
    """Validate edited image -> tiles without source-line or JS data."""
    for key in ("sourceImage", "sourceMetadata", "sourceGrid"):
        require(sha(m[key]["path"]) == m[key]["sha256"], "Authoritative input hash differs: " + key)
    authority = json.loads(Path(m["sourceMetadata"]["path"]).read_text())
    grid = json.loads(Path(m["sourceGrid"]["path"]).read_text())
    require(authority["sha256"] == m["sourceImage"]["sha256"], "Image SHA differs from authority")
    require(grid.get("projection", grid) == m["projection"] == authority["projection"], "Projection differs")
    width, height, size = m["width"], m["height"], m["tile"]
    require((width, height) == (authority["width"], authority["height"]) == (grid["width"], grid["height"]), "Grid size differs")
    require([{k: v for k, v in row.items() if k != "pixels"} for row in m["encoding"]["codes"]] ==
            [{k: v for k, v in row.items() if k != "pixels"} for row in authority["encoding"]["codes"]], "Membership table changed")
    colours = {bytes(row["rgb"]): row for row in m["encoding"]["codes"]}
    rows, histogram, occupied = defaultdict(dict), Counter(), set()
    nonzero = re.compile(rb"[^\x00]")
    count = 0
    for y, row in enumerate(png_rows(Path(m["sourceImage"]["path"]), width, height)):
        positions = {match.start()//3 for match in nonzero.finditer(row)}
        for x in positions:
            colour = row[x*3:(x+1)*3]
            require(colour in colours, f"Undefined authoritative colour at {x},{y}")
            rows[y][x] = colour
            histogram[colours[colour]["code"]] += 1
            occupied.add((x//size, y//size))
        histogram[0] += width-len(positions)
        count += width
    require(count == width*height, "Source image incomplete")
    require(all(row["pixels"] == histogram[row["code"]] for row in m["encoding"]["codes"]), "Image colour counts differ")
    require({(tile["col"], tile["row"]) for tile in m["tiles"]} == occupied, "Missing or extra nonempty tile")
    require(len(m["tiles"]) == len(occupied), "Repeated tile entry")
    compared = 0
    for tile in m["tiles"]:
        col, ty = tile["col"], tile["row"]
        w, h = min(size, width-col*size), min(size, height-ty*size)
        require((w, h) == (tile["width"], tile["height"]), "Tile dimensions differ")
        file = directory / tile["file"]
        for y, row in enumerate(png_rows(file, w, h)):
            expected = bytearray(w*3)
            for x, colour in rows[ty*size+y].items():
                if col*size <= x < col*size+w:
                    expected[(x-col*size)*3:(x-col*size+1)*3] = colour
            require(row == expected, "Derived tile differs from image: " + tile["file"])
            compared += w
        require(sha(file) == tile["sha256"], "Derived tile hash differs")
    return {"ok": True, "mode": "from-image", "comparedSourcePixels": count, "comparedTilePixels": compared,
            "tiles": len(m["tiles"]), "riverPixels": count-histogram[0], "sourceSha256": m["sourceImage"]["sha256"],
            "lineInputsRead": False, "peakRssBytes": resource.getrusage(resource.RUSAGE_SELF).ru_maxrss*(1 if sys.platform == "darwin" else 1024)}


def self_test():
    generator = Path(__file__).resolve().parents[1] / "map/build-river-raster.py"
    tested = []
    with tempfile.TemporaryDirectory(prefix="kuniezu-river-fixtures-") as temp:
        root = Path(temp)
        grid = {"K": 1, "CX": 1, "LON0": 0, "LAT0": 0, "origin": [0, 0], "stepUnits": 1, "width": 9, "height": 7, "tile": 3}
        (root / "grid.json").write_text(json.dumps(grid))
        def river(name, points):
            return {"id": name, "name": name, "part": 0, "points": [[x, -y] for x, y in points]}
        rivers = [river("horizontal", [(-3, 3.2), (12, 3.2)]), river("vertical", [(4.2, -4), (4.2, 12)]),
                  river("diagonal", [(-1, -1), (10, 10)]), river("horizontal", [(2.2, 3.2), (6.2, 3.2)]),
                  river("outside", [(-4, 1), (-3, 5)]), river("edge", [(9, 0), (9, 6)]),
                  river("excursion", [(1.2, 0.2), (-3, 1), (-3, 5), (1.2, 6.2)]),
                  river("zero", [(2.2, 2.2), (2.2, 2.2)])]
        # Exercise all octants, reversed directions and exact half-pixel ties.
        for dx, dy in [(4, 2), (2, 4), (-4, 2), (-2, 4), (4, -2), (2, -4), (-4, -2), (-2, -4)]:
            rivers.append(river("octants", [(4.2, 3.2), (4.2+dx, 3.2+dy)]))
        source = {"basis": "fixture", "source": "synthetic", "license": "test", "attribution": "test", "rivers": rivers}
        (root / "source.json").write_text(json.dumps(source))
        output = root / "result"
        command = [sys.executable, str(generator), str(root / "grid.json"), str(root / "source.json"), str(output), "--tiles"]
        subprocess.run(command, check=True, capture_output=True)
        result = verify(output)
        require(result["comparedPixels"] == 63 and result["crossGroupPixels"] > 0, "Fixture did not exercise contacts")
        tested.extend(["all octants and directional ties", "outside endpoints crossing rectangle", "outside segments do not bridge", "right boundary excluded", "confluences retain every feature", "same-feature overlap retains every source line", "repeated point", "single image and tile seams agree"])
        # Existing output must remain untouched, even when rerun.
        original = sha(output / "rivers.png")
        require(subprocess.run(command, capture_output=True).returncode != 0, "Output overwrite accepted")
        require(sha(output / "rivers.png") == original, "Prior output altered")
        tested.append("existing output cannot be overwritten")
        image = output / "rivers.png"
        old = image.read_bytes()
        corrupted = bytearray(old)
        corrupted[-1] ^= 1
        image.write_bytes(corrupted)
        try:
            verify(output)
        except ValueError as error:
            require("CRC" in str(error), "Wrong failure for corrupt PNG")
        else:
            raise ValueError("CRC corruption accepted")
        image.write_bytes(old)
        tested.append("PNG corruption rejected")
        # Re-encode one wrong pixel with valid CRC/zlib: content checking must
        # catch this independently of the PNG/file-hash integrity checks.
        decoded = list(png_rows(image, 9, 7))
        first = bytearray(decoded[0])
        first[:3] = b"\xff\xff\xff"
        decoded[0] = bytes(first)
        def chunk(kind, data):
            return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind+data))
        wrong = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", 9, 7, 8, 2, 0, 0, 0))
        wrong += chunk(b"IDAT", zlib.compress(b"".join(b"\0"+row for row in decoded))) + chunk(b"IEND", b"")
        image.write_bytes(wrong)
        try:
            verify(output)
        except ValueError as error:
            require("Pixel differs from original source" in str(error), "Wrong failure for forged pixel")
        else:
            raise ValueError("Forged pixel accepted")
        image.write_bytes(old)
        tested.append("valid PNG with invented river pixel rejected")
        manifest_path, overlap_path = output / "manifest.json", output / "overlaps.json"
        manifest_bytes, overlap_bytes = manifest_path.read_bytes(), overlap_path.read_bytes()
        overlap_data = json.loads(overlap_bytes)
        overlap_data["pixels"].pop()
        overlap_path.write_text(json.dumps(overlap_data))
        modified_manifest = json.loads(manifest_bytes)
        modified_manifest["overlapsSha256"] = sha(overlap_path)
        manifest_path.write_text(json.dumps(modified_manifest))
        try:
            verify(output)
        except ValueError as error:
            require("Source overlap membership differs" in str(error), "Wrong failure for missing contact")
        else:
            raise ValueError("Missing source contact accepted")
        manifest_path.write_bytes(manifest_bytes)
        overlap_path.write_bytes(overlap_bytes)
        tested.append("lost overlap membership rejected even with matching metadata hash")
        original_source = (root / "source.json").read_bytes()
        (root / "source.json").write_bytes(original_source+b"\n")
        try:
            verify(output)
        except ValueError as error:
            require("Input changed" in str(error), "Wrong failure for changed input")
        else:
            raise ValueError("Changed input accepted")
        (root / "source.json").write_bytes(original_source)
        tested.append("changed original input rejected")
        # A standalone edited authority contains only PNG/table/projection.
        # Its former source.json path is deliberately unavailable.
        editable = root / "editable"
        editable.mkdir()
        edited_image, edited_meta, edited_grid = editable / "rivers.png", editable / "manifest.json", editable / "projection.json"
        edited_grid.write_bytes((root / "grid.json").read_bytes())
        authority = json.loads(manifest_bytes)
        original_rows = list(png_rows(image, 9, 7))
        edited_rows = [bytearray(row) for row in original_rows]
        added_colour = bytes(authority["encoding"]["codes"][1]["rgb"])
        require(original_rows[6][8*3:9*3] != added_colour, "Fixture edit was ineffective")
        edited_rows[6][8*3:9*3] = added_colour
        def encode_editor_rows(input_rows, w=9, h=7):
            encoded, prev = bytearray(), bytes(w*3)
            for y, source_row in enumerate(input_rows):
                f = y % 5
                encoded.append(f)
                for x, value in enumerate(source_row):
                    a, b, c = source_row[x-3] if x >= 3 else 0, prev[x], prev[x-3] if x >= 3 else 0
                    estimate = a+b-c
                    paeth = min(enumerate([a,b,c]), key=lambda pair: (abs(estimate-pair[1]), pair[0]))[1]
                    encoded.append((value-[0,a,b,(a+b)//2,paeth][f]) % 256)
                prev = source_row
            compressed = zlib.compress(encoded)
            split = len(compressed)//2
            return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
                    + chunk(b"tEXt", b"Software\x00fixture editor") + chunk(b"IDAT", compressed[:split])
                    + chunk(b"IDAT", compressed[split:]) + chunk(b"IEND", b""))
        edited_bytes = encode_editor_rows(edited_rows)
        edited_image.write_bytes(edited_bytes)
        edited_meta.write_bytes(manifest_bytes)
        (root / "source.json").unlink()
        def derive_command(target):
            return [sys.executable, str(generator), "--from-image", str(edited_image), "--manifest", str(edited_meta), "--grid", str(edited_grid), str(target)]
        def rejects_edited(name, expected):
            target = root / name
            result = subprocess.run(derive_command(target), capture_output=True)
            require(result.returncode != 0, "Invalid authority accepted: " + name)
            failure = json.loads((target / "failure.json").read_text())
            require(expected in failure["message"], "Wrong rejection reason: " + failure["message"])
        rejects_edited("stale-image-sha", "Image SHA mismatch")
        tested.append("edited image requires explicit SHA update")
        authority["sha256"] = sha(edited_image)
        edited_meta.write_text(json.dumps(authority))
        derived = root / "edited-tiles"
        subprocess.run(derive_command(derived), check=True, capture_output=True)
        edit_result = verify(derived)
        require(edit_result["lineInputsRead"] is False and not (editable / "source.json").exists(), "Unexpected line dependency")
        changed_tile = list(png_rows(derived / "tiles/2-2.png", 3, 1))[0]
        require(changed_tile[2*3:3*3] == added_colour, "Edited pixel did not propagate")
        tested.extend(["RGB filters 0..4 and split IDAT from external editor", "edited authority propagates without any former line input"])
        unknown_rows = [bytearray(row) for row in edited_rows]
        unknown_rows[0][:3] = b"\x01\x02\x03"
        edited_image.write_bytes(encode_editor_rows(unknown_rows))
        authority["sha256"] = sha(edited_image)
        edited_meta.write_text(json.dumps(authority))
        rejects_edited("unknown-authority-colour", "Unknown river colour")
        tested.append("undefined edited colour rejected")
        edited_image.write_bytes(encode_editor_rows([row[:8*3] for row in edited_rows], 8, 7))
        authority["sha256"] = sha(edited_image)
        edited_meta.write_text(json.dumps(authority))
        rejects_edited("wrong-authority-dimensions", "PNG dimensions")
        tested.append("edited dimensions rejected")
        edited_image.write_bytes(edited_bytes)
        authority["sha256"] = sha(edited_image)
        authority["projection"]["origin"][0] = 1
        edited_meta.write_text(json.dumps(authority))
        rejects_edited("wrong-authority-projection", "Projection/grid differs")
        tested.append("altered projection rejected")
        authority["projection"]["origin"][0] = 0
        edited_image.write_bytes(edited_bytes[:-8])
        authority["sha256"] = sha(edited_image)
        edited_meta.write_text(json.dumps(authority))
        rejects_edited("truncated-authority-image", "Truncated PNG")
        tested.append("truncated edited PNG rejected despite updated SHA")
        edited_image.unlink()
        rejects_edited("missing-authority-image", "No such file")
        tested.append("missing authoritative image rejected")
        (root / "source.json").write_bytes(original_source)
        source["rivers"][0]["points"][0] = [float("nan"), 0]
        (root / "invalid.json").write_text(json.dumps(source))
        failed = root / "failed"
        bad = [sys.executable, str(generator), str(root / "grid.json"), str(root / "invalid.json"), str(failed)]
        require(subprocess.run(bad, capture_output=True).returncode != 0, "Nonfinite vertex accepted")
        require((failed / "source.json").exists() and (failed / "failure.json").exists(), "Failure evidence discarded")
        tested.append("invalid input retains failure record and input snapshot")
    return {"ok": True, "selfTest": True, "cases": len(tested), "tests": tested}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path, nargs="?")
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    try:
        report = self_test() if args.self_test else verify(args.directory)
    except Exception as error:
        report = {"ok": False, "error": type(error).__name__, "message": str(error)}
    if args.output:
        args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(report, ensure_ascii=False))
    sys.exit(0 if report["ok"] else 1)
