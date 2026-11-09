# 候補台帳：形式と取得の手順

何を候補にし、どう採否するかの基準の正本は `docs/work/history-candidate-scope.md`（収集範囲の基準）とする。この文書は、候補ファイルの形式、取得の手順、関係 DB で扱う範囲だけを書く。
（暫定：基準の文書は #143 で main に入る予定。入るまでは、この文書の基準に関わる記述は暫定とする。）

## 3 つの段階とファイル

| 段階 | 置き場所 | 根拠 |
|---|---|---|
| 候補（candidate） | `data/research/source-notes/*-candidates.json` と `.jsonl.gz` | 入口の版番号か取得時刻 |
| 同定（identity） | `data/research/curated/people/` ほか | 典拠の固定版と名前の証拠 |
| 実装（game） | ゲームのデータと年表 | 史料での照合の記録 |

候補のファイルの中身を、`verified` の入力（`claims.jsonl`・curated）へ写さない。

## 人物の候補：`wikipedia-person-list-candidates.cjs`

入口は 2 つある。
- Wikipedia「戦国時代の人物一覧 (日本)」の固定版（版番号を残す）。箇条書きの最初のリンクを取り、見出しの区分を添える。
- `Category:戦国武将`・`Category:戦国大名` から、深さ 3 までの子カテゴリ（取得時点のもの。カテゴリには版番号が無いので、取得時刻を残す）。

記事の本文は保存しない（CC BY-SA）。残すのは、記事名・表示名・見出しの区分・カテゴリ名だけ。

カテゴリのたどり方：
- カテゴリには名前から分類のヒント（`hint`）を付ける：`later-works`・`topics`・`named-group`・`deified`・`clan-or-house`・`non-person-thing`・`other`。
- `later-works`（後世の作品・題材）だけは人物の候補に取らず、`categoriesHandedToNonPerson` に入れて非人物の候補へ渡す。それ以外は人物の記事が混じるのでたどる。
- 深さの上限でたどらなかった子カテゴリは `categoriesNotCrawled` に残す。`collectionComplete` は常に `false` にする。

まとめ方：記事名 → 転送先 → Wikidata の QID の順に同じものをまとめ、元の記事名（`sourceTitles`）・一覧の区分・カテゴリを全部残す。

`.jsonl.gz`（gzip した 1 行 1 候補。空の欄は省く）の主な欄：

| 欄 | 意味 |
|---|---|
| `entry` | 入口：`list`・`category`・`list+category` |
| `wikidataId`・`wikidataRevision`・`instanceOf` | Wikidata の項目、その版、P31 |
| `status` | `no-wikidata-item`・`not-a-human-item`・`has-person-record`・`in-game-without-record`・`not-in-game` |
| `handOff` | 人でない項目は `non-person-candidates`（非人物の候補の型へ送る） |
| `wikidataLifeVsCollectionPeriod` | Wikidata の生没年と 1534〜1615 年の比較の目安：`overlaps`・`partial-years-overlap-possible`・`outside`・`unknown`。実在・活動の確認ではない |
| `names`・`namesSharedWithOtherRecords` | 照合に使った名前と、他の候補と重なる名前 |
| `personRecord` | QID が一致した curated の人物 |
| `personRecordByNameOnly`・`inGameByName` | 名前だけの一致。同一人物の判定ではない |
| `gameRelevance` | 既定は `unassessed`。評価した後は `direct`・`indirect`・`none` |
| `adoption` | 既定は `candidate` |

再現：

```bash
node tools/research/wikipedia-person-list-candidates.cjs --output data/research/source-notes/wikipedia-sengoku-person-candidates
```

出力先が既にあれば止まる。

## 関係 DB で扱う範囲（次の段）

候補をファイルだけで終えず、`kuniezu.history` でも「候補・同定済み・実装済み」を区別して引けるようにする。導入の形（候補用の表を足すか、既存の表に段階の欄を足すか）は、入力の契約と後方互換を確かめてから、別の PR で決める。この PR では DB を変えない。
