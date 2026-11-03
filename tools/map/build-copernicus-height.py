"""Convert local Copernicus GLO-90 GeoTIFFs to game elevation PNGs."""
import argparse
from datetime import date
from functools import lru_cache
from hashlib import sha256
import json
from pathlib import Path

import numpy as np
from PIL import Image

SOURCE = "https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM"
LICENSE = "https://dataspace.copernicus.eu/sites/default/files/media/files/2025-06/copernicus_contributing_mission_data_access_v2_cop_dem_licenses.pdf"
NOTICE = ("produced using Copernicus WorldDEM™-90 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH "
          "2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved")
DISCLAIMER = ("The organisations in charge of the Copernicus programme by law or by delegation do not incur "
              "any liability for any use of the Copernicus WorldDEM™-90")


def build(grid_file, input_dir, output, acquired, factor):
    grid_bytes = grid_file.read_bytes()
    grid = json.loads(grid_bytes)
    p = grid["projection"]
    level = grid if factor == 1 else next(row for row in grid["levels"] if row["factor"] == factor)
    step, size = p["stepUnits"] * factor, grid["tile"]
    ox, oy = p["origin"]
    records, hashes = {}, {}
    checksums = (input_dir / "SHA256SUMS").read_text().splitlines()
    for checksum in checksums:
        expected, name = checksum.split()
        file = input_dir / name
        actual = sha256(file.read_bytes()).hexdigest()
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
                    or not west.is_integer() or not north.is_integer()):
                raise ValueError(f"Unexpected GLO-90 footprint: {name}")
            key = int(west), int(north) - 1
            if key in records:
                raise ValueError(f"Duplicate footprint: {key}")
            records[key] = (file, sx, sy, im.tag_v2.get(42113))
        hashes[name] = actual
    if not records:
        raise ValueError("No GLO-90 inputs")

    @lru_cache(maxsize=20)
    def read(key):
        file, sx, sy, nodata = records[key]
        with Image.open(file) as im:
            data = np.array(im)
        if nodata is not None:
            data[data == float(nodata)] = np.nan
        return data

    output.mkdir(parents=True, exist_ok=False)
    tiles = []
    for ty, y in enumerate(range(0, level["height"], size)):
        lat = p["LAT0"] - (oy + (np.arange(y, min(y + size, level["height"])) + .5) * step) / p["K"]
        lat_keys = np.floor(lat).astype(int)
        for tx, x in enumerate(range(0, level["width"], size)):
            lon = p["LON0"] + (ox + (np.arange(x, min(x + size, level["width"])) + .5) * step) / (p["K"] * p["CX"])
            lon_keys = np.floor(lon).astype(int)
            result = np.zeros((lat.size, lon.size), dtype=np.uint16)
            for south in np.unique(lat_keys):
                ys = lat_keys == south
                for west in np.unique(lon_keys):
                    key = west, south
                    if key not in records:
                        continue
                    xs = lon_keys == west
                    _, sx, sy, _ = records[key]
                    data = read(key)
                    cols = np.clip(np.rint((lon[xs] - west) / sx).astype(int), 0, data.shape[1] - 1)
                    rows = np.clip(np.rint((south + 1 - lat[ys]) / sy).astype(int), 0, data.shape[0] - 1)
                    values = data[np.ix_(rows, cols)]
                    valid = np.isfinite(values)
                    codes = np.rint((values + 500) * 4) + 1
                    if np.any(valid & ((codes < 1) | (codes > 65535))):
                        raise ValueError(f"Height outside encoding range: {key}")
                    result[np.ix_(ys, xs)] = np.where(valid, codes, 0).astype(np.uint16)
            count = int(np.count_nonzero(result))
            if count:
                file = output / f"{tx}-{ty}.png"
                Image.fromarray(result).save(file)
                tiles.append({"file": file.name, "validPixels": count, "sha256": sha256(file.read_bytes()).hexdigest()})
    manifest = {"gridSha256": sha256(grid_bytes).hexdigest(), "factor": factor,
                "source": SOURCE, "product": "COP-DEM-GLO-90-F", "acquired": acquired.isoformat(),
                "license": LICENSE, "notice": NOTICE, "disclaimer": DISCLAIMER, "sourceTiles": hashes,
                "encoding": {"noData": 0, "offsetMetres": -500, "codesPerMetre": 4},
                "resampling": "nearest point in containing one-degree input footprint", "tiles": tiles}
    (output / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print(f"Generated {len(tiles)} height tiles from {len(hashes)} GeoTIFFs at factor {factor}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("grid", type=Path)
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--acquired", required=True, type=date.fromisoformat)
    parser.add_argument("--factor", type=int, choices=[1, 4, 8], required=True)
    args = parser.parse_args()
    build(args.grid, args.input, args.output, args.acquired, args.factor)
