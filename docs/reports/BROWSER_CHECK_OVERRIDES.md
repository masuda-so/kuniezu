# ブラウザ検査の差し替えを Django の配信に合わせる（2026-11-05、Claude）

## 何が起きていたか

再編の段 1b-1（`game/` を `kuniezu/static/kuniezu/` へ、#34）と段 1b-2（`index.html` をテンプレートへ、#36）の後、ページは Django が描き、ゲームのファイルは `/static/kuniezu/…` で配られる。ブラウザ検査の「差し替え」（専用の一時 Chrome の中だけで、作業ツリーのファイルを配る機能）は、ページと同じ階層にファイルがある前提のままだった。

- `battle-viewport-browser.cjs`・`load-performance.cjs`：差し替えるファイルの名前を `f.slice(5)` で作っていた。旧 `game/` の長さで、#34 の機械的な置き換えの後は URL に合わない名前になり、差し替えが 1 件も効かなかった。
- `arrival-aliases-browser.cjs`・`bizen-north-shore-browser.cjs`：差し替える JS の URL を `/ui.js` のように作っていた。Django の配信では `/static/kuniezu/ui.js?v=…` なので合わない。
- `startup-browser.cjs`・`render-performance.cjs`：URL のパターンが確認値（`?v=…`、読み込みの確認値を付けた時から）に合わず、`startup-browser.cjs` は再試行を 1 度も起こせずに失敗していた。

## 直したこと

- 差し替えの鍵を URL のパス（`static/kuniezu/…`）にし、ページは `tools/build/game-page.cjs` でテンプレートを描いて返す。
- 差し替える JS の URL を `/static/kuniezu/` に向け、確認値つきでも合うようにする。
- `battle-viewport-browser.cjs` の差し替えに CSS・画像の種類（Content-Type）を足す。インライン CSS を `index.css` に出した後は、差し替えた CSS が種類の不一致で適用されず、押す位置がずれて失敗した。
- `startup-browser.cjs` は、画面に出る失敗ファイル名の照合で確認値つきを許す。

ゲーム本体は変えていない。

## 確認

Django の開発サーバー（8001 番）へ専用の一時 Chrome でつないで実行した。結果の要約は `data/verification/claude-browser-check-overrides/README.md`。

- `startup-browser.cjs`、`arrival-aliases-browser.cjs`（ページと JS 5 本の差し替えが記録に残る）、`battle-viewport-browser.cjs`（差し替えあり・なし）が PASS。`load-performance.cjs` は差し替えありで完走。
- `organization.cjs`・`offline.cjs`・`secret-scan.cjs` が PASS。

## 残り

- `bizen-north-shore-browser.cjs` は失敗のまま。差し替え自体は効くようになったが、「モジュールを外すと対岸が海になる」という照合が `tenjin` を返して落ちる。押した所の判定がラスターの地図になった後は、このモジュールの有無で陸海が変わらないためと見ている。検査の前提の見直しが要る。
- `render-performance.cjs` は実行していない（基準の作業ツリーの指定が要る）。
