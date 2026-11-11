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
| 標高 | `game/map_data/heightmap.png`（全域1枚の16bit灰色、Git LFS）と `heightmap.json`（符号化・出典）。表示用の陰影 `kuniezu/map/relief-cache/`・`relief.json` はここから作る生成物（`docs/architecture/heightmap-cache.md`） | PNG（LFS） |
| 川 | `game/map_data/rivers.png`（全域1枚、1画素幅の中心線。色はその画素が属する河川の組）と `rivers.json`。現代の参考の河道で、戦国期の河道を確定したものではない。描画用の線 `kuniezu/map/rivers-lines.json` はここから作る生成物（`docs/architecture/river-source-image.md`） | PNG（本作の符号化） |
| 年代で変わる地形・補正 | `kuniezu/map/edits/`（適用期間・範囲・出典・基準版を持つ差分。画像または多角形） | PNG＋JSON、または GeoJSON |

地域名を含むコード（現在の `castle-regions.js`・`bizen-north-shore.js`・`japan-rivers-osm.js` など）は廃止し、`kuniezu/map/edits/` のデータへ移す。同じ場所・同じ時期に複数の差分が当たる場合は生成を失敗させる。

## 解像度と拡大の上限

- 1画素 = 100m（緯度方向、ゲームの地図平面で 0.1795 単位）。
- 表示範囲 `CONT`（約1854×1316km）全体で約18,550×13,160画素。1024画素四方のタイルに分け、海だけのタイルは省く。
- 拡大の上限は約5.5倍（画面1画素≈100m）。大局を見るゲームとして、上限で粗さが見えない細かさに揃える。

## 生成と実行

- 生成（開発時、`tools/map/`）：正本と `kuniezu/map/edits/` から、年代別の領域タイル・隣接表・境界線・川の線・陰影タイルを作り、マニフェスト（ハッシュ・出典・座標系）を書く。
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
3. 地域ごとの補正コードを `kuniezu/map/edits/` のデータへ移し、コードから地域名を無くす。
4. 標高・川・年代別地形（香取海・児島湾）を同じ形式へ移す。

## 分担

- Claude：領域画像の生成器、隣接表・境界線の生成、実行時の描画切り替え、拡大の上限。
- Codex：`kuniezu/map/edits/` の形式と既存の地域補正の移し替え、川・標高の画像化、MECE と回帰の検査。

## 追記（2026-11-03 の決定）

- 表示範囲（`CONT`）は日本の端で決める：西＝与那国島（国土地理院の最西端、東経122°55′57″）、北＝宗谷岬（北緯45°31′35″）、東＝納沙布岬（東経145°49′01″）、南＝与那国島の緯度（北緯24°27′05″、左下の角を最西端にそろえ琉球諸島を入れる）。朝鮮・明が絡むため西だけ国土地理院の端を使う。
- 範囲外の陸地は GSHHG 2.3.7 から帯で足す（`tools/geo/land-extension.py` → `kuniezu/static/kuniezu/land-extension.js`）。データの切り口（`TKGEO.landCuts`）には海岸の縁取りを引かない。
- 領域画像の原点は初版からタイル4枚ぶん上（`tileShiftFromV1=[0,4]`）。全体 20,782×24,288画素。番号は `definition.csv` で固定し、湖のキーは重心の経緯度。
- 拡大の上限は 5.5倍。
- 地形の陰影は全域 Copernicus DEM GLO-90 から開発時に作る（利用者の決定。地理院の標高データの同梱は測量法の扱いが確定できないため使わない）。生成は Codex の道具、WebP に縮めて `kuniezu/map/relief-1|4|8/`、一覧は `kuniezu/map/relief.json`（通知文・免責文・入力の確認値）。実行時に外部の標高タイルは取り寄せない（合戦図の標高は従来どおり）。
- 区分の最小単位は郡を初期の地片とし、城の領域は「日付付きで城の管轄に属する地片の和」で作る（Claude と Codex の合意。関係は行政・知行・軍事占拠・城管轄に分ける）。日本の郡は CODH 旧国・旧郡境界（CC BY-NC 4.0、利用者は非営利と確認）。

## 追記（郡による区分、2026-11-03）

- 日本の陸は CODH 旧国・旧郡境界（江戸末期、806郡）を 100m の郡画像 `kuniezu/map/gun/` にし（`tools/map/build-gun.cjs`）、`tools/map/build-provinces.cjs` が郡ごとに城の領域へ割り当てる。結果は `kuniezu/map/gun-assignment.csv`（郡・国・根拠・領域・票の割合）。
- 根拠：castle-point（郡に城が一つ）／split（郡に城が複数。郡の中は従来の線の割り当てを保つ）／same-province（城のない郡。同じ国の城の中で従来の票が多い城、票が無ければ最も近い城）／majority-other-province（国に城が一つも無い河内・志摩・安房）／unassigned（蝦夷・琉球など）／excluded（`kuniezu/map/gun-overrides.json` の例外。奄美は1609年まで琉球）。陸奥・出羽の明治の分割は戻して国を比べる。
- 結果：城の位置と領域の食い違い0、国をまたぐ領域は城のない国を受け持つ6件のみ。郡境そのものは江戸末期のもので、戦国期は推定。
- 朝鮮・大陸は郡データが無いので従来どおり（今後、府牧郡県の土台を探す）。
- 土台が変わると年代別の差分は作り直しが要る。`build-edges.cjs` は差分の `baseProvincesSha256` が今の土台（正本4入力の sourceSha256）と一致する版だけを使う。
- 朝鮮は国史編纂委員会「행정구역 GIS 데이터 (1910~1945년)」の1910年5月時点（1914年の統合前）の府・郡333を郡画像に加える（`tools/map/extract-hgis-1910.py`、標準ライブラリで GeoPackage を読む）。1896年の13道は八道へ戻して「国」として比べる。済州の三邑は城の登録まで excluded（`gun-overrides.json`）。
- 残る課題：国・道の境界線（`TKGEO.pborders`）は旧来の線のまま。郡画像の国・道から共有辺を起こして置き換える。
- 地図を広げた地域の家と拠点（`kuniezu/static/kuniezu/frontier-polities.js`・`kuniezu/static/kuniezu/frontier-history.js`）：蠣崎家（大館、松前の代表点）、琉球王国（首里城）、済州牧（朝鮮）。領域は郡画像から作り、蠣崎は渡島国の郡、琉球は琉球国の郡（奄美は1609年まで琉球だが今は除外）、済州は三邑（`gun-overrides.json` の assign）。蠣崎の領域が渡島国の全郡に及ぶのは推定で、和人地の範囲は今後史料で絞る。女真・明の拠点は出典不足のため保留。

## 追記（児島湾の年代別の版、2026-11-03）

- 年代別の差分の生成を Node 版 `tools/map/build-province-edits.cjs` にした（Pillow 不要）。期間の境目ごとに版を分け、`kuniezu/map/edits/compiled/<開始>-<終了>/` に書く。面（GeoJSON）に加え、100m 格子の窓に合わせた型紙（PNG、値は keys の番号）を受ける。水島の3差分だけで作り直すと、既存の版と画素が一致した。
- 児島湾・高梁川河口の1560〜1615年の海陸は `tools/geo/kojima-bay-1600.cjs` が作る。国土交通省の資料の「岡山平野の干拓進展図」（高田正規原図）を現代の海岸で位置合わせし、17世紀以降の干拓区画を海、区画の外の白地を標高で陸か水面に分ける。16世紀末（宇喜多期）の区画は宇喜多堤（1584）から陸。藤戸の瀬戸は Codex の100m比較経路。根拠と検査は `data/inputs/kojima-coast-review/kojima-bay-1600/report.json` と `docs/reports/BIZEN_NORTH_SHORE_REVIEW.md`。
- 1560年の形は全域1枚の正本そのもの。児島湾・水島の5補正を焼き込み済みで、タイトル画面も同じ正本を使う。年代差分は `15840101-16160101`（宇喜多期の366画素）の1版だけ。児島が陸続きになるとされる1618年はゲームの期間外。年別の精密な汀線を確定したものではない。

## 追記（全域1枚の正本と生成物の整理、2026-11-03）

利用者の方針「Paradox の運用を参照し、地図は一枚の大きい画像で定義する。不要な構造とファイルをまとめる」に合わせた。

- 正本は `game/map_data/`（Crusader Kings III の `map_data` で公開されている名前に合わせる）：`provinces.png`（全域1枚、約2.6MB）、`definition.csv`、`default.map`、`projection.json`。読み書きは `tools/map/map-data.cjs`（Python は `tools/map/map_data.py`）。CK3 の全形式との互換は主張しない。採用したのは名前と、definition.csv・default.map の書式だけで、`projection.json` は本作の拡張。
- `definition.csv` の id は旧 id+1（CK3 の書式で 0 は予約）。旧来の日本語名・種別・画素数の列は廃止し、種別は `default.map`、画素数は `data/audits/raster-province-pixels.json`。
- Web 配信用のタイル `kuniezu/map/provinces{,-4,-8}/` と `kuniezu/map/manifest.json` は `tools/map/build-map-tiles.cjs` が正本から作る生成物（`manifest.source.sha256` が正本の確認値）。一時置き場に書いて検査が通ってから入れ替える。`--check` で今のタイルが正本どおりか確かめる（`tools/checks/raster-map.cjs` が呼ぶ）。
- 移行の確認：正本から作り直した 251 タイル（100m 216・400m 26・800m 9）は移行前とバイト単位で一致。`tools/map/build-provinces.cjs` を流し直すと正本4点と郡の割り当て表がバイト単位で一致。境界線 246 ファイルは id+1 を戻すと移行前と一致。年代別の2版のタイルも一致。Codex が生成器を使わない独立の検査で全 504,753,216 画素の一致を確かめた。
- 郡画像は実行時に読まないので `kuniezu/static/kuniezu/` から外し、`data/map/gun.png`（全域1枚）と `gun.csv`・`gun.json`・`gun-overrides.json`・`gun-assignment.csv` を `data/map/` に置いた。境界線の生成（国の線）と領域の割り当てはここを読む。
- 年代別の差分の生成は Node 版だけにし、Python 版（`build-province-edits.py`）と、それを呼ぶ `tools/checks/province-edits.py` を廃止。負例（重なり・ID の重複・適用済み ID・元の値の食い違い・正本の取り違え・半開区間・粗い段の中心画素）は `tools/checks/province-edits.cjs` に移し、失敗した時に配信中の版を書き換えないことも確かめる。
- （当時）標高と川の正本はまだ置いていなかった。その後の追記を参照。

## 児島湾の正本への焼き込み

2026-11-03、旧基準の1560年版で有効だった5補正（児島湾の海域・陸域、水島の東・西・南）24,306画素を `game/map_data/provinces.png` 自体へ移した。適用定義は `kuniezu/map/edits/applied/` に保存し、`baseline-ledger.json` に入力と出力の4ファイルSHA・画素差分を記録する。定義表・投影・海湖分類は変更しない。

通常の再生成は下の「地図の生成の入口」を参照（当時は `build-map-tiles.cjs` → `build-province-edits.cjs` → `build-edges.cjs`）。旧ベクトルからの `build-provinces.cjs` は既存正本がある場合に上書きを拒否する。`bake-kojima-baseline.cjs` と旧型紙生成器 `tools/geo/kojima-bay-1600.cjs` は特定の移行前SHAだけで動き、現在の正本では再適用を拒否する。

受入根拠は `data/verification/kojima-source-baseline/`。正本画像の前後を同じ画素窓で切り出した画像、正本と全100mタイルの独立照合、1560/1600表示の全段タイル一致、正本から直接確認した藤戸の4近傍通水・水島・丘陵・史跡点、旧生成器の拒否後のSHA不変を保持する。ゲーム画面の操作確認とは別の画像データ検査。


## 地図の生成の入口と描画（2026-11-03、G04）

正本は `game/map_data/` の4点＋河川・標高（`provinces.png`・`definition.csv`・`default.map`・`projection.json`・`rivers.png`/`rivers.json`・`heightmap.png`/`heightmap.json`）。CK3 の `map_data` の名前に合わせるが、全形式の互換は主張しない（`projection.json` と河川の色の符号化、16bit の標高は本作の形）。`adjacencies.csv` は海峡などの特殊な隣接を書く場所としてまだ作っていない。画像から出る通常の隣接と混同しない。

通常の再生成は一つのコマンドで、重い処理を直列に動かす。

```sh
node tools/map/build-map.cjs                       # 領域タイル → 年代別の版 → 境界線 → 河川の線 → 読み込みの確認値
node tools/map/build-map.cjs --height --python /path/to/venv/bin/python3   # 陰影も作り直す（NumPy・Pillow が要る）
node tools/map/build-map.cjs --check               # 書かずに、領域タイルと河川の線が正本どおりか確かめる
```

旧来の線（TKGEO）から正本を作る `tools/map/build-provinces.cjs` と、児島湾・遼東の焼き込み道具は移行用で、この入口からは呼ばない。正本があれば上書きを拒否する。

描画：

- 河川は `TKRivers`（`kuniezu/static/kuniezu/raster-map.js`）が `rivers-lines.json` を読み、日本・朝鮮とも同じ線・同じ描き方。名前と国境の破線は従来の主要河川の一覧（`TK.REGIONAL_RIVERS`）と名前が合うものだけ。旧来の河川データ（`japan-rivers-osm.js` など）は合戦図などほかの読み手のために残し、地図の通常描画では読み込み前の代わりにだけ使う。
- 川・道路・時代の水域・湖の線は、旧来の線の陸 `LANDV` ではなく、`paintBase` が領域画像から作る正本の陸の型で切る（`onLand`・`offLand`）。
- 表示範囲 `CONT` は正本の画像が覆う範囲（`TKRaster.bounds()`）に合わせ、画面全体を覆う厳密な制限で範囲の外を見せない。遼陽は最大倍率で年表の外に出せる。与那国など左下の隅は、パネルに隠れる場合がある（UI の折りたたみなどは別に検討）。
- メモリ：領域タイルは復号直後に画像と下書きを手放し、色分けして塗った画像は全タイル合わせて96枚まで（直近の描画で使ったものは残す）。陰影の画像は描画中のものを閉じない。

## 古い生成器の削除（2026-11-03、利用者の指示）

正本は画像そのもの（`game/map_data/` と `data/map/gun.png`）で、直す時は画像を直す。旧来の線や外部データから正本を作った移行用の道具は削除し、生成は `tools/map/build-map.cjs` の一本にした。削除したもの（Git の履歴に残る）：

- 正本を作った道具：`tools/map/build-provinces.cjs`（TKGEO の線→provinces.png）、`build-gun.cjs`・`extract-hgis-1910.py`（CODH・HGIS→gun.png）、`build-river-raster.py`（旧河川 JS→rivers.png）、`build-height-raster.py`（地理院標高の試験変換）
- 焼き込みの道具：`bake-kojima-baseline.cjs`・`bake-liaodong-baseline.cjs`、`tools/geo/kojima-bay-1600.cjs`
- 移行の受入検査：`tools/checks/kojima-source-baseline.cjs`・`liaodong-source-baseline.cjs`・`river-raster.py`（結果は `data/verification/` に残す）
- 生成時の集計 `data/audits/raster-provinces-build.json`（郡の割り当て表 `data/map/gun-assignment.csv` は移行時の記録として残す）

残した道具：`build-map.cjs`（入口）、`build-map-tiles.cjs`、`build-province-edits.cjs`、`build-edges.cjs`、`build-river-lines.cjs`、`build-height-cache.py` とそれが使う `build-copernicus-height.py`・`build-hillshade-raster.py`・`encode-relief-webp.cjs`、読み書きの `map-data.cjs`・`map_data.py`・`png-big.cjs`、点検の `audit-*`。年代別の差分の定義（`kuniezu/map/edits/applied/` など）は記録として残す。

### 線の地図データの生成器の削除（同日、利用者の指示）

`tools/geo` のうち、旧来の線の地図（陸・海岸・湖・河川・城の領域の境・局所の海岸補正）を作っていた生成器17本を削除した：`apply.py`・`korea.py`（と入力の `korea_admin1.geojson`）・`korea-coast.py`・`land-extension.py`・`lakes.py`・`repair-kanto.py`・`roadfix.py`・`roadfix2.py`・`castle-regions.cjs`・`apply-castle-regions.cjs`・`bizen-north-shore.py`・`audit-raster-derived-boundaries.py`・`regional-rivers.py`・`korean-rivers.py`・`select-major-rivers.py`・`select-reference-rivers.py`。

生成済みのデータ（`geo.js`・`land-extension.js`・`korea-coast.js`・`lake-baselines.js`・河川の JS など）は、合戦図・行軍・読み込み前の代わりの描画など、ほかの読み手のために残す。出典の表示は `kuniezu/static/kuniezu/licenses/DATA_SOURCES.md` に保持する。

残した `tools/geo` の道具は、街道の参照線・史跡の座標・合戦図の地形と水路（`battle-atlas.py`・`battle-rivers.py` と、その入力を取る `fetch-japan-waterways.py`）・経路の断面・古絵図の照合・時代の水域（香取・椿）など、地図の正本とは別のデータを作るもの。

## 範囲の作り直し（2026-11-04、利用者の指示）

利用者の指示「新たに地図を東に拡張し、最北端を地図の右上とする。その上で表示の限界と地図の限界を共有させる」に合わせた。

- 右上の角を国土地理院の日本の最北端（択捉島カモイワッカ岬、北緯45°33′26″・東経148°45′08″）にした。正本の画像は 20,782×24,288 から 23,426×23,496 画素（北を792行削り、東に2,644列を足した）。原点は (-1045, -761.604)。タイルの区切りは原点からの1024画素で、旧い格子とは行がずれる。
- 削った北の帯（北緯45.56〜46.27度）は、旧来の陸のデータが北緯45.53度で切れていたため、地図の上に「空白の帯」として見えていた（2026-11-03 に表示範囲を画像の範囲へ合わせた時に出た）。
- 足した東の範囲の陸（色丹・歯舞・択捉など）と北端の帯の陸は、Copernicus DEM GLO-90 で標高 0.5m 超を陸とし、未割当の陸にした（約48万画素）。取得した DEM は東経146〜148度の5枚（`.cache/copernicus-dem-90m`、再配布しない）。
- 正本の provinces.png・data/map/gun.png・rivers.png は `tools/map/regrid-extent-2026-11-04.cjs`（一度だけ）で作り直し、年代別の差分の型紙の窓を792行ずらした。標高 heightmap.png は `build-copernicus-height.py --single-image` で新しい格子に作り直した。
- 表示の範囲は正本の画像の範囲と同じ（`TKRaster.bounds()` → `CONT`）。範囲の外は見せない。
- 未割当の陸（満州・沿海州・北海道・千島など）の勢力の割り当ては次の段階。1560〜1615年に実在した勢力（明・女真諸部・アイヌなど）で、地図に見える範囲を MECE に分ける。この時期にロシアの勢力は沿海州・千島に達していない。

## 満州と和人地の境を流域で引き直す（2026-11-04、利用者の指示「雑な分類で史実の国境っぽくない」）

経緯度の折れ線で分けていた満州の4区画（建州女真・海西女真・東方の女真・蒙古）と和人地の境を、地形の流域で引き直した（`tools/map/frontier-basins-2026-11-04.cjs`、一度だけ）。

- Copernicus DEM GLO-90（`.cache/copernicus-dem-90m/`、取得済みのもの）から窪地を埋めた流下方向を求め、各画素がどの川の流域に属するかを決めた。境は分水嶺になる。
- 流域の割り当ては主な川の地点（渾河・撫順、太子河・本渓、鴨緑江・集安＝建州。清河・開原、東遼河、松花江・吉林、伊通河・長春＝海西。西遼河・通遼＝蒙古。牡丹江＝東方の女真）で決め、地点の無い流域は出口で決める（北の縁の西は蒙古、中央は海西、東は東方の女真。渤海へ出る遼河の西岸は蒙古、東は建州）。
- 根拠は韓国国史編纂委員会の女真の居住域の説明（建州は鴨緑江の北、海西は松花江の流域、東方は牡丹江以東）で、首長ごとの確定した領界ではない。注記（`kuniezu/static/kuniezu/liaodong-context.js` の boundaryNote）も「分水嶺で引いた」と書き換えた。
- 和人地は、知内〜上ノ国天ノ川の線（1550年の取り決め、函館市史）の南西に海へ出る流域を蠣崎家、それ以外を蝦夷地にした。
- 明の区画（遼東の辺牆の内側）と朝鮮の区画は変えない。

## 南の島と残りの小島の割り当て（2026-11-04、利用者の指示「南の島も分けましょう」）

北緯35.3度より南に残っていた未割当の陸（島558個）を `tools/map/assign-south-islands-2026-11-04.cjs`、その後に残った朝鮮の西海岸などの小島（228個・1,846画素）を `tools/map/assign-stray-islets-2026-11-04.cjs` で割り当てた（どちらも一度だけ）。これで未割当の陸は0画素になった。出典と未確認の点は `data/inputs/south-islands-review/sources.json`。

- 奄美群島は琉球（castle:shuri）。1609年3月7日からは年代別の差分 `amami-satsuma-from-1609` で薩摩（castle:uchi）。硫黄鳥島は1609年の後も琉球に残す。
- 久米島・粟国・渡名喜・慶良間などの琉球の島は castle:shuri。
- 伊豆諸島は伊豆国賀茂郡の島として韮山城の区画（castle:nirayama）。北条氏の島の支配の実態は未確認。
- 大東諸島・小笠原諸島・火山列島・鳥島・孀婦岩・西之島・尖閣諸島は新しい区画 `context:uninhabited`（無人島）。
- 地図の西の縁にかかる嵊泗列島などは新しい区画 `context:ming-zhejiang`（明・浙江の沿海）。
- 口永良部島・大隅の小島・朝鮮の沿岸の小島などは、最も近い割り当て済みの陸の区画（60km まで）。

## 正本だけを Git で管理する（2026-11-04、利用者の指示「正本だけ管理する」）

Paradox のゲームと同じく、地図の正本は `game/map_data/`（provinces.png 全域1枚・definition.csv・default.map・projection.json・rivers・heightmap）で、年代別の差分の入力は `kuniezu/map/edits/*.json`（と `applied/`・台帳・README）。これらだけを Git で追跡する。

- 配信物（`kuniezu/map/` の provinces・provinces-4・provinces-8・edges-1/4/8・edges.json・manifest.json・versions.json・rivers-lines.json・relief.json・relief-cache・edits/compiled）は `.gitignore` に入れ、追跡から外した（約880ファイル）。正本を一度直すたびに数百ファイルの差分が出て、本当の変更が埋もれていたため。
- 取得後と、正本や差分を変えた後に `node tools/map/build-map.cjs` で作る。陰影は `--height --python <NumPy・Pillow の Python>`（heightmap は Git LFS）。陰影が無くてもゲームは動く。
- CI（`Node.js CI`）は正本から地図を作り（陰影は除く）、raster-map と province-edits の検査を通す。正本と差分から配信物が作れることを毎回確かめる。
- ブラウザが1枚の画像として開けない大きさ（100m の段は展開すると約2.2GB）なので、配る時の分割は残る。分割は表示のための生成物で、編集・検査・差分の対象は正本の1枚だけ。

## 地図を kuniezu/map に一つにまとめ、層ごとに分ける（2026-11-04、利用者の指示）

利用者の方針「map_data と map を統合し、ファイル構造を MECE にする」「行政区分（国家 → 道 → 国 → 郡）に倣う」に合わせ、地図の正本と生成物を `kuniezu/map/` 一つにまとめた。以上の節に出てくる `game/map_data/`・`data/map/`・`kuniezu/map/<生成物>` は、この時点より前の置き場。

| 置き場 | 層 | 中身 |
|---|---|---|
| `kuniezu/map/admin/` | 行政区分 | 郡の画像 `gun.png`・一覧 `gun.csv`・`gun.json`（最小単位。国・道・国家への階層は次の段階で加える） |
| `kuniezu/map/control/` | 支配 | 城の支配域 `provinces.png`・`definition.csv`・`default.map`（CK3 の map_data の書式）、郡と城の対応 `gun-assignment.csv`・`gun-overrides.json` |
| `kuniezu/map/physical/` | 自然 | 標高 `heightmap.png`（Git LFS）・`heightmap.json`、川 `rivers.png`・`rivers.json`、岸の線を描かない切れ目 `shoreline_masks.geojson` |
| `kuniezu/map/projection.json` | 共有 | 経緯度→格子の変換（全層で共通） |
| `kuniezu/map/edits/` | 年代別の差分 | 差分の入力・台帳・適用履歴 |
| `kuniezu/static/kuniezu/map/build/` | 生成物 | `build-map.cjs` が作る配信物（Git で追跡しない）。ゲームは `map/build/` から読む |

- ファイルは移しただけで中身は変えていない。正本の確認値（`sourceSha256`）も同じ。
- 地図の URL は `map/…` から `map/build/…`（生成物）と `map/control/…`（区画の表）に変わった（利用者の判断で AGENTS.md の「配信 URL は変えない」の例外とした）。区画の表は、下の段 1b-3 で `map/build/` に写す形に改めた。
- 旧い置き場に残った生成物（`kuniezu/map/provinces/` など）は、`raster-map.cjs` が残っていると知らせる。手元では消してから `node tools/map/build-map.cjs` を実行する。
- 次の段階：郡 → 国 → 道 → 国家の階層表、郡の無い地域も含めて最小単位で全域を覆うこと、城の支配域を郡の組み合わせで表すこと、街道を画像の層として加えること。

## 目で確かめる縮小版（2026-11-04、利用者の指示「VS Code で画像が表示されないので、視覚的に確認しながら各エージェントに指示を出したい」）

正本の PNG（23,426×23,496 画素）は、VS Code（Chromium）が一度に展開できる上限を超えて開けない。郡の画像は番号を色の値に入れたもの、川の画像は黒地に1画素幅の線で、そのままでは読めない。`tools/map/build-previews.cjs`（`build-map.cjs` の最後の段。`--no-previews` で省く）が、層ごとの 1/4 の縮小版（5,857×5,874 画素、1画素＝400m）を `kuniezu/static/kuniezu/map/build/previews/` に作る。1度ごとの経緯度の線と数字を入れるので、「北緯36度・東経140度の辺り」のように場所を指して指示できる。

| ファイル | 層 | 見方 |
|---|---|---|
| `control.png` | 支配 | 城の支配域ごとの色。紺は海、青は湖 |
| `admin.png` | 行政区分 | 郡ごとの色、濃い線は国の境。薄い灰色は郡の無い陸 |
| `rivers.png` | 自然 | 青い線が川（4×4 画素の中に川が1画素でもあれば描く） |
| `height.png` | 自然 | 標高の段彩。標高の画像を Git LFS で取得していなければ作らない |

大きな PNG の読み込み（`tools/map/png-big.cjs`）は、16bit 灰色の標高の画像も読めるようにした（`readGray16`）。CI は縮小版を作らない。

## 正本を配信物から分ける（2026-11-05、段 1b-3、Claude）

利用者の決定（2026-11-05）：地図の正本は Django アプリのデータとして `kuniezu/map/` に置き、静的ファイル（`kuniezu/static/kuniezu/map/build/`）には生成物だけを置く。上の節に出てくる正本の置き場 `kuniezu/map/…` は、この移動の後のパスに読み替えてある（移動の前は `kuniezu/static/kuniezu/map/…`、その前は `game/map/…`）。

- 移したのは `admin/`・`control/`・`physical/`・`edits/`・`projection.json`。中身は変えていない。正本の確認値（`sourceSha256`）も同じ。
- 正本は配信しない。実行時に読む区画の表（`definition.csv`・`default.map`）は、`build-map-tiles.cjs` が生成のときに `map/build/` へそのまま写す。ゲームは `map/build/definition.csv`・`map/build/default.map` を読む。`--check` と `raster-map.cjs` は、写しが正本と同じことを確かめる。
- 年代別の差分の入力は `data/inputs` のマスクを相対パスで指すので、置き場が浅くなったぶん `../` を 2 つ減らした。
- `manifest.json` が記録する正本の置き場が変わるので、`manifest.json` の確認値（`edges.json` の `gridSha256`、陰影の置き場の鍵）も変わる。陰影は作り直しになる。タイル・境界線・年代別の版は変わらない。
