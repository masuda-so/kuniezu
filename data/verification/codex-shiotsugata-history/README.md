# 塩津潟史実DBの検証

2026-11-07、`codex/shiotsugata-history` の入力・取り込み・検索を確認。

- `node tools/checks/evidence-store.cjs`：合格。明示的な空参照を持つ年・日精度の主対象記録を受理し、参照の欠落・重複・不正値、空の複合記録を拒否。
- `node tools/checks/history-index.cjs`：合格。
- `python3 tools/checks/history-sqlite.py`：131記録、417件のJS/SQL検索比較が合格。期間外の史料の変化年も比較。
- Djangoの史実取り込み試験：13件合格。追加した試験は6件の年別・種別ID集合、主対象からの検索、場所不明の2件、座標不明記録の範囲検索除外を検証。
- `ruff check --no-cache kuniezu/history/importer.py tests/test_history_import.py`：合格。
- 対象ファイルの `git diff --check`：合格。

pytestのキャッシュ保存だけは作業ツリーの権限制限で警告となった。試験は全件実行済み。入力とDB処理のみの変更で、画面描画・地図・ゲームの時刻は変更していない。実画面確認を実施したという主張はしない。

根拠と採録範囲は [報告書](../../../docs/reports/shiotsugata-history.md)。検査合格は戦国期湖岸の確定を意味しない。
