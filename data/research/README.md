# 史料とゲーム実装の対応

人が読む取得資料は [Markdownの資料ノート索引](source-notes/README.md) から参照する。書誌・原URL・確認箇所・要約・適用範囲をそろえ、HTMLの装飾やメニューを表示しない。原取得HTMLは [照合用アーカイブ](../source-archives/README.md) に圧縮し、要約と原本それぞれのハッシュを保持する。全文の要約化と史実確認は別工程であり、ノート化だけで確認済み命題を増やさない。

確認済み命題の追記先は `curated/claims/`、新規出典は `curated/sources/`。別担当の入力を消さずに出力を再生成する。詳しくは [入力の扱い](curated/README.md)。

人物・場所・年代の所在記録は `curated/people/`、`curated/places/`、`curated/locations/`。`query-locations.cjs` で検索する。[設計と検索例](../../docs/architecture/spatiotemporal-history.md)。本拠・城主と現地滞在、年精度と日精度、史実参照と将来の分岐履歴を分ける。

年代横断と対象別の来歴は `node tools/research/query-history.cjs --year 1592 --entity 松平家忠` で同じ記録を参照する。年ごとの全対象の複製は作らない。対象には城・施設・街道・水域も含む。日付の精度・暦・有効期間は元記録へ残す。

`query.cjs` は既定で `claims.jsonl` の確認済み命題だけを検索する。例：`node tools/research/query.cjs 真田 1600`。

- `sources.jsonl` は書誌・URL・確認箇所・確認範囲。本文を丸ごと保持したアーカイブではない。
- `claims.jsonl` は出典の指定箇所で確認した一命題。年代、日付の精度、実装先を分ける。複数の出典が対立する場合は各説を別命題にし、採用方針を別に記録する。
- `implemented-events.jsonl` と `implemented-sites.jsonl` は実装の棚卸し。史実確認済みという意味ではなく、検索結果の史実の根拠にはしない。
- `japan-castle-candidates.jsonl` はCODH全国遺跡報告総覧地名データの城・軍事施設候補。江戸期・近代の施設も含み、1560〜1615年に存在した施設の一覧ではない。`inGame:null` は未対応付けであり未実装の証明ではない。名前と近接位置で対応したものにも個別の同定確認が必要。

城の区分は二軸とする。全国地図の拠点は地域を管理するゲーム上の単位であり、それだけで史実上の本城を意味しない。「本拠」はその時点の当主の拠点。「支城」「連絡・兵站拠点」等の歴史的役割は年代付き個別史料で判定する。近さや同じ領地色だけから従属・城主・主城を確定しない。朝鮮の邑城・鎮・山城・倭城も日本の本支城分類へ機械的に置き換えない。

滝の城の1590年廃城は年の精度。ゲームの活動終了は小田原征伐終結を表示上の上限としており、滝の城の落城日を旧暦7月5日と断定するものではない。

現代標高・道路形状から作った移動経路や概観断面は地理の補助資料。史実の通過街道、渡河地点、当日の天候の証明としない。整備Lv.と係数はゲーム上の設計で、史実の普請年を意味しない。史実の着陣・領主変更日を整備で変更しない。

日本・朝鮮・明の当該期間の全人物・全城・全施設・全街道の網羅性は、現在の資料からは証明できない。実装全件の点検と、歴史上の全件の網羅を区別する。

### 城・施設の出来事と対象参照

確認済み命題の `linkedEntities` は人物・場所への追加参照、`eventTime` は原史料の精度を保った出来事の時点、`eventRelation` と `eventScope` はその意味と限界を示す。本文・出典は同じ命題に一度だけ保持する。共通索引は従来の `entity` と追加参照の両方から同じ記録を返す。場所の `aliases`（例：県城／縣城）も検索できる。

`validYears` による検索は命題の適用年代であり、事件発生日だけの検索ではない。旧暦の命令日・報告日を実際の明渡し日へ変換しない。六砦のような複合記録は `dated-components` に各対象の整備年を保持する。「江戸時代初頭」の検索用範囲は `boundsAreHistoricalStartEnd: false` とし、開始・終了年の確定と区別する。採否と照合元は `reviews/castle-history-connections/` に保持する。

### 複数エージェントでの編集・確認

共有先は既存 Git リポジトリ `masuda-so/kuniezu`。入力の正本は `data/research/curated/{claims,sources,people,places,locations}/`、閲覧・検索用の出力は同ディレクトリ直下の JSONL。GitHub へ反映された版を各担当が取得して参照する。リポジトリの公開範囲を変更する必要はない。

編集前に共有 HEAD と差分を確認し、担当する対象 ID・年代・ファイルを連絡する。命題・出典は独立 JSON を追加・編集し、他担当の入力や生成済み JSONL を手作業で置換しない。別担当の確認は、元の出典・該当箇所・原暦・精度・適用範囲を読み、採否理由を記録する。AI の同意だけで確認済みへ格上げしない。

再生成と検査はリポジトリのルートで実行する。

```sh
node tools/research/export-evidence.cjs
node tools/checks/evidence-store.cjs
node tools/checks/location-store.cjs
node tools/checks/history-index.cjs
node tools/research/query-history.cjs --entity 県城
```

Wikidata の候補取得は `node tools/research/fetch-authorities.cjs --output /tmp/kuniezu-authorities.json`。登録済み人物の典拠 ID をまとめて取得する。既存出力を上書きせず、結果を自動採用しない。氏名・同名人物・出典を確認してから curated 入力へ反映する。

年代の正規化は `eventTime.calendar` を参照する。既存の `value.calendar` は原文表現・互換用に保持する。`boundsAreHistoricalStartEnd: false` の命題は索引の `scope: described-period-candidate` として返し、検索結果は確定した存続期間と区別する。文書標題の「県城」は原表記を残し、場所の別名から「縣城」と同一地点として検索する。
