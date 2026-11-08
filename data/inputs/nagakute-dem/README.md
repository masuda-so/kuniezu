# 長久手の現代比較標高

国土地理院の標高タイルDEM10B（z14）4枚、288,614バイトを2026-11-08に取得。原本URL・SHA・利用条件はinput-manifest.json、生成器・入力のSHAと出力SHAはgeneration-manifest.jsonに保持する。地理院タイルを加工して作成。出典：<https://maps.gsi.go.jp/development/ichiran.html>、符号仕様：<https://maps.gsi.go.jp/development/demtile.html>、利用規約：<https://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html>。

表示範囲に対して192×192、約9.5×9.9m間隔の経緯度格子を生成する。各点の包含画素を採り、符号付き0.01m値を1m整数へ丸める。NoDataの補間や埋め値は行わない。現代の地表の比較資料であり、戦国期の造成前地形を確定したものではない。河川は出典付き既存09.jsonから範囲と重なる記録を保持し、新しい座標は作らない。

再生成：`node tools/geo/build-local-dem.cjs --manifest data/inputs/nagakute-dem/input-manifest.json --output-dir <新規作業先>`。同じ作業先へ`--check`を付ければ、入力SHAと全出力のバイト一致を読み取り確認できる。配信するのは生成したnagakute-local.jsonのみ。既存の異なるファイルは無条件上書きしない。

`node tools/checks/local-dem.cjs`は全36,864点を別のMercator式・符号計算で照合し、配信物と原本・生成記録のSHA、入力不変と出力保護を検査する。PNG decoderは生成器と共用。元の広域09.jsonを引き伸ばして細密化したものではない。
