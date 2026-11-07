# 共通寸法計算変更後の設楽原（2026-11-08）

長久手向けに見つけた説明欄の寸法問題を共通の合戦描画器で直したため、設楽原の既存検査を専用Chromeで再実行した。940px／335pxの戦役入口・11隊・地形と河川・再表示キャッシュ・幅変更後の地理座標・同日の自動表示・別日と北条家の拒否に合格。元の長篠素材は不変、JavaScript例外0件。

実行：`GAME_OVERRIDE_ROOT=<この作業ツリー> GAME_TEST_OUTPUT=data/verification/codex-nagakute-shitaragahara-regression node tools/checks/local-battle-scene-browser.cjs`。画像・結果JSONはローカルに保持し、要約だけを追跡する。
