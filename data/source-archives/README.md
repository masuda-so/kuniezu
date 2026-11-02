# 原取得物の照合用アーカイブ

通常の閲覧は [資料ノートの索引](../research/source-notes/README.md) から行う。

`html/` は取得当時のHTMLをgzipで圧縮した照合専用の原本。本文の確認・再変換・出典ページ更新との差分確認に使う。ゲームでは読み込まない。

ノートと `data/research/source-notes/manifest.json` に、原取得HTMLの展開後SHA-256と圧縮ファイルのSHA-256を保持する。文字コードも各ノートに明記する。要約本文のSHAと原本のSHAを混同しない。

復元例：

```sh
gzip -dc data/source-archives/html/historical-map-candidates/naro-habs-faq.html.gz > /tmp/naro-habs-faq.html
```

過去コミットの履歴は書き換えない。PDF・画像・GISの原入力は元の資料フォルダに残す。検証用のUI試作HTMLは史料ではないため、この移行の対象外。
