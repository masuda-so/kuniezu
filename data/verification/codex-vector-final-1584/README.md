# 編集済み正本の比較描画（1584年）

2026-11-07。最終の陸2203・水域584・岸線2969地物から比較ページを生成し、専用の一時Chromeで確認した。ゲーム本体への切替の証拠とは区別する。

- Canvasの塗りと海陸判定368点の一致、比較湖5件の穴を確認。
- 元マスクの宇喜多366セルをCanvasと判定の両方で年代に照合。
- 全国・関東・児島、拡縮・移動・狭幅、待機中の再描画停止を確認。JavaScript例外0。
- 使用中の共通描画コードSHAをリポジトリと照合し、日付間のclip再利用を確認。

実行: `VECTOR_PREVIEW_URL=file:///tmp/kuniezu-vector-final-1584/index.html GAME_TEST_OUTPUT=data/verification/codex-vector-final-1584 node tools/checks/vector-map-browser.cjs`。JSONと画像はローカル証拠として保持し、Gitへはこの要約だけを入れる。
