# 斎藤義龍の没日と既知旧保存

旧暦1561年5月11日（共通暦1561-06-23）を採用し、旧実装の6月20日から訂正する。
`node tools/checks/verified-death-dates.cjs`で3人の既存修正と旧版実進行からの復元を確認。
前便2人の修正済み印が1の保存についても、6/20・21・22の3日を確認。
未知署名、採用日以後、時刻・城・部隊・資源の保持、家督・冪等性、成功件数維持を検査する。
`node tools/checks/tensho-peace-date.cjs`も通過し、旧没日/旧和平の組合せと既存ガードを確認した。

## 専用Chromeでの候補確認

2026-11-10 03:56:27〜03:56:53 UTC、26.226秒、終了0、JSエラー0。
通常配信main4287f125に変更したJS2本と確認値のテンプレートだけを差し替えた。
940/335px、GPU無効、DPR1。旧版3日・現在版・没日以後・未知署名の6保存×2幅=12条件。
実際のファイル取込操作を通し、死去状態・当主・日付・成功件数・城・軍・資源を確認。
旧版3日は義龍生存/当主、6/23以後と未知署名では旧死亡状態と龍興を保持。
3画面（6/20狭幅・6/22広幅・6/23狭幅）も目視した。

`saves/`のfixtureは`VERIFIED_DEATH_SAVE_OUTPUT=<ここ>/saves node tools/checks/verified-death-dates.cjs`で出力する。
`browser/result.json`・`measurement.json`・画像へ結果を保存。
ブラウザ器は既存密集表示検査のCDP/差替え機構を使う一時器で、
`.cache/verification-drivers/yoshitatsu-death-date.cjs`に保全した。
器のSHA256: c5021fe66941c5b9e847d1693eba0ccd4e3499c7f4ea79a2fed7711cea77391f
Gitへはこの要約のみ登録する。候補検証でありmain反映後の通常配信確認は別に行う。
