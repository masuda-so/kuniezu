# 合戦図に動きを足す

2026-11-10。利用者の「ゲームに躍動感が足りない」という指摘を受け、全合戦の平面の合戦図
（`battle-atlas.js`）に、視点の移動と進軍の矢印を足した。配置・経過・典拠のデータは変えていない。

## 変えたこと

1. **表示範囲の切替を滑らかにした。** 「全体」や地区を選ぶと、約 0.5 秒かけて寄り引きする。
   補間するのは描画だけで、内部の表示範囲（VS・VX・VY）は切替の時点で行き先の値になる。
   駒の位置の計算と既存の検査が読む値は変わらない。
2. **再生中、交戦している隊へ視点を寄せる。** 経過（beats）の交戦の組が収まる範囲へ
   約 1.1 秒で移り、交戦の組が無い経過では選んである表示範囲へ戻る。操作欄の「動きを追う」で
   切り替えられ、表示範囲を自分で選ぶと止まる。攻城の平面図と模式図では働かない。
3. **進軍の矢印を自動で出す。** これまで選んだ隊だけに出していた軌跡を、典拠のある段階移動
   （移動中と直後）と、交戦中の隊の推定の動きにも出し、先端に矢じりを付けた。推定は従来どおり
   点線で、図の注記「点線の軌跡＝推定の動き」と同じ区別を保つ。

端末が動きを減らす設定のときと、`matchMedia` の無い検査の土台では、1〜3 のどれも働かず、
従来どおりに描く。

## 史実の扱い

新しい位置・経路・時刻は足していない。視点が寄る先は既存の beats の交戦の組、矢印は既存の
`TK.BATTLE_MOVEMENTS`（典拠あり）と `TKBattleMotion` の推定（点線）をそのまま使う。

## 検査と証拠

`battle-viewport`・`battle-initial-views`・`battle-relief`・`battle-counter-density`・
`battle-label-cards`・`battle-mode-labels`・`atlas-regressions`・`battle-atlas-detail`・
`battle-rivers`・`sekigahara-motion`・`battle-conflicts`・`local-battle-scene`・`offline`・
`organization`・`infrastructure`・`secret-scan`・`stamp-assets --check` を通した。
実画面は [確認の要約](../../data/verification/claude-battle-motion/README.md)。全 111 合戦の
通し再生は回していない。
