# Tenka Wakeme no Kuniezu

[日本語](README.md) | [English](README.en.md)

## Overview

A map game set in Japan and Korea between 1560 and 1615. It runs as plain HTML and
JavaScript (only the map's served files are generated from the source map). Development currently prioritizes observation of
recorded history; free sieges and non-historical routes are on hold.

Read [HANDOFF.md](HANDOFF.md) first. The entry point for development and research
is [docs/README.md](docs/README.md); open requests and ownership are in
[docs/work/README.md](docs/work/README.md). Both documents are written in Japanese.

## Features and limitations

- Land, water and shorelines are rendered as vectors from edited GeoJSON.
  [CODH inputs and preparation](data/inputs/codh-edo/README.md) distinguish
  Edo-period comparison shapes from adopted period corrections. Ownership colours
  and relief remain image layers.
- Edited GeoJSON will be the directly maintained source of truth. Rendering reads
  the files for the selected period. CODH originals remain available for comparison,
  and normal builds will not overwrite the edited source data.
- Edited land, water and shoreline sources are stored in
  `kuniezu/map/physical/{land,water,coastline}.geojson` with an
  [adoption record](data/inputs/vector-map-migration/README.md) and period checks.
  The game reads the same canonical sources. Use `--canonical kuniezu/map/physical
  --at 1584-01-01` in the comparison viewer to inspect a period.
- `uv run python tools/geo/codh_topology.py --output /tmp/codh-surfaces-new`
  prepares valid reference surfaces and combined land/lake geometry using a
  linework method that retains source edges and coordinate positions. Collapsed
  source lines remain in residual layers, without being asserted as Sengoku
  shorelines. Shapely is a development-only dependency.
- Add `--surfaces /tmp/codh-surfaces-new` when building the comparison viewer
  to load the prepared surfaces after checking their source versions and hashes.
- The viewer also accepts `--canonical <directory>` to read edited
  `land.geojson` and `water.geojson`. The shared renderer preserves holes and
  periods for drawing and hit testing, without runtime geometry corrections.
  Game boot, interaction and source failures have separate browser checks.
- `uv run python tools/geo/codh_preview.py --output /tmp/codh-preview-new`
  generates a standalone Edo-period vector viewer. Open its `index.html` directly
  to inspect Kanto and Kojima Bay, pan, zoom and toggle layers. It does not alter
  the game map or saves.
- `node tools/geo/prepare-mask-vectors.cjs --output /tmp/kojima-vectors-new`
  converts existing Kojima Bay correction masks to geographic polygons using
  their explicit grid versions. It preserves the adopted 100 m cells, without
  refining the historical shoreline or reapplying changes to the game map.
- `uv run python tools/geo/prepare_era_overrides.py --at 1560-01-01 --output /tmp/era-overrides-new`
  prepares the existing inferred Katori water area together with protected land
  and cuts that must not be drawn as shores. It does not automatically modify
  CODH originals or the game display.
- Shows former lakeshores, castles, facilities and people checked against sources,
  marches along historical roads, and battle deployments and movements, each with
  its source.
- Battle markers retain their geographic positions when the viewport or district changes. Co-located units can be selected individually.
- File exports, save slots and autosaves preserve sub-day time so marching units
  resume at the saved position.
- Diplomacy is shown as borders only; marches are shown as pieces on roads.
  Battles appear automatically only when the player's forces take part. The five
  non-participating Sekigahara units receive no generic advance animation.
- Free sieges, non-historical routes and in-play AI generation are disabled. The
  non-historical implementations under `archive/` are not loaded at startup.
- Battle-related timeline notes are classified separately from battle phases.
  Castle falls without supported deployments remain timeline entries and historic sites.
- Modern comparison terrain, estimates derived from sources and confirmed
  historical facts are kept apart. Unsupported text is not shown in the game.
- The Sanshu road comparison follows the Ina valley, Komaba and Neba. Mountain
  sections include modern roads and tunnels; they are not an exact sixteenth-century
  centerline. See the [inputs and regeneration](data/inputs/sanshu-road-review/README.md)
  (Japanese).
- Kennyo, Niwa Nagashige, Shima Sakon, Saito Yoshitatsu and Ashikaga Yoshiteru use
  the same reviewed portrait crops while originals load or fail. Depictions include
  later artwork. See [asset regeneration and checks](docs/reports/PORTRAIT_FALLBACK_CROPS.md) (Japanese).
- Late elevation, river and boundary loads refresh the map while the camera stays still.
- Dated events without a known related place remain searchable by their subject.
  Locations are not invented, and Edo-period reclamation records are kept separate
  from evidence for Sengoku-period shorelines.
- [Ten additional person identities](data/research/source-notes/person-authority-expansion.md)
  retain Wikidata revisions and identity checks. Dates and whereabouts are not
  imported as new historical claims.
- The historical database preserves original calendars and date precision, and rejects
  additional date fields that conflict with the time format. See the
  [database design and commands](docs/architecture/history-database.md) (Japanese).
- The historical database includes the sourced Tomori excavation observation. Archaeological periods remain distinct from exact dates; source hashes, Markdown notes and numerical inputs are retained.
- Read the aggregate view with `python3 tools/research/history_sqlite.py cube --db <built-database>
  --from-year 1600 --to-year 1615 --calendar Japanese-lunisolar`. This read-only
  command counts source records by native calendar and precision without expanding
  unknown years.
- The historical database retains personal authority IDs and sourced aliases.
  Aliases can be searched; comparative records outside the game period are not
  reassigned to events within it.
- Uchinasakaura and Sotonasakaura in the Katori Sea are shown as inferred water
  bodies, using medieval evidence of the lakes and later shoreline references.
  Correction boundaries crossing open water are excluded from shoreline strokes.
  See the [evidence and checks](docs/reports/KATORI_WIDE_LAKE_PERIMETER.md) (Japanese).

- Hachirogata uses an inferred pre-reclamation shoreline from historical comparison
  maps, excluding possible later fill from land restoration. See the
  [evidence and checks](docs/reports/HACHIROGATA_WATER_REVIEW.md) (Japanese).

| Folder | Contents |
|---|---|
| `kuniezu/static/kuniezu/` | The game served to the browser and its bundled assets |
| `kuniezu/templates/` | The game page `index.html` (a Django template); it sets the script load order |
| `kuniezu/history/` | The relational history database (a Django app): things, phenomena, sources, import and queries |
| `docs/architecture/` | Structure, file move records and dependency order |
| `docs/work/` | Open requests, completion criteria, per-subject task lists, ownership and results |
| `docs/reports/` | Research, fix and on-screen verification reports |
| `docs/history/` | Past hand-over records; not current instructions |
| `data/inputs/` | Inputs for research and generation |
| `data/research/` | Sources, verified historical statements, reference originals and their mapping to the implementation |
| `data/audits/` | Lists and reconciliation results generated by checks |
| `data/verification/` | On-screen, same-scale comparison and performance evidence |
| `tools/checks/` | Server-free checks and dedicated-browser verification |
| `tools/geo/`, `tools/faces/`, `tools/research/` | Generation and reconciliation of geography, portraits and sources |
| `tools/work/` | Task lists and ownership management for shared work |
| `archive/` | Suspended non-historical implementations; not loaded at startup |

## Getting started and usage

Run `node tools/map/build-map.cjs --vectors-only` to republish edited GeoJSON,
or add `--check` to verify byte-for-byte agreement with the canonical files.
It does not regenerate or correct the edited source. The five comparison lakes
retain their sources and limitations in the [input notes](data/inputs/mlit-w09-2005/README.md).

The map source lives in `kuniezu/map/`, one folder per layer, and is tracked in Git:
administrative divisions in `admin/` (districts), control in `control/` (castle
domains, including the single full-map `provinces.png` in the Paradox style),
nature in `physical/` (elevation and rivers), and dated edits in `edits/`. The tiles, borders, river
lines and relief served to the browser (generated files in `kuniezu/static/kuniezu/map/build/`) are not
in the repository. Generate them once after cloning, and again after changing the
source or the dated edits (`kuniezu/map/edits/*.json`). This takes a few minutes.

```sh
node tools/map/build-map.cjs
```

To also build the terrain relief, fetch `kuniezu/map/physical/heightmap.png` with Git LFS
and pass a Python that has NumPy and Pillow (the game runs without relief).

```sh
node tools/map/build-map.cjs --height --python /path/to/python3
```

The source PNGs are too large to open in VS Code and similar viewers, so the
build also writes quarter-scale previews of each layer, with a one-degree
graticule, to `kuniezu/static/kuniezu/map/build/previews/` (`control.png` control, `admin.png`
administrative divisions, `rivers.png` rivers, `height.png` elevation). Open
these to check the map by eye.

After generating, start the Django development server and open
`http://localhost:8000/index.html` in a browser (`uv sync --locked`, then
`uv run python manage.py runserver 8000`; needs Python 3.14 and uv). The page is
a Django template, so serving only `kuniezu/static/kuniezu/` as static files no
longer works. `uv run python scripts/build_static.py` writes the public static
files to `dist/client/`, which can be served as plain static files. The layout is being aligned with the Django structure of the
website project (`docs/structure.md`, `docs/architecture/replatform-plan.md`). The map on screen is north-up by default. "Map orientation" in the display
settings can turn it, for example 16° counter-clockwise after the Meiji-era
"Dai Nippon Zenzu" (`docs/reports/MAP_ORIENTATION.md`).

The relational history database is built from the inputs in `data/research/` and
`docs/work/` into `db.sqlite3` at the repository root (not tracked in Git):
`uv run python manage.py migrate`, then `uv run python manage.py import_history`.
Query it by thing, year or a longitude/latitude box, for example
`uv run python manage.py history_query --about 織田信長 --year 1582`. A thing can be
named by a name or by an identifier such as `place:ganjaku`; a name that matches
several things lists the candidates and stops. That two identifiers are one thing,
or that a game site stands for a registry place, is stated by sourced records in
`data/research/curated/identities/*.json` (format in that folder's `README.md`);
without such a record, things of the same name are never merged. It holds every
current input record and keeps source-verified records apart from the unverified
inventory of what the game implements (`docs/architecture/history-rdb.md`).

Starting and stopping the server is done by the user. Verification connects to an
already running `http://localhost:8000/index.html`. The output folder for check
results can be set with `GAME_TEST_OUTPUT`.

The basic check is the command below. See
[tools/checks/README.md](tools/checks/README.md) for the full procedure.

```sh
node tools/checks/offline.cjs
```

## Support and documentation

- Current specification and agreements: [HANDOFF.md](HANDOFF.md)
- Documentation entry point: [docs/README.md](docs/README.md)
- Sources versus implementation: [data/research/README.md](data/research/README.md)
- Terrain and water data sources and processing: [kuniezu/static/kuniezu/licenses/DATA_SOURCES.md](kuniezu/static/kuniezu/licenses/DATA_SOURCES.md)
- Third-party data notices: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)

## Development and contributions

The normal CI on GitHub Actions runs the server-free checks (syntax, storage and
territory; folders and ownership; infrastructure) with Node.js. On-screen
verification runs in the user's environment; a summary of the results is recorded
under `data/verification/` (screenshots are attached to the pull request, not
committed).

Before changing the repository, consult the agreements in [HANDOFF.md](HANDOFF.md)
and the completion criteria in [docs/work/README.md](docs/work/README.md). Create
a branch from main for each piece of work and describe the change and its
verification in a small pull request with one purpose (GitHub flow; pull requests
are squash-merged). Shared working rules
are in [AGENTS.md](AGENTS.md). PR descriptions and review comments use Japanese by
default; an explicit request for another language takes precedence.

Battle-map frames are inputs in `data/inputs/battle-atlas-frames.json`. Use
`--titles` to regenerate selected maps. See the
[Takatenjin regeneration and verification](docs/reports/TAKATENJIN_ATLAS_BOUNDS.md)
(Japanese).

The repository is licensed under [LICENSE](LICENSE) (MIT). Bundled or derived map
data follows the terms of each source.
