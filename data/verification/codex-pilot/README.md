# 工程別パイロットの記録

`GAME_TEST_OUTPUT=data/verification/codex-pilot node tools/work/battle-effort-inventory.cjs`
で最終モデルの機械棚卸しを生成する。`battle-inventory.json`は型・確認状態の存在確認で、
史料の独立照合や全合戦の完成を示すものではない。

`battle-ui/measurement.json`は、既存の
`BATTLE_TEST_TITLES='設楽原の戦い|伏見城の戦い|大坂冬の陣'`
`node tools/checks/battle-counter-density-browser.cjs`の実行を外部で計時したもの。
main bcf46009、通常配信127.0.0.1:8000、専用headless Chrome、GPU無効、DPR1、940/335px。
6条件の実行29.601秒、終了0。`result.json`でJSエラー0、差し替え0を確認した。
画像と実行ログはこのフォルダに保管し、Gitへはこの説明だけを登録する。

これは機械実行時間で、史料確認・開発工数やUI全体の完成率とは別。
候補版の作成時間、原本確認、曖昧例の解決、レビュー、CI待ちは別途記録する。
