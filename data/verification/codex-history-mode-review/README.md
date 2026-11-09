# 事象のあり方と時刻精度の分離（要設計確認）

main6205d339。history-rdb.md は mode=event を「ある時点に起きる」、state を「ある期間に成り立つ」と定義する。一方 importer.py:1000 は eventTime.kind が dated-event/year-window/dated-components のときだけeventとし、それ以外をstateへ分類している。

通常DBの claim:urio-surrender-1568 は castle-surrender・時刻は「永禄11年冬」で、mode=state/jd_exact=false/bounds_asserted=falseとなる。降伏が冬の期間ずっと成り立つという根拠ではなく、降伏時点が季節までしか分からない入力である。蔚山の築城（月）については工事の過程なのか完成点なのかを出典ごとに区別すべきで、described-period を一律eventへ変えることも適切ではない。

必要な検討：modeと時間の精度を別項目として保持し、述語だけ・時刻形式だけで事象/状態を決めない。既存期間命題を棚卸しし、瞬間の不確かな時刻と継続状態を分ける。現在の登録データがfalseの境界や精密所在を作っているという主張ではない。まず入力契約と後方互換を確認し、別目的のPRで扱う。
