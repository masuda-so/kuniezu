from django.apps import apps
from django.urls import URLPattern
from django.urls import URLResolver
from django.urls import path

from kuniezu.views import game_index

urlpatterns: list[URLPattern | URLResolver] = [
    path("", game_index, name="home"),
    # The entry point the game has always had. The browser checks in
    # tools/checks/ open http://localhost:8000/index.html by default.
    path("index.html", game_index, name="index"),
]

# The admin site for reading the history database. Only the development
# settings (config.settings.local) install it; see kuniezu/history/admin.py.
if apps.is_installed("django.contrib.admin"):
    from django.contrib import admin

    urlpatterns.append(path("admin/", admin.site.urls))
