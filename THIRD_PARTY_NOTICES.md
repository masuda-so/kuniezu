# Third-Party Notices

This file supplements, and does not replace, the repository LICENSE. The MIT
license covers the code and documents written for this repository. Map, terrain
and portrait data that the game bundles or derives from other sources remain
under their own terms, which are recorded below and in
[kuniezu/static/kuniezu/licenses/DATA_SOURCES.md](kuniezu/static/kuniezu/licenses/DATA_SOURCES.md).

## Geographic data

- **CODH 江戸期地理データセット** — retained reference inputs in
  `data/inputs/codh-edo/` are licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
  Credits: 『江戸末期海岸線／水域データセット』（ROIS-DS人文学オープンデータ共同利用センター作成）doi:10.20676/00000453;
  『江戸末期湖沼データセット』（同センター作成）doi:10.20676/00000467;
  『江戸主要街道データセット』（同センター作成）doi:10.20676/00000452;
  『江戸宿場データセット』（同センター作成）doi:10.20676/00000477.
  Original bytes are retained in gzip archives. The optional derived GeoJSON removes
  the legacy CRS declaration and adds row identifiers, preserving coordinates and
  properties. These Edo references are not assertions of Sengoku-period geography.
  Exact URLs, versions, hashes and license evidence are in the input manifest and README.

- **GSHHG (Global Self-consistent, Hierarchical, High-resolution Geography)** —
  coastline and water body outlines. Licensed under the GNU Lesser General Public
  License v3.0; the license text and upstream README are kept in
  [kuniezu/static/kuniezu/licenses/GSHHG-LGPL-3.0.txt](kuniezu/static/kuniezu/licenses/GSHHG-LGPL-3.0.txt) and
  [kuniezu/static/kuniezu/licenses/GSHHG-README.txt](kuniezu/static/kuniezu/licenses/GSHHG-README.txt).
- **Natural Earth** — rivers and lake centerlines (10 m). Natural Earth data is in
  the public domain.
- **OpenStreetMap contributors / Geofabrik** — river centerlines for the Korean
  peninsula. © OpenStreetMap contributors, Open Database License (ODbL) 1.0.

## Elevation (map terrain shading)

- **Copernicus DEM GLO-90** — the map's terrain shading images (`kuniezu/static/kuniezu/map/build/relief-cache/`, listed in
  `kuniezu/static/kuniezu/map/build/relief.json`) are derived from Copernicus DEM GLO-90 tiles (downloaded 2026-11-03,
  inputs not redistributed; SHA-256 sums kept locally). Notice required by the licence:
  "produced using Copernicus WorldDEM™-90 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH
  2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved".
  Disclaimer: the organisations in charge of the Copernicus programme by law or by delegation do not
  incur any liability for any use of the Copernicus WorldDEM™-90. Licence:
  [Copernicus DEM licences (PDF)](https://dataspace.copernicus.eu/sites/default/files/media/files/2025-06/copernicus_contributing_mission_data_access_v2_cop_dem_licenses.pdf).
  The images show modern elevation, not the 16th-century landscape.

## Historical district boundaries

- **CODH 旧国・旧郡境界データセット** (CC BY-NC 4.0) — rasterised into `kuniezu/map/admin/gun.png` (one full-map image) and used as
  the smallest unit of the map partition in Japan (`kuniezu/map/control/gun-assignment.csv`). Credit: 『旧国・旧郡境界データセット』（CODH作成） 「幕末明治地勢地図境界データ」
  （人間文化研究機構作成）を加工 doi:10.20676/00000454. Because of the NC term, any build that
  includes data derived from it must be distributed non-commercially (the maintainer has confirmed
  the game is non-commercial).

- **국사편찬위원회 역사지리정보「행정구역 GIS 데이터 (1910~1945년)」** (공공누리 제1유형, 출처표시) — the
  府・郡 polygons valid on 1910-05-10 (before the 1914 consolidation; 333 units) are rasterised into
  `kuniezu/map/admin/gun.png` as the smallest unit of the map partition in Korea. Downloaded by the maintainer on
  2026-11-03; the GeoPackage is not redistributed. Credit: 본 저작물은 국사편찬위원회에서 작성하여
  공공누리 제1유형으로 개방한 '행정구역 GIS 데이터 (1910~1945년)'을 이용하였으며, 해당 저작물은
  국사편찬위원회 역사지리정보(https://hgis.history.go.kr)에서 무료로 다운받으실 수 있습니다.
  The 1910 boundaries are used as an estimate for 1592.

## Historical maps, elevation, roads and portraits

The sources consulted for historical maps, elevation, road comparison shapes,
castle coordinates and portraits, together with how each was processed, are listed
in [kuniezu/static/kuniezu/licenses/DATA_SOURCES.md](kuniezu/static/kuniezu/licenses/DATA_SOURCES.md). In-game source
identifiers are declared in `kuniezu/static/kuniezu/map-sources.js`.

Names of institutions and projects above identify sources and license terms only.
Nothing in this file states or implies that they sponsor, endorse or approve this
game.


## AGENTS.md

The title and section outline of `AGENTS.md` follow the outline that OpenAI
Codex uses when it generates an `AGENTS.md` with its `/init` command
([openai/codex](https://github.com/openai/codex/blob/6478a751fde8884b2fdc76486fe23175a8e795d4/codex-rs/tui/assets/prompt_for_init_command.md),
`codex-rs/tui/assets/prompt_for_init_command.md`, commit `6478a751fde8`,
2026-08-29, Apache-2.0). The headings are translated into Japanese; the contents
are this repository's own.
