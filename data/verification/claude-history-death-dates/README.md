# 年表の死去・事件の日付の照合（Claude、2026-11-05）

報告書：`docs/reports/DEATH_DATE_KOBUN_REVIEW.md`。

## 行ったこと

- 東京大学史料編纂所「大日本史料総合データベース」の綱文を、和暦の年月日で 16 回引いた（14 件の日付と、織田信孝の異説の日付、閏月の書式の確認）。画面の検索と同じ問い合わせを、同じページの中から順に送った。データは保存していない。
- 14 件とも、該当の日付の条に、その人物の死去（殺害・自害を含む）の綱文があった。
- 旧暦の日付をゲームの暦表（`koyomi.js`）で西暦に直し、年表（`TK.HIST`）の日付と比べた。14 件とも一致。

## 検査

- `node tools/research/export-evidence.cjs`：確認済み命題 98 件、所在記録 22 件。変わった出力は `claims.jsonl`・`people.jsonl`・`sources.jsonl`・`manifest.json` の 4 つ。
- `evidence-store.cjs`・`location-store.cjs`・`history-index.cjs`・`history-sqlite.py`（120 記録、306 照合）・`history-sqlite-inputs.py`・`history-cube.py`・`organization.cjs`・`secret-scan.cjs` が PASS。
- `node tools/research/query-history.cjs --entity 武田信玄` と `node tools/research/query.cjs 信長 1582` で、新しい命題が引ける。

## 未確認

- 綱文の関連史料の本文（原史料）は読んでいない。
- 新しく登録した人物 10 人の典拠 ID（Wikidata・国立国会図書館）。
- 織田信孝の自害の日の異説（岐阜県博物館調査研究報告 37 号）は、Claude は未読。
