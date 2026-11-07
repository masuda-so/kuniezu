# CODH水域574件・戦国期への先取り監査

入力: `/tmp/kuniezu-era-surfaces-reviewed-candidate/water.geojson` / SHA256 `5d8295fd4b67df28fedf4e82c2a76c4d86f8aed39725cffc5783631edc97b1bf`

574件のremarksを全文走査。name null 3件、remarks null 15件。全行と原remarksはJSONのscreenedRowsに保持。全574件の成立史を一次史料で確定したという意味ではない。

## ゲーム切替前の優先判定

|row|名称|分類|推奨|
|---|---|---|---|
|32|内町溜池|postperiod-construction-secondary-supported|exclude-current-pond-from-1560; hold-predecessor-shape|
|57|上堰潟|suspected-postperiod-creation-unverified|hold-1560-adoption-not-proven-absent|
|456|安政池|postperiod-construction-supported|exclude-named-1858-pond; preserve-unknown-predecessor|
|517|公淵池|postperiod-construction-confirmed-public|exclude-current-feature-from-1560|
|528|千歳池|postperiod-construction-secondary-supported|hold-or-exclude-1675-main-pond; predecessor-not-reconstructed|
|518|奈良須池|postperiod-enlargement-with-predecessor-ponds|exclude-1670-large-outline; hold-four-predecessor-outlines|
|523|竜満池|postperiod-construction-tradition|hold-1560-adoption|
|524|衣懸池|postperiod-construction-secondary-supported|hold-1560-adoption|

公淵池の1863成立は県公式の沿革で確認。内町1685・千歳1675は地名辞典の記載で、公的原史料そのものの実見はない。安政池の元remarksは鴨川ダムと補助池を混同している疑いがあり、前身奥池まで全て陸に置き換えてはいけない。奈良須池も前身4池が記載される。

## 証拠と精度

### kagawa-kinbuchi
[公渕池](https://www.pref.kagawa.lg.jp/documents/37437/68.pdf) — 香川県 / PDF 1頁 本文第1・2段落 / public-administration-history-summary
1862年4月着工・1863年9月完成。1930–1933年はその後の拡張。周辺先行池と公渕池の新造を区別。
限界: 新造前の谷全体が完全な乾燥陸だったという細部や前身水域の厳密輪郭。

### kagawa-library
[讃岐ものしり事典 農業（1982年底本の公開翻刻）](https://www.library.pref.kagawa.lg.jp/know/local/local_0005-23) — 香川県立図書館（底本 香川県図書館協会） / 奈良須池・竜満池・衣掛池の各項目 / public-library-hosted-secondary-local-history
奈良須池1670年完成と前身4小池。竜満池1627年築造の伝承。衣掛池は碑に基づく寛永期築造という紹介。
限界: 原碑・原文書の直接実見や、前身各池の1560年時点の形。衣掛項目は寛永3–13年と西暦1627–1637の換算にずれがあり厳密年は未確定。

### hyogo-summary
[東条川疏水 ダム＆池](https://web.pref.hyogo.lg.jp/nhk08/toujyougawasosui/documents/03_07.pdf) — 兵庫県 / PDF 1頁「安政池」本文（抽出時は見出しの列順に注意） / public-administration-history-summary
旧安政池は江戸期。1958–1963は堤防嵩上げ、鴨川ダムの補助水源であり鴨川ダム本体とは別。
限界: 江戸初期の1615以前を直接否定できる創始年月。

### hyogo-history
[安政池（兵庫のため池誌1984年の加筆転載）](https://www.hyogo-tameike.com/activity/2418/) — ひょうごため池保全県民運動 / (1)所在地、(4)築造の経緯、(5)碑、(6)安政ダム / institutional-republication-with-original-document-citations
松沢大深谷、1856年着手・1858年完成。原帳と1859年建立碑の紹介。旧奥池を前身として区別。
限界: 原帳・原碑の直接実見。本文の寛永/嘉永の誤植は採用しない。

### uchimachi-secondary
[内町溜池](https://kotobank.jp/word/内町溜池-3024462) — 平凡社 日本歴史地名大系（コトバンク公開） / 宮城県角田市尾山、築造の段落 / secondary-encyclopedia
1685年築造と尾山の同定。CODH remarksと一致。
限界: 行政側原帳の実見や、築造以前の自然水域の有無。

### uchimachi-city
[農村地域防災減災事業の採択決定について](https://www.city.kakuda.lg.jp/soshiki/13/12433.html) — 角田市 / 内町上・下ため池概要 / public-administration-current-record
角田市南東部の親子ため池である現代の同定。
限界: 1685年築造の検証。

### uwaseki-guide
[上堰潟・仁箇堤ガイドブック 改訂版2023年3月](https://www.niigata-satokata.com/wp-content/uploads/guide_uwaseki2023.pdf) — 新潟市里潟研究ネットワーク掲載 / p1概要、p17聞き取り（PDF頁index1/17） / institutional-guide-local-investigation
既往の潟が乾燥後、1990年代に掘削して人工的に復元されたこと。
限界: CODH remarksの明治初期創始という推測の確認。現代復元を古い潟の初成立と取り違えない。

### uwaseki-city
[上堰潟の魚類相調査報告](https://www.city.niigata.lg.jp/kurashi/kankyo/kataken/kataken_kankoubutsu.files/27nobuo_inoue.pdf) — 新潟市潟環境研究所 / 冊子p45（PDF1頁）はじめに / municipal-research-report
1950年代の潟、1965–1975排水・乾燥、その後の遊水地化という相の区別。
限界: 江戸以前の初成立の時期。

### chitose-secondary
[大野原](https://jlogos.com/ausp/word.html?id=7429201) — 角川日本地名大辞典（JLogos公開） / 開墾・ため池の段落 / secondary-encyclopedia
千歳池は延宝3（1675）築造という記載。
限界: 行政原典・前身青葉池の創始や候補輪郭との厳密対応。

### miyazaki-jaea
[JAEA-Research 2013-047](https://jopss.jaea.go.jp/pdfdata/JAEA-Research-2013-047.pdf) — 日本原子力研究開発機構 / 3.2.1 宮崎平野の歴史地震・隆起沈降の記述 / public-research-report
1662年地震と河口付近沈降の歴史記録、地質的裏付けが不十分という留保。
限界: 蠣原沼のCODH個別面が1560に成立したこと、または全域が乾燥陸だったこと。

## その他の全走査で拾った事項

- row 31 化女沼: later-modification-not-original-creation。ダム化・拡張・現代湖底は古水域の初成立を意味しない。CODHの旧版図輪郭が1560にも存在したかは別の未照合事項。
- row 251 野反湖: later-modification-not-original-creation。ダム化・拡張・現代湖底は古水域の初成立を意味しない。CODHの旧版図輪郭が1560にも存在したかは別の未照合事項。
- row 353 曲り池: later-modification-not-original-creation。ダム化・拡張・現代湖底は古水域の初成立を意味しない。CODHの旧版図輪郭が1560にも存在したかは別の未照合事項。
- row 468 権現池: later-modification-not-original-creation。ダム化・拡張・現代湖底は古水域の初成立を意味しない。CODHの旧版図輪郭が1560にも存在したかは別の未照合事項。
- row 469 泉池: later-modification-not-original-creation。ダム化・拡張・現代湖底は古水域の初成立を意味しない。CODHの旧版図輪郭が1560にも存在したかは別の未照合事項。
- row 530 市越池: later-modification-not-original-creation。ダム化・拡張・現代湖底は古水域の初成立を意味しない。CODHの旧版図輪郭が1560にも存在したかは別の未照合事項。
- row 69 天草池: later-reclamation-or-development-not-proven-construction。埋立/明治開発許可は新池創設と同義でない。水争い・開発の原資料本文を未照合、1560形状は採用可と判定しない。
- row 70 八幡池: later-reclamation-or-development-not-proven-construction。埋立/明治開発許可は新池創設と同義でない。水争い・開発の原資料本文を未照合、1560形状は採用可と判定しない。
- row 71 鷺蔵池: later-reclamation-or-development-not-proven-construction。埋立/明治開発許可は新池創設と同義でない。水争い・開発の原資料本文を未照合、1560形状は採用可と判定しない。
- row 19 古川沼: dam-trace-or-pond-origin-unknown。堰堤痕跡/用水資料による推定だが創設年がなく、戦国期人工池の存在確認にはならない。
- row 24 杭ヶ浦沼: dam-trace-or-pond-origin-unknown。堰堤痕跡/用水資料による推定だが創設年がなく、戦国期人工池の存在確認にはならない。
- row 68 芦池: dam-trace-or-pond-origin-unknown。堰堤痕跡/用水資料による推定だが創設年がなく、戦国期人工池の存在確認にはならない。
- row 74 新池: dam-trace-or-pond-origin-unknown。堰堤痕跡/用水資料による推定だが創設年がなく、戦国期人工池の存在確認にはならない。
- row 76 釜土池: dam-trace-or-pond-origin-unknown。堰堤痕跡/用水資料による推定だが創設年がなく、戦国期人工池の存在確認にはならない。
- row 14 品井沼: later-drainage-or-channel-modification。排水・干拓・掘削・河口変化の記載を湖の新造年と取り違えない。1560の同輪郭はこの記載だけでは保証しない。
- row 49 日出潟: later-drainage-or-channel-modification。排水・干拓・掘削・河口変化の記載を湖の新造年と取り違えない。1560の同輪郭はこの記載だけでは保証しない。
- row 52 楊枝潟: later-drainage-or-channel-modification。排水・干拓・掘削・河口変化の記載を湖の新造年と取り違えない。1560の同輪郭はこの記載だけでは保証しない。
- row 53 円上寺潟: later-drainage-or-channel-modification。排水・干拓・掘削・河口変化の記載を湖の新造年と取り違えない。1560の同輪郭はこの記載だけでは保証しない。
- row 160 仏沼: later-drainage-or-channel-modification。排水・干拓・掘削・河口変化の記載を湖の新造年と取り違えない。1560の同輪郭はこの記載だけでは保証しない。
- row 165 伊豆沼: later-drainage-or-channel-modification。排水・干拓・掘削・河口変化の記載を湖の新造年と取り違えない。1560の同輪郭はこの記載だけでは保証しない。
- row 196 八沢浦: later-drainage-or-channel-modification。排水・干拓・掘削・河口変化の記載を湖の新造年と取り違えない。1560の同輪郭はこの記載だけでは保証しない。
- row 197 新沼浦: later-drainage-or-channel-modification。排水・干拓・掘削・河口変化の記載を湖の新造年と取り違えない。1560の同輪郭はこの記載だけでは保証しない。
- row 198 山信田浦: later-drainage-or-channel-modification。排水・干拓・掘削・河口変化の記載を湖の新造年と取り違えない。1560の同輪郭はこの記載だけでは保証しない。
- row 201 田子沼: later-drainage-or-channel-modification。排水・干拓・掘削・河口変化の記載を湖の新造年と取り違えない。1560の同輪郭はこの記載だけでは保証しない。
- row 214 真崎浦: later-drainage-or-channel-modification。排水・干拓・掘削・河口変化の記載を湖の新造年と取り違えない。1560の同輪郭はこの記載だけでは保証しない。
- row 558 浦尻湾: later-drainage-or-channel-modification。排水・干拓・掘削・河口変化の記載を湖の新造年と取り違えない。1560の同輪郭はこの記載だけでは保証しない。
- row 564 平良大池（仮称）: later-drainage-or-channel-modification。排水・干拓・掘削・河口変化の記載を湖の新造年と取り違えない。1560の同輪郭はこの記載だけでは保証しない。
- row 571 南一ッ目沼: later-drainage-or-channel-modification。排水・干拓・掘削・河口変化の記載を湖の新造年と取り違えない。1560の同輪郭はこの記載だけでは保証しない。
- row 176 象潟: natural-geologic-disappearance。後世地震による消滅はそれ以前の水域の否定にならない。輪郭の精度は別。
- row 560 蠣原沼（仮称）: postperiod-natural-geologic-change。1662沈降で入り江というCODHの相の違いに注意。人工池ではない。元の湿地/岸は別に確認が必要。
- row 136 菱沼: null-remarks-unknown-not-era-clearance。nullを空の歴史的問題なしと扱わない。MLIT5湖/既存採用3水域とCODH null行を区別。
- row 187 浜井川堤: null-remarks-unknown-not-era-clearance。nullを空の歴史的問題なしと扱わない。MLIT5湖/既存採用3水域とCODH null行を区別。
- row 191 江川上谷地溜池: null-remarks-unknown-not-era-clearance。nullを空の歴史的問題なしと扱わない。MLIT5湖/既存採用3水域とCODH null行を区別。
- row 192 沖田溜池: null-remarks-unknown-not-era-clearance。nullを空の歴史的問題なしと扱わない。MLIT5湖/既存採用3水域とCODH null行を区別。
- row 250 千貫沼: null-remarks-unknown-not-era-clearance。nullを空の歴史的問題なしと扱わない。MLIT5湖/既存採用3水域とCODH null行を区別。
- row 382 北沢沼: null-remarks-unknown-not-era-clearance。nullを空の歴史的問題なしと扱わない。MLIT5湖/既存採用3水域とCODH null行を区別。
- row 478 包丁池: null-remarks-unknown-not-era-clearance。nullを空の歴史的問題なしと扱わない。MLIT5湖/既存採用3水域とCODH null行を区別。
- row None 十和田湖: null-remarks-unknown-not-era-clearance。nullを空の歴史的問題なしと扱わない。MLIT5湖/既存採用3水域とCODH null行を区別。
- row None 田沢湖: null-remarks-unknown-not-era-clearance。nullを空の歴史的問題なしと扱わない。MLIT5湖/既存採用3水域とCODH null行を区別。
- row None 猪苗代湖: null-remarks-unknown-not-era-clearance。nullを空の歴史的問題なしと扱わない。MLIT5湖/既存採用3水域とCODH null行を区別。
- row None 木場潟: null-remarks-unknown-not-era-clearance。nullを空の歴史的問題なしと扱わない。MLIT5湖/既存採用3水域とCODH null行を区別。
- row None 余呉湖: null-remarks-unknown-not-era-clearance。nullを空の歴史的問題なしと扱わない。MLIT5湖/既存採用3水域とCODH null行を区別。
- row None None: null-remarks-unknown-not-era-clearance。nullを空の歴史的問題なしと扱わない。MLIT5湖/既存採用3水域とCODH null行を区別。
- row None None: null-remarks-unknown-not-era-clearance。nullを空の歴史的問題なしと扱わない。MLIT5湖/既存採用3水域とCODH null行を区別。
- row None None: null-remarks-unknown-not-era-clearance。nullを空の歴史的問題なしと扱わない。MLIT5湖/既存採用3水域とCODH null行を区別。

## 適用上の条件

- All current CODH features use validFrom1560 despite later construction: do not ship unqualified.
- Remove/hold a water feature and update its derived land counterpart consistently; simply hiding water leaves a false lake hole.
- For predecessor natural water/old ponds, do not fill the whole modern basin as proven dry land. Restore conservative baseline only with its uncertainty recorded.
- No source geometry edited; no replacement outlines constructed by this audit.
- Institutional hosted secondary reference is distinguished from inspected original documents. No original account book/stone rubbing was inspected.
