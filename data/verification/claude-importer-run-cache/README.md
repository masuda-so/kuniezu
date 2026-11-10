# 取り込みの 1 回内キャッシュの検証（Claude、2026-11-10）

main `3699d932` から。報告は `docs/reports/IMPORTER_RUN_CACHE.md`。

- 前後の比較：隔離した新しい DB で `import_history` を 2 回（新しい DB・2 回目）行い、Thing・ThingName・ThingKey・Participation・Thing と Phenomenon の records・Phenomenon・Record・RecordVersion・Place・Authority・Summary を pk に依存しない形で書き出した。変更前（main）と変更後で、2 回とも全て一致。時間はそれぞれ 3 回の中央値（新しい DB 3.190 → 2.924 秒、2 回目 2.374 → 2.133 秒、cProfile なし）。比較に使ったスクリプトと書き出しは、手元の一時置き場にあり Git に入れていない。
- `ruff check kuniezu/history/importer.py` → All checks passed
- `mypy kuniezu/history/importer.py` → no issues
- `python -m pytest -q tests/test_history*.py` → `150 passed`

時間は 1 台の端末での値で、CI の時間の短縮を約束するものではない。
