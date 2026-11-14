# 史実 DB の管理サイト（閲覧専用）

2026-11-14。利用者の依頼「管理サイト（admin）を用意して」による。

## 変更

- `kuniezu/history/admin.py`：対象（人物・城など）、現象、記録、出典、代表、取り込みの回、記録の版を Django の管理サイトに出す。対象の頁には別名・識別子・典拠・位置と、関わる現象（生没・所在・支配・関係・出来事）を日付順に、原暦と ISO 8601 の両方で並べる。現象の一覧は種類・様態・精度・状態・暦で絞れる。
- 閲覧専用：史実 DB は Git の入力から `import_history` で作り直すので、管理サイトで直すと次の取り込みで消え、入力とも食い違う。追加・変更・削除の権限を全て外した。
- 開発の設定（`config.settings.local`）だけが管理サイトと、それに要る認証・セッションを入れる。公開の書き出し（`scripts/build_static.py`、`config.settings.test`）と公開のサイトには入らない。`config/urls.py` は管理サイトが入っているときだけ `/admin/` をつなぐ。

## 使い方

```
uv run python manage.py migrate            # 認証の表を足す（初回だけ）
uv run python manage.py import_history     # DB を入力から作り直す
uv run python manage.py createsuperuser    # 利用者を作る（パスワードは本人が入れる）
uv run python manage.py runserver 127.0.0.1:8000
```

`http://127.0.0.1:8000/admin/` を開く。

## 検査

- `tests/test_history_admin.py`：開発の設定の子プロセスで一時の DB を作り、ログイン前は転送、ログイン後は全ての一覧と対象・現象の頁が 200、対象の頁に没日の原暦（旧暦 1582年6月2日）と ISO 8601（1582-07-01）が出ること、追加・変更・削除が 403 で DB が変わらないことを確かめる。試験の設定では `/admin/` が 404。
- `uv run pytest`、`uv run ruff check`、`uv run mypy kuniezu config scripts tests`（main に元からある指摘は別）。
