# 対象の同一性と識別子での検索の確認（Claude、2026-11-05）

報告書：`docs/reports/HISTORY_RDB.md` の追記。設計：`docs/architecture/history-rdb.md` の「対象の同一性」。入力の形：`data/research/curated/identities/README.md`。

## 検査

- `uv run pytest`：38 件 PASS（同一性 7 件、名前の重なりと識別子での検索 1 件を追加）。
  - `same-site`：諏訪原城の台帳の場所とゲームの拠点が 1 つの対象になる。どちらの識別子でも引ける。台帳の出典付きの座標が残る。名前だけで指していた命題も同じ対象に結ばれる。2 回目の取り込みで変化なし。
  - `represented-by`：江戸の台帳の場所が、ゲームの拠点の位置を借りる（根拠 `represented-by-game-site`）。対象は別のまま。徳川家康の軌跡に江戸の滞在が出る。出典付きの座標を持つ場所は、借りない。
  - 拒否：根拠なし、登録の無い出典、決めていない関係、識別子が 1 つ、どの入力にも無い識別子。失敗した取り込みは何も残さない。
- `ruff check`・`ruff format --check`・`mypy`・`makemigrations --check` 問題なし。`organization`・`secret-scan`、史料の検査（`evidence-store`・`location-store`・`history-index`）が PASS。
- リポジトリの入力（同一性の記録なし）での取り込み結果は、これまでと同じ（対象 1,390、事象 909）。

## 未確認

- 実際の同一性の記録。試験は、試験の中だけで作った記録で確かめた。リポジトリの入力には 1 件も足していない。
