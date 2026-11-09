# 人物典拠18名のRDB確認

2026-11-09。独立した作業ツリー `codex/person-authority-eighteen` のローカルDBへ `uv run python manage.py import_history` を実行した。PERSON 109、総記録3,452、新規version 18、retired 0。phenomenon 1,449・participation 972は維持。

`history_thingname` と `history_thing` を `thing_id` で結び、採用した19表記が18の英字安定IDにそれぞれ一意に対応することを、SQLite `mode=ro` 接続で確認した。島清興・島左近はともに `person:shima-kiyooki`。堀秀政／秀治、筒井順慶／定次、蜂須賀正勝／家政／至鎮は別々のIDを保つ。

取込試験76件、原本・索引・所在の検査とRuff／対象Pythonのmypyに合格。claims、location-observations、implemented-events、implemented-sitesはmain原本とバイト一致。生没・所在・所属の命題を追加せず、名前の同定だけを追加した。ブラウザ表示を変える作業ではないため、この変更単独の実画面検査は実行しない。
