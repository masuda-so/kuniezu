"""The game page.

Stage 1a of the re-platforming keeps the game where it is (game/). The page is
the game's own index.html with a ``<base>`` element, so every relative URL the
game uses (scripts, images, ``fetch("map/build/...")``) resolves under
``/static/kuniezu/``. The file is not a Django template: its inline CSS holds
``{#`` and ``{%`` sequences the template engine would misread. Stage 1b turns
it into a real template and moves the CSS to a static file.
"""

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.http import HttpRequest
from django.http import HttpResponse
from django.templatetags.static import static

HEAD = "<head>"


def game_page_html() -> str:
    html = (settings.GAME_DIR / "index.html").read_text(encoding="utf-8")
    if html.count(HEAD) != 1:
        message = "game/index.html must contain exactly one <head> tag"
        raise ImproperlyConfigured(message)
    base = f'<base href="{static("kuniezu/")}">'
    return html.replace(HEAD, HEAD + base, 1)


def game_index(request: HttpRequest) -> HttpResponse:
    return HttpResponse(game_page_html())
