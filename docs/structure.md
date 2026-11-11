# リポジトリの構成（再編の途中）

`masuda-so/website` と同じ Django の構成へ揃える途中（`docs/architecture/replatform-plan.md`）。今は段 1 まで：Django・uv の骨組みを足し（1a）、ゲームの原本を `game/` から Django アプリの静的ファイル `kuniezu/static/kuniezu/` へ移し（1b-1）、`index.html` を Django のテンプレートにし（1b-2）、地図の正本を配信物から分けて `kuniezu/map/` へ移した（1b-3）。ゲームの JS と相対 URL は変えていない。

| 場所 | 役割 |
| --- | --- |
| `manage.py` | Django の管理コマンドの入口 |
| `config/` | 設定（`settings/base.py`・`local.py`・`test.py`）、URL、WSGI |
| `kuniezu/` | Django のアプリ。ゲームのページを返す `views.py`、テンプレート `templates/`、静的ファイル `static/kuniezu/` |
| `kuniezu/templates/index.html` | ゲームのページ。`game-scripts` がスクリプトの読込順 |
| `kuniezu/static/kuniezu/` | ゲームの原本（素の JavaScript・CSS・素材）と、地図の配信物 `map/build/`（生成物。Git に入れない） |
| `kuniezu/history/` | 史実の関係データベース（Django のアプリ）。表・取り込み・検索。設計は `docs/architecture/history-rdb.md` |
| `kuniezu/map/` | 地図の正本（行政区分 `admin/`・支配 `control/`・自然 `physical/`・`projection.json`・年代別の差分の入力 `edits/`）。配信しない |
| `scripts/` | 静的書き出し `build_static.py` |
| `tests/` | Django 側の試験（pytest） |
| `tools/` | 検査と生成の道具（Node と Python）。段 4 で、JS を実行しない道具を Python に移す |
| `data/`・`docs/`・`archive/` | 従来どおり |
| `dist/client/` | 静的書き出しの出力。Git に入れない |

## 今の仕組み

- `/` と `/index.html` は `kuniezu.views.game_index` がテンプレート `kuniezu/templates/index.html` を描いて返す。`<head>` の先頭に `<base href="{% static 'kuniezu/' %}">`（描くと `/static/kuniezu/`）がある。ゲームが使う相対 URL（スクリプト、画像、`fetch("map/build/…")`）は全て `/static/kuniezu/` の下に解決されるので、ゲームの JS は変えていない。
- テンプレートの記法は 4 つだけ：`{% load static %}`、`<base>` の `{% static %}`、`<body>` の中身を囲む `{% verbatim %}` と `{% endverbatim %}`。ゲームの HTML とインラインの起動スクリプトは書いたとおりに出る。Node の道具は `tools/build/game-page.cjs` で同じ 4 つを埋めて同じ HTML を得るので、ほかの記法を足すときはこの道具と `tests/test_game_page.py` も直す。
- インライン CSS は `kuniezu/static/kuniezu/index.css` に出した（元の 2 つの `<style>` を元の順のまま 1 つに）。CSS の `{#` や `%}` がテンプレートの記法と衝突しないようにするため。`<head>` の `<link>` から読み、確認値（`?v=`）は `tools/build/stamp-assets.cjs` が付ける。
- テンプレートは djLint の対象から外してある（整形すると、道具が正規表現で読むタグの並びが変わるため）。
- ゲームはアプリの静的ファイルなので、開発サーバーは `kuniezu/static/kuniezu/` を `/static/kuniezu/` として配る（`STATICFILES_DIRS` の指定は要らない）。ページは Django が描くので、`kuniezu/static/kuniezu/` だけを静的ファイルとして配信しても開けない。静的に配るなら `dist/client/` を使う。
- 地図の正本は静的ファイルの外（`kuniezu/map/`）にあり、ブラウザへは配らない。`node tools/map/build-map.cjs` が `kuniezu/static/kuniezu/map/build/` に配信物を作り、実行時に読む区画の表（`definition.csv`・`default.map`）もそこへ写す。
- `scripts/build_static.py` は、ページを Django で描画して `dist/client/index.html` に書き、ゲームの静的ファイルを `dist/client/static/kuniezu/` に写す。地図の縮小版（`map/build/previews`）は写さない。

## 依存と検査

編集済みベクターは `kuniezu/map/physical`・`admin`・`control` のGeoJSONが正本。`node tools/map/build-map.cjs --vectors-only` が検査後に `map/build/vector/` へバイト複写し、`--vectors-only --check` は一致を検査する。通常ビルドも同じ処理を含む。元の座標・属性・書式を変更せず、正本へ書き戻さない。画像と独立して更新できる。

依存の契約は Python 3.14、`pyproject.toml`、`uv.lock`。

```sh
uv sync --locked
uv run pytest
uv run ruff check
uv run ruff format --check
uv run mypy kuniezu config scripts tests
uv run python manage.py check --settings=config.settings.test
uv run python manage.py migrate && uv run python manage.py import_history   # 史実データベースを作る
uv run python scripts/build_static.py
```

CI の `Django CI` は website と同じく試験（`uv run pytest`）だけを実行する。Ruff・mypy・djLint・pre-commit は手元の検査。`kuniezu/static/`・`data/`・`tools/`・`docs/`・`archive/` は Ruff と pre-commit の対象から外してある（各自の決まりに従う。段 4 で Python の道具を対象に入れる）。

ゲームの検査（`node tools/checks/offline.cjs` ほか、CI の `Node.js CI`）は従来どおり。ゲームの JS を実行するので Node が要る。

開発サーバー：`uv run python manage.py runserver 127.0.0.1:8000`。エージェントが起動・停止してよいのはこのアドレスだけ。8001番の許可は2026-11-09に撤回されており、8001番や他ポートは起動・利用しない。

編集済み地理面は `kuniezu/map/physical/land.geojson`・`water.geojson`・`coastline.geojson`。岸線は陸の派生なので一緒に更新し、`tests/test_vector_era_sources.py` で年代ごとの境界一致と保護を検査する。初回採用のコード・原本・SHA・精度上限は `data/inputs/vector-map-migration/` へ保持し、通常の配信ビルドで正本を再生成しない。
