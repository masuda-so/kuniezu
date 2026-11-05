# リポジトリの構成（再編の途中）

`masuda-so/website` と同じ Django の構成へ揃える途中（`docs/architecture/replatform-plan.md`）。今は段 1b-1 まで：Django・uv の骨組みを足し（1a）、ゲームの原本を `game/` から Django アプリの静的ファイル `kuniezu/static/kuniezu/` へ移した（1b-1）。ファイルの中身と相対 URL は変えていない。

| 場所 | 役割 |
| --- | --- |
| `manage.py` | Django の管理コマンドの入口 |
| `config/` | 設定（`settings/base.py`・`local.py`・`test.py`）、URL、WSGI |
| `kuniezu/` | Django のアプリ。ゲームのページを返す `views.py` と、静的ファイル `static/kuniezu/` |
| `kuniezu/static/kuniezu/` | ゲームの原本（素の HTML/JavaScript）と地図の正本・配信物。段 1b-2 で `index.html` を `kuniezu/templates/` へ、段 1b-3 で地図の正本を `kuniezu/map/` へ移す |
| `scripts/` | 静的書き出し `build_static.py` |
| `tests/` | Django 側の試験（pytest） |
| `tools/` | 検査と生成の道具（Node と Python）。段 4 で、JS を実行しない道具を Python に移す |
| `data/`・`docs/`・`archive/` | 従来どおり |
| `dist/client/` | 静的書き出しの出力。Git に入れない |

## 今の仕組み

- `/` と `/index.html` は `kuniezu.views.game_index` が `kuniezu/static/kuniezu/index.html` を読み、`<head>` の直後に `<base href="/static/kuniezu/">` を入れて返す。ゲームが使う相対 URL（スクリプト、画像、`fetch("map/build/…")`）は全て `/static/kuniezu/` の下に解決されるので、ゲームの JS は変えていない。
- `index.html` は Django のテンプレートとしては描画しない。インライン CSS に `{#`・`{%` の並びがあり、テンプレートの記法と衝突するため。段 1b-2 で CSS を静的ファイルへ出し、本物のテンプレートにする。
- ゲームはアプリの静的ファイルなので、開発サーバーは `kuniezu/static/kuniezu/` を `/static/kuniezu/` として配る（`STATICFILES_DIRS` の指定は要らない）。`kuniezu/static/kuniezu/` を静的ファイルとして直接配信して `index.html` を開く方法も、そのまま使える。
- `scripts/build_static.py` は、ページを Django で描画して `dist/client/index.html` に書き、ブラウザが実行時に読むファイルだけを `dist/client/static/kuniezu/` に写す。地図の正本（`map/admin`・`map/physical`・`map/edits`・`map/control/provinces.png` など）と縮小版は写さない。

## 依存と検査

依存の契約は Python 3.14、`pyproject.toml`、`uv.lock`。

```sh
uv sync --locked
uv run pytest
uv run ruff check
uv run ruff format --check
uv run mypy kuniezu config scripts tests
uv run python manage.py check --settings=config.settings.test
uv run python scripts/build_static.py
```

CI の `Django CI` は website と同じく試験（`uv run pytest`）だけを実行する。Ruff・mypy・djLint・pre-commit は手元の検査。`kuniezu/static/`・`data/`・`tools/`・`docs/`・`archive/` は Ruff と pre-commit の対象から外してある（各自の決まりに従う。段 4 で Python の道具を対象に入れる）。

ゲームの検査（`node tools/checks/offline.cjs` ほか、CI の `Offline checks`）は従来どおり。ゲームの JS を実行するので Node が要る。

開発サーバーの起動・停止は利用者が行う：`uv run python manage.py runserver 8000`。
