# 再編の段 1：Django の構成へ揃える（2026-11-05、Claude）

利用者の決定（2026-11-05）で、`masuda-so/website` と同じ Django の構成に揃える（`docs/architecture/replatform-plan.md`）。段 1 は「挙動を変えずに置き場と配り方を揃える」段で、5 つの PR に分けて main に入れた。今の構成は `docs/structure.md`。

## 何を変えたか

| 段 | PR | 変えたこと | 確認の要約 |
|---|---|---|---|
| 1a | #32・#33 | Django・uv の骨組み（設定・URL・ページ・静的書き出し・試験・CI）を足す。ページは `index.html` に `<base>` を入れて返す仮の橋渡し。`/index.html` の経路と、Worker が読む地形画像の URL を直す | `data/verification/claude-django-skeleton/README.md` |
| 1b-1 | #34 | `game/` を Django アプリの静的ファイル `kuniezu/static/kuniezu/` へ移す。道具・検査・文書のパスを置き換える | `data/verification/claude-move-game/README.md` |
| 1b-2 | #36 | `index.html` をテンプレート `kuniezu/templates/index.html` にし、インライン CSS を `index.css` に出す。Node の道具は `tools/build/game-page.cjs` でテンプレートを描く | `data/verification/claude-index-template/README.md` |
| 1b-3 | この PR | 地図の正本を `kuniezu/map/` へ移し、静的ファイルには生成物 `map/build/` だけを置く。実行時に読む区画の表は生成のときに `map/build/` へ写す | `data/verification/claude-map-sources/README.md` |

## 根拠

- 置き場：website は、ページをテンプレート（`templates/`）、ブラウザへ配るものを静的ファイル（`static/`）、それ以外をアプリのデータに分ける。地図の正本（CK3 方式の画像と表）は生成の入力で、ブラウザは読まない。利用者は正本の置き場を「アプリのデータに分ける」と決めた（2026-11-05）。
- 挙動を変えない：ゲームの JS は相対 URL のまま。ページの `<base>` が静的ファイルの置き場を指すので、スクリプト・画像・`fetch("map/build/…")` はそのまま解決される。変えた URL は、区画の表の 2 つ（`map/control/…` → `map/build/…`）だけ。
- テンプレートの記法を最小に：`<base>` の URL と、本文を囲む `verbatim` だけ。CSS を外へ出したのは、CSS の `{#` や `%}` がテンプレートの記法と衝突しないようにするため。

## 確認

- 生成物：各段で地図を正本から作り直し、タイル・境界線・年代別の版が前の段と一致することを確かめた。変わるのは、正本の置き場を記録する `manifest.json`・`rivers-lines.json` と、そのハッシュを持つ `edges.json` だけ。
- 見た目：1b-2 では、main のページと新しいページで、4 つの場面 × 2 つの画面幅の全要素の計算済みスタイルと位置を比べ、差は 0。
- 検査：各段で CI と同じ検査（基本・史料・合戦地形・地図）と Django 側の検査（pytest・ruff・mypy・静的書き出し）が通った。
- 実画面：Django の開発サーバー（8001 番）で、題名画面、保存した局の読み込み、地図、`/index.html` の経路を確かめ、`march-clock-browser.cjs` ほかを通した。

## 使い方が変わった点

- ページは Django が描く。`kuniezu/static/kuniezu/` だけを静的に配信しても開けない。Django の開発サーバーか、`scripts/build_static.py` の出力 `dist/client/` の配信で開く。
- 地図の正本は `kuniezu/map/`。取得後と、正本や差分を変えた後は `node tools/map/build-map.cjs` で `kuniezu/static/kuniezu/map/build/` を作る。

## 残り

- 陰影（`--height`）は、NumPy・Pillow の入った Python が手元に無く、段 1 の間は作り直していない。`manifest.json` の中身が変わったので、作り直しが要る。
- ブラウザ検査の一部は、段 1 の前から古い前提のままだった。差し替えの URL は別の PR（#38、`docs/reports/BROWSER_CHECK_OVERRIDES.md`）で直した。
- 作業中の枝（`codex/*`）は main への付け替えが要る。
- 次は段 2（朝鮮半島の削除）。消す前の状態にタグを付けてから始める。
