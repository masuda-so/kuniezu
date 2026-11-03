"""Audit all master-derived height pixels, shade validity and distributed hashes.

Differences from the earlier independent coarse DEM sampling are reported, not
silently accepted as equal. No source or distributed file is changed.
"""
import argparse
from functools import lru_cache
import hashlib
import importlib.util
import json
from pathlib import Path

import numpy as np
from PIL import Image

spec = importlib.util.spec_from_file_location(
    "height", Path(__file__).resolve().parents[1] / "map/build-copernicus-height.py")
height = importlib.util.module_from_spec(spec)
spec.loader.exec_module(height)


def audit(grid_file, master_input, generated, distributed, reference_manifest=None):
    grid = height.load_grid(grid_file)
    png, metadata_file = height.master_files(master_input)
    master = json.loads(metadata_file.read_text())
    master_hash = height.digest(png)
    assert master_hash == master["sha256"]
    assert master["projection"] == grid["projection"]
    grid_hash = height.digest(grid_file)
    relief_file = reference_manifest or generated / "distributed-relief.json"
    if not relief_file.exists():
        relief_file = distributed / "relief.json"
    relief = json.loads(relief_file.read_text())
    if "sourceHeightmapSha256" in relief:
        assert relief["sourceHeightmapSha256"] == master_hash
        assert relief["sourceHeightmapMetadataSha256"] == height.digest(metadata_file)
        assert relief["gridSha256"] == grid_hash
    records, levels, heights, shades = {}, {}, {}, {}
    for factor in (1, 4, 8):
        hm_file = generated / f"height-{factor}/manifest.json"
        sm_file = generated / f"shade-{factor}/manifest.json"
        hm, sm = json.loads(hm_file.read_text()), json.loads(sm_file.read_text())
        assert hm["gridSha256"] == sm["gridSha256"] == grid_hash
        assert hm["sourceHeightmapSha256"] == master_hash
        assert hm["sourceHeightmapManifestSha256"] == height.digest(metadata_file)
        assert sm["elevationManifestSha256"] == height.digest(hm_file)
        assert hm["factor"] == sm["factor"] == factor
        level = height.level_for(grid, factor)
        assert (hm["width"], hm["height"]) == (level["width"], level["height"])
        for key in ("source", "product", "acquired", "license", "notice", "disclaimer"):
            assert hm[key] == sm[key] == master[key]
        levels[factor], heights[factor], shades[factor] = level, hm, sm
        records[factor] = {tuple(map(int, Path(row["file"]).stem.split("-"))): row for row in hm["tiles"]}

    @lru_cache(maxsize=64)
    def height_tile(factor, col, row):
        level, size = levels[factor], grid["tile"]
        shape = (min(size, level["height"] - row * size), min(size, level["width"] - col * size))
        record = records[factor].get((col, row))
        if record is None:
            return np.zeros(shape, dtype=np.uint16)
        file = generated / f"height-{factor}" / record["file"]
        assert height.digest(file) == record["sha256"], str(file)
        with Image.open(file) as image:
            values = np.asarray(image, dtype=np.uint16)
        assert values.shape == shape, str(file)
        assert np.count_nonzero(values) == record["validPixels"], str(file)
        return values

    states = {factor: {"nextRow": 0, "pixels": 0,
                       "xs": np.minimum(np.arange(level["width"]) * factor + factor // 2, grid["width"] - 1)}
              for factor, level in levels.items()}
    for y, row in enumerate(height.read_master_rows(png, grid["width"], grid["height"])):
        for factor, state in states.items():
            output_y, level, size = state["nextRow"], levels[factor], grid["tile"]
            if output_y >= level["height"] or y != min(output_y * factor + factor // 2, grid["height"] - 1):
                continue
            actual = np.concatenate([height_tile(factor, col, output_y // size)[output_y % size]
                                     for col in range((level["width"] + size - 1) // size)])
            expected = row[state["xs"]]
            if not np.array_equal(actual, expected):
                col = int(np.flatnonzero(actual != expected)[0])
                raise AssertionError({"factor": factor, "x": col, "y": output_y,
                                      "expected": int(expected[col]), "actual": int(actual[col])})
            state["pixels"] += actual.size
            state["nextRow"] += 1
    for factor, state in states.items():
        assert state["nextRow"] == levels[factor]["height"]
        assert state["pixels"] == levels[factor]["width"] * levels[factor]["height"]
    height_tile.cache_clear()

    results = []
    for factor in (1, 4, 8):
        sm, hm = shades[factor], heights[factor]
        old_level = next(l for l in relief["levels"] if l["factor"] == factor)
        if "shadeManifestSha256" in old_level:
            assert old_level["shadeManifestSha256"] == height.digest(generated / f"shade-{factor}/manifest.json")
            assert old_level["elevationManifestSha256"] == height.digest(generated / f"height-{factor}/manifest.json")
        old = {(t["col"], t["row"]): t for t in old_level["tiles"]}
        current = {(t["col"], t["row"]): t for t in sm["tiles"]}
        assert current.keys() == records[factor].keys()
        exact = webp_checked = source_pixels = alpha_differences = rgb_error = rgb_channels = 0
        comparisons = []
        for key, record in current.items():
            file = generated / f"shade-{factor}" / record["file"]
            assert height.digest(file) == record["sha256"]
            with Image.open(file) as image:
                rgba = np.array(image.convert("RGBA"))
            values = height_tile(factor, *key)
            assert rgba.shape[:2] == values.shape
            assert np.array_equal(rgba[:, :, 3], np.where(values != 0, 255, 0).astype(np.uint8)), str(file)
            source_pixels += values.size
            prior = old.get(key)
            item = {"col": key[0], "row": key[1], "newSourceSha256": record["sha256"]}
            if prior is not None:
                if "regeneratedSourceSha256" in prior:
                    assert prior["regeneratedSourceSha256"] == record["sha256"]
                    assert prior["sourcePixelSha256"] == hashlib.sha256(rgba.tobytes()).hexdigest()
                    if prior.get("reusedFromPrevious"):
                        assert prior["sourcePixelsEquivalentToPrevious"] is True
                        assert prior["sourceSha256"] == prior["previousSourceSha256"]
                        if "previousEncoderRegeneratedSourceSha256" in prior:
                            assert prior["previousEncoderRegeneratedSourceSha256"] == prior["previousSourceSha256"]
                    else:
                        assert prior["sourceSha256"] == record["sha256"]
                webp = distributed / old_level["dir"] / prior["file"]
                assert height.digest(webp) == prior["sha256"], str(webp)
                webp_checked += 1
                same = prior["sourceSha256"] == record["sha256"]
                exact += int(same)
                with Image.open(webp) as image:
                    shown = np.array(image.convert("RGBA"))
                assert shown.shape == rgba.shape
                changed_alpha = int(np.count_nonzero(shown[:, :, 3] != rgba[:, :, 3]))
                alpha_differences += changed_alpha
                both_valid = (shown[:, :, 3] > 0) & (rgba[:, :, 3] > 0)
                rgb_error += int(np.abs(shown[:, :, :3].astype(np.int16) - rgba[:, :, :3].astype(np.int16))[both_valid].sum())
                rgb_channels += int(both_valid.sum()) * 3
                item.update({"previousSourceSha256": prior["sourceSha256"], "sourcePngIdentical": same,
                             "distributedSha256": prior["sha256"], "alphaDifferingPixels": changed_alpha})
            comparisons.append(item)
        results.append({"factor": factor, "heightTiles": len(hm["tiles"]), "shadeTiles": len(current),
                        "masterPixelsCompared": states[factor]["pixels"], "masterDifferingPixels": 0,
                        "heightValidityEqualsShadeAlpha": True, "heightShadePixelsCompared": source_pixels,
                        "distributedTilesChecked": webp_checked, "previousPngHashesIdentical": exact,
                        "previousPngHashesDifferent": len(current.keys() & old.keys()) - exact,
                        "newTileKeys": sorted(current.keys() - old.keys()), "removedTileKeys": sorted(old.keys() - current.keys()),
                        "distributedAlphaDifferingPixels": alpha_differences,
                        "newPngVersusDistributedWebpRgbMeanAbsoluteError": rgb_error / rgb_channels if rgb_channels else None,
                        "comparisons": comparisons})
        height_tile.cache_clear()
    return {"sourceMasterSha256": master_hash, "sourceMasterMetadataSha256": height.digest(metadata_file),
            "gridSha256": grid_hash, "gridSnapshot": str(grid_file),
            "sharedGridUnchanged": height.digest(distributed / "manifest.json") == grid_hash,
            "previousReliefSha256": height.digest(relief_file),
            "sharedReliefUnchanged": height.digest(distributed / "relief.json") == height.digest(relief_file),
            "levels": results,
            "limits": "RGB差は既存の非可逆WebPとの比較。元PNG SHA一致が元陰影の完全再現判定。0ではないRGB差を標高差と解釈しない。"}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("grid", type=Path)
    parser.add_argument("master", type=Path)
    parser.add_argument("generated", type=Path)
    parser.add_argument("distributed", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--relief-manifest", type=Path,
                        help="Compare against this distribution manifest rather than the retained previous snapshot")
    args = parser.parse_args()
    result = audit(args.grid, args.master, args.generated, args.distributed, args.relief_manifest)
    with args.output.open("x", encoding="utf-8") as stream:
        json.dump(result, stream, ensure_ascii=False, indent=2)
        stream.write("\n")
    print(json.dumps({**result, "levels": [{k: v for k, v in level.items() if k != "comparisons"}
                                         for level in result["levels"]]}, ensure_ascii=False, indent=2))
