# 三州街道の独立ブランチでの検証

2026-11-07、基準main `63c50974` から切った `codex/sanshu-valley` で検証。別の作業ツリーの613件の未コミット差分をコピーせず、三州の入力・生成・経路版・必要な検査だけを分離した。

Djangoのテンプレートを描き、このブランチの静的ファイルを一時HTMLから読み込む専用Chromeを使用した。地図の正本は変更せず、地図配信キャッシュだけを既存作業ツリーから参照した。共有8000番や普段のブラウザ・保存は変更していない。

```sh
GAME_URL=<候補ページ> GAME_TEST_OUTPUT=data/verification/codex-sanshu-isolated node tools/checks/sanshu-route-browser.cjs
```

- 伊那・高遠、浪合・平谷、岩村・根羽を幅1400px・390pxで表示。
- 表示3086点、現代比較の分類、経路版24と出典IDを確認。
- 浪合〜平谷の行軍表示APIが100点超の経路を返し、全点が表示街道の点列に一致。
- 旧版22・23の保存枠をUIから読み、位置・日内進捗・日付・兵数・到着時刻を保持したまま版24へ移行。
- JavaScript例外なし。結果：`PASS: Sanshu valley and mountain comparison, movement follows road, 3 regions at 2 widths, version 22/23 slot migration, no exceptions`。

画像・生成JSONは同じディレクトリに保存し、Git管理外。これは1560年の操作用状態での描画・保存検査であり、全時代の史実行軍を追跡した検査ではない。

サーバー不要の検査では、三州の再生成・他街道の非破壊、再生成順序、保存位置、基本検査の7シナリオ各720日、構成・基盤、配信確認値を確認。再生成の試験2件・負例5件を含むDjango試験全32件が合格し、Ruff・mypyも通過した。広幅の伊那・高遠と狭幅の浪合・平谷の画像を目視した。

PR #59のCodeQL指摘対応後、共通CDP引数受渡しを専用一時Chromeで確認した。コード断片を含む文字列はデータのまま、例外は検査側へ伝播し、ナビゲーション後も取得し直した文脈で呼び出せる。変更した8つの街道検査関数を実ゲームへ渡し、名前・版24の戻り値を確認。9モジュールの構文検査も合格。検査結果JSONは `browser-arguments-result.json`（Git対象外）。
