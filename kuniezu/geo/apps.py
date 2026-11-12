from django.apps import AppConfig


class GeoConfig(AppConfig):
    """Counties, provinces and place points with GeoDjango.

    Installed only by config.settings.geo. The other settings, and the static
    export, never load it.
    """

    name = "kuniezu.geo"
    label = "geo"
    verbose_name = "地理"
