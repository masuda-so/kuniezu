# 藤孝・長益・道三の人物同定と別名

確認2026-11-08。main `0ccefcec` の人物台帳88件・命題155件を基準に調査した。採用する3ID・名前・外部典拠IDは既存人物と重複しない。原本SHA・revision・名ごとの支持は同名JSONに記録する。ゲーム内の細川藤孝はdata.jsのkyo/tango、織田長益はnagashima、斎藤道三はhist.jsで使われる。検査成功を歴史上の事実確定とは扱わない。

## 細川藤孝＝細川幽斎：採用可

NDLの個人典拠00269750の原本は主名細川藤孝、別名欄に「細川, 幽斎」を明記。人物区分Personで、Wikidata Q1207509のP349もこのNDLを指す。京都府「中丹広域振興局からのお知らせ」田辺城の段落も細川藤孝（幽斎）を記す。歌人/武将・田辺城との対応を人物比較の文脈に限って使う。

- 原本：https://id.ndl.go.jp/auth/ndlna/00269750.json
- https://www.wikidata.org/wiki/Special:EntityData/Q1207509.json （rev2492267030）
- https://www.pref.kyoto.jp/koho/dayori/202008/info_chutan.html （田辺城）

重要：取得Wikidata日本語aliasには「細川幽斉」はあるが「細川幽斎」はない。後者の正確な表記はNDL原本で支持する。前回のraw-Wikidataだけの全alias検査をそのまま適用すると誤拒否するため、採用時は名前ごとの支持典拠を分ける。幽斉・長岡藤孝・裸の玄旨などは今回追加しない。

## 織田長益＝織田有楽斎（織田有楽）：採用可

奈良県文化財課「織田氏の末裔の藩」長益の段落は信長の弟で茶人有楽斎として知られる長益と同定する。Wikidata Q837903は主名長益、日本語aliasに有楽斎・有楽を持ち、兄弟に信長Q171411を挙げる。本人と信長/信雄/長孝を混同しない。京都文化博物館特別展解説も検索で見つかったが503で本文を取得できず、本文読了の根拠にしない。

- https://www.pref.nara.lg.jp/ikasu-nara/tonosama/oda/index.html （長益段落）
- https://www.wikidata.org/wiki/Special:EntityData/Q837903.json （rev2556896461）

NDL IDは未確認。推定で補わない。別名の有楽はWikidataで支持、自治体本文で直接確認したのは有楽斎。姓名なしの有楽/如庵等を検索別名に追加しない。

## 斎藤道三＝斎藤利政：採用可

岐阜市「岐阜城の歴代城主」第3節は道三の名乗りとして斎藤利政を記し、父長井新左衛門尉と本人を区別する。Wikidata Q1202670は主名道三、alias利政。NDL00623391は主名道三のみで、利政の別名を原本に載せていない。利政の支持は岐阜市本文とWikidataへ限定。

- https://www.city.gifu.lg.jp/kankoubunka/kankou/1013051/1005097/1034742/1034737.html （3 斎藤道三）
- https://www.wikidata.org/wiki/Special:EntityData/Q1202670.json （rev2554504493）
- https://id.ndl.go.jp/auth/ndlna/00623391.json

NDLの出生1494年と岐阜市の生年不詳は一致しない。今回はどちらも生年命題へ採用しない。父と本人に分ける公的説明に従い、松波庄九郎など父子帰属の論点を伴うaliasは採らない。

## 保存と一次性の区別

`fujitaka-nagamasu-dosan-raw/`にWikidata3件・NDL2件のJSON原本を保存し、URL・revision・SHAを同名JSONと個別NDLノートへ記録した。NDLは同定を直接記載する公開典拠データベースの原本であり、当時の古文書本文ではない。自治体の現代解説、Wikidata集約値、一次の歴史史料を混同しない。歴史文書画像や翻刻を新たに判読したとの主張はしない。

人物同定入力は`curated/people/`へ保持する。新しい生没・所在・改名時期命題なし。既採用の実休・幸綱・道雪・宗麟は対象外。

検索で見つかった京都府警察の舞鶴警察署ページは現本文で細川藤孝の記載を確認できなかったため、支持典拠から除外した。検索抜粋だけで本文確認としない。


## 導入用形式

Wikidata adoptedNamesは原本日本語標目/aliasで直接支持する名前だけ。幽斎はNDLのalternateNames、道三のNDLは主名のみでalternateNames空配列。利政はNDLへ帰属しない。nameEvidenceは名ごとの対応を補助記録する。原本の生没情報は保存メタデータであり採用命題ではない。原本検査はNDLの主名だけを採る場合と、別名を追加する場合を分け、名ごとの支持を確認する。
