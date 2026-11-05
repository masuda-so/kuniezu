# `game/` を `kuniezu/static/kuniezu/` へ移した後の確認（段 1b-1、Claude、2026-11-05）

移動は `git mv`（357 ファイル）。道具・検査・文書でパスを置き換えた。ゲームの JS の処理と相対 URL は変えていない。移動したファイルのうち内容が変わったのは、説明文のパス（JS 5 本と文書 2 本）、確認値（`index.html`）、差分の入力 10 件のマスクの相対パス（置き場が 2 段深くなったぶん `../` を 2 つ足した。参照先は全て存在）。

## 検査（worktree の中で地図を正本から生成し直した）

- Django 側：`uv run pytest` 7 件 PASS（アプリの静的ファイルとして `kuniezu/engine.js` が見つかる試験を追加）、`uv run ruff check`・`uv run ruff format --check`・`uv run mypy kuniezu config scripts tests` 問題なし。
- CI と同じ検査：`offline.cjs`・`organization.cjs`（94 のスクリプトの依存順、作業記録）・`infrastructure.cjs`・`secret-scan.cjs`・`stamp-assets --check`、史料（`sekigahara-motion`・`battle-event-classification`・`evidence-store`・`location-store`・`history-index`・`history-sqlite.py`・`history-sqlite-inputs.py`・`history-cube.py`）、合戦地形（`atlas-regressions`・`battle-viewport`・`battle-rivers`）、地図（`raster-map`・`province-edits`・`province-runs`・`hachirogata-water`・`katori-water`）が PASS。
- `node tools/map/build-map.cjs --no-previews` が完走（1 分 40 秒）。本線で生成済みの `game/map/build` と比べ、タイル・境界線・年代別の版は全て同一。違うのは `manifest.json`・`rivers-lines.json`（記録している正本のパスの文字列）と `edges.json`（`manifest.json` のハッシュ `gridSha256`）の 3 つだけ。`data/audits/raster-province-pixels.json` に差分なし。
- `uv run python scripts/build_static.py` が完走し、`dist/client/` に地図の正本（`map/control/provinces.png` など）は入らない。

## 取り込み後に要ること

- 本線の checkout では、追跡外の `game/map/build/` が古い場所に残る。`node tools/map/build-map.cjs` で `kuniezu/static/kuniezu/map/build/` に作り直す（陰影は `--height --python …`。`manifest.json` のハッシュが変わるので陰影も作り直しになる）。
- 作業中の枝（`codex/*`）は main への付け替えが要る。

## 実画面（この worktree から利用者が起動した Django の開発サーバー、8001 番、コミット `eaa60ba`）

- `/` と `/index.html` は同じ内容（61,372 バイト、SHA-256 一致）で、`<base href="/static/kuniezu/">` が入る。どちらも題名画面が出て、`document.baseURI` は `http://localhost:8001/static/kuniezu/`。
- 題名画面の「続きから」で、移動前に保存した局（慶長五年六月十六日、徳川家）を読み込めた。同じオリジンなので保存は引き継がれる。
- 読み込みから近江・若狭への拡大までの 229 件の要求は、Google Fonts の 1 件を除いて全て `/static/kuniezu/` 配下（スクリプト 94 本、`map/build/` のタイル・境界線・年代別の版、`map/control/definition.csv`・`default.map`、家紋、肖像）。旧 `/game/engine.js` は 404。
- 404 は `map/build/relief.json` の 1 件だけ。この worktree の地図を陰影なし（`--height` を付けない）で生成したためで、陰影のない地図として表示される。移動による欠落ではない。
- 地形画像の URL：`new URL('terrain/overview/6-55-25.png', document.baseURI)` は `/static/kuniezu/terrain/overview/6-55-25.png` になり、Worker の中から取得して 256×256 の画像として読めた（200）。

## 未確認

- ゲーム自身の地形 Worker（`TKTerrain.draw`）は、確認した操作の範囲では呼ばれなかった（読み込み 0 件）。上の確認は、同じ URL の組み立てを別の Worker で試したもの。
- 陰影つきの地図（`--height` での生成）の表示。
- ブラウザを使う検査（`march-clock-browser.cjs` ほか）。

## 気づいた点（この変更の範囲外）

- `offline.cjs` を実行すると `data/audits/history-focus-audit.json` に差分が出る（安芸城の記述ほか）。パスの移動とは無関係で、main の時点で既にコミット済みの JSON が古い。この PR では戻した。
