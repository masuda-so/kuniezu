# 沿岸の年代命題を水域と結んで取り込む（B 便、8 件と型対応、2026-11-09）

旧 PR #42・#50（Codex 作成）で main に入らなかった沿岸の命題のうち、A 便（`docs/reports/COASTAL_CLAIMS_A.md`）に入れなかった 8 件を、水域（`water:`）を関係する対象として結べるようにする型の対応と合わせて取り込む。型の設計は Codex の案（`/tmp/kuniezu-coastal-identity-contract/README.md`）に沿い、Codex がレビューする。

## A と B の分け方

当初は A 10 件・B 6 件の案だった。水戸口の 2 件は既存の台帳の場所が無く、十三湖とも結ぶので B に移し、A 8 件・B 8 件にした。16 件の候補を両便の命題の ID で照らし、重複 0・欠落 0・余分 0 を確かめた。

## 型の対応

- **JS（`tools/research/evidence-store.cjs`）**：`catalogWaterKeys(file)` を足した。`docs/work/catalog.jsonl` の `kind=water` の行から `water:<subject>` を作る。`loadEvidence` は `knownWaterKeys` を受け取り、命題の `linkedEntities` の `water:` は、この集合と完全に一致するときだけ受ける。集合を渡さない呼び出しでは `water:` を拒む（人物・場所の既存の扱いは変えない）。export と、実データを読む検査（`evidence-store`・`location-store`・`kuroda-residence`）は今の catalog の集合を渡す。`history-index` は書き出し済みの命題の `water:` を受ける。
- **Python（`kuniezu/history/importer.py`）**：catalog の水域を作るときに、そのキーを今回の取り込みの集合に記録する。命題の関連の `water:` は、この集合にあり、かつ `find` で見つかる水域の対象のときだけ結ぶ。それ以外は `ValueError` で取り込み全体を止める。名前による推定、新しい水域の自動作成、一般の `resolve` への切り替えはしない。命題の主体の扱い（`resolve`）は変えない。
- 回帰試験：JS は、catalog にある `water:中海` を受け、誤字・空・catalog に無い水域・別の接頭辞・集合なしの呼び出し・重複を拒む。Python は、(1) catalog の中海が関係する対象（PARTICIPANT）として結ばれ、水域の対象が増えず、場所（Place）も作られない、(2) catalog に無いキーを拒み、対象を作らない、(3) 別の命題が主体として先に作った水域では足りない、(4) 前の取り込みで DB に残った水域でも、今回の catalog に無ければ拒む。

## 取り込んだ命題

| 命題 | 主体 | 関係する対象 | 年次 |
|---|---|---|---|
| coastal-jusan-project-fiscal-1948-1969 | `region:国営十三湖開拓建設事業の対象地域` | `water:十三湖` | 昭和23〜44年度 |
| coastal-mitoguchi-1926 | `place:jusan-mitoguchi`（十三湖水戸口） | `water:十三湖` | 1926 年（着工） |
| coastal-mitoguchi-1947 | 同上 | `water:十三湖` | 1947 年（完成） |
| coastal-nakaumi-start-1963 | `region:国営中海土地改良事業の対象地域` | `water:中海` | 1963 年（着工） |
| coastal-nakaumi-three-districts-1989 | 同上 | `water:中海` | 1989 年（揖屋・安来・弓浜の完成） |
| coastal-nakaumi-hikona-1992 | 同上 | `water:中海` | 1992 年（彦名の完成） |
| coastal-nakaumi-honjo-cancel-2000 | 同上 | `water:中海` | 2000 年（本庄の干陸中止） |
| tosaminato-54-windblown-sand-layer | `place:tosaminato`（十三湊遺跡） | — | 中世の廃絶後〜近世の始まり（期間、境界は主張しない） |

- 事業の主体は対象地域（`region:`）にし、湖（`water:`）は関係する対象にした。工区を湖の全域へ広げず、湖の形の変更とも結ばない。湖と同じ名前の台帳の場所は作らない。
- 十三湊遺跡は、旧 PR #50 の場所の名前「十三湊」をそのまま使うとゲームの拠点 `yosho:十三湊`（港の施設）と同じ名前になるので、名前を「十三湊遺跡」にした。遺跡とゲームの施設は名前だけでまとめない（同一性の記録も作らない）。座標は旧 PR #50 の青森県史の代表点（遺跡の代表点で、第 54 次調査区の位置ではない）。
- 原の `checked`・書誌・原 PR・head・作者は保持した。出典 5 件（中海の島根県、十三湖の国交省・東北農政局、十三湊の榊原 2019・青森県史）は旧 PR の書誌のまま。十三湊の読書ノート `docs/reports/TOSAMINATO_STRATIGRAPHY.md` は旧 PR #50 から持ち込んだ。

## 検査の更新（`kuroda-residence`）

main で失敗していた `tools/checks/kuroda-residence.cjs` を、Codex の原因の切り分け（2026-11-09）に沿って今の契約に合わせた。プレイ側は変えていない。
- 城将の表（`castleGens`）は、所在の確定しない記録済みの人物を除く今の方針なので、黒田長政を表にも表示にも城内確定として出さないことを確かめる。元の武将データ（`G.S().gens`）に長政が残ることも確かめる。
- 1587 年の中津城の状態の文言を、今の表示（`player-copy.js`）の「成立する前」に合わせた。
- 1600 年の所在の観測が増えたので、先頭の 1 件ではなく「中津城の城主（`held-castle-lordship`）が 1 件ある」ことを確かめる。中津の本拠（`principal-base`）の検査はそのまま。

## 検証

- 隔離 DB で `import_history`：8 件のうち工事 7・自然 1。中海・十三湖は catalog の既存の水域が関係する対象になり、水域の対象は増えない。十三湊遺跡と `yosho:十三湊` は別の対象。
- 各検査・`pytest`・`ruff`・`mypy` の結果は PR の説明に書く。

命題は公的機関の後世の解説・調査報告によるもので、同時代の一次史料ではない。検査の合格は、沿岸の地形の変化の全件の網羅を示さない。
