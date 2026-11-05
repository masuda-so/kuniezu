# 清洲会議後の預かり・旧保存の実画面確認

起動済み `http://localhost:8000/index.html` に専用一時Chromeで接続。
候補5JSとindexだけをそのブラウザ内で差し替え、共有配信・通常保存・サーバーは操作していない。

旧実装96450b4で生成したs1582の7月16・17・18日保存を通常の読込操作に通した。
旧16・17日は人物欠落を補完、旧18日は管理loc安土を保持して岐阜の預かりとして表示。
日付は各保存と一致し、軍事候補や城主へ混入しない。390×844でも預かりの所属・相手を確認。
同じ旧保存を史実進行で176日、1583年1月14日の記録境界まで進めた。
所在未確認となった後は人物の点・新旧経路・在城表示・軍事候補がなく、JS例外0。
大きな通知を抑止する既存ffwdフラグを一括進行中だけ使い、最後に解除して表示を更新した。

実Canvas・DOMの画像/result.json、局所回帰、独立担当9ケースの結果はローカル証拠。
Gitに含めるのはこの要約だけ。元保存3件は `data/inputs/kiyosu-custody/legacy-saves.json.gz`。
原保存JSONのSHAを検査し、通常CIでも再現できる。実画面検査は
`GAME_OVERRIDE_ROOT=<候補tree> GAME_OVERRIDE_BASE=origin/main GAME_TEST_OUTPUT=<証拠先> node tools/checks/kiyosu-custody-browser.cjs`。

Django 移行後の main f80286c を取り込んだ版も、専用Chromeで同じ9表示と
176日の進行を再検証した。8000番に接続できなかったため、テンプレートを
`tools/build/game-page.cjs` で一時HTMLに描画し、ローカルファイルとして開いた。
この確認は表示と旧保存を対象とし、Django の HTTP 配信経路は別途確認する。
