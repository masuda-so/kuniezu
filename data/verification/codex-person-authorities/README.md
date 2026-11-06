# 人物典拠追加の検証

2026-11-07、`codex/person-authorities` の10人物の入力を検証。

- 人物59→69。史実命題103件・所在観測22件はHEADとバイト一致。
- `node tools/checks/evidence-store.cjs`：原本SHA、取得ID・revision・人間分類Q5、日本語ラベルの有無、照合項目、固定版URLと人物入力の対応が合格。
- `node tools/checks/location-store.cjs`：人物ID・別名・典拠IDの一意性と既存所在入力が合格。
- `node tools/checks/history-index.cjs`：同じ記録を年月・対象から引く共通索引が合格。
- `python3 tools/checks/history-sqlite.py`：125記録・353件のJS/SQL比較が合格。
- Django `test_every_input_record_is_kept_once` と `test_people_are_one_thing_under_all_their_names`：2件合格。
- 対象差分の空白検査が合格。

表示コードを変更していないため、この証拠は地図・肖像・行軍の画面検証を示さない。Wikidataの生没日・所在を新しい史実命題として採用していない。
