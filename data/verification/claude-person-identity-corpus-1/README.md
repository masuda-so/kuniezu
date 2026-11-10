# 人物の同定・既存の入力を先に横断検索する第 1 便の検証（Claude、2026-11-10）

main `112ce79d` から。報告は `docs/reports/PERSON_IDENTITY_CORPUS_1.md`。

- `node tools/research/export-evidence.cjs` → `exported 273 verified atomic claims, 22 location observations and 8 JSONL files`（命題の数は変わらない）
- `python -m pytest -q tests/test_history*.py` → `150 passed`
- `offline.cjs`・`organization.cjs`・`infrastructure.cjs`・`evidence-store.cjs`・`history-index.cjs`・`history-sqlite.py`・`history-sqlite-inputs.py`・`history-cube.py`・`build-catalog.cjs --requests-only --check` → どれも終了コード 0
- curated の人物：登録の総数 127 → 130、外部 ID と同定の根拠を持つもの 113 → 116（main に #150 が入った後の数）。
- 公的機関のページは、保存の前に `source-privacy.cjs` の `assertSourceSafe` を通した。甲府市のページの HTML は Git に入れていない。

検査の合格は、この 3 人の同定の根拠が保存と一致することを示すだけで、要確認の 7 人や候補の全件の同定を示すものではない。
