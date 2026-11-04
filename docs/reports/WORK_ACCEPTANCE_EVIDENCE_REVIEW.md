# M03・U02の受入証拠対応（2026-11-03）

全8条件について現行コードと既存の検査・実画面を対応させた。新しい検査やブラウザ実行はしておらず、complete操作もしていない。rootの条件別審査に渡す資料である。SHAと根拠は [機械可読の対応表](../../data/verification/work-entry-refresh/evidence-matrix.json)。

**M03には現行コードの矛盾がある。** `4fd8072d` の `ui.js:532–545` が行軍別配置の後に再統合と横ずらしを行う。旧合格記録からM03を完了へ進めず、親担当へ具体的修正箇所を連絡した。

## M03 密集軍勢・個別凸・ホバー詳細

| 条件 | 現行実装と既存確認の範囲 | 根拠 | 受入時の注意 |
|---|---|---|---|
| 1. 同じ行軍だけ遠景で代表隊を表示 | convoyLayout単体と既存回帰検査は同じ行軍だけを代表化する。しかし現行ui.js:534–538は同command/26px以内だけで別目的・別経路も再統合するため、画面側の完了条件を満たさない。 | [INFRASTRUCTURE_AND_CONTINUITY_REVIEW.md](../../docs/reports/INFRASTRUCTURE_AND_CONTINUITY_REVIEW.md) / [map-far.png](../../data/verification/counter-refine/screens/map-far.png) | 4fd8072d導入の後処理を修正してから対象限定で受入。atlas-regressionsのconvoyLayout単体合格だけで完了にしない。 |
| 2. 拡大時に街道上の前後で個別表示 | convoyLayoutは近景を道沿いの前後に分け、回帰検査が両端の個別化を確認する。一方、画面後処理は倍率を問わず同陣営の近接隊を再統合するため、実画面の個別性を保証できない。 | [MARCH_CLOCK_REVIEW.md](../../docs/reports/MARCH_CLOCK_REVIEW.md) / [map-near.png](../../data/verification/counter-refine/screens/map-near.png) / [map-mid.png](../../data/verification/counter-refine/screens/map-mid.png) | 近景でも別経路隊が再統合される条件を除き、同道の前後分離と別道の独立表示を限定確認する。旧画像の合格を現行の画面後処理へ流用しない。 |
| 3. 別の位置へ行軍しているような横ずらしをしない | 既存usability.jsonは異陣営3隊の同地点座標不変を記録している。しかし現行ui.js:539–540は異陣営の近接駒を最大22px押し離すため、現在の条件とは矛盾する。 | [INFRASTRUCTURE_AND_CONTINUITY_REVIEW.md](../../docs/reports/INFRASTRUCTURE_AND_CONTINUITY_REVIEW.md) / [usability.json](../../data/verification/usability/usability.json) / [overlap-selection.png](../../data/verification/usability/overlap-selection.png) | 4fd8072dの横ずらし/引出線を修正対象としてrootへ連絡済み。ゲームコードは本候補では変更せず、過去の証拠だけでcompleteにしない。 |
| 4. 画面外の軍・兵数・家紋・カーソル詳細を実画面確認 | 画面外軍は方向ボタンから実位置へ移動。兵数・家紋・カーソル詳細は実画面保存があり、明智の紋/陣営と狭幅表示の検査を記録。 | [VISUAL_REPAIR.md](../../docs/reports/VISUAL_REPAIR.md) / [INFRASTRUCTURE_AND_CONTINUITY_REVIEW.md](../../docs/reports/INFRASTRUCTURE_AND_CONTINUITY_REVIEW.md) / [MARCH_CLOCK_REVIEW.md](../../docs/reports/MARCH_CLOCK_REVIEW.md) / [armies-outside.png](../../data/verification/visual-repair/armies-outside.png) / [army-hover.png](../../data/verification/infrastructure/army-hover.png) / [counter-mobile.png](../../data/verification/march-clock-final/counter-mobile.png) / [mitsuhide-counter.png](../../data/verification/march-clock-final/mitsuhide-counter.png) | 複数の時点の証拠を組み合わせる。直近の駒意匠はcounter-refine、合戦端切れはbattle-displayに別証拠。現行全幅を新たに一括通過したと書かない。 |

## U02 小画面・メニュー・シナリオ選択・文言

| 条件 | 現行実装と既存確認の範囲 | 根拠 | 受入時の注意 |
|---|---|---|---|
| 1. 西暦と和暦・速度・家メニューを狭幅で整理 | 和暦・西暦を上部で併記し、820px以下は家と速度操作を日付枠へ配置。旧320/390/820検査と390当主肖像/メニューの実画面を保存。 | [VISUAL_REPAIR.md](../../docs/reports/VISUAL_REPAIR.md) / [ATLAS_REPAIR.md](../../docs/reports/ATLAS_REPAIR.md) / [hud-320.png](../../data/verification/atlas-repair/hud-320.png) / [menu.png](../../data/verification/atlas-repair/menu.png) / [lord-menu-mobile.png](../../data/verification/infrastructure/lord-menu-mobile.png) | 最新HUDの顔読込修正はb977dc0/portrait-loading。古い画面にある外交斜線・旧駒意匠を現行仕様と扱わない。 |
| 2. 東北を含む全勢力を直接選択可能にする | 現行renderPickは全alive勢力を母集団にし、上位15家制限なし。既存実画面ログは7シナリオ×390/1400の東北全勢力を実クリックして選択IDを確認し、例外0。 | [USABILITY_AND_GEOGRAPHY_REVIEW.md](../../docs/reports/USABILITY_AND_GEOGRAPHY_REVIEW.md) / [usability.json](../../data/verification/usability/usability.json) / [northeast-390.png](../../data/verification/usability/northeast-390.png) / [northeast-1400.png](../../data/verification/usability/northeast-1400.png) / [pick.png](../../data/verification/portrait-loading/pick.png) | ログは東北の14ケース。全地域の全勢力を実クリックした証拠ではない。全件条件には現行allリストと成立前候補の表示経路のコード照合、必要なら地域を限定した追加操作をrootが判断する。 |
| 3. 制作側の未照合文言と不要UIをプレイ画面から整理 | 制作向け未照合文を一般説明から分離し、不要な常設参加者索引・百分率等を整理。会津征伐は実際の出兵と西上へ転換した説明へ訂正。 | [INFRASTRUCTURE_AND_CONTINUITY_REVIEW.md](../../docs/reports/INFRASTRUCTURE_AND_CONTINUITY_REVIEW.md) / [USABILITY_AND_GEOGRAPHY_REVIEW.md](../../docs/reports/USABILITY_AND_GEOGRAPHY_REVIEW.md) / [sekigahara-390.png](../../data/verification/usability/sekigahara-390.png) / [compact-3.png](../../data/verification/usability/compact-3.png) / [historical-observer-choices.png](../../data/verification/borders-family/historical-observer-choices.png) | 出典欄の書誌不足表示と一般説明の開発メモを区別する。確認したUI領域の検査であり、全文章を新たに読了したとはしない。 |
| 4. タイトル・ズームバー・保存復元を実画面確認 | タイトルをプロジェクト名へ統一。実クリックの拡縮・スライダー・全域復帰、保存/37日後自動保存と復元の既存検証記録あり。日内保存移行はgeometryVersion=22の後続検査を参照。 | [HISTORY_FOCUS_REVIEW.md](../../docs/reports/HISTORY_FOCUS_REVIEW.md) / [ATLAS_REPAIR.md](../../docs/reports/ATLAS_REPAIR.md) / [USABILITY_AND_GEOGRAPHY_REVIEW.md](../../docs/reports/USABILITY_AND_GEOGRAPHY_REVIEW.md) / [ALIASED_ARRIVAL_AND_SAVE_REVIEW.md](../../docs/reports/ALIASED_ARRIVAL_AND_SAVE_REVIEW.md) / [title-wide.png](../../data/verification/atlas-repair/title-wide.png) / [save-320.png](../../data/verification/atlas-repair/save-320.png) / [zoom-390.png](../../data/verification/usability/zoom-390.png) / [usability.json](../../data/verification/usability/usability.json) | 保存の資料は複数の時点に分かれる。旧79合戦の記録を111合戦の新規検査と数えない。今回の作業は証拠整理のみでユーザー保存を触っていない。 |

## 旧証拠を混同しない

- `army-zoom.cjs` は旧 `battle-layout.cluster` の検査。現行の行軍キー・経路上分離は `atlas-regressions.cjs` が検査するが、後段の画面再配置まで検査していない。
- `usability.json` の14ケースは東北を対象とした全勢力の実選択。コード上の全勢力一覧と、全地域をクリックした記録は別。
- 旧報告の79合戦・82街道・445拠点・436人物などは当時の記録として残す。現行母数はrequests/catalogを参照する。
- 原因と受入条件を示す既存検査は利用するが、現行HEADで実行した記録に書き換えない。追加確認はrootが必要な差分だけを選ぶ。


## 2026-11-04 の修正接続

元の証拠表は調査時点を保持する。後続の `dbbffeb` でM03の再発箇所を除去し、実配置12ケース・旧実装3負例・別行軍の位置保持と全隊hoverを実画面確認した。黒田長政の原典3所在も接続し、史料台帳は80命題・17所在観測、人物7・地点15・資料41となった。詳しくは[行軍・所在の受入記録](CONVOY_AND_LOCATION_ACCEPTANCE.md)。元のM03矛盾を現在も残るコード不具合として再調査しない。全街道の歴史的経路や全人物の所在を完了扱いにはしない。

M03の4つの受入条件は今回のモデル・実画面証拠に対応付け、`tools/work/tasks.cjs`で[完了記録](../work/state/request-a678755b344c.json)を生成した。ほかの大項目や全体ゴールを完了に変更していない。
