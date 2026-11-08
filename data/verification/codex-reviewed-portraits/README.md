# 登録漏れの肖像3人の実画面検証

2026-11-09、127.0.0.1:8000のDjango実ページを専用Chromeで確認。伊東義祐・高橋紹運・龍造寺政家を共通表示経路の3サイズで表示した。

| 条件 | 結果 |
|---|---|
| 通常取得 | 9画像、文字代替0 |
| 主画像のみ失敗 | 専用WebPから9画像、文字代替0 |
| 主画像と代替が失敗 | 画像0、9件の文字表示 |

全条件でJavaScript例外0、画像取得の同時数は最大2、URLごとの取得は最大2回。通常画面と3人の切出しを目視し、顔の中心と同じ128pxセルを確認した。代替セルは主JPEGを復号した画素と一致する。全人物や全シナリオの表示網羅を示す検査ではない。

再現例（`PORTRAIT_MODE`を`normal`・`primary-fail`・`all-fail`へ変更）：

```sh
PORTRAIT_MANIFEST=tools/faces/reviewed-portraits.json PORTRAIT_FALLBACK_FILE=portraits/reviewed-fallback.webp PORTRAIT_MODE=normal GAME_TEST_OUTPUT=data/verification/codex-reviewed-portraits/normal node tools/checks/portrait-fallback-browser.cjs
```

各条件のresult.jsonと画面PNGは同名の子ディレクトリに保存し、Gitにはこの要約のみ登録する。
