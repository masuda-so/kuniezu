# B群8名の人物典拠・導入候補

2026-11-09採用追記：以下は調査パケット作成時の記録。人物典拠へ反映し、原本・索引・RDBの検査を終えた。詳細は docs/reports/PERSON_AUTHORITY_EIGHTEEN.md。
確認日2026-11-08。既存91人物と非重複。ゲーム公開JSで名前使用を確認した8名を対象。採用名は各人の現行主名1つだけ。ゲーム内別名の拡張、生没・所在・血縁命題の追加はしない。

|人物|Wikidata|比較典拠|
|---|---|---|
|筒井順慶|Q8192220 rev2550978826|[ndlTsutsuiJunkeiIdentity](https://id.ndl.go.jp/auth/ndlna/00625865.json)|
|筒井定次|Q2748477 rev2556908778|[yamatokoriyamaSadatsuguIdentity](https://www.city.yamatokoriyama.lg.jp/soshiki/hisyoka/shichoshitsu/1/reiwa7/16986.html)|
|蜂須賀正勝|Q1201825 rev2503996779|[ndlHachisukaMasakatsuIdentity](https://id.ndl.go.jp/auth/ndlna/00626437.json)|
|蜂須賀家政|Q1073557 rev2508576099|[tokushimaHachisukaLineIdentity](https://www.city.tokushima.tokushima.jp/smph/johaku/kankoubutsu_zuroku/kankobutsu_zuroku.html)|
|蜂須賀至鎮|Q3125481 rev2556853148|[tokushimaHachisukaLineIdentity](https://www.city.tokushima.tokushima.jp/smph/johaku/kankoubutsu_zuroku/kankobutsu_zuroku.html)|
|九鬼嘉隆|Q921113 rev2552573614|[ndlKukiYoshitakaIdentity](https://id.ndl.go.jp/auth/ndlna/01226769.json)|
|長宗我部盛親|Q589151 rev2549138423|[ndlChosokabeMorichikaIdentity](https://id.ndl.go.jp/auth/ndlna/00625511.json)|
|香宗我部親泰|Q11365662 rev2526196050|[kochiChikayasuIdentity](https://www.pref.kochi.lg.jp/mailmaga/sunsun/2019050700028/)|

## 採否・留意点

- NDL4人は主名・Person型・NDL IDを原本で確認し、Wikidata P349との一致を確認。NDL別名は今回は採用せず空配列。
- 筒井定次は市長の歴史紹介本文で順慶の養子とされ、Wikidata P1038の順慶参照と照合。父の説や生年は採用しない。
- 蜂須賀家政・至鎮は博物館自身の図録紹介本文で正勝→家政→至鎮を区別し、Wikidata父子参照と照合した。図録全巻を読了したという意味ではない。
- 香宗我部親泰は高知県の資料館展示紹介本文で元親の実弟という人物文脈を確認した。展示物や当時の文書を直接判読したものではない。
- 蜂須賀至鎮の幼名等は自治体とWikidataで食い違いがある（自治体は千代丸・豊雄・豊勝・忠告、Wikidataは千松丸・豊雄・忠吉等）。主名以外を追加せず、改名時期も採らない。
- 筒井順慶のWikidata父候補は複数あり、同定比較へ使わない。
- 九鬼守隆・黒田職隆・細川忠利・細川忠隆は今回の公開JS名前検索で使用がなく、対象外。現在登録済みの細川藤孝・忠興、黒田孝高・長政、長宗我部元親・信親・国親は重複追加しない。

## 原本と本文

NDL/Wikidataの無改変原JSONを同階層のauthority-batch-b-rawに保存。JSON読書ノートは原本SHA/revision/名ごとの支持を記録する。自治体HTMLはgzip原本として分離し、台帳へHTML全文を掲載しない。公的な現代解説・典拠DB原本と当時の古文書一次史料は区別する。

## 導入

package/data/research/ の追加ファイルを確認して採用し、既存正本を一括上書きしない。export-evidence.cjsによるpeople/sources/manifest生成とevidence-store、DB importの同定検査は親担当。NDL原JSONはCRLF保持のため.gitattributesの-text指定を追加する。155命題/22所在を増減させない。現在の8人形式は既存3人のnameEvidence/ndlSnapshot契約に準拠する。

Wikidata rawLicenseのCC0はWikidata JSONだけを対象とする。NDL・自治体本文は提供元の利用条件を維持し、CC0へ変更しない。
