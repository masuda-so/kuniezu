# 児島湾の補正を全域1枚の正本へ反映

## 不具合と修正

`game/map_data/provinces.png` は児島湾の補正前の形で、修正後の形は1560年・1584年の配信用差分タイルにだけ入っていた。正本を直接見ると古い形に戻って見えた。タイトル画面は1560年を初期化するため従来から補正を適用していたが、正本画像そのものには反映されていなかった。

全期間に有効な5補正を1560年の正本へ焼き込んだ。対象は児島湾の海域12,643画素・陸域10,663画素、水島の東216画素・西644画素・南140画素、合計24,306画素。海は差引2,980画素増。定義表、default.map、投影格子は不変。

5定義は `game/map/edits/applied/` に移して相対パスを調整し、入力SHA・適用画素数・新正本SHAを台帳に記録。年代差分は1584年から1616年までの宇喜多期366画素だけになった。旧1560版と、1584版の不要な1タイル・境界線を削除し、正本から100m・400m・800mのタイル、辺、版一覧を再生成した。

## 正本画像の確認

[補正前の元RGB](../../data/verification/kojima-source-baseline/before-source-rgb.png) と [補正後の元RGB](../../data/verification/kojima-source-baseline/after-source-rgb.png) は、正本の同じ630×390画素窓を変更せず切り出した画像。

[補正前の陸海表示](../../data/verification/kojima-source-baseline/before-land-sea.png) と [補正後の陸海表示](../../data/verification/kojima-source-baseline/after-land-sea.png) は、その画素を定義表の陸海分類色に置き換えた確認図。ゲーム画面の撮影や新たな汀線の描画ではない。

- 元PNG SHA-256: `9f6f03ed2628dc7ffb406c69fbe4dfb9f00daa0d2c266474541a682e83ae2dbf`
- 新PNG SHA-256: `2b2fe511a86fb8bdfa6b8d671a2883304b21f1499da3a7544f94128922c7f1a1`
- 旧正本4入力SHA-256: `9b949f63027df04ce0f12ce36294dd1ac338e057693952b752eff9627680b42f`
- 新正本4入力SHA-256: `46ac04975ed4291bd7f1ead55f985818b5daf91f0f84430c8064e909b09bd7a4`
- 新配信manifest SHA-256: `b8a6b1561f3ea75500cfad95daa053a12862b5101437c80f03867b9ec6a74a0a`

## 受入検査

1. 独立PNG検査で正本の全504,753,216画素が100mタイルと一致、未知色0、相違0。正本4入力のSHAも一致。
2. 旧1560年表示と新正本、旧1600年表示と新1584年版のそれぞれで、全段251タイルがバイト単位で完全一致。出力しない海タイルの座標集合も一致。各時点の全段格子544,190,856画素（配信257,424,040・省略海286,766,816）を対象とする。
3. 各時点224位置の境界線がすべて一致。海岸・領域・国境が別の形へ戻らない。
4. 正本PNGを直接読み、藤戸の局所4近傍通水を確認。児島と本土の陸接続なし。水島は海、経ヶ島・藤戸寺・塩生・浮洲岩跡・早島の丘・北岸確認点は陸。
5. 旧ベクトル生成、旧型紙生成、二重焼き込みをそれぞれ実行して拒否を確認。拒否後の正本4入力SHAは不変。
6. province-edits の実PNG回帰検査を通過（半開期間・重複/適用済みID・重なり・基準/タイルSHA・型紙・粗い段の端・失敗時出力保持）。

結果: [migration.json](../../data/verification/kojima-source-baseline/migration.json)、[source-image.json](../../data/verification/kojima-source-baseline/source-image.json)、[acceptance.json](../../data/verification/kojima-source-baseline/acceptance.json)。

## 通常の再生成と制限

通常は `build-map-tiles.cjs` → `build-province-edits.cjs` → `build-edges.cjs` の順。`build-provinces.cjs` は初回移行だけに使い、既存正本を上書きしない。焼き込みと旧型紙の道具は移行前の特定SHA限定で、現在の正本へ再適用できない。

これは既に採用した史料読図・現代標高比較による補正を正本に統一する作業。新たな戦国期汀線の精密確定ではなく、宇喜多期の切替も年精度の仮定を維持する。元の資料と型紙は削除しない。候補作成・検査は一時ディレクトリ内で行い、共有正本・サーバーは操作していない。ブラウザでの操作確認は統合後の別検査。
