# 古い史実 DB の道具を片付ける

利用者の決定（2026-11-14、案 A′）。史実を引く所が 2 系統あったのを、Django の史実 DB（`kuniezu/history/`、`manage.py import_history`・`history_query`）ひとつにまとめる。

## 消したもの

- 手作りの一時的な SQLite の DB と時空間キューブ：`tools/research/history_sqlite.py`、`tools/research/sql/history.sql`、検査 `tools/checks/history-sqlite.py`・`history-sqlite-inputs.py`・`history-cube.py`
- JSON を直接読む検索の道具：`tools/research/query.cjs`・`query-history.cjs`・`history-index.cjs`、検査 `tools/checks/history-index.cjs`（`location-store.cjs` の検査の中の利用も外した）
- 古い系統の説明 `docs/architecture/history-database.md`

## 残したもの

- 旧暦の日・閏月で所在を引く `tools/research/query-locations.cjs`（Django 側に同じ指定が無いため）と、その部品 `location-store.cjs`
- 台帳の方針の文書 `docs/architecture/spatiotemporal-history.md`（古い道具の例を `history_query` に替えた）
- 過去の報告書・検証の記録（当時の手順の記録として）

## 変わらないもの

正本の JSON（`data/research/`）と、Django の史実 DB の中身。ゲームと公開の書き出しは古い道具を使っていなかった。

## 失ったもの

時空間キューブの集計（経緯度 0.25 度 × 1 年の升目ごとの件数）。どこからも使われていなかった。要るときは Django の史実 DB で作り直す。年の範囲での検索（`--from-year`・`--to-year`）も無くなり、`history_query --year` で 1 年ずつ引く。

## 残る印

所在の記録 8 件と `location-observations.jsonl` の `gameBindings` に、古い道具の名前の札（`history-index:person:…`）が残る。検査は札が空でないことだけを見るので壊れない。担当の調査の入力なので、ここでは書き換えない。

## 検査

`location-store.cjs`・`organization.cjs`・`infrastructure.cjs`：PASS。`uv run pytest tests/test_history_queries.py`：PASS。
