# 三人物の検索別名と外部典拠

2026-11-08確認。人物の同定と検索別名に採用する。生没日、所在、別名の使用開始日・改名順序は採用しない。元資料の書誌・照合範囲は各curated source、取得原本のID・revision・SHAは同名JSONと真田のNDLノートに保持する。

| 人物ID | 採用する検索名 | 外部典拠 |
|---|---|---|
| person:miyoshi-jikkyu | 三好実休・三好義賢 | Wikidata Q1058953、revision 2521638118 |
| person:sanada-yukitsuna | 真田幸綱・真田幸隆 | Wikidata Q1373396、revision 2555544445／NDL 001178988 |
| person:tachibana-dosetsu | 立花道雪・戸次鑑連・戸次道雪 | Wikidata Q6379490、revision 2480580207 |

## 三好実休・三好義賢

[京都府立京都学・歴彩館のイ函141目録](https://hyakugo.pref.kyoto.lg.jp/contents/detail.php?id=228&p=2)の人名欄で両名の対応を確認した。[大阪市の志紀長吉神社文書解説](https://www.city.osaka.lg.jp/kyoiku/cmsfiles/contents/0000673/673993/7.pdf)1頁では長慶の弟という関係と禁制の発給者を照合した。三好義興や六角義賢とは統合しない。目録の西暦0年は日付として採用しない。原文書画像の判読を実施したという意味ではない。

## 真田幸綱・真田幸隆

[長野市デジタルミュージアム「武田晴信判物」吉087](https://adeac.jp/nagano-city/catalog/sc00001990)の受取人と解説から両名を照合した。[真田宝物館「真田家とは」](https://www.sanadahoumotsukan.com/sanadake.php)の昌幸との父子関係も人物区別に用いた。既存の別人物の書誌scopeは変更せず、今回の幸綱同定を狭い新規sourceに分離した。

[NDLの個人名典拠001178988](https://id.ndl.go.jp/auth/ndlna/001178988)の幸隆・幸綱とWikidataの標目・別名を照合した。裸の官途名や号は検索別名に加えない。改名が実際にあった時期・順序や、後世系譜に基づく出自は確定しない。吉087の画像は転載せず、書誌と同定結果だけを保持する。

## 立花道雪・戸次道雪・戸次鑑連

[福岡市博物館No.087](https://museum.city.fukuoka.jp/archives/leaflet/087/index.html)第1・2節の実名、父、大友氏の重臣、立花城督という対応を確認した。[大分市の家臣紹介](https://www.city.oita.oita.jp/o157/bunkasports/citypromotion/1434706295486.html)では立花道雪と戸次鑑連の対応と宗茂との関係を照合した。生年の記述差は今回解決・採用しない。本人の立花姓使用の有無・時期も断定しない。

原本にあるその他の別名や裸の「鑑連」は採らない。飯尾連竜・致實の統合は今回の対象外である。

## 保持と検査

Wikidataの取得原本3件とNDLの取得原本1件を`person-alias-three-raw/`に無改変で保持する。Wikidata原本はCC0であり、自治体・博物館の本文や画像の利用条件へ拡張しない。読むための記録はこのMarkdownと書誌JSONであり、HTML本文や画像を台帳へ貼り付けない。

人物ID・別名の既存衝突を確認し、各人のWikidata ID・revision・SHA・人物型と採用する日本語名だけを検査する。真田はNDLとWikidataの両原本を独立して検査し、一方の採用で他方の照合を省略しない。取得原本に含まれる経歴情報を史実命題へ自動採用しない。
