"""The game page.

The page is the template kuniezu/templates/index.html. Its ``<base>`` element
points at the game's static files (kuniezu/static/kuniezu/), so every relative
URL the game uses (scripts, styles, images, ``fetch("map/build/...")``)
resolves under ``/static/kuniezu/``. Everything inside ``<body>`` is wrapped in
``{% verbatim %}``: the game's markup and its inline boot script are passed
through as written.
"""

from django.views.generic import TemplateView


class GameIndexView(TemplateView):
    template_name = "index.html"


game_index = GameIndexView.as_view()
