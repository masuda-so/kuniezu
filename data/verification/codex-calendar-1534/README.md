# 共通暦1534年対応の検証

- `node tools/build/build-calendar.cjs --check`：1138月が再生成結果と一致。
  隣接月は29/30日、旧853月の絶対JDNは全件不変。
- `python -m pytest tests/test_history_dates.py -q`：19件通過。
  1534年の元データが先発グレゴリオ暦であること、ゲームの西暦表記への変換、
  DB側による旧853月の読取も検査。
- ruff、asset stamps、organization、差分検査を通過。
- `node tools/checks/offline.cjs`：終了コード0。7シナリオの720日進行、保存・移動など
  基本回帰検査を通過。出力された`history-focus-audit.json`はここへ保全し、
  追跡済み監査JSONへのテスト由来の変更は元へ戻した。

候補ブランチでの検証。ゲームの1534年開始配置の追加や、main反映後の通常配信の
確認とは別。入力の固定版とSHAは`data/inputs/japanese-calendar/manifest.json`に記録。
