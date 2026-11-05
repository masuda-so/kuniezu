# 近代化と和風化の計画（草案、2026-11-02）

ユーザーの指示：表示の重さの全体調査、言語・フレームワーク・ツールの切替を含む抜本改造の許可、全体の和風化。方針の確定前の草案で、採用は本人の判断による。

## 規格について

モダンなウェブアプリの構成そのものを定める ISO 規格はない。関係する公式規格は次の通りで、いずれも「品質」「言語」「アクセシビリティ」の規格であり、フレームワークの選定を定めるものではない。

- ISO/IEC 22275:2018：ECMAScript（JavaScript の言語仕様）。ECMA-262 と ECMA-402 を参照する。
- ISO/IEC 25010：ソフトウェア製品の品質モデル（性能効率、保守性、使用性など）。
- ISO/IEC 40500:2012：WCAG 2.0（ウェブアクセシビリティ）。
- HTML・CSS・WebGL・WebGPU は WHATWG / W3C / Khronos の仕様で、ISO ではない。

したがって「モダンな構成」は規格ではなく、開発者の慣行（年次調査の採用率）で判断する。

## 慣行として広く使われている構成（2025〜2026）

State of JavaScript 2025（Devographics、回答1万〜2.5万）と各社の比較記事から。

- 言語：TypeScript。回答者の約4割が JavaScript を書かず TypeScript のみ。
- ビルド：Vite（利用率84%、満足度98%）。webpack は利用率86%だが満足度26%で、新規採用は Vite が標準。Rolldown（Rust 製）が Vite の次期基盤。
- UI：React が利用率84%で最大だが不満も多い。Svelte / Solid / Vue が代替で、ゲームの HUD のように DOM が少ない用途ではどれでも成立する。
- 2D 描画：PixiJS v8（WebGL 既定、WebGPU 対応）が「描画ライブラリ」、Phaser 4（WebGL2 の書き直し、WebGPU 未対応）が「ゲームフレームワーク」。地図の自由描画と大量の文字札には PixiJS が合う。
- 地図：MapLibre GL JS（ベクトルタイル、地形）か deck.gl（大量データ層）。現代地形の標高タイル（Terrarium / GSI DEM）を GPU で陰影化できる。
- 検査：Vitest（単体）、Playwright（ブラウザ）。CI は GitHub Actions。
- 整形：Biome または ESLint + Prettier。パッケージは pnpm。

## 現状の計測（2026-11-02、起動済み 8000 番、専用Chrome 1400×1000）

- 起動 3.1 秒。JS 約 18MB の読込・解析に 2.7 秒（道路比較 3.1MB、朝鮮海岸 2.8MB、地理 1.6MB、湖岸 1.1MB）。
- メモリ 95〜119MB。
- 再生中：上層キャンバスを毎秒30回全描画。4秒で script 0.5 秒、文字描画（fillText / strokeText / measureText）と年表の DOM 再構築が上位。
- 地図移動：下層を移動ごとに再構築、CPU は軽い。
- 地形：陰影計算がメインスレッド。木ノ芽峠で目標段階の表示まで 4.5 秒。

主因は、起動時のデータ解析、再生中の毎フレーム文字描画と DOM 再構築、地形タイルの陰影計算。言語やフレームワークそのものは主因ではない。

## 提案する構成

| 層 | 現行 | 提案 |
|---|---|---|
| 言語 | 素の JS（ビルド不要） | TypeScript（strict）、Vite、pnpm |
| 地図描画 | Canvas 2D 2層 | PixiJS v8（WebGL2 / WebGPU）。地形・領土・街道・河川を GPU の層、札と駒はテクスチャ化 |
| 地形 | タイルを CPU で陰影化 | Web Worker で復号・陰影化し、GPU へ転送。将来は MapLibre の地形層へ |
| データ | 80 の JS モジュールにデータを埋め込み | JSON / バイナリ（Protocol Buffers か独自の Int16 配列）を fetch で遅延読込。朝鮮・比較道路は表示時のみ |
| UI | innerHTML の再構築 | Svelte（または Solid）で差分更新。年表・札・家選び画面 |
| 合戦図 | Canvas 2D | PixiJS の別シーン。演出（粉・煙・雨）は粒子レイヤ |
| 保存 | localStorage | 同じ形式を維持し、既存の保存版の移行を保つ |
| 検査 | node vm で素の JS を読む cjs | Vitest（エンジン・データ）、Playwright（画面）。既存 checks は段階移行 |

史実データ（448拠点・378人物・85街道・111合戦・出典台帳）とエンジン（engine.js、hist.js、campaign-evidence.js 等）は内容を変えずに TypeScript へ移し、表示層だけを作り直す。

## 段階

1. 基盤：pnpm + Vite + TypeScript の雛形、既存の kuniezu/static/kuniezu/ を `legacy/` として並走させる。検査を Vitest に写す。
2. データ層：巨大 JS を JSON / バイナリへ分離し、遅延読込。起動時間の短縮をここで得る。
3. 地図層：PixiJS で地形・領土・街道・河川・城・駒を描く。地形陰影は Worker。
4. UI 層：和風化した HUD（年表・家欄・操作・家選び）を Svelte で。
5. 合戦図：PixiJS シーンへ演出ごと移植。
6. 切替：検査と実画面の比較で legacy と同等以上を確認してから index.html を切り替える。

各段階で保存互換と史実データの不変を検査で確認する。ビルド不要の原則は変わるため、AGENTS.md と README の記述を改める（リポジトリ担当と調整）。

## 和風化

- 配色：和紙（生成り）、墨、藍、朱、金茶、金箔。伝統色に統一。
- 書体：見出しは筆書き系（Yuji Syuku）、本文は楷書系（Kaisei Tokumin）か明朝（Shippori Mincho B1）。
- 札：和紙または黒漆に金箔の縁。ボタンは朱印。
- 年表：絵巻の横巻（巻軸付き）。合戦図の題は縦書きの題簽。
- 家紋を要所の印に使い、紋のない家は家名の一字。
- 試作画像：`data/verification/wafu-mockups/wafu-mock.png`（案1 和紙と墨、案2 漆と金箔）。

## 出典

- InfoQ「State of JS survey 2025」 https://www.infoq.com/news/2026/03/state-of-js-survey-2025
- DevClass「JavaScript survey reveals ... TypeScript has won」 https://www.devclass.com/development/2026/02/10/javascript-survey-reveals-gripes-against-date-handling-webpack-and-nextjs-and-that-typescript-has-won/4090262
- heise「JavaScript: webpack is unpopular – but most used」 https://heise.de/-11171168
- ISO/IEC 22275:2018 https://webstore.iec.ch/publication/63127
- Cinevva「Best Web Game Engines for 2026」 https://app.cinevva.com/guides/web-game-engines-comparison （商用の比較記事。エンジンの WebGPU 対応状況は公式文書で再確認する）
