# 沿岸の年代命題を取り込む（A 便、8 件、2026-11-09）

旧 PR #42（head 3de2ef22、Codex 作成）で main に入らなかった沿岸の命題を、Codex の再照合（2026-11-09、公式の公開本文）を受けて取り込む。DB の担当を Claude に寄せる分担（Codex と合意）による。型の変更が要らない 8 件をこの便にし、水域（`water:`）と結ぶ必要がある 6 件と、既存の場所が無い水戸口 2 件は B 便に回す。

## A と B の分け方

当初の案は A 10 件・B 6 件（水域と結ぶ 6 件だけを B）だった。水戸口の 2 件（1926 年の着工、1947 年の完成）は、既存の台帳の場所が無く（`place:jusan-mitoguchi` は旧 PR #42 にしか無い）、湖の十三湖（`water:十三湖`）とも関係を結ぶので、Codex との合意（既存の場所が無ければ保留）に沿って B に移し、A 8 件・B 8 件にした。16 件の候補（`/tmp/kuniezu-coastal-claims-content-review/candidates/`）を A と B の命題の ID で照らし、重複 0・欠落 0・余分 0 を確かめた。

## 取り込んだ命題

| 命題（`coastal-` 省略） | 主体 | 年次 | 分類 |
|---|---|---|---|
| hibiya-earthwork-1592 | `place:hibiya-inlet`（関連 `place:edo`） | 文禄元年（1592） | 工事（埋立の段階） |
| edo-reclamation-1603 | `place:edo` | 慶長8年（1603） | 工事（埋立の段階） |
| okakoi-start-1608 | `place:kiso-okakoi-levee` | 慶長13年（1608）から2年 | 工事（築堤の開始） |
| tsugaru-new-field-order-1620 | `region:津軽平野` | 1620年（出典が西暦で書く） | 文書（新田開発令） |
| tsumori-permission-1698 | `place:tsumori-shinden` | 元禄11年（1698） | 文書（開拓の許可） |
| tsumori-development-1702 | `place:tsumori-shinden` | 元禄15年（1702）3月 | 工事（開発の成功） |
| yamato-diversion-1704 | `place:yamato-lower-river` | 宝永元年（1704） | 工事（川の付替え） |
| yamato-old-channel-fields-1705 | `place:yamato-lower-river`（関連 新開池・深野池） | 宝永2年（1705）から | 工事（新田開発の開始） |

- 和暦の 7 件は `described-period`（元の表記の label、索引の年＝[年, 翌年]、境界は主張しない）。旧暦の年を西暦の 1 月 1 日〜12 月 31 日に置き換えない。津軽の 1620 年は出典自体が西暦で書くので `year-window` のまま。
- 原の `checked`（2026-11-04）・書誌・原 PR・head・作者は保持した。今回の再照合は `data/research/source-notes/coastal-period-review/content-review-2026-11-09.json`（Codex の採否）と同 `-sources.md` に置いた。原の読書ノート（`README.md`・`adoption.json`・地域別の `.md`）は 3de2ef22 からそのまま持ち込んだ。読書ノートの README の「15 命題」は旧 PR の数で、この便では 8 件。
- 出典 6 件（`curated/sources/`）は 3de2ef22 の書誌のまま。原本は Git の外に保持する記録（`retainedInput`）で、全文は入れない。

## 自分でも確かめたこと

Codex の照合のうち 2 か所を抜き取りで公式の本文と照らした（2026-11-09）。
- 港区教育史 通史編1：文禄元年（1592）の、堀割の残土の日比谷入江への投入と、慶長8年（1603）の天下普請・日本橋浜町から新橋付近への埋立の進行。
- 大阪市立図書館：津守新田が元禄11年（1698）に開拓の許可を受け、元禄15年（1702）3月に開発に成功したこと。

## 対象の扱い

- 新しい台帳の場所 6 つ（日比谷入江・木曽川御囲堤・津守新田・大和川下流・新開池・深野池）は、3de2ef22 の定義に、根拠の命題（`identityBasis`）を足した。座標は持たない。江戸は既存の `place:edo` を使い、江戸城（`node:edo`）とは結ばない。
- **津軽平野**は平野という地域なので、施設の台帳に載せず、主体を `region:津軽平野` にした。
- 残る課題：日比谷入江・新開池・深野池は水域だが、水域の一覧（catalog）に無いので、施設の台帳の場所として持つ。水域の登録の型が整ったら移すかを検討する。

## 検証

- `export-evidence.cjs`：命題 175 件（main の 167 件＋8）。
- 隔離 DB で `import_history`：工事 6・文書 2。期間型の 7 件は境界を主張しない。同じ名前の対象の重複は 0。
- 各検査・`pytest`・`ruff` の結果は PR の説明に書く。

検査の合格は、沿岸の地形の変化の全件の網羅を示さない。命題は公的機関の後世の解説によるもので、同時代の一次史料ではない。
