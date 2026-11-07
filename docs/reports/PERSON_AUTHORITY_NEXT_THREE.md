# 大友義統・相良義陽・清水宗治の典拠登録

2026-11-07。人物台帳へ3名を追加し、Wikidataの固定改訂JSONと公的出典3件を接続した。既存69名は変更せず72名となった。典拠の採用理由・改訂URL・取得日時・原本SHAは[照合ノート](../../data/research/source-notes/person-authority-next-three.md)と隣接JSONにまとめた。

|人物|安定ID|Wikidata / 固定改訂|
|---|---|---|
|大友義統|person:otomo-yoshimune|Q5354141 / 2522070119|
|相良義陽|person:sagara-yoshihi|Q7399045 / 2555352349|
|清水宗治|person:shimizu-muneharu|Q1046032 / 2550964681|

生没年を人物同定にだけ使い、確認済みの生没日・所在・領有命題を追加していない。大友義統の没年は大分市資料1605年／Wikidata1610年の不一致を留保。相良義陽に「相良頼房」を別名として加えず、既存の頼房（Q610933）を保持した。清水宗治のNDL IDはNDL原典未照合のため未採用。

CC0の固定改訂JSON3本は取得時のバイトのまま保持。PDF・画像・重複JSON・取得コードは加えていない。既存検査を、従来のQID直下形式と未改変の`entities`形式、全体SHAと行別SHAの両方に対応させ、誤SHA・誤改訂・別QIDを拒否する負例を追加した。公的出典の参照IDとURLも検査する。

## 検証

- `node tools/research/export-evidence.cjs`：再生成。109命題・22所在記録。
- `node tools/checks/evidence-store.cjs`：典拠・出典参照・原本SHA・負例を含め通過。
- `node tools/checks/history-index.cjs`：通過。
- `python3 tools/checks/history-sqlite.py`：131記録、458件のJavaScript/SQL検索一致、外部キー・整合性を含め通過。
- `python -m pytest tests/test_history_import.py -q -p no:cacheprovider`：専用の一時データベースで13件通過。
- 一時メモリDBへ実入力を取り込み、3名を名称で各1件取得、Wikidata ID・`registered`状態・確認済み事象0件を確認。相良頼房は従来ID・QIDのまま。
- 変更前との比較：既存69人物の内容は一致。命題・所在・場所・実装年表・実装拠点のJSONLはバイト一致。追加3出典のURLに既存重複なし。
- `git diff --check`：通過。

描画・ゲーム進行・日付・保存形式には変更がなく、ブラウザやゲームサーバーは操作していない。
