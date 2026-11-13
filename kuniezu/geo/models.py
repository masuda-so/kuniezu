"""Provinces, counties and castle points (docs/designs/county-territory.md).

Loaded only by config.settings.geo. The shapes come from the CODH old province
and county boundaries (CC BY-NC 4.0, Edo period), loaded with load_codh_kg.
"""

from django.contrib.gis.db import models


class Kuni(models.Model):
    """A province (国), keyed by its CODH id such as ``K01``."""

    codh_id = models.CharField(max_length=8, unique=True)
    name = models.CharField(max_length=40)
    yomi = models.CharField(max_length=80, blank=True)
    geom = models.MultiPolygonField(srid=4326)

    class Meta:
        ordering = ["codh_id"]

    def __str__(self) -> str:
        return f"{self.codh_id} {self.name}"


class Gun(models.Model):
    """A county (郡), keyed by its CODH id such as ``G01001``."""

    codh_id = models.CharField(max_length=8, unique=True)
    name = models.CharField(max_length=40)
    yomi = models.CharField(max_length=80, blank=True)
    kuni = models.ForeignKey(Kuni, on_delete=models.PROTECT, related_name="guns")
    geom = models.MultiPolygonField(srid=4326)

    class Meta:
        ordering = ["codh_id"]

    def __str__(self) -> str:
        return f"{self.codh_id} {self.name}"


class CastlePoint(models.Model):
    """A castle of the game, linked to the county that covers its point.

    ``waypoint`` marks the castles that are march nodes with troops (the old
    main castles); the others hold no troops. Ownership is not stored here.
    """

    key = models.CharField(max_length=200, unique=True)
    name = models.CharField(max_length=80)
    waypoint = models.BooleanField()
    point = models.PointField(srid=4326)
    gun = models.ForeignKey(
        Gun, null=True, blank=True, on_delete=models.SET_NULL, related_name="castles"
    )

    class Meta:
        ordering = ["key"]

    def __str__(self) -> str:
        return self.key


class GunCell(models.Model):
    """The part of a county nearest to one of its castles."""

    gun = models.ForeignKey(Gun, on_delete=models.CASCADE, related_name="cells")
    castle = models.ForeignKey(
        CastlePoint, on_delete=models.CASCADE, related_name="cells"
    )
    geom = models.MultiPolygonField(srid=4326)

    class Meta:
        ordering = ["gun__codh_id", "castle__key"]
        constraints = [
            models.UniqueConstraint(
                fields=["gun", "castle"], name="one_cell_per_castle"
            )
        ]
