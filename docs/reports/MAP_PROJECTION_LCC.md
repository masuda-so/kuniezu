# 地図平面をランベルト正角円錐図法にする（2026-11-04、Claude）

利用者の指示：昭文社「卓上版日本全図」のように北が真上でない地図にしたい。調査の結果、その図はランベルト正角円錐図法で、「北が上でない」こと自体の名称は無く図法名で呼ぶ（関連語：真北・磁北・座標北、斜軸、四方対置）。利用者の決定「円錐図法で進める」。設計と数値は `docs/architecture/map-projection.md`。

## 変更

| 区分 | 内容 |
|---|---|
| 投影の式 | `game/map-projection.js`（新規）。旧平面 legacy と円錐図法 lcc（中央経線 135°E、標準緯線 30°N・42°N、原点 135°E・36°N、球）。ブラウザと Node で共有 |
| 生成 | `tools/map/reproject-grid.cjs`（新規、生成の最初の段）が正本の領域・郡・標高を新格子 `game/map/build/grid/` へ最近傍で写す。正本の区画ごとの画素数の監査もここで数える。`grid-map.cjs`（新規）が格子の対応の規則を一つにし、`build-province-edits.cjs` も同じ規則で差分を写す。`build-map-tiles.cjs`・`build-edges.cjs` は新格子を読み、`build-river-lines.cjs` は正本で辿った線の点を写す。`png-big.cjs` に読みの一時停止（逆圧）を足した |
| 陰影 | `build-height-cache.py`・`build-copernicus-height.py`・`build-hillshade-raster.py` が `type:'lcc'` の格子を受け、`relief.json` に投影を書く。実行時（`raster-map.js`）は配信タイルと同じ投影の陰影だけ使う。**この環境には NumPy の入った Python が無く、陰影の作り直しは未実行** |
| ゲーム | `game/plane-migrate.js`（新規、`central-offices.js` の後）が `TKGEO`（領域・境・川・湖・陸・城の位置・国名の名札）と `TK.ROADFIX`・`TK.LOCAL_MOVEMENT_ROUTES`・`TK.HISTORIC_WATERS` を一度だけ新平面へ変換し、`TKGEO.project`／`unproject`／`inKoreaBox` を用意する。`engine.js` の `G.PJ`、`ui.js`・`battle-atlas.js`・`battle-phases.js`・`logistics-review.js`・`terrain-tiles.js` の式を置き換えた |
| 保存 | `plane-migrate.js` が `G.setS` の一番外側で、`planeProjection` の印が無い保存の座標（城・廃砦・砦・火・史跡・行軍の線・人物の点・橋）を変換する。`movementGeometryVersion` 22→23 で行軍の線を作り直す |
| 検査 | `raster-map.cjs` が `grid.json`・`manifest.projection` の整合と `reproject-grid.cjs --check` を加える。`battle-arrival-audit`・`castle-region-points`・`road-spur-audit`・`okitanawate-position` は `TKGEO.unproject`／`project` に |
| 文書 | `docs/architecture/map-projection.md`（新規）、`raster-map.md`・`geographic-coordinates.md` の追記、README（日英）・AGENTS.md |

## 数値

- 新格子 26,659×24,267 画素（正本 23,426×23,496）。写しは領域 30 秒・郡 29 秒・標高 29 秒、最大常駐 358MB。
- 往復誤差 6e-14 度。縮尺係数 24.5°N 1.014、36°N 0.995、45.5°N 1.009。北の傾き：札幌 3.7 度、根室 6.2 度（中央経線の東では北が左へ）、那覇 4.3 度（右へ）。
- 距離：京→江戸 649.9→651.4 単位、松前→函館 122.5→116.1 単位（旧平面は北で東西が 10% 伸びていた）。

## 検査の結果（worktree、2026-11-04）

| 検査 | 結果 |
|---|---|
| `node tools/map/build-map.cjs --no-previews` | 完了（格子の写し 98 秒、タイル 211 枚、年代別の版 4、境界線 3 段＋国境 613 群、河川 143 本） |
| `tools/checks/offline.cjs` | PASS（構文・保存・7 シナリオ 720 日の史実進行） |
| `tools/checks/raster-map.cjs` | PASS（`reproject-grid --check`、タイルの照合、郡の割り当て、未割当の陸 0 画素） |
| `tools/checks/province-edits.cjs` | PASS（固定具は正本の格子のまま、恒等の経路） |
| `tools/checks/province-runs.cjs`・`hachirogata-water.cjs`・`katori-water.cjs` | PASS（八郎潟・香取は正本の局所を直接読む形に変更。岸線 411,846 本が補正境界を横切らない） |
| `tools/checks/organization.cjs`・`infrastructure.cjs`・`secret-scan.cjs`・`stamp-assets --check` | PASS |
| タイルからの区画の引き直し | 京→castle:kyo、江戸→castle:edo、那覇・奄美→castle:shuri、札幌・根室→context:ainu、日本海→海 |
| 実画面（worktree を 8001 番で配信） | 全域・関東・最大倍率で塗り・境界線・街道・城が一致。当たり判定は京・江戸・琵琶湖・那覇・奄美・札幌・根室とも正しい区画。城 139 のうち 137 が自分の区画で、残り 2 は本線と同じ。保存の移行で城の位置が戻り、行軍の線と人物の点 331 点が全て日本の範囲内。`castle-region-points` の問題一覧は本線と同一。要約は `data/verification/claude-conic-projection/README.md` |

## 残り

- 陰影の作り直し（NumPy・Pillow の Python で `node tools/map/build-map.cjs --height --python …`）。作り直すまで陰影は表示されない。
- 向きの切り替え（天を東西南北に、枠の回転）は別の PR。
- `TK.ROADFIX` は点数の照合が新平面の距離で変わるため、合わない街道は経緯度から引き直される（表示上の差は小さい）。
- 朝鮮半島の削除と範囲の見直しは別の PR（利用者の方針）。
