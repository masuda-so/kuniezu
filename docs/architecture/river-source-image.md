# 河川の正本画像

`game/map_data/rivers.png` が全域1枚の河川正本。`rivers.json` は投影格子、色と河川IDの対応、出典、入力SHAを保持する。黒は河川なし。交点では色を混合せず、その画素に属する河川IDの組合せを表で保持する。CK3固有の河川パレットとの互換形式ではない。

経緯度と100m格子は領域画像の `projection.json` と共通。643本・143群の現代参考線を初期移行し、全504,753,216画素を独立アルゴリズムで検査した。戦国期の河道を確定したことを意味しない。原線と出典は `data/inputs/river-raster-source/` に移行時の照合記録として残す。

通常の派生生成は旧JSや原線を読まない。新規の出力先を指定する。

```sh
python3 tools/map/build-river-raster.py \
  --from-image game/map_data/rivers.png \
  --manifest game/map_data/rivers.json \
  --grid game/map_data/projection.json \
  /tmp/kuniezu-river-cache
```

正本を編集した場合は、rivers.jsonのsha256を明示更新する。新色はencoding.codesに河川IDの組合せを定義してから使用する。未知色・異なる寸法・投影・破損PNGは拒否する。既存出力先を上書きしない。

`tiles` は初期移行時の照合値で、正本へ戻すための入力ではない。生成した配信用manifestがその回の派生物を特定する。元入力の絶対パスも移行時の来歴であり、通常の再生成に必要な場所ではない。

検査結果は `data/verification/river-source-image/`。画像だけを変更した際の派生伝播、交点、領域外の切取り、CRC、失敗時の既存出力保持を含む。実行時描画への接続はこの正本を利用する地図描画側で行う。
