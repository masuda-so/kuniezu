from django.urls import path

from kuniezu.views import game_index

urlpatterns = [
    path("", game_index, name="home"),
    # The entry point the game has always had. The browser checks in
    # tools/checks/ open http://localhost:8000/index.html by default.
    path("index.html", game_index, name="index"),
]
