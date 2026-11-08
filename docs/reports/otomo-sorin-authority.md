# 大友宗麟・義鎮の典拠統合

両名を安定ID `person:otomo-sorin` にまとめ、NDL典拠00625175・大分市文化財課・宗像古文書翻刻で同定した。宗滴との同一性、日付・所在の命題は追加せず、ゲームの表示・イベントも変更しない。

NDL単独典拠をWikidata用snapshotへ偽装せず、`ndlSnapshot` から短い典拠ノートと取得JSON-LD原本を参照する。原取得SHA、典拠URI、個人種別、名称、別名、ローカル人物名を汎用の小さな検査分岐で照合。別人ID・原本にない別名・改変SHAを拒否するfixtureも実行した。原本に含まれる生没年は取得メタデータのままで、新しい史実命題に転用していない。

担当ファイルは人物1件、典拠ノートJSON/Markdown/原本JSON、evidence-store検査、この報告、export出力。コミット・公開・サーバー操作は担当していない。

検証：`export-evidence.cjs`、`checks/evidence-store.cjs`、`checks/history-index.cjs` 成功。出力人物85件、命題118件、所在22件。入力の命題・所在は編集していない。専用の一時検索fixtureで宗麟・義鎮・安定人物ID・NDL IDの4検索が同一人物を参照し、典拠IDの重複がないことを確認。検索fixtureは史実出力に追加していない。

RDB取込も確認：既存人物統合テストを豊臣（Wikidata）と大友（NDL単独）へparameterize。実入力をimport_historyへ渡し、両別名が同一Thing、ゲーム名の別Thing不在、同一Authority、NDLケースの虚偽Wikidata不在を検証。全入力保持・再取込不変を含む限定pytestは `4 passed, 35 deselected`（10.13秒）。`--ds=config.settings.test` の一時DBで実行し、運用DBやサーバーを触っていない。典拠ノートの84件は採用前衝突監査と明示し、実確認日2026-11-07は維持した。
