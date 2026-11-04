"""Rebuild all display relief from the one elevation PNG and its JSON sidecar.

No source GeoTIFFs, network, or server are required. Each heightmap decode is
streamed; shade and WebP work is bounded to individual tiles. A complete new
cache generation is installed first, then relief.json is replaced atomically.
Existing generations are deliberately retained for already-open browsers.
"""
import argparse
from contextlib import contextmanager
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
from tempfile import mkdtemp

import numpy as np
from PIL import Image


HERE = Path(__file__).resolve().parent


def module(name, file):
    spec = importlib.util.spec_from_file_location(name, HERE / file)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


height = module("height_builder", "build-copernicus-height.py")
shade = module("shade_builder", "build-hillshade-raster.py")


def write_json(file, value):
    file.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


@contextmanager
def lock(output):
    file = output / ".height-cache.lock"
    with file.open("x", encoding="utf-8") as stream:
        stream.write(str(os.getpid()) + "\n")
    try:
        yield
    finally:
        file.unlink()


def validate_distribution(stage, distribution):
    manifest = json.loads((distribution / "relief.json").read_text())
    for level in manifest["levels"]:
        factor = level["factor"]
        hm = stage / f"height-{factor}/manifest.json"
        sm = stage / f"shade-{factor}/manifest.json"
        if level["elevationManifestSha256"] != height.digest(hm) or level["shadeManifestSha256"] != height.digest(sm):
            raise ValueError("Distribution provenance differs")
        records = {(t["col"], t["row"]): t for t in json.loads(sm.read_text())["tiles"]}
        if len(records) != len(level["tiles"]):
            raise ValueError("Distribution tile count differs")
        for tile in level["tiles"]:
            record = records.pop((tile["col"], tile["row"]))
            png = stage / f"shade-{factor}" / record["file"]
            file = distribution / level["dir"] / tile["file"]
            if height.digest(file) != tile["sha256"] or height.digest(png) != tile["regeneratedSourceSha256"]:
                raise ValueError("Distribution image checksum differs")
            with Image.open(png) as image:
                rgba = np.array(image.convert("RGBA"))
            if hashlib.sha256(rgba.tobytes()).hexdigest() != tile["sourcePixelSha256"]:
                raise ValueError("Distribution pixel checksum differs")
            with Image.open(file) as image:
                actual = np.array(image.convert("RGBA"))
            if rgba.shape != actual.shape or not np.array_equal(rgba[:, :, 3], actual[:, :, 3]):
                raise ValueError("WebP dimensions or NoData alpha differ")
            codes = stage / f"height-{factor}" / record["file"]
            with Image.open(codes) as image:
                valid = np.array(image) != 0
            if not np.array_equal(rgba[:, :, 3], np.where(valid, 255, 0).astype(np.uint8)):
                raise ValueError("Height NoData and shade alpha differ")
    return manifest


def build(grid_file, master_input, projection_file, output, *, previous=None, quality=0.82,
          node="node", chrome=None):
    grid_file, projection_file, output = grid_file.resolve(), projection_file.resolve(), output.resolve()
    master, metadata = height.master_files(master_input.resolve())
    height.load_grid(grid_file, projection_file)
    if not 0 < quality <= 1:
        raise ValueError("Quality must be in (0, 1]")
    input_hashes = {file: height.digest(file) for file in (grid_file, projection_file, master, metadata)}
    tool_hashes = {f: height.digest(HERE / f) for f in ("build-height-cache.py", "build-copernicus-height.py",
                                                      "build-hillshade-raster.py", "encode-relief-webp.cjs")}
    output.mkdir(parents=True, exist_ok=True)
    with lock(output):
        stage = Path(mkdtemp(prefix=".height-build-", dir=output))
        try:
            grid = stage / "source-map-manifest.json"
            projection = stage / "projection.json"
            shutil.copyfile(grid_file, grid)
            shutil.copyfile(projection_file, projection)
            for factor in (1, 4, 8):
                heights, shades = stage / f"height-{factor}", stage / f"shade-{factor}"
                hm = height.build(grid, master, heights, None, factor, from_heightmap=True, projection_file=projection)
                sm = shade.build(grid, heights, shades)
                sm.update({"projection": hm["projection"],  # 実行時に配信タイルの格子と同じ投影か確かめる
                           "sourceHeightmapSha256": hm["sourceHeightmapSha256"],
                           "sourceHeightmapMetadataSha256": hm["sourceHeightmapManifestSha256"],
                           "projectionSha256": input_hashes[projection_file]})
                for tile in sm["tiles"]:
                    with Image.open(shades / tile["file"]) as image:
                        rgba = image.convert("RGBA").tobytes()
                    tile["pixelSha256"] = hashlib.sha256(rgba).hexdigest()
                write_json(shades / "manifest.json", sm)
            distribution = stage / "distribution"
            command = [node, str(HERE / "encode-relief-webp.cjs"), "--source", str(stage),
                       "--output", str(distribution), "--quality", str(quality),
                       "--previous", str((previous or output).resolve())]
            if chrome:
                command += ["--chrome", chrome]
            run = subprocess.run(command, capture_output=True, text=True)
            if run.returncode:
                raise subprocess.CalledProcessError(run.returncode, command, run.stdout, run.stderr)
            stats = json.loads(run.stdout)
            manifest = validate_distribution(stage, distribution)
            # Keep the provenance chain, not the large intermediate PNG cache.
            provenance = distribution / "provenance"
            provenance.mkdir()
            for factor in (1, 4, 8):
                for kind in ("height", "shade"):
                    shutil.copyfile(stage / f"{kind}-{factor}/manifest.json", provenance / f"{kind}-{factor}.json")
            shutil.copyfile(metadata, provenance / "heightmap.json")
            shutil.copyfile(projection, provenance / "projection.json")
            # Province changes alter the complete grid manifest hash even when
            # the elevation's original geometry and pixels remain unchanged.
            write_json(provenance / "build.json", {
                "gridSha256": input_hashes[grid_file], "sourceHeightmapSha256": input_hashes[master],
                "sourceHeightmapMetadataSha256": input_hashes[metadata],
                "projectionSha256": input_hashes[projection_file],
                "sourceMasterMetadataRetained": True,
                "tools": tool_hashes})
            identity = hashlib.sha256(json.dumps({"manifest": manifest,
                "provenance": {file.name: height.digest(file) for file in sorted(provenance.iterdir())}},
                sort_keys=True).encode()).hexdigest()
            relative = Path("relief-cache") / identity
            for level in manifest["levels"]:
                level["dir"] = (relative / level["dir"]).as_posix()
            manifest["provenanceDir"] = (relative / "provenance").as_posix()
            write_json(distribution / "relief.json", manifest)
            for file, expected in input_hashes.items():
                if height.digest(file) != expected:
                    raise ValueError(f"Input changed during generation: {file}")
            for file, expected in tool_hashes.items():
                if height.digest(HERE / file) != expected:
                    raise ValueError(f"Generator changed during generation: {file}")
            destination = output / relative
            destination.parent.mkdir(exist_ok=True)
            if destination.exists():
                # Repeated generation may have identical bytes. Never replace
                # an existing immutable generation or trust damaged cache data.
                for file in distribution.rglob("*"):
                    if file.is_file() and (not (destination / file.relative_to(distribution)).is_file()
                                          or height.digest(file) != height.digest(destination / file.relative_to(distribution))):
                        raise ValueError("Existing cache generation differs")
            else:
                distribution.rename(destination)
            publication = stage / "publish-relief.json"
            shutil.copyfile(destination / "relief.json", publication)
            os.replace(publication, output / "relief.json")
            return {"output": str(output), "generation": identity,
                    "reliefSha256": height.digest(output / "relief.json"),
                    "reused": stats["reused"], "converted": stats["converted"],
                    "tiles": sum(len(level["tiles"]) for level in manifest["levels"])}
        finally:
            shutil.rmtree(stage)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--grid", required=True, type=Path)
    parser.add_argument("--heightmap", required=True, type=Path)
    parser.add_argument("--projection", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--previous", type=Path)
    parser.add_argument("--quality", type=float, default=0.82)
    parser.add_argument("--node", default="node")
    parser.add_argument("--chrome")
    args = parser.parse_args()
    print(json.dumps(build(args.grid, args.heightmap, args.projection, args.output,
                           previous=args.previous, quality=args.quality, node=args.node, chrome=args.chrome)))
