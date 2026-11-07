# 全体・地区表示の実画面確認

2026-11-07。`GAME_URL=http://127.0.0.1:8000/index.html GAME_TEST_OUTPUT=data/verification/codex-battle-district-view node tools/checks/battle-viewport-browser.cjs` を、応答差替えなしの専用Chromeで実行。7合戦・1400/390/335px、例外0。狭幅6ケースで地区select・一行表示・focus維持、各地区の座標と時刻不変を確認。単なる全員集約を行わず、個別クリックと選択を維持した。

`battle-viewport.cjs` は4合戦で地区切替と全員の選択、関ヶ原/高天神の60フレームで位置不変・退出・重なり選択・寝返りを確認する。独立レビューでは111合戦×2幅の生成と全ID保持も確認した。Canvas命令検査と実フォントのChrome確認は別の証拠として扱う。

別の限定実画面検査で、地区の選択色がテーマに隠れないことも確認。画像・JSONはローカル保持、Gitにはこの要約だけを入れる。史実配置の正しさや全111合戦の実フォント確認を証明した検査ではない。
