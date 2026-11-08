# 三人物典拠の取込検証

2026-11-08、`codex/person-authority-next-three`。専用作業ツリーのローカルSQLiteへmigrate・import_historyを実行した。稼働中8000番の作業ツリーのDBは変更していない。

人物91、地点43、実装施設461、実装イベント665、カタログ1506、戦役13、史実命題155、所在22、綱文478＝3434記録。事象1449件と親子リンク10件を保持した。

読み取り専用SQLで`history_thingname`と`history_thing`を結合し、以下の7表記がそれぞれ同じ安定IDへ一意に結び付くことを確認した。

|表記|安定ID|
|---|---|
|細川藤孝・細川幽斎|person:hosokawa-fujitaka|
|織田長益・織田有楽斎・織田有楽|person:oda-nagamasu|
|斎藤道三・斎藤利政|person:saito-dosan|

CLIの`history_query --about`も別名3件で実行した。これは登録された事象の検索であり、同定だけの登録に新たな経歴・所在を作らない。SQL結果JSONは一時検証出力へ保持した。DB本体をGitへ入れない。

`tests/test_history_import.py`の既存50件と、別名・期間前登録8件、原本・索引・所在検査、Ruff、対象Pythonのmypyが通過。道三にプレイ対象カタログを期待していた検査は、PERSON登録と非プレイ対象を区別して修正し、該当8件を再実行した。新しい命題・所在・プレイ画面変更はないため、ブラウザを追加起動していない。
