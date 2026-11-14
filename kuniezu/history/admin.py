"""The admin site for the history database: for reading, not for editing.

The database is rebuilt from the inputs in Git (``manage.py import_history``),
so a change made here would be lost at the next import and would differ from
the inputs. Every page is therefore read-only; to change a fact, edit its
input (a claim, a record) and import again. The admin is enabled only by the
development settings (``config.settings.local``); see docs/structure.md.
"""

from typing import TYPE_CHECKING
from typing import Any

from django.contrib import admin

from . import dates
from .models import Authority
from .models import ImportRun
from .models import Participation
from .models import Phenomenon
from .models import Place
from .models import Record
from .models import RecordVersion
from .models import Representation
from .models import Source
from .models import Thing
from .models import ThingKey
from .models import ThingName

if TYPE_CHECKING:
    from django.http import HttpRequest

admin.site.site_header = "国絵図の史実 DB（閲覧）"
admin.site.site_title = "国絵図の史実 DB"
admin.site.index_title = (
    "入力から作り直すので、ここでは直さない（入力を直して取り込み直す）"
)


class ReadOnly:
    """No adding, changing or deleting: the inputs in Git are the source."""

    def has_add_permission(self, request: HttpRequest, obj: Any = None) -> bool:
        return False

    def has_change_permission(self, request: HttpRequest, obj: Any = None) -> bool:
        return False

    def has_delete_permission(self, request: HttpRequest, obj: Any = None) -> bool:
        return False


class ReadOnlyAdmin(ReadOnly, admin.ModelAdmin):
    list_per_page = 50


class ReadOnlyTabular(ReadOnly, admin.TabularInline):
    extra = 0
    show_change_link = True


CALENDAR_SHORT = {
    "Japanese-lunisolar": "旧暦",
    "western": "当時の西暦",
    "CE-year": "西暦の年",
    "Japanese-year": "旧暦の年",
    "Japanese-era-description": "時期",
}


def source_date(p: Phenomenon) -> str:
    """The date as the source gives it (calendar, year, month, day), or its label."""
    if p.year is None:
        return p.time_label
    text = f"{p.year}年"
    if p.month is not None:
        text += ("閏" if p.leap_month else "") + f"{p.month}月"
    if p.day is not None:
        text += f"{p.day}日"
    calendar = CALENDAR_SHORT.get(p.calendar, p.calendar)
    return f"{calendar} {text}".strip()


def iso_date(p: Phenomenon) -> str:
    return dates.iso_extent(p.jd_start, p.jd_end) or ""


class ThingKeyInline(ReadOnlyTabular):
    model = ThingKey
    show_change_link = False


class ThingNameInline(ReadOnlyTabular):
    model = ThingName
    show_change_link = False


class AuthorityInline(ReadOnlyTabular):
    model = Authority
    show_change_link = False


class PlaceInline(ReadOnly, admin.StackedInline):
    model = Place


class ThingParticipationInline(ReadOnlyTabular):
    """The phenomena a thing takes part in, from the thing's page."""

    model = Participation
    fk_name = "thing"
    fields = ("phenomenon", "role", "kind", "when", "iso")
    readonly_fields = ("phenomenon", "role", "kind", "when", "iso")
    verbose_name = "関わる現象"
    verbose_name_plural = "関わる現象（生没・所在・支配・関係・出来事）"

    def get_queryset(self, request: HttpRequest) -> Any:
        return (
            super()
            .get_queryset(request)
            .select_related("phenomenon")
            .order_by("phenomenon__jd_start", "phenomenon__key")
        )

    @admin.display(description="種類")
    def kind(self, obj: Participation) -> str:
        p = obj.phenomenon
        return f"{p.get_kind_display()}・{p.get_mode_display()} {p.subtype}".strip()

    @admin.display(description="原暦")
    def when(self, obj: Participation) -> str:
        return source_date(obj.phenomenon)

    @admin.display(description="ISO 8601")
    def iso(self, obj: Participation) -> str:
        return iso_date(obj.phenomenon)


@admin.register(Thing)
class ThingAdmin(ReadOnlyAdmin):
    list_display = ("name", "kind", "key", "registered")
    list_filter = ("kind", "registered")
    search_fields = ("name", "key", "names__name", "keys__key")
    inlines = (
        ThingNameInline,
        ThingKeyInline,
        AuthorityInline,
        PlaceInline,
        ThingParticipationInline,
    )
    exclude = ("records",)
    readonly_fields = ("record_keys",)

    @admin.display(description="出典の記録")
    def record_keys(self, obj: Thing) -> str:
        return "\n".join(obj.records.values_list("key", flat=True))


class PhenomenonParticipationInline(ReadOnlyTabular):
    model = Participation
    fk_name = "phenomenon"
    fields = ("thing", "role")
    readonly_fields = ("thing", "role")


@admin.register(Phenomenon)
class PhenomenonAdmin(ReadOnlyAdmin):
    list_display = (
        "__str__",
        "kind",
        "mode",
        "subtype",
        "when",
        "iso",
        "precision",
        "status",
    )
    list_filter = ("kind", "mode", "precision", "status", "calendar")
    search_fields = ("key", "title", "summary", "participations__thing__name")
    inlines = (PhenomenonParticipationInline,)
    exclude = ("records",)
    readonly_fields = ("when", "iso", "record_keys")
    ordering = ("jd_start", "key")
    show_facets = admin.ShowFacets.NEVER

    @admin.display(description="原暦")
    def when(self, obj: Phenomenon) -> str:
        return source_date(obj)

    @admin.display(description="ISO 8601", ordering="jd_start")
    def iso(self, obj: Phenomenon) -> str:
        return iso_date(obj)

    @admin.display(description="出典の記録")
    def record_keys(self, obj: Phenomenon) -> str:
        return "\n".join(obj.records.values_list("key", flat=True))


@admin.register(Record)
class RecordAdmin(ReadOnlyAdmin):
    list_display = ("key", "record_type", "status", "source", "checked")
    list_filter = ("record_type", "status")
    search_fields = ("key", "locator", "source__key", "source__title")
    list_select_related = ("source",)
    show_facets = admin.ShowFacets.NEVER


@admin.register(Source)
class SourceAdmin(ReadOnlyAdmin):
    list_display = ("key", "title", "author")
    search_fields = ("key", "title", "author")


@admin.register(Representation)
class RepresentationAdmin(ReadOnlyAdmin):
    list_display = ("site", "place", "label", "basis")
    search_fields = ("site__key", "site__name", "place__key", "place__name")
    list_select_related = ("site", "place")


@admin.register(ImportRun)
class ImportRunAdmin(ReadOnlyAdmin):
    list_display = ("id", "started_at", "git_commit")


@admin.register(RecordVersion)
class RecordVersionAdmin(ReadOnlyAdmin):
    list_display = ("record", "run", "content_hash")
    search_fields = ("record__key",)
    list_select_related = ("record", "run")
