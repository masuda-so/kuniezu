"""実入力の生成順を変え、同居する街道の訂正と形状を保持する。"""

import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from tools.geo.generated_js_block import replace_generated_block

ROOT = Path(__file__).resolve().parents[1]
MODULE = "kuniezu/static/kuniezu/road-evidence-update.js"
ROADS = "kuniezu/static/kuniezu/modern-road-reference.js"


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

    def test_real_generators_preserve_other_roads(self) -> None:
        with tempfile.TemporaryDirectory(prefix="kuniezu-road-regen-") as temporary:
            fixture = Path(temporary)
            (fixture / "data/audits").mkdir(parents=True)
            files = [
                "tools/geo/generated_js_block.py",
                "tools/geo/road_reference_review.py",
                "tools/geo/road_geometry_network.py",
                "tools/geo/hokkokukaido-apply.py",
                "tools/geo/sanshu-reference.py",
                MODULE,
                ROADS,
                "data/inputs/sanshu-road-review",
                "data/inputs/hokkokukaido-review/gsi-network-candidate.json",
            ]
            files.extend(
                f"data/research/curated/sources/{source_id}.json"
                for source_id in [
                    "hokkokuNagahamaGuide",
                    "gsiExperimentalRoads",
                    "sanshuShiojiri",
                    "sanshuCodhPosts",
                    "sanshuModernMountain",
                    "sanshuModernFoot",
                ]
            )
            for name in files:
                source, target = ROOT / name, fixture / name
                target.parent.mkdir(parents=True, exist_ok=True)
                if source.is_dir():
                    shutil.copytree(source, target)
                else:
                    shutil.copy2(source, target)

            def run(name: str) -> None:
                result = subprocess.run(  # noqa: S603 -- このリポジトリ内の生成器のみ実行
                    [sys.executable, name],
                    cwd=fixture,
                    capture_output=True,
                    text=True,
                    check=False,
                )
                assert result.returncode == 0, result.stderr

            def block(start: str, end: str) -> str:
                text = (fixture / MODULE).read_text()
                first = text.index(start)
                last = text.index(end, first)
                return text[first : last + len(end)]

            def roads() -> dict[str, object]:
                text = (fixture / ROADS).read_text()
                payload = text.split("TK.MODERN_ROAD_REFERENCE=")[1].split(";")[0]
                return dict(json.loads(payload))

            sanshu_markers = (
                "/* sanshu-reference.py generated correction */",
                "/* end sanshu-reference.py generated correction */",
            )
            hok_markers = (
                "/* hokkokukaido-apply.py: comparison geometry */",
                "/* end hokkokukaido-apply.py: comparison geometry */",
            )
            before_roads = roads()
            sanshu = block(*sanshu_markers)
            run("tools/geo/hokkokukaido-apply.py")
            assert block(*sanshu_markers) == sanshu
            hok = block(*hok_markers)
            run("tools/geo/sanshu-reference.py")
            assert block(*hok_markers) == hok
            stable = (fixture / MODULE).read_text()
            run("tools/geo/hokkokukaido-apply.py")
            run("tools/geo/sanshu-reference.py")
            assert (fixture / MODULE).read_text() == stable
            assert roads() == before_roads
