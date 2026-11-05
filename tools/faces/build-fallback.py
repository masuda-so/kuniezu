"""Build the lossless fallback strip from the verified portrait crops."""
import hashlib
import json
import re
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
STATIC = ROOT / "kuniezu/static/kuniezu"
CELL = 128
verified = json.loads(Path(__file__).with_name("fallback-crops.json").read_text())
ui = (STATIC / "ui.js").read_text()
names = json.loads(re.search(r"const portraitFallbackNames=(\[.*?\]);", ui).group(1))
if len(names) != len(verified) or set(names) != verified.keys():
    raise ValueError("Fallback rows must match verified portrait definitions")

strip = Image.new("RGB", (CELL, CELL * len(names)))
for row, name in enumerate(names):
    relative_path, (x, y, w, h), sha256 = verified[name]
    source = STATIC / relative_path
    if hashlib.sha256(source.read_bytes()).hexdigest() != sha256:
        raise ValueError(f"{name}: source hash mismatch")
    with Image.open(source) as original:
        if min(x, y) < 0 or w <= 0 or w != h or x + w > original.width or y + h > original.height:
            raise ValueError(f"{name}: invalid crop")
        cropped = original.convert("RGB").crop((x, y, x + w, y + h))
        strip.paste(cropped.resize((CELL, CELL), Image.Resampling.LANCZOS), (0, row * CELL))

strip.save(STATIC / "faces-fallback.webp", lossless=True, method=6)
