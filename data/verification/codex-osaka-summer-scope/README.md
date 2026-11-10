# 大坂夏の陣の表示範囲

2026-11-10、main 860e1882を基準とする候補版。

- battle-conflicts.cjs: 親子関係、樫井text-only、三つの図への参照、最終決戦日、既存隊の保持と親の自動除外が通過。
- organization.cjs、stamp-assets.cjs --check、git diff --check通過。
- baselineはmodal-map-compassのmainと同じゲームJSを読み取り比較。既存114図と全TK.HISTのJSONが一致、局地戦1図のみ追加。
- 実画面は専用Chrome、幅940/335px・高さ950px・DPR1・GPU無効・一時プロファイル。127.0.0.1:8000の起動済みサーバーを使用し候補JSとページのみFetchで置換。親はcanvas/再生UIなし、最終決戦は図・日付・博物館の出典あり、戻る遷移と関ヶ原の既存入口も通過。JS例外0。
- campaign-335.pngを目視。四つの子が区別され、画面内に収まる。方位マークが背景に残る既知問題は別候補effdb212で対応しており、本枝には含めない。

ブラウザドライバーは.cache/osaka-scope/browser.cjs。既存battle-conflicts-browser.cjsの戦役・子図・text-only子・日付・出典検査値を大坂へ置き換えた専用コピー。原本の文禄検査は書き換えていない。資料PDFと描画、結果JSON、画面画像はローカルに保持する。全史実配置の照合完了を示すものではない。

独立Codexレビューで翌八日の死亡演出の混入を指摘され修正。最終版のfocused検査は通過。修正前に開始したOfflineとブラウザの結果を最終候補の全件合格とは扱わない。最終版のブラウザ再確認は次に実施する。

最終候補の追加確認:
- sourceClockWindow[0,95]適用後のfinal/ブラウザ検査940/335px通過。最終決戦940pxも目視。
- 最終候補の既存114図と全TK.HISTのJSON一致を再確認。
- Djangoのtest_osaka_summer_separates_campaign_and_final_day通過（最終整形後3.54秒）。親4子、実装済み2図と新規最終決戦、元の終結イベントを区別し、図の日付を検証済みDB日付へ昇格しない。
- Ruffで対象テストファイルの検査通過。
- 独立Codex担当の再レビューで翌日演出の除外と元行路保持を確認、追加不具合なし。担当自身のブラウザ再実行はない。

最終Offline checksはソース固定後の別実行でexit0（.cache/osaka-scope/offline-final.log）。生成監査はfinal/へ退避し、追跡対象の監査ファイルを元に戻した。最終配信候補とドライバーのSHA256はfinal/artifact-sha256.json。
