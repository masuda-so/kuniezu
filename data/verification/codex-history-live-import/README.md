# ローカル史実DBの初回取り込み

2026-11-07。接続先が当worktreeのSQLiteで、既存ファイル0バイトであることを確認し、初期状態を/tmpへ保全。historyの2 migrationsを適用し、`manage.py import_history` を実行した。入力はmainのPR75まで取り込み済み。

- 取り込み入力: 84人物典拠、43地点、118命題、22所在、461実装拠点、665実装イベント、1506カタログ記録。
- 実DB: 1398対象・924事象・97外部典拠ID・初回ImportRun1件。
- Authorityの `wikidata/Q311183` が `person:date-masamune`（伊達政宗）へ対応することを実SQL経由で確認。
- 名前から織田信長の一意な対象を引き、`history_query --about 織田信長 --year 1582` で関連2事象を確認。

ゲーム由来の未照合データも含む件数で、全史実の確認済み件数ではない。未知の所在を埋めたり毎日の人物行を生成したりしていない。外部典拠はAuthority表で、CLIの `--about` は名前/対象キー用。`wikidata:Q311183` をCLIで引く機能の確認とは区別する。DBと検査JSONはローカルのみ、Gitへはこの要約を入れる。
