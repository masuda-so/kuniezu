import copy
import gzip
import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest
from django.test import Client

from scripts import build_static
from scripts.build_static import INLINE_SCRIPT
from scripts.build_static import build
from scripts.build_static import content_security_policy
from scripts.build_static import csp_hash


def no_export(target: Path) -> None:
    """Leave the game's default (empty) owner timeline in place."""


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

    client_dir = build(tmp_path / "dist", export=no_export)

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

    client_dir = build(tmp_path / "dist", export=no_export)

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
    assert "Permissions-Policy: camera=()" in headers
    assert "Cross-Origin-Opener-Policy: same-origin-allow-popups" in headers


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


def test_export_refuses_settings_with_geodjango():
    gis_app = SimpleNamespace(
        INSTALLED_APPS=["kuniezu", "django.contrib.gis"],
        DATABASES={"default": {"ENGINE": "django.db.backends.sqlite3"}},
    )
    gis_engine = SimpleNamespace(
        INSTALLED_APPS=["kuniezu"],
        DATABASES={"default": {"ENGINE": "django.contrib.gis.db.backends.spatialite"}},
    )
    for settings in (gis_app, gis_engine):
        with pytest.raises(RuntimeError, match="without GeoDjango"):
            build_static.check_no_gis(settings)


def test_export_stops_before_writing_with_a_gis_database(tmp_path, settings):
    # Swapping INSTALLED_APPS would reload the apps and load GDAL, which the
    # default test job does not have; the database engine shows the same check.
    databases = copy.deepcopy(settings.DATABASES)
    databases["default"]["ENGINE"] = "django.contrib.gis.db.backends.spatialite"
    settings.DATABASES = databases
    dist = tmp_path / "dist"

    with pytest.raises(RuntimeError, match="without GeoDjango"):
        build(dist, export=no_export)

    assert not dist.exists()


def test_export_loads_no_gis_library(tmp_path, settings):
    settings.GAME_DIR = tmp_path / "game"
    (tmp_path / "game").mkdir()

    build(tmp_path / "dist", export=no_export)

    assert "django.contrib.gis" not in settings.INSTALLED_APPS
    assert "django.contrib.gis.gdal" not in sys.modules


def test_plain_settings_refuse_a_gis_database_url(tmp_path):
    env = {
        **os.environ,
        "DATABASE_URL": f"spatialite:///{tmp_path / 'geo.sqlite3'}",
        "DJANGO_SETTINGS_MODULE": "config.settings.test",
    }
    result = subprocess.run(
        [sys.executable, "-c", "import django; django.setup()"],
        cwd=Path(__file__).resolve().parents[1],
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode != 0
    assert "GEO_DATABASE_URL" in result.stderr


def test_the_export_writes_the_owner_timeline_from_a_fresh_database(tmp_path):
    local = Path(build_static.ROOT / "db.sqlite3")
    before = local.stat().st_mtime_ns if local.exists() else None
    build_static.export_game_data(tmp_path)
    text = (tmp_path / "owners.js").read_text(encoding="utf-8")
    assert text.startswith("/*")
    assert "TK.OWNER_TIMELINE={" in text
    deaths = (tmp_path / "deaths.js").read_text(encoding="utf-8")
    assert "TK.DEATH_YEARS={" in deaths
    assert not (tmp_path / "manifest.json").exists()
    assert (local.stat().st_mtime_ns if local.exists() else None) == before


def test_the_page_names_the_exported_owner_timeline_by_its_hash(tmp_path):
    def export(target: Path) -> None:
        target.mkdir(parents=True, exist_ok=True)
        (target / "owners.js").write_text("TK.OWNER_TIMELINE={};\n", encoding="utf-8")

    client_dir = build(tmp_path / "dist", export=export)
    exported = client_dir / "static/kuniezu/history/owners.js"
    digest = hashlib.sha256(exported.read_bytes()).hexdigest()[:10]
    page = (client_dir / "index.html").read_text(encoding="utf-8")
    assert f'src="history/owners.js?v={digest}"' in page
    deaths = client_dir / "static/kuniezu/history/deaths.js"
    digest = hashlib.sha256(deaths.read_bytes()).hexdigest()[:10]
    assert f'src="history/deaths.js?v={digest}"' in page
