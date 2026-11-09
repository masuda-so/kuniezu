# 城位置・残り1日未満の保存：最終実画面検証

2026-11-09、親担当が専用Chromeで実施しexit 0。起動中サーバーに対して、候補の次の2JSだけをFetch差し替えした。

|候補|SHA-256|
|---|---|
|engine.js|36d3b83e50d23ae78b8d0023ef3dbc7f94664f32b4bd824339d1a55bce680830|
|movement-continuity.js|d94f1fd7f7d2bee6fcd721a1a0fdafa87a32f29796df2add33f941265ac36eb9|

新規1585開始の広狭表示と実旧初期化保存の復元に加え、日内時刻0.75・翌日到着の合成保存を確認した。実際の`G.historyPoint`・`G.personPoint`で、保存時、残り時間の50%、期限直前、期限、期限後の全てが期待位置に一致した。到着期限は変更せず、その時点で両者が新目的地に到達した。実行時例外0。

親担当が`synthetic-subday-at-deadline.png`を目視確認した。これは互換性検査用の合成移動であり、史実の人物行程や部隊配置を追加したものではない。

結果JSONと画像は`/tmp/kuniezu-castle-era-final-browser/`からこのディレクトリへ複写した。Gitへ登録するのは本READMEだけで、JSON・画像は登録しない。前回のengine単独差し替えの確認は`../codex-castle-era-position-init/README.md`に別途保持する。
