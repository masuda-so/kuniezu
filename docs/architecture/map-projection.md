# 地図の投影（2026-11-04、利用者の決定「円錐図法で進める」）

## 決定

利用者が示した昭文社「卓上版日本全図」（ランベルト正角円錐図法）のように、北が中央経線の上でだけ真上を向き、経線が中央へ寄り、緯線が弧になる地図にする。「北が上でない」こと自体に固有の名称は無く、図法名で呼ぶ。関連する用語：真北・磁北・座標北（方眼北・図北）、正軸・横軸・斜軸、ノースアップ／ヘディングアップ、四方対置（江戸期の国絵図が上下を定めない描き方。`docs/reports/` の調査を参照）。

| 項目 | 決定 |
|---|---|
| 図法 | ランベルト正角円錐図法、球（半径は平面の単位で 200·180/π。緯度 1 度＝200 単位の約束を保つ） |
| 中央経線 | 東経 135 度（正本の範囲 122.9〜148.75 度のほぼ中央。畿内で北が真上） |
| 標準緯線 | 北緯 30 度・42 度（縮尺係数は 24.5 度で 1.014、36 度で 0.995、45.5 度で 1.009） |
| 原点 | 東経 135 度・北緯 36 度が平面の (0,0)。x は右、y は下 |
| 単位 | 従来どおり 1 単位 ≈ 556.6m（標準緯線で）。画素は 100m＝0.17966 単位のまま |
| 正本 | 変えない。`game/map/projection.json`（旧来の簡易平面 x=(経度−129.2)·200·cos36°、y=(41.75−緯度)·200）の格子のまま |
| 配信物 | 正本から円錐図法の格子へ写した画像（`game/map/build/grid/`）を土台にタイル・境界線・陰影を作る |
| ゲームの平面 | 円錐図法の平面。`G.PJ`・`TKGEO.project` はこれ。旧平面の座標を持つデータは読み込み時に一度だけ変換する |
| 向き（図北の角度） | 別の PR（`claude/map-orientation`）。画布を CSS で反時計回りに回し、既定は明治「大日本全図」に合わせた 11 度。文字は画面で読める向きに戻し、入力は逆に回す。`docs/reports/MAP_ORIENTATION.md` |

北の傾き：中央経線の東では北が左へ傾く（陸は時計回りに回って見える）。札幌で 3.7 度、根室で 6.2 度、那覇では逆に 4.3 度。壁地図の強い傾きは枠の回転によるもので、図法だけでは出ない（別の PR）。

## 旧平面との関係

- 旧平面（legacy）と新平面（lcc）の式は `game/map-projection.js` に一つだけ置き、ブラウザ（`window.TKProjection`）と Node（`require`）で共有する。経緯度→平面は `project`、平面→経緯度は `unproject`、旧平面→新平面は `fromLegacy`。
- 距離：京→江戸は旧 649.9 単位→新 651.4 単位、鹿児島→名護屋は 401.4→401.2。旧平面は北で東西が 10% 伸びていた（松前→函館 122.5→116.1）。行軍日数（25 単位＝1 日）は北海道・琉球で数%変わる。史実の着陣日は `G.scheduleHistorical` が日付で決めるので動かない。

## 正本の格子から円錐図法の格子へ

`tools/map/reproject-grid.cjs`（生成の最初の段）が、正本 `control/provinces.png`・`admin/gun.png`（`--height` で `physical/heightmap.png`）を新しい格子へ最近傍で写し、`game/map/build/grid/` に書く。新しい格子は正本の四辺を新平面へ写した外接長方形（26,658×24,267 画素。正本は 23,426×23,496）。格子の定義と確認値は `grid.json`。

- 全体を一度に持たない。正本を行ごとに読み、出力の 1 行が参照する正本の行（最大約 1,300 行）だけ手元に置く。読みが先行し過ぎたら止める（`png-big.cjs` の `ctl.pause`）。
- 出力の各画素は正本の画素を一つ選ぶ（色を混ぜない）。正本の外は海・郡なし・標高なし。
- 川（`physical/rivers.png`）は 1 画素幅の線なので画像として写さない。`build-river-lines.cjs` が正本の格子で線を辿り、点を新平面へ写す。
- 年代別の差分（`game/map/edits/`）は正本の格子の画素で表す。`build-province-edits.cjs` は差分の画素の集合を正本の格子で作り、新しい格子の各画素が参照する正本の画素がその集合に入るかで書き換える（土台と同じ最近傍の規則なので穴や重なりが出ない）。

## 生成物を読む側

- `game/map/build/manifest.json` の `projection` は新しい格子（`type:'lcc'`、`origin`、`stepUnits`）。実行時の `raster-map.js` は `origin`・`stepUnits` しか使わないので、タイルの貼り方は変わらない。
- 境界線・陰影・河川の線は新平面の座標。
- 旧平面の座標を埋め込んだデータ（`geo.js` の `TKGEO`、`land-extension.js`、`kanto-repair.js`、`castle-regions-data.js`、`bizen-north-shore.js`、`data.js` の `TK.ROADFIX` など）は `game/plane-migrate.js`（`geo.js` の直後）で新平面へ変換する。式を直接書いていたモジュールは `TKGEO.project`／`TKGEO.unproject` を呼ぶ。
- 保存データ：平面の座標を持つ欄（城の位置 `cst[id].x/y`、行軍の線 `visualTravel.line`、人物の `tr.line`・`_visualPoint`）は、保存の `planeProjection` が `lcc` でなければ読み込み時に旧平面→新平面へ変換する。`movementGeometryVersion` も上げ、行軍の線は作り直す。

## 検査

- `node tools/map/reproject-grid.cjs --check`：`grid.json` が今の正本・投影どおりか。
- `tools/checks/raster-map.cjs`：配信タイルの元（`manifest.source.sha256`）が今の正本か（従来どおり）。`manifest.projection.type==='lcc'` と `grid.json` の整合を足す。
- 実画面：京・江戸・札幌・那覇の当たり判定（経緯度→平面→区画）、経緯線の曲がり、境界線と塗りのずれが無いこと。
