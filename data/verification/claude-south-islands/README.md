# 南の島の割り当て（claude、2026-11-04）

- 正本の未割当の陸：南の島 558 個（約18万画素）と残りの小島 228 個（1,846画素）を割り当て、raster-map の集計で `unassignedLandPixels:0`。
- 実画面の当たり判定（1560年）：奄美大島・徳之島・与論・久米島＝castle:shuri、伊豆大島・八丈島＝castle:nirayama、南大東・母島・硫黄島＝context:uninhabited、口永良部＝castle:kouyama、嵊泗＝context:ming-zhejiang。
- 新しい区画の説明（TK.contextRegionPresentation）：「無人島／所属のない島」「明・浙江の沿海／明の沿海」。
- 年代別の版：1606-01-01〜1609-03-07 と 1609-03-07〜1616-01-01 に分かれ、後者で奄美の 117,897 画素が castle:uchi になる（province-edits の検査で適用を確認）。
- 検査：offline・raster-map・province-edits・infrastructure・organization・secret-scan すべて PASS。
