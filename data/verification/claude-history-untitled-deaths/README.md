# 題名のない死去 43 件の綱文照合（Claude、2026-11-07）

- 対象：年表の `kind: death` で題名の無い 43 件（全件）。結果は一致 8、不一致 23、綱文に日付なし 12（宇喜多直家は発喪の日しか無いので、レビューの指摘を受けて日付なしに移した）。詳細は `docs/reports/DEATH_DATE_KOBUN_REVIEW.md` の追記。
- 命題 30 件を登録。`node tools/research/export-evidence.cjs` で 139 件を出力。
- `evidence-store`・`location-store`・`history-index`・`history-sqlite`・`history-sqlite-inputs`・`history-cube`・`organization`・`secret-scan` が PASS。`uv run pytest` 72 件 PASS。
- 綱文の日付は編纂上の掲出日で、関連史料の本文は読んでいない。照合の合格は歴史上の全件の網羅を示さない。
