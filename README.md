# 天下分け目の国絵図

1560～1615年の日本・朝鮮を舞台にした地図ゲーム。ビルド不要のHTML/JavaScriptです。現在は史実観察を優先し、自由攻城・非史実ルートは保留しています。

最初に [HANDOFF.md](HANDOFF.md) を読んでください。開発・調査の入口は [docs/README.md](docs/README.md)、残要望と分担は [docs/work/README.md](docs/work/README.md) です。

| フォルダ | 内容 |
|---|---|
| `game/` | ブラウザへ配信するゲームと同梱素材。読込順は `index.html` |
| `docs/architecture/` | 構成、ファイルの移動記録、依存順 |
| `docs/work/` | 残要望、完了条件、対象別作業一覧、担当と成果の記録 |
| `docs/reports/` | 調査・修正・実画面確認の報告書 |
| `docs/history/` | 過去の引き継ぎ記録。現行仕様の指示ではない |
| `data/inputs/` | 調査・生成処理への入力資料 |
| `data/research/` | 出典、検証した史実命題、参考原本、実装との対応 |
| `data/audits/` | 検査によって生成する一覧・照合結果 |
| `data/verification/` | 実画面、同縮尺比較、性能測定の証拠 |
| `tools/checks/` | サーバー不要の検査と専用ブラウザの検証 |
| `tools/geo/`, `tools/faces/`, `tools/research/` | 地理・肖像・史料の生成と照合 |
| `tools/work/` | 分担用の作業一覧と担当管理 |
| `archive/` | 停止中の非史実実装等。通常の起動では読まない |

サーバーの起動・停止はユーザーが行います。検証は起動済み `http://localhost:8000/index.html` に接続します。検査結果の保存先は `GAME_TEST_OUTPUT` で指定できます。

基本の確認：`node tools/checks/offline.cjs`。詳しくは [検証手順](tools/checks/README.md) を参照してください。
