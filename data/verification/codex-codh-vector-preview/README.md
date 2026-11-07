# CODHベクター比較画面の検証

2026-11-07。サーバーの起動・停止なし。専用一時Chromeの1440×900、DPR1で、生成したローカルHTMLを開いた。プロファイルとChromeは終了後に削除した。

- 4層の描画対象：海岸面1886、湖沼面573、街道47、宿場1569。原本の海岸null2は描画しない。
- 日本・関東・児島湾の各ボタンで表示対象が存在し、拡大操作でカメラ倍率が増えることを確認。
- JavaScript例外0。児島湾の画像を目視確認。
- 初回はパス生成44.1ms、描画は日本1.8ms・関東0.2ms・児島湾1.1ms。狭幅調整後の最終版はパス生成33.1ms、描画は日本1.3ms・関東0.3ms・児島湾0.3ms。一般的な性能保証や既存ゲームとの比較ではない。
- 原本SHA・座標・属性の検査は生成時に `codh_reference.prepare` を全件実行。

ローカル証拠：`/tmp/kuniezu-codh-vector-preview-final/` の `browser.json`、`japan.png`、`kanto.png`、`kojima.png`、`narrow.png`。画像・派生GeoJSON・HTMLはコミットしない。再生成は `uv run python tools/geo/codh_preview.py --output <新規ディレクトリ>`。

ゲームの海岸採用・年代補正・城選択・行軍との整合はこの検証の対象に含まない。

追加確認：390×844・DPR2で実マウス入力のドラッグがカメラを移動。操作終了後500msの追加RAF要求0。既存出力を指定した再生成はFileExistsErrorとなり、index.htmlのSHAが不変。独立した読み取りレビューで修正必須の指摘なし。狭幅の説明欄を縮め、出典を展開式にした。
