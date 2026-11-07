# 合戦駒の局所表示検証

2026-11-08。ROOTの127.0.0.1:8000を専用Chromeで検証。関ヶ原・長篠各940px／335px、4ケース成功。部隊の地理座標・再生時刻・個別候補を保持して局所表示と全体復帰を確認。狭幅ヘッダの横はみ出しなし、JavaScript例外0件。画像・JSONはローカル証拠として保存しコミット対象外。

`GAME_TEST_OUTPUT=data/verification/codex-battle-counter-focus BATTLE_TEST_TITLES='関ヶ原の戦い|長篠の戦い' node tools/checks/battle-counter-density-browser.cjs`
