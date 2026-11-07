"""Build only the five reviewed fallback cells. No face detection or new image sources.

Requires Pillow (build-time only). Supply --root and --validate-only, --check or --write.
The runtime definitions are preserved, and only the generated fallback block is appended.
"""

import argparse
import hashlib
import json
import re
import subprocess
from pathlib import Path
from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument("--root", type=Path, required=True)
parser.add_argument(
    "--manifest", type=Path, default=Path(__file__).with_name("fallback-crops.json")
)
mode = parser.add_mutually_exclusive_group(required=True)
mode.add_argument("--validate-only", action="store_true")
mode.add_argument("--check", action="store_true")
mode.add_argument("--write", action="store_true")
args = parser.parse_args()
root = args.root.resolve()
static = root / "kuniezu/static/kuniezu"
data = json.loads(args.manifest.read_text())
rows = data["portraits"]
if len(rows) != 5 or len({r["name"] for r in rows}) != 5:
    raise ValueError("Expected five distinct reviewed portraits")
# Read the current authoritative runtime crop, including the later Shima override.
read = r"""const fs=require('fs'),vm=require('vm'),p=process.argv[1],c={TK:{}};
vm.runInNewContext(fs.readFileSync(p+'/portrait-layout.js','utf8'),c);
const s=fs.readFileSync(p+'/kamon.js','utf8'),m=s.match(/TK\.EXTRA_PORTRAITS\['島清興'\]=(\{[^;]+\});/);
if(!m)throw Error('Missing Shima canonical definition');
c.TK.EXTRA_PORTRAITS['島清興']=vm.runInNewContext('('+m[1]+')');
console.log(JSON.stringify(c.TK.EXTRA_PORTRAITS));"""
canonical = json.loads(
    subprocess.check_output(["node", "-e", read, str(static)], text=True)
)
images = []
report = []
for row in rows:
    current = canonical[row["name"]]
    if current["src"] != row["source"] or current["crop"] != row["crop"]:
        raise ValueError(
            f"{row['name']}: canonical crop changed; review before rebuilding"
        )
    source = static / row["source"]
    if not source.resolve().is_relative_to((static / "portraits").resolve()):
        raise ValueError("Source must be an existing portrait asset")
    if hashlib.sha256(source.read_bytes()).hexdigest() != row["sha256"]:
        raise ValueError(f"{row['name']}: source SHA mismatch")
    x, y, w, h = row["crop"]
    with Image.open(source) as original:
        if (
            min(x, y) < 0
            or w <= 0
            or w != h
            or x + w > original.width
            or y + h > original.height
        ):
            raise ValueError(f"{row['name']}: invalid square crop")
        images.append(
            original.convert("RGB")
            .crop((x, y, x + w, y + h))
            .resize((128, 128), Image.Resampling.LANCZOS)
        )
        report.append(
            {
                "name": row["name"],
                "size": list(original.size),
                "crop": row["crop"],
                "sha256": row["sha256"],
            }
        )
if args.validate_only:
    print(json.dumps({"validated": report, "writes": 0}, ensure_ascii=False, indent=2))
    raise SystemExit(0)
strip = Image.new("RGB", (128, 128 * len(rows)))
for i, im in enumerate(images):
    strip.paste(im, (0, 128 * i))
# Version in the generated source URL is based on decoded pixels, not a guessed stamp.
version = hashlib.sha256(strip.tobytes()).hexdigest()[:10]
image_path = static / "faces-fallback.webp"
entries = {
    row["name"]: {
        "src": f"faces-fallback.webp?v={version}",
        "crop": [0, 128 * i, 128, 128],
    }
    for i, row in enumerate(rows)
}
block = (
    "// reviewed-fallback:start\nTK.PORTRAIT_FALLBACK="
    + json.dumps(entries, ensure_ascii=False, separators=(",", ":"))
    + ";\n// reviewed-fallback:end"
)
layout_path = static / "portrait-layout.js"
layout = layout_path.read_text()
pattern = r"// reviewed-fallback:start\n.*?// reviewed-fallback:end"
output = (
    re.sub(pattern, lambda _: block, layout, flags=re.S)
    if re.search(pattern, layout, flags=re.S)
    else layout.rstrip() + "\n\n" + block + "\n"
)
if args.check:
    if not image_path.exists() or layout != output:
        raise SystemExit("FAIL: reviewed fallback output is absent or outdated")
    with Image.open(image_path) as saved:
        if saved.convert("RGB").tobytes() != strip.tobytes():
            raise SystemExit("FAIL: fallback pixels differ from canonical crops")
    print("PASS: reviewed fallback output matches canonical crops")
else:
    strip.save(image_path, lossless=True, method=6)
    layout_path.write_text(output)
    print("Generated faces-fallback.webp and the portrait-layout fallback block")
