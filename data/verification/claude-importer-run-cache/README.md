# 取り込みの 1 回内キャッシュの検証（Claude、2026-11-10）

main `3699d932` から。報告は `docs/reports/IMPORTER_RUN_CACHE.md`。

- 前後の比較：隔離した新しい DB で `import_history` を 2 回（新しい DB・2 回目）行い、Thing・ThingName・ThingKey・Participation・Thing と Phenomenon の records・Phenomenon・Record・RecordVersion・Place・Authority・Summary を pk に依存しない形で書き出した。変更前（main）と変更後で、2 回とも全て一致。時間はそれぞれ 3 回の中央値（新しい DB 3.190 → 2.924 秒、2 回目 2.374 → 2.133 秒、cProfile なし）。比較に使ったスクリプトと書き出しは Git に入れず、利用者の主の作業ディレクトリ（作業ツリーではない）の `.cache/importer-run-cache/` に保全した。
  - 比較器 `imp_bench.py`（SHA-256 `a6faadc563ebb611044d5dfa1a17f20062a284d855af34cbbab08f716a36cfa8`）：隔離した新しい DB に `migrate` し、`import_history` を 2 回（fresh・reimport）行い、毎回 pk に依存しない形で全表を書き出して時間を測る。
  - 変更の適用器 `imp_patch.py`（SHA-256 `ddeb4ba5224bc98370dbcdb31b009c6d3abd8c8fc8ca63a8d2ede35d029c0b63`）
  - 書き出し `imp-before-{1,2,3}.json.gz`・`imp-after-{1,2,3}.json.gz`（各回の正規化した書き出しと Summary と時間）
  - 生の時間 `timings.json`：変更前 fresh 3.428・3.175・3.190、reimport 2.751・2.374・2.350。変更後 fresh 2.924・2.991・2.895、reimport 2.128・2.133・2.315（秒）。
  - 固定入力：main `3699d932` の `data/research/manifest.json`（SHA-256 `b288ff07b40d61d3f06dd4a148ce1de3297f0161c3ce440e48f6220899377d51`）が列挙する JSONL と、同じ commit の入力。
  - 正規化：Thing は key・種類・名前・registered、ThingName は (thing の key, 名前)、ThingKey は (key, thing の key)、Participation は (現象の key, thing の key, role)、M2M は (key, record の key)、Phenomenon は key・あり方・種類・subtype・題名・年月日・jd の範囲・jd_exact・bounds_asserted・場所と親の key、Record は key・種類・状態・内容のハッシュ・退役の有無、RecordVersion は件数、Place・Authority は値。pk・作成時刻・run の id だけを除いた。
- `ruff check kuniezu/history/importer.py` → All checks passed
- `mypy kuniezu/history/importer.py` → no issues
- `python -m pytest -q tests/test_history*.py` → `150 passed`

時間は 1 台の端末での値で、CI の時間の短縮を約束するものではない。
