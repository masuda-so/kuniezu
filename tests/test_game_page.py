from http import HTTPStatus

import pytest
from django.core.exceptions import ImproperlyConfigured
from django.test import Client

from kuniezu.views import game_page_html


@pytest.fixture
def game_dir(tmp_path, settings):
    directory = tmp_path / "game"
    directory.mkdir()
    settings.GAME_DIR = directory
    return directory


def test_page_is_the_game_index_with_a_base_element(game_dir):
    (game_dir / "index.html").write_text(
        "<!doctype html><html><head><meta charset=utf8>"
        "<style>#a{b:c}{%x%}</style></head>"
        '<body><script src="data.js?v=1"></script></body></html>',
        encoding="utf-8",
    )

    response = Client().get("/")

    assert response.status_code == HTTPStatus.OK
    html = response.content.decode()
    # Relative URLs in the game resolve under the static prefix.
    assert '<head><base href="/static/kuniezu/">' in html
    # The file is passed through untouched: template-like CSS is not rendered.
    assert "<style>#a{b:c}{%x%}</style>" in html
    assert '<script src="data.js?v=1"></script>' in html


def test_real_game_index_has_exactly_one_head(settings):
    html = game_page_html()

    assert html.count("<head>") == 1
    assert html.count("<base ") == 1


@pytest.mark.parametrize("content", ["<html><body></body></html>", "<head><head>"])
def test_page_rejects_an_index_without_a_single_head(game_dir, content):
    (game_dir / "index.html").write_text(content, encoding="utf-8")

    with pytest.raises(ImproperlyConfigured):
        game_page_html()
