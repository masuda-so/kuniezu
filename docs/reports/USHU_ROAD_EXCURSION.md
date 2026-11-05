# 羽州道・大鰐付近の往復表示

近現代道路の比較線は大鰐付近の交差点から東へ進み、同じ交差点に戻って北へ向かっていた。東側の概略経由点を拾う約12.9kmの閉路を表示用の線から除いた。国土交通省の大鰐・弘前の資料に従い、石川を経て弘前へ向かう街道と鯖石から分かれる乳井通りを区別した。既存の原線と両端は保持し、戦国期の細部の復元とは区別する。

- [国土交通省「羽州街道 大鰐」](https://www.thr.mlit.go.jp/aomori/syutu/hirokoku/rekishi_kaidou/usyu-kaidou2/usyu-kaidou2.html)
- [国土交通省「羽州街道 弘前」](https://www.thr.mlit.go.jp/aomori/syutu/hirokoku/rekishi_kaidou/usyu-kaidou3/usyu-kaidou3.html)
- [国土交通省「乳井通り 弘前～尾上編」](https://www.thr.mlit.go.jp/aomori/syutu/hirokoku/hirokoku_rekisi/hirokoku-rekisi/aomori_rekisikaidou/nyui-kaidou/nyui-kaidou-1.html)

全85街道の閉路・原線・端点検査、行軍表示、旧保存移行、[専用Chromeでの表示確認](../../data/verification/codex-ushu-road-excursion/README.md)に合格。別の road-display 検査は東海道の表示名に「近現代」を求める旧期待で、変更前にも同じ失敗を再現した。

## 行軍経路への反映

同じ1560年開始データで、比較線の修正前後の `G.visualEdgeGeo` を全319城間接続で比較した。接続IDと両端座標は全件一致。行軍描画用の折れ線が変わったのは檜山―石川と石川―三戸の2接続だった。ゲーム投影上の折れ線長の目安は、檜山―石川で108.8kmから95.6km、石川―三戸で158.5kmから157.3km。史実の行程距離を示す値ではない。

## 江戸期の経路との比較

『江戸主要街道データセット』（ROIS-DS人文学オープンデータ共同利用センター作成、doi:10.20676/00000452）v4のR201「羽州街道」と照合した。同一交差点はR201の線から約4.16km、閉路東端の概略経由点は約0.33km。閉路を除いた後も、北緯40.47〜40.50度の表示線38点はR201から中央値約4.19km離れている。点間隔は均等でないため、中央値は線全体の誤差を表さない。距離は各点からR201の最寄り線分までの局所平面近似。往復表示の除去で旧道への位置合わせが済んだとは扱わない。大鰐―石川の区間そのものを照合し直す必要がある。

v4の収録47地物に六十里越街道はないため、同データセットは六十里越の仮接続を置換する資料には使えない。[CODH「江戸主要街道データセット」](https://codh.rois.ac.jp/historical-gis/edo-road/)
