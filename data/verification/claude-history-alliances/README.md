# 同盟 17 件の綱文照合（Claude、2026-11-07）

- 対象：年表の `kind: ally` 17 件（全件）。結果は一致 3、不一致 6、綱文に日付なし 8。詳細は `docs/reports/ALLIANCE_KOBUN_REVIEW.md`。
- 命題 9 件を登録。`node tools/research/export-evidence.cjs` で 118 件を出力（main の 109 件に 9 件）。
- `evidence-store`・`location-store`・`history-index`・`history-sqlite`・`history-sqlite-inputs`・`history-cube`・`organization`・`secret-scan` が PASS。`uv run pytest` 98 件 PASS、ruff・ruff format が通る。
- 綱文の日付は編纂上の掲出日で、関連史料の本文は読んでいない。照合の合格は歴史上の全件の網羅を示さない。
