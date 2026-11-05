# 史実DB向けのゲーム年表本文

ゲーム年表に設定された本文を、実装記録の `text` として保存する。本文がない行は
`null` とし、確認済み命題とは引き続き区別する。本文から人物・地名を抽出する処理は
この変更に含まない。Djangoでは `Record.payload` に本文が入る。

`node tools/research/export-evidence.cjs` と `node tools/checks/evidence-store.cjs` が通過。
変更前後で665件の既存フィールドが一致し、347件に本文が入った。一時SQLiteで
マイグレーションと取り込みを実行し、665件のJSONLがすべて `Record.payload` と一致し、
分類が `implementation` のままであることを確認した。
