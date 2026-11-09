# 現行版の検証

利用者が起動したことのある許可済み8000番はエージェントも起動・停止できる（127.0.0.1限定、配信先と所有者を確認）。ブラウザ検証は既存8000番へ専用の一時Chromeで接続し、普段のプロフィール・保存を使わない。負荷測定は他のブラウザ検証と同時実行しない。

ページは Django のテンプレート（`kuniezu/templates/index.html`）なので、8000 番は Django の開発サーバーか `dist/client/` の配信を指す。ページをディスクから読む検査は `tools/build/game-page.cjs` で描く。`hachirogata-water-browser.cjs` と `katori-water-browser.cjs` は、`GAME_URL` を指定しなければサーバーなしで一時ファイルを開く。

地図の配信物（`kuniezu/static/kuniezu/map/build/` の生成物）は Git で追跡しない。取得後と、地図の正本や差分を変えた後は、検査の前に `node tools/map/build-map.cjs` で作る（CI も同じ）。

コマンドはプロジェクト直下で実行する。ブラウザ検査は `GAME_URL`、`GAME_TEST_OUTPUT`、`CHROME_PATH` を指定可能。毎回の成果は `data/verification/担当名-対象名/` に保存し、別担当の結果を上書きしない。コミットするのは結果の要約（README.md）だけで、画像・動画は PR に添付する（`.gitignore` 済み）。

| 分野 | サーバー不要の検査 | 実画面の検査 |
|---|---|---|
| 初期の勢力選択・年表・表示設定 | `offline.cjs` | `selection-ui-browser.cjs`（全シナリオ・広狭幅・地域・二重入力・保存復元・城から選択） |
| 本体ベクター描画 | `vector-map.cjs`・`vector-assets.cjs` | `vector-game-browser.cjs`（広幅・狭幅・回転・全図）、`VECTOR_FAIL_SOURCE=1`（取得失敗と再読込） |
| 肖像の代替crop | `portrait-loading.cjs`、`build_fallback.py --root . --check` | `portrait-fallback-browser.cjs`（`PORTRAIT_MODE=normal/primary-fail/all-fail`） |
| 基本・保存・史実進行 | `offline.cjs` | `completion-browser.cjs` |
| 秘密情報（APIキー・秘密鍵など。gzipも展開） | `secret-scan.cjs`（CIでも実行。第三者ページの保存前は `tools/research/source-privacy.cjs`） | — |
| 読み込みの確認値（更新後に古い版を使わせない） | `node tools/build/stamp-assets.cjs --check`（CIでも実行。kuniezu/static/kuniezu/ のファイルを変えたら `node tools/build/stamp-assets.cjs` を実行） | — |
| フォルダ・担当管理 | `organization.cjs` | `march-clock-browser.cjs` の起動・行軍・合戦確認 |
| 史料入力・出力 | `evidence-store.cjs`、`history-index.cjs`、`tools/research/export-evidence.cjs` | 該当する史料・説明の表示 |
| 史実SQL・時空間キューブ | `python3 tools/checks/history-sqlite.py`、`python3 tools/checks/history-sqlite-inputs.py`、`python3 tools/checks/history-cube.py` | —（研究用の読取DB・ゲーム描画は変更しない） |
| 人物・開始配置 | `historical-register.cjs`、`scenario-openings.cjs` | `march-clock-browser.cjs` |
| 領土・分家・外交 | `families-territory.cjs`、`map-history.cjs` | `borders-family-browser.cjs` |
| 行軍・保存・速度 | `movement-display.cjs`、`movement-clock.cjs`、`movement-save.cjs`、`export-save-clock.cjs`、`logistics-review.cjs` | `march-clock-browser.cjs`、`export-save-clock-browser.cjs` |
| 全期間の移動 | `march-audit.cjs`、`warp-audit.cjs` | 発見したケースを再現 |
| 街道の入力と再生成 | `road-vectors.cjs`、`road-vector-loading.cjs`、`sanshu-route.cjs`、`road-regeneration.cjs`（Python標準ライブラリ。Django CIの試験にも含む） | `road-vectors-browser.cjs`（両幅・道上行軍・停止再開・破損拒否と再読込）、`sanshu-route-browser.cjs`（両幅と保存版22・23の移行） |
| 児島湾の補正マスクのベクター化 | `mask-vector.cjs`（穴・対角接触・単純リング）、`kojima-mask-vectors.cjs`（旧格子対応と737,100セルの逆変換一致。Offline checksにも含む） | —（移行入力のみ。ゲーム表示は変更しない） |
| 編集済みGeoJSONの配信 | `vector-assets.cjs`（バイト複写・直接編集保持・上書き保護・統合CLI。Offline checksにも含む）、`uv run pytest tests/test_vector_sources.py`（位相・5湖の欠落防止・W09原本/座標系） | 全体地図の切替時に確認 |
| 街道・河川・地図 | `road-display.cjs`、`battle-rivers.cjs`、`terrain-transition.cjs`、`terrain-cache.cjs`、`map-layer-notifications.cjs`（遅着層の再描画通知）、`raster-map.cjs`（正本 `kuniezu/map` と配信タイルの一致）、`province-edits.cjs`（年代別の差分の負例） | `zoom-regressions.cjs`、`map-layer-notifications-browser.cjs`（停止画面への遅着） |
| 合戦 | `battle-conflicts.cjs`、`local-battle-scene.cjs`、`nagakute-local-scene.cjs`、`local-dem.cjs`（公式PNGとの全点照合・再生成一致）、`deployments.cjs`、`atlas-regressions.cjs`、`battle-review.cjs`、`battle-viewport.cjs`、`battle-counter-density.cjs`、`battle-label-cards.cjs`、`battle-mode-labels.cjs`、`battle-relief.cjs`（陰影・標本位置・等高線）、`battle-initial-views.cjs`（初期範囲・手動選択維持）、`battle-atlas-detail.cjs`（細密DEM再現・旧生成器の保護） | `all-battles-browser.cjs`、`battle-loading-browser.cjs`、`battle-viewport-browser.cjs`、`battle-counter-density-browser.cjs`、`battle-label-cards-browser.cjs` |
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

`node tools/checks/vector-map.cjs` は共通ベクター描画器の穴・年代境界・表示範囲・入力保持を検査します。比較ページの実画面は `VECTOR_PREVIEW_URL=file:///absolute/path/index.html GAME_TEST_OUTPUT=data/verification/<担当名-対象名> node tools/checks/vector-map-browser.cjs` で専用Chromeから確認します。ゲーム本体の受入検査とは別です。

`uv run pytest tests/test_vector_sources.py tests/test_vector_era_sources.py` は編集済み面の有効性・bbox・5湖と元の宇喜多マスク366セルの年代・香取保護・両年代の岸線一致を検査する。局所PNG読取のPillowは開発用依存のみ。比較画面の `--at YYYY-MM-DD` は表示適用区間を選び、史料の確定日を追加しない。
