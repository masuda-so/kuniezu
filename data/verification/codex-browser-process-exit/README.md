# 検証プロセスの失敗時終了

`GAME_TEST_OUTPUT=data/verification/codex-browser-process-exit node tools/checks/browser-process-exit.cjs`
で存在しない実行ファイルと早期終了の2条件を検査した。
実Chromeは起動しない。結果は`browser-process-exit.json`へ保存。
両条件とも終了コード1、一時profile残存0、未処理errorなし。
構文と差分検査も通過した。

記録されたmsは機械実行時間で、作業者の調査・修正時間とは別。
