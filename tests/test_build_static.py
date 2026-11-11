import gzip
import json

import pytest
from django.test import Client

from scripts import build_static
from scripts.build_static import INLINE_SCRIPT
from scripts.build_static import build
from scripts.build_static import content_security_policy
from scripts.build_static import csp_hash


def test_export_writes_the_page_and_only_run_time_files(tmp_path, settings):
    game = tmp_path / "game"
    for name in (
        "data.js",
        "portraits/a.jpg",
        "map/build/manifest.json",
        "map/build/definition.csv",
        "map/build/default.map",
        "map/build/grid/work.bin",
        "map/build/provinces/0-0.png",
        "map/build/previews/control.png",
        ".DS_Store",
        "README.md",
    ):
        path = game / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("x", encoding="utf-8")
    settings.GAME_DIR = game

    client_dir = build(tmp_path / "dist")

    exported = sorted(
        str(path.relative_to(client_dir))
        for path in client_dir.rglob("*")
        if path.is_file()
    )
    assert exported == [
        "404.css",
        "404.html",
        "_headers",
        "index.html",
        "robots.txt",
        "static/kuniezu/data.js",
        "static/kuniezu/map/build/default.map",
        "static/kuniezu/map/build/definition.csv",
        "static/kuniezu/map/build/manifest.json",
        "static/kuniezu/map/build/provinces/0-0.png",
        "static/kuniezu/portraits/a.jpg",
    ]
    page = (client_dir / "index.html").read_bytes()
    assert page == Client().get("/").content
    assert b'<base href="/static/kuniezu/">' in page


def test_export_headers_allow_only_the_inline_code_the_page_contains(
    tmp_path, settings
):
    game = tmp_path / "game"
    game.mkdir()
    settings.GAME_DIR = game

    client_dir = build(tmp_path / "dist")

    page = (client_dir / "index.html").read_bytes()
    headers = (client_dir / "_headers").read_text(encoding="utf-8")
    policy = content_security_policy(page)
    assert f"Content-Security-Policy: {policy}" in headers
    assert "'unsafe-inline'" not in policy.split("script-src-attr")[0]
    for body in INLINE_SCRIPT.findall(page):
        assert csp_hash(body) in policy
    # Fonts are bundled, so no other host is allowed or contacted.
    assert "https://" not in policy
    assert b"fonts.googleapis.com" not in page
    assert "X-Robots-Tag: noindex" in headers
    assert b'<meta name="robots" content="noindex">' in page
    assert "Strict-Transport-Security" in headers
    assert "X-Frame-Options: DENY" in headers


def test_export_gzips_vectors_above_the_asset_limit_and_keeps_their_bytes(
    tmp_path, monkeypatch
):
    client_dir = tmp_path / "client"
    client_dir.mkdir()
    data = {
        "type": "FeatureCollection",
        "features": [{"名": "陸", "xy": [1.5, 2]}] * 40,
    }
    source = json.dumps(data, ensure_ascii=False, indent=2).encode()
    monkeypatch.setattr(build_static, "MAX_ASSET_BYTES", len(source) - 1)
    large = client_dir / "land.geojson"
    large.write_bytes(source)
    small = client_dir / "water.geojson"
    small.write_bytes(b"{}")

    compressed = build_static.gzip_oversized_vectors(client_dir)

    assert compressed == [client_dir / "land.geojson.gz"]
    assert not large.exists()
    assert gzip.decompress(compressed[0].read_bytes()) == source
    assert compressed[0].read_bytes() == gzip.compress(source, mtime=0)
    assert small.read_bytes() == b"{}"


def test_export_fails_when_a_file_stays_above_the_asset_limit(tmp_path, monkeypatch):
    monkeypatch.setattr(build_static, "MAX_ASSET_BYTES", 10)
    client_dir = tmp_path / "client"
    client_dir.mkdir()
    (client_dir / "big.png").write_bytes(b"x" * 11)

    with pytest.raises(RuntimeError, match=r"big\.png"):
        build_static.gzip_oversized_vectors(client_dir)
