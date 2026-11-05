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

## 未確認

- 実画面（ブラウザ）。開発サーバーの起動は利用者が行うため、この worktree からの起動後に確認する。
- ブラウザを使う検査（`march-clock-browser.cjs` ほか）。

## 気づいた点（この変更の範囲外）

- `offline.cjs` を実行すると `data/audits/history-focus-audit.json` に差分が出る（安芸城の記述ほか）。パスの移動とは無関係で、main の時点で既にコミット済みの JSON が古い。この PR では戻した。
