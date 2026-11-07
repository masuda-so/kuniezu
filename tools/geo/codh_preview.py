# ruff: noqa: INP001
"""Build a local, standalone CODH reference viewer; never alter the game map."""

import argparse
import json
import sys
from pathlib import Path

from codh_reference import ROOT
from codh_reference import prepare


def build(output):
    template = Path(__file__).with_name("codh_preview.html").read_text(encoding="utf-8")
    projection = json.loads(
        (ROOT / "kuniezu/map/projection.json").read_text(encoding="utf-8")
    )
    report = prepare(ROOT / "data/inputs/codh-edo/manifest.json", output)
    layers = {}
    for key in ("coast-polygons", "lake-polygons", "roads", "posts"):
        layers[key] = json.loads(
            (output / (key + ".geojson")).read_text(encoding="utf-8")
        )
    # An inert JSON script must not be terminated by source attribute strings.
    payload = json.dumps(
        {"projection": projection, "layers": layers, "sources": report["datasets"]},
        ensure_ascii=False,
        separators=(",", ":"),
    ).replace("<", "\\u003c")
    (output / "index.html").write_text(
        template.replace("__CODH_DATA__", payload), encoding="utf-8"
    )
    return output / "index.html"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output", required=True, type=Path, help="New output directory"
    )
    args = parser.parse_args()
    sys.stdout.write(str(build(args.output)) + "\n")


if __name__ == "__main__":
    main()
