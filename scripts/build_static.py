"""Build the static export of the game for deployment.

Renders the game page through Django and copies the game's static files to
``dist/client/``. The map sources live outside the static files (kuniezu/map/),
so only the generated ``map/build/`` is exported; its previews and working
grid are left out because the browser never requests them.
"""

from __future__ import annotations

import base64
import gzip
import hashlib
import logging
import os
import re
import shutil
import subprocess
import sys
import tempfile
from http import HTTPStatus
from pathlib import Path
from typing import TYPE_CHECKING
from typing import Any

if TYPE_CHECKING:
    from collections.abc import Callable

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
DIST = ROOT / "dist"
LOGGER = logging.getLogger(__name__)
TEST_CLIENT_HOST = "testserver"
# Paths relative to the game directory that the browser never requests.
EXCLUDED = (
    "map/build/previews",
    "map/build/grid",
    # A note for people editing the game folder, not for players.
    "README.md",
)


# Cloudflare Workers Static Assets rejects any single file above 25 MiB.
MAX_ASSET_BYTES = 25 * 1024 * 1024
# Inline scripts are hashed, not filtered: one this pattern misses gets no hash
# and the policy blocks it. Tag names match in any letter case, as in HTML.
INLINE_SCRIPT = re.compile(rb"<script>(.*?)</script\s*>", re.DOTALL | re.IGNORECASE)
INLINE_HANDLER = re.compile(rb'\son[a-z]+="([^"]*)"', re.IGNORECASE)


# The game uses none of these browser features, so no script may ask for them.
# Same value as masuda-so/website.
PERMISSIONS_POLICY = (
    "camera=(), geolocation=(), microphone=(), focus-without-user-activation=()"
)


def csp_hash(source: bytes) -> str:
    digest = base64.b64encode(hashlib.sha256(source).digest()).decode()
    return f"'sha256-{digest}'"


def content_security_policy(page: bytes) -> str:
    """Allow exactly what the page uses.

    The one inline loader script and the one inline event handler are allowed
    by their hashes, so a changed or injected script does not run. The game
    builds markup with ``style`` attributes and runs a terrain worker from a
    blob, and it draws images from data and blob URLs.
    """
    scripts = " ".join(csp_hash(body) for body in INLINE_SCRIPT.findall(page))
    handlers = " ".join(csp_hash(body) for body in INLINE_HANDLER.findall(page))
    return (
        "default-src 'self'; "
        f"script-src 'self' {scripts}; "
        f"script-src-attr 'unsafe-hashes' {handlers}; "
        "style-src 'self'; "
        "style-src-attr 'unsafe-inline'; "
        "font-src 'self'; "
        "img-src 'self' data: blob:; "
        "worker-src 'self' blob:; "
        "connect-src 'self'; "
        "object-src 'none'; "
        "base-uri 'self'; "
        "form-action 'self'; "
        "frame-ancestors 'none'"
    )


def write_headers(client_dir: Path, page: bytes) -> None:
    # Cloudflare Workers Static Assets reads this file and applies the headers;
    # it is not served as an asset.
    (client_dir / "_headers").write_text(
        "/*\n"
        f"  Content-Security-Policy: {content_security_policy(page)}\n"
        "  Strict-Transport-Security: max-age=63072000\n"
        "  X-Content-Type-Options: nosniff\n"
        "  X-Frame-Options: DENY\n"
        "  Referrer-Policy: strict-origin-when-cross-origin\n"
        f"  Permissions-Policy: {PERMISSIONS_POLICY}\n"
        "  Cross-Origin-Opener-Policy: same-origin-allow-popups\n"
        # Unfinished: shared by URL, kept out of search results. Crawlers
        # must be allowed to fetch the pages to see this, so robots.txt
        # does not block them.
        "  X-Robots-Tag: noindex\n",
        encoding="utf-8",
    )
    (client_dir / "robots.txt").write_text(
        "User-agent: *\nAllow: /\n",
        encoding="utf-8",
    )


NOT_FOUND_PAGE = """<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>ページが見つかりません - 天下分け目の国絵図</title>
<link rel="stylesheet" href="/404.css">
</head>
<body>
<main>
<h1>ページが見つかりません</h1>
<p>お探しのページは、移動したか、はじめから無いようです。</p>
<p><a href="/">天下分け目の国絵図へ戻る</a></p>
</main>
</body>
</html>
"""
NOT_FOUND_STYLE = """body{margin:0;min-height:100vh;display:grid;place-content:center}
body{padding:24px;text-align:center;background:#1c3157;color:#f3e8cc}
body{font-family:serif;line-height:1.8}
h1{font-size:1.5rem;margin:0 0 .5em}
a{color:#d9b866}
"""


def write_not_found(client_dir: Path) -> None:
    """Write the page the host serves for any path that has no file."""
    (client_dir / "404.html").write_text(NOT_FOUND_PAGE, encoding="utf-8")
    (client_dir / "404.css").write_text(NOT_FOUND_STYLE, encoding="utf-8")


def gzip_oversized_vectors(client_dir: Path) -> list[Path]:
    """Replace vector files above the asset limit with a gzip copy.

    The game checks every vector file against the byte length and SHA-256 in
    the vector manifest, so the exported bytes must stay those of the edited
    source. ``vector-assets.js`` asks for ``<name>.gz`` when ``<name>`` is
    absent and checks the decompressed bytes in the same way.
    """
    compressed = []
    for path in sorted(client_dir.rglob("*.geojson")):
        if path.stat().st_size <= MAX_ASSET_BYTES:
            continue
        target = path.with_name(path.name + ".gz")
        # mtime=0 keeps the output identical between builds.
        target.write_bytes(gzip.compress(path.read_bytes(), mtime=0))
        path.unlink()
        compressed.append(target)
    too_large = [
        path
        for path in sorted(client_dir.rglob("*"))
        if path.is_file() and path.stat().st_size > MAX_ASSET_BYTES
    ]
    if too_large:
        names = ", ".join(str(path.relative_to(client_dir)) for path in too_large)
        message = f"Files above the 25 MiB static asset limit: {names}"
        raise RuntimeError(message)
    return compressed


def copy_game(game_dir: Path, target: Path) -> None:
    excluded = {game_dir / name for name in EXCLUDED}

    def ignore(directory: str, names: list[str]) -> set[str]:
        here = Path(directory)
        return {
            name for name in names if name == ".DS_Store" or here / name in excluded
        }

    shutil.copytree(game_dir, target, ignore=ignore)


def check_no_gis(settings: Any) -> None:
    """Refuse to export with GeoDjango loaded.

    The export host has no GIS libraries, and the page needs none. The
    environment can still name config.settings.geo, since build() only sets
    DJANGO_SETTINGS_MODULE when it is unset.
    """
    engine = settings.DATABASES["default"]["ENGINE"]
    if "django.contrib.gis" in settings.INSTALLED_APPS or engine.startswith(
        "django.contrib.gis"
    ):
        message = (
            "The static export must run without GeoDjango; unset "
            "DJANGO_SETTINGS_MODULE or use config.settings.test."
        )
        raise RuntimeError(message)


def restamp(page: bytes, game_dir: Path, name: str) -> bytes:
    """Point the page's script tag for ``name`` at the file's current hash.

    Same hash as tools/build/stamp-assets.cjs: the first ten hex digits of
    the file's SHA-256.
    """
    path = game_dir / name
    if not path.exists():
        return page
    digest = hashlib.sha256(path.read_bytes()).hexdigest()[:10].encode()
    pattern = re.compile(
        rb'(<script src="' + re.escape(name.encode()) + rb")\?v=[0-9a-f]+"
    )
    return pattern.sub(rb"\1?v=" + digest, page)


def export_game_data(target: Path) -> None:
    """Write the castle owners and death years into ``target``.

    The database is a temporary SQLite file, filled from the inputs in the
    repository, so the local db.sqlite3 is never touched. Each step runs in a
    child process with the default (non-GIS) settings.
    """
    with tempfile.TemporaryDirectory() as folder:
        env = {
            **os.environ,
            "DJANGO_SETTINGS_MODULE": "config.settings.test",
            "DATABASE_URL": f"sqlite:///{Path(folder) / 'history.sqlite3'}",
        }
        for command in (
            ["migrate", "--verbosity", "0"],
            ["import_history"],
            ["export_game_data", "--output", str(target)],
        ):
            subprocess.run(  # noqa: S603
                [sys.executable, str(ROOT / "manage.py"), *command],
                check=True,
                cwd=ROOT,
                env=env,
                stdout=subprocess.DEVNULL,
            )
    # The manifest is for the build log, not for the browser.
    (target / "manifest.json").unlink()


def build(dist: Path = DIST, export: Callable[[Path], None] = export_game_data) -> Path:
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.test")

    import django  # noqa: PLC0415
    from django.conf import settings  # noqa: PLC0415

    # Reading the settings loads only the settings module; check it before
    # django.setup() imports the apps, which with GeoDjango load GDAL.
    check_no_gis(settings)
    django.setup()

    from django.test import Client  # noqa: PLC0415

    client_dir = dist / "client"
    shutil.rmtree(dist, ignore_errors=True)
    client_dir.mkdir(parents=True)

    # The page is rendered in-process; the test client's host is the only one
    # that asks for it.
    settings.ALLOWED_HOSTS = [TEST_CLIENT_HOST]
    response = Client().get("/")
    if response.status_code != HTTPStatus.OK:
        message = f"Page render failed for /: HTTP {response.status_code}"
        raise RuntimeError(message)
    # Static hosts serve this one file for both / and /index.html.
    (client_dir / "index.html").write_bytes(response.content)

    static_url = settings.STATIC_URL.strip("/")
    game_dir = client_dir / static_url / "kuniezu"
    copy_game(Path(settings.GAME_DIR), game_dir)
    # Replaces the empty defaults history/owners.js and history/deaths.js
    # with the database's, and stamps the page with the new files' hashes so
    # browsers fetch them again.
    export(game_dir / "history")
    page = restamp(response.content, game_dir, "history/owners.js")
    page = restamp(page, game_dir, "history/deaths.js")
    (client_dir / "index.html").write_bytes(page)
    for path in gzip_oversized_vectors(client_dir):
        LOGGER.info("Compressed %s", path.relative_to(client_dir))
    write_headers(client_dir, page)
    write_not_found(client_dir)
    return client_dir


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    LOGGER.info("Built the game in %s", build())
