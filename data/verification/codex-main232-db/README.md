# main232 命題のローカルDB反映

2026-11-09、main `6205d339`（PR129・130を含む）、通常配信ツリー `history-cube-query`。サーバーの起動停止はこの確認では行わない。

旧224命題のSQLiteをbackup APIで2つ保全し、一方を隔離DBとして `history.0005_representation` のmigrationと `import_history` を先に実行した。その後で通常配信DBを同じ手順で更新した。各段階の終了状態と件数を検査し、失敗時に次の段階へ進まない。

- 隔離・通常DBとも claim 232、新規版20、retired 0。
- `integrity_check=ok`、`foreign_key_check` 0件。
- 瓜生野城の「是冬」は `jd_exact=0`・`bounds_asserted=0`。日付の範囲を創作しない。
- 釜山落城の宗義智、晋州落城の宇喜多・加藤清正・毛利秀元、平壌撤退の李如松は、この日付付き事象のParticipationに存在しないことをSQLで確認した。
- 岩手沢への移りは `event/movement`・`residence-transfer`。以前の国替えとは区別する。
- Representationは45行、期間付きの入力は0。新しい型があることと、時期別の対応を史料照合して登録したことを区別する。座標の借用は0。

退避は `/tmp/kuniezu-live-before-main232-apply.sqlite3`、隔離は `/tmp/kuniezu-main232-isolated-20261109.sqlite3`、取込結果は `/tmp/kuniezu-main232-isolated-import.json` と `/tmp/kuniezu-live-main232-import.json`。DBとJSONの実体はGitへ含めない。

CLIの初回試行は、Pythonのシンボリックリンクを解決して仮想環境を外したためDjango読込前に停止した。仮想環境内のパスを維持して同じ隔離DBで再実行した。失敗した試行を成功に数えない。

HTTP配信のテンプレートに旧stampのキャッシュが残る問題は別に確認済みで、関連表示PR反映後に再起動と100stamp一致確認を行う。このDB確認をHTTP画面反映済みの証拠とはしない。
