# タイトル画面の副題と出典の余白を直す（2026-11-09）

利用者の指摘（タイトル画面で気づくことはないか）を受けて、実画面の確認で見つけた 2 点を直す。原因は Codex の専用 Chrome（1400px・375px）での再確認と一致する。

- **副題が見えない**：「その年、誰が、どの城にいたのか。／街道と城、武将の動きをたどる。」の文字色が `rgb(63,50,33)` で、背景 `rgba(29,23,18,.95)` との明暗の差が 1.43:1 だった（WCAG の本文の基準 4.5:1）。`theme-washi.css` の前段の和紙の明るい地向けの規則 `#title .tbox p,#title .tbox .tlead{color:#3f3221}` が、後段の墨染めの地の節で上書きされずに残っていた。後段の節に `#title .tbox p,#title .tbox .tlead{color:#efe3c4!important}` を足した。直したあとは 13.90:1。
- **出典の行が左端に付く**：タイトル画面の `#credit` は右の余白だけが決まっていて、長い文が折り返して左端（x=0）まで広がっていた。`index.css` の `#credit` に、右と同じ左の余白（`max(10px, env(safe-area-inset-left))`）を足した。勢力の選択（`left:320px`）とゲームの画面（`left:12px`）の上書きはそのまま。

- **題字が狭い幅で切れる**：375px で「天下分け目の国絵図」の「図」が箱の右で切れていた。`theme-washi.css` の `#title .tbox h1{font-size:clamp(34px,6.2vw,60px)}` の下限を下げ、`clamp(24px,7.2vw,60px)` にした（1400px は上限 60px のまま）。

- **遊び方と出典の行が重なる**：375px で「遊び方」を開くと、出典の行（`#credit`、`#title` と同じ z-index で後に描かれる）が説明の上に重なっていた。Codex の提案に沿い、`index.css` でタイトル画面（`#app[data-mode=title]`）のときだけ `#app` を `grid-template-rows:minmax(0,1fr) auto` にし、`#title` を上の行、`#credit` を下の行（高さ 28vh まで、内側で巻物、暗い地）に分けた。シナリオ一覧の箱（`theme-washi.css` の `max-height:calc(100dvh - 32px)`）もタイトル画面では上の行の高さまでにした。地図の canvas は absolute のままで、勢力の選択とゲームの画面には当たらない。

`kuniezu/templates/index.html` は CSS の版の記録（stamp）だけを更新した。

## 検証

- `node tools/build/stamp-assets.cjs --check`：通過。
- 8000 番の配信（main）に同じ規則を当てて、計算済みのスタイルを測った：副題 `rgb(239,227,196)`・明暗の差 13.90:1、出典の行の左右の余白 10px・10px。
- Codex の専用 headless Chrome の道具で、通常の配信にこの差分だけを差し替えて 1400px・375px を写した（`data/verification/claude-title-contrast/README.md`）。副題・出典の余白・題字の収まりを写しで確かめた。
- 1400px・375px のタイトル・遊び方・シナリオ一覧・勢力の選択を写し、題字の箱と出典の行が重ならないこと、ゲームの画面（375px）の年表が従来どおり出ることを確かめた。例外 0。
- `offline`・`organization`・`infrastructure`・`secret-scan` の検査：通過。
