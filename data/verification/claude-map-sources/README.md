# 地図の正本を `kuniezu/map/` へ移した後の確認（段 1b-3、Claude、2026-11-05）

`kuniezu/static/kuniezu/map/` の正本（`admin/`・`control/`・`physical/`・`edits/`・`projection.json`）を `git mv` で `kuniezu/map/` へ移した。静的ファイルに残るのは生成物 `kuniezu/static/kuniezu/map/build/` だけ。実行時に読む `definition.csv`・`default.map` は、生成のときに `build/` へ写し、ゲームは `map/build/` から読む。

## 生成物の一致（worktree の中で地図を正本から作り直した）

- `node tools/map/build-map.cjs --no-previews` が完走（1 分 43 秒）。main で生成済みの `map/build` と比べ、タイル・境界線・年代別の版は全て同一。違うのは `manifest.json`・`rivers-lines.json`（記録している正本のパスの文字列）と `edges.json`（`manifest.json` のハッシュ `gridSha256`）の 3 つと、新しく写す `definition.csv`・`default.map` の 2 つ。
- `node tools/map/build-map.cjs --check` が PASS（写しが正本と同じことも照合する）。`data/audits/raster-province-pixels.json` に差分なし。
- 差分の入力 10 件のマスクの相対パスは `../` を 2 つ減らした。参照先は全て存在。

## 検査

- 地図：`raster-map`・`province-edits`・`province-runs`・`hachirogata-water`・`katori-water` が PASS。`province-source-image.cjs` は自己検査 23 件と、実物（`--source kuniezu/map/control/provinces.png --map-dir kuniezu/static/kuniezu/map/build`）の両方が PASS。
- `offline`・`organization`・`infrastructure`・`secret-scan`・`stamp-assets --check` が PASS。
- Django 側：`uv run pytest` 7 件、`ruff check`・`ruff format --check`・`mypy` 問題なし。`scripts/build_static.py` の出力 `dist/client/static/kuniezu/map/` には `build/` だけが入り、正本の画像は入らない。

## 実画面（この worktree から起動した Django の開発サーバー、8001 番）

- 保存した局を読み込み、地図が出る。`TKRaster.ready()` は true、石山の位置の判定は `castle:ishiyama`。
- 地図の要求は全て `/static/kuniezu/map/build/` 配下。`map/build/definition.csv`・`map/build/default.map` は 200。旧い URL `/static/kuniezu/map/control/definition.csv` と正本 `…/map/control/provinces.png` は 404（配信されない）。
- 404 は `map/build/relief.json` だけ（陰影なしで生成したため）。
- `march-clock-browser`・`usability-browser`・`map-browser`（8001 番）、`katori-water-browser`・`hachirogata-water-browser`（サーバーなし）が PASS。`hachirogata-water-browser` は 1 回目だけ読み込み待ちで失敗し、やり直しで通った（main でも通る）。

## 取り込み後に要ること

- 手元の `kuniezu/static/kuniezu/map/build/` は作り直す（`node tools/map/build-map.cjs`）。`manifest.json` の中身が変わるので、陰影（`--height`）も作り直しになる。
- 作業中の枝（`codex/*`）で地図の正本や差分の入力を変えているものは、新しい置き場への付け替えが要る。

## 未確認

- 陰影つきの生成と表示（NumPy・Pillow の入った Python が手元に無い）。
- ほかのブラウザ検査。
