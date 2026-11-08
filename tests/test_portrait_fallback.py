"""Guard the published fallback against source and reviewed-crop drift."""

import json
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "tools/faces/fallback-crops.json"
BUILDER = ROOT / "tools/faces/build_fallback.py"


def test_published_fallback_matches_canonical_crops() -> None:
    result = subprocess.run(  # noqa: S603 - fixed local generator, test-owned arguments
        [sys.executable, str(BUILDER), "--root", str(ROOT), "--check"],
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr + result.stdout


@pytest.mark.parametrize(
    ("field", "value", "message"),
    [
        ("sha256", "0" * 64, "source SHA mismatch"),
        ("crop", [0, 0, 1, 1], "canonical crop changed"),
    ],
)
def test_fallback_rejects_changed_input(
    tmp_path: Path, field: str, value: str | list[int], message: str
) -> None:
    manifest = json.loads(MANIFEST.read_text())
    manifest["portraits"][0][field] = value
    bad = tmp_path / "fallback-crops.json"
    bad.write_text(json.dumps(manifest))
    result = subprocess.run(  # noqa: S603 - fixed local generator, test-owned arguments
        [
            sys.executable,
            str(BUILDER),
            "--root",
            str(ROOT),
            "--manifest",
            str(bad),
            "--validate-only",
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode != 0
    assert message in result.stderr
