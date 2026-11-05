from django.test import Client

from scripts.build_static import build


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
        "index.html",
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
