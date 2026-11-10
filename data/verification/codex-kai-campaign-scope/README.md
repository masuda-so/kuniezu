# 甲州の戦役・局地戦の候補検証

main860e1882起点の候補。通常配信への反映ではない。

- 既存conflictsの13件は全項目一致、追加は親1・子2だけ。
- `battle-conflicts.cjs`：年表全日付・順序・領土処理、同じ再構築回数で全114場面の元データが不変。甲州の自動図除外・高遠リンク・天目山記述のみを確認。
- `export-conflicts.cjs --check`、`stamp-assets.cjs --check`、organizationが通過。
- DB新規1検査が最終3.16秒で通過。既存の親子と再取込2検査は別実行で通過。新設項目へ確認済み命題の日時を流用しない。Ruff通過。
- 専用Chrome、GPU無効、DPR1、940/335幅。`GAME_CONFLICT_FIXTURE=kai`と既定bunrokuを別々に実行し、どちらも例外0。
- 概説の再生UIなし、高遠/釜山鎮の図・日付・出典、親へ戻る、地図へ戻る、関ヶ原の既存導線を確認。
- `browser/campaign-result.json`と`bunroku-regression/campaign-result.json`に差替ファイルのSHAを保持。画像も各ディレクトリへ保持し、Gitには入れない。
- 原日付と史料の範囲はdocs/reports/KAI_CAMPAIGN_SCOPE.md。レビュー担当は資料とコードの読み取りで、ブラウザの独立再実行はしていない。

画面で観測した背景のnorthMarkの前面表示は、別UI課題として残す。新しい精密布陣や全合戦の確認を完了したとは扱わない。

必須`offline.cjs`も終了コード0で通過。候補のHTMLとJSのSHAが甲州・文禄両ブラウザ記録の差替バイトと一致することを再確認した。検査が生成したhistory-focus監査は証拠へ保存し、元の監査差分はこの変更へ混ぜない。

Pythonの全体Ruffとmypy（45ソースファイル）も通過した。通常配信への取り込みやCI上の成功とは別のローカル確認である。
