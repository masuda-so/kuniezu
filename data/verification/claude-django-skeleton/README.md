# Django の骨組み（段 1a）の実画面の確認（Claude、2026-11-05）

worktree で `uv run python manage.py runserver 8001`（利用者が起動）。地図の配信物は本線の `game/map/build` を参照した。

- `http://localhost:8001/` で題名画面が出て、「続きから」で保存した局（慶長五年、徳川家）が開く。
- `document.baseURI` は `http://localhost:8001/static/kuniezu/`。ゲームの相対 URL は全てこの下に解決される。
- `TKRaster`・`TKEdges`・`TKRivers` が読み込み済み。当たり判定は京→`castle:kyo`、江戸→`castle:edo`、琵琶湖→`lake:136.06,35.27`（100m の段）。
- 読み込んだ 232 件のうち、400 番台以上の応答は 0 件。
- `django-runserver-game.jpg`：全域の画面（画像は Git に入れない）。

検査：`uv run pytest`（5 件）・`uv run ruff check`・`uv run ruff format --check`・`uv run mypy kuniezu config scripts tests`・`uv run python manage.py check`・`uv run python scripts/build_static.py`、および既存の `organization.cjs`・`secret-scan.cjs`・`stamp-assets --check`。pre-commit は一度 `uv run pre-commit run --all-files` を実行した（フック 5 件の取得元は GitHub）。その時点では新しいファイルが未追跡で Python のフックは対象なし、行末の空行を直すフックが既存のワークフロー 2 本を書き換えたので、その変更は戻した（この PR の範囲外）。追跡後のファイルに対する pre-commit は未実行。
