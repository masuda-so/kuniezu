"""Build reviewed portrait additions from retained, pinned originals; no network."""
# ruff: noqa: INP001, T201

import argparse
import hashlib
import json
import re
from io import BytesIO
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
CELL_SIZE = 128
MARKER = r"// reviewed-additions:start\n.*?// reviewed-additions:end"


def invalid(message):
    raise ValueError(message)


def load_cell(root, row, size):
    original = (root / row["input"]).resolve()
    if not original.is_relative_to((root / "data/inputs").resolve()):
        invalid("Original must be a retained research input")
    if hashlib.sha256(original.read_bytes()).hexdigest() != row["sha256"]:
        invalid(row["name"] + ": original SHA mismatch")
    x, y, width, height = row["crop"]
    with Image.open(original) as image:
        if (
            any(type(v) is not int for v in row["crop"])
            or min(x, y) < 0
            or width != height
            or width < size
            or x + width > image.width
            or y + height > image.height
        ):
            invalid(row["name"] + ": invalid square source crop")
        crop = image.convert("RGB").crop((x, y, x + width, y + height))
        rendered = crop.resize((size, size), Image.Resampling.LANCZOS)
        buffer = BytesIO()
        rendered.save(buffer, format="JPEG", quality=94, subsampling=0)
    return buffer.getvalue()


def existing_names(static, current):
    outside = re.sub(MARKER, "", current, flags=re.S)
    original_entries = re.search(r"TK\.EXTRA_PORTRAITS=(\{[^\n]+\});", outside)
    if not original_entries:
        invalid("Cannot identify existing portrait definitions")
    protected = set(json.loads(original_entries[1]))
    protected.update(re.findall(r'TK\.EXTRA_PORTRAITS\["([^"]+)"\]', outside))
    sprite = re.search(r"TK\.FACES=(\{[^\n]+\});", (static / "hist.js").read_text())
    if not sprite:
        invalid("Cannot identify existing sprite portraits")
    protected.update(json.loads(sprite[1]))
    return protected


def validate_output_name(row):
    if not row["name"] or any(c in row["name"] for c in "/\\"):
        invalid("Person name must be a single filename component")
    if row["output"] != "portraits/reviewed-" + row["name"] + ".jpg":
        invalid("Reviewed output must use its dedicated person filename")


def build(root, manifest):
    data = json.loads(manifest.read_text())
    rows = data["portraits"]
    if not rows or len({row["name"] for row in rows}) != len(rows):
        invalid("Reviewed portrait names must be distinct")
    size = data["outputSize"]
    if size != CELL_SIZE:
        invalid("Portrait cells must use the shared 128px size")
    static = root / "kuniezu/static/kuniezu"
    layout = static / "portrait-layout.js"
    current = layout.read_text()
    protected = existing_names(static, current)
    if any(row["name"] in protected for row in rows):
        invalid("Reviewed addition would overwrite an existing portrait")
    outputs, entries, cells = {}, {}, []
    for row in rows:
        validate_output_name(row)
        target = (static / row["output"]).resolve()
        if not target.is_relative_to((static / "portraits").resolve()):
            invalid("Output must remain in portraits")
        if target in outputs:
            invalid("Portrait outputs must be distinct")
        encoded = load_cell(root, row, size)
        with Image.open(BytesIO(encoded)) as decoded:
            cells.append(decoded.convert("RGB"))
        outputs[target] = encoded
        version = hashlib.sha256(encoded).hexdigest()[:10]
        entries[row["name"]] = {
            "src": row["output"] + "?v=" + version,
            "size": [size, size],
            "crop": [0, 0, size, size],
            "source": row["source"],
            "identitySource": row["identitySource"],
            "review": row["review"],
        }
    strip = Image.new("RGB", (size, size * len(cells)))
    for index, cell in enumerate(cells):
        strip.paste(cell, (0, size * index))
    fallback_buffer = BytesIO()
    strip.save(fallback_buffer, format="WEBP", lossless=True, method=6)
    fallback_content = fallback_buffer.getvalue()
    fallback_src = "portraits/reviewed-fallback.webp"
    outputs[static / fallback_src] = fallback_content
    fallback_version = hashlib.sha256(fallback_content).hexdigest()[:10]
    fallbacks = {
        row["name"]: {
            "src": fallback_src + "?v=" + fallback_version,
            "crop": [0, index * size, size, size],
        }
        for index, row in enumerate(rows)
    }
    if len(re.findall(MARKER, current, flags=re.S)) > 1:
        invalid("Multiple generated portrait blocks")
    block = (
        "// reviewed-additions:start\nObject.assign(TK.EXTRA_PORTRAITS,"
        + json.dumps(entries, ensure_ascii=False, separators=(",", ":"))
        + ");\nObject.assign(TK.PORTRAIT_FALLBACK,"
        + json.dumps(fallbacks, ensure_ascii=False, separators=(",", ":"))
        + ");\n// reviewed-additions:end"
    )
    output = (
        re.sub(MARKER, lambda _: block, current, flags=re.S)
        if re.search(MARKER, current, flags=re.S)
        else current.rstrip() + "\n\n" + block + "\n"
    )
    outputs[layout] = output.encode()
    return outputs


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument(
        "--manifest",
        type=Path,
        default=Path(__file__).with_name("reviewed-portraits.json"),
    )
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--write", action="store_true")
    args = parser.parse_args()
    outputs = build(args.root.resolve(), args.manifest)
    for target, content in outputs.items():
        if args.check:
            if not target.exists() or target.read_bytes() != content:
                raise SystemExit(
                    "FAIL: portrait output missing or changed: " + str(target)
                )
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(content)
    print("PASS: reviewed portrait outputs", len(outputs) - 2)


if __name__ == "__main__":
    main()
