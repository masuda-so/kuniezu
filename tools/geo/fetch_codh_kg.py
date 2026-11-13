"""Fetch or check the CODH old province and county boundaries.

The dataset is CC BY-NC 4.0 and is not redistributed: the GeoJSON files stay
in .cache/codh-kg/geojson/ (ignored by Git). Only the manifest with the SHA-256
of every file is committed, in data/inputs/codh-kg/manifest.json.

    uv run python tools/geo/fetch_codh_kg.py            # fetch missing files
    uv run python tools/geo/fetch_codh_kg.py --check    # compare with the manifest
    uv run python tools/geo/fetch_codh_kg.py --write-manifest

See docs/designs/county-territory.md.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / ".cache" / "codh-kg" / "geojson"
MANIFEST = ROOT / "data" / "inputs" / "codh-kg" / "manifest.json"
GUN_CSV = ROOT / "kuniezu" / "map" / "admin" / "gun.csv"
BASE_URL = "https://geoshape.ex.nii.ac.jp/kg/geojson/"
USER_AGENT = "kuniezu-codh-kg/1"
DATASET = {
    "dataset": "旧国・旧郡境界データセット",
    "doi": "10.20676/00000454",
    "license": "CC-BY-NC-4.0",
    "licenseUrl": "https://geoshape.ex.nii.ac.jp/kg/",
    "credit": (
        "『旧国・旧郡境界データセット』（CODH作成） "
        "「幕末明治地勢地図境界データ」（人間文化研究機構作成）を加工 "
        "doi:10.20676/00000454"
    ),
    "redistributed": False,
}


def wanted_ids() -> list[str]:
    """Japanese counties (G) and their provinces (K), from gun.csv."""
    guns: set[str] = set()
    kunis: set[str] = set()
    with GUN_CSV.open(encoding="utf-8") as handle:
        for row in csv.DictReader(handle, delimiter=";"):
            if row["codh_id"].startswith("G"):
                guns.add(row["codh_id"])
                kunis.add(row["kuni_id"])
    return sorted(kunis) + sorted(guns)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def fetch(ids: list[str]) -> int:
    CACHE.mkdir(parents=True, exist_ok=True)
    fetched = 0
    for key in ids:
        target = CACHE / f"{key}.geojson"
        if target.exists():
            continue
        request = urllib.request.Request(
            BASE_URL + target.name, headers={"User-Agent": USER_AGENT}
        )
        with urllib.request.urlopen(request, timeout=60) as response:  # noqa: S310
            data = response.read()
        json.loads(data)
        target.write_bytes(data)
        fetched += 1
        time.sleep(0.5)
    return fetched


def build_manifest(ids: list[str], checked: str) -> dict:
    files = []
    for key in ids:
        path = CACHE / f"{key}.geojson"
        files.append(
            {
                "id": key,
                "file": path.name,
                "bytes": path.stat().st_size,
                "sha256": sha256(path),
            }
        )
    return {
        "version": 1,
        "checked": checked,
        "scope": "旧国・旧郡境界（江戸末期）。戦国期の郡境ではない。原本は再配布しない。",
        "url": BASE_URL + "<ID>.geojson",
        **DATASET,
        "files": files,
    }


def check(ids: list[str]) -> list[str]:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    recorded = {row["id"]: row for row in manifest["files"]}
    problems = []
    if sorted(recorded) != sorted(ids):
        problems.append("manifest ids differ from gun.csv")
    for key in ids:
        path = CACHE / f"{key}.geojson"
        row = recorded.get(key)
        if not path.exists():
            problems.append(f"missing {path.name}")
        elif row and sha256(path) != row["sha256"]:
            problems.append(f"sha256 differs: {path.name}")
    return problems


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--write-manifest", metavar="DATE")
    args = parser.parse_args(argv)
    ids = wanted_ids()
    if args.check:
        problems = check(ids)
        for problem in problems:
            print(problem, file=sys.stderr)
        print("PASS" if not problems else f"FAIL: {len(problems)} problems")
        return 1 if problems else 0
    if args.write_manifest:
        manifest = build_manifest(ids, args.write_manifest)
        MANIFEST.parent.mkdir(parents=True, exist_ok=True)
        text = json.dumps(manifest, ensure_ascii=False, indent=1) + "\n"
        MANIFEST.write_text(text, encoding="utf-8")
        print(f"wrote {MANIFEST.relative_to(ROOT)} ({len(ids)} files)")
        return 0
    print(f"fetched {fetch(ids)} files into {CACHE.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
