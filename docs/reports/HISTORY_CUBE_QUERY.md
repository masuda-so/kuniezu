# 史実DBの時空間キューブ検索

## 判断と変更

既存のSQLite関係表と3次元R-tree、疎な `space_time_cube` VIEWを維持する。
キューブは場所×原暦の年における出典付き記録数の集計用であり、人物の来歴、
史料本文や不確かな存続期間を置き換える正本にはしない。編集は対象別の
`data/research/curated/`、SQLは再生成する読取モデルとする。

SQLite公式の [R-tree](https://www.sqlite.org/rtree.html) は空間・時間の範囲検索を扱う。
Esri公式の [時空間キューブ](https://doc.esri.com/en/arcgis-pro/latest/tool-reference/space-time-pattern-mining/create-space-time-cube.html)
は地点を場所と時間の区画へ集計する構造であり、本実装はNetCDF互換ではない。
静的ゲームと共同レビューの運用を保つため、別のDBサーバーは導入しない。

今回の追加は既存VIEWの読取CLI `cube`。年・暦で絞り込み、集計キーで順序を固定する。
年別の全件複製、空セルの生成、未記録の所在補間、史料の年代確定は行わない。
元記録と出典は既存 `query` を参照する。経緯度は表示用のゲーム平面座標とは独立する。

## 確認

- 既存の104記録と263件のJS/SQL検索結果が一致。
- 既存の不正入力16件を拒否し、キューブ5ケースで地点・暦・期間の扱いを維持。
- 新しいキューブ検索の関数・CLI、絞り込み・入力拒否・読取専用性は専用検査（関数13件・CLI13件）で確認。
- 基本検査（Offline checks）、フォルダ・担当管理、基盤の既存検査も合格。
- 別担当がコードとSQLを独立確認し、既存build/queryが変わっていないこと、
  読取専用・構成要素別の集計を確認。
- 描画とゲーム進行は変更しないため、今回の受入条件はSQLの結果とDB非変更。
  実画面検査や全史実・全人物の照合を済ませた証拠にはしない。

操作例は [DB設計と検索](../architecture/history-database.md)、
検査コマンドは [検証手順](../../tools/checks/README.md) に集約する。
