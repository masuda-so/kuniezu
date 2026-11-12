"""The GIS foundation: run with ``uv run pytest --ds=config.settings.geo tests_geo``.

These tests need GDAL, GEOS, PROJ and SpatiaLite on the machine. The default
``uv run pytest`` does not collect them (``testpaths`` leaves this folder out).
"""

import sqlite3

import pytest
from django.conf import settings
from django.contrib.gis import gdal
from django.contrib.gis import geos
from django.db import connection


def test_the_python_build_can_load_sqlite_extensions():
    database = sqlite3.connect(":memory:")
    try:
        database.enable_load_extension(True)  # noqa: FBT003
    finally:
        database.close()


def test_geodjango_and_the_geo_app_are_installed():
    assert "django.contrib.gis" in settings.INSTALLED_APPS
    assert "kuniezu.geo" in settings.INSTALLED_APPS
    assert settings.DATABASES["default"]["ENGINE"] == (
        "django.contrib.gis.db.backends.spatialite"
    )


def test_libraries_report_their_versions():
    print("GDAL", gdal.gdal_full_version().decode())  # noqa: T201
    print("GEOS", geos.geos_version().decode())  # noqa: T201
    assert gdal.GDAL_VERSION >= (3, 0)


@pytest.mark.django_db
def test_spatialite_database_has_spatial_metadata():
    with connection.cursor() as cursor:
        cursor.execute("SELECT spatialite_version(), proj_version()")
        spatialite, proj = cursor.fetchone()
        cursor.execute("SELECT COUNT(*) FROM spatial_ref_sys WHERE srid = 4326")
        (wgs84,) = cursor.fetchone()
    print("SpatiaLite", spatialite, "|", proj)  # noqa: T201
    assert wgs84 == 1


@pytest.mark.django_db
def test_spatialite_answers_a_containment_query():
    county = geos.Polygon(((0, 0), (2, 0), (2, 2), (0, 2), (0, 0)), srid=4326)
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT ST_Covers(GeomFromText(%s, 4326), GeomFromText(%s, 4326)),"
            " ST_Covers(GeomFromText(%s, 4326), GeomFromText(%s, 4326))",
            [county.wkt, "POINT (1 1)", county.wkt, "POINT (3 1)"],
        )
        inside, outside = cursor.fetchone()
    assert (inside, outside) == (1, 0)
