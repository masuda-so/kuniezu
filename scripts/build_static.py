"""Build the static export of the game for deployment.

Renders the game page through Django and copies the files the browser needs to
``dist/client/``. The map sources (CK3-style images and tables under
``kuniezu/static/kuniezu/map/``) are build inputs, so only what the game
fetches at run time is exported: ``map/build/`` and the two definition files
in ``map/control/``.
"""

from __future__ import annotations

import logging
import os
import shutil
import sys
from http import HTTPStatus
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
DIST = ROOT / "dist"
LOGGER = logging.getLogger(__name__)
TEST_CLIENT_HOST = "testserver"
# Paths relative to the game directory that the browser never requests.
EXCLUDED = (
    "map/admin",
    "map/physical",
    "map/edits",
    "map/projection.json",
    "map/control/provinces.png",
    "map/control/gun-assignment.csv",
    "map/control/gun-overrides.json",
    "map/build/previews",
    "map/build/grid",
)


def copy_game(game_dir: Path, target: Path) -> None:
    excluded = {game_dir / name for name in EXCLUDED}

    def ignore(directory: str, names: list[str]) -> set[str]:
        here = Path(directory)
        return {
            name for name in names if name == ".DS_Store" or here / name in excluded
        }

    shutil.copytree(game_dir, target, ignore=ignore)


def build(dist: Path = DIST) -> Path:
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.test")

    import django  # noqa: PLC0415

    django.setup()

    from django.conf import settings  # noqa: PLC0415
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
    copy_game(Path(settings.GAME_DIR), client_dir / static_url / "kuniezu")
    return client_dir


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    LOGGER.info("Built the game in %s", build())
