# 過去年代の選択の検証

`tools/checks/history-origin-browser.cjs`で実際のシナリオ選択・時の帯・過去年代の
ダイアログを操作した。専用Chromeの一時プロファイルを使い、1400pxと390pxを
順番に実行した。証拠画像とJSONはローカルに保持し、Gitにはこの説明だけを登録する。

- `before.json`：旧処理の控えラベル1560年5月1日と実状態6月5日の不一致、
  未成立の家を選ぶと現在状態が維持されないことを確認。
- `final-1400/browser.json`、`final-390/browser.json`：未成立の羽柴家を選んでも
  現在状態の参照・JSONが一致し、準備中の出来事カードが出ず、早送り状態も戻る。
  織田家では選択日へ移行でき、最初の控えのラベルと実日付がともに6月5日。
  JavaScriptエラー0件。
- 各`unavailable-house.png`、`valid-past.png`：失敗時の説明と正常な移行後の画面。

実行は許可済み127.0.0.1:8000を使用し、`GAME_OVERRIDE_ROOT`でengine.js・ui.js・
テンプレートを差し替えた候補版。通常配信への反映確認を兼ねるものではない。
モデル検査は`node tools/checks/history-origin.cjs`、基本回帰は
`node tools/checks/offline.cjs`で通過。検査で更新された監査JSONは、検査前に
保全した64ファイルのSHAを確認し、元のバイト列へ戻した。
