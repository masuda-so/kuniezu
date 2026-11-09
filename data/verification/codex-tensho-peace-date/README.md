# 和睦日と旧保存の検証（2026-11-09）

`tensho-peace-date.cjs`で、旧日付の実進行から11月13日・14日・23日の保存を生成し、既知署名・成功履歴に限定した修復と11月24日の再成立を確認した。未知署名、履歴欠如、失敗、戦争状態欠如、別盟約は変更しない。資源・軍・城・人物・時刻を維持し、再読込は冪等。没日旧版との署名の組合せも検査した。

既存の`verified-death-dates.cjs`・`chronology-migration.cjs`・`evidence-store.cjs`・asset stampsも通過。

起動済み127.0.0.1:8000を専用の一時Chromeで検証。11月14日・23日の旧保存を通常の`import-go`経路で再開し、幅940px・335pxの4画面で早すぎる同盟と旧和睦記録がなく、元の日付と修復マーカーを保つことを確認した。例外0。23日の両幅の画像を目視確認した。普段の保存・ブラウザは操作せず、専用プロファイルを削除した。

再現：

```sh
TENSHO_SAVE_OUTPUT=/tmp/kuniezu-tensho-saves node tools/checks/tensho-peace-date.cjs
TENSHO_SAVE_INPUT=/tmp/kuniezu-tensho-saves GAME_TEST_OUTPUT=data/verification/codex-tensho-peace-date node tools/checks/tensho-peace-browser.cjs
```

`result.json`と画面PNGは本ディレクトリに無追跡で保存。外交値15は既存戦争ルールの上限適用で、失われた旧数値の厳密復元ではない。11月24日以降の旧記録と過去の通行許可の二次的な動きは修正しない。
