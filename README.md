# 天下分け目の国絵図

[日本語](README.md) | [English](README.en.md)

## 概要

1560～1615年の日本・朝鮮を舞台にした地図ゲームです。ビルド不要の素のHTML/JavaScriptで動き、現在は史実観察を優先し、自由攻城・非史実ルートは保留しています。

最初に [HANDOFF.md](HANDOFF.md) を読んでください。開発・調査の入口は [docs/README.md](docs/README.md)、残要望と分担は [docs/work/README.md](docs/work/README.md) です。

## 主な機能と制約

- 古湖岸、城・施設・人物の史実照合、街道上の行軍、合戦の布陣と動きを、出典を付けて表示します。
- 外交は国境のみを表示し、行軍は街道上の駒で表します。合戦は自軍参加時だけ自動表示します。
- 自由攻城、非史実ルート、プレイ中のAI生成は停止しています。`archive/` の非史実実装は通常の起動では読みません。
- 現代の比較地形、史料からの推定、確認済みの史実は区別して扱います。根拠のない文章をプレイ画面へ出しません。

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

## 導入と使い方

ビルドは不要です。`game/` を静的ファイルとして配信し、ブラウザで `index.html` を開きます。

サーバーの起動・停止は利用者が行います。検証は起動済み `http://localhost:8000/index.html` に接続します。検査結果の保存先は `GAME_TEST_OUTPUT` で指定できます。

基本の確認は次のコマンドです。詳しくは [検証手順](tools/checks/README.md) を参照してください。

```sh
node tools/checks/offline.cjs
```

## サポートと関連資料

- 現行仕様と合意事項: [HANDOFF.md](HANDOFF.md)
- 文書の入口: [docs/README.md](docs/README.md)
- 史料と実装の区別: [data/research/README.md](data/research/README.md)
- 地形・水域データの出典と加工: [game/licenses/DATA_SOURCES.md](game/licenses/DATA_SOURCES.md)
- 第三者データの表記: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)

## 開発と貢献

GitHub Actionsの通常CIは、サーバー不要の検査（構文・保存・領土、フォルダと担当、基盤）を Node.js で実行します。実画面の検証は利用者の環境で行い、結果を `data/verification/` に記録します。

リポジトリを変更する場合は、[HANDOFF.md](HANDOFF.md) の合意事項と [docs/work/README.md](docs/work/README.md) の完了条件を確認し、変更内容と検証結果をPRに記載してください。作業時の共通方針は [AGENTS.md](AGENTS.md) を参照してください。

ライセンスは [LICENSE](LICENSE)（MIT）です。同梱・派生する地図データ等は各出典の条件に従います。
