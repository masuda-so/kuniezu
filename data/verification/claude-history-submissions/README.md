# 従属 18 件の綱文照合（Claude、2026-11-07）

- 対象：年表の `kind: submit` 18 件（全件）。結果は一致 2、不一致 6、綱文に日付なし 10（大河内城の和議は、綱文の掲出日が和議の日か分からないので、レビューの指摘を受けて日付なしに移した）。詳細は `docs/reports/SUBMISSION_KOBUN_REVIEW.md`。
- 命題 8 件を登録。`node tools/research/export-evidence.cjs` で 126 件を出力（main の 118 件に 8 件）。
- `evidence-store`・`location-store`・`history-index`・`history-sqlite`・`history-sqlite-inputs`・`history-cube`・`organization`・`secret-scan` が PASS。`uv run pytest` 102 件 PASS、ruff・mypy が通る（`ruff format --check` は main にある別担当の `tests/test_vector_era_sources.py` 1 件だけを挙げ、この PR では触らない）。綱文の日付は編纂上の掲出日で、関連史料の本文は読んでいない。照合の合格は歴史上の全件の網羅を示さない。
