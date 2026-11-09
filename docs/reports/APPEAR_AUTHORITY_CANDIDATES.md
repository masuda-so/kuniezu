# 年表の登場人物 118 人の典拠候補を取る（2026-11-09）

年表の「登場」（`appear`）185 行は、能力値つきの人物の登場の実装記録で、綱文の日付つきの命題とは性質が違う。Codex と、人物の存在・生年・仕官の典拠と、ゲーム上の登場・能力の設定を別に確かめる扱いにした（受入の対象からは外さない）。その最初の工程として、典拠の無い 118 人の Wikidata の候補を取った。

- 道具：`tools/research/appear-authority-candidates.cjs`（`wbsearchentities` と `wbgetentities`。出力先が既にあれば止まる）。
- 結果：`data/research/source-notes/appear-person-authority-candidates.json`（要求の URL・時刻、候補の版・生没年）と、要約 `appear-person-authority-candidates.md`。
- ゲームの生年と Wikidata の生年が一致する候補がちょうど 1 人：93 人。一致する候補なし：25 人（ゲームの生年が空の 5 人を含む）。

これは同定ではなく、`curated/people` へは採用しない。採用は、公的な出典で姓名以外の 2 項目を確かめる別の工程で、これまでの典拠の便と同じ形式で行う。ゲームの生年も史料で確かめた値ではない。

## 検証

- `secret-scan.cjs`・`source-note-privacy.cjs`・`offline.cjs`・`organization.cjs`・`work-policy.cjs`・`evidence-store.cjs`：通過。
- 命題・人物・場所の入力と、集約の書き出しは変えていない。
