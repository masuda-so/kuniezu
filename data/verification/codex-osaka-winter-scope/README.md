# 大坂冬の陣の表示範囲

2026-11-10、main 860e1882からの候補版。

- battle-conflicts.cjs: 親四子、未配置二戦闘の文章表示、既存二図の参照、親の自動再生除外を通過。
- 全114図と全TK.HISTのJSONを、mainと同じゲームコードのmodal-map-compassを比較対象にして一致確認。
- Django test_osaka_winter_keeps_campaign_and_local_events_separate: 1件3.32秒で通過。親四子、実装済み二戦闘、文章のみの登録二戦闘、元の終結イベントを区別。
- 対象PythonファイルのRuff、stamp一致、git diff --checkを通過。
- 専用Chrome、940/335px・高さ950px・DPR1・GPU無効。起動済み127.0.0.1:8000に候補JS/HTMLだけをFetchで差し替え。戦役はcanvas・再生UIなし、今福鴫野の既存図・日付・博物館出典・親へ戻る・地図へ戻るを通過。関ヶ原の既存入口も保持。JS例外0。
- ドライバー.cache/osaka-winter-scope/browser.cjsは既存文禄検査の対象名・日付・出典を冬へ変更した専用コピー。raw JSONと画像をローカルに保持。

全国遺跡報告総覧のPDF本文は前回読めたが、今回画像取得は429応答。画像で原頁を確認したとはしない。通常配信・通常DB・main反映は未実施。全隊配置の史実照合を証明しない。

追加検査:
- 独立Codex担当の読み取りレビューで修正必須の問題なし。親子、文章のみの戦闘、既存二図への接続、自動表示除外を確認。担当自身のDB/ブラウザ再実行なし。出典原頁は429で独立目視できていない。
- organization.cjs通過。
- Offline checks全件exit0（.cache/osaka-winter-scope/offline.log）。その後は親の案内文だけを「各地の戦闘を分けて見る」へ修正し、生成/stamp/battle-conflicts検査を再実行。和睦専用画面の存在を示唆しないための文言修正で、配置や日付の変更はない。

最終説明文の候補もfinal/で広狭ブラウザ検査を通過。監査生成物はfinal/へ退避し、追跡ファイルを元に戻した。
