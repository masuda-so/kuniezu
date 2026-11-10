# 設楽原の本陣の順序の検証（Claude、2026-11-10）

main `d4685dda` から。報告は `docs/reports/SHITARAGAHARA_HONJIN.md`。

- `node tools/research/export-evidence.cjs` → `exported 273 verified atomic claims, 28 location observations and 8 JSONL files`（所在の観察 22 → 28）
- 隔離した手元の DB で `manage.py migrate` → `manage.py import_history`：6 件が `state`・`movement`・`attested-presence`、`precision=period`・`bounds_asserted=false` で入り、`queries.in_year(1575)` で 6 件、`asserted_only=True` で 0 件。`history_record.payload` の `sequence` で人物ごとの順序を並べ替えられることを SQL で確かめた。`history_query --about 才ノ神` で引ける。DB は Git に入れない。
- `python -m pytest -q tests/test_history*.py` → `150 passed`
- `offline.cjs`・`organization.cjs`・`infrastructure.cjs`・`evidence-store.cjs`・`history-index.cjs`・`history-sqlite.py`・`history-sqlite-inputs.py`・`history-cube.py`・`build-catalog.cjs --requests-only --check` → どれも終了コード 0

確かめたのは、資料が書く本陣の場所と順序の保存と取り込みだけで、日付・時刻・座標・個々の部隊の配置ではない。
