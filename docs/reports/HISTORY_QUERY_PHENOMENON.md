# 戦役と合戦の親子を検索のコマンドで引けるようにする（2026-11-08、Claude）

戦役と合戦の親子（#93）を取り込んだ後、Codex がルートで確かめたところ、`history_query --about` は対象（人物・場所など）を引くもので、`campaign:文禄の役` のような事象のキーを渡すと 0 件になった。Claude が Codex に伝えた確認の目安（「`history_query` で戦役の部分が出ること」）は、この点で不正確だった。

`history_query --phenomenon <事象のキー>` を足した。その事象の内容に加えて、親（`parent`）と部分（`parts`、戦役なら中の合戦）を出す。キーが無ければ止まる。ほかの問い（`--about`・`--year`・`--box`・`--path`・`--legs`・`--bundle`）と一緒に指定すると、黙って無視せず止まる（Codex の独立レビューの指摘）。

試験：`tests/test_history_queries.py` に、戦役が 2 つの合戦を部分として出すこと、合戦が親の戦役を出すこと、無いキーで止まることを足した。`uv run pytest tests/test_history_queries.py` 8 件、ruff・mypy が通る。

検索の出力を足しただけで、取り込みとデータは変えていない。
