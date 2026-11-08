"""Keep reviewed additions reproducible and reject changed source/crop identity."""

import json
import subprocess
import sys
from pathlib import Path

import pytest
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "tools/faces/reviewed-portraits.json"
BUILDER = ROOT / "tools/faces/build_reviewed.py"


def run_builder(manifest: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(  # noqa: S603 - fixed local generator and test-owned input
        [
            sys.executable,
            str(BUILDER),
            "--root",
            str(ROOT),
            "--manifest",
            str(manifest),
            "--check",
        ],
        capture_output=True,
        text=True,
        check=False,
    )


def test_reviewed_portraits_reproduce() -> None:
    result = run_builder(MANIFEST)
    assert result.returncode == 0, result.stderr + result.stdout


@pytest.mark.parametrize(
    "case",
    [
        "sha",
        "bounds",
        "duplicate-output",
        "existing-name",
        "existing-output",
        "fallback-output",
    ],
)
def test_reviewed_portraits_reject_changed_input(tmp_path: Path, case: str) -> None:
    manifest = json.loads(MANIFEST.read_text())
    rows = manifest["portraits"]
    if case == "sha":
        rows[0]["sha256"] = "0" * 64
    elif case == "bounds":
        rows[0]["crop"] = [0, 0, 5000, 5000]
    elif case == "duplicate-output":
        rows[1]["output"] = rows[0]["output"]
    elif case == "existing-output":
        rows[0]["output"] = "portraits/斎藤義龍.jpg"
    elif case == "fallback-output":
        rows[0]["output"] = "portraits/reviewed-fallback.webp"
    else:
        rows[0]["name"] = "織田信長"
    bad = tmp_path / "reviewed.json"
    bad.write_text(json.dumps(manifest))
    result = run_builder(bad)
    assert result.returncode != 0


def test_fallback_cells_match_each_primary() -> None:
    manifest = json.loads(MANIFEST.read_text())
    static = ROOT / "kuniezu/static/kuniezu"
    size = manifest["outputSize"]
    with Image.open(static / "portraits/reviewed-fallback.webp") as fallback:
        assert fallback.size == (size, size * len(manifest["portraits"]))
        for index, row in enumerate(manifest["portraits"]):
            with Image.open(static / row["output"]) as primary:
                assert primary.size == (size, size)
                cell = fallback.crop((0, index * size, size, (index + 1) * size))
                assert cell.convert("RGB").tobytes() == primary.convert("RGB").tobytes()
