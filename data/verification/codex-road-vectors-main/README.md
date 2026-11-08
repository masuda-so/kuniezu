# 道路GeoJSON移行のmain実配信確認

2026-11-08、main `0ccefcec078dfc9879b5c72c86418438cc7ada70`（PR99）。許可済み8000番を同じ作業ツリー・127.0.0.1限定で再起動し、編集正本6GeoJSONと配信物のバイト一致を確認した。サーバー待受PID48345（この検証時点）。

専用一時Chromeを一件ずつ起動し、終了後に閉じた。

- `codex-road-vectors-main-page/`：Djangoの通常HTTP応答を使用。タイトル・1560年の広狭・回転・全域と、1560/1584の水域を確認。5756地物の読込とJavaScript例外0。候補ファイルへの差替えなし。
- `codex-road-vectors-main-failure/`：manifestだけを検査ブラウザ内で拒否し、起動画面を保持して再読込を提示することを確認。JavaScript例外0。サーバーのファイルは変更していない。
- `codex-road-vectors-main-march/`：通常HTTP応答で、道路85路線・日本戦略74路線・geometryVersion24。manifest1要求、道路1要求、旧比較JS0要求。東山道・三州・若狭の広狭表示、今川勢の停止時位置一致・再開進行・着陣予定不変を確認。JavaScript例外0。この通常配信実行では破損道路の差替えは行っていない（`retry:false`）。道路SHA破損と再読込の確認はPR99の候補検証記録を参照する。

JSON・画面PNGは各検証フォルダに保持し、Gitにはこの要約だけを入れる。画面も目視した。形状の移行一致を、全街道の戦国期経路照合の完了とは扱わない。
