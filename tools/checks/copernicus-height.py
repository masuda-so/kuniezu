"""Check streamed elevation masters, legacy tiles, provenance and failure safety."""
import argparse
from datetime import date
import importlib.util
from itertools import zip_longest
import json
from pathlib import Path
from tempfile import TemporaryDirectory

import numpy as np
from PIL import Image, TiffImagePlugin


spec = importlib.util.spec_from_file_location(
    "height_builder", Path(__file__).resolve().parents[1] / "map/build-copernicus-height.py")
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


def expect_failure(call, error):
    try:
        call()
    except error:
        return
    raise AssertionError(f"Expected {error.__name__}")


def geotiff(file, values, west):
    tags = TiffImagePlugin.ImageFileDirectory_v2()
    tags[33550] = (1 / values.shape[1], 1 / values.shape[0], 0.)
    tags[33922] = (0., 0., 0., float(west), 2., 0.)
    tags[34735] = (1, 1, 0, 2, 1025, 0, 1, 2, 2048, 0, 1, 4326)
    tags[42113] = "-9999"
    Image.fromarray(values.astype(np.float32)).save(file, tiffinfo=tags)


def sums(folder):
    (folder / "SHA256SUMS").write_text("".join(
        f"{builder.digest(f)}  {f.name}\n" for f in sorted(folder.glob("*.tif"))))


def assemble(folder, width, height, size):
    manifest = json.loads((folder / "manifest.json").read_text())
    result = np.zeros((height, width), dtype=np.uint16)
    for record in manifest["tiles"]:
        file = folder / record["file"]
        assert builder.digest(file) == record["sha256"]
        col, row = map(int, file.stem.split("-"))
        with Image.open(file) as im:
            data = np.asarray(im)
        assert int(np.count_nonzero(data)) == record["validPixels"]
        result[row * size:row * size + data.shape[0], col * size:col * size + data.shape[1]] = data
    return result


def fixtures():
    with TemporaryDirectory(prefix="kuniezu-height-check-") as scratch:
        root = Path(scratch)
        source = root / "inputs"
        source.mkdir()
        a = np.array([[-500, -499.75, 0, .25], [1, 2, 3, 4],
                      [5, 6, np.nan, 8], [-9999, 10, 11, 12]], dtype=np.float32)
        b = np.arange(100, 116, dtype=np.float32).reshape(4, 4)
        geotiff(source / "west.tif", a, 0)
        geotiff(source / "east.tif", b, 1)
        sums(source)
        p = {"K": 1, "CX": 1, "LON0": 0, "LAT0": 2, "origin": [0, 0],
             "stepUnits": .25, "stepMetres": 100}
        grid = root / "grid.json"
        grid.write_text(json.dumps({"projection": p, "width": 9, "height": 5, "tile": 3,
                                    "levels": [{"factor": 4, "width": 3, "height": 2},
                                               {"factor": 8, "width": 2, "height": 1}]}))
        projection = root / "projection.json"
        projection.write_text(json.dumps({**p, "width": 9, "height": 5}))
        # Hand-picked source cells exercise ties, one-degree seams, negative
        # heights, genuine zero metres, explicit NoData and missing footprints.
        indices = [0, 2, 2, 3]
        expected = np.zeros((5, 9), dtype=np.uint16)
        for x, values in ((0, a), (4, b)):
            selected = values[np.ix_(indices, indices)]
            expected[:4, x:x + 4] = np.array([
                [0 if not np.isfinite(v) or v == -9999 else round((float(v) + 500) * 4) + 1
                 for v in row] for row in selected], dtype=np.uint16)
        assert expected[0, 0] == 1 and expected[0, 1] == 2001
        assert expected[1, 1] == 0 and expected[3, 0] == 0
        master = root / "master"
        metadata = builder.build(grid, source, master, date(2026, 11, 3), 1,
                                 single_image=True, projection_file=projection, band_rows=2)
        with Image.open(master / "heightmap.png") as image:
            np.testing.assert_array_equal(np.asarray(image), expected)
        np.testing.assert_array_equal(np.stack(list(builder.read_master_rows(master / "heightmap.png", 9, 5))), expected)
        assert metadata["sha256"] == builder.digest(master / "heightmap.png")
        assert metadata["projectionSha256"] == builder.digest(projection)
        assert metadata["validPixels"] == np.count_nonzero(expected)
        assert len(metadata["sourceTiles"]) == 2 and metadata["license"] == builder.LICENSE
        legacy = root / "legacy"
        builder.build(grid, source, legacy, date(2026, 11, 3), 1)
        np.testing.assert_array_equal(assemble(legacy, 9, 5, 3), expected)
        for factor in (1, 4, 8):
            target = root / f"derived-{factor}"
            selected_input = master / "heightmap.png" if factor == 1 else master
            result = builder.build(grid, selected_input, target, None, factor, from_heightmap=True)
            xs = np.minimum(np.arange(result["width"]) * factor + factor // 2, 8)
            ys = np.minimum(np.arange(result["height"]) * factor + factor // 2, 4)
            np.testing.assert_array_equal(assemble(target, result["width"], result["height"], 3), expected[np.ix_(ys, xs)])
            assert result["sourceHeightmapSha256"] == metadata["sha256"]
        old_hash = builder.digest(master / "heightmap.png")
        expect_failure(lambda: builder.build(grid, source, master, date.today(), 1, single_image=True), FileExistsError)
        assert old_hash == builder.digest(master / "heightmap.png")
        projection.write_text(json.dumps({**p, "origin": [1, 0], "width": 9, "height": 5}))
        expect_failure(lambda: builder.build(grid, source, root / "bad-grid", date.today(), 1,
                                            single_image=True, projection_file=projection), ValueError)
        assert not (root / "bad-grid").exists()
        # Failure after staging begins must leave no visible partial directory.
        b[0, 0] = 20000
        geotiff(source / "east.tif", b, 1)
        sums(source)
        expect_failure(lambda: builder.build(grid, source, root / "overflow", date.today(), 1,
                                            single_image=True, band_rows=1), ValueError)
        assert not (root / "overflow").exists() and not list(root.glob(".overflow-*"))
        # Metadata hash is updated deliberately, so this tests PNG CRC handling,
        # not only the earlier file hash guard.
        png = master / "heightmap.png"
        content = bytearray(png.read_bytes())
        content[-1] ^= 1
        png.write_bytes(content)
        metadata["sha256"] = builder.digest(png)
        (master / "heightmap.json").write_text(json.dumps(metadata))
        expect_failure(lambda: builder.build(grid, master, root / "bad-png", None, 1, from_heightmap=True), ValueError)
        assert not (root / "bad-png").exists() and not list(root.glob(".bad-png-*"))
        # Multiple IDAT chunks and bounded decompression are checked independently
        # using Pillow as the decoder, including high entropy 16-bit samples.
        rng = np.random.default_rng(31)
        wide = rng.integers(0, 65536, (65, 17000), dtype=np.uint16)
        file = root / "multiple-idat.png"
        builder.write_height_png(file, 17000, 65, iter(wide), "none")
        assert file.read_bytes().count(b"IDAT") >= 2
        with Image.open(file) as image:
            np.testing.assert_array_equal(np.asarray(image), wide)
        np.testing.assert_array_equal(np.stack(list(builder.read_master_rows(file, 17000, 65))), wide)
        small = rng.integers(0, 65536, (17, 71), dtype=np.uint16)
        for kind in ("none", "sub", "up", "average", "paeth", "adaptive"):
            filtered = root / f"{kind}.png"
            builder.write_height_png(filtered, 71, 17, iter(small), kind)
            with Image.open(filtered) as image:
                np.testing.assert_array_equal(np.asarray(image), small)
            np.testing.assert_array_equal(np.stack(list(builder.read_master_rows(filtered, 71, 17))), small)
            if kind in ("average", "paeth"):
                fast = builder.fast_unfilter
                try:
                    builder.fast_unfilter = lambda: None
                    np.testing.assert_array_equal(np.stack(list(builder.read_master_rows(filtered, 71, 17))), small)
                finally:
                    builder.fast_unfilter = fast
        # The previous directory/manifest.json convention remains readable.
        old_directory = root / "old-directory"
        old_directory.mkdir()
        builder.write_height_png(old_directory / "heightmap.png", 9, 5, iter(expected), "none")
        metadata["sha256"] = builder.digest(old_directory / "heightmap.png")
        (old_directory / "manifest.json").write_text(json.dumps(metadata))
        builder.build(grid, old_directory, root / "old-directory-derived", None, 1, from_heightmap=True)
        np.testing.assert_array_equal(assemble(root / "old-directory-derived", 9, 5, 3), expected)
    return {"fixtures": "pass", "cases": ["independent Pillow read", "negative/zero/NoData",
            "one-degree boundary", "legacy full pixel equality", "master-derived factors 1/4/8",
            "partial outer tile", "existing output preserved", "projection mismatch",
            "overflow rollback", "PNG CRC rollback", "multiple IDAT chunks", "all standard PNG filters",
            "native and reference decoder equality", "PNG sidecar and legacy directory inputs"]}


def verify_real(master, grid_file, inputs):
    png, meta = builder.master_files(master)
    metadata = json.loads(meta.read_text())
    grid = builder.load_grid(grid_file)
    assert metadata["sha256"] == builder.digest(png)
    assert metadata["projection"] == grid["projection"]
    p = grid["projection"]
    # The first three are recorded 100 m output values from the previous tiled
    # generation, not elevations reverse-engineered from display hillshade.
    locations = [("京都", 135.76, 35.02, 55.25), ("ソウル", 126.978, 37.5665, 30.25),
                 ("瀋陽", 123.43, 41.8, 51.5), ("札幌", 141.3545, 43.0618, None),
                 ("那覇", 127.6809, 26.2124, None), ("孀婦岩付近の欠測", 140.357068, 29.812871, None)]
    checks = []
    for name, lon, lat, previous in locations:
        col = int(np.floor(((lon - p["LON0"]) * p["K"] * p["CX"] - p["origin"][0]) / p["stepUnits"]))
        row = int(np.floor(((p["LAT0"] - lat) * p["K"] - p["origin"][1]) / p["stepUnits"]))
        checks.append({"name": name, "pixel": [col, row], "priorRecordedMetres": previous})
    valid_pixels = 0
    for row, values in enumerate(builder.read_master_rows(png, grid["width"], grid["height"])):
        valid_pixels += int(np.count_nonzero(values))
        for check in checks:
            if check["pixel"][1] == row:
                check["code"] = int(values[check["pixel"][0]])
    assert valid_pixels == metadata["validPixels"]
    for check in checks:
        col, row = check["pixel"]
        lon = p["LON0"] + (p["origin"][0] + (col + .5) * p["stepUnits"]) / (p["K"] * p["CX"])
        lat = p["LAT0"] - (p["origin"][1] + (row + .5) * p["stepUnits"]) / p["K"]
        west, south = math_floor(lon), math_floor(lat)
        file = inputs / f"Copernicus_DSM_COG_30_N{south:02d}_00_E{west:03d}_00_DEM.tif"
        if file.exists():
            with Image.open(file) as im:
                sx, sy, _ = im.tag_v2[33550]
                x = min(im.width - 1, max(0, round((lon - west) / sx)))
                y = min(im.height - 1, max(0, round((south + 1 - lat) / sy)))
                value = float(im.getpixel((x, y)))
            code = round((value + 500) * 4) + 1
            check["sourceMetres"] = value
        else:
            code = 0
            check["sourceMetres"] = None
        assert check["code"] == code, check
        check["masterMetres"] = -500 + (code - 1) / 4 if code else None
        if check["priorRecordedMetres"] is not None:
            assert check["masterMetres"] == check["priorRecordedMetres"], check
    return {"master": str(master), "sha256": metadata["sha256"], "validPixels": valid_pixels,
            "samples": checks, "priorValuesSource": "docs/reports/ELEVATION_RASTER_REVIEW.md 100m column"}


def math_floor(value):
    return int(np.floor(value))


def compare_masters(first, second):
    a, am = builder.master_files(first)
    b, bm = builder.master_files(second)
    ma, mb = json.loads(am.read_text()), json.loads(bm.read_text())
    for key in ("width", "height", "projection", "encoding"):
        assert ma[key] == mb[key], key
    assert builder.digest(a) == ma["sha256"] and builder.digest(b) == mb["sha256"]
    width, height, pixels = ma["width"], ma["height"], 0
    for row, (left, right) in enumerate(zip_longest(builder.read_master_rows(a, width, height),
                                                   builder.read_master_rows(b, width, height))):
        assert left is not None and right is not None, ("row count", row)
        if not np.array_equal(left, right):
            col = int(np.flatnonzero(left != right)[0])
            raise AssertionError({"row": row, "col": col, "before": int(left[col]), "after": int(right[col])})
        pixels += width
    assert pixels == width * height
    return {"first": str(a), "second": str(b), "pixelsCompared": pixels, "differingPixels": 0,
            "firstSha256": ma["sha256"], "secondSha256": mb["sha256"],
            "firstBytes": a.stat().st_size, "secondBytes": b.stat().st_size}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--master", type=Path)
    parser.add_argument("--grid", type=Path)
    parser.add_argument("--input", type=Path)
    parser.add_argument("--compare-master", type=Path)
    args = parser.parse_args()
    result = fixtures()
    if args.master:
        if not args.grid or not args.input:
            parser.error("--master requires --grid and --input")
        result["realData"] = verify_real(args.master, args.grid, args.input)
    if args.compare_master:
        if not args.master:
            parser.error("--compare-master requires --master")
        result["comparison"] = compare_masters(args.compare_master, args.master)
    print(json.dumps(result, ensure_ascii=False, indent=2))
