# 現在地と次の作業

全体ゴール **active**。サーバー管理はユーザー。自由攻城・非史実ルート・プレイ中AI生成は保留。継続する合意と共同作業規則は [HANDOFF](../../HANDOFF.md)、受入条件は [requests.json](requests.json) を読む。

この整理の共有HEADは `740df3c48c7f44b378a0244e6c9931c4f7d6e048`（2026-11-04）。取り込み時は現在のHEAD・未コミット変更を再確認する。以下は既存証拠の接続で、新たな全件検査や全史実照合の完了宣言ではない。

## 登録数と台帳

[現行カタログ](catalog-manifest.json) は **448拠点・378人物表示名・85街道・315城間接続・111合戦・143領土変更・26水域・20要望、計1526対象**。歴史上存在した全対象の網羅ではない。旧436/440人物は文字列展開の誤集計、旧82街道・445拠点は更新前の母数。

史料台帳はrootの再出力で80命題・17所在記録・7人物ID・15地点ID・41資料。追加所在は統合後の直接HTTPで3観測日・顔・所在説明・上部日付を確認した。人物表示名378件とは別の母数。[年月×対象の参照構造](../architecture/spatiotemporal-history.md) で一記録を縦横から引き、年別複製しない。件数は追加後に現物と出力を照合する。

完了記録は大項目ORGと諏訪原城（`site-419be35cc2ac`）。ほかのqueuedは未実装断定ではなく受入審査待ち。[M03/U02条件別の証拠](../reports/WORK_ACCEPTANCE_EVIDENCE_REVIEW.md) は受入判定の記録で、全体のcomplete操作はしていない。担当の現況は `node tools/work/tasks.cjs list --status active` で確認する。

## 統合済みの主要成果と証拠

| 対象 | 現行内容・検査範囲 | 根拠 |
|---|---|---|
| 児島湾・地図正本 | 1560基準へ5補正24,306画素を焼込み、1584以後の宇喜多期366画素は年代差分。通常生成の二重適用を拒否。正本と配信の一致を独立検査 | [児島湾](../reports/KOJIMA_SOURCE_BASELINE_REVIEW.md)、[正本照合](../../data/verification/map-source-image/current-identity.json) |
| 明・遼東と女真 | 遼東都司の参考域、1573〜1605年の寛甸差分、女真との朝貢関係を区別。近代ロシア領域を前倒ししない。境界精度は約20〜25kmで、100m画素の精度とは別 | [遼東](../reports/LIAODONG_SOURCE_BASELINE_REVIEW.md)、[画像検査](../../data/verification/liaodong-source-baseline/acceptance.json) |
| 児島湾・遼東の最新HTTP確認 | 7年×広狭と逆年代の計15ケース。実hover/touch・寛甸の年切替・児島湾の海峡通水を確認。JavaScript/asset/loadエラー0。任意favicon404は別記 | [検査結果](../../data/verification/liaodong-context/http/result.json) |
| 標高・河川 | 共通格子の全域正本から配信用画像を再生成。通常派生は旧JS原線へ依存しない。現代参考線・標高を戦国期の実測値としない | [標高再生成](../architecture/heightmap-cache.md)、[河川正本](../architecture/river-source-image.md) |
| 合戦 | 全111の読込・参加者・自動再生・自然閉鎖。3包囲戦の段階/退出、伊予・讃岐の端切れを修正。木津川口1614は4隊の攻撃順序図。110地理図＋1模式図で、全員の精密配置確定とは別 | [3包囲戦](../reports/SIEGE_PLACEMENT_BATCH_REVIEW.md)、[実画面](../../data/verification/battle-display/browser.json)、[最終模式図](../../data/verification/battle-display/final-schematic.json)、[表示修正](../reports/BATTLE_DISPLAY_ACCEPTANCE_REVIEW.md) |
| 行軍・保存 | 道沿いの共通時計・接線、停止・日内保存。geometryVersion=22、siegePlacementVersion=2。全期間3,952,720標本で残る永禄の変2名は地点観測。「記」表示を確認し架空の経路を追加しない | [別名と保存](../reports/ALIASED_ARRIVAL_AND_SAVE_REVIEW.md)、[木崎原](../reports/KIZAKIBARU_LOCAL_MARCH_REVIEW.md)、[日跨ぎ](../../data/audits/day-boundary-review.json) |
| 人物・年表 | 家督通知の重複、黒田長政の架空の1599香春岳移動、九州平定後の豊前配分を訂正。基準本拠と戦役中の本人所在は分ける | [黒田](../reports/KURODA_NAKATSU_RESIDENCE_REVIEW.md)、[年表等](../reports/CHRONOLOGY_PORTRAIT_FOOTER_REVIEW.md) |
| 肖像・発熱 | 肖像要求を制限し失敗時に再試行、表示中DOMを保持。停止/タイトル/非表示の不要ループを抑止。旧HTTP失敗と後続の修復を別々に保存 | [肖像実画面](../../data/verification/portrait-loading/browser.json)、[停止・再開の観測](../../data/verification/idle-loop/result.json)、[発熱の観測範囲](../reports/THERMAL_LOAD_REVIEW.md) |

直近の統合コミットは `b303aec`（黒田）、`b977dc0`（肖像）、`6f1ec9e`（合戦端・木津川口）、`c16b89b`（アセット更新）、`b099eef`（正本の表示範囲）、`fe05cc5`（表示範囲の初期同期）。続く `79649d7` で地図生成入口を一本化し旧移行生成器を整理、`a557eb9` で最新HTTP証拠を統合した。`8d50e08` で旧線生成器17件を削除した。`dbbffeb` で行軍の誤統合・横ずらしと黒田1600年の所在接続を統合、`740df3c` でアセット検証値を更新した。G04仕様本文はClaude担当。`build-map.cjs --check` の対象は領域タイルと河川のみで、全地図層の一括検証とは扱わない。各版の検査範囲は個別記録で確認する。

## 次の作業を具体化する

1. **U02受入とM03の接続**：`dbbffeb` で行軍の後段再統合と横ずらしを除去し、黒田長政の追加所在3記録を接続した。配置12ケースと実画面の位置保持・全隊hoverを確認。4条件を証拠へ結び、M03の[完了記録](state/request-a678755b344c.json)を作成した。全体ゴールは継続。U02は東北全勢力クリックと全地域の実操作記録を区別する。[行軍・所在の受入記録](../reports/CONVOY_AND_LOCATION_ACCEPTANCE.md)
2. **G01 古湖岸**：香取海の内浪逆浦/日の出と干拓年、塩津潟の中世陸側制御点と1721年等の後世図の採用範囲を限定比較。登録26水域の対象ごとに位置・年代・推定精度を結ぶ。現代DEMや明治迅速測図を1560年の汀線としない。[香取比較](../reports/KATORI_RAPID_MAP_REVIEW.md)
3. **G03 街道**：残59街道224閉路候補と415支線候補は重複する診断候補で、不具合確定数ではない。米沢・越後の長い閉路、六十里越の図間約5km、朝鮮の近現代比較区間を原資料ごとの採否へ分割する。[閉路候補](../../data/audits/road-remaining-excursions.json)
4. **H01〜H06/B01 史実照合**：城の存在・所属・明渡しと人物の本拠・戦役中所在を別に照合する。旧監査の斯波詮直/池田輝政の出生年候補は現行訂正と突合してから再発扱いにする。上月毛利側2隊など推定配置は確定数に加えない。全111図の表示合格を全111の史実配置確定にしない。
5. **G04 正本と生成契約**：`79649d7` の入口一本化と `8d50e08` の旧線生成器17件削除を受入条件へ接続する。`--check` は領域タイルと河川のみを対象とする。通常画像隣接と任意の特殊隣接を分け、公開仕様で確認できた部分と独自形式を記録。`adjacencies.csv`不在だけで不具合やCK3互換失敗としない。
6. **R01 参照の整合**：出典命題をcuratedと年月/対象索引へつなぎ、報告書の候補パスを恒久証拠へ直す。古い報告の数値は当時の記録として保存し、現行入口だけを更新する。

基本検査・担当別手順は [検証の入口](../../tools/checks/README.md)。発熱対策のためChromeと重い生成/全画素検査は同時に増やさない。必要な対象検査が通った後、理由なく全111や全期間シミュレーションを繰り返さない。

整理前の全文は [継続記録の履歴](../history/CURRENT-2026-11-03-before-refresh.md)。履歴へある旧外部DEM取得・旧地形補正の再適用・古い母数を現行手順として実行しない。
