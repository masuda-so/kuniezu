"""Match a rendered historical figure to a georeferenced reference photo.

Outputs registration evidence only; never modifies canonical map geometry.
"""

# ruff: noqa: INP001, T201
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from numpy.lib.stride_tricks import sliding_window_view
from PIL import Image
from PIL import ImageDraw

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("figure", type=Path)
parser.add_argument("reference_directory", type=Path)
parser.add_argument("output", type=Path)
parser.add_argument("--preview", type=Path)
args = parser.parse_args()
REFERENCE_ZOOM = 15
reference_manifest = json.loads(
    (args.reference_directory / "manifest.json").read_text()
)
if (
    reference_manifest.get("zoom") != REFERENCE_ZOOM
    or reference_manifest.get("tileOrigin") != [28506, 12920]
    or reference_manifest.get("tileEnd") != [28508, 12922]
):
    parser.error("Reference mosaic does not cover the pinned Eshima tile frame")
expected_tiles = {
    (REFERENCE_ZOOM, x, y) for x in range(28506, 28509) for y in range(12920, 12923)
}
photo_tiles = [t for t in reference_manifest["tiles"] if t["layer"] == "ort_old10"]
if len(photo_tiles) != len(expected_tiles) or {
    tuple(t["tile"]) for t in photo_tiles
} != expected_tiles:
    parser.error("Expected each of the nine pinned photo tiles exactly once")
for tile in photo_tiles:
    if tile["layer"] == "ort_old10":
        if tile.get("status") != "saved":
            parser.error("Reference photo tile is missing")
        tile_bytes = (args.reference_directory / tile["file"]).read_bytes()
        if hashlib.sha256(tile_bytes).hexdigest() != tile["sha256"]:
            parser.error("Reference photo tile differs from the retained SHA")
src = np.asarray(Image.open(args.figure).convert("L"), dtype=np.float32)
photo_path = args.reference_directory / "ort_old10-mosaic.jpg"
dst = np.asarray(
    Image.open(photo_path).convert("L"),
    dtype=np.float32,
)
if src.shape != (1800, 1272) or dst.shape != (768, 768):
    parser.error("Expected PDF page 4 at 1272x1800 and the pinned 3x3 tile mosaic")
# Approximate manually inspected seed. This is not a map projection or adopted GCP.
m = np.array([[0.77454467, -0.00420112], [-0.03629726, 0.79844078], [199.356, 113.296]])
MIN_PATCH_NORM = 150
MIN_CORRELATION = 0.77
AFFINE_POINTS = 3
MAX_RESIDUAL_PIXELS = 3
MIN_INLIERS = 12
rows = []
for y in range(260, 745, 50):
    for x in range(170, 600, 50):
        patch = Image.fromarray(src[y - 14 : y + 14, x - 14 : x + 14]).resize(
            (22, 22), Image.Resampling.BICUBIC
        )
        t = np.asarray(patch, dtype=np.float32)
        t = t - t.mean()
        norm = np.linalg.norm(t)
        if norm < MIN_PATCH_NORM:
            continue
        q = np.array([x, y, 1]) @ m
        xx, yy = np.rint(q).astype(int)
        region = dst[yy - 32 : yy + 33, xx - 32 : xx + 33]
        if region.shape != (65, 65):
            continue
        windows = sliding_window_view(region, (22, 22))
        centered = windows - windows.mean(axis=(-1, -2), keepdims=True)
        scores = np.einsum("ijkl,kl->ij", centered, t) / (
            np.linalg.norm(centered, axis=(-1, -2)) * norm + 1e-9
        )
        iy, ix = np.unravel_index(scores.argmax(), scores.shape)
        score = float(scores[iy, ix])
        if score > MIN_CORRELATION:
            rows.append(
                {
                    "sourcePixel": [x, y],
                    "targetPixel": [int(xx - 32 + ix + 11), int(yy - 32 + iy + 11)],
                    "correlation": score,
                }
            )
print("matches", len(rows))
if len(rows) < MIN_INLIERS:
    parser.error("Insufficient matching photo texture; no registration written")
if len(rows) >= AFFINE_POINTS:
    a = np.array([[*r["sourcePixel"], 1] for r in rows])
    b = np.array([r["targetPixel"] for r in rows])
    best = []
    rng = np.random.default_rng(7)
    for _ in range(500):
        idx = rng.choice(len(rows), AFFINE_POINTS, replace=False)
        if abs(np.linalg.det(a[idx])) < 1:
            continue
        t = np.linalg.solve(a[idx], b[idx])
        mask = np.linalg.norm(a @ t - b, axis=1) < MAX_RESIDUAL_PIXELS
        if sum(mask) > len(best):
            best = list(np.flatnonzero(mask))
    if len(best) < MIN_INLIERS:
        parser.error("Insufficient affine inliers; no registration written")
    fit = np.linalg.lstsq(a[best], b[best], rcond=None)[0]
    for i, r in enumerate(rows):
        r["inlier"] = i in best
        r["residualPixels"] = float(np.linalg.norm(a[i] @ fit - b[i]))
    result = {
        "method": (
            "local normalized cross-correlation and affine RANSAC; "
            "manual review required"
        ),
        "figureSize": [int(src.shape[1]), int(src.shape[0])],
        "figureSha256": hashlib.sha256(args.figure.read_bytes()).hexdigest(),
        "referenceManifest": reference_manifest,
        "referenceMosaicSha256": hashlib.sha256(photo_path.read_bytes()).hexdigest(),
        "matrixSourcePixelsToTileMosaic": fit.tolist(),
        "inliers": len(best),
        "matches": rows,
    }
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(
        "inliers",
        len(best),
        "maximum residual",
        max(r["residualPixels"] for r in rows if r["inlier"]),
    )
    im = Image.open(args.reference_directory / "ort_old10-mosaic.jpg").convert("RGB")
    d = ImageDraw.Draw(im)
    for r in rows:
        if r["inlier"]:
            x, y = r["targetPixel"]
            d.ellipse((x - 4, y - 4, x + 4, y + 4), outline="red", width=2)
    if args.preview:
        im.save(args.preview)
