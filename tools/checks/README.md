# 現行版の検証

サーバーの起動・停止はユーザーのみ。ブラウザ検証は既存8000番へ専用の一時Chromeで接続し、普段のプロフィール・保存を使わない。負荷測定は他のブラウザ検証と同時実行しない。

地図の配信物（`game/map/build/` の生成物）は Git で追跡しない。取得後と、地図の正本や差分を変えた後は、検査の前に `node tools/map/build-map.cjs` で作る（CI も同じ）。

コマンドはプロジェクト直下で実行する。ブラウザ検査は `GAME_URL`、`GAME_TEST_OUTPUT`、`CHROME_PATH` を指定可能。毎回の成果は `data/verification/担当名-対象名/` に保存し、別担当の結果を上書きしない。コミットするのは結果の要約（README.md）だけで、画像・動画は PR に添付する（`.gitignore` 済み）。

| 分野 | サーバー不要の検査 | 実画面の検査 |
|---|---|---|
| 基本・保存・史実進行 | `offline.cjs` | `completion-browser.cjs` |
| 秘密情報（APIキー・秘密鍵など。gzipも展開） | `secret-scan.cjs`（CIでも実行。第三者ページの保存前は `tools/research/source-privacy.cjs`） | — |
| 読み込みの確認値（更新後に古い版を使わせない） | `node tools/build/stamp-assets.cjs --check`（CIでも実行。game/ のファイルを変えたら `node tools/build/stamp-assets.cjs` を実行） | — |
| フォルダ・担当管理 | `organization.cjs` | `march-clock-browser.cjs` の起動・行軍・合戦確認 |
| 史料入力・出力 | `evidence-store.cjs`、`history-index.cjs`、`tools/research/export-evidence.cjs` | 該当する史料・説明の表示 |
| 史実SQL・時空間キューブ | `python3 tools/checks/history-sqlite.py`、`python3 tools/checks/history-sqlite-inputs.py`、`python3 tools/checks/history-cube.py` | —（研究用の読取DB・ゲーム描画は変更しない） |
| 人物・開始配置 | `historical-register.cjs`、`scenario-openings.cjs` | `march-clock-browser.cjs` |
| 領土・分家・外交 | `families-territory.cjs`、`map-history.cjs` | `borders-family-browser.cjs` |
| 行軍・保存・速度 | `movement-display.cjs`、`movement-clock.cjs`、`movement-save.cjs`、`logistics-review.cjs` | `march-clock-browser.cjs` |
| 全期間の移動 | `march-audit.cjs`、`warp-audit.cjs` | 発見したケースを再現 |
| 街道・河川・地図 | `road-display.cjs`、`battle-rivers.cjs`、`terrain-transition.cjs`、`terrain-cache.cjs`、`raster-map.cjs`（正本 `game/map` と配信タイルの一致）、`province-edits.cjs`（年代別の差分の負例） | `zoom-regressions.cjs` |
| 合戦 | `deployments.cjs`、`atlas-regressions.cjs`、`battle-review.cjs`、`battle-viewport.cjs` | `all-battles-browser.cjs`、`battle-loading-browser.cjs`、`battle-viewport-browser.cjs` |
| UI・肖像・性能 | `infrastructure.cjs` | `usability-browser.cjs`、`portrait-browser.cjs`、`render-performance.cjs`、`load-performance.cjs`（起動・再生中の負荷。`GAME_OVERRIDE_ROOT` で作業ツリーの変更分だけ差し替え） |
| 棚卸し | `coverage-review.cjs`、`history-audit.cjs`、`road-shape-review.cjs` | 棚卸しだけで表示検査済みにしない |

例：

```sh
node tools/checks/offline.cjs
node tools/checks/organization.cjs
node tools/checks/evidence-store.cjs
GAME_TEST_OUTPUT=data/verification/自分の担当名 node tools/checks/march-clock-browser.cjs
```

変更に応じた検査が通ったら、理由なく全件を繰り返さない。新たな失敗・変更・懸念がある場合だけ追加する。生成JSONは `data/audits/`。最新報告は [古湖岸・人物・合戦の再照合](../../docs/reports/HISTORICAL_RECHECK.md)。

検査の合格は、史料の未読箇所や歴史上の全件の網羅を証明しない。分岐・任意攻城を扱う `legacy-*` 系の試験は過去の検証であり、現行版の完了条件へ流用しない。旧手順は [履歴](../../docs/history/CHECKS-2026-11-01.md) に保存。
