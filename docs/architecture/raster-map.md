# ラスター地図への切り替え（2026-11-03 決定）

## 決定

利用者の決定：地図を Paradox Interactive の大戦略ゲームと同じく、ラスター（領域ごとに一意の色で塗った画像）と表で定義する。根拠は同社の公式Wikiに記された地図の構成（EU4 の `provinces.bmp`・`definition.csv`・`heightmap.bmp`・`rivers.bmp`・`adjacencies.csv`、CK3 の `provinces.png` など）。

- EU4 Map modding: https://eu4.paradoxwikis.com/Map_modding
- CK3 Map modding: https://ck3.paradoxwikis.com/Map_modding

Claude と Codex の独立調査（`docs/reports/MAP_ARCHITECTURE_INDEPENDENT_REVIEW.md`）は、正本と生成物を分ける・地域の補正をデータにする・日朝で同じ生成器を使う・MECE を出力で検査する、の点で一致している。正本をラスターにするかベクターにするかは利用者がラスターに決めた。

## 何が正本か

| 種類 | 正本（編集するもの） | 形式 |
|---|---|---|
| 領域 | `game/map_data/provinces.png`（全域1枚、20,782×24,288。1画素が一つの区画。海・湖・未割当も一つの色） | 可逆PNG（RGB） |
| 領域の表 | `game/map_data/definition.csv`（CK3 の書式。見出しなし、1行目は予約の `0;0;0;0;x;x;`、以下 `id;R;G;B;name;x;`。name は区画キー）と `game/map_data/default.map`（海 `sea_zones`・湖 `lakes` の id） | CSV・CK3 の map 文法 |
| 経緯度の変換 | `game/map_data/projection.json`（本作だけの拡張。CK3 の地図は経緯度を持たない） | JSON |
| 隣接 | 領域画像から生成する。海峡など地続きでない隣接を書く `adjacencies.csv` はまだ作っていない（海路は `TK.SEA_LINKS`） | — |
| 標高 | まだ正本を置いていない。陰影は Copernicus DEM から作った表示用の `game/map/relief-*`（標高そのものではない） | — |
| 川 | まだ正本を置いていない（河川の画像データが未整備） | — |
| 年代で変わる地形・補正 | `game/map/edits/`（適用期間・範囲・出典・基準版を持つ差分。画像または多角形） | PNG＋JSON、または GeoJSON |

地域名を含むコード（現在の `castle-regions.js`・`bizen-north-shore.js`・`japan-rivers-osm.js` など）は廃止し、`game/map/edits/` のデータへ移す。同じ場所・同じ時期に複数の差分が当たる場合は生成を失敗させる。

## 解像度と拡大の上限

- 1画素 = 100m（緯度方向、ゲームの地図平面で 0.1795 単位）。
- 表示範囲 `CONT`（約1854×1316km）全体で約18,550×13,160画素。1024画素四方のタイルに分け、海だけのタイルは省く。
- 拡大の上限は約5.5倍（画面1画素≈100m）。大局を見るゲームとして、上限で粗さが見えない細かさに揃える。

## 生成と実行

- 生成（開発時、`tools/map/`）：正本と `game/map/edits/` から、年代別の領域タイル・隣接表・境界線・川の線・陰影タイルを作り、マニフェスト（ハッシュ・出典・座標系）を書く。
- 実行時：マニフェストと表示範囲のタイルを読み、領域の色は「領域ID→所有者」の小さな表で塗る。日が進んでも地図全体は描き直さない。部隊・名札・外交は別の層。

## 検査（MECE と回帰）

- 全画素がちょうど一つの色を持ち、その色が `definition.csv` にある。
- 陸の画素は城の領域か「未割当」のどちらか一つ。海と未割当を混同しない。
- 70m・100m で小島・細い海峡が消えない。4近傍と8近傍で隣接表が変わらない。
- 補正を当てた後、隣の領域との共有境界と年代差分が保たれる。
- 既存セーブの行軍位置・史実イベント・領土推移に回帰がない。

## 段階

1. 現在の最終形（読み込み後の `TKGEO`）を領域画像へ変換し、漏れ・重なりを検査する（基準版）。
2. 実行時の描画を領域画像に切り替える（既存の城・道路・保存のIDは維持）。
3. 地域ごとの補正コードを `game/map/edits/` のデータへ移し、コードから地域名を無くす。
4. 標高・川・年代別地形（香取海・児島湾）を同じ形式へ移す。

## 分担

- Claude：領域画像の生成器、隣接表・境界線の生成、実行時の描画切り替え、拡大の上限。
- Codex：`game/map/edits/` の形式と既存の地域補正の移し替え、川・標高の画像化、MECE と回帰の検査。

## 追記（2026-11-03 の決定）

- 表示範囲（`CONT`）は日本の端で決める：西＝与那国島（国土地理院の最西端、東経122°55′57″）、北＝宗谷岬（北緯45°31′35″）、東＝納沙布岬（東経145°49′01″）、南＝与那国島の緯度（北緯24°27′05″、左下の角を最西端にそろえ琉球諸島を入れる）。朝鮮・明が絡むため西だけ国土地理院の端を使う。
- 範囲外の陸地は GSHHG 2.3.7 から帯で足す（`tools/geo/land-extension.py` → `game/land-extension.js`）。データの切り口（`TKGEO.landCuts`）には海岸の縁取りを引かない。
- 領域画像の原点は初版からタイル4枚ぶん上（`tileShiftFromV1=[0,4]`）。全体 20,782×24,288画素。番号は `definition.csv` で固定し、湖のキーは重心の経緯度。
- 拡大の上限は 5.5倍。
- 地形の陰影は全域 Copernicus DEM GLO-90 から開発時に作る（利用者の決定。地理院の標高データの同梱は測量法の扱いが確定できないため使わない）。生成は Codex の道具、WebP に縮めて `game/map/relief-1|4|8/`、一覧は `game/map/relief.json`（通知文・免責文・入力の確認値）。実行時に外部の標高タイルは取り寄せない（合戦図の標高は従来どおり）。
- 区分の最小単位は郡を初期の地片とし、城の領域は「日付付きで城の管轄に属する地片の和」で作る（Claude と Codex の合意。関係は行政・知行・軍事占拠・城管轄に分ける）。日本の郡は CODH 旧国・旧郡境界（CC BY-NC 4.0、利用者は非営利と確認）。

## 追記（郡による区分、2026-11-03）

- 日本の陸は CODH 旧国・旧郡境界（江戸末期、806郡）を 100m の郡画像 `game/map/gun/` にし（`tools/map/build-gun.cjs`）、`tools/map/build-provinces.cjs` が郡ごとに城の領域へ割り当てる。結果は `game/map/gun-assignment.csv`（郡・国・根拠・領域・票の割合）。
- 根拠：castle-point（郡に城が一つ）／split（郡に城が複数。郡の中は従来の線の割り当てを保つ）／same-province（城のない郡。同じ国の城の中で従来の票が多い城、票が無ければ最も近い城）／majority-other-province（国に城が一つも無い河内・志摩・安房）／unassigned（蝦夷・琉球など）／excluded（`game/map/gun-overrides.json` の例外。奄美は1609年まで琉球）。陸奥・出羽の明治の分割は戻して国を比べる。
- 結果：城の位置と領域の食い違い0、国をまたぐ領域は城のない国を受け持つ6件のみ。郡境そのものは江戸末期のもので、戦国期は推定。
- 朝鮮・大陸は郡データが無いので従来どおり（今後、府牧郡県の土台を探す）。
- 土台が変わると年代別の差分は作り直しが要る。`build-edges.cjs` は差分の `baseProvincesSha256` が今の土台（manifest.json＋definition.csv）と一致する版だけを使う。
- 朝鮮は国史編纂委員会「행정구역 GIS 데이터 (1910~1945년)」の1910年5月時点（1914年の統合前）の府・郡333を郡画像に加える（`tools/map/extract-hgis-1910.py`、標準ライブラリで GeoPackage を読む）。1896年の13道は八道へ戻して「国」として比べる。済州の三邑は城の登録まで excluded（`gun-overrides.json`）。
- 残る課題：国・道の境界線（`TKGEO.pborders`）は旧来の線のまま。郡画像の国・道から共有辺を起こして置き換える。
- 地図を広げた地域の家と拠点（`game/frontier-polities.js`・`game/frontier-history.js`）：蠣崎家（大館、松前の代表点）、琉球王国（首里城）、済州牧（朝鮮）。領域は郡画像から作り、蠣崎は渡島国の郡、琉球は琉球国の郡（奄美は1609年まで琉球だが今は除外）、済州は三邑（`gun-overrides.json` の assign）。蠣崎の領域が渡島国の全郡に及ぶのは推定で、和人地の範囲は今後史料で絞る。女真・明の拠点は出典不足のため保留。

## 追記（児島湾の年代別の版、2026-11-03）

- 年代別の差分の生成を Node 版 `tools/map/build-province-edits.cjs` にした（Pillow 不要）。期間の境目ごとに版を分け、`game/map/edits/compiled/<開始>-<終了>/` に書く。面（GeoJSON）に加え、100m 格子の窓に合わせた型紙（PNG、値は keys の番号）を受ける。水島の3差分だけで作り直すと、既存の版と画素が一致した。
- 児島湾・高梁川河口の1560〜1615年の海陸は `tools/geo/kojima-bay-1600.cjs` が作る。国土交通省の資料の「岡山平野の干拓進展図」（高田正規原図）を現代の海岸で位置合わせし、17世紀以降の干拓区画を海、区画の外の白地を標高で陸か水面に分ける。16世紀末（宇喜多期）の区画は宇喜多堤（1584）から陸。藤戸の瀬戸は Codex の100m比較経路。根拠と検査は `data/inputs/kojima-coast-review/kojima-bay-1600/report.json` と `docs/reports/BIZEN_NORTH_SHORE_REVIEW.md`。
- 版は `15600101-15840101`（児島・天城・早島が島）と `15840101-16160101`（早島が宇喜多堤で本土と続く。児島・天城は島）。児島が陸続きになるのは1618年でゲームの期間外。

## 追記（全域1枚の正本と生成物の整理、2026-11-03）

利用者の方針「Paradox の運用を参照し、地図は一枚の大きい画像で定義する。不要な構造とファイルをまとめる」に合わせた。

- 正本は `game/map_data/`（Crusader Kings III の `map_data` で公開されている名前に合わせる）：`provinces.png`（全域1枚、約2.6MB）、`definition.csv`、`default.map`、`projection.json`。読み書きは `tools/map/map-data.cjs`（Python は `tools/map/map_data.py`）。CK3 の全形式との互換は主張しない。採用したのは名前と、definition.csv・default.map の書式だけで、`projection.json` は本作の拡張。
- `definition.csv` の id は旧 id+1（CK3 の書式で 0 は予約）。旧来の日本語名・種別・画素数の列は廃止し、種別は `default.map`、画素数は `data/audits/raster-province-pixels.json`。
- Web 配信用のタイル `game/map/provinces{,-4,-8}/` と `game/map/manifest.json` は `tools/map/build-map-tiles.cjs` が正本から作る生成物（`manifest.source.sha256` が正本の確認値）。一時置き場に書いて検査が通ってから入れ替える。`--check` で今のタイルが正本どおりか確かめる（`tools/checks/raster-map.cjs` が呼ぶ）。
- 移行の確認：正本から作り直した 251 タイル（100m 216・400m 26・800m 9）は移行前とバイト単位で一致。`tools/map/build-provinces.cjs` を流し直すと正本4点と郡の割り当て表がバイト単位で一致。境界線 246 ファイルは id+1 を戻すと移行前と一致。年代別の2版のタイルも一致。Codex が生成器を使わない独立の検査で全 504,753,216 画素の一致を確かめた。
- 郡画像は実行時に読まないので `game/` から外し、`data/map/gun.png`（全域1枚）と `gun.csv`・`gun.json`・`gun-overrides.json`・`gun-assignment.csv` を `data/map/` に置いた。境界線の生成（国の線）と領域の割り当てはここを読む。
- 年代別の差分の生成は Node 版だけにし、Python 版（`build-province-edits.py`）と、それを呼ぶ `tools/checks/province-edits.py` を廃止。負例（重なり・ID の重複・適用済み ID・元の値の食い違い・正本の取り違え・半開区間・粗い段の中心画素）は `tools/checks/province-edits.cjs` に移し、失敗した時に配信中の版を書き換えないことも確かめる。
- 標高（heightmap.png）と川（rivers.png）はまだ置かない。標高は全域1枚の容量と、表示用の陰影とは別のデータとしての使い道を決めてから。川は資料の整備が先。
