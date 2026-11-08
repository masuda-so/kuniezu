"""編集正本の別路線への変更を通常配信ビルドが上書きしない。"""

import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from tools.geo.generated_js_block import replace_generated_block

ROOT = Path(__file__).resolve().parents[1]
ROADS = "kuniezu/map/physical/roads-reference.geojson"


class RoadRegenerationTests(unittest.TestCase):
    def test_legacy_and_malformed_boundaries(self) -> None:
        start, end = "/* start */", "/* end */"
        body = "(function(){\nconst x=2;\n})();"
        legacy = "prefix\n" + start + "\n(function(){\nconst x=1;\n})();\nsuffix\n"
        updated = replace_generated_block(legacy, start, end, body)
        assert updated.startswith("prefix\n")
        assert updated.endswith("suffix\n")
        assert replace_generated_block(updated, start, end, body) == updated
        unclosed = (
            start + "\n(function(){\nconst x=1;\n/* another correction */\n"
            "(function(){\nconst y=2;\n})();\n/* another end */\n"
        )
        for bad in [start + "broken", start + start, end + start + "x", end, unclosed]:
            with self.subTest(text=bad):
                try:
                    replace_generated_block(bad, start, end, body)
                except ValueError:
                    continue
                raise AssertionError(bad)

    def test_build_preserves_independently_edited_roads(self) -> None:
        with tempfile.TemporaryDirectory(prefix="kuniezu-road-regen-") as temporary:
            fixture = Path(temporary)
            source = fixture / "source"
            canonical = source / "physical" / "roads-reference.geojson"
            output = fixture / "published"
            canonical.parent.mkdir(parents=True)
            shutil.copy2(ROOT / ROADS, canonical)
            records = json.loads(canonical.read_text())
            originals = {
                feature["properties"]["name"]: feature
                for feature in records["features"]
            }
            first = json.loads(json.dumps(originals["三州街道"]))
            second = json.loads(json.dumps(originals["北国街道（近江）"]))
            first["geometry"]["coordinates"][1][0] += 0.000001
            second["geometry"]["coordinates"][1][1] += 0.000001
            replacements = {"三州街道": first, "北国街道（近江）": second}

            node = shutil.which("node")
            assert node is not None

            def build() -> None:
                result = subprocess.run(  # noqa: S603 -- このリポジトリ内の生成器のみ
                    [
                        node,
                        "-e",
                        (
                            "require(process.argv[1]).build({"
                            "source:process.argv[2],output:process.argv[3]})"
                        ),
                        str(ROOT / "tools/map/build-vector-assets.cjs"),
                        str(source),
                        str(output),
                    ],
                    capture_output=True,
                    text=True,
                    check=False,
                )
                assert result.returncode == 0, result.stderr
                assert (output / "physical/roads-reference.geojson").read_bytes() == (
                    canonical.read_bytes()
                )

            for name in ("三州街道", "北国街道（近江）"):
                records["features"] = [
                    replacements[name]
                    if feature["properties"]["name"] == name
                    else feature
                    for feature in records["features"]
                ]
                canonical.write_text(json.dumps(records, ensure_ascii=False))
                before = canonical.read_bytes()
                build()
                assert canonical.read_bytes() == before

            stable = canonical.read_bytes()
            build()
            assert canonical.read_bytes() == stable
            after = {
                feature["properties"]["name"]: feature
                for feature in json.loads(stable)["features"]
            }
            assert after["三州街道"] == first
            assert after["北国街道（近江）"] == second
            assert {
                key: value for key, value in after.items() if key not in replacements
            } == {
                key: value
                for key, value in originals.items()
                if key not in replacements
            }

    def test_ina_generation_keeps_geometry_out_of_runtime_metadata(self) -> None:
        with tempfile.TemporaryDirectory(prefix="kuniezu-ina-metadata-") as temporary:
            fixture = Path(temporary)
            module = "kuniezu/static/kuniezu/ina-approach.js"
            files = (
                "tools/geo/ina-approach.py",
                "data/inputs/ina-approach-route.json",
                "data/inputs/ina-approach-corridors.json",
                module,
            )
            for name in files:
                target = fixture / name
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(ROOT / name, target)
            result = subprocess.run(  # noqa: S603 -- 保持するメタデータ生成器だけ
                [sys.executable, str(fixture / "tools/geo/ina-approach.py")],
                cwd=fixture,
                capture_output=True,
                text=True,
                check=False,
            )
            assert result.returncode == 0, result.stderr
            generated = (fixture / module).read_bytes()
            assert generated == (ROOT / module).read_bytes()
            assert b"MODERN_ROAD_REFERENCE" not in generated
            assert b"TK.CAMPAIGN_CORRIDORS" in generated
            assert b"TK.ROADS.push" in generated
