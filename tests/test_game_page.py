import re
from http import HTTPStatus
from pathlib import Path

from django.conf import settings as django_settings
from django.contrib.staticfiles import finders
from django.test import Client

TEMPLATE_SYNTAX = re.compile(r"{%.*?%}|{{.*?}}|{#.*?#}")


ASSET_URL = re.compile(r'(?:<script src|<link rel="stylesheet" href)="([^"?:]+)')


def template_source() -> str:
    template = Path(django_settings.APPS_DIR) / "templates" / "index.html"
    return template.read_text(encoding="utf-8")


def test_page_points_relative_urls_at_the_static_files():
    response = Client().get("/")

    assert response.status_code == HTTPStatus.OK
    html = response.content.decode()
    # Relative URLs in the game resolve under the static prefix.
    assert html.startswith(
        '<!doctype html><html lang="ja"><head><base href="/static/kuniezu/">'
    )
    assert html.count("<head>") == 1
    assert html.count("<base ") == 1


def test_the_traditional_entry_point_serves_the_same_page():
    client = Client()

    assert client.get("/index.html").status_code == HTTPStatus.OK
    assert client.get("/index.html").content == client.get("/").content


def test_page_is_the_template_with_only_the_base_url_filled_in():
    source = template_source()

    # The Node tools (tools/build/game-page.cjs) fill in the same four tags, so
    # the template must not grow other template syntax without them.
    assert TEMPLATE_SYNTAX.findall(source) == [
        "{% load static %}",
        "{% static 'kuniezu/' %}",
        "{% verbatim %}",
        "{% endverbatim %}",
    ]
    expected = (
        source.replace("{% load static %}", "")
        .replace("{% static 'kuniezu/' %}", "/static/kuniezu/")
        .replace("{% verbatim %}", "")
        .replace("{% endverbatim %}", "")
    )
    assert Client().get("/").content.decode() == expected


def test_page_has_no_inline_styles():
    # Inline CSS would put ``{#`` and ``%}`` sequences back into the template.
    assert "<style" not in template_source()


def test_page_styles_and_scripts_are_the_apps_static_files():
    names = ASSET_URL.findall(template_source())

    assert "index.css" in names
    assert "engine.js" in names
    missing = [name for name in names if finders.find(f"kuniezu/{name}") is None]
    assert missing == []


def test_game_files_are_the_apps_static_files():
    # The game lives in kuniezu/static/kuniezu/, so the app finder serves it
    # under /static/kuniezu/ without an extra STATICFILES_DIRS entry.
    found = finders.find("kuniezu/engine.js")

    assert found is not None
    assert Path(found) == Path(django_settings.GAME_DIR) / "engine.js"
