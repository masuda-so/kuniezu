# 主要人物12名の外部典拠登録

2026年11月7日。`600d9432` を基点に、既存72人物を保持して未登録12人物のWikidata IDを追加した。公的資料11件と固定改訂の原JSON12本を保存し、[人物別の照合・留保](../../data/research/source-notes/person-authority-next-twelve.md)と[改訂・SHA・取得日時](../../data/research/source-notes/person-authority-next-twelve.json)を結んだ。生没日・所在・領有の命題やゲーム本体は変更していない。

|登録人物|安定ID|Wikidata|
|---|---|---|
|伊達政宗|person:date-masamune|Q311183|
|最上義光|person:mogami-yoshiaki|Q839377|
|真田昌幸|person:sanada-masayuki|Q1144171|
|真田信繁|person:sanada-nobushige|Q3948081|
|北条氏康|person:hojo-ujiyasu|Q943643|
|北条氏政|person:hojo-ujimasa|Q736948|
|本多忠勝|person:honda-tadakatsu|Q467417|
|井伊直政|person:ii-naomasa|Q1334437|
|酒井忠次|person:sakai-tadatsugu|Q1132756|
|榊原康政|person:sakakibara-yasumasa|Q1062738|
|福島正則|person:fukushima-masanori|Q1194995|
|加藤嘉明|person:kato-yoshiaki|Q1371657|

姓名に加え、各人2項目の年または父を原JSONと自治体・博物館の本文で照合した。氏政の生年1538/1539、信繁の1567年ごろという留保、政宗・義光の原JSONでの没日併存を保存した。これらを確定日付へ採用せず、氏政・信繁は父と没年の組合せで同定した。兄の真田信幸（信之）は別人のまま保った。

原JSONは計428,178バイトを未改変で保存し、CC0の典拠データとして扱う。current版の重複・PDF・画像・HTML全文・取得コードは追加しない。既存の原JSON検査が改訂・SHA・QID・人間型の照合に対応しているため、検査コードの変更は不要だった。

## 検証

|検査|結果|
|---|---|
|`node tools/research/export-evidence.cjs`|84人物・477出典へ更新。109命題・22所在は内容不変|
|`node tools/checks/evidence-store.cjs`|採用典拠と原JSONのSHA/改訂/QID、誤SHA・誤改訂・誤IDの拒否を含めPASS|
|`node tools/checks/history-index.cjs`|年・人物・場所の共通参照と別名・不明対象・期間境界PASS|
|`python3 tools/checks/history-sqlite.py`|131記録・494件のJS/SQL検索一致PASS|
|`pytest tests/test_history_import.py -q`|13件PASS|
|12名の一時メモリDB取り込み|名前検索は各1件、Wikidata接続は各1件、11出典を参照。既存72人の原ファイルSHA保持。全12人の登録に生没日・所在の新規属性なし|
|保持確認|既存claims/locations/places/implemented-events/implemented-sitesのJSONLは基点とバイト一致。信幸と信繁の別人性を確認|
|`git diff --check`|PASS|

この変更は典拠台帳の追加であり、画面や行軍の変更ではないため、ブラウザ・日次進行・サーバー操作は実施していない。典拠の一致を史実全件の検証完了と扱わない。

DB同一性・識別子機能のmain取り込み（#54、1ab99d10）を署名付きで追随し、`tests/test_history_import.py` と `tests/test_history_queries.py` の45件が合格した。典拠検査・年月/対象索引も再確認した。人物authorityと死去命題は担当を分離し、Claude側は人物ファイルを作らないことを合意済み。
