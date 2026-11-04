# 史実の関係DB・時空間検索・集計キューブ

## 採用する構成

史料・人物・場所・命題・所在観測の関係は SQLite の関係表で保持し、年月と対象IDに B-tree、経度・緯度・年には3次元 R-tree を使う。外部キーを有効にし、孤立参照とDB整合性を生成時に検査する。ゲームは従来どおり静的HTML/JSで動き、DBサーバーを起動する必要はない。

編集の正本は引き続きレビュー可能な curated JSON。JSONLとSQLiteはそこから作る派生物とする。SQLiteを直接編集して別の正本にしない。複数担当は対象IDごとの入力ファイルを編集・レビューし、生成物の差分だけを変更しない。既存DBの無条件上書きを拒否し、新しいファイルへ生成・検査してから共有する。

## 表と精度

- `entity/alias/authority/place`：安定ID、別名、典拠ID、経緯度代表点。未登録参照は `registered=0` とし、`unregistered_entities` から調査対象を抽出する。ゲームノードの推定座標を確認済み史跡座標として投入しない。
- `source/record/record_entity`：命題本文は1記録に保持し、複数人物・場所への関係表で参照する。年ごとの複製を作らない。
- `event_date`：原暦の年・月・日・閏月・精度。年しか分からないものは月日をNULLにする。旧暦をSQLiteの日付関数で西暦へ自動変換しない。原の複合対象・推定区分は `event_time_json` にも保持する。
- `spatial_reference/spacetime`：場所の代表点に結びついた記録の候補索引。関係が城主・本拠であることを、現地滞在の証明と同一視しない。R-treeは浮動小数点の丸めがあるため、最後に元の経緯度と年月範囲で照合する。
- `map_region/record_map_region/map_edit`：地図正本の区画キー・色・種別と、命題の実装参照を別表で保持。城の管理区画を史実の知行範囲と同一視しない。地図の年代差分は元の年月日配列のまま保持する。

`record`と`spacetime`の期間は開始を含み終了を含まない。年精度の1601年は `[1601,1602)`。`described-period-candidate` は記述年代の検索候補で、確定存続期間ではない。既存CLIと同じく区分付きで返し、SQLで候補を除く場合は `history_without_period_candidates` を使う。このビューも現地滞在を保証するものではない。外部キーは接続ごとの設定なので、外部ツールで更新接続する場合にも `PRAGMA foreign_keys=ON` が必要。

## 時空間キューブとの役割分担

`space_time_cube` は0.25度の経緯度セル×原暦1年に集計する疎なVIEW。原点は世界の西南端（経度-180・緯度-90）なので、地図表示範囲を広げてもセル番号はずれない。空セルや不明な滞在年を生成せず、暦・日付精度・記録種別・推定区分を混ぜない。度数セルなので距離・面積の均等な格子ではない。件数は出典付きの記録数で、兵数や人口ではない。同一史実を別命題として記録した場合の重複は、史料レビューで解決する必要がある。

集計キューブだけを正本にすると出典や日付精度を失いやすい。このためRDBを元データにし、分析用途のキューブをVIEWとして生成する。現状の空間検索範囲は、実座標照合済みの場所に限られる。未登録座標は実装や索引の不具合でなく調査対象として残す。

## 操作

リポジトリルートで実行する。Python標準のsqlite3にR-treeが必要。追加DBサーバーやPythonパッケージの導入は不要。

```sh
node tools/research/export-evidence.cjs
python3 tools/research/history_sqlite.py build --output /tmp/kuniezu-history.sqlite3
python3 tools/research/history_sqlite.py query --db /tmp/kuniezu-history.sqlite3 --entity 県城 --from-year 1613 --to-year 1614
python3 tools/research/history_sqlite.py query --db /tmp/kuniezu-history.sqlite3 --bbox 133.9 33.5 134 33.6 --from-year 1600 --to-year 1615
python3 tools/checks/history-sqlite.py
```

SQL例（入力はパラメーターで束縛する）：

```sql
SELECT * FROM history_without_period_candidates WHERE from_year <= 1600 AND until_exclusive > 1600;
SELECT * FROM event_date WHERE calendar='Japanese-lunisolar' AND year=1613 AND month=12 AND day=15 AND leap_month=0;
SELECT * FROM space_time_cube ORDER BY calendar,year,longitude_bin,latitude_bin;
SELECT * FROM unregistered_entities ORDER BY kind,id;
```

## 設計の根拠

- [SQLite R*Tree公式](https://www.sqlite.org/rtree.html)：空間・時間の範囲検索、丸めの注意。
- [SQLite 外部キー公式](https://www.sqlite.org/foreignkeys.html)：参照整合性と接続ごとの有効化。
- [SQLite 日時関数公式](https://www.sqlite.org/lang_datefunc.html)：専用日時型はなく、対応形式を選ぶ必要がある。
- [Esri 時空間キューブ公式](https://doc.esri.com/en/arcgis-pro/latest/tool-reference/space-time-pattern-mining/create-space-time-cube.html)：空間・時間の区画へ点を集計する分析用構造。本実装は同製品のNetCDF形式互換ではなく、SQLによる疎な集計VIEW。

これらを比較した上での本プロジェクトの設計判断。公式資料が歴史DBのこの設計全体を指定しているという意味ではない。
