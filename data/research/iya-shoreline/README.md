# 揖屋の旧修正範囲との対応

`pixel-reconstruction.json`は旧画像版の修正PR44、コミット
`3885980568459d733987fc372388f27eaa7483e4`の同名ファイルをそのまま保存した比較資料。
現行地図への適用入力ではなく、旧正本のPNGを上書きするために使わない。
`runs`は`[行, 開始列, 終了列（含まない）]`。319画素の中心を投影定義で実座標へ戻し、
現行ベクターで湖内かつ陸地外にあることを確認する。

旧調査は、国土交通省の1947年・2018年の汀線と航空写真の比較を根拠に、
戦後の揖屋干拓地を除去するものだった。戦国期の精密な湖岸を確定する資料ではない。
今回の検査も、旧画素全域の面積一致や全ての戦国期湖岸の確定を主張しない。

- [国土交通省・環境管理計画資料、図3-3-12](https://www.cgr.mlit.go.jp/izumokasen/iinkai/ryuiki/econet/bukaivol6/files/05_shiryo2.pdf#page=60)
- [中国四国農政局・揖屋地区](https://www.maff.go.jp/chushi/kj/tyutyo/photo/photo_iyakantaku.html)

上記は旧調査の根拠への入口であり、今回新たに全文を再照合したという記録ではない。
現行の形状・描画期間の正本は`kuniezu/map/physical/land.geojson`と`water.geojson`。

```
GAME_TEST_OUTPUT=data/verification/codex-iya-vector node tools/checks/iya-vector.cjs
```
