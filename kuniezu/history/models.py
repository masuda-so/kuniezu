"""The history database.

Everything that is recorded about the past falls into one of two kinds
(Grenon & Smith 2004, SNAP and SPAN): things that persist (``Thing``: people
and non-people alike) and what happens to them or holds for them
(``Phenomenon``: events at a moment, states over a period). Each phenomenon
answers the three questions of Peuquet's (1994) triad: what (its kind and the
things that take part), where (a place) and when (a time extent).

Time is kept twice. The calendar fields keep the date exactly as the source
gives it; ``jd_start``/``jd_end`` are Julian Day Numbers, so any period of
history can be ordered and searched with integers. That is *valid time*.
*Transaction time* (what the database held, and when) is kept by
``ImportRun`` and ``RecordVersion``, so earlier contents stay reachable.

Nothing is stored without its origin: every thing and phenomenon points at the
``Record`` rows it was read from, and a record keeps its input unchanged in
``payload``. See docs/architecture/history-rdb.md.
"""

from django.db import models


class ImportRun(models.Model):
    """One import of the inputs. The database's own history (transaction time)."""

    started_at = models.DateTimeField(auto_now_add=True)
    git_commit = models.CharField(max_length=40, blank=True)
    counts = models.JSONField(default=dict)

    class Meta:
        ordering = ["id"]

    def __str__(self) -> str:
        return f"取り込み {self.pk}"


class Source(models.Model):
    """A bibliographic source."""

    key = models.CharField(max_length=200, unique=True)
    title = models.TextField(blank=True)
    author = models.TextField(blank=True)
    url = models.TextField(blank=True)
    payload = models.JSONField(default=dict)

    def __str__(self) -> str:
        return self.key


class RecordType(models.TextChoices):
    CLAIM = "claim", "確認済み命題"
    LOCATION = "location", "所在の記録"
    PERSON = "person", "人物の登録"
    PLACE = "place", "場所の登録"
    IMPLEMENTED_EVENT = "implemented-event", "年表の実装"
    IMPLEMENTED_SITE = "implemented-site", "拠点の実装"
    IDENTITY = "identity", "対象の同一性"
    CATALOG = "catalog", "作業台帳の対象"
    KOBUN = "kobun", "綱文の所在（目録）"
    CONFLICT = "conflict", "戦役と合戦の親子"
    CONTROL = "control", "城の支配の記録"


class Status(models.TextChoices):
    """How far a record has been checked against a source."""

    VERIFIED = "verified", "出典の指定箇所で確認済み"
    REGISTERED = "registered", "台帳に登録（個々の事実は命題で確認）"
    IMPLEMENTATION = "implementation", "実装の棚卸し（未照合）"


class Record(models.Model):
    """One input record, kept without loss. The origin of everything else."""

    key = models.CharField(max_length=300, unique=True)
    record_type = models.CharField(max_length=20, choices=RecordType.choices)
    status = models.CharField(max_length=20, choices=Status.choices)
    source = models.ForeignKey(
        Source, null=True, blank=True, on_delete=models.PROTECT, related_name="records"
    )
    locator = models.TextField(blank=True)
    uncertainty = models.TextField(blank=True)
    checked = models.DateField(null=True, blank=True)
    payload = models.JSONField()
    content_hash = models.CharField(max_length=64)
    first_run = models.ForeignKey(
        ImportRun, on_delete=models.PROTECT, related_name="first_records"
    )
    last_run = models.ForeignKey(
        ImportRun, on_delete=models.PROTECT, related_name="last_records"
    )
    # Set when an import no longer finds the record in the inputs.
    retired_run = models.ForeignKey(
        ImportRun,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="retired_records",
    )

    def __str__(self) -> str:
        return self.key


class RecordVersion(models.Model):
    """A change to a record: its content from one import on.

    A row is added when an import finds a record for the first time, finds its
    content changed, or no longer finds it (``payload`` is then empty). The
    latest row up to an import tells what the database held after it.
    """

    record = models.ForeignKey(
        Record, on_delete=models.CASCADE, related_name="versions"
    )
    run = models.ForeignKey(ImportRun, on_delete=models.PROTECT)
    content_hash = models.CharField(max_length=64, blank=True)
    payload = models.JSONField(null=True, blank=True)

    class Meta:
        ordering = ["record_id", "run_id"]
        constraints = [
            models.UniqueConstraint(
                fields=["record", "run"], name="history_version_per_run"
            )
        ]

    def __str__(self) -> str:
        return f"{self.record_id}@{self.run_id}"


class ThingKind(models.TextChoices):
    """What persists. Every thing has exactly one kind."""

    PERSON = "person", "人物"
    GROUP = "group", "集団（家・政権・軍勢）"
    SITE = "site", "施設・地点"
    ROUTE = "route", "経路（街道・城間の接続）"
    REGION = "region", "領域（国・郡・支配域）"
    WATER = "water", "水域"
    OBJECT = "object", "物（文書・器物）"


class Thing(models.Model):
    """Something that persists through time: a person or a non-person."""

    key = models.CharField(max_length=300, unique=True)
    kind = models.CharField(max_length=10, choices=ThingKind.choices)
    name = models.CharField(max_length=300)
    # False when the thing is only named by a record and has no registry entry.
    registered = models.BooleanField(default=False)
    records = models.ManyToManyField(Record, related_name="things")

    class Meta:
        indexes = [models.Index(fields=["kind", "name"])]

    def __str__(self) -> str:
        return self.name


class ThingKey(models.Model):
    """An identifier a thing is known by.

    A thing has its own key, and the keys of the inputs that an identity record
    showed to be the same thing.
    """

    thing = models.ForeignKey(Thing, on_delete=models.CASCADE, related_name="keys")
    key = models.CharField(max_length=300, unique=True)

    def __str__(self) -> str:
        return self.key


class ThingName(models.Model):
    """A name a thing goes by."""

    thing = models.ForeignKey(Thing, on_delete=models.CASCADE, related_name="names")
    name = models.CharField(max_length=300, db_index=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["thing", "name"], name="history_name_once")
        ]

    def __str__(self) -> str:
        return self.name


class Authority(models.Model):
    """An identifier in an outside authority file (Wikidata, NDL)."""

    thing = models.ForeignKey(
        Thing, on_delete=models.CASCADE, related_name="authorities"
    )
    scheme = models.CharField(max_length=20)
    identifier = models.CharField(max_length=50)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["scheme", "identifier"], name="history_authority_once"
            )
        ]

    def __str__(self) -> str:
        return f"{self.scheme}:{self.identifier}"


class Place(models.Model):
    """Where a thing is: a representative point in WGS 84 longitude and latitude."""

    thing = models.OneToOneField(Thing, on_delete=models.CASCADE, related_name="place")
    longitude = models.FloatField()
    latitude = models.FloatField()
    # How the point was obtained: ``site-representative`` (a sourced point of the
    # site), ``game-position`` (where the game puts it), ``borrowed-from-namesake``
    # or ``represented-by-game-site`` (the point of another thing, see the importer).
    basis = models.CharField(max_length=60)

    class Meta:
        indexes = [models.Index(fields=["longitude", "latitude"])]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(longitude__gte=-180, longitude__lte=180)
                & models.Q(latitude__gte=-90, latitude__lte=90),
                name="history_place_in_range",
            )
        ]

    def __str__(self) -> str:
        return f"{self.longitude},{self.latitude}"


class Representation(models.Model):
    """A game site standing for a registry place, for all time or for a period.

    This is how the game is built, not a historical claim of control. A period
    runs from its start (included) to its end (left out). Each end is a span of
    day numbers where it may lie: one day when the input gives a day, a whole
    year when it gives only a year. A day is surely in the period between the
    late start and the early end, and possibly in it between the early start and
    the late end, so a year given as an end is never read as its first day.
    An end left empty is open.
    """

    place = models.ForeignKey(
        Thing, on_delete=models.CASCADE, related_name="representatives"
    )
    site = models.ForeignKey(Thing, on_delete=models.CASCADE, related_name="stands_for")
    record = models.ForeignKey(
        Record, on_delete=models.PROTECT, related_name="representations"
    )
    start_early = models.IntegerField(null=True, blank=True)
    start_late = models.IntegerField(null=True, blank=True)
    end_early = models.IntegerField(null=True, blank=True)
    end_late = models.IntegerField(null=True, blank=True)
    label = models.TextField(blank=True)
    basis = models.TextField(blank=True)

    def __str__(self) -> str:
        return f"{self.site.key} -> {self.place.key} {self.label}".strip()


class Mode(models.TextChoices):
    """The two ways something can be the case (SPAN and SNAP)."""

    EVENT = "event", "出来事（ある時点に起きる）"
    STATE = "state", "状態（ある期間に成り立つ）"


class PhenomenonKind(models.TextChoices):
    """What a phenomenon is about. Every phenomenon has exactly one kind."""

    EXISTENCE = "existence", "生没・存廃"
    MOVEMENT = "movement", "移動・所在"
    CONFLICT = "conflict", "戦闘"
    CONTROL = "control", "支配・帰属"
    RELATION = "relation", "関係（同盟・従属・敵対）"
    OFFICE = "office", "役職・組織"
    NAMING = "naming", "名称"
    WORKS = "works", "造営・土木"
    DOCUMENT = "document", "文書・命令"
    NATURE = "nature", "自然"
    OTHER = "other", "その他"


class Calendar(models.TextChoices):
    LUNISOLAR = "Japanese-lunisolar", "和暦（旧暦）"
    WESTERN = "western", "西暦（1582年10月15日からグレゴリオ暦、前はユリウス暦）"
    CE_YEAR = "CE-year", "西暦の年"
    JAPANESE_YEAR = "Japanese-year", "和暦の年（旧暦の正月朔日から大晦日まで）"
    DESCRIBED = "Japanese-era-description", "時期の呼び名"


class Precision(models.TextChoices):
    DAY = "day", "日"
    YEAR = "year", "年"
    PERIOD = "period", "期間"
    UNDATED = "undated", "年代なし"


class Phenomenon(models.Model):
    """Something that happened or held: what, where and when."""

    key = models.CharField(max_length=300, unique=True)
    mode = models.CharField(max_length=5, choices=Mode.choices)
    kind = models.CharField(max_length=10, choices=PhenomenonKind.choices)
    # The word the input used (a predicate, a relation, a timeline kind).
    subtype = models.CharField(max_length=80, blank=True)
    title = models.TextField(blank=True)
    summary = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices)
    records = models.ManyToManyField(Record, related_name="phenomena")
    # A phenomenon that is part of a larger one (a siege phase within a battle).
    parent = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.SET_NULL, related_name="parts"
    )
    place = models.ForeignKey(
        Thing, null=True, blank=True, on_delete=models.SET_NULL, related_name="located"
    )
    # When, as the source gives it.
    calendar = models.CharField(max_length=30, choices=Calendar.choices, blank=True)
    precision = models.CharField(max_length=10, choices=Precision.choices)
    year = models.IntegerField(null=True, blank=True)
    month = models.IntegerField(null=True, blank=True)
    day = models.IntegerField(null=True, blank=True)
    leap_month = models.BooleanField(default=False)
    # The source's own words for a period ("early Edo"), when it gives no dates.
    time_label = models.TextField(blank=True)
    # When, as Julian Day Numbers: the earliest and latest day it can cover.
    # One end is empty when only the other is known.
    jd_start = models.IntegerField(null=True, blank=True)
    jd_end = models.IntegerField(null=True, blank=True)
    # True when the day numbers come from the source's own date; False when a
    # year or period was widened to whole western years.
    jd_exact = models.BooleanField(default=False)
    # False when the day numbers are only a window to search by, not the start
    # and end the source asserts (a period named by an era, for example).
    bounds_asserted = models.BooleanField(default=True)

    class Meta:
        indexes = [
            models.Index(fields=["jd_start", "jd_end"]),
            models.Index(fields=["kind", "mode"]),
            models.Index(fields=["calendar", "year", "month", "leap_month", "day"]),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(jd_start__isnull=True)
                | models.Q(jd_end__isnull=True)
                | models.Q(jd_start__lte=models.F("jd_end")),
                name="history_time_ordered",
            )
        ]

    def __str__(self) -> str:
        return self.title or self.key


class Role(models.TextChoices):
    SUBJECT = "subject", "主体"
    PARTICIPANT = "participant", "関係する対象"


class Participation(models.Model):
    """A thing taking part in a phenomenon. Shared participation is a bundle."""

    phenomenon = models.ForeignKey(
        Phenomenon, on_delete=models.CASCADE, related_name="participations"
    )
    thing = models.ForeignKey(
        Thing, on_delete=models.CASCADE, related_name="participations"
    )
    role = models.CharField(max_length=12, choices=Role.choices)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["phenomenon", "thing"], name="history_participation_once"
            )
        ]

    def __str__(self) -> str:
        return f"{self.thing_id}@{self.phenomenon_id}"
