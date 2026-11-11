"""Portraits withheld from delivery must stay out of everything the game serves."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
STATIC = ROOT / "kuniezu" / "static" / "kuniezu"
WITHHELD = json.loads((ROOT / "tools" / "faces" / "withheld.json").read_text("utf-8"))
TILE = 128
COLUMNS = 10


def test_withheld_names_have_no_portrait_entry() -> None:
    sources = (STATIC / "hist.js").read_text("utf-8") + (
        STATIC / "portrait-layout.js"
    ).read_text("utf-8")
    for name in WITHHELD["names"]:
        assert f'"{name}": {{' not in sources
        assert f'"{name}": "' not in sources
        assert all(f'"{name}": {tile},' not in sources for tile in WITHHELD["tiles"])


def test_withheld_files_are_not_delivered() -> None:
    for name in WITHHELD["files"]:
        assert not (STATIC / name).exists()


def test_withheld_tiles_are_blank() -> None:
    sheet = Image.open(STATIC / "faces.webp").convert("L")
    for tile in WITHHELD["tiles"]:
        left, top = (tile % COLUMNS) * TILE, (tile // COLUMNS) * TILE
        inner = sheet.crop((left + 8, top + 8, left + TILE - 8, top + TILE - 8))
        low, high = inner.getextrema()
        assert high - low <= 6
