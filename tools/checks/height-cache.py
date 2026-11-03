"""Exercise master-only relief generation, pixel reuse and publication failures.

Uses a dedicated headless Chrome for the initial tiny fixture; no server.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
from tempfile import TemporaryDirectory

import numpy as np
from PIL import Image

spec = importlib.util.spec_from_file_location("cache", Path(__file__).resolve().parents[1] / "map/build-height-cache.py")
cache = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cache)


def snapshot(root):
    return {str(file.relative_to(root)): cache.height.digest(file) for file in root.rglob("*") if file.is_file()}


def fixtures(chrome=None):
    with TemporaryDirectory(prefix="kuniezu-height-cache-check-") as name:
        root = Path(name)
        p = {"K": 200, "CX": .8090169943749475, "LON0": 129.2, "LAT0": 41.75,
             "origin": [0, 0], "stepUnits": .18, "stepMetres": 100}
        grid, projection, master = root / "grid.json", root / "projection.json", root / "heightmap.png"
        cache.write_json(grid, {"projection": p, "width": 9, "height": 9, "tile": 4,
                               "levels": [{"factor": 4, "width": 3, "height": 3},
                                          {"factor": 8, "width": 2, "height": 2}]})
        cache.write_json(projection, {**p, "width": 9, "height": 9})
        values = np.arange(81, dtype=np.uint16).reshape(9, 9) * 20 + 2001
        values[0:2, 0:3] = 0
        cache.height.write_height_png(master, 9, 9, iter(values), "adaptive")
        metadata = {"kind": "elevation-master", "factor": 1, "projection": p, "width": 9, "height": 9,
                    "encoding": cache.height.ENCODING, "file": master.name, "sha256": cache.height.digest(master),
                    "source": "fixture", "product": "fixture", "acquired": "2026-11-03", "license": "fixture",
                    "notice": "fixture", "disclaimer": "fixture", "sourceTiles": {}, "inputChecksumsSha256": "0" * 64}
        cache.write_json(master.with_suffix(".json"), metadata)
        output = root / "map"
        first = cache.build(grid, master, projection, output, chrome=chrome)
        assert first["converted"] == first["tiles"] == 11 and first["reused"] == 0
        first_manifest = json.loads((output / "relief.json").read_text())
        first_paths = [output / l["dir"] / t["file"] for l in first_manifest["levels"] for t in l["tiles"]]
        # All reuse must succeed even with a nonexistent browser binary.
        second = cache.build(grid, master, projection, output, chrome="/nonexistent/browser")
        assert second["reused"] == 11 and second["converted"] == 0
        assert all(file.is_file() for file in first_paths), "Opened browsers retain old generation"
        before = snapshot(output)
        # A quality change requires conversion; failed launch must not publish.
        try:
            cache.build(grid, master, projection, output, quality=.83, chrome="/nonexistent/browser")
        except subprocess.CalledProcessError:
            pass
        else:
            raise AssertionError("Expected failed encoder")
        assert snapshot(output) == before
        # Corrupt the master and keep its metadata SHA: no old output changes.
        good = master.read_bytes()
        master.write_bytes(good[:-1] + bytes([good[-1] ^ 1]))
        try:
            cache.build(grid, master, projection, output)
        except ValueError:
            pass
        else:
            raise AssertionError("Expected failed checksum")
        assert snapshot(output) == before
        master.write_bytes(good)
        # Change PNG byte compression only; the pixels must permit reuse.
        scratch = root / "recompressed"
        scratch.mkdir()
        for factor in (1, 4, 8):
            heights, shades = scratch / f"height-{factor}", scratch / f"shade-{factor}"
            hm = cache.height.build(grid, master, heights, None, factor, from_heightmap=True, projection_file=projection)
            sm = cache.shade.build(grid, heights, shades)
            sm.update({"sourceHeightmapSha256": hm["sourceHeightmapSha256"],
                       "sourceHeightmapMetadataSha256": hm["sourceHeightmapManifestSha256"],
                       "projectionSha256": cache.height.digest(projection)})
            for tile in sm["tiles"]:
                file = shades / tile["file"]
                with Image.open(file) as image:
                    rgba = image.convert("RGBA")
                    tile["pixelSha256"] = hashlib.sha256(rgba.tobytes()).hexdigest()
                    rgba.save(file, compress_level=0)
                tile["sha256"] = cache.height.digest(file)
            cache.write_json(shades / "manifest.json", sm)
        result = subprocess.run(["node", str(cache.HERE / "encode-relief-webp.cjs"), "--source", str(scratch),
                                 "--output", str(root / "encoded"), "--previous", str(output),
                                 "--chrome", "/nonexistent/browser"], check=True, capture_output=True, text=True)
        assert json.loads(result.stdout)["reused"] == 11
        encoded = cache.validate_distribution(scratch, root / "encoded")
        assert all(t["sourceSha256"] != t["regeneratedSourceSha256"] for l in encoded["levels"] for t in l["tiles"])
        # Lock ownership is checked before staging or replacing anything.
        (output / ".height-cache.lock").write_text("other process")
        try:
            cache.build(grid, master, projection, output)
        except FileExistsError:
            pass
        else:
            raise AssertionError("Expected publication lock failure")
        (output / ".height-cache.lock").unlink()
        assert snapshot(output) == before
        return {"fixtures": "pass", "tiles": 11, "cases": ["master-only generation", "reuse without Chrome",
            "old generation retained", "failed Chrome leaves previous distribution", "bad master preserves output",
            "PNG compression differences reuse equal pixels", "height/shade/WebP NoData agreement", "publication lock"]}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--chrome")
    args = parser.parse_args()
    print(json.dumps(fixtures(args.chrome), indent=2))
