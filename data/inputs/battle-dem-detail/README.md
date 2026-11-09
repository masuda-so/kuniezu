# 合戦図の細密比較標高

2026-11-09。桶狭間（00）、長篠・設楽原（02）、関ヶ原（03）を、既存の経緯度範囲を保って512×358格子へ更新した。国土地理院の標高タイル DEM10B z14を加工して作成。戦国期の造成前地形や当時の河道を確定した資料ではない。

- 原本86タイル（約7MB）は各 `inputs/` に保持する。URL・取得時刻・SHA・バイト数は `input-manifest.json`。
- `river-reference.json` は更新前の配信JSONの原バイト。河川比較線と範囲の照合入力として独立保持する。公開する更新後のJSONを入力にせず、循環した生成を避ける。
- `generation-manifest.json` は既存の `tools/geo/build-local-dem.cjs` が出力した生成記録。原標高のRGB符号付き0.01mを復号し、規則的経緯度格子の包含画素から1m整数に丸める。NoDataは補間せず失敗する。
- 位置の確認済み地名は `battle-atlas-data.js` に保持する。標高の生成器が返す空のpointsで上書きしない。

## 再現

リポジトリルートから、未使用の出力先へ生成する（例は03）。生成器は内容が異なる既存ファイルを上書きしない。

```sh
node tools/geo/build-local-dem.cjs --manifest data/inputs/battle-dem-detail/03/input-manifest.json --output-dir /tmp/kuniezu-dem03-rebuild
cmp /tmp/kuniezu-dem03-rebuild/03.json kuniezu/static/kuniezu/atlas/03.json
node tools/checks/battle-atlas-detail.cjs
```

00・02も同様。採用時は生成物を照合して該当する配信用JSONへ置く。旧 `battle-atlas.py` はframesの `elevationManifest` 指定がある地形を再生成せず、採用済み出力SHA・範囲・解像度を確認して保持する。表示範囲のメタデータだけの同期は次で行う。

```sh
python3 tools/geo/battle-atlas.py --titles 関ヶ原の戦い 桶狭間の戦い 長篠の戦い --presentation-only --offline
```

地形原本の取得・再生成はゲーム実行時には行わない。配信するJSONと、同じ格子から作る陰影・等高線だけを表示する。

## 提供元・利用条件

- [標高タイル仕様](https://maps.gsi.go.jp/development/demtile.html)
- [地理院タイル一覧](https://maps.gsi.go.jp/development/ichiran.html)
- [国土地理院コンテンツ利用規約](https://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html)
- 表示クレジット：地理院タイル（標高タイル DEM10B）を加工して作成。
- 河川は従来のOpenStreetMap／Geofabrikの現代比較線（ODbL 1.0）。各旧JSONの `riverSource` と、生成物の `riverSource.inputSHA256` を参照。
