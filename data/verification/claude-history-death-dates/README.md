# 年表の死去の日付の照合（Claude、2026-11-05）

報告書：`docs/reports/DEATH_DATE_KOBUN_REVIEW.md`。照合の全体は年表 665 件で、この組は「死去（`death`）で題名のあるもの」20 件を全て扱った。

## 行ったこと

- 東京大学史料編纂所「大日本史料総合データベース」の綱文を、和暦の年月日で 24 回、語句で 8 回引いた（20 件の日付、織田信孝の異説の日付、閏月の書式の確認、日付で見つからなかった 2 件の語句検索）。画面の検索と同じ問い合わせを、同じページの中から順に送った。データは保存していない。
- 旧暦の日付をゲームの暦表（`koyomi.js`）で西暦に直し、年表（`TK.HIST`）の日付と比べた。
- 結果：一致 17 件、不一致 2 件（粟之巣の変、岩屋城の戦い。どちらも 1 日の差）、綱文に日付なし 1 件（山中幸盛）。年表は変えていない。

## 検査

- `node tools/research/export-evidence.cjs`：確認済み命題 103 件、所在記録 22 件。変わった出力は `claims.jsonl`・`people.jsonl`・`sources.jsonl`・`manifest.json` の 4 つ。
- `evidence-store.cjs`・`location-store.cjs`・`history-index.cjs`・`history-sqlite.py`（125 記録、321 照合）・`history-sqlite-inputs.py`・`history-cube.py`・`organization.cjs`・`secret-scan.cjs` が PASS。
- `node tools/research/query-history.cjs --entity 武田信玄` と `node tools/research/query.cjs 信長 1582` で、新しい命題が引ける。

## 未確認

- 綱文の関連史料の本文（原史料）は読んでいない。不一致の 2 件でどちらの日付を採るかは未判断。
- 新しく登録した人物 15 人の典拠 ID（Wikidata・国立国会図書館）。
- 織田信孝の自害の日の異説（岐阜県博物館調査研究報告 37 号）は、Claude は未読。
- 年表の残り 645 件（題名の無い死去 43 件と、ほかの 14 種類 602 件）は未照合。
