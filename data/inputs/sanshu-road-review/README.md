# 三州街道の比較線の入力

2026-11-07。塩尻市が説明する伊那谷・駒場・根羽・岡崎の経由関係と、CODHの地名代表点を照合した。高遠を本線の通過点とする旧入力を使わない。

- `controls.json`：江戸宿場データセットの18地名代表点。CC BY 4.0、doi:10.20676/00000477。これは1560年の宿駅存在表ではない。
- `osrm-foot.json.gz`：routed-footの照会結果と、全体を棄却した審査結果。北側・稲武以南のみ採用。旧照会の45km閉路がある `../sanshu-modern.json` は不採用のまま保持する。
- `gsi-road-tiles.tar.gz`：現代道路の原入力とタイルURL・SHA。浪合〜稲武を結ぶ取得範囲。225タイル中32件は404（道路形状の配信なし）。193ファイルを使用し、現実に道路がないという意味にはしない。
- `adoption.json`：入力SHAと採用した点列のSHA。承認されていない別の入力へ自動追従させない。
- `accepted-whole-reference.json`：審査済みの比較線。全体の比較線を再生成する際にも、この入力を取り込む。

`python3 tools/geo/sanshu-reference.py --candidate` は候補を審査し、配信用ファイルを変更しない。通常実行でこの一街道と対応する出典ブロックのみ生成し、`--check` で再生成一致を検査する。Python標準ライブラリのみを使う。

地理院形状のタイル間に見えた欠落は周辺タイルを追加取得して解消し、離れた成分へ直線を作っていない。OSMとの境は同じ道路の6.52m・0.78mの位置差を持つ。3mのRDP簡略化を加えた。現代の隧道を含むため、精密な戦国期中心線とは別に扱う。

出典と条件：

- 塩尻市：https://www.city.shiojiri.lg.jp/soshiki/35/3943.html
- CODH：https://codh.rois.ac.jp/historical-gis/edo-post/ （CC BY 4.0）
- 国土地理院：https://github.com/gsi-cyberjapan/experimental_rdcl
- OpenStreetMap：https://www.openstreetmap.org/copyright （ODbL 1.0）

配信する派生道路比較線はODbL 1.0。所在地の代表座標と、史実の年代・通過記録を混同しない。浪合関所の後世の移転後の復元点を必須の通過点にしていない。
