# 円錐図法の実画面の確認（Claude、2026-11-04、worktree を 8001 番で配信）

- `whole-japan-lcc.jpg`：全域。北海道は時計回りに、九州は反時計回りに回って見える（円錐図法の経線の寄り）。
- `kanto-lcc.jpg`：関東。塗り・境界線・街道・城の位置が一致。
- `preview-rotate-20deg.jpg`・`preview-rotate-32deg.jpg`：枠の回転の見え方の下見（CSS で画面を回しただけ。実装ではない。向きの切り替えは次の PR）。
- 当たり判定：京→castle:kyo、江戸→castle:edo、琵琶湖→lake、那覇・奄美→castle:shuri、札幌・函館・根室→context:ainu、日本海→sea。城 139 のうち 137 が自分の区画。残り 2 は本線でも同じ（金ヶ崎は粗い段のみ、浦戸城の位置は本山の区画）。
- 保存の移行：旧平面に戻した保存を読み込み、城の位置が新平面に戻ることを確認。行軍の線と人物の点 331 点が全て日本の経緯度の範囲内。
- `castle-region-points.cjs` の問題一覧は本線と同一（6 件）。
- 画像は Git に入れない（.gitignore）。
