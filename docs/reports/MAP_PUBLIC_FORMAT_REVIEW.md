# 地図の公開形式と公式資料の確認

確認日：2026-11-03。対象は地図正本の名前・役割・ファイル形式。実装ファイルの変更、ゲーム起動、CK3/EU4による互換試験は行っていない。

## 結論

**PNGとブラウザ描画の標準仕様は一次資料で確認できた。CK3の7項目の厳密なファイル契約は、今回取得できた公式資料だけでは確定できなかった。** 公式Wikiは本文を取得できず、公開SDK・公式編集器による読み込み試験も行っていない。したがって、「CK3の公開モッディング形式を参考にしたWeb用データ構成」と「CK3公式互換を検証済み」を区別する。

領域の正本を1枚の `provinces.png` に集め、標高・河川・名前対応を別データに置く設計は可能。ただし、**1枚に全地理情報を焼き込むという意味ではない**。これは本プロジェクトの設計判断であり、Paradoxから指定された構成とは主張しない。

## 取得成否

| 資料 | 取得結果 | この資料で確認できた範囲 |
|---|---|---|
| [CK3公式Wiki Map modding](https://ck3.paradoxwikis.com/Map_modding) | Web取得はHTTP 401。通常の `?action=raw`、公開 `api.php?action=parse&page=Map_modding&prop=wikitext&format=json`、`?useskin=vector` もHTTP 200ながら3038 bytesのClient Challengeで、記事本文ではなかった | 原典の所在のみ。書式の確認成功とは扱わない |
| [EU4公式Wiki Map modding](https://eu4.paradoxwikis.com/Map_modding) | HTTP 401 | 原典の所在のみ。CK3との同一仕様を推定しない |
| [CK3 Dev Diary #37 — Making Mods](https://forum.paradoxplaza.com/forum/developer-diary/ck3-dev-diary-37-making-mods.1410656/) | 本文取得。2020-08-11、CK3プログラマーMatthewによる記事 | JominiがClausewitz上の内製層であること、データ・スクリプトの変更可能範囲。7ファイルの完全な仕様表ではない |
| [Grand Jomini Modding Information Manuscript](https://forum.paradoxplaza.com/forum/threads/grand-jomini-modding-information-manuscript.1170261/) | 本文取得。前記開発者記事から案内された資料 | JominiにMap & Editorが含まれること。ブラウザ用の同一実装コードを配布する資料ではない |
| [CK3 Dev Diary #177 — A Fresh Coat of Paint](https://steamcommunity.com/games/1158310/announcements/detail/509588190910219027) | 個別ページの抽出は本文なし。[公式Steam告知一覧](https://store.steampowered.com/news/posts/?appids=1158310&enddate=1755777513&feed=steam_community_announcements)から2025-08-12の本文を取得 | Art Director Petter Lundhが高さ画像と地形マスク、Gaeaを利用した制作工程を説明。PNGのビット深度・CSV列は記載なし |
| [W3C PNG Third Edition](https://www.w3.org/TR/2025/REC-png-3-20250624/) | 本文取得。2025-06-24 Recommendation | PNG色種別、ビット深度、透過、可逆圧縮 |
| [WHATWG HTML Standard — Canvas](https://html.spec.whatwg.org/multipage/canvas.html) | 本文取得 | 画像描画、平滑化、色空間、画素操作 |
| [非公式Wiki複製](https://github.com/jesec/ck3-modding-wiki/blob/master/wiki_pages/Map_modding.md) | 本文取得 | 調査候補の所在だけに利用。先頭はversion 1.1確認としつつ、別節には1.18/1.19後の旧記述注意が混在。公式の現行仕様を確定する根拠には採用しない |

HTML全文は資料台帳へ保存していない。取得結果と短い要旨を本書および構造化ノートへ保持する。

## 対象ファイルの判定表

「候補」は非公式複製または公開MODの記載を取り違えないための索引であり、公式確認済み仕様ではない。現段階の採否は国絵図の内部契約として決め、CK3互換を名乗らない。

| 対象 | 公開資料に見られる役割・形式候補 | 原典確認 | 国絵図での扱い |
|---|---|---|---|
| `map_data/` | 地図入力を置くディレクトリ | 未確認 | 正本の置場として採用可能。フォルダ名だけに互換性はない |
| `provinces.png` | 一意なRGB色で小領域・海域を区別する画像。原本24bit RGBとの記載 | CK3条件は未確認。PNGのRGB各8bitという表現はW3C確認済み | 色をIDとして扱う可逆RGB画像にする。画素の混色・量子化を禁止するのは本プロジェクトの識別要件 |
| `definition.csv` | `id;R;G;B;name;x;` の対応表候補 | 未確認 | 列順、予約ID、区切り、末尾列、ヘッダー有無は内部契約を明記。拡張子だけで一般的CSVとの互換を保証しない |
| `heightmap.png` | 16bitグレースケールの高さ入力候補。別に `heightmap.heightmap` と編集器の生成物が登場 | CK3条件は未確認。PNG 16bit灰色形式自体はW3C確認済み | 陰影WebPをこの名前に変更しない。実標高から高さ値へ換算する定義を持たせる。CK3の再梱包・読み込みは別試験 |
| `rivers.png` | 特定パレットで河川の節点・幅を符号化する候補 | 未確認 | 装飾の青線画像と符号化入力を区別。パレット値・接続条件を未確認のまま公式仕様としない |
| `adjacencies.csv` | 非隣接領域間の特殊接続。From/To/Type/Throughと両端座標などの候補 | 未確認 | 全通常隣接辺の独自表を、この名前だけでCK3用と見せない。列・座標の上下方向・終端行の検証が必要 |
| `default.map` | 各入力への参照と海域・湖などのID分類を記す設定候補 | 未確認 | 実在する入力だけ参照する。`LIST`/`RANGE`や反復キー、予約IDの契約を独自読込器とともに記録 |

公開MODの [`default.map` 実例](https://gitlab.com/anbennar/anbennar-ck3-dev/-/blob/master/map_data/default.map)では `topology = "heightmap.heightmap"` と設定される。これはMOD作者の実装例であり公式仕様の代用ではないが、単に `topology = "heightmap.png"` とすれば同じになるという推測を避ける手掛かりになる。

## 一次資料から採用できる検査

[W3C PNG §6.1・§11.2.1](https://www.w3.org/TR/2025/REC-png-3-20250624/#11IHDR)に基づき、領域画像の `color type=2 / bit depth=8` はR・G・B各8bit、合計24bit/画素を意味する。高さ画像は `color type=0 / bit depth=16` として保存できる。透過を使わない契約ならアルファ色種別だけでなく `tRNS` の不在も検査する。PNGの可逆性はID用途に適するが、保存前の色混合や読込後の色変換まで自動的に防ぐものではない。

[WHATWGの画像描画規定](https://html.spec.whatwg.org/multipage/canvas.html#drawing-images-to-the-canvas)は、拡大時の `imageSmoothingEnabled=false` で最近傍を要求する。一方、縮小方法は厳密には定義されていない。したがって当たり判定のID取得を縮小された表示Canvasへ依存させず、元の整数画素から参照する設計が適切。この結論は仕様からの設計上の判断である。色空間変換やアルファの往復も別に確認する。

## 「公式準拠」と呼ぶ範囲

1. **公開形式への対応**：対象ゲーム・対象版を固定して、原典か正規配布ファイルを確認し、公式編集器で読み込めることを試験して初めて確認できる。今回この互換試験はしていない。
2. **Web標準への準拠**：PNG・Canvasの契約に合わせた自作実装は可能。ファイルを分割して読み込むキャッシュは正本から再生成し、別の手修正正本を作らない。
3. **本プロジェクト固有の拡張**：実緯経度との対応、史料年代、由来、タイルSHA、`projection.json` などは独自仕様と明示する。CK3の公式ファイルと混ぜて説明しない。
4. **エンジンコード**：開発者記事はJomini/Clausewitzの存在と変更可能領域を説明するが、国絵図のJavaScript描画を同一コードと確認する根拠を提供しない。同一アルゴリズム・同一品質・同一性能の主張はしない。

当面の表記は「領域画像を1枚の正本へ統合し、公開モッディング資料の名前を参考に整理。表示はPNG/Web標準に沿う独自実装」とする。原典本文が取得できなかったことを、非公式資料だけで公式確認を済ませたことに置き換えない。
