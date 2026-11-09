# 羽州道の江戸期比較線を編集正本へ移す

## 範囲と根拠

旧PR55の採用案を、実行時補正ではなく編集正本 `physical/roads-reference.geojson` へ移す。保存済みCODH公開地図GeoJSONのR201・頂点1778〜1973（0始まり、両端含む）を直接使う。元GeoPackage由来の旧採用案との対応は、196点すべてが小数6桁化の許容差内、最大約7cmだった。これを戦国期の位置精度としない。

矢立峠から石川付近の488点を196点に置換し、5106点から4814点となる。全線の端点は不変。他の84地物は属性・形状とも不変。南側約12m・北側約239mは概略接続として明示する。大鰐付近で同じ交差点へ戻る比較線は除かれる。江戸期の比較線で、1560〜1615年の精密な経路の確定ではない。

[国土交通省の弘前側の解説](https://www.thr.mlit.go.jp/aomori/syutu/hirokoku/rekishi_kaidou/usyu-kaidou3/usyu-kaidou3.html)は、石川西側の街道の変更を1685年としている。[乳井通り](https://www.thr.mlit.go.jp/aomori/syutu/hirokoku/hirokoku_rekisi/hirokoku-rekisi/aomori_rekisikaidou/nyui-kaidou/nyui-kaidou-1.html)は鯖石で分かれ浪岡で再合流する別路線で、同一交差点へ戻る閉路と同一視しない。

## 保全と担当

採用記録に原本SHA・原本の地物/頂点範囲・除去点・挿入点・変更前属性を保存する。変更前ファイルも作業中の比較用に保全した。旧Nov1のCodex自身の東山道の担当記録を退避して解放し、羽州道の具体的な範囲を取得した。東山道・羽州道の史実照合全体を完了とはしていない。

作業ツリー作成/再接続APIはGitを検出できず、CLIのGitは正常だったため、Git標準コマンドでmain7dd75c72基点の専用一時ツリーを作成した。他担当のツリーは転用していない。

## 確認済みの範囲

構文、84地物の不変、原本196点との完全一致、復元可能な差分、全線端点の保持、該当閉路の不在を確認。全319接続を変更前後で比較し、檜山―石川（973→681点）と三戸―石川（630→609点）の2接続が変更、317接続は不変だった。全接続の端点を保持し、経路網の節点は56651→56587となった。採用は江戸期比較線の範囲で記録した。専用検査で v26 の軍・武将の小数日位置、元の到着期限、移行一回性を確認した。`road-vectors.cjs`・`movement-save-position.cjs`・`movement-save.cjs`・`movement-clock.cjs`・`castle-era-position.cjs` は通過した。

配信準備では `build-map.cjs --vectors-only` と `--vectors-only --check` を実行し、7ファイルの座標無変更の複写と正本とのバイト一致を確認した。`stamp-assets.cjs --check` と `git diff --check` も通過した。

## 実画面

起動済み8000番を専用一時Chromeで開き、候補の静的ファイルと無改変ビルドのGeoJSONだけを応答差替えして検証した。通常配信への反映確認とは区別する。南端接続・旧閉路・北端接続の3地点×1400/390幅の6画像を確認し、停止再開、v26保存の軍と単独人物の期限到達、原本破損時の初期化拒否と再読込を検査した。共通manifest 1回・道路GeoJSON 1回・旧比較JS 0回、例外0。画面内の地形や川の歴史的正確さ全体を、この試験の合格で証明しない。

描画待ち60標本の中央値128.6ms・最大237.7ms、GC後のJSヒープ約166.7MB（専用headless Chrome、両幅・候補差替え）。比較前の同条件測定がないので性能改善値とはしない。広域性能の要望は別途評価を続ける。[実行条件と証拠](../../data/verification/codex-ushu-road-vectors/README.md)。

提出前の `offline.cjs`・`organization.cjs`・`work-policy.cjs`・`infrastructure.cjs` は通過。検査が書いたhistory-focus監査は事前退避と同じバイトへ戻し、他の63監査も不変を確認した。全街道の史実照合条件は残るので、対象の担当記録は完了扱いにせず解放する。
