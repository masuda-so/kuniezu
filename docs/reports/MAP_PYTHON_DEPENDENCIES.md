# 地図の Python 依存を uv の依存グループにまとめる（2026-11-09、Claude）

依頼：Codex のセッション（利用者の「Claudeも作業を担当してください」を受けた分担）。GitHub の依存の警告 58 件は、全て古い `tools/map/requirements.txt`（Python 3.9 の時代の `numpy==2.0.2`・`Pillow==11.3.0`・`cffi==2.0.0`）から出ていた。今の `pyproject.toml`・`uv.lock`・実際の `.venv` は Pillow 13.0.0 で、古い定義だけが古い環境を作り直す道として残っていた。

## 変えたこと

- `tools/map/requirements.txt` を削除した。
- `pyproject.toml` に依存グループ `map`（`numpy>=2.0.2`・`pillow>=13.0.0`）を足し、`uv lock --offline` で `uv.lock` を更新した（NumPy 2.5.4・Pillow 13.0.0。どちらも既にロックにあり、新しいパッケージは入っていない）。
- CFFI は PNG の復号を速めるだけの任意の依存で、無くても値は同じ（`docs/architecture/heightmap-cache.md`）。手元のキャッシュに無く、ロックの更新にネットワークが要るため、グループには入れなかった。使う場合は同じ環境に別途入れる。
- 導入の案内を `docs/architecture/heightmap-cache.md`・`README.md`・`README.en.md` で uv の手順に直した。

## 確かめたこと

- `uv sync --locked --offline --group map` が通り、`uv run --group map python` で NumPy 2.5.4・Pillow 13.0.0 を読み込めた。
- 地図の再生成と重い検査は行っていない。合戦・DB のファイルは触っていない。
