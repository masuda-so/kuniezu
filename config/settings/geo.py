"""
Settings with GeoDjango, for local work and the GIS job in CI.

Only these settings load django.contrib.gis and kuniezu.geo. They open their
own SpatiaLite file (GEO_DATABASE_URL, by default geo.sqlite3), never the
plain db.sqlite3 that the other settings and the static export use. See
docs/architecture/replatform-plan.md, stage 7.
"""

from .test import *  # noqa: F403
from .test import BASE_DIR
from .test import INSTALLED_APPS
from .test import env

# GIS LIBRARIES
# ------------------------------------------------------------------------------
# https://docs.djangoproject.com/en/dev/ref/contrib/gis/install/geolibs/
# Django does not find Homebrew's /opt/homebrew/lib by itself. Unset means
# Django's own search, which finds the system libraries on Ubuntu.
GDAL_LIBRARY_PATH = env("GDAL_LIBRARY_PATH", default=None)
GEOS_LIBRARY_PATH = env("GEOS_LIBRARY_PATH", default=None)
SPATIALITE_LIBRARY_PATH = env("SPATIALITE_LIBRARY_PATH", default=None)

# DATABASES
# ------------------------------------------------------------------------------
DATABASES = {
    "default": env.db(
        "GEO_DATABASE_URL",
        default=f"spatialite:///{BASE_DIR / 'geo.sqlite3'}",
    ),
}

# APPS
# ------------------------------------------------------------------------------
INSTALLED_APPS = [
    *INSTALLED_APPS,
    "django.contrib.gis",
    "kuniezu.geo",
]
