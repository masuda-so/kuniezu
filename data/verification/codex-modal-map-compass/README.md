# モーダル表示中の広域地図方位マーク

2026-11-10。候補版を専用Chromeで検査。通常配信への反映はまだ行っていない。

- 127.0.0.1:8000の起動済みサーバーに、候補CSSとテンプレートだけをブラウザ内で差し替え。
- 幅940/335px、高さ950px、DPR1、GPU無効、独立した一時プロファイル。
- 広域地図を16度回転し、文禄の役、釜山鎮、設定画面で方位マークの矩形が消えることを確認。
- 閉じた後は方位マークの表示・回転値・変換行列が元と一致。
- 関ヶ原の既存画面、戦役から個別合戦への遷移、日付・出典表示も通過。JavaScript例外0。
- `node tools/checks/organization.cjs`、`node --check tools/checks/battle-conflicts-browser.cjs`、`git diff --check`通過。
- `busan-940.png`を目視し、タイトル周辺に広域地図の方位マークが重ならないことを確認。

実行: `GAME_URL=http://127.0.0.1:8000/index.html GAME_OVERRIDE_ROOT="$PWD" GAME_OVERRIDE_BASE=origin/main GAME_TEST_OUTPUT=data/verification/codex-modal-map-compass node tools/checks/battle-conflicts-browser.cjs`

画像とcampaign-result.jsonはローカル証拠として保持。DPR2や全合戦の史実検証を証明する検査ではない。
