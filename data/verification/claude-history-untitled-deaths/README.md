# 題名のない死去 43 件の綱文照合（Claude、2026-11-07）

- 対象：年表の `kind: death` で題名の無い 43 件（全件）。結果は一致 6、不一致 21、綱文に日付なし 16（レビューの指摘を受けて、発喪の日しか無い宇喜多直家と、綱文が別の名で書く 4 人を日付なしに移した）。詳細は `docs/reports/DEATH_DATE_KOBUN_REVIEW.md` の追記。
- 命題 26 件を登録。`node tools/research/export-evidence.cjs` で 135 件を出力。
- `evidence-store`・`location-store`・`history-index`・`history-sqlite`・`history-sqlite-inputs`・`history-cube`・`organization`・`secret-scan` が PASS。`uv run pytest` 72 件 PASS。
- 綱文の日付は編纂上の掲出日で、関連史料の本文は読んでいない。照合の合格は歴史上の全件の網羅を示さない。
