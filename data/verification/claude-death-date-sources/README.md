# 死去日の差がある 21 名の公的資料の検証（Claude、2026-11-10）

main `6bd10b2d` から。報告は `docs/reports/DEATH_DATE_SOURCES.md`。

- 21 名の、既存の命題・年表の日・日付差（実際の JDN）は、`tools/checks/history-focus.cjs` のモデルの `TK.HIST` と `data/research/claims.jsonl` から出した。
- HTML の 9 頁は、こちらで取り直し、日付の文言を本文で確かめた。保存の前に `source-privacy.cjs` の `assertSourceSafe` を通した。
- `organization.cjs`・`secret-scan.cjs` → 終了コード 0。

命題・年表・ゲームのコードは変えていないので、pytest は回していない。
