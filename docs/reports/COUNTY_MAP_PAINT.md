# 郡の塗り（段 7、設計の PR 3）

[郡の区分と城の保有で領土を描く](../designs/county-territory.md) の PR 3。ゲームの地図を、郡の区分と、その日の城の持ち主から塗る。年表・保存・行軍は変えない（年表の置き換えは PR 7）。

## 変えたこと

- `kuniezu/static/kuniezu/county-map.js`（新規）：郡の形・区画・例外・境の線を、ゲームの起動を待たせずに読む。`G.castleOwner(key)`（行軍拠点の城は `S.castles`、それ以外は `G.yOwner`、存在する期間の外は数えない）で城の持ち主を引き、技術計画 3 の規則（例外 → 郡の中の城 → 国の城がすべて同じ家 → 未導出）で郡の色を決める。持ち主の違う城がある郡は区画ごとに塗る。未導出の郡に止まった雲を重ねる（流すのは PR 8）。
- `kuniezu/static/kuniezu/ui.js`：表示設定「領地の塗り：郡／城の領域」（既定は郡）。郡の塗りは陸の形で切り抜いた持ち主の層として描き、陸と水の年代の違いは今までどおり陸の形が担う。国境の線は郡（区画）どうしの境で、両側の持ち主が違う所だけに今の描き方（`borderStyle`）で引く。郡の塗りのときは、地図の面を押しても城を選ばず、郡の説明（郡名・国名・持ち主・根拠）を出す。直線距離で支城を塗り分ける古い描画（`drawBranchLands`）は止める。
- `kuniezu/static/kuniezu/vector-map.js`：その日に表示範囲にある面・線の鍵を返す `keys()` を足した。
- `tools/geo/county_tables.py`：郡（区画）どうしの共有の境 `gun-edges.geojson` を書き出す（2,147 本、8 MB）。郡の形と区画は 1 バイトも変わらない。
- 検査：`tools/checks/county-map.cjs`（規則の各場合と、開始時点ごとの数。Node.js CI に追加）、`tools/checks/county-map-browser.cjs`（実画面）、`tests/test_county_tables.py`（境の線）。

## 確かめたこと

[実画面の確認](../../data/verification/claude-county-map/README.md) と、`county-map.cjs` の数（規則で決められない郡は 1560 年で 246、1592 年で 95）。

## 限り

- 色は、今のゲームの城の持ち主（史料とは未照合）から決めた推定。郡の形は江戸末期の郡境。
- 郡名を地図の上には書いていない（指したときの説明だけ）。
- 雲はまだ流れない（PR 8）。係争の斜線は PR 7。
