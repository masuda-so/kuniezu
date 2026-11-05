# ブラウザ検査の差し替えを Django の配信に合わせた後の確認（Claude、2026-11-05）

段 1b-1（#34）と 1b-2（#36）の後、ページは Django が描き、ゲームのファイルは `/static/kuniezu/…` で配られる。差し替え（専用の一時 Chrome の中だけで、作業ツリーのファイルを配る機能）が古い前提のままだった 6 本を直した。

| 検査 | 直した点 |
|---|---|
| `battle-viewport-browser.cjs`・`load-performance.cjs` | 差し替えの鍵を `f.slice(5)`（旧 `game/` の長さ）から URL のパス（`static/kuniezu/…`）に。ページはテンプレートを描いて返す。前者は CSS・画像の種類（Content-Type）も足した |
| `arrival-aliases-browser.cjs`・`bizen-north-shore-browser.cjs` | 差し替える JS の URL を `/static/kuniezu/…` に、確認値（`?v=…`）つきでも合うように |
| `startup-browser.cjs`・`render-performance.cjs` | URL のパターンを確認値つきでも合うように。前者は画面に出る失敗ファイル名の照合も確認値つきを許す |

## 実行結果（Django の開発サーバー、8001 番。`GAME_URL=http://localhost:8001/index.html`）

- `startup-browser.cjs`：PASS（直す前は、再試行を 1 度も起こせず `0 !== 2` で失敗）。
- `arrival-aliases-browser.cjs`（`GAME_MOVEMENT_OVERRIDE_ROOT=.`）：PASS。結果の記録に、ページと JS 5 本の計 6 件が差し替えられたと残る。
- `battle-viewport-browser.cjs`（`GAME_OVERRIDE_ROOT=.`、`GAME_OVERRIDE_BASE=5483a5f`）：PASS。差し替えは `index.html`（描いたページ）と `static/kuniezu/index.css` の 2 件。差し替えなしでも PASS。CSS の種類を足す前は、差し替えた `index.css` が適用されず失敗した。
- `load-performance.cjs`（同じ差し替え）：完走し、報告の `overrides` に同じ 2 件が載る。JS の例外なし。
- `organization.cjs`・`offline.cjs`：PASS。

サーバーは `claude/north-up-default`（#37）の作業ツリーから起動したもの。差し替えるファイルはこの枝（main と同じ内容）から読んだ。

## 未確認・残り

- `bizen-north-shore-browser.cjs` は失敗のまま。ページから `bizen-north-shore.js` を外す差し替えは効いた（`applied` が期待どおり）が、「外すと対岸が海になる」という照合が `tenjin` を返して落ちる。押した所の判定がラスターの地図（`TKRaster`）になった後は、このモジュールの有無で陸海が変わらないためと見ている。検査の前提の見直しが要る（この PR の範囲外）。
- `render-performance.cjs`（`GAME_PERF_BASELINE` が要る）は実行していない。パターンに `*` を足しただけ。
