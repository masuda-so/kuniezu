# 肖像5点の読込待ち・失敗時の表示

顕如、丹羽長重、島清興、斎藤義龍、足利義輝の代替画像を、通常表示と同じ原画像・切り抜き範囲から作成した。三好長慶は既存の肖像を使い、生成元の台帳を実際に使用する画像へ訂正した。肖像の来歴は [資料ノート](../../data/research/source-notes/portrait-six-review.json) を参照。

5人分を133,260バイトの可逆WebPに収め、対象の代替表示が必要なときだけ既存の肖像読込キューで取得する。全体画像の内容は従来と同一。画像URLにはファイル内容の確認値を付けた。

Pillow を利用できる Python で `python tools/faces/build-fallback.py` を実行すると、5点の原画像のハッシュを検査して補助画像を再生成する。次に `node tools/build/stamp-assets.cjs` でURLを更新する。

[実画面検証](../../data/verification/codex-portrait-fallback/README.md) で原画像の読込を失敗させ、代替表示、通常表示、三好の表示を確認した。
