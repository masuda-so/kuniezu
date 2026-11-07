# 地形・水域データの出典と加工

## 国境表示への変更と水域の時代区分

朝鮮河川の全区間ファイルは参考資料として保持し、通常起動では `korean-rivers-major.js` の主要河川344区間（多言語併記を正規化）だけを読む。`tools/geo/select-major-rivers.py` で再抽出できる。OSM帰属・ODbL条件は同じ。

`period-waters.js` の香取の海・十六島・谷原は、香取市「アーカイブ香取遺産 Vol.208」、茨城県「霞ヶ浦北浦と利根川の年表1」、茨城大学所蔵「常陸國絵図」の水域の連結を参照した手作業の概略推定域。画像の転載でも、測地補正で得た汀線でもない。画面にも浅瀬・葦原／推定と表示する。

W09-05は名称の接尾語を正規化して十和田湖も抽出。自然湖の比較輪郭は19件。粗い旧線との重複を除去し、干拓済みの現代形へ置き換えるべきでない旧潟・旧池は別に保持する。

更新：2026-11-01。確認・取得日は各項目に記載。以下は現在の地勢や比較用の輪郭であり、1560〜1615年の海岸・湖岸・造成前の地面を復元したものではない。

## 標高

- 日本の標高：国土地理院「標高タイル（PNG）」[詳細仕様](https://maps.gsi.go.jp/development/demtile.html)。2026-11-01確認。配信URLは `https://cyberjapandata.gsi.go.jp/xyz/dem_png/{z}/{x}/{y}.png`。符号付き24bit・0.01mを標高へ復号し、Mapzen DEMと同じ陰影計算・着色・再投影で使用。無効値128/0/0は透明にして親標高画像を保持する。現代の起伏であり戦国期の標高測量ではない。
- Mapzen / Tilezen, **Terrain Tiles**（Terrarium）。[AWS 公開データ](https://registry.opendata.aws/terrain-tiles/)、[供給元別の帰属表示](https://github.com/tilezen/joerd/blob/master/docs/attribution.md)。2026-10-31取得。
- 使用域の全球標高：USGS の SRTM / GMTED2010、NOAA の ETOPO1。Mapzen の統合データを使用。実際の解像度・欠測補間は地域により異なる。
- 配信元：`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`。
- `terrain/overview/` の30枚は z=6, x=53..58, y=23..27 の未変更の標高符号化PNG。詳細は同じ配信元から必要範囲を読み込む。
- `terrain-tiles.js` が標高を復号し、北西光源の明るい陰影へ加工。メルカトルのタイルをゲームの座標に投影する。旧画像の拡大表示ではないが、元データを超える精度を生成するものでもない。

## 朝鮮半島周辺の陸域

- Wessel, P. / Smith, W. H. F. ほか、**GSHHG 2.3.7**（2017-06-15）、full resolution L1。 [配布元と解説](https://www.soest.hawaii.edu/wessel/gshhg/)。[NOAA公開ファイル](https://www.ncei.noaa.gov/data/oceans/archive/arc0234/0304143/1.1/data/0-data/GSHHS_shp/f/GSHHS_f_L1.shp)。2026-11-01取得。
- 加工物：`korea-coast.js`。東経121.5〜131.3度・北緯33〜43度を切り出し、日本側の既存データと重ならない島を選別、座標を丸めてJSON化。2,336輪郭・128,835頂点（2026-11-01更新）。
- 加工手順だった `tools/geo/korea-coast.py` は削除済み（Git の履歴に残る）。`kuniezu/static/kuniezu/korea-coast.js` は加工済みのデータとして保持する。
- 原データおよびこの抽出データのライセンスは **GNU LGPL v3**。同じディレクトリの `GSHHG-LGPL-3.0.txt` に全文、`GSHHG-README.txt` に元の説明を同梱。抽出データとその加工手順を改変・再配布する際も、この表示とライセンスを保持する。
- 現代の世界海岸資料から構成された比較線。港湾埋立・干拓・干潟の時代差、測地ずれは解消していない。

## 関東の湖沼比較線

- 国土交通省、**国土数値情報 湖沼データ W09-05**（2005年度）。[データ解説・利用条件](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-W09-2005.html)。2026-10-31取得。
- 加工物：`lake-baselines.js`。霞ヶ浦・北浦・牛久沼・印旛沼・手賀沼のGMLを抽出し、座標をJSON化。生成元だった `tools/geo/lakes.py` は削除済み（Git の履歴に残る）。
- 国土交通省「国土数値情報（湖沼データ）」を加工して作成。国が戦国期の形を保証した地図ではない。
- ゲームでは破線と「比較湖岸」で区別。常陸國絵図、1511年の浜名橋之図等の史料情報は「街道・地図・進軍の出典」に別記する。

## 既存の地図と肖像

日本の既存陸域・領域は、既存版が加工した国土地理院資料などを継続使用。領主の境界には城を中心とする近似が残る。既存肖像の出典は Wikimedia Commons。今回これらの全データの来歴・利用条件の再点検を完了したものではない。

## 城・施設の代表座標

『日本歴史地名大系』施設・地点項目データセット（CODH作成） doi:10.20676/00000456、2025年5月15日版。CC BY 4.0。
https://geoshape.ex.nii.ac.jp/nrct-poi/

名称・所在地を照合し、同地域の候補を抽出して使用。代表点には推定誤差があり、城域・年代・所有関係の確定とは異なる。加工結果と採否は data/audits/site-coordinate-audit.json。

## 合戦地勢図

- `atlas/00.json`〜`110.json` は上記 Mapzen Terrain Tiles から、合戦ごとに160×112点の標高を採取したもの。原データの供給元と利用条件は標高の項を参照。339枚のタイルから加工、2026-10-31〜11-01取得。
- 緯度・経度の表示範囲は `data/audits/battle-atlas-frames.json`。戦場の範囲の確定値ではなく、地名を比較するための編集範囲。出力の `bounds` は西・北・東・南、標高は1m単位に丸めて32768を加えたuint16 little endian / Base64。
- 現代標高を等高帯へ加工し、水系・街道・位置の根拠を持つ駒と重ねる。標高データには現在の造成・埋立なども含まれ、戦国期の地面を示すものではない。
- 地名の代表点は上記CODHデータ。現在の本能寺は除外し、京都市の寺域説明に基づく旧地の概略点を使用。碑・史跡標示と当日の陣地を同一視しない。
- 表現方式の参照は Jimho, [Sekigahara.png](https://commons.wikimedia.org/wiki/File:Sekigahara.png), 2005。画像・地形輪郭・駒配置をゲームへ転載していない。

## 大陸・朝鮮の河川

- Natural Earth, [Rivers + lake centerlines](https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-rivers-lake-centerlines/)。[利用条件](https://www.naturalearthdata.com/about/terms-of-use/)はPublic Domain。
- 2026-10-31に公開リポジトリの `geojson/ne_10m_rivers_lake_centerlines.geojson` を取得。旧 `tools/geo/regional-rivers.py`（削除済み）で鴨緑江・豆満江・遼河・漢江・南漢江・洛東江を7レコード抽出し、`regional-rivers.js` とした。同名の中国の漢水は地域条件で除外。
- 一般化された現代河川の中心線。詳細な川幅・旧河道・当時の島の帰属は示さない。鴨緑江・豆満江に重ねた境域の線も、16世紀の確定した測地国境ではない。

## 椿海・飯沼・見沼の表示区分（2026-11-01）

- 千葉県「干潟干拓の歴史」 https://www.pref.chiba.lg.jp/ap-kaisou/kaisou/kibanseibi/higata.html ：椿海の実在と1670年の干拓。
- 坂東市立坂東郷土館ミューズ「飯沼新田物語」 https://www.city.bando.lg.jp/page/page002762.html ：享保期の飯沼干拓。
- さいたま市図書館「見沼田んぼコーナー」 https://www.lib.city.saitama.jp/contents?5=&pid=133 ：江戸初期までの沼沢地と1629年の溜井造成。

これらの解説は水域の実在・性質・年代の根拠であり、既存の7・8・6頂点の輪郭を裏付ける精密図面ではない。`water-evidence.js` で輪郭を未確定の概略として区分し、名称を表示する。古地図の転載はない。

## 現代道路の比較形状

`modern-road-reference.js` の道路形状は © OpenStreetMap contributors / ODbL 1.0。https://www.openstreetmap.org/copyright および https://opendatacommons.org/licenses/odbl/1-0/ を参照。派生道路データにも同じODbL 1.0を適用する。2026-11-01、FOSSGIS OSRMのrouted-bikeを使用し、既存の通過点順で82本を比較、過大な迂回や5km超の吸着を除外した78本を収録。形状の簡略化は `tools/geo/modern-road-reference.py`、取得と不採用の台帳は `data/audits/modern-road-reference-audit.json`。現代の橋・トンネルを含みうるため、史実未照合の線の描画用参考として使用し、行軍計算には使わない。

湖沼の比較輪郭は関東5湖に加え、河北潟・諏訪湖・余呉湖・宍道湖等の自然湖を含む18レコードへ拡張。原資料と利用条件は同じW09-05。干拓前の八郎潟等を2005年の面積へ縮める処理は行わない。

## 朝鮮半島の河川詳細・肖像表示（2026-11-01）

`korean-rivers-detail.js` は © OpenStreetMap contributors / ODbL 1.0。Geofabrikの https://download.geofabrik.de/asia/south-korea.html と https://download.geofabrik.de/asia/north-korea.html の2026-10-30スナップショットからwaterwaysだけを抽出。`tools/geo/korean-rivers.py` でriverクラスを選択し簡略化。現代の中心線であり、16世紀の川岸・ダム建設前の河道ではない。道路データと同じODbL条件・画面帰属表示を適用する。

`portraits/` は既存の調査素材を無改変で同梱し、Canvas側で顔の大きさ・中心を揃える。`data/audits/portrait-audit.json` に153件の検出結果と追加・高精細素材の出典を記録。新規登録の秋山虎繁（松本楓湖）、石川数正（長篠合戦図屏風）、有馬晴信（1943年刊行資料）、長宗我部信親（錦絵）はWikimedia Commonsの原資料ページで説明・パブリックドメイン表示を確認。写真による本人確認画像ではなく、肖像・後世の図像。AIで顔を生成しない。


## 2026-11-01 地図と操作の点検
- 茨城大学図書館『常陸國絵図』資料ID001000500097、CC BY。https://digitalcollection.lib.ibaraki.ac.jp/nakane/001000500097/ 。同一座標・縮尺の比較画像を data/verification/katori/registered-comparison.jpg に保存。北上への回転、4対応点によるアフィン変換、青色の現代比較湖岸を追加。原図の年代は目録に記載されず、16世紀の測量図と断定しない。対応点の当てはめRMSは4,069m、独立した位置精度の検証値ではない。
- 国土地理院標高PNG https://maps.gsi.go.jp/development/demtile.html を加工。z12の40タイル、現代標高3m以下を従来の史料上の概略域で制約した低地・浅瀬・葦原の候補。3mを戦国期の水位とみなさない。現代の堤防や人工地形も含み、正確な旧湖岸を保証しない。再生成：tools/geo/fetch-katori-dem.py → tools/geo/katori-registration.py。入力古地図は同資料のIIIFから取得して北上へ回転する。
- 顕如：Wikimedia Commons File:Kennyo02.JPG https://commons.wikimedia.org/wiki/File:Kennyo02.JPG 。原画像を保持し、頭部と肩を中心に切出し。原画はパブリックドメイン。
- 遼東の行政拠点の説明：遼陽博物館「第四展庁：元明清時期——行省、鎮城与都城」https://www.lnlymuseum.com/case/detail/id/8.html 。都市位置は概略で、都司敷地・城壁・明と女真諸部の厳密な境界を表さない。広寧古城は遼寧省文物管理処の1390年創建の説明を照合したが、現在の表示範囲外なので画面内にずらして追加しない。
- UIの見直しはNielsen Norman Group「5 Principles of Visual Design in UX」https://www.nngroup.com/articles/principles-visual-design/ の階層・対比・近接による意味付けを参照。軍の地理的位置と選択用の一覧を混同しない。

- 全111合戦範囲の詳細比較水路：© OpenStreetMap contributors / Geofabrik、ODbL 1.0。https://download.geofabrik.de/asia/japan.html および https://www.openstreetmap.org/copyright 。日本7地域は2026-10-31日付配布、朝鮮は既存の2026-10-30日付配布を切出し。範囲ごとの現代河川と、25km以下の図では名前の付いた細流を収録。48,631区間・194,306頂点（合戦図どうしで同じ河川を含む）。描画倍率に応じた簡略化を加えた。戦国期の河道・川幅ではなく、当時の改修・氾濫・廃流は個別照合が必要。各JSONに元のOSM way IDと出典を保持。生成は tools/geo/battle-rivers.py。
- 香取神宮・鹿島神宮の代表位置：『日本歴史地名大系』施設・地点項目データセット（CODH作成）doi:10.20676/00000456、CC BY 4.0。項目ID120000196200／080000180400。所在地の代表点を史跡として表示し、現存社殿の姿や神領範囲を当時へ先取りしない。根拠のない軍事ボーナスを付けない。

## 家紋と島清興の肖像（2026-11-01）

`../kamon/sources.json` に各ファイルの原ページ、制作者、ライセンス、取得物のSHA-256を保存。Public Domain、CC BY-SA 3.0、CC BY-SA 4.0が混在するため、個別の記録に従う。家紋は家を識別する代表意匠として表示し、個々の戦場でこの図案の旗が使われたことを意味しない。SVGは原取得物を保持し、表示時は白い余白を除き、縦横比を保持して旗の中へ配置する。ゲームの「画像・家紋の出典」からも原ページとライセンスに移動できる。

`../portraits/島清興.jpg` はWikimedia Commons `File:Shima Sakon.jpg`、落合芳幾（歌川芳幾）による後世の浮世絵、Public Domain。原画像を保持し、画面表示時に頭部を切り抜く。生前の肖像・写真と見なさない。切り抜き範囲は `kamon.js`。

## 行軍経路の標高断面

`../route-terrain-profiles.js` は同梱Mapzen Terrarium z6（USGS / NOAA等）から抽出した現代地形の概観。日本・朝鮮で同じ手順を用いる。細かな峠・堤防・橋・歴史時点の河道を復元した測量ではない。係数と街道整備Lv.はゲーム上の設計で、記録された着陣日は保持する。生成方法と対象300区間は `../../tools/geo/route-terrain.py`、`../../data/audits/route-terrain-review.json`。


## 椿海の概略湖岸（2026-11-01）
建設省国土地理院『土地条件調査報告書（銚子・鹿島地区）』（1979）本文47～48頁、図16～17を比較。図16の内側の水際を読図し、国土地理院の住所検索で一致した5村名の代表点で座標登録した。102頂点、当てはめ誤差RMS643m。原図は17世紀の開拓時を扱う絵図で、戦国期の実測図ではない。現代DEMの閾値のみで旧湖岸を作る案は棄却。原図は配信せず、調査記録と出典URLを保持。生成：tools/geo/tsubaki-registration.py。

朝鮮北辺の参考線（2026-11-01）：鴨緑江・豆満江はOSMの多言語名を照合して97/44区間の現代参考流路を使用。Natural Earthの概略線との二重描画を除去。国史編纂委員会「白頭山定界碑の建立」は北辺の行政支配の変化と1712年定界の説明として参照し、後世の定界を16世紀の精密国境へ遡及しない。

### 地理院の道路中心線（北国街道の比較資料）

地理院 experimental_rdcl（https://github.com/gsi-cyberjapan/experimental_rdcl）の道路中心線を北国街道北部の比較線に使用。国土地理院のコンテンツ利用規約による。取得URL・SHA・欠測はdata/inputs/hokkokukaido-review/gsi-roads/manifest.json。現代の地物資料であり戦国期の道筋の確定資料ではない。

## 児島湾の干拓前の海（推定）

- 国土交通省 河川局「高梁川水系の流域及び河川の概要（案）」参考資料1-1、図4-1-1「岡山平野の干拓進展図」（高田正規原図、出典『日本地誌 第17巻 岡山県・広島県・山口県』）。2026-11-03取得。
- 図の干拓区画を読み取り、1560〜1615年の海陸を推定した領域差分の型紙だけを同梱する。図そのもの・PDF は同梱しない。年ごとの汀線や水路の幅を示すものではない。

## 生成元の削除（2026-11-03）

地図の正本を画像（`kuniezu/map/`）にしたため、線の地図データを作っていた生成器（`tools/geo` の `korea-coast.py`・`lakes.py`・`land-extension.py`・`regional-rivers.py`・`korean-rivers.py`・`select-major-rivers.py` など）は削除した。各データの出典・ライセンスの表示はこのファイルのとおり保持する。加工手順は Git の履歴で確かめられる。

## 三州街道の伊那谷経由の比較線（2026-11-07）

- 地名代表点：『江戸宿場データセット』（ROIS-DS人文学オープンデータ共同利用センター作成）、v1.1、doi:10.20676/00000477、CC BY 4.0。https://codh.rois.ac.jp/historical-gis/edo-post/ 。R505の18地点を比較用の通過地域に使用。江戸期の代表点を戦国期の宿駅成立・関所位置の証明には用いない。
- 浪合〜稲武の物理的形状：国土地理院「道路中心線ベクトルタイル提供実験」を加工。https://github.com/gsi-cyberjapan/experimental_rdcl 。2026-11-07取得。現代の隧道を含む比較であり、16世紀の道路の存在・姿を確定しない。
- 北側・稲武以南：© OpenStreetMap contributors / FOSSGIS OSRM、routed-foot、ODbL 1.0。全体に過大迂回がある照会結果から、審査した区間だけ採用。派生比較線を同じODbL 1.0で提供する。
- 入力・採否・SHA：`data/inputs/sanshu-road-review/`、生成器：`tools/geo/sanshu-reference.py`。表示と表示用行軍の共通線。史実の着陣日は変更しない。
