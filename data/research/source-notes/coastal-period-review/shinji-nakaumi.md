# 中海・宍道湖：年代記録の採否

公的機関の後世の解説・調査報告を根拠にする。工事の段階と原暦を保持し、地理範囲は名称による比較に限定する。地点は全件 geometry=null で、輪郭の採用・正本変更は0件。

## 採用する命題

- **coastal-nakaumi-start-1963**：島根県は、干拓と淡水化による農業用水確保を目的とした国営中海土地改良事業の着工を昭和38年と記す。
  原記載：昭和38年。当初計画2230haを完成干陸面積として使わない。 精密輪郭・座標は採用していない。
  根拠：[coastal-nakaumi-shimane](https://www1.pref.shimane.lg.jp/industry/norin/seibi/kokuei/kokueinouchiuridashityuu.html)、「国営中海土地改良事業」第1段落／着工年。

- **coastal-nakaumi-three-districts-1989**：島根県は揖屋・安来・弓浜の3地区の干拓事業完了を平成元年3月と記す。
  原記載：平成元年3月。完成対象は記名された3地区。月は保持するが日を補わず、地区境界・現湖岸を登録していない。 精密輪郭・座標は採用していない。
  根拠：[coastal-nakaumi-shimane](https://www1.pref.shimane.lg.jp/industry/norin/seibi/kokuei/kokueinouchiuridashityuu.html)、「国営中海土地改良事業」第2段落／揖屋・安来・弓浜の完了。

- **coastal-nakaumi-hikona-1992**：島根県は彦名地区の干拓事業完了を平成4年3月と記す。
  原記載：平成4年3月。彦名地区の完了を湖全体の干陸へ拡張しない。月は保持するが日を補わない。 精密輪郭・座標は採用していない。
  根拠：[coastal-nakaumi-shimane](https://www1.pref.shimane.lg.jp/industry/norin/seibi/kokuei/kokueinouchiuridashityuu.html)、「国営中海土地改良事業」第2段落／彦名の完了。

- **coastal-nakaumi-honjo-cancel-2000**：島根県は本庄地区について平成12年9月に干陸を中止することになったと記す。
  原記載：平成12年9月。干陸の中止であって、完成した干拓地の成立年やすべての施設撤去年ではない。 精密輪郭・座標は採用していない。
  根拠：[coastal-nakaumi-shimane](https://www1.pref.shimane.lg.jp/industry/norin/seibi/kokuei/kokueinouchiuridashityuu.html)、「国営中海土地改良事業」第3段落／本庄地区の干陸中止。

## 留保・比較資料

- **shinji-west-bank-kawatae**：広報図の6年代ラベルと川違えの説明は確認。図は未登録の俯瞰説明図で「頃」を含むため、特定年の確定岸線を史実命題にしない。
- **hii-east-flow-dating-conflict**：1635/1639説と、1633年とされる図の東流描写を併記する。図の年代・描写が正しい場合という条件を落とさず、いずれも一日の流向切替の根拠にしない。

斐伊川の対立は `hii-dating-alternatives.json` に別々の根拠・条件で保持する。2006年広報と2019年の再検討を一つの確定年へ統合しない。本庄地区は干陸中止であり、他4地区の完成と同じ扱いにしない。

## 出典・原本の保持

- [島根県「中海干拓地」](https://www1.pref.shimane.lg.jp/industry/norin/seibi/kokuei/kokueinouchiuridashityuu.html)。該当箇所：「国営中海土地改良事業」の着工・4地区完成・本庄干陸中止の段落。
  SHA-256 `248c74c0569c1603a79d152cda522fc904be45d18bd5e84ee20f76d3c9c7c168`。取得 2026-11-04T07:13:18.701452+00:00。
- [国土交通省 中国地方整備局 出雲河川事務所「ふれあい放水路 第148号」](https://www.cgr.mlit.go.jp/izumokasen/chumoku/fureai/02/files/fureai148.pdf)。該当箇所：PDF2頁の左年表、右下「斐伊川の川違え」の概略比較図。
  SHA-256 `1e58c98548865e2941225f338f5005396d1ac480c863137832968023af7a6dfa`。取得 2026-11-04T07:13:18.986104+00:00。
- [松江市「松江の歴史文化コラム79」](https://www.city.matsue.lg.jp/material/files/group/34/column79_3.pdf)。該当箇所：PDF5頁の年代に関する留保、PDF5–7頁の出雲国図と追記；署名日付はPDF6頁。
  SHA-256 `0337532a69a506424809a3930026ba6a4a3964ceb8290950bbab6a42dfdab0f8`。取得 2026-11-04T07:13:19.141905+00:00。

原本はGit外アーカイブへの保持計画（`data/inputs/coastal-period-review/retention-manifest.json`）へ接続する。要旨と原本のSHAを共有し、HTML/PDFの全文を転載しない。
