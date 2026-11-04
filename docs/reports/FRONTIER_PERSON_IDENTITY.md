# ヌルハチ・ポヤルコフの本人典拠と検索

既存命題から参照されながら人物台帳に未登録だった2人を、同じ安定IDのまま登録した。main c2e0a07からの専用ブランチ `codex/frontier-person-db` で実装。人物44・場所41・命題82・所在22、共通履歴104記録となる。人物参照の登録漏れ0は、この82命題の範囲を示し、全歴史人物の網羅を示さない。

## 出典と時期

- ヌルハチ：Wikidata Q311189、NDL00625008。増井論文と故宮博物院の本人名・活動、原APIの人物IDを照合。既存の1588〜1615年の記録を維持し、1616年の後金建国や後年の皇帝称号を前倒ししない。
- ヴァシーリー・ポヤルコフ：Wikidata Q982229。ロシア大統領図書館のロシア語姓名・父称と1643〜1646年の遠征を照合。期間外の比較史料として登録し、`gameNames`は空配列。既存命題の原文・適用年代は保持する。

根拠・原API改訂・取得URL・取得日時は `data/research/source-notes/frontier-person-{authority-adoption,authority-candidates,ndl-identity,period-review}.json` に保持する。HTML本文の転載でなく構造化した同定記録。

NDLの優先標目「太祖,1559-1626,清」は一般称号を含むため、ゲーム用の別名には追加しない。原NDLの別名欄の読み「ヌルハチ」を、本人名との完全一致で照合する。ID・原応答のURI・primaryTopic・WikidataのP349と改訂・原欄へのポインターを検査し、一般称号や生年だけでの同定を許可しない。

## 検索と検査

所在検索が出典付きの人物別名も参照するよう修正。別名で登録済み人物に到達しても、所在観測がなければ所在不明のまま返す。別名は重複のない非空文字列配列として検証する。

実行した検査：

- evidence-store：全本人典拠の照合、NDL別人応答・一般称号すり替えの拒否。
- location-store：別名検索の登録済み/所在不明の区別、ポヤルコフの1560〜1615年検索0件、1643〜1646年検索1件。
- history-sqlite：SQL/JS263検索ケースの一致、外部キーと元の暦・精度保持。
- history-sqlite-inputs：不正入力7件の拒否、集計5ケースの場所・暦・期間保持。

同じ検査を既存CIへ追加した。READMEの日英双方へ別名・典拠と期間外比較史料の扱いを記載。再生成は `node tools/research/export-evidence.cjs`、SQLiteは `python3 tools/research/history_sqlite.py build --output <新規DBパス>`。
