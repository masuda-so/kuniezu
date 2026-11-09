# 十三湖・津軽平野：年代記録の採否

公的機関の後世の解説・調査報告を根拠にする。工事の段階と原暦を保持し、地理範囲は名称による比較に限定する。地点は全件 geometry=null で、輪郭の採用・正本変更は0件。

## 採用する命題

- **coastal-tsugaru-new-field-order-1620**：東北農政局は、津軽地方の新田開発が1620年の新田開発令で本格化したと説明する。
  原記載：1620年「新田開発令」。対象は津軽地方の広域的開発であって十三湖の一斉干拓ではない。 精密輪郭・座標は採用していない。
  根拠：[coastal-jusan-maff-history](https://www.maff.go.jp/tohoku/nouson/kokuei/tugaruhokubu/chiikinorekishi.html)、「新田開発の歴史」第2段落。

- **coastal-jusan-project-fiscal-1948-1969**：東北農政局は国営十三湖開拓建設事業の実施年度を昭和23～44年度と記す。対象には葦原の湿原や腰切田の改良が含まれる。
  原記載：昭和23～44年度。事業の開始日・完成日、対象水域と湿地の精密区分はこの資料から補わない。事業面積を過去の湖面へ機械加算しない。
  根拠：[coastal-jusan-maff-history](https://www.maff.go.jp/tohoku/nouson/kokuei/tugaruhokubu/chiikinorekishi.html)、「国営十三湖開拓建設事業（昭和23～44年度）」見出しと目的・効果の段落。

- **coastal-mitoguchi-1926**：国土交通省の河川伝統技術データベースは、十三湖水戸口の突堤の工事着工を大正15（1926）年と記す。
  原記載：大正15（1926）年。近代の河口安定工事であり、現在の固定開口を1560～1615年へ転記しない。 精密輪郭・座標は採用していない。
  根拠：[coastal-jusan-mlit-gijutsu](https://www.mlit.go.jp/river/pamphlet_jirei/kasen/rekishibunka/kasengijutsu06.html)、No.11 岩木川「水戸口突堤」／調査、着工と完成を説明する段落。

- **coastal-mitoguchi-1947**：国土交通省の河川伝統技術データベースは、十三湖水戸口の突堤の完成を昭和22（1947）年と記す。
  原記載：昭和22（1947）年。近代の河口安定工事であり、現在の固定開口を1560～1615年へ転記しない。 精密輪郭・座標は採用していない。
  根拠：[coastal-jusan-mlit-gijutsu](https://www.mlit.go.jp/river/pamphlet_jirei/kasen/rekishibunka/kasengijutsu06.html)、No.11 岩木川「水戸口突堤」／調査、着工と完成を説明する段落。

## 留保・比較資料


昭和23～44年度の原暦は `Japanese-fiscal-year`。年検索では終年度の翌年部分を漏らさない1948～1970を候補範囲にするが、boundsAreHistoricalStartEnd=false とし、暦年の連続工事や当該年の湖岸を主張しない。現在の索引は月・年度を精密検索しないため、検索結果では必ず原年度を読む。

## 出典・原本の保持

- [農林水産省 東北農政局「地域の歴史」](https://www.maff.go.jp/tohoku/nouson/kokuei/tugaruhokubu/chiikinorekishi.html)。該当箇所：「新田開発の歴史」第2段落／「国営十三湖開拓建設事業（昭和23～44年度）」。
  SHA-256 `dc30391c165eae5c2d32fd8629640ad0b57ffe2be446d6e1585f998342b189f1`。取得 2026-11-04T07:13:19.496699+00:00。
- [国土交通省「河川伝統技術データベース一覧 水戸口突堤」](https://www.mlit.go.jp/river/pamphlet_jirei/kasen/rekishibunka/kasengijutsu06.html)。該当箇所：河川伝統技術データベース No.11 岩木川「水戸口突堤」。
  SHA-256 `dd271f338521bb8a0a32cab628c6447154fe1c324e35b0f70685f7fedc29b514`。取得 2026-11-04T07:13:19.755740+00:00。

原本はGit外アーカイブへの保持計画（`data/inputs/coastal-period-review/retention-manifest.json`）へ接続する。要旨と原本のSHAを共有し、HTML/PDFの全文を転載しない。
