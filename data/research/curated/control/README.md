# 支配の記録（`control/`）

日本の城が、いつ、どの家の支配下にあったかを、出典付きで 1 件 1 ファイルに記録する。ゲームの領地は、この記録から作る城の持ち主の区間で決まる（`docs/designs/county-territory.md`）。記録の形の考え方は `docs/designs/territory-control.md` の「記録の単位」と「日付の幅」。

- 入力の検査：`tools/research/control-store.cjs`。書き出し `node tools/research/export-evidence.cjs` が、実際の出典・命題・場所・家・城の一覧と照らして検査し、`data/research/control.jsonl` を書く（記録に日付の幅 `span` を足した生成物）。
- 検査の決まりの試験：`node tools/checks/control-ledger.cjs`（CI）。

## 対象と鍵

- **城**（`site`）：日本の城すべて。鍵は `castle:<id>`（郡の形 `kuniezu/map/admin/gun-shapes.geojson` の `castles` にある鍵）。行軍拠点の城は `castle:okazaki` の形、それ以外は `castle:yosho:<名>:<経度>:<緯度>` の形。朝鮮の城は受けない。
- **家**：`clan:<ゲームの家の鍵>`（`TK.CLANS` の鍵）。
- **id**：`control:<castle: を除いた城の鍵>-<最早日の年>-<連番>`。年は日付の最早日の旧暦の年。
- **ファイル名**：id から `control:` を除き、`:` を `_` に替えて `.json` を付ける（例：`control:yosho:勝龍寺城:135.7:34.92-1570-1` → `yosho_勝龍寺城_135.7_34.92-1570-1.json`）。

## 2 種類の記録

**変化（`type: "change"`）**：持ち主が替わった。`from`（渡した家。不明なら `unknown`、築城なら `none`）、`to`（受けた家。廃城・放棄なら `none`）、`time`（時点）、`cause`、`dateKind`。

**観察（`type: "observation"`）**：ある時点か期間の状態。`value` は次のどれか。

| 値 | 意味 | 必須の項目 |
|---|---|---|
| `held` | その家が保持していた | `holder` |
| `contested` | 現地で争っていた | `claimants`（2 家以上） |
| `undetermined` | 調べたが決められなかった | 期間、`boundsAsserted: true`、`searched`（探した出典・条件・日・覆う年。覆う年の和集合が期間を隙間なく覆うこと） |
| `not-applicable` | 支配者がいない（未築・廃城など） | なし |

両方に必須：`id`・`type`・`site`・`time`・`summary`（出典の要旨を自分の言葉で 1〜2 文）・`checked`（`YYYY-MM-DD`）・`checkedBy`。`undetermined` 以外は `evidenceDepth`・`source`（登録済みの出典の ID）・`locator`（該当箇所）も必須。任意：`alsoSources`・`claim`・`place`・`variantOf`・`uncertainty`。知らない項目は拒む。

語彙：

- `cause`：`fall`（落城）・`surrender`（開城）・`handover`（明け渡し）・`transfer`（領地替え）・`succession`（継承）・`construction`（築城）・`abandonment`（廃城）・`allegiance`（城主が従う先を変えた）
- `dateKind`：`event`・`order`・`entry`・`listing-only`
- `evidenceDepth`：`kobun-heading`・`public-secondary-read`・`primary-text-read`

## 日付

日付は旧暦で書く。検査は暦の表（`kuniezu/static/kuniezu/koyomi.js`、1532〜1623 年）で、最早日と最遅日のユリウス通日に直す。受けるのは 1532〜1622 年。

| 形 | 項目 | 幅 |
|---|---|---|
| `dated-event` | `date: [年, 月, 日]`、`leapMonth`、`calendar: "Japanese-lunisolar"`、`precision: "day"` | その日 |
| `year-window` | `year`、`calendar: "Japanese-year"`、`precision: "year"` | 旧暦のその年の正月朔日〜大晦日 |
| `described-period` | `label`、`indexYears`、`calendar: "Japanese-era-description"`、`precision: "period"`、`boundsAreHistoricalStartEnd: false` | 最初の年の正月朔日〜最後の年の大晦日 |
| 期間 | `{"from": 日付, "to": 日付}`（両端は `dated-event` か `year-window`） | `from` の最早日〜`to` の最遅日 |

日付の形に無い項目（`estimated`・`untilExclusive`・`components` など）は拒む。推定の日付は、この記録には入れない。変化の日付は時点だけ。観察の期間には `boundsAsserted`（出典が始まりと終わりを述べているか）が要る。年は旧暦の年で、`year-window` の年を 1 月 1 日の出来事に直さない。

## 区別すること

- **不明と未調査**：「未調査」は記録しない。記録が無いことが未調査。`undetermined` は、探したが決められなかったことの記録で、探した範囲（`searched`）の中に収める。
- **異説と係争**：史料どうしが食い違うときは、別々の記録として両方を置き、互いの `variantOf` に相手の id を書く。現地で争っていたのは `contested`。
- **確かな観察と窓**：幅が 1 日の観察と、`boundsAsserted: true` の期間の観察は確かな観察。年だけ分かる観察などは窓で、持ち主の根拠にしない。

## 検査が拒む組み合わせ

同じ城の、同じ異説の束に入っていない 2 件について（束は `variantOf` でつながる記録の全体。A–B、B–C なら A・B・C が 1 つの束）：

1. 確かな観察 2 件の幅が重なり、結果（`value` と `holder`・`claimants`）が違う。どちらかを直すか、異説として結ぶ。
2. `undetermined` の期間に、変化か、不明でない確かな観察が重なる。不明の期間をその日で切る。

同じ日に、つながらない変化（A→B と C→B など）が 2 件あるときは、拒まずに警告を出す。
