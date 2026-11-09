# 第6便の242命題を通常DBへ反映

2026-11-09、main `0adc3e11`（PR132）。通常配信ツリー `history-cube-query` の232命題DBをSQLite backup APIで保全し、隔離コピーへ先に取り込んでから通常DBへ反映した。データ・報告だけの更新で、サーバーはこの反映では再起動していない。

- 隔離・通常DBとも claim242、新規版24、retired0、座標の借用0。整合性ok・外部キー違反0。
- 秀吉の京都出発の `Phenomenon.place_id` は `place:kyoto` のThingに一致。都市の入力geometryはnullで、城のノードとは結ばない。
- 神流川の当日のParticipationに北条氏直は存在しない。出陣・金窪・長島帰還の日付を同日化しない。
- 蔚山の月精度は `jd_exact=0`・`bounds_asserted=0`。日付や継続期間の境界を創作しない。
- 羽州道の `ushuEdoComparison` がSourceへ入り、CODHの題名・URL・DOIを取得できる。
- 実際のCLI `history_query --about place:kyoto --year 1577` で `claim:himeji-departure-1577` を1件取得。dateは元暦の `[1577,10,23]`、placeは京都、placePoint/placeBasisはnull。年月と場所の両軸を、精密座標の推定なしで引ける。

初回の隔離SQLでは場所の登録レコードキーを誤って指定し、通常DBへの反映前に停止した。正しい `registry:place:kyoto` で検査を完了してから通常DBを更新した。失敗した試行を成功に数えない。

退避 `/tmp/kuniezu-live-before-main242-apply.sqlite3`、隔離 `/tmp/kuniezu-main242-isolated-20261109.sqlite3`。取込結果は `/tmp/kuniezu-main242-isolated-import.json`・`/tmp/kuniezu-live-main242-import.json`、CLI結果は `/tmp/kuniezu-main242-kyoto-query.json`。実体はGitへ含めない。[232命題時のmigration確認](../codex-main232-db/README.md)と併せて参照する。
