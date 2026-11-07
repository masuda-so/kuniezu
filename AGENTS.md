# リポジトリガイドライン

## プロジェクト構成とモジュールの配置

1560〜1615 年の日本・朝鮮を舞台にした地図ゲーム。`kuniezu/static/kuniezu/` は素の HTML/JavaScript で（地図の配信物だけ正本から生成する）、ページは Django のテンプレート `kuniezu/templates/index.html` で、その `game-scripts` が実際の依存順（データ定義 → 史実訂正 → 地理と移動 → 表示）。順序を変えると API の上書き関係が変わるので、ファイル名順に並べ替えない。

- `kuniezu/static/kuniezu/`（84 の JS、`map/` 地図の正本と配信物、`atlas/` 合戦地形、`terrain/` 標高・陰影、`portraits/` 肖像、`kamon/` 家紋、`licenses/` 素材の出典）。配信 URL は変えない（地図は 2026-11-04 に利用者の判断で `map/build/` と `map/control/` へ移した）。
- `docs/`（`architecture/` 構成と依存順、`work/` 残要望と担当、`reports/` 報告書、`history/` 過去の原文）。作業前に `HANDOFF.md` を読む。
- 再編の途中：`masuda-so/website` と同じ Django の構成に揃える。地図は利用者の決定（2026-11-07）で、CODHの海岸線／水域・湖沼・主要街道・宿場を大いに活用するベクター実装へ移行する。旧来の画像正本維持を移行の制約にしない。現行表示を移行完了前に削除せず、江戸期の参照形状と戦国期の史料付き補正を区別する。現行方針と受入条件は `docs/architecture/codh-vector-map.md`、段取りの履歴は `docs/architecture/replatform-plan.md`。
- ベクターの編集正本は、改変済みGeoJSONを直接編集する形とする（利用者確認、2026-11-07）。CODH原本は照合用に保持する。年代で形が変わる場合も改変済みファイルを事前に持ち、描画側はそれを選んで読む。通常ビルドで原本と補正定義から編集正本を上書きしない。準備器は初回移行・検証用で、ゲーム実行中に座標や線を補正しない。
- 段 1a（Django・uv の骨組み）、段 1b-1（`game/` を Django アプリの静的ファイル `kuniezu/static/kuniezu/` へ移動）、段 1b-2（`index.html` をテンプレート `kuniezu/templates/index.html` に、インライン CSS を `index.css` に）、段 1b-3（地図の正本を `kuniezu/map/` へ。配信するのは生成物 `kuniezu/static/kuniezu/map/build/` だけ）が入った：`manage.py`・`config/`・`kuniezu/`・`scripts/`・`tests/`・`pyproject.toml`・`uv.lock`。段 1 はここまで。今の構成と Django 側のコマンドは `docs/structure.md`。
- `data/`（`inputs/` 調査・生成の入力、`research/` 出典と史実命題 `claims.jsonl`、`audits/` 検査が生成する JSON、`verification/` 実画面の証拠）。
- `tools/`（`checks/` 検査、`work/` 作業一覧と担当記録、`research/` 史料の出力、`geo/` と `faces/` 配信用データの生成元）。`archive/` は保留中の非史実実装で、起動では読まない。

## ビルド・テスト・開発コマンド

- 地図は `kuniezu/map/` に層ごとに置く。行政区分 `admin/`（郡）、支配 `control/`（城の支配域 `provinces.png` ほか）、自然 `physical/`（標高・川）、共有の `projection.json`、年代別の差分の入力 `edits/` が正本で、Git で管理する。配信物（`kuniezu/static/kuniezu/map/build/`）は追跡せず、`node tools/map/build-map.cjs`（陰影は `--height --python <NumPy・Pillow の Python>`）で生成する。生成物はコミットしない。ほかにビルドは無い。ページは Django が描くので、Django の開発サーバー（`uv run python manage.py runserver 8000`）か、静的書き出し `dist/client/` の配信で開く。`kuniezu/static/kuniezu/` だけを配信しても開けない。利用者が一度起動したポート（8000番・8001番）は、エージェントも起動・停止してよい（2026-11-05 の利用者の許可、2026-11-07再確認）。それ以外のポートは起動しない。127.0.0.1限定で運用し、待受プロセスと配信する作業ツリー・担当を確認してから操作する。別ポートや外部公開へ勝手に広げず、検証は専用の一時ブラウザで行う。
- CODH参照入力は `data/inputs/codh-edo/`。`uv run python tools/geo/codh_reference.py` で原本SHA・座標・重複と形状の欠落を検査し、`--output <新規ディレクトリ>` で派生GeoJSONを作る。原本の座標・属性・地物境界を保持し、点だけの水域や線がない街道を補間しない。この入力処理は現行ゲーム地図へ自動適用しない。
- 編集済みGeoJSONは `kuniezu/map/physical`・`admin`・`control` から、`build-map.cjs --vectors-only` で `map/build/vector/` へバイト複写する。`--vectors-only --check` で一致を確認する。通常ビルドにも同じ複写を含め、配信時に座標や線を直さない。深い位相検査は `uv run pytest tests/test_vector_sources.py`。5比較湖の正本は `physical/lakes-reference.geojson`、公式原本と出典は `data/inputs/mlit-w09-2005/`。
- `uv sync --locked` の後 `uv run pytest` — Django 側の試験（CI の `Django CI`）。`uv run ruff check`・`uv run mypy kuniezu config scripts tests`・`uv run python scripts/build_static.py`（`dist/client/` への静的書き出し）は手元で実行する。許可済みの8000番・8001番の起動・停止はエージェントも行える。低負荷の検証では `uv run --locked python manage.py runserver 127.0.0.1:8000 --noreload` を使え、Pythonやテンプレートを変更した際は必要に応じて再起動する。
- `uv run python manage.py migrate` の後 `uv run python manage.py import_history` — 史実の関係データベース（`db.sqlite3`、Git に入れない）を入力から作る。`uv run python manage.py history_query --about <名前>` で引く。設計は `docs/architecture/history-rdb.md`。
- `node tools/checks/offline.cjs` — 構文・保存・史実進行の基本検査（CI の必須チェック `Offline checks`）。`node tools/checks/organization.cjs`、`node tools/checks/infrastructure.cjs` も CI で実行する。
- `GAME_TEST_OUTPUT=data/verification/<担当名-対象名> node tools/checks/march-clock-browser.cjs` — 実画面の検査（起動済みサーバーが必要）。分野別の検査は `tools/checks/README.md` の表から選ぶ。
- `node tools/work/tasks.cjs claim <対象ID> --owner <担当名> --files <ファイル>` — 担当の記録。完了条件を全て満たす場合だけ `complete`、引き継ぎだけなら `release`。

## コーディングスタイルと命名規則

- 素の JavaScript。各ファイルは読込順に同じグローバルを拡張する。`.editorconfig`（2 スペース、LF、UTF-8）に従い、触ったファイルの慣習に合わせる。実行時の依存を増やさない。
- `data.js` / `hist.js` / `geo.js` / `jokaku.js` の修正は出典付きの訂正モジュールを確認し、同じ事項への二重適用を避ける。`engine.js` / `ui.js` / `index.html` は全分野の共通箇所なので同時編集を避け、担当を調整する。
- 改変済みベクターGeoJSONは正本を直接編集する。それ以外の配信用データは生成元（`tools/geo/`、`tools/faces/`）を直して再生成する。生成物だけを直さない。`data/audits/` の JSON を手で変えない。

## テストの指針

- 変更した分野に応じた検査を `tools/checks/README.md` の表から選び、通ったら理由なく全件を繰り返さない。負荷測定と他のブラウザ検証は同時に実行しない。
- 成果は `data/verification/<担当名-対象名>/` に保存し、別担当の結果を上書きしない。コミットするのは結果を要約した `README.md` だけで、画面の画像・動画は Git に入れず（`.gitignore` 済み）PR に添付する。既にある画像は履歴として残す。検査の合格は史料の未読箇所や歴史上の全件の網羅を証明しない。
- `movementGeometryVersion` を変えたら旧保存の移行を確認する。日付・所属・地形を変えたら該当年代と保存互換を検査する。

## コミットとプルリクエストの指針

- コミットは git 公式ガイドの形: 1 行目は 50 文字以内を目安にした要約、空行、本文（何を・なぜ、72 桁前後で折り返す）、空行、トレーラー。作者は `masudaso <258961222+masuda-so@users.noreply.github.com>`、SSH 署名付き（ルールセットで署名必須）。
- 初回コミットだけ author と committer の日時をその日の `00:00:00 +0900` に揃える。2 回目以降は実際の日時。
- AI が内容を書いたコミットには、関わったエージェントごとに GitHub 公式書式のトレーラーを 1 行ずつ付ける: `Co-authored-by: Codex <noreply@openai.com>`、`Co-authored-by: Claude Fable 5.1 <noreply@anthropic.com>`（モデル名は作業したもの）。大文字小文字は公式どおり `Co-authored-by:`。
- 作業は GitHub flow に従う。1 作業ごとに main から短く分かりやすい名前のブランチ（`claude/…`・`codex/…` など）を切り、git worktree で作業ツリーを分ける。複数のエージェントで同じ作業ツリーや同じブランチを共有せず、統合用の共有ブランチは作らない。ほかの作業に依存する作業は、先の PR が main に入ってから main を起点に切る。
- PR は一つの目的に絞って小さく保ち、提出前に自己レビューと検査を済ませる。取り込みは squash（main には 1 PR＝1 コミット）。署名必須の main では rebase による取り込みは使わない。マージ後はブランチと worktree を消す。
- 公開済みの履歴は書き換えない。やむを得ない場合は本人が判断し `--force-with-lease` を使う。
- main への変更は PR 経由（直接 push 不可）。PR の題名・説明・レビューコメントは日本語を基本とし、利用者が別の言語を指定した場合はそれを優先する。説明には変更内容と検証結果を書く。`Offline checks` が必須チェック。
- `README.md`（日本語）と `README.en.md`（英語）は冒頭で相互リンクし、5 見出し（概要・主な機能と制約・導入と使い方・サポートと関連資料・開発と貢献）を揃え、仕様・手順・制約の変更は同じ PR で両方を更新する。未実装・未検証の内容を利用可能と書かない。

## エージェント向けの指示

- 史実観察を優先し、自由攻城・非史実ルート・プレイ中の AI 生成は保留のまま扱う。根拠のない動きや城郭、制作者向けの文章をプレイ画面に出さない。現代の比較地形、史料からの推定、確認済みの史実を別に扱う。
- 同じ行軍だけを遠景で代表隊、近景で街道上に個別表示し、別の場所へ行ったと見える横ずらしをしない。史実の着陣日を推定負荷や整備で遅らせない。外交は国境のみで表す。
- 変更と根拠は短い報告書 1 本に `docs/reports/` へまとめ、検査と実画面の証拠を添える。
- 作業報告、Issue や PR へのコメントは日本語を基本とする。コード識別子、ファイル名、コマンド、ログやエラーの引用は原文のまま残し、説明を日本語で添える。
- 言語の統一を理由に既存のコミット履歴や他者のコメントを書き換えない。投稿・コミット・push の許可は別途の作業指示に従う。
