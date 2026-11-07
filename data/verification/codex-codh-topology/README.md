# CODH合成参照面の実画面確認

2026-11-07。起動・停止するサーバーはなく、専用一時ChromeでローカルHTMLを開いた。ゲーム本体の切替確認ではない。

- 合成陸と湖、既存参照街道・宿場を同じ投影で描画。
- 1440×900・DPR1で日本／関東／児島湾と拡大を確認。関東画像で湖の穴と海岸を目視。
- 390×844・DPR2で実マウス入力のドラッグとカメラ移動を確認。
- JavaScript例外0。操作終了後500msの追加RAF要求0。Chromeと一時プロファイルは終了時に削除。
- 同じ合成陸を1地物にした試作の初期Path2D生成は884.6ms、2,142成分に分けた試作は162.7ms。単発の比較で、一般的な速度保証やゲーム全体の負荷測定ではない。

ローカル証拠：`/tmp/kuniezu-codh-topology-components/` の `browser.json`、`japan.png`、`kanto.png`、`kojima.png`、`narrow.png`。画像・派生GeoJSON・HTMLはコミットしない。

再現する参照面の生成は `uv run python tools/geo/codh_topology.py --output <新規ディレクトリ>`。比較画面は `uv run python tools/geo/codh_preview.py --surfaces <派生出力> --output <別の新規ディレクトリ>`。入力の原本SHAと生成物SHAが異なる場合は接続を拒否する。

公開CLIの `--surfaces` 経由でも同じ操作を確認。`/tmp/kuniezu-codh-linked-preview/` の `browser.json` と画面画像に記録し、例外0・停止中の追加RAF要求0。手作業で作ったHTMLだけの検査ではない。
