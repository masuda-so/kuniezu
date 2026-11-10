# 人物の候補を Wikipedia の一覧とカテゴリから集める（2026-11-10）

利用者の指示（2026-11-09、Codex 経由）で、1534〜1615 年の人物の候補を、Wikipedia「戦国時代の人物一覧 (日本)」と `Category:戦国武将`・`Category:戦国大名` から集めた。収集・採否の基準の正本は `docs/work/history-candidate-scope.md`（#143 で取り込み予定。それまでは未反映）。形式と手順は `docs/architecture/candidate-ledger.md`。

出力：`data/research/source-notes/wikipedia-sengoku-person-candidates.json`（入口・版番号・分類・件数）と `.jsonl.gz`（1 行 1 候補）。どれも候補で、`claims.jsonl` や curated の people へは入れていない。

## 入口と件数

- 一覧：版 111706821（固定版の URL を出力に記録）。
- カテゴリ：2 つの根から深さ 3 まで、772 カテゴリをたどった。後世の作品・題材の 10 カテゴリは人物の候補に取らず、非人物の候補へ渡す一覧に残した。深さの上限でたどらなかった子カテゴリ 481 件も残した（別の経路からたどれたものは除いた）。カテゴリには版番号が無いので、取得時刻で時点を示す。
- 記事名 → 転送先 → Wikidata の QID の順にまとめて 15,706 件。入口の内訳は、カテゴリだけ 12,295、一覧だけ 302、両方 3,109。

| 状態 | 件数 | 意味 |
|---|---|---|
| `has-person-record` | 104 | QID が curated の人物と一致 |
| `in-game-without-record` | 293 | 名前がゲームの人物（年表の登場と、7 つの開始シナリオの初期の人物）と一致。同一人物の判定ではない |
| `not-in-game` | 11,586 | 人だが、名前がゲームに無い |
| `not-a-human-item` | 3,179 | Wikidata の P31 があり、人間（Q5）を含まない（作品・小惑星・家など）。`handOff: non-person-candidates` を付けた |
| `instance-of-unassessed` | 394 | Wikidata の項目はあるが P31 が空。人でないとは断定せず、人物候補として再確認する（義覚・児玉元兼などの人物も含む）。handOff しない |
| `no-wikidata-item` | 150 | Wikidata の項目が無い |

Wikidata の生没年と 1534〜1615 年の比較の目安：重なる 3,395、片方の年だけで外れとは言えない 1,783、外れる 3,641、年が無い 6,887。氏族や人物ごとのカテゴリをたどったため、期間外の人物も入っている。年が無いものを、この期間に実在したとは扱わない。

## 限界

- 全史実人物の網羅や、別名の重複ゼロを示さない。`collectionComplete` は `false`。
- 名前だけの一致（`personRecordByNameOnly`・`inGameByName`）は、同一人物の判定ではない。
- ゲームへの関わりは全件 `unassessed`（未評価）。
- カテゴリの分類のヒントは名前からの目安で、内容を確かめたものではない。
- 一覧の重複リンク（例：細川政元・本多広孝）は、この版では、ツールが数える箇条書きの最初のリンクとしては各 1 件だった。どの版でも、同じ記事名は 1 件にまとめる。
- 記事の本文は保存していない（CC BY-SA）。出力は `source-privacy.cjs` の `assertSourceSafe` を通した。

## 次の段

1. `in-game-without-record` の 293 件を、NDL 典拠・Wikidata の固定版で同定する（第 3 便以降）。
2. `instance-of-unassessed` の 394 件を、人か人でないか確かめる。
3. `not-a-human-item` を、非人物の型（城・施設、家・組織、事象など）へ仕分ける。
4. 関係 DB で、候補・同定済み・実装済みを区別して引けるようにする（別の PR）。

## 分類のやり直し（2026-11-10、Codex のレビュー）

- P31 が空の 394 件を、人でないと断定していた。`instance-of-unassessed`（種別未判定）に分け、非人物の候補へ渡さない。
- curated の人物の名前の索引が 1 つの名前に 1 つの ID しか持てず、同じ名前の別の記録を上書きする作りだった。名前ごとに全ての ID を残す形に直した。今の curated には同じ名前で別の ID を持つ例は無く、件数は変わらない。
- やり直しは `--reclassify` で、保存済みの記録から分類だけを行い、通信はしていない。取得した値（QID・版・P31・カテゴリ・表示名・元の記事名）は全件で変わらず、状態が変わったのはこの 394 件だけ。

## 検証

- `node tools/research/wikipedia-person-list-candidates.cjs --output data/research/source-notes/wikipedia-sengoku-person-candidates`（終了コード 0）
- `assertSourceSafe`（要約と記録の両方）
