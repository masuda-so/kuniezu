# 史実の関係データベースの確認（Claude、2026-11-05）

報告書：`docs/reports/HISTORY_RDB.md`。設計：`docs/architecture/history-rdb.md`。

## 取り込みの結果（空のデータベースに `migrate` と `import_history` を実行）

- 記録 2,858：人物 59、場所 42、命題 103、所在 22、年表 665、拠点 461、作業台帳 1,506。出典 432。
- 対象 1,390：人物 384、集団 63、施設・地点 514、経路 401、領域 2、水域 26。名前 1,414、典拠 ID 72、代表点 489（ゲームの位置 461、台帳の点 6、同名から借りた点 22）。
- 事象 906：出来事 711、状態 195。確認済み 127、実装の棚卸し 779。日まで決まる 702、年 149、期間 53、年代なし 2。
- 内容：移動・所在 320、生没・存廃 219、戦闘 129、支配・帰属 90、関係 36、名称 20、役職 15、造営・土木 7、文書 6、その他 64（年表の説明のうち、合戦に結ばれなかったもの）。
- 取り込みは約 3 秒。データベースのファイルは約 6 MB。2 回目の取り込みは、新しい履歴 0 件、消えた記録 0 件。

## 検査

- `uv run pytest`：25 件 PASS（暦 5、取り込み 7、検索 6、既存 7）。
- `uv run ruff check`・`uv run ruff format --check`・`uv run mypy kuniezu config scripts tests`・`uv run python manage.py check`・`makemigrations --check --dry-run` 問題なし。
- `node tools/checks/offline.cjs`・`organization.cjs`・`secret-scan.cjs`、史料の検査（`evidence-store`・`location-store`・`history-index`・`history-sqlite.py`・`history-sqlite-inputs.py`・`history-cube.py`）が PASS。

## 検索の例

- `history_query --about 織田信長 --year 1582`：本能寺の変の命題（信長・信忠）が、旧暦の日付・ユリウス通日・西暦の日付つきで出る。
- `history_query --bundle 織田信長`：明智光秀（2 件）、今川義元、織田信忠、清洲城。

## 未確認

- 実データでの軌跡と「到達できない移動」の検出。台帳の場所に点が無く、徳川家康ほかの軌跡は空になる（試験は作ったデータで確かめた）。
- 設計の参考文献の原典。
