# main273命題の隔離・通常DB確認

PR142をmain `ce109c5e4a2acbb1db0291b156a92cb6a4c22c74`へ反映後、通常配信元
`history-cube-query`を同じSHAへ更新した。SQLite backup APIで既存DBのバックアップと
隔離コピーを配信元の`.cache/history-backups/`へ作成し、隔離での確認後に通常DBへ取り込んだ。

- 確認済み命題273、人物典拠124、場所登録107。
- 既存263命題のキーを全て保持。原記録の新規版18、退役0。
- 隔離・通常で取込サマリー、登録数、追加命題、対象照会の結果が一致。
- 両方でSQLite整合性・外部キー検査は正常。
- `history_query --phenomenon claim:ieyasu-kai-departure-1582`は浜松（遠江）、
  旧暦1582年7月3日、日精度。都市としての出発地であり、城の座標を主張しない。
- `history_query --phenomenon claim:hinoe-garrison-1614`は有馬（肥前）、
  月の記述に基づく期間精度、絶対日の確定なし。日野江城へ読み替えない。

結果JSONと照会出力は配信元の`data/verification/codex-main273-db/`に保存した。
バックアップは`before-main273.sqlite3`、隔離DBは`main273-isolated.sqlite3`。
今回の暦表はmainの既存表で、PR145の拡張候補とは別。
登録数はこのSHAでの確認値であり、全人物・全施設や全期間の照合完了を示さない。
