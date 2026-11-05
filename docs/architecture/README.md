# 構成と編集箇所

ゲームはビルドを必要としない。`game/index.html` の `game-scripts` テンプレートが実際の依存順で、データ定義→史実訂正→地理と移動→表示という順に同じグローバルを拡張する。順序の変更はAPIの上書き関係を変えるため、ファイル名順へ並べ替えない。

現行の読込順と担当分野の入口は [modules.json](modules.json)。生成候補は参照文字列からの抽出であり、手編集可能という判定ではない。

- `data.js` / `hist.js` / `geo.js` / `jokaku.js`：大きな基礎データ。修正は出典付きの訂正モジュールを確認し、同じ事項への二重適用を避ける。
- `engine.js` / `ui.js` / `index.html`：全分野の共通箇所。同時編集を避け、担当を調整する。
- `movement-*` / `march-model` / `convoys`：連続時刻、道筋、隊の表示。`movementGeometryVersion` を変える場合は旧保存の移行も確認する。
- `battle-deployments` / `battle-phases` / `battle-atlas`：史料上の布陣、段階移動、描画。現代地形と史実配置の根拠は別。
- `tools/geo/` / `tools/faces/`：配信用データの生成元。生成物だけを直して次回生成で消さない。
- `data/research/claims.jsonl`：指定箇所で確認した一命題。ゲームのデータに名前があるだけでは追加しない。

ゲーム内ファイルのURLは維持している。起動中サーバーの配信先を変えず、整理は文書・調査入力・検査出力で実施した。[path-migration.json](path-migration.json) に旧→新パスを記録している。

## 変更を守る

現在はプロジェクト直下でGit管理している。編集前にHEAD・作業差分を確認し、必要に応じ対象のコピーとSHA-256を保管する。他担当の変更をリセット・巻戻し・一括上書きしない。コミットは現在の担当合意に従い、担当管理は `tools/work/tasks.cjs` を使用する。

## 暦と記録

内部時刻は30日/月のゲーム時計、史実の日付は旧暦と西暦の対応を使用する。月日の精度がない資料に便宜的な月日を与える場合、そのゲーム用値を史実命題に混ぜない。領主変更・着陣・死去・合戦開始を同じイベントとして一括しない。

過去の報告書は `docs/reports/`、旧引継ぎの原文は `docs/history/`。現在の仕様はルートの HANDOFF と `docs/work/requests.json` で確認する。

## 地理座標

入力の経緯度、ゲーム内平面、画面ピクセル、他地域追加時の扱いは [地理座標と画面座標](geographic-coordinates.md) を参照する。

再編の計画（website と同じ Django の構成、地理院地図Vector の下図）は [replatform-plan.md](replatform-plan.md)。
