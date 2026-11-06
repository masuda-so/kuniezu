# CODH江戸期地理データの参照入力

2026-11-07に公開地図が参照するGeoJSONを通常HTTPSで取得した。紹介ページ・スクリプト中のリンクをたどり、配布ZIPの403を迂回していない。ZIP／GeoPackageとの同一性は未検証であり、これらを「公式ZIP原本」と呼ばない。

4データセットの5表現を改変せずgzipで保持し、展開後の元バイト列と圧縮ファイルのSHA-256を `manifest.json` に記録する。総圧縮サイズは約4.6MB。再配布条件とクレジットは各項目へ明記した。HTML本文・メニューは保存しない。

| 表現 | 地物数 | 注意 |
| --- | ---: | --- |
| 海岸線 | 1888 | LineString1881・MultiLineString5・null2。全てobject_id=1929。一意キーに使えない。非閉合列を勝手に閉じて陸面を作らない |
| 湖沼点 | 1551 | 各1点のMultiPoint。1550ID、29006が異座標で重複 |
| 湖沼面 | 573 | MultiPolygon。点から輪郭を推定しない。点978行には面がない |
| 街道 | 47 | LineString、37基本ID。R200の本州・北海道区間を一筆に連結しない |
| 宿場 | 1569 | 1421宿場ID・90街道ID。同一宿場IDでも田丸・熊本の座標が異なり、平均や先勝ちをしない |

宿場90路線のうち54路線は今回の線データにない。三州街道R505も該当する。点を直線で結んで補完せず、既存の史料付き経路との比較へ回す。湖沼データは江戸末期〜明治初期に形状が変化・消滅したものが主対象で、全湖沼の網羅ではない。紫雲寺潟と見沼溜井に面がないことも確認した。

## 座標と同一性

海岸・湖沼・街道の原本は `OGC:CRS84` を宣言する。宿場原本にはCRS宣言がなく、[RFC 7946 §4](https://datatracker.ietf.org/doc/html/rfc7946#section-4)の経度・緯度として解釈したことを、測地系の明記と区別する。現在のゲーム平面や画像ピクセルへ変換せず、実座標を保持する。

重複するデータ上のIDを原本行の同一性に使わない。参照は原本SHA＋`/features/<行番号>`。派生GeoJSONのfeature.idは行番号であり、版を超えた人物・施設・水域の恒久IDではない。元のpropertiesは全て保持する。年代・存在・施設区分・ゲーム拠点との対応は別途史料付きで登録し、江戸の宿場を自動的に戦国期施設へしない。

## 変換と検査

```sh
python3 tools/geo/codh_reference.py
python3 tools/geo/codh_reference.py --output /tmp/codh-reference-new
uv run pytest tests/test_codh_reference.py
```

出力先は新規ディレクトリに限る。全入力を検査してから出力し、元の座標・属性・null・分かれた地物を保持したGeoJSONと、出典・対応関係のmanifestを生成する。既知のCRS拡張を落として経緯度と行番号IDを明示するだけで、地形補正・線の連結・空欄補間・間引きをしない。これは全てのGeoJSONを検証する汎用GISではなく、本入力の受入検査であり、位相の正しさを証明しない。

## 出典と利用条件

4データセットはCC BY 4.0。データの名称・CODH作成・DOIはmanifestのcreditに記録する。湖沼は一覧のフッターから類推せず、[霞ヶ浦の個別ページのライセンス節](https://geoshape.ex.nii.ac.jp/edo/lake/08001.html)と[紫雲寺潟の個別ページ](https://geoshape.ex.nii.ac.jp/edo/lake/15010.html)で確認した。

- [海岸線／水域](https://codh.rois.ac.jp/historical-gis/edo-coast/)：DOI 10.20676/00000453。
- [湖沼](https://geoshape.ex.nii.ac.jp/edo/lake/)：DOI 10.20676/00000467。
- [主要街道](https://codh.rois.ac.jp/historical-gis/edo-road/)：DOI 10.20676/00000452。
- [宿場](https://codh.rois.ac.jp/historical-gis/edo-post/)：DOI 10.20676/00000477。

海岸線は20万分の1前後を想定した江戸末期〜明治初期の参照資料。小数桁数を戦国期の位置精度とみなさず、児島湾・香取海等の史料付き補正とは別層で扱う。
