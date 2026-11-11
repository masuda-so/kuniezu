# Cloudflare Workers で配信する準備

2026-11-11、利用者の決定：未完成の段階でも website と同じ Cloudflare Workers で配信する。当面は `workers.dev` の URL、誰でも見られ、検索にも載せる。

## 変更

- `wrangler.jsonc`：Worker 名 `kuniezu`、静的ファイルは `dist/client/`。ビルドは地図の生成（`build-map.cjs --no-previews`）、`uv sync --locked --no-dev`、`scripts/build_static.py`。プレビュー用の URL は無効。
- `scripts/build_static.py`：
  - `_headers` を書く。CSP は自サイトと Google Fonts だけを許可する。ページにある埋め込みスクリプト 1 本と埋め込みの `onload` 1 つは、内容のハッシュで許可する（中身が変われば動かない）。ゲームが `style` 属性で組み立てる画面、blob から起動する標高の Worker、data と blob の画像を許可する。ほかに HSTS、nosniff、フレーム禁止、Referrer-Policy。
  - `robots.txt` を書く（全体を許可）。
  - Workers の静的ファイルは 1 本 25 MiB まで。超える GeoJSON（現在は `land.geojson` 29.1 MiB と `coastline.geojson` 28.1 MiB）を gzip にして `.gz` で置き、元のファイルは書き出しから外す。gzip 後は 7.4〜7.5 MiB。
- `vector-assets.js`：manifest の `bytes` が上限を超える行は `.gz` を先に読み、無ければ元のファイルを読む（開発サーバー用）。先頭 2 バイトが gzip なら `DecompressionStream` で展開し、展開後のバイト列を従来どおり長さと SHA-256 で検査する。
- `pyproject.toml`：uv が管理する Python を使う（Cloudflare のビルド環境の Python に sqlite3 が無い問題。website で 2026-11-11 に発生）。

## 採らなかった方法

- **空白を詰めて軽くする**：20.6〜21.0 MiB になり上限には収まるが、バイト列が変わるので `vector-assets.js` の検査（`Vector bytes differ`）で起動しない。配信時に正本を書き換えない、という決まりにも反する。
- **タイルに分割する**（国土地理院や Google マップの方式）：必要な範囲だけを配れるので本来の解だが、描画側の読み込みを作り替える必要がある。`replatform-plan.md` の段 3（MapLibre とベクトルタイル）で行う。今回の gzip は、それまでの橋渡しである。

## 検証

- `pytest tests/test_build_static.py tests/test_game_page.py`（10 件）、`ruff`、`mypy`、`stamp-assets.cjs --check`、`vector-assets.cjs`、`road-vector-loading.cjs`、`offline.cjs`、`organization.cjs`、`secret-scan.cjs` が通過。`build-map.cjs --vectors-only --check` で、配信用 GeoJSON が編集正本とバイト一致。
- 書き出し（927 ファイル）を `wrangler dev`（127.0.0.1:8000）で配り、ヘッダーが付いた状態で確認：タイトル、配置図の選択、プレイ画面、関ヶ原の合戦図が表示される。`land.geojson.gz` と `coastline.geojson.gz` は 200 で、`Content-Encoding` は付かず `application/gzip` で届く。CSP 違反は出ない。Web フォントも読み込まれる。
- 既知：`map/build/relief.json`（地形の陰影）が 404。陰影の生成は専用 Chrome を使う別の手順で、この作業ツリーにも主の作業ディレクトリにも生成物が無い。陰影なしで起動する。

## 残り

- 公開配信は素材の再配布に当たる。各素材（国土数値情報、CODH、Copernicus、肖像）の条件が公開配信を許すかの項目ごとの確認は、この PR では行っていない。
- 独自ドメイン、陰影の生成物の配り方、Cloudflare 上の自動ビルド（陰影の生成に Chrome が要るため、当面は手元からの `wrangler deploy`）。
