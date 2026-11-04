"""Check that display PNGs are independent of elevation tile boundaries."""
from hashlib import sha256
import importlib.util
import json
from pathlib import Path
from tempfile import TemporaryDirectory

import numpy as np
from PIL import Image


spec = importlib.util.spec_from_file_location(
    "hillshade", Path(__file__).resolve().parents[1] / "map/build-hillshade-raster.py")
hillshade = importlib.util.module_from_spec(spec)
spec.loader.exec_module(hillshade)


def render(root, codes, size):
    height, width = codes.shape
    source = root / "elevation"
    source.mkdir(parents=True)
    grid = root / "grid.json"
    grid.write_text(json.dumps({
        "tile": size, "width": width, "height": height,
        "projection": {"stepMetres": 100, "stepUnits": .18, "LAT0": 41.75,
                       "origin": [0, 0], "K": 200, "CX": .809},
    }))
    tiles = []
    for y in range(0, height, size):
        for x in range(0, width, size):
            file = source / f"{x // size}-{y // size}.png"
            Image.fromarray(codes[y:y + size, x:x + size]).save(file)
            tiles.append({"file": file.name, "sha256": sha256(file.read_bytes()).hexdigest()})
    (source / "manifest.json").write_text(json.dumps({
        "tiles": tiles, "source": "synthetic",
        "encoding": {"noData": 0, "offsetMetres": -500, "codesPerMetre": 4},
        "gridSha256": sha256(grid.read_bytes()).hexdigest(),
    }))
    output = root / "shade"
    records = hillshade.build(grid, source, output)["tiles"]
    result = np.zeros((height, width, 4), dtype=np.uint8)
    for tile in records:
        x, y = tile["col"] * size, tile["row"] * size
        with Image.open(output / tile["file"]) as image:
            result[y:y + image.height, x:x + image.width] = np.asarray(image)
    return result


if __name__ == "__main__":
    with TemporaryDirectory() as scratch:
        root = Path(scratch)
        rows, cols = np.indices((7, 8))
        codes = (2000 + rows ** 2 * 16 + cols ** 2 * 19).astype(np.uint16)
        codes[3, 3] = codes[4, 5] = 0
        whole = render(root / "whole", codes, 8)
        split = render(root / "split", codes, 4)
        np.testing.assert_array_equal(whole, split)
        np.testing.assert_array_equal(split[:, :, 3] == 0, codes == 0)
    print("PASS: hillshade seam, partial tile, and missing elevation")
