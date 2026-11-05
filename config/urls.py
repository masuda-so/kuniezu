from django.urls import path

from kuniezu.views import game_index

urlpatterns = [
    path("", game_index, name="home"),
]
