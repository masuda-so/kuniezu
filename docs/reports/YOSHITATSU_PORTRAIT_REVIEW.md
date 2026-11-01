# 斎藤義龍の肖像表示（2026-11-02）

旧faces.webpの第27セルは、顔の周囲を縦横に引き伸ばした縞が目立っていた。人物が異なる画像と断定する問題ではなく、切出し素材の周辺拡張と低解像度が表示を損なっていた。

Wikimedia Commonsの公開原画（1113×2282、ファイル名 Saitō Yoshitatsu.jpg）を無加工で保持し、顔を含む[325,1000,410,410]の正方範囲を表示時に切り出すようにした。旧スプライトへ戻る前提の縮小補正は使用しない。game/portrait-layout.jsの個別EXTRA_PORTRAITSで指定し、他の人物の切出しを変更していない。原画・ハッシュ・出典は data/inputs/yoshitatsu-review/manifest.json。

岐阜県文化伝承課の「絹本著色斎藤道三像 斎藤義竜像」（https://www.pref.gifu.lg.jp/page/354743.html）で常在寺所有・岐阜市歴史博物館寄託の義竜像を確認。県の説明は、没後の追福のため盛時を描いたと推定しており、本人をその場で写した姿と断定しない。

起動済みゲームへ独立した一時Chromeで接続。斎藤義龍・織田信長・丹羽長重の円形表示を並べて実画面確認し、共通サイズ・正方表示・新原画参照・切出し範囲・例外0を検査した。検査 tools/checks/yoshitatsu-portrait-browser.cjs、結果 data/verification/yoshitatsu-portrait/。サーバーの起動停止やユーザーの保存操作は行っていない。
