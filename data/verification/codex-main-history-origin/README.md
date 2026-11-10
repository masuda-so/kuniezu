# 過去年代選択の通常配信確認

PR144をmain `9bc858ebfd6794bd0fe83a2c9742190d89390e55`へ取り込んだ後、
配信元`history-cube-query`を同じSHAへ更新してDjangoを再起動した。
127.0.0.1:8000だけを使用し、専用Chromeで1400px・390pxを順番に確認した。

実行は`GAME_URL=http://127.0.0.1:8000/index.html`と
`GAME_TEST_WIDTH=1400`または`390`を指定して
`node tools/checks/history-origin-browser.cjs`。`GAME_OVERRIDE_ROOT`は未設定。
結果JSONでも`overrides=[]`を確認した。

両幅で、羽柴家が存在しない年代を選んでも現在状態の参照・JSONが一致し、
余分な出来事カードが表示されず、早送り状態が解除された。
織田家では選んだ過去の日付へ正常に移行でき、最初の控えラベルと実状態の
開始日はともに1560年6月5日。JavaScriptエラーは0件。
両幅の失敗時画面も目視し、説明と操作ボタンが枠内で読めることを確認した。

画像・結果JSONは配信元作業ツリーの
`data/verification/codex-main-history-origin/{1400,390}/`へ保存した。
候補版の応答差し替え検査とは別の、main反映後の証拠。
1534年の開始シナリオの実装や、全残要望の完了を表すものではない。
