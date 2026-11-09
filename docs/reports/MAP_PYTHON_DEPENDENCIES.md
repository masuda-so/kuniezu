# 地図の Python 依存を uv の依存グループにまとめる（2026-11-09、Claude）

依頼：Codex のセッション（利用者の「Claudeも作業を担当してください」を受けた分担）。GitHub の依存の警告 58 件は、全て古い `tools/map/requirements.txt`（Python 3.9 の時代の `numpy==2.0.2`・`Pillow==11.3.0`・`cffi==2.0.0`）から出ていた。今の `pyproject.toml`・`uv.lock`・実際の `.venv` は Pillow 13.0.0 で、古い定義だけが古い環境を作り直す道として残っていた。

## 変えたこと

- `tools/map/requirements.txt` を削除した。
- `pyproject.toml` に依存グループ `map`（`cffi>=2.0.0`・`numpy>=2.0.2`・`pillow>=13.0.0`・`setuptools>=75.0.0`）を足し、`uv.lock` を更新した（cffi 2.1.1・pycparser 3.12 を追加。NumPy 2.5.4・Pillow 13.0.0・setuptools 84.0.0 は既にロックにあった）。PyPI からの取得は、利用者が `uv lock`・`uv sync --locked --group map` を自分で実行した（利用者の選択）。
- レビュー（Codex）の指摘：古い定義は CFFI を標準で入れていたので、新しい手順でも入れる。巨大な画像の参照実装は値が同じでも遅い。
- 導入の案内を `docs/architecture/heightmap-cache.md`・`README.md`・`README.en.md` で uv の手順に直した。

## 見つけた不具合と修正

`tools/map/build-copernicus-height.py` の CFFI の速い経路は、今の Python 3.14 では次の 2 つの理由で使えなかった。

1. Python 3.12 以降の CFFI は、C を組み立てるのに setuptools を要る。無いと `Exception` を投げ、道具は `OSError`・`VerificationError` しか受け止めていなかったので、参照の実装に戻らず復号そのものが止まった。どの例外でも参照の実装に戻すようにし、setuptools をグループに入れた。
2. setuptools は今いるフォルダ（リポジトリのルート）の `pyproject.toml` を読み、パッケージが複数あるとして組み立てを止めた。組み立ての間だけ作業用のフォルダ（一時フォルダの `kuniezu-height-png-filters`）に移るようにした（`contextlib.chdir`）。

## 確かめたこと

- `uv sync --locked --offline --group map` が通り、`uv run --group map python` で NumPy 2.5.4・Pillow 13.0.0・cffi 2.1.1 を読み込めた。
- 速い経路が組み立てられ、乱数の行（Average・Paeth、2〜4,097 バイト）で参照の実装と値が全て同じ。4,097 バイトの行で、速い経路は約 0.02 ms、参照の実装は約 2〜2.5 ms。
- 回帰の試験（レビュー（Codex）の指摘）：今までの「ネイティブと参照の一致」は、ネイティブが組み立てられなくても通るので、この不具合を捕まえられなかった。`tools/checks/copernicus-height.py` に 2 つを足した。CFFI・setuptools・C コンパイラがある環境では `fast_unfilter()` が組み立てに成功すること、組み立てに失敗しても参照の実装に戻り、今いるフォルダが元に戻ること。修正を外すと前者が「CFFI decoder did not build」で落ちることを確かめた。
- 既存の検査 `tools/checks/copernicus-height.py`（小さな試験。「ネイティブと参照の復号が同じ」「全ての標準の PNG フィルタ」を含む）が通る。
- 地図の再生成と重い検査は行っていない。合戦・DB のファイルは触っていない。
