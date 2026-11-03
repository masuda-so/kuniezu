# 地片と歴史上の所属

地片画像の整数IDは `parcels.json` の `pixelId` を参照する。地片IDは安定した文字列で、郡・城・勢力のIDと別名前空間。画像の海・湖・未割当には地片を作らない。使用できる画素IDの予約範囲は画像仕様で定義する。分割時は旧IDを再利用せず、版間の対応表を別に持つ。

`parcels.json` は `{schemaVersion:1, parcels:[...]}`。各地片は `id`、`pixelId`、`sourceIds`、`boundaryBasis` を持つ。境界根拠は `historical`（対象時期を支持する形状）、`later-reference`（後代の参照境界）、`approximate`（概略）に分ける。近世末の郡ポリゴンから作った地片は `later-reference` とする。

`relations.json` は `{schemaVersion:1, relations:[...]}`。一件は `id`、`parcelId`、`kind`、`targetId`、`from`、`until`、`datePrecision`、`sourceIds`、`certainty` を持つ。`kind` は `administration`、`tenure`、`occupation`、`castle-jurisdiction`。行政は直属の単位を指し、上位単位との階層は別に解決する。日付はゲームの通日変換と同じ旧暦ラベル `[年,月,日]` の半開区間。年・月しか確認できない場合も、検索用の有効範囲と史料の精度 `datePrecision`（`year` / `month` / `day`）を区別する。精度の異なる史料を並べても明渡し日を自動確定しない。

同じ地片・期間に異種の関係は並存できる。同種で対象が異なる主張は削除せず、表示側で競合として扱う。同じ日付の地片に関係記録がなければ、帰属は未確認。城を保存・行軍の地点IDとして引き続き参照する。地片から領有を導出する処理のために城座標を移さない。

日付の第4要素に `1` を付けると閏月。同じ月の通常月と閏月は `game/koyomi.js` に従って順序付ける。`certainty` は `documented` / `inferred` / `disputed`。境界と所属の確度はそれぞれ記録する。

`node tools/checks/territory-parcels.cjs parcels.json relations.json` でIDの重複、地片参照、暦日、期間、出典ID欄を検査する。期間が重なる同種・別対象の記録は `conflicts` に出す。出典IDは既定で `data/research/sources.jsonl` と照合する。検証用の別台帳は第3引数で指定できる。本文の裏付けと地片画像の画素IDは別に検証する。
