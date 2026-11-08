# 別名の典拠を受けた死去 3 件の登録し直し（Claude、2026-11-08）

- 三好実休・真田幸綱・立花道雪の死去の命題 3 件を、#97 の人物台帳（別名に綱文の表記を含む）を同定の根拠として登録し直した。綱文は照合のときに読んだもので、読み直していない。
- `node tools/research/export-evidence.cjs` で命題 155 件（main の 152 件に 3 件）を出力。
- `evidence-store`・`location-store`・`history-index`・`history-sqlite`・`history-sqlite-inputs`・`history-cube`・`organization`・`secret-scan` が PASS。`uv run pytest` 141 件 PASS。照合の合格は歴史上の全件の網羅を示さない。
