"""Build elevation tiles or a streamed master PNG from local Copernicus GLO-90.

Legacy tile arguments are retained. --single-image writes heightmap.png;
--from-heightmap derives tiles from that master. The metre encoding is this
project's contract, not a claim of CK3 editor compatibility.
PNG file inputs use their same-stem JSON sidecar; old manifest directories work.
NumPy and Pillow are required. CFFI plus a C compiler optionally accelerate the
standard PNG Average/Paeth decoder; the integer reference decoder is retained.
"""
import argparse
from contextlib import chdir, contextmanager
from datetime import date
from functools import lru_cache
from hashlib import sha256
import json
import math
from pathlib import Path
import shutil
import struct
from tempfile import gettempdir, mkdtemp
import zlib

import numpy as np
from PIL import Image

SOURCE = "https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM"
LICENSE = "https://dataspace.copernicus.eu/sites/default/files/media/files/2025-06/copernicus_contributing_mission_data_access_v2_cop_dem_licenses.pdf"
NOTICE = ("produced using Copernicus WorldDEM™-90 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH "
          "2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved")
DISCLAIMER = ("The organisations in charge of the Copernicus programme by law or by delegation do not incur "
              "any liability for any use of the Copernicus WorldDEM™-90")
ENCODING = {"noData": 0, "offsetMetres": -500, "codesPerMetre": 4,
            "decode": "offsetMetres + (code - 1) / codesPerMetre"}
PROJECTION_KEYS = ("K", "CX", "LON0", "LAT0", "origin", "stepUnits", "stepMetres")
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


def digest(file):
    value = sha256()
    with file.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            value.update(block)
    return value.hexdigest()


def load_grid(file, projection_file=None):
    grid = json.loads(file.read_text())
    projection = grid.get("projection", grid)
    p = {key: projection[key] for key in PROJECTION_KEYS}
    width, height, tile = grid["width"], grid["height"], grid.get("tile", 1024)
    if (any(not isinstance(v, int) or isinstance(v, bool) or v <= 0 for v in (width, height, tile))
            or len(p["origin"]) != 2
            or not all(math.isfinite(v) for key, value in p.items()
                       for v in (value if key == "origin" else [value]))
            or any(p[key] <= 0 for key in ("K", "CX", "stepUnits", "stepMetres"))):
        raise ValueError("Invalid grid dimensions or projection")
    if projection_file:
        reference = json.loads(projection_file.read_text())
        if (any(reference.get(key) != p[key] for key in PROJECTION_KEYS)
                or reference.get("width") != width or reference.get("height") != height):
            raise ValueError("Projection master differs from the grid manifest")
    return {**grid, "projection": p, "width": width, "height": height, "tile": tile}


def level_for(grid, factor):
    expected = ((grid["width"] + factor - 1) // factor,
                (grid["height"] + factor - 1) // factor)
    if factor == 1:
        return grid
    level = next((row for row in grid.get("levels", []) if row["factor"] == factor), None)
    if level is None:
        return {"width": expected[0], "height": expected[1]}
    if (level["width"], level["height"]) != expected:
        raise ValueError("Coarse grid does not cover the master dimensions")
    return level


@contextmanager
def new_output(output):
    """Publish a complete new directory; existing results are never overwritten."""
    if output.exists():
        raise FileExistsError(f"Output already exists: {output}")
    output.parent.mkdir(parents=True, exist_ok=True)
    staging = Path(mkdtemp(prefix=f".{output.name}-", dir=output.parent))
    try:
        yield staging
        if output.exists():
            raise FileExistsError(f"Output appeared during generation: {output}")
        staging.rename(output)
    finally:
        if staging.exists():
            shutil.rmtree(staging)


class CopernicusInputs:
    def __init__(self, input_dir):
        self.records, self.hashes = {}, {}
        self.checksums_sha256 = digest(input_dir / "SHA256SUMS")
        for checksum in (input_dir / "SHA256SUMS").read_text().splitlines():
            if not checksum.strip():
                continue
            expected, name = checksum.split()
            if Path(name).name != name or name in self.hashes:
                raise ValueError(f"Invalid or duplicate input filename: {name}")
            file = input_dir / name
            actual = digest(file)
            if actual != expected:
                raise ValueError(f"Input checksum differs: {name}")
            with Image.open(file) as im:
                sx, sy, _ = im.tag_v2[33550]
                ix, iy, _, west, north, _ = im.tag_v2[33922]
                keys = im.tag_v2[34735]
                geo = {key: value for key, location, count, value in zip(
                    keys[4::4], keys[5::4], keys[6::4], keys[7::4]) if location == 0 and count == 1}
                if im.mode != "F" or geo.get(2048) != 4326 or geo.get(1025) != 2 or ix or iy:
                    raise ValueError(f"Unsupported GeoTIFF: {name}")
                if (not np.isclose(sx * im.width, 1) or not np.isclose(sy * im.height, 1)
                        or not west.is_integer() or not north.is_integer() or sx <= 0 or sy <= 0):
                    raise ValueError(f"Unexpected GLO-90 footprint: {name}")
                key = int(west), int(north) - 1
                if key in self.records:
                    raise ValueError(f"Duplicate footprint: {key}")
                self.records[key] = (file, sx, sy, im.tag_v2.get(42113))
            self.hashes[name] = actual
        if not self.records:
            raise ValueError("No GLO-90 inputs")
        # At most 24 GLO-90 source tiles (~138 MB), not the whole target map.
        self.read = lru_cache(maxsize=24)(self._read)

    def _read(self, key):
        file, _, _, nodata = self.records[key]
        if digest(file) != self.hashes[file.name]:
            raise ValueError(f"Input changed during generation: {file.name}")
        with Image.open(file) as im:
            data = np.array(im)
        if nodata is not None:
            data[data == float(nodata)] = np.nan
        return data

    def sample(self, grid, x, y, width, height, factor):
        p = grid["projection"]
        step = p["stepUnits"] * factor
        lon = p["LON0"] + (p["origin"][0] + (np.arange(x, x + width) + .5) * step) / (p["K"] * p["CX"])
        lat = p["LAT0"] - (p["origin"][1] + (np.arange(y, y + height) + .5) * step) / p["K"]
        lon_keys, lat_keys = np.floor(lon).astype(int), np.floor(lat).astype(int)
        result = np.zeros((height, width), dtype=np.uint16)
        for south in np.unique(lat_keys):
            ys = lat_keys == south
            for west in np.unique(lon_keys):
                key = west, south
                if key not in self.records:
                    continue
                xs = lon_keys == west
                _, sx, sy, _ = self.records[key]
                data = self.read(key)
                cols = np.clip(np.rint((lon[xs] - west) / sx).astype(int), 0, data.shape[1] - 1)
                rows = np.clip(np.rint((south + 1 - lat[ys]) / sy).astype(int), 0, data.shape[0] - 1)
                values = data[np.ix_(rows, cols)]
                valid = np.isfinite(values)
                codes = np.rint((values + 500) * 4) + 1
                if np.any(valid & ((codes < 1) | (codes > 65535))):
                    raise ValueError(f"Height outside encoding range: {key}")
                result[np.ix_(ys, xs)] = np.where(valid, codes, 0).astype(np.uint16)
        return result


def write_chunk(stream, kind, data):
    stream.write(struct.pack(">I", len(data)) + kind + data)
    stream.write(struct.pack(">I", zlib.crc32(kind + data) & 0xffffffff))


def filtered_rows(row, previous):
    """Standard PNG byte filters; grayscale16 has two bytes per pixel."""
    raw = np.frombuffer(row.astype(">u2").tobytes(), dtype=np.uint8)
    current, above = raw.astype(np.int16), previous.astype(np.int16)
    left, corner = np.zeros_like(current), np.zeros_like(above)
    left[2:], corner[2:] = current[:-2], above[:-2]
    predictor = left + above - corner
    pa, pb, pc = np.abs(predictor - left), np.abs(predictor - above), np.abs(predictor - corner)
    paeth = np.where((pa <= pb) & (pa <= pc), left, np.where(pb <= pc, above, corner))
    return raw, {0: raw, 1: (current - left).astype(np.uint8),
                 2: (current - above).astype(np.uint8),
                 3: (current - (left + above) // 2).astype(np.uint8),
                 4: (current - paeth).astype(np.uint8)}


def write_height_png(file, width, height, rows, png_filter="adaptive", compression_level=6):
    """Lossless grayscale16 PNG, streamed rows with standard byte filters."""
    valid_pixels, min_code, max_code = 0, 65536, 0
    filter_ids = {"none": 0, "sub": 1, "up": 2, "average": 3, "paeth": 4}
    if png_filter not in (*filter_ids, "adaptive") or not 0 <= compression_level <= 9:
        raise ValueError("Invalid PNG filter or compression level")
    compressor, pending = zlib.compressobj(compression_level), bytearray()
    previous, counts = np.zeros(width * 2, dtype=np.uint8), {i: 0 for i in range(5)}
    with file.open("xb") as stream:
        stream.write(PNG_SIGNATURE)
        write_chunk(stream, b"IHDR", struct.pack(">IIBBBBB", width, height, 16, 0, 0, 0, 0))
        count = 0
        for row in rows:
            if row.shape != (width,) or row.dtype != np.dtype("uint16") or count >= height:
                raise ValueError("Invalid height PNG row")
            valid = row[row != 0]
            valid_pixels += valid.size
            if valid.size:
                min_code, max_code = min(min_code, int(valid.min())), max(max_code, int(valid.max()))
            if png_filter == "none":
                raw = np.frombuffer(row.astype(">u2").tobytes(), dtype=np.uint8)
                choice, encoded = 0, raw
            else:
                raw, options = filtered_rows(row, previous)
                # PNG's signed-byte absolute-sum heuristic is deterministic.
                choice = (min(options, key=lambda k: int(np.abs(options[k].view(np.int8).astype(np.int16)).sum()))
                          if png_filter == "adaptive" else filter_ids[png_filter])
                encoded = options[choice]
            counts[choice] += 1
            pending.extend(compressor.compress(bytes([choice]) + encoded.tobytes()))
            previous = raw
            if len(pending) >= 1024 * 1024:
                write_chunk(stream, b"IDAT", pending)
                pending.clear()
            count += 1
        if count != height:
            raise ValueError(f"Expected {height} PNG rows; received {count}")
        pending.extend(compressor.flush())
        if pending:
            write_chunk(stream, b"IDAT", pending)
        write_chunk(stream, b"IEND", b"")
    return {"validPixels": int(valid_pixels), "noDataPixels": width * height - int(valid_pixels),
            "minCode": min_code if valid_pixels else None, "maxCode": max_code if valid_pixels else None,
            "scanlineFilterCounts": counts}


@lru_cache(maxsize=1)
def fast_unfilter():
    """Optional CFFI acceleration for PNG's serial Average/Paeth recurrence.

    The NumPy-only reference path below has identical integer semantics.
    Native build artifacts are temporary; there is no new map generator.
    """
    try:
        from cffi import FFI, VerificationError
    except ImportError:
        return None
    ffi = FFI()
    ffi.cdef("void restore(unsigned char *, const unsigned char *, size_t, unsigned int);")
    cache = Path(gettempdir()) / "kuniezu-height-png-filters"
    cache.mkdir(parents=True, exist_ok=True)
    try:
        # Build in the cache folder: setuptools reads the project file of the
        # current folder and refuses the repository's multi-package layout.
        with chdir(cache):
            lib = ffi.verify("""
                #include <stddef.h>
                #include <stdlib.h>
                void restore(unsigned char *row, const unsigned char *prev, size_t n, unsigned int f) {
                    size_t i;
                    for (i = 0; i < n; ++i) {
                        int a = i >= 2 ? row[i-2] : 0, b = prev[i], c = i >= 2 ? prev[i-2] : 0;
                        int value;
                        if (f == 3) value = (a + b) / 2;
                        else {
                            int p = a + b - c, pa = abs(p-a), pb = abs(p-b), pc = abs(p-c);
                            value = pa <= pb && pa <= pc ? a : (pb <= pc ? b : c);
                        }
                        row[i] = (unsigned char)(row[i] + value);
                    }
                }
        """, tmpdir=str(cache), extra_compile_args=["-O3"])
    except (OSError, VerificationError):
        return None
    except Exception:  # noqa: BLE001
        # CFFI on Python 3.12+ needs setuptools to compile; without it, or with
        # any other build failure, the reference decoder gives the same values.
        return None
    return ffi, lib


def unfilter_row(filtered, previous, kind):
    row = np.frombuffer(filtered, dtype=np.uint8).copy()
    if kind == 1:
        for byte in (0, 1):
            row[byte::2] = np.cumsum(row[byte::2], dtype=np.uint32).astype(np.uint8)
    elif kind == 2:
        row += previous
    elif kind in (3, 4):
        fast = fast_unfilter()
        if fast:
            ffi, lib = fast
            lib.restore(ffi.from_buffer(row), ffi.from_buffer(previous), row.size, kind)
        else:
            for i in range(row.size):
                a, b, c = int(row[i - 2]) if i >= 2 else 0, int(previous[i]), int(previous[i - 2]) if i >= 2 else 0
                if kind == 3:
                    predicted = (a + b) // 2
                else:
                    p = a + b - c
                    pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                    predicted = a if pa <= pb and pa <= pc else b if pb <= pc else c
                row[i] = (int(row[i]) + predicted) & 255
    elif kind != 0:
        raise ValueError("Unknown PNG scanline filter")
    return row


def read_master_rows(file, width, height):
    """Stream an authenticated noninterlaced grayscale16 master (filters 0..4).

    This is not a general image importer. Other PNG encodings must be imported
    and validated separately, not silently treated as this elevation format.
    """
    decompressor, pending = zlib.decompressobj(), bytearray()
    row_bytes, rows = 1 + width * 2, 0
    previous = np.zeros(width * 2, dtype=np.uint8)
    seen_header, seen_data = False, False
    with file.open("rb") as stream:
        if stream.read(8) != PNG_SIGNATURE:
            raise ValueError("Invalid heightmap PNG signature")
        while True:
            prefix = stream.read(8)
            if len(prefix) != 8:
                raise ValueError("Truncated heightmap PNG")
            length, kind = struct.unpack(">I4s", prefix)
            if length > 2 * 1024 * 1024:
                raise ValueError("Unexpected master PNG chunk size")
            data, crc = stream.read(length), stream.read(4)
            if len(data) != length or len(crc) != 4 or zlib.crc32(kind + data) & 0xffffffff != struct.unpack(">I", crc)[0]:
                raise ValueError("Heightmap PNG chunk checksum differs")
            if kind == b"IHDR":
                if seen_header or data != struct.pack(">IIBBBBB", width, height, 16, 0, 0, 0, 0):
                    raise ValueError("Unsupported master PNG header")
                seen_header = True
            elif kind == b"IDAT" and seen_header:
                seen_data = True
                compressed = data
                while compressed:
                    pending.extend(decompressor.decompress(compressed, row_bytes * 16 - len(pending)))
                    compressed = decompressor.unconsumed_tail
                    while len(pending) >= row_bytes:
                        if pending[0] > 4 or rows >= height:
                            raise ValueError("Unexpected master PNG filter or row count")
                        previous = unfilter_row(bytes(pending[1:row_bytes]), previous, pending[0])
                        yield previous.view(">u2").astype(np.uint16)
                        del pending[:row_bytes]
                        rows += 1
            elif kind == b"IEND":
                if (data or not seen_data or pending or rows != height or not decompressor.eof
                        or decompressor.unused_data or stream.read(1)):
                    raise ValueError("Incomplete heightmap PNG")
                return
            else:
                raise ValueError(f"Unexpected master PNG chunk: {kind!r}")


def save_manifest(output, manifest):
    filename = "heightmap.json" if manifest.get("kind") == "elevation-master" else "manifest.json"
    (output / filename).write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")


def save_tile(output, col, row, data):
    count = int(np.count_nonzero(data))
    if not count:
        return None
    file = output / f"{col}-{row}.png"
    Image.fromarray(data).save(file)
    return {"file": file.name, "validPixels": count, "sha256": digest(file)}


def build(grid_file, input_dir, output, acquired, factor, *, single_image=False,
          from_heightmap=False, projection_file=None, band_rows=128,
          png_filter="adaptive", compression_level=6):
    if output.exists():
        raise FileExistsError(f"Output already exists: {output}")
    if factor not in (1, 4, 8) or not 1 <= band_rows <= 1024:
        raise ValueError("Invalid factor or row band size")
    if single_image and (factor != 1 or from_heightmap):
        raise ValueError("A master image requires factor 1 and GeoTIFF inputs")
    grid = load_grid(grid_file, projection_file)
    level = level_for(grid, factor)
    manifest = {"gridSha256": digest(grid_file), "factor": factor, "projection": grid["projection"],
                "width": level["width"], "height": level["height"], "encoding": dict(ENCODING)}
    if projection_file:
        manifest["projectionSha256"] = digest(projection_file)
    if from_heightmap:
        return derive_tiles(grid, input_dir, output, manifest, factor)
    if acquired is None:
        raise ValueError("GeoTIFF conversion requires --acquired")
    inputs = CopernicusInputs(input_dir)
    manifest.update({"source": SOURCE, "product": "COP-DEM-GLO-90-F", "acquired": acquired.isoformat(),
                     "license": LICENSE, "notice": NOTICE, "disclaimer": DISCLAIMER,
                     "sourceTiles": inputs.hashes, "inputChecksumsSha256": inputs.checksums_sha256,
                     "resampling": "nearest point in containing one-degree input footprint"})
    try:
        with new_output(output) as staging:
            if single_image:
                def rows():
                    for y in range(0, grid["height"], band_rows):
                        band = inputs.sample(grid, 0, y, grid["width"], min(band_rows, grid["height"] - y), 1)
                        yield from band
                file = staging / "heightmap.png"
                stats = write_height_png(file, grid["width"], grid["height"], rows(), png_filter, compression_level)
                manifest.update({"kind": "elevation-master", "schemaVersion": 1,
                                 "file": file.name, "sha256": digest(file), "bytes": file.stat().st_size,
                                 "png": {"colorType": 0, "bitDepth": 16, "filterMethod": 0, "interlace": 0,
                                         "filterSelection": png_filter, "compressionLevel": compression_level},
                                 "pixelRegistration": "centre: origin + (column + 0.5, row + 0.5) * stepUnits",
                                 "basis": "modern DSM; not historical surface or display hillshade",
                                 "streaming": {"bandRows": band_rows, "sourceCacheTiles": 24}, **stats})
            else:
                tiles, size = [], grid["tile"]
                for y in range(0, level["height"], size):
                    for x in range(0, level["width"], size):
                        data = inputs.sample(grid, x, y, min(size, level["width"] - x),
                                             min(size, level["height"] - y), factor)
                        record = save_tile(staging, x // size, y // size, data)
                        if record:
                            tiles.append(record)
                manifest["tiles"] = tiles
            save_manifest(staging, manifest)
    finally:
        inputs.read.cache_clear()
    return manifest


def master_files(input_path):
    if input_path.is_file():
        if input_path.suffix.lower() != ".png":
            raise ValueError("Heightmap input must be a PNG file or master directory")
        file = input_path
        source_file = file.with_suffix(".json")
    else:
        file = input_path / "heightmap.png"
        source_file = input_path / "heightmap.json"
        if not source_file.exists():
            source_file = input_path / "manifest.json"  # Original directory CLI.
    return file, source_file


def derive_tiles(grid, input_dir, output, manifest, factor):
    file, source_file = master_files(input_dir)
    source = json.loads(source_file.read_text())
    if (source.get("kind") != "elevation-master" or source.get("factor") != 1
            or source.get("projection") != grid["projection"]
            or source.get("width") != grid["width"] or source.get("height") != grid["height"]
            or any(source.get("encoding", {}).get(k) != v for k, v in ENCODING.items())
            or source.get("file") != file.name):
        raise ValueError("Heightmap master does not match grid or encoding")
    if digest(file) != source["sha256"]:
        raise ValueError("Heightmap master checksum differs")
    for key in ("source", "product", "acquired", "license", "notice", "disclaimer", "sourceTiles", "inputChecksumsSha256"):
        manifest[key] = source[key]
    manifest.update({"sourceHeightmapSha256": source["sha256"],
                     "sourceHeightmapManifestSha256": digest(source_file),
                     "resampling": "master pixel containing coarse cell centre, clamped at outer edge"})
    width, height, size = manifest["width"], manifest["height"], grid["tile"]
    # Province pyramids use the same centre-cell rule. Coarse values now come
    # from the master, rather than independent resampling of source GeoTIFFs.
    xs = np.minimum(np.arange(width) * factor + factor // 2, grid["width"] - 1)
    ys = np.minimum(np.arange(height) * factor + factor // 2, grid["height"] - 1)
    tiles, target_y = [], 0
    band = np.empty((min(size, height), width), dtype=np.uint16)
    with new_output(output) as staging:
        for y, row in enumerate(read_master_rows(file, grid["width"], grid["height"])):
            if target_y >= height or y != ys[target_y]:
                continue
            offset = target_y % size
            band[offset] = row[xs]
            target_y += 1
            if target_y % size == 0 or target_y == height:
                for x in range(0, width, size):
                    record = save_tile(staging, x // size, (target_y - 1) // size, band[:offset + 1, x:x + size])
                    if record:
                        tiles.append(record)
        if target_y != height:
            raise ValueError("Not all derived rows were generated")
        if digest(file) != source["sha256"] or digest(source_file) != manifest["sourceHeightmapManifestSha256"]:
            raise ValueError("Heightmap master changed during generation")
        manifest["tiles"] = tiles
        save_manifest(staging, manifest)
    return manifest


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("grid", type=Path)
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--acquired", type=date.fromisoformat, help="Required for GeoTIFF inputs")
    parser.add_argument("--factor", type=int, choices=[1, 4, 8], required=True)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--single-image", action="store_true")
    mode.add_argument("--from-heightmap", action="store_true")
    parser.add_argument("--projection", type=Path, help="Verify the separate projection.json master")
    parser.add_argument("--band-rows", type=int, default=128, help="Rows per master-generation band (1..1024)")
    parser.add_argument("--png-filter", choices=["none", "sub", "up", "average", "paeth", "adaptive"], default="adaptive")
    parser.add_argument("--compression-level", type=int, choices=range(10), default=6)
    args = parser.parse_args()
    result = build(args.grid, args.input, args.output, args.acquired, args.factor,
                   single_image=args.single_image, from_heightmap=args.from_heightmap,
                   projection_file=args.projection, band_rows=args.band_rows,
                   png_filter=args.png_filter, compression_level=args.compression_level)
    summary = {key: result[key] for key in ("kind", "file", "width", "height", "factor", "bytes", "validPixels", "sha256") if key in result}
    if "tiles" in result:
        summary["tileCount"] = len(result["tiles"])
    print(json.dumps(summary))
