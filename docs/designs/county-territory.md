# 郡の区分と城の保有で領土を描く

*   **Author:** masudaso
*   **Status:** Proposed
*   **Date:** 2026-11-13

--------------------------------------------------------------------------------

## Overview

「天下分け目の国絵図」は、1560〜1615 年の日本を舞台にしたブラウザの地図ゲームで、史実の動きを再現すること（史実観察）を今の目的にしている。ゲームは素の JavaScript（`kuniezu/static/kuniezu/`）で動き、ページは Django が描いて静的ファイルとして書き出し（以下「静的書き出し」）、Cloudflare から配る。公開中のサイトでは Python もデータベースも動かない。

史実の記録は、出典付きの JSON（`data/research/`、Git で管理する正本）にあり、それを Django の史実データベース（`kuniezu/history`、以下「史実 DB」）に取り込んで検索に使っている。しかしゲームは史実 DB を一切読んでおらず、城の持ち主の移り変わりは、手で書いた JavaScript のデータ（`data.js` の `TK.SCEN`、`hist.js` の `TK.HIST`）で動いている。

この設計は、領地の仕組みを**城を保持しているかを元にする形**に改める。領地は「郡・国の区分（固定）」と「その日に誰がどの城を保持しているか」の 2 つの層で表し、郡は、その郡にある城をその日に保持している家の色で塗る。城の持ち主の移り変わりは、史料で確かめた支配の記録から作り、ゲームの年表の該当する部分を置き換える。史料にある係争は 2 色の斜線で、規則で持ち主を導けない所は雲で見せる。

### 役割

*   **利用者**：このリポジトリの持ち主で、設計の決定者。
*   **遊ぶ人**：公開サイトでゲームを遊ぶ人。
*   **作業者**：支配の記録を史料から登録する人（AI のエージェント、または人）。

### 城

この設計では、主城・支城という上下の区分を使わず、すべてを「城」として扱う（利用者の決定、2026-11-13）。今のゲームの主城（`data.js` の `TK.CASTLES` と `frontier-polities.js` の追加、日本 122）と支城（`TK.YOSHO` のうち種類が「城」の 244 件）を、1 つの城の一覧にまとめる。日本の城は 358（行軍拠点 122、それ以外 236。2026-11-13 に PR 2 で数えた。今の支城 244 のうち 8 件は朝鮮の城）。

城ごとの違いは、上下ではなく、はっきりした属性で持つ。

| 属性 | 値 | 意味 |
|---|---|---|
| 行軍拠点 | はい（今の主城 122）／いいえ（今の支城 236） | 軍勢が行き来する道の点で、兵・守り・石高を持つか。城どうしのつながり（`G.ADJ`）と行軍日数は行軍拠点だけで作る。この設計では行軍拠点を増やさない（史実の着陣日と古い保存を変えないため） |
| 存在する期間 | 年の範囲 | 城が使われていた期間（今の `y0`・`y1`、`TK.SITE_ACTIVITY`） |

持ち主・支配の記録・郡の塗りは、行軍拠点かどうかに関わらず、すべての城で同じに扱う。

*   **持ち主**：行軍拠点の城は今のとおり `S.castles[id].owner`。行軍拠点でない城は、ゲームの状態に新しい項目を持たせず、その日の値を計算する。支配の記録の区間があればその家、無ければ今の動き（`G.yOwner`：近くの行軍拠点の城の持ち主に従い、攻め取られたときは `S.branches`）。どちらも `G.castleOwner(key)` が返す。
*   **支配の記録**：どの城にも付けられる。
*   **郡の塗り**：どの城も「郡の中の城」として数える。

### 用語（状態の言葉）

| 層 | 値 | 意味 |
|---|---|---|
| 支配の記録（作業者が登録する観察） | `held`（保持）・`contested`（係争）・`undetermined`（不明）・`not-applicable`（対象外） | `territory-control.md` の観察の値と同じ |
| 城の持ち主の区間（ゲーム用の書き出し） | `confirmed`（確認済み）・`contested`（係争、加わる家の一覧 `claimants` を持つ）・`carried`（持ち越し） | 支配の記録から導く。区間の無い期間は、今のゲームの年表 `TK.HIST` が持ち主を決める（「記録の無い期間」） |
| 郡の根拠の種類（ゲームの中で計算） | `exception`（例外の表）・`castle-point`（郡の中の城から）・`province-uniform`（同じ国の城がすべて同じ家だから）・`underived`（未導出） | 郡の色をどう決めたか |

## The Problem

利用者が困っていること、目指していることは次の 3 つ。

1. **領地の単位が史実の区分と合っていない。** 今の領地は、日本で 122 の行軍拠点の城ごとの「城の領域」で、その形は史料ではなく、古い線のデータや画像から作られている。当時の地域区分は郡（律令以来の正式な区分で、戦国期にも場所や知行の単位として使われた）だった。郡の区分が地図に無いので、「この城は何郡か」「この郡は誰の勢力か」が示せない。
2. **くっきりした境界が、当時の領域の姿と合わない。** 今の地図は勢力の境を 1 本の線で描く。戦国期の領域の端は線ではなく「境目」と呼ばれる帯で、両方に年貢を半分ずつ納める「半手」の村もあったとされる（`docs/reports/HISTORICAL_TERRITORY_UNITS.md` の議論を参照）。
3. **史実の記録とゲームのデータが別々にある。** 城の持ち主の事実が `TK.SCEN`・`TK.HIST`・史実 DB の 3 か所にあり、どれが正しいのかを機械的に確かめられない。史実 DB に記録を足しても、ゲームは変わらない。利用者は、史実 DB を中心にしてゲームを動かしたい。

記録はまだ少ない（2026-11-13 時点で、確認済みの命題 371 行、支配の記録 0 件）。この設計は「全てを再現する」ことを目指さない。忠実さの基準（2026-11-11、利用者）は「全要素の 1:1 の再現ではなく、シミュレーションを左右する要素を、出典の箇所で確かめて忠実にする。確かめていないものには印を付け、不足は数で示す」。この設計の役目は、記録を足せば地図と史実の進行が変わる仕組みを作り、持ち主を決められない所をそうと分かる形で見せることである。

## Goals

*   **G1 区分の層**：郡・国の区分を地図に描き、郡名と「どの城がどの郡にあるか」を引けるようにする。
*   **G2 城の保有による郡の塗り**：郡を、その日の城の保有から次の規則で塗る。(1) 例外の表、(2) 郡の中の城の持ち主、(3) 城の無い郡は同じ国の城がすべて同じ家ならその家、(4) どれでもなければ未導出。郡ごとに根拠の種類を持ち、指したときに表示する。
*   **G3 係争と雲**：支配の記録で係争とされた城の郡に 2 色の斜線を重ねる。未導出の郡に雲を重ねる。雲はシミュレーション（持ち主・行軍・収入）に使わない。
*   **G4 年表の置き換え**：支配の記録から城の持ち主の区間を作り、ゲームの年表の、その城の持ち主の変更をその区間で置き換える。記録の無い期間は今の年表のまま。
*   **G5 不足の報告**：根拠の種類ごとの郡の数、未導出の郡の数、城ごとの確認済みの区間の長さを、制作者向けの報告（CI の成果物）として出す。遊ぶ画面には数を出さず、塗りと雲と決まった文言（下の「画面の文言」）だけを出す。
*   **G6 切り替え**：表示設定で、今の城の領域の塗りに戻せるようにする。
*   **G7 互換**：古い保存がそのまま読み込め、意図しない着陣日・行軍日数の差が無い。記録を足したことによる差は、認めた差の一覧に載せたものだけにする。

### 画面の文言

| 場面 | 文言 |
|---|---|
| 郡を指したとき | 「〇〇郡（〇〇国）　〇〇家」に、根拠を添える：「郡の中の城から」「国の城がすべて同じ家」「例外：〇〇」 |
| 未導出の郡 | 「領地不明」 |
| 持ち越しの城がある郡 | 「〇〇家（持ち越し）」 |
| 係争の城がある郡 | 「〇〇家と〇〇家が係争」 |

## Non-Goals

*   **郡ごとの持ち主**：郡を一つずつ取り合う仕組み（将来の非史実ルートで使う）は作らない。非史実ルートは保留中である。
*   **行軍拠点を増やすこと・城の追加**：行軍拠点（城どうしのつながり `G.ADJ`、兵を持つ `S.castles`）は今の 122 城のままにする。今の一覧に無い城（河内の高屋城など）は足さない（Future Improvements）。
*   **人物の足跡**：人物の誕生・死去・合戦・居場所を地図に描く機能は、別の設計（`docs/designs/people-trace.md`、後で作る）で扱う。
*   **記録の無い移動・境の創作**：雲を勢力の強さを測った値のようには見せない。
*   **史料の調査そのもの**：どの城を誰が保持していたかを全国で調べて埋める作業は、この設計に含めない。東海の試行で作業量を測る。
*   **戦国期の郡境の復元**：郡境は CODH の江戸末期のものを使い、戦国期の境に直さない。
*   **朝鮮の城**：朝鮮の 18 の行軍拠点の城（戦略地図の範囲外で、削除を予定）には郡を付けない。
*   **公開中のサイトでデータベースを動かすこと**：閲覧者ごとの読み書き（ログインなど）はしない。

## Open Questions

*   なし（2026-11-13、利用者が決めた。下の「決めたこと」）。

## Critical User Journeys (CUJs)

### CUJ 1: ある日の領地を郡で見る

*   **Given**: 史実観察で 1582 年 6 月 20 日まで進めたゲーム。郡の形と城の持ち主の区間が配信されている。
*   **When**: 遊ぶ人が地図を見る。
*   **Then**: 郡の境と郡名が描かれ、各郡がその日にその郡の城を保持している家の色で塗られている。係争の城の郡には 2 色の斜線、持ち主を規則で導けない郡には雲が重なる。郡を指すと「画面の文言」の説明が出る。

### CUJ 2: 支配の記録を足すと地図と進行が変わる

*   **Given**: ある城の持ち主が替わった日を、作業者が出典付きの支配の記録（`data/research/curated/control/`）に登録した PR。
*   **When**: PR が main に入り、Cloudflare が静的書き出しを行う。
*   **Then**: 静的書き出しの中のゲーム用の書き出しで、その城の持ち主の区間が変わり、史実の進行と郡の塗りがその日に替わる。差による着陣日の変化は、PR の中で認めた差の一覧に載っている。

### CUJ 3: 古い保存を読み込む

*   **Given**: この設計より前に作った保存。
*   **When**: 遊ぶ人が保存を読み込む。
*   **Then**: JavaScript の例外を出さずに読み込め、城の持ち主・行軍中の部隊が保存の時点のまま続き、保存の時点より後の出来事だけが新しい年表で起こる。

## Technical Plan (Architecture)

### 全体の流れ

```text
 [手元だけ：地理ありの設定 config.settings.geo]
   .cache/codh-kg/geojson/（CODH の原本、Git に入れない）
        │ load_codh_kg → link_places → write_county_tables
        ▼
   郡の形（Git に入れる、CC BY-NC・出典表示、地図の配信物として写される）
     kuniezu/map/admin/gun-shapes.geojson      … 簡略化した郡 806 の多角形（属性：郡・国）
     kuniezu/map/admin/gun-cells.geojson       … 城が 2 つ以上ある郡を、城の点で分けた区画（属性：郡・城）
     kuniezu/map/admin/gun-exceptions.geojson  … 例外の郡（属性だけ：郡・期間・決め方・出典。形は gun-shapes と郡の ID で結ぶ）
     kuniezu/map/admin/gun-edges.geojson       … 郡（区画に分けた郡は区画）どうしの共有の境（属性：両側の単位 a・b）。国境の線を引く所

 [静的書き出し（Cloudflare・CI・手元）：地理なし]
   data/research/（出典付きの JSON、正本）
        │ 一時の SQLite へ migrate → import_history
        ▼
   史実 DB（kuniezu.history）
        │ export_game_data（ゲーム用の書き出し）
        ▼
   static/kuniezu/history/owners.js   … 城の持ち主の区間（Git には空の既定版がある）
   territory-coverage.json（制作者向けの報告、CI の成果物。コミットしない）
        │
        ▼
 [ゲーム（ブラウザ）]
   owner-timeline.js … owners.js の区間で、TK.HIST のその城の持ち主の変更を置き換える
   county-map.js     … 郡の形と、その日の城の持ち主から郡の色を決めて塗る
   county-clouds.js  … 未導出の郡の雲を、地図とは別の層で流す
```

### 決めたこと（2026-11-13、利用者）

| 項目 | 決定 | 比べた案 |
|---|---|---|
| 領地の元 | 城を保持しているかを元にする。郡は区分の層で、色は郡の中の城の持ち主から決める | 所有も郡ごとにする（Alternative B） |
| 郡の層を作るか | 今から作る | 城の持ち主の区間だけを作り、郡の層は後に回す（Alternative A） |
| ゲーム用の書き出しを作る所 | Django の管理コマンド。史実 DB に取り込んで問い合わせて書き出す | Node で JSON から直接作る（Alternative E） |
| 郡の原本を使う計算 | 手元の GeoDjango だけで行い、結果の郡の形を Git に入れる。静的書き出しは地理ライブラリを使わない | 手元から公開する（Alternative F）、ゲーム用の書き出しそのものを Git に入れる（Alternative G） |
| 郡の形の持ち方 | 簡略化した郡の多角形（GeoJSON） | 郡の画像のタイル、城の領域の画像への焼き込み（Alternative H） |
| 利用条件 | 郡の形は CC BY-NC 4.0 の派生物として、出典を表示して非営利で配る。国絵図は非営利で公開する | 自由な利用条件の境界を先に探す |
| 城の持ち主の元 | 支配の記録から作った区間で、ゲームの年表のその城の持ち主の変更を置き換える | ゲームの今の状態だけで塗る（Alternative I）、地域ごとに段階的に移す（Alternative J） |
| 推定の塗り | 推定（`castle-point`・`province-uniform`）も出典ありと同じ見た目で塗り、根拠は指したときに出す | 推定に細かい印を付ける、推定も雲にする |
| 持ち主の決まらない日 | 記録で `undetermined` の城は直前の確認済みの持ち主を持ち越す。`contested` の城は直前の持ち主の色に 2 色の斜線を重ねる | 雲にする、無地にする |
| 郡の中の分け方 | 持ち主の違う城がありうる郡は、城の点で区画に分け、区画ごとに塗る。施設・村は後の設計 | 分けずに直前の色を引き継ぐ、村まで今入れる |
| 城の区分 | 主城・支城の区分をやめ、すべて城とする。行軍の道の点かどうかは「行軍拠点」の属性で持ち、今の 122 城のまま | 358 城すべてを行軍拠点にする（行軍日数と史実の着陣日が変わる） |
| 合戦と城の日付 | 支配の記録の日を採り、その城については合戦に結びついた明け渡しを外す | 合戦の日を採る、ずれたら置き換えない |
| 雲の色と動き | 色の無い白い半透明の雲を、いつも流す（止めている間も）。地図とは別の層にして、本体の描き直しは止めている間は眠ったままにする | 候補の家の色を透かす、指したときだけ候補を出す／郡ごとに固定、つながる範囲でまとめる、時計が進んでいる間だけ流す |

### 1. 郡の形（手元だけで作り、Git に入れる）

`docs/architecture/replatform-plan.md` 段 7c・7d の GeoDjango の取り込みを使う。手順は、地理ありの設定（`DJANGO_SETTINGS_MODULE=config.settings.geo`）で `migrate` → `load_codh_kg`（CODH の郡 806・国 85）→ `link_places`（城と史実 DB の場所を郡に結ぶ）→ `write_county_tables`。

*   `gun-shapes.geojson`：郡の多角形を、隣の郡と境を共有したまま簡略化したもの。属性は `id`（CODH の ID）・`name`・`yomi`・`kuni`（国の ID）・`kuniName`・`castles`（その郡にある城の鍵の一覧、城が無ければ空。`link_places` の結果を書き出す）。ブラウザは、郡の中の城と国の城の一覧を、この属性だけから引く。
*   `gun-cells.geojson`：城が 2 つ以上ある郡を、城の点のボロノイ分割で区画に分け、郡の形で切ったもの。属性は `gun`・`castle`（城の鍵 `castle:<id>`。今の支城の id もこの形に揃える）。
*   `gun-exceptions.geojson`：例外の郡（下の 3 の例外の一覧）。形は持たず（`geometry` は `null`）、属性 `gun` で `gun-shapes.geojson` と結ぶ（同じ多角形を二重に配らないため）。属性は `gun`・`from`・`to`・`rule`（`context`：その区画の色、`neutral-without-castle`：その日に郡の中に存在する城が無いときだけ中立の色）・`key`・`source`。
*   郡の外にある城は、出典付きの対応表 `kuniezu/map/admin/castle-gun-overrides.json` で扱う。`assign` は郡を手で決める城（能島城を越智郡に。小島が CODH の郡の形に含まれないため、利用者の決定 2026-11-13）、`outsideJapan` は日本の郡を持たない朝鮮の 26 城。`link_places` は、どちらにも無い城が郡の外にあると止まる。
*   簡略化と区画の分割は、Django を起動しない道具 `tools/geo/county_tables.py`（Shapely）で行う（`replatform-plan.md` の「Shapely は Django を起動しない道具に使う」に従う）。管理コマンドは GeoDjango の結果を GeoJSON で渡す。
*   作り直すのは、城の座標が変わったときと、郡の原本の版が変わったときだけ。座標を変える PR の作者が手元で作り直す。CI は原本を持たないので作り直せない。代わりに、郡の形の属性・件数・ID の順と、城の点が `gun-cells.geojson` の区画とずれていないこと（点が区画の中にある）を検査する。
*   3 つの GeoJSON は `kuniezu/map/admin/` に置き、地図の生成（`tools/map/build-vector-assets.cjs`）が配信物に写す。

### 2. 城の持ち主の区間と年表の置き換え

*   **支配の記録**：`docs/designs/territory-control.md` の記録の形（城ごとの観察 `held`・`contested`・`undetermined`・`not-applicable`、期間・出典・箇所・読んだ深さ・`variantOf`）と入力の検査をそのまま使う。その設計の段 1（器）と段 3（試行）は、この設計の PR として行う。記録は史実 DB に取り込む（その設計の「DB の外に置く」をこの設計で置き換える。6 の表）。記録の対象は、その設計の「日本のノード 123 件」から、この設計の城の一覧に広げる（6 の表）。
*   **区間の導出**（Python、`export_game_data`）：城ごとに、記録から区間 `{from, to, clan, status, claimants?, sources}` を作る。
    *   記録は `territory-control.md` の 2 種類（持ち主が替わった変化 `change`、ある時点の観察 `observation`）。変化の日から次の変化までと、`held` の観察の期間 → `confirmed`。
    *   `contested` → `contested`。係争に加わる家は、記録の `claimants`（2 家以上）をそのまま `claimants` に持つ。郡の 2 色の斜線は、直前の持ち主と、`claimants` のうち記録の順で最初の別の家の 2 色にし、指したときには全員の家を出す。
    *   `undetermined` → 直前の `confirmed` の家で `carried`。直前に確認済みの家が無ければ区間を作らない。
    *   `not-applicable` → 区間を作らない。
    *   `territory-control.md` の導出の区分（10 種類）との対応は、その設計の区分を上の 3 つに写す表として `export.py` の試験に書く。その設計の「係争・不明の後は家を引き延ばさない」は、この設計では「直前の確認済みの家を持ち越す」に置き換える（8 の表）。
    *   区間の無い期間は書き出さない。その期間は、今のゲームの年表 `TK.HIST` が持ち主を決める。
*   **年表への当て方**（`owner-timeline.js`）：
    *   `TK.OWNER_TIMELINE` が `null`（既定の空の `owners.js`）なら何もしない。
    *   行軍拠点でない城の区間は、年表を書き換えず、`G.yOwner` を包んで、区間があればその家、無ければ今の値を返す形で当てる（ゲームの状態は増やさない）。城そのものの表示（`ui.js` の `drawYosho`）と周辺施設の一覧は `G.yOwner` を使っているので、郡の色と城の表示は食い違わない。`G.castleOwner(key)` は行軍拠点の城なら `S.castles`、それ以外なら `G.yOwner` を返す。以下は行軍拠点の城の区間の当て方。
    *   区間に重なる `TK.HIST` の出来事は**消さない**。出来事の城の一覧（`castles`、入れ子の `take`）から、その区間に当たる城だけを抜く。`absorb`・`takeall` のように家ごとに城を移す出来事には、区間に当たる城を移さない一覧（`keep`）を足す。`absorb` で、吸収される家が `keep` の城を持ち続けるときは、その家を滅ぼさず（`alive` を保つ）、吸収先に従う家（`S.vassal`）として残す。武将と部隊の扱いは今のまま吸収先へ移す（例：「富山の役」の日をまたいで佐々家の区間があるとき、佐々家は区間の城を持つ従属の家として残り、区間の境の受け渡しも生存の条件を満たす）。`newclan` で城が全部抜けたときは、家の誕生だけを残す。今の `engine.js` の `newclan` は城が 0 だと家を作らずに終わるので、城の受け渡しと家の誕生を分け、`castles` が空でも誕生の処理（家・当主の登場）を行うよう直す（例：「津軽為信の自立」の `castles:['ishikawa']` を抜いても津軽家は生まれる）。こうして、出来事に付く軍勢の出陣（`histMarch`）・部隊の解放（`relayUnits`）・死去や臣従（`applyExtras`）は変えない。
    *   **行軍の目的地を残す**：城を抜く前に、元の出来事の行軍の目的地（`castles` の先頭）を `marchTo` に写す。出陣の準備（`engine.js` の `preMarch`、`(ev.castles||[])[0]` を目的地にする）と `histTake` の行軍（`histMarch`）は、`ev.marchTo` があればそれを使う。こうして、例えば「長尾景虎の関東出兵」（`castles:['numata']`）は、沼田に区間があっても出兵の軍勢を出す。
    *   区間の境では、軍勢を出さない受け渡しの出来事（`k:'take'`、`admin:true`）を足す。
    *   **新しいゲームの初期配置**：`G.newGame` の包みで、シナリオの開始日を含む区間がある城は、`TK.SCEN.owners` から作った初期の持ち主をその区間の家で上書きする（開始前の `TK.HIST` は当てられないため、境の受け渡しだけでは反映されない）。古い保存の読み込み（`G.setS`）では上書きしない。
    *   合戦に結びついた明け渡し（`battle-timing.js` の `resolveHistoricalTake`）は、出来事の日付がその城の区間の中にある場合だけ外す。区間の外の明け渡しは今のまま行う。合戦の日付は変えない。
    *   当てる時点は、`G.newGame` と `G.setS` を包んで状態を作る直前にする。古い保存の補正（`history-state-migration.js` の `legacyDeathSignature`）が置き換え前の `TK.HIST` で署名を作れるよう、置き換え前の写しを残す。
*   **保存**：古い保存の扱いは、既にある `G.histSig`／`G.fixHist`（`engine.js:149-151`、年表の題名と日付の署名が変わったら、保存の時点より前の出来事を当て直さずに引き直す）に任せる。受け渡しの出来事を足すと署名が変わる。城を抜くだけの変更では署名が変わらないので、その場合も保存の時点より後の出来事だけに効くことを検査で確かめる。
*   **認めた差**：記録を足すと着陣日・行軍日数が変わりうる。全期間の比べる検査は、`data/verification/owner-timeline-accepted-diffs.json`（城・日付・差の中身・支配の記録の ID・理由・承認者）に無い差があれば失敗にする。記録を足す PR は、その差をこの一覧に足す。

### 3. 郡の塗り（ゲームの中で、日付か城の持ち主が変わるたびに全部を計算する）

`county-map.js` が、その日の城の持ち主から、郡と区画ごとに色と根拠の種類を決める。郡は 806、区画を足しても千程度なので、日付か城の持ち主が変わるたびに全部を計算し直す。

0.  **城の持ち主**：`G.castleOwner(key)`（行軍拠点の城は年表の置き換え後の `S.castles[id].owner`、それ以外は区間か `G.yOwner`）。存在する期間の外の城（`G.yActive` が偽）は数えない。
1.  **例外**：`gun-exceptions.geojson` の期間に当たる郡は、その決め方に従う。一覧は閉じている：
    *   蝦夷地（渡島を除く北海道の郡）：`context:ainu`（今の地図と同じアイヌの区画の色）。
    *   奄美の大島（`G70011`）：1609 年までは `context:ryukyu`、以後は規則どおり。
    *   佐渡・壱岐・隠岐の郡：その日にその郡に存在する城（`G.yActive` が真）が無いときだけ、今の地図の中立の区画（`definition.csv` の `neutral:*`）と同じ色。城がある期間（壱岐の勝本城、佐渡の羽茂城など）は例外にせず、規則 2・3 で決める。
    *   渡島のうち和人地（上ノ国天ノ川〜知内、2026-11-04 の割り当て）を含まない爾志・茅部・亀田の 3 郡：`context:ainu`。和人地を含む松前・檜山・上磯の 3 郡は例外にせず規則どおり（檜山・上磯は郡の一部だけが和人地だが、郡の細かさでは分けられないので、上ノ国・知内を含む郡として蠣崎家の側に入れる）。
    *   今の `kuniezu/map/control/gun-overrides.json` の日本の行（`G70011`）はこの一覧に移し、元のファイルからは消す（朝鮮の行は朝鮮の削除の段で扱う）。
2.  **城のある郡**（`castle-point`）：郡の中の城の持ち主がすべて同じならその家で郡ごと 1 色。違えば `gun-cells.geojson` の区画ごとに、その区画の城の持ち主で塗る。同じ家の区画どうしの間には線を引かない（郡の境の線は残す）。
3.  **城の無い郡**（`province-uniform`）：同じ国の城が、その日すべて同じ家ならその家。国に城が 1 つしか無い場合も同じ扱いで、指したときに「国の城が 1 つ」と添える。
4.  **それ以外**（`underived`）：未導出。城の無い郡で、同じ国の城が複数の家に分かれているか、国に城が 1 つも無い郡（今は河内・志摩・安房）。

指したときに必ず根拠を表示し、これを忠実さの基準の「確かめていないものに付ける印」とする。持ち越し（`carried`）の城と、記録の無い期間の城（今の年表のまま）は、根拠の説明に「持ち越し」「記録の無い期間」と添える。

描画は `vector-map.js` の面の塗り（`paintControl`、鍵から色を返す関数を受ける）に郡と区画の面を渡して行う。

### 3a. 国境の線（PR 3 で足した）

郡の塗りでは、勢力どうしの国境の線（外交を国境で表す線）も郡の境に沿わせる。`gun-edges.geojson` の境ごとに、両側の単位（`gun:<郡>` か `cell:<郡>|<城>`）の持ち主を規則で決め、違えば今の描き方（`ui.js` の `borderStyle`）で引く。同じなら、郡の境だけを細く引く（同じ郡の区画どうしの間には引かない）。持ち主の分からない側（未導出・例外）には国境を引かない。郡の塗りのときは、地図の面を押しても城を選ばず、郡の説明を出す（城は城の点を押して選ぶ）。

### 4. 係争の斜線と雲

*   **係争**：区間が `contested` の城がある郡（区画があればその区画）に、持ち主と、`claimants` のうち最初の別の家の 2 色の斜線を重ねる。斜線は地図に貼りつく模様（`ui.js` の海の模様と同じ作り）にする。
*   **雲**：未導出の郡の上に、色の無い白い半透明の雲を重ねる。雲は地図の canvas とは別の層（`county-clouds.js`）にする。層は 2 つの要素で作る。外側は、未導出の郡の形の型（マスク）で、日付か表示範囲が変わったときだけ作り直し、動かさない。内側は、繰り返しの雲の模様で、CSS のアニメーション（模様の位置か `transform`）でゆっくり流す。型は郡に固定されているので、雲は流れても既知の郡にはみ出さない。こうすると、雲がいつも流れていても、本体の描き直しのループ（`ui.js` の止めている間に眠る仕組み）は眠ったままでよい。画面が隠れている間（`document.hidden`）と、OS の「動きを減らす」設定（`prefers-reduced-motion`）のときは流れを止める。流れの速さは 1 か所の定数で調整する。

### 5. 不足の報告

CI の成果物として `territory-coverage.json` を出す（コミットしない）。郡の根拠の種類ごとの数と未導出の数は、Node の検査 `tools/checks/county-map.cjs` が、ゲームと同じ `county-map.js` の規則で、基準の日付（各シナリオの開始の日と 1615 年末）について数える。城ごとの確認済み・係争・持ち越しの区間の長さは、`export_game_data` が数える。郡の規則は JavaScript の 1 か所だけに置く。

### 6. 既存の決定の置き換え

| 文書 | 元の決定と理由 | この設計での扱い |
|---|---|---|
| `docs/architecture/replatform-plan.md` 段 7「この段でしないこと」 | 城の支配域を郡から導かない。理由は、対応表 `gun-assignment.csv` が保守されていない、郡の中を城で分けた所（長岡郡）がある、児島湾・早島の修正が表に入っていない | 郡の色を、その日の城の持ち主から規則で導く形に改める。`gun-assignment.csv` は使わず、城と郡の対応を郡の面と城の点から作り直す。郡の中に持ち主の違う城があれば、城の点で分けた区画ごとに塗る。陸と水の年代の違い（児島湾・早島）は、郡の塗りの下の陸・水の面（`kuniezu/map/physical/land.geojson`・`water.geojson` と `control/subcell.geojson`）がそのまま担う |
| `docs/architecture/replatform-plan.md` 段 7d | `link_places` は史実 DB の場所だけを郡に結ぶ | `link_places` が城も郡に結ぶ |
| `docs/designs/territory-control.md`（支配の記録を DB の外に置き、導出は Node の `control-derive.cjs`） | 理由は、記録の項目と語彙は試行で変わりうる | 支配の記録を史実 DB に取り込み、導出をゲーム用の書き出しで行う。語彙が変わる危険は、PR の順番で試行（PR 5）を DB の書き出し（PR 6）より先に行って小さくする。記録の形と入力の検査はその設計のまま。導出の区分のうち「係争・不明の後は引き延ばさない」は「直前の確認済みの家を持ち越す」に置き換える。`control-derive.cjs` は作らず、入力の検査の中の期間の計算（`span`）は Node の入力の検査に置く |
| `docs/designs/territory-control.md`（記録の対象はノード 123 件で、支城は受けない） | 理由は、ゲームで独立に所有者を持つのがノードだけだから | 主城・支城の区分をやめ、記録の対象をこの設計の城の一覧に広げる。行軍拠点でない城の持ち主は、記録の区間から計算する（技術計画 2） |
| `docs/architecture/raster-map.md` の「郡による区分」 | 城の領域は「日付つきで城の管轄に属する郡の和」と合意しつつ、実装は日付の無い多数決（`gun-assignment.csv`） | 「日付つき」を正とする。郡の色をその日の城の持ち主から導くので日付つきになる。`gun-assignment.csv` は移行時の記録として残し、使わない |

### 7. 切り替え

表示設定「領地の塗り：郡／城の領域」を置き、既定を郡にする。城の領域を選ぶと、今の塗り（`provinces.png` と `definition.csv`、`TKGEO.terr`、`subcell.geojson`）で描く。古い形の撤去と、城どうしの隣接（`G.ADJ`、古い形から作っている）を固定の表に移すことは、別の設計で行う。

--------------------------------------------------------------------------------

## Alternatives Considered

### Alternative A: 城の持ち主の区間だけを作り、郡の層を後に回す

*   **Pros**: 郡の形・利用条件・雲の判断が要らず、城の持ち主を出典で確かめる仕組みに最も早く届く。
*   **Cons**: 郡の区分が地図に出ず、くっきりした城の領域の線が残る。城の領域の形の 3 系統も残る。
*   **Reason for Rejection**: Rejected by author: 郡は当時の実際の地域区分で、利用者は郡の区分を地図に出すことを目的の一つにしている。郡の層は城の持ち主の区間に依存せず（その日の `S.castles` だけを見る）、PR の順番では郡の塗りを先に出せるので、後に回す得は小さい。

### Alternative B: 所有も郡ごとにする

*   **Pros**: 郡ごとに持ち主・石高を持ち、郡を一つずつ取り合える。将来の非史実ルートにそのまま使える。
*   **Cons**: ゲームのエンジン（時間を進め、軍勢を動かし、兵と行軍日数を計算する `engine.js`。城ごとの状態への参照が `engine.js` だけで 193 か所、2026-11-13 に数えた）・年表・保存・画面の作り直しになる。史料が郡ごとの持ち主を言う場面は限られ、多くの郡の持ち主が推定になる。
*   **Reason for Rejection**: Rejected by author: 今は史実観察が目的で、史料は城の持ち主で語ることが多い。城の保有を元にすれば、エンジンと保存を変えずに郡で描ける。

### Alternative C: すべて計算した境で描く

*   **Pros**: 郡を区分の線だけにし、勢力の広がりを全国で城からの計算で描く。境目の帯の姿に近い。
*   **Cons**: 地図全体が推定になり、規則で決まる所と決まらない所が見分けられない。
*   **Reason for Rejection**: Rejected by author: 規則で決まる郡は塗り、決まらない所だけを雲で描く組み合わせの方が、どこが不明かを示せる。

### Alternative D: ぼかしで不明を描く

*   **Pros**: 計算した勢力の広がりを、なめらかなにじみで描ける。
*   **Cons**: ぼかしの濃さが勢力の強さを測った値に見える。史料にある係争とデータの足りない所が同じ見た目になる。
*   **Reason for Rejection**: Rejected by author: 係争は 2 色の斜線、データの足りない所は雲として見た目を分ける。雲は「確かでない」を表し、強さを表さない。

### Alternative E: 史実 DB を通さず、Node で直接書き出す

*   **Pros**: 既存の `tools/research/export-evidence.cjs` と同じ形で、出典付きの JSON から直接作れる。史実 DB にも地理ライブラリにも頼らない。
*   **Cons**: ゲームは史実 DB を読まないまま。年・対象で引く処理を史実 DB と別にもう 1 つ書くことになる。
*   **Reason for Rejection**: Rejected by author: 史実 DB を中心にしてゲームを動かす。史実 DB を通すと、年・対象・場所の検索と到達できない移動の検査（`queries.legs`）を書き出しの検査にも使える。

### Alternative F: 手元から公開する

*   **Pros**: 全部を手元の Django（地理あり）で作れて単純。
*   **Cons**: PR を取り込んでも自動では公開されず、公開が手元の機械に頼る。
*   **Reason for Rejection**: Rejected by author: 郡の原本を使う計算の結果（郡の形）だけを Git に入れれば、公開は今までどおり自動で行える。

### Alternative G: ゲーム用の書き出しそのものを Git に入れる

*   **Pros**: 静的書き出しに史実 DB が要らず、変更が PR の差分に出る。
*   **Cons**: 記録を足すたびに作り直してコミットする手順が増え、コミット済みのファイルが大きくなる。
*   **Reason for Rejection**: Rejected by author: 静的書き出しの中で一時の SQLite に取り込めば、作業者は支配の記録だけをコミットすればよい。

### Alternative H: 郡の形を画像のタイル、または城の領域の画像への焼き込みで持つ

*   **Pros**: 画像のタイルは今の `raster-map.js` の仕組みと当たり判定をそのまま使え、軽い。焼き込みは配るものが増えない。
*   **Cons**: 画像のタイルは拡大すると郡の境が 100 m の画素のギザギザになる。焼き込みは正本が 2 つになり、形の系統を 1 つにまとめる目標と逆向き。
*   **Reason for Rejection**: Rejected by author: 郡の多角形は、陸・水の面（`vector-map.js`）と同じ描き方にそろい、拡大しても境がなめらか。配る負担（郡 806）は表示範囲で絞れる。

### Alternative I: 郡の塗りの持ち主をゲームの今の状態だけから取る

*   **Pros**: 年表・保存・行軍に手を入れず、城の印と郡の色が必ず一致する。
*   **Cons**: 支配の記録を足しても地図も進行も変わらず、持ち主の事実が 3 か所に重なったまま。
*   **Reason for Rejection**: Rejected by author: 支配の記録で年表を置き換え、記録を足せばゲームが変わる形にする。郡の塗りは年表の置き換え後の `S.castles` を見るので、城の印と郡の色の一致はこの設計でも保たれる。

### Alternative J: 地域ごとに段階的に移す

*   **Pros**: 置き換えの危険を地域ごとに小さく試せる。
*   **Cons**: どの地域が置き換え済みかの管理が要り、2 つの持ち主の元が並ぶ期間が長くなる。
*   **Reason for Rejection**: Rejected by author: 置き換えは区間のある城だけに効き、区間の無い城は今の年表のままなので、全国を一度に切り替えても実際に変わるのは記録のある城だけになる。段階の管理は要らない。

--------------------------------------------------------------------------------

## Risks & Mitigations

| 危険 | 影響 | 対策 | 確かめ方 |
|---|---|---|---|
| 年表の置き換えで、出来事に付く軍勢・部隊の解放・死去などが変わる | 史実の進行が壊れる | 出来事は消さず、区間に当たる城だけを抜く（技術計画 2） | 全期間の比べる検査（着陣日・行軍日数・兵の配分・家の誕生・合戦の結果）と認めた差の一覧 |
| 雲をいつも流す負担 | 止めている間の発熱・電池 | 雲を別の層にし、本体のループは眠ったまま。画面が隠れているときと動きを減らす設定のときは止める | 止めている間の CPU と描き直しの回数を雲の有り・無しで測る |
| 試行の前に史実 DB の型を固めると、語彙が変わったときに手戻りする | PR のやり直し | 東海の試行（PR 5）を、DB の書き出し（PR 6）と年表の置き換え（PR 7）より先に行う | 試行の報告で記録の形を確かめてから PR 6 を始める |
| CODH の郡の形に隙間や重なりがあると、位相を保つ簡略化が崩れる | 郡の間に隙間や重なり | 取り込みで GEOS の `valid` と、郡どうしの重なり・隙間を検査し、崩れたら止まる | `tests_geo` の小さな入力の試験と、手元の全件の取り込み |

## Non-Functional Requirements

*   **利用条件**：郡の形は CODH『旧国・旧郡境界データセット』（CC BY-NC 4.0）の派生物。出典を `THIRD_PARTY_NOTICES.md` と画面の出典欄（既にある CODH の表示を直す）に書き、国絵図を非営利で公開する。原本の GeoJSON は Git に入れない。
*   **性能**：郡の形は表示範囲で絞って描く。郡の計算は日付か城の持ち主が変わったときだけ行う。
*   **互換と切り戻し**：既定の空の `owners.js` で動けば今の年表のまま。表示設定で今の城の領域の塗りに戻せる。古い保存は `G.histSig`／`G.fixHist` で扱う。
*   **再現性**：郡の形とゲーム用の書き出しは、並び順・小数の桁を固定し、時刻を含めない。同じ入力からバイト単位で同じものができる。

--------------------------------------------------------------------------------

## Additional Resources

*   [`docs/designs/territory-control.md`](territory-control.md)（支配の記録の形・入力の検査・導出の区分）
*   [`docs/architecture/replatform-plan.md`](../architecture/replatform-plan.md) 段 7（GeoDjango と SpatiaLite）
*   [`docs/reports/HISTORICAL_TERRITORY_UNITS.md`](../reports/HISTORICAL_TERRITORY_UNITS.md)（地片の考え方）
*   [`docs/architecture/raster-map.md`](../architecture/raster-map.md)、[`docs/architecture/codh-vector-map.md`](../architecture/codh-vector-map.md)
*   [CODH『旧国・旧郡境界データセット』](https://geoshape.ex.nii.ac.jp/kg/)（doi:10.20676/00000454）

## Future Improvements

*   **人物の足跡**：`docs/designs/people-trace.md` で扱う。利用者の決定（史実 DB の人物 ID のある人を ID で数え、誕生から 1615 年まで。点を結ぶ線は史料にある経路だけ）を引き継ぐ。場所を郡に結ぶ表（`PlacePoint`）と、史実 DB の国・郡の対象と CODH の ID の対応も、その設計で扱う。
*   **城の追加**：河内の高屋城・飯盛山城のように、今の城の一覧に無い城を、郡の塗りの元として足す。
*   **行軍拠点を増やす**：今の行軍拠点でない城も道の点にするか。行軍日数と史実の着陣日が変わるので、道の作り方と合わせて別の設計で決める。
*   **郡の中の施設・村**：郡の中の区画の元に、施設や村の点を足す。村の点の出どころと戦国期の所属の決め方は別に決める。
*   **出典で郡を治めた城が分かる郡の上書き**：根拠の種類に「出典あり」を足す。
*   **根拠の種類を色分けする制作者向けの表示**。
*   **郡ごとの持ち主**：将来の非史実ルートで、郡を一つずつ取り合う。
*   **古い領域の形の撤去**：`provinces.png` と `definition.csv`、`TKGEO.terr` と 5 つの補修ファイル、`subcell.geojson` を撤去し、城どうしの隣接を固定の表に移す。

--------------------------------------------------------------------------------

## Detailed Implementation Plan

実装は次の 8 つの PR に分ける。各 PR は、依存の列にある PR が main に入ってから始める。各 PR で、手順や構成が変わる文書（`AGENTS.md`・`README.md`・`README.en.md`・`docs/structure.md`・`tools/checks/README.md`）を同じ PR で直す。

| PR | 中身 | 依存 |
|---|---|---|
| 1 | 既存の決定の置き換え（文書だけ）とこの設計の保存 | なし |
| 2 | 郡と国の取り込み（段 7c）と郡の形の書き出し | 1 |
| 3 | 郡の塗り・区画・止まった雲と、城の持ち主を返す `G.castleOwner`（今の `S.castles` と `G.yOwner` で塗る） | 2 |
| 4 | 支配の記録の器（記録の形・入力の検査）。`territory-control.md` の段 1 | 1 |
| 5 | 東海の試行地域で支配の記録を登録し、作業量を報告する。`territory-control.md` の段 3 | 4 |
| 6 | 支配の記録の史実 DB への取り込みとゲーム用の書き出し（`export_game_data`）、静的書き出しへの組み込み | 5 |
| 7 | 年表の置き換え（`owner-timeline.js`）、係争の斜線、全期間の比べる検査と認めた差の一覧 | 3, 6 |
| 8 | 雲を流す（別の層と負荷の測定） | 3 |

### Target Files to Create/Modify

#### PR 1：文書

##### 1. `docs/designs/county-territory.md` (Create)
*   **Type / Scope**: 設計書
*   **Proposed Changes**: この設計を置く。

##### 2. `docs/architecture/replatform-plan.md` (Modify)
*   **Type / Scope**: 計画書
*   **Proposed Changes**: 段 7 の「この段でしないこと」の「城の支配域を郡から導かない」「領土の史実照合への接続」と、段 7d の `link_places` の範囲を、この設計の技術計画 6 の表のとおり置き換え、日付（2026-11-13）・決めた人（利用者）・この設計への参照を書く。

##### 3. `docs/designs/territory-control.md` (Modify)
*   **Type / Scope**: 設計書
*   **Proposed Changes**: 「支配の記録を DB の外に置く」と「導出は `control-derive.cjs`」「記録の対象はノード 123 件」を、この設計で置き換えたと注記する。段 1（器）と段 3（試行）はこの設計の PR 4 と PR 5 として行うこと、「係争・不明の後は引き延ばさない」を「直前の確認済みの家を持ち越す」に置き換えることを書く。

##### 4. `docs/architecture/raster-map.md` (Modify)
*   **Type / Scope**: 構成の文書
*   **Proposed Changes**: 「郡による区分」の「日付つきの郡の和」を正とし、`gun-assignment.csv` は移行時の記録で使わないと書く。古い経路（`kuniezu/map/gun/`、`data/map/`）を今の場所（`kuniezu/map/admin/`・`control/`）に直す。

#### PR 2：郡と国（手元の GeoDjango）

##### 5. `tools/geo/fetch_codh_kg.py` (Create)
*   **Type / Scope**: 取得の道具（Python、地理なしで動く）
*   **Proposed Changes**: `kuniezu/map/admin/gun.csv` の日本の `codh_id`（`G` の 806 件）と国 85 件の GeoJSON を `https://geoshape.ex.nii.ac.jp/kg/geojson/<ID>.geojson` から `.cache/codh-kg/geojson/` へ取得する。`--check` は手元のファイルを manifest と照合する。

##### 6. `data/inputs/codh-kg/manifest.json` (Create)
*   **Type / Scope**: 取得の記録（Git に入れる）
*   **Proposed Changes**: `data/inputs/codh-edo/manifest.json` と同じ項目で、891 ファイルの ID・SHA-256・大きさ、取得日、ライセンス（CC BY-NC 4.0）、クレジット、DOI。原本は入れない。

##### 7. `kuniezu/geo/models.py`・`kuniezu/geo/migrations/0001_initial.py` (Modify・Create)
*   **Type / Scope**: Django モデルと移行
*   **Proposed Changes**:
    *   `Kuni`：`codh_id`（一意）、`name`、`yomi`、`geom`（`MultiPolygonField(srid=4326)`）。
    *   `Gun`：`codh_id`（一意）、`name`、`yomi`、`kuni`（外部キー）、`geom`。
    *   `CastlePoint`：`key`（一意、`castle:<id>`）、`waypoint`（行軍拠点か）、`point`（`PointField(srid=4326)`）、`gun`（外部キー、空でもよい）。
    *   `GunCell`：`gun`、`castle`（`CastlePoint` への外部キー）、`geom`。

##### 8. `kuniezu/geo/management/commands/load_codh_kg.py` (Create)
*   **Type / Scope**: 管理コマンド
*   **Proposed Changes**: `--source <ディレクトリ>`。`LayerMapping` で国、郡の順に全件を作り直す（1 つの取引の中）。`LayerMapping` は同じ ID の多角形をまとめないので、取り込んだ後に同じ `codh_id` の多角形を 1 つの MultiPolygon にまとめる処理を書く。同じ ID の部品が接しているときは溶かし合わせて 1 つの正しい形にし、それでも GEOS の `valid` でない形は ID を挙げて止まる。郡どうしの隙間と重なりは、書き出しの道具（`tools/geo/county_tables.py`）が `coverage_is_valid` で確かめ、崩れていれば止まる（2026-11-13 の原本は隙間・重なり 0）。

##### 9. `kuniezu/geo/management/commands/link_places.py` (Create)
*   **Type / Scope**: 管理コマンド
*   **Proposed Changes**: 城の一覧（`data/research/implemented-sites.jsonl` の `castle-node` の行を行軍拠点、`kind` が `城` の行をそれ以外として。後者が `G.YOSHO` の城と同じものかを照合する）を `CastlePoint` に入れ、点を `covers` で含む郡に結ぶ。2 郡に当たる点は `codh_id` の文字列の昇順で先の郡にし、一覧を標準出力に出す。どの郡にも入らない点（朝鮮の城など）は結ばない。

##### 10. `tools/geo/county_tables.py` (Create)
*   **Type / Scope**: Django を起動しない道具（Shapely）
*   **Proposed Changes**: GeoJSON の郡と城の点を受け、(1) 郡の多角形を `shapely.coverage_simplify` で簡略化（許容幅は 0.0002 度で固定。2026-11-13 に 806 郡で測った最大のずれは約 85 m で、今の地図の 1 画素（100 m）より小さい。島は消えず、面積の変化は最大 1.3%）、(2) 城が 2 つ以上ある郡を城の点のボロノイ分割で区画に分けて郡の形で切る、(3) 例外の郡を取り出す。出力は並び順を ID の順、座標を小数 5 桁（約 1 m）に固定する（6 桁では `gun-shapes.geojson` が Cloudflare の 1 ファイルの上限 25 MiB に近づくため）。郡どうしの隙間は、幅 1e-6 度（約 0.1 m）未満をデータの食い違いとして拒む（1〜10 m の隙間は細い海峡・水路でありうるので拒まない）。

##### 11. `kuniezu/geo/management/commands/write_county_tables.py` (Create)
*   **Type / Scope**: 管理コマンド
*   **Proposed Changes**: GeoDjango の郡・城の点・例外の表（`kuniezu/map/admin/gun-exceptions.json` の定義）を GeoJSON にして `tools/geo/county_tables.py` に渡し、`kuniezu/map/admin/gun-shapes.geojson`・`gun-cells.geojson`・`gun-exceptions.geojson` を書く。

##### 12. `kuniezu/map/admin/gun-exceptions.json` (Create)
*   **Type / Scope**: 例外の定義（出典付き）
*   **Proposed Changes**: 技術計画 3 の 1 の閉じた一覧（郡の ID・`from`・`to`・`rule`・`key`・`source`）。`kuniezu/map/control/gun-overrides.json` の `G70011` を移す。

##### 13. `kuniezu/map/control/gun-overrides.json` (Modify)
*   **Type / Scope**: 例外の表
*   **Proposed Changes**: 日本の行（`G70011`）を消す。

##### 14. `kuniezu/map/admin/gun-shapes.geojson`・`gun-cells.geojson`・`gun-exceptions.geojson` (Create)
*   **Type / Scope**: 郡の形（Git に入れる、CC BY-NC）
*   **Proposed Changes**: 11 の出力。`tools/map/build-vector-assets.cjs` が `admin` の `.geojson` を配信物に写す。

##### 15. `tests_geo/test_county_tables.py`・`tests_geo/fixtures/codh-kg-mini/*.geojson` (Create)
*   **Type / Scope**: 地理ありの試験
*   **Proposed Changes**: 自作の小さな GeoJSON（2 国・5 郡。島を持つ郡、同じ郡の複数の多角形、壊れた形を 1 つ、重なる郡を 1 組）で、取り込み・まとめ方・壊れた形と重なりでの停止・点の結び付け・区画の分割・出力のバイト単位の一致を試す。

##### 16. `tests/test_county_tables.py` (Create)
*   **Type / Scope**: 地理なしの試験（CI の既定の試験）
*   **Proposed Changes**: コミット済みの 3 つの GeoJSON について、属性・件数（郡 806）・ID の順、城の点（`implemented-sites.jsonl`）が `gun-cells.geojson` の自分の区画の中にあることを確かめる。

##### 17. `THIRD_PARTY_NOTICES.md` (Modify)
*   **Type / Scope**: 出典
*   **Proposed Changes**: 既にある CODH の表示に、郡の形（CC BY-NC 4.0、CODH・人間文化研究機構、DOI）を加える。

#### PR 3：郡の塗り

##### 18. `kuniezu/static/kuniezu/county-map.js` (Create)
*   **Type / Scope**: ゲームのモジュール
*   **Proposed Changes**（PR 3 で実装した形）:
    *   `TKCounty.create({G, project, date})`：郡の形・区画・例外・境の線（`gun-edges.geojson`）を、ゲームの起動を待たせずに読む（`vector-assets.js` で SHA と大きさを確かめる）。`ready()`・`paint()`・`strokeBorders()`・`infoAt()`・`clanAt()`・`signature()` を返す。
    *   `TKCounty.decide({counties, cellsByGun, exceptionsByGun, ownerOf, positionOf, date})`：技術計画 3 の規則で、郡ごとに `{basis, clan|null, context?, cells?, single?}` を返す純粋な関数。区画の城がその日に数えられない（存在する期間の外）ときは、同じ郡で最も近い数えられる城の持ち主で塗る。係争の `claimants` と持ち越しの `carried` は PR 7 で足す。
    *   `G.castleOwner(key)`・`G.castlePosition(key)`：城の鍵から持ち主と位置を返す（行軍拠点の城は `S.castles`、それ以外は `G.yOwner`、存在する期間の外は null）。郡の塗りは城の種類を見ず、この関数だけを使う。
    *   描画：郡と区画を家の色で塗り、未導出の郡に止まった雲を重ねる（`vector-map.js` の `paintControl` と `path`）。国境の線は技術計画 3a。
    *   `signature()`：塗りが変わったときだけ変わる要約。描き直しの合図に入れ、日付だけが変わったとき（行軍拠点でない城の持ち主・城の存在期間・家の滅亡）にも描き直す。

##### 19. `kuniezu/static/kuniezu/ui.js` (Modify)
*   **Type / Scope**: ゲームの画面
*   **Proposed Changes**（PR 3 で実装した形）: 表示設定に「領地の塗り：郡／城の領域」を足し、既定を郡にする（保存しない）。郡のときは `paintBase` の持ち主の層に `TKCounty` の塗りを使い、国境は `gun-edges.geojson` で引く。地図の面を押したときは、ゲームの画面では `hit()` が城の点だけを返し、郡の説明は `hitContext()` が出す（小窓 `context-region`）。家を選ぶ画面では、押した郡（区画）の家を選ぶ。描き直しの合図（`territorySignature`）に `TKCounty.signature()` を入れる。直線距離で支城を塗り分ける古い描画（`drawBranchLands`）は郡のときは止める。検査のため `U.county` と `U.api.w2s`・`s2w` を出す。

##### 20. `kuniezu/templates/index.html` (Modify)
*   **Type / Scope**: テンプレート
*   **Proposed Changes**: `county-map.js` を `vector-ui.js` の後に読む。画面の出典欄の CODH の表示を直す。確認値は `tools/build/stamp-assets.cjs` で付ける。

##### 21. `tools/checks/county-map.cjs`・`tools/checks/fixtures/county-cases.cjs` (Create)
*   **Type / Scope**: 検査（Node、CI）
*   **Proposed Changes**: 固定の状態で、規則の各場合（例外と期間、城のある郡、区画、数えられない区画の城、国の一様さ、国に城が 1 つ、未導出、存在しない城）と、`G.castleOwner` の 3 つの場合を確かめる。各シナリオの開始日と 1615 年末（1600 年の開始から日送り）で根拠の種類ごとの郡の数を数え、CI のログに出す（`--write <ファイル>` で JSON にも書ける。コミットしない）。持ち越しと係争は PR 7 で足す。

##### 22. `tools/checks/county-map-browser.cjs` (Create)
*   **Type / Scope**: 実画面の検査（手元、CI では流さない）
*   **Proposed Changes**: 起動済みの 127.0.0.1:8000 で、1560・1582・1600 年の郡の塗り・雲・指したときの説明を、幅 1400 px と 390 px で確かめ、`data/verification/` に保存する。

##### 23. `.github/workflows/node.js.yml` (Modify)
*   **Type / Scope**: CI
*   **Proposed Changes**: `node tools/checks/county-map.cjs` の手順を足す（数は CI のログに出る）。

#### PR 4：支配の記録の器

##### 24. `data/research/curated/control/README.md` (Create)
*   **Type / Scope**: 入力の説明
*   **Proposed Changes**: `territory-control.md` の記録の形（観察の値 `held`・`contested`・`undetermined`・`not-applicable`、期間・出典・箇所・読んだ深さ・`variantOf`）。対象は日本の城（行軍拠点かどうかに関わらず、鍵は `castle:<id>`）。

##### 25. `tools/research/evidence-store.cjs`・`tools/research/export-evidence.cjs` (Modify)
*   **Type / Scope**: 入力の検査と書き出し
*   **Proposed Changes**: 支配の記録の形を確かめ、壊れた記録を拒む（期間の計算 `span` を含む）。`data/research/control.jsonl` を書く。

##### 26. `tools/checks/control-ledger.cjs`・`tools/checks/fixtures/control-cases.cjs` (Create)
*   **Type / Scope**: 台帳の検査（CI）
*   **Proposed Changes**: 固定の入力で入力の検査を確かめる（`territory-control.md` のとおり）。`node.js.yml` に手順を足す。

#### PR 5：試行

##### 27. `data/research/curated/control/*.json`・`docs/reports/COUNTY_TERRITORY_TRIAL.md` (Create)
*   **Type / Scope**: 記録と報告
*   **Proposed Changes**: `territory-control.md` の東海の試行地域（10〜15 の城）で支配の記録を登録し、1 城あたりの作業量、記録の形の過不足、未導出の郡の数の変化を報告する。記録の形を直す必要があれば、PR 6 の前にこの PR で直す。

#### PR 6：史実 DB への取り込みとゲーム用の書き出し

##### 28. `kuniezu/history/models.py`・`kuniezu/history/migrations/0006_control.py` (Modify・Create)
*   **Type / Scope**: Django モデル
*   **Proposed Changes**: 記録の種類に `control`（支配の観察）を足す。

##### 29. `kuniezu/history/importer.py` (Modify)
*   **Type / Scope**: 取り込み
*   **Proposed Changes**: `load_control()` を足し、`import_all` から呼ぶ。支配の観察 1 件を、`Phenomenon`（支配の種類、`subtype` は観察の値）と `Participation`（行軍拠点の城は `node:<id>`、それ以外は `site:<id>` と家）に写す（`load_timeline` の作りと同じ）。

##### 30. `kuniezu/history/export.py` (Create)
*   **Type / Scope**: Python モジュール（`--no-dev` の環境で動く。Shapely などを使わない）
*   **Proposed Changes**: `owner_timeline()`：技術計画 2 の規則で城ごとの区間を作る。`coverage()`：城ごとの確認済み・係争・持ち越しの区間の長さ。出力の形の例：
    ```text
    TK.OWNER_TIMELINE = {
      version: 1,
      inputsSha256: "<data/research/control.jsonl の SHA-256>",
      castles: {
        "<城の id>": [
          {from: [西暦年, 月, 日], fromJD: <通日>, to: [西暦年, 月, 日] | null, toJD: <通日> | null, clan: "<家>", status: "confirmed" | "contested" | "carried", claimants: ["<家>", …]（contested のとき）, sources: ["<支配の記録の id>"]}
        ]
      }
    };
    ```
    `from`・`to` は、エンジンが読む西暦の配列（`engine.js` の `evT` は `TKCalendar.toJD(...ev.d)` で読み、`calendar.js` は配列をユリウス暦・グレゴリオ暦として解釈する）。書き出しは、支配の記録の日付を史実 DB のユリウス通日にしてから、`kuniezu/history/dates.py` の `jd_to_western` で西暦の配列に変える。旧暦の月・閏月はこの段で解消され、配列には残らない。照合のため、区間に通日 `fromJD`・`toJD` も持たせ、試験で `TKCalendar.toJD(...from) === fromJD` を確かめる。区間は `from` を含み `to` を含まない。並び順は城の id の順、区間は `from` の順。時刻を含めない。

##### 31. `kuniezu/history/management/commands/export_game_data.py` (Create)
*   **Type / Scope**: 管理コマンド
*   **Proposed Changes**: `--output <ディレクトリ>` に `owners.js` と `manifest.json`（`version`・`inputsSha256`・`counts`）を書く。区間の件数がゼロで、支配の記録がゼロでないときは失敗にする。

##### 32. `kuniezu/static/kuniezu/history/owners.js` (Create)
*   **Type / Scope**: 既定の空のデータ（Git に入れる）
*   **Proposed Changes**: `TK.OWNER_TIMELINE = null;`。ゲームの検査（`tools/checks/history-focus.cjs` の `model()`）と開発サーバーは常にこのファイルを読める。手元の開発サーバーで新しい年表を確かめるときは `export_game_data --output kuniezu/static/kuniezu/history` で上書きしてよいが、コミットしない。`tests/test_game_export.py` に、コミット済みのこのファイルが既定の内容（`TK.OWNER_TIMELINE = null;`）であることを確かめる試験を足す。

##### 33. `scripts/build_static.py` (Modify)
*   **Type / Scope**: 静的書き出し
*   **Proposed Changes**: ゲームの静的ファイルを写した後、子のプロセスで `DATABASE_URL=sqlite:///<一時ファイル>` を付けて `manage.py migrate`・`import_history`・`export_game_data --output <dist/client/static/kuniezu/history>` を実行し、既定の `owners.js` を上書きする。どれかが失敗したら書き出しを止める。手元の `db.sqlite3` は触らない。`index.html` の確認値は、上書きした `owners.js` の SHA で付け直す。

##### 34. `tests/test_game_export.py`・`tests/test_build_static.py` (Create・Modify)
*   **Type / Scope**: 試験
*   **Proposed Changes**: 固定の小さな入力で、日付の変換（通日と西暦の配列、閏月を含む旧暦の日付）、区間の規則（`held`・`contested`・`undetermined`・`not-applicable`、直前の確認済みの家が無い場合）、`territory-control.md` の 10 の区分からの対応、2 回の書き出しのバイト単位の一致、件数ゼロでの失敗を試す。`test_build_static.py` の `build()` に書き出しを差し替える引数（`export=`）を足し、既存の試験は空の書き出しを渡す。書き出しのファイルの一覧の期待値に `static/kuniezu/history/owners.js` を足す。

##### 35. `.github/workflows/django.yml` (Modify)
*   **Type / Scope**: CI
*   **Proposed Changes**: `build` の既定の試験の後に、一時の SQLite で `import_history`・`export_game_data` を実行する手順を足す。

#### PR 7：年表の置き換えと係争の斜線

##### 36. `kuniezu/static/kuniezu/owner-timeline.js` (Create)
*   **Type / Scope**: ゲームのモジュール
*   **Proposed Changes**: 技術計画 2 の「年表への当て方」。`TK.OWNER_TIMELINE` が `null` なら何もしない。`G.yOwner` を包んで行軍拠点でない城の区間を返す。城を抜く前に `marchTo` を写す。`G.newGame` の包みで、開始日を含む区間で初期の持ち主を上書きする。`G.newGame` と `G.setS` を包み、状態を作る直前に、置き換え前の `TK.HIST` の写しを残してから、区間に当たる城を出来事の `castles` から抜き、`absorb`・`takeall` に `keep` を足し、区間の境に `admin:true` の受け渡しを足す。

##### 37. `kuniezu/templates/index.html` (Modify)
*   **Type / Scope**: テンプレート
*   **Proposed Changes**: `history/owners.js` と `owner-timeline.js` を、`history-state-migration.js` の直後（`scenario-openings.js` の前）に読む。

##### 38. `kuniezu/static/kuniezu/engine.js` (Modify)
*   **Type / Scope**: エンジン
*   **Proposed Changes**: `absorb`・`takeall` の当て方で、出来事の `keep` にある城を移さない。`preMarch` と `histTake` の行軍の目的地を `ev.marchTo || (ev.castles||[])[0]` にする。`newclan` で城の受け渡しと家の誕生を分け、`castles` が空でも家と当主を作る。`absorb` で `keep` の城が残る家は滅ぼさず、従う家として残す。ほかは変えない。

##### 39. `kuniezu/static/kuniezu/battle-timing.js` (Modify)
*   **Type / Scope**: ゲームのモジュール
*   **Proposed Changes**: `resolveHistoricalTake` で、出来事の日付が `TK.OWNER_TIMELINE` のその城の区間の中にあるときだけ、合戦に結びついた明け渡しをしない（城は記録の日に渡る）。区間の外は今のまま。合戦の日付は変えない。

##### 40. `kuniezu/static/kuniezu/history-state-migration.js` (Modify)
*   **Type / Scope**: 保存の移行
*   **Proposed Changes**: `legacyDeathSignature` が、`owner-timeline.js` の残した置き換え前の写しで署名を作るようにする。

##### 41. `kuniezu/static/kuniezu/county-map.js` (Modify)
*   **Type / Scope**: ゲームのモジュール
*   **Proposed Changes**: 区間が `contested` の城の郡（区画）に、持ち主と、`claimants` のうち最初の別の家の 2 色の斜線を重ねる。`carried` と「記録の無い期間」を説明に添える。

##### 42. `tools/checks/owner-timeline.cjs`・`data/verification/owner-timeline-accepted-diffs.json` (Create)
*   **Type / Scope**: 検査（手元。CI では固定の短い期間だけ）
*   **Proposed Changes**: 全シナリオを全期間日送りし、`TK.OWNER_TIMELINE` を固定の `owners.js`（`sourceOverrides` で差し替え）と `null` で比べ、城の持ち主・着陣日・行軍日数・兵の配分・家の誕生・合戦の結果・史実の軍勢の出陣の差を一覧にする。開始日を含む区間がある城では、新しいゲームの初期の持ち主がその区間の家になることを確かめる。城を全部抜いた `newclan` で家と当主が生まれること、区間の外の合戦に結びついた明け渡しが今のまま起こること、`keep` の城が残る `absorb` で家が滅びないこと、3 家の係争の記録で `claimants` が失われないことを確かめる。認めた差の一覧に無い差があれば失敗にする。CI（`node.js.yml`）では 1 シナリオの 2 年分だけを流す（55 年分は CI の時間に収まらない）。城を抜くだけの変更で `G.histSig` が変わらない場合も、保存の時点より後の出来事だけに効くことを確かめる。

##### 43. 既存の保存の検査 (Modify なし)
*   **Type / Scope**: 合格条件
*   **Proposed Changes**: `tools/checks/chronology-migration.cjs`・`verified-death-dates.cjs`・`castle-era-position.cjs`・`clock-migration.cjs` を、固定の `owners.js` を読ませて通すことを PR 7 の合格条件にする。

#### PR 8：雲を流す

##### 44. `kuniezu/static/kuniezu/county-clouds.js` (Create)
*   **Type / Scope**: ゲームのモジュール
*   **Proposed Changes**: 地図の canvas の上に別の層を置く。外側の要素に、未導出の郡の形の型（CSS の `mask-image`、日付か表示範囲が変わったときだけ作り直す）を付けて動かさず、内側の要素の繰り返しの雲の模様だけを CSS のアニメーションで流す。本体の描き直しのループは起こさない。`document.hidden` と `prefers-reduced-motion` のときは止める。速さは定数 `CLOUD_SPEED` で調整する。地図をパン・拡大したときは、層の位置を本体の視点に合わせ直す。

##### 45. `kuniezu/static/kuniezu/county-map.js`・`kuniezu/templates/index.html` (Modify)
*   **Type / Scope**: ゲームのモジュールとテンプレート
*   **Proposed Changes**: 止まった雲を `county-clouds.js` に置き換え、読み込みを足す。

##### 46. `tools/checks/idle-loop-browser.cjs`・`tools/checks/county-map-browser.cjs` (Modify)
*   **Type / Scope**: 負荷の観測と実画面の検査
*   **Proposed Changes**: 止めている間（ゲームの時計を止めた状態）の CPU と本体の描き直しの回数を雲の有り・無しで測り、本体の描き直しが雲の有無で増えないことを確かめる。パン・拡大で雲の層がずれないことを確かめる。

### Verification Plan

*   **Compilation/Build**: `node tools/map/build-map.cjs`、`uv run python scripts/build_static.py`（PR 6 以降、一時の SQLite で取り込みとゲーム用の書き出しが通る）、`node tools/build/stamp-assets.cjs --check`。
*   **Unit Tests**: `uv run pytest`（`tests/test_county_tables.py`・`tests/test_game_export.py` ほか）、`uv run pytest --ds=config.settings.geo tests_geo`（手元と CI の `build`）。
*   **Static Analysis & Linting**: `uv run ruff check`、`uv run ruff format --check`、`uv run mypy kuniezu config scripts tests tests_geo`、`node tools/checks/offline.cjs`。
*   **Test Coverage Requirement**: 郡の塗りの規則の各場合と、区間の規則の各場合を、少なくとも 1 件ずつ試験で通す。
*   **E2E/Integration**:
    *   `node tools/checks/county-map.cjs`（CI）と `node tools/checks/county-map-browser.cjs`（手元）。
    *   `node tools/checks/owner-timeline.cjs`（手元は全期間、CI は短い期間）：認めた差の一覧に無い差が無い。
    *   既存の保存の検査（項目 43）。
    *   `node tools/checks/idle-loop-browser.cjs`：本体の描き直しが雲の有無で増えない。結果を `data/verification/` に保存する。

--------------------------------------------------------------------------------

<!-- Provenance: Indicates initial structural drafting via EGM. -->
*Drafted with EGM*
