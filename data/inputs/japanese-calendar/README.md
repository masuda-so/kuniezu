# 日本旧暦の月初データ

ゲームと史実DBで共用する暦表の生成入力。固定版・SHA・選択範囲は
`manifest.json`に記録する。`month-starts.tsv`は元ファイルから旧暦1532〜1623年の
各月1日の行だけを、元の文字列のまま抜き出したもの。
元の全日分ファイルは約23MBのため配信用・生成入力には重複保持しない。

元の先発グレゴリオ暦から絶対JDNを計算する。ゲームの西暦表示が1582年の改暦前に
ユリウス暦を使うこととは区別する。月番号のアポストロフィは閏月。
`legacy-month-starts.json`は変更前の853月の比較用固定値で、実行時には読まない。

```
node tools/build/build-calendar.cjs
node tools/build/build-calendar.cjs --check
```

生成は通信せず、入力SHA・月の重複・隣接月の29/30日差・既存853月の絶対日一致を
検査する。既存の開始シナリオを1534年へ移す変更ではない。

出典：[manakai/data-locale](https://github.com/manakai/data-locale)。固定版の
説明文`upstream-calendar-kyuureki.txt`も保持する。説明文は月初対応の出典群に
国立天文台の暦日データベース等を挙げ、利用・複製・派生物作成を許諾している。
JSONと説明文に対するCC0の記載を、全ての元資料本文への許諾とは読み替えない。
