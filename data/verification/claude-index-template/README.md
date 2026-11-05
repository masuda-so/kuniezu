# `index.html` をテンプレートにした後の確認（段 1b-2、Claude、2026-11-05）

`kuniezu/static/kuniezu/index.html` を Django のテンプレート `kuniezu/templates/index.html` に移し、2 つのインライン `<style>` を `kuniezu/static/kuniezu/index.css` に出した。ゲームの JS、HTML の本文、スクリプトの読込順は変えていない。

## 見た目の一致（サーバーなし、専用の一時 Chrome）

main（`5483a5f`）のページと新しいページを同じ条件で開き、画面上の全要素の計算済みスタイル（疑似要素を含む、プロパティ名でそろえた全プロパティ）と位置・大きさを比べた。

- 場面は 4 つ（題名、筋書きの選択、1560 年の導入、地図）× 画面幅 2 つ（1400×950、390×844）。要素は場面ごとに 184〜804 個。
- スタイルの差 0、位置・大きさの差 0、JS の例外 0。地図の場面の画面の画像は 2 つの幅ともバイト単位で一致。
- スタイルシートの規則数は、main が 34・469・114（インライン 2 つと `theme-washi.css`）、新しいページが 503・114（`index.css` と `theme-washi.css`）。

新しいページは `tools/build/game-page.cjs` がテンプレートを描いたもの（`<base>` を静的ファイルのフォルダに向けた一時ファイル）。同じ道具が `/static/kuniezu/` 向けに描いた HTML は、Django が描いた `dist/client/index.html` と完全に一致する。

## 検査

- Django 側：`uv run pytest` 7 件 PASS、`uv run ruff check`・`uv run ruff format --check`・`uv run mypy kuniezu config scripts tests`・`uv run python manage.py check --settings=config.settings.test` 問題なし。`uv run python scripts/build_static.py` が完走し、`dist/client/static/kuniezu/index.css` が入る。
- CI と同じ検査：`offline.cjs`・`organization.cjs`・`infrastructure.cjs`・`secret-scan.cjs`・`stamp-assets --check`、史料（`sekigahara-motion`・`battle-event-classification`・`evidence-store`・`location-store`・`history-index`・`history-sqlite.py`・`history-sqlite-inputs.py`・`history-cube.py`）、合戦地形（`atlas-regressions`・`battle-viewport`・`battle-rivers`）、地図（`raster-map`・`province-edits`・`province-runs`・`hachirogata-water`・`katori-water`）が PASS。
- ページを読むほかの検査：`history-focus.cjs`・`aizu-legacy-calendar.cjs` が PASS。
- サーバーなしで開くブラウザ検査：`katori-water-browser.cjs`・`hachirogata-water-browser.cjs` が PASS（一時ファイルを開く形に変えた）。

## 実画面（この worktree から起動した Django の開発サーバー、8001 番）

- `/` と `/index.html` は同じ内容（12,293 文字）で、`<base href="/static/kuniezu/">` が入る。題名画面が出て、`document.baseURI` は `http://localhost:8001/static/kuniezu/`。
- `<style>` は 0 個。スタイルシートは `index.css`（503 規則）、Google Fonts、`theme-washi.css`（114 規則）の 3 つ。
- 「続きから」で、移動前に保存した局（慶長五年六月十六日、徳川家）を読み込めた。197 件の要求のうち 404 は `map/build/relief.json` だけ（地図を陰影なしで生成したため）。
- `GAME_URL=http://localhost:8001/index.html` で `march-clock-browser.cjs` が PASS（出陣、停止と再開、桶狭間、合戦の読み込み、狭い画面、JS の例外なし）。

## 未確認

- `bizen-north-shore-browser.cjs`・`arrival-aliases-browser.cjs` と、保存ファイルを引数に取る `person-location-itinerary.cjs`。どれもページの読み方だけを変えた。`arrival-aliases-browser.cjs` は、差し替えるページを作る処理が動くことだけを確かめた。
- ほかのブラウザ検査。

## 気づいた点（この変更の範囲外）

- `battle-viewport-browser.cjs` と `load-performance.cjs` の差し替え（`GAME_OVERRIDE_ROOT`）は、段 1b-1 の置き換えで壊れている。差し替えるファイルの名前を `f.slice(5)`（旧 `game/` の長さ）で作ったままで、`kuniezu/static/kuniezu/…` に合っていない。
- `arrival-aliases-browser.cjs` と `bizen-north-shore-browser.cjs` は、差し替える JS の URL をページと同じ階層（`/ui.js` など）と見なしている。Django の配信では `/static/kuniezu/ui.js` なので、差し替えが効かない。
- `startup-browser.cjs` は main でも失敗するはず：差し替えの URL パターン `*history-focus.js` が、確認値つきの URL（`history-focus.js?v=…`）に合わず、再試行を 1 度も起こせない（`0 !== 2`）。
- `offline.cjs` を実行すると `data/audits/history-focus-audit.json` に差分が出る（main の時点で既に古い）。この PR では戻した。
