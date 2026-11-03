# 地図正本化に伴う依存・整理点検

2026-11-03。読み取り対象は共有配信元 `/Users/masudaso/Desktop/天下分け目の国絵図`、HEAD `6325053`。Claude が正本化を実装中のため、この記録はその変更前の依存を示す。実体の削除、サーバー操作、共有コードの変更は行っていない。

## 結論

全域を結合した `provinces.png` を追加するだけでは正本は一本化されない。現在の `build-provinces.cjs` は、ゲームを読み込んだ後の旧ベクターから分割画像を再生成する。通常の生成入口を「正本画像 → 配信用画像・境界・判定用索引」に切り替え、旧ベクターから上書きできる経路を移行専用に退避する必要がある。

その場で消せるコードは `ui.js` の未使用 `terrainBackdrop` と専用キャッシュ。Python の旧差分生成器は検査から参照され、`terrain-tiles.js` は通常地図以外にも参照がある。年代別 `compiled` は現役であり、削除可能な旧版は今回の現物からは見つからなかった。資料、古地図、入力原本は整理対象の不要物に含めない。

## 現在の呼出関係

```text
index.html
  ├─ geo.js + 地域別ベクター補正
  │    ├─ ui.js: 未着画像の代替、クリップ、選択領域、戦線位置図
  │    ├─ battle-atlas.js: 合戦図の陸・湖
  │    ├─ engine.js: 城座標の適用条件・施設の所属領域・移動グラフ
  │    └─ territory.js: 分家の領域分割
  ├─ raster-map.js
  │    ├─ manifest.json + definition.csv → provinces/、provinces-4/、provinces-8/
  │    ├─ versions.json → edits/compiled/<期間>/ の差替え画像
  │    ├─ edges.json → edges-*/ の共有辺
  │    └─ relief.json → relief-*/ の陰影
  └─ terrain-tiles.js
       ├─ ui.js: 初期化・更新番号・通常攻城の地形
       └─ terrain/overview/: オフライン標高の代替

build-provinces.cjs → history-focus.cjs.model() → 読込後 TKGEO → 基準画像
build-province-edits.cjs → 基準画像 + 年代差分 → compiled/<期間>/
build-edges.cjs → 基準画像 + compiled/<期間>/ → 境界 + versions.json
route-terrain.py → terrain/overview/ → route-terrain-profiles.js
```

`raster-map.js:4,16,23–30,65,95` が配信時の読込入口。`build-provinces.cjs:7,45,51,117,124` が旧ベクター再生成の入口と書出しである。

## 削除・統合候補

| 対象 | 判断 | 実際の依存と統合条件 |
| --- | --- | --- |
| `game/ui.js:243–253` の `terrainSurface` / `terrainBackdrop()` | 削除可能 | ファイル全体とリポジトリ内を検索し、定義内部以外に呼出しなし。通常地図の陰影は `TKRelief`。他の `TKTerrain` 参照とは分けて処理できる。 |
| `tools/map/build-province-edits.py` | Node 版へ集約後に削除可能 | `tools/checks/province-edits.py:10–13` が直接 import。現在の Node 版は GeoJSON に加え PNG 型紙と全期間の境界処理を持つが、Python 版は `payload.file` の多角形だけを処理する。現行の型紙入力を Python 版で生成できない。既存検査の閉曲線、範囲外、重複・適用済み、期間境界の意味を Node 側へ移してから削除する。言語置換だけで同等とみなさない。 |
| `tools/checks/province-edits.py` | 検査内容を移して置換 | 上記の Python 生成器を保ち続ける直接の呼び元。正本・型紙を実際に処理する共通生成器に対する検査へ変更する。 |
| `game/map/edits/README.md:31,38,61,68–70,89` | 記述を整理 | 前半に旧 Python 実行コマンド、旧基準版 `71f396b`、存在しない `compiled/15600101-16160101/manifest.json` へのリンクが残る。後半の Node 手順と二重化している。基準の参照先は台帳へ一本化する。比較資料そのものは残す。 |
| 各生成器内の PNG 復号・符号化実装 | 共通関数へ集約 | `build-province-edits.cjs:11` は既存の `tools/geo/png-decode.cjs` を使う一方、`build-edges.cjs:11–18,65`、`build-provinces.cjs`、`audit-provinces.cjs:13–14` に独自実装がある。特に監査側は filter 0 以外で失敗するため、画像編集ソフトが出す通常 PNG を正本にするなら対応差をなくす。監査全体を消す理由にはならない。 |

## 移動できるが、そのまま削除できないもの

| 対象 | 移動先の考え方 | 条件 |
| --- | --- | --- |
| 旧 `tools/map/build-provinces.cjs` のベクター変換部分 | 移行専用ツール、または Git 履歴に退避 | 正本画像を切り出す通常生成器から明確に分離。現在は `provinces/` と粗い段を消して作り直すため、通常のコマンドとして残すと正本の修正を戻してしまう。 |
| `tools/map/build-height-raster.py` | 比較・試作ツール | GSI/Terrarium のキャッシュから共通格子へ移す機能で、Copernicus 正式生成器とは別。`game/map/edits/README.md:53` の手順を修正すれば通常の地図編集手順から外せる。元データの来歴と再現手段は保持する。 |
| `tools/map/build-river-raster.py` | 比較・試作ツール | `game/map/edits/README.md:47` に説明される河川中心線 ID の試験出力。現在のゲームの川は線データで描く。実行時への接続がない試験工程を通常生成と混同しない。 |
| `game/terrain/overview/` | 実行時依存を外した後に入力資料側へ移す候補 | `terrain-tiles.js` の代替だけでなく `tools/geo/route-terrain.py:8` が直接読む。移動時はその入力パス・来歴も直す。無参照だとして削除してはいけない。 |

## 依存が残るため一括削除してはいけないもの

| 対象 | 残っている参照 | 必要な切替 |
| --- | --- | --- |
| `game/terrain-tiles.js` | `index.html:515`、`ui.js:45` の `setCoverage`、`:337` の `getRevision`、`:1134` の `battleTerrain`。`common-relief.cjs`、`terrain-cache.cjs`、`terrain-transition.cjs`、複数ブラウザ検査も参照する。 | `battleTerrain` は `goBattle` の通常戦闘経路。史実観察のガードで通常は開かないが、コードは残っている。共通陰影への切替または保留機能の分離と、初期化・更新番号・検査の整理を同時に実施する。 |
| `geo.js` と旧ベクター補正群 | `index.html:468–483,525–526` で読み込む。`ui.js:44–69,161–170,213–240,261–311,641,1083`、`battle-atlas.js:53,64` が表示に使用。 | 地図の陸、選択範囲、クリップ、合戦図、関ヶ原の戦線位置図まで同じ正本から作る。先にファイルを外すと一部画面だけ旧地形／欠落になる。 |
| `castle-regions-data.js` / `castle-regions.js` | `castle-regions.js:8–10` が `TKGEO.terr` と隣接を更新。`engine.js:13–15` が城座標採用と施設の所属判定に領域を使用。 | 正本からの施設→領域索引と隣接データへ切替。画像の見た目だけ移しても領主判定は統一されない。安定 ID と時期別所属の検査を残す。 |
| `period-waters.js` / `katori-lowlands.js` / `water-evidence.js` など | 時代水域の描画のほか、`TK.PERIOD_WATERS` / `TK.periodWaters` などの記録・説明を持つ。 | 幾何形状の旧書換えと資料メタデータを分離。地形として正本に採用したものは二重描画を止めるが、出典・対象年代・推定範囲は資料台帳へ残す。 |
| `territory.js` | `G.branchCells` の `TKGEO.terr` 参照と分割（`:16,20`）。 | 分家表現に用いる分割の元領域を正本由来へ変える。非史実ルート再開と同一視せず、現在の史実の分家処理の依存を確認する。 |
| `tools/map/build-hillshade-raster.py` | `tools/checks/hillshade-raster.py:12–14` が直接 import。共通格子と隣接タイルの標高から陰影を作る。 | 陰影の正規生成工程として残す。別言語の道具があるだけで重複扱いにしない。 |
| `tools/map/encode-relief-webp.cjs`、`game/map/relief*.json` / `relief-*/` | `raster-map.js` の `TKRelief` が使用。 | 出典、PNG/WebP の対応、共有格子の一致を保つ。領域と標高は意味が異なる層なので、領域一枚化を理由に標高を消さない。 |

旧補正群の読込には `lake-baselines.js`、`korea-coast.js`、`tsubaki-lake.js`、`water-evidence.js`、`land-extension.js`、`regional-rivers.js`、`korean-rivers-major.js`、`liaodong-context.js`、`hydrography-policy.js`、`katori-lowlands.js`、`period-waters.js`、`kanto-repair.js`、`castle-regions-data.js`、`castle-regions.js`、`japan-rivers-osm.js`、`bizen-north-shore.js`、`hayashima-upland.js` が含まれる。川・座標・来歴が混在するため、ファイル名だけで全てを旧形状として廃止しない。

`engine.js:9,20–22` は `geo.cpos`、`geo.rough`、`geo.edges` も使う。海陸多角形を置き換えたことは `geo.js` 全体が不要になったことを意味しない。

## 年代別 compiled の現物確認

現存するのは次の 2 期間だけで、どちらも `versions.json` から参照される。各期間に 4 PNG（100m 2枚、400m 1枚、800m 1枚）と manifest がある。参照外の旧期間ディレクトリはなかった。

- `15600101-15840101`
- `15840101-16160101`

`build-edges.cjs:25–29` は各期間の manifest を列挙し、基準ハッシュが一致するものを採用する。現行 `versions.json` の `staleVersions` は空。これらは古い残骸ではなく、1584年境界の地形変更を配信する現役の派生物である。

同じ内容の PNG が期間をまたいで存在するため、共通ハッシュで共有する余地はある。ただし入口を一本化する作業と重複ファイルの削減は別で、まず正本・期間差分から再生成できることを優先する。

## 正本を増やさないための生成契約

```text
正本 provinces.png + definition.csv + 座標格子
                   + 根拠・有効期間付きの差分入力
                       ↓ 単一の生成入口
      配信用タイル / 粗い段 / 境界 / 所属・当たり判定索引
                       ↓
      通常地図・合戦図・位置図・施設所属が同じ版を読む
```

1. 手で変更する基準地形は `provinces.png` のみにする。配信タイル、粗い段、辺、compiled は生成物と明記し、入力として逆流させない。
2. 正本の SHA-256、定義表、格子、採用差分 ID を全派生物に結びつける。異なる基準の配信物が混ざったら検査で停止する。差分適用済み台帳も保持する。
3. 年代ごとの全域画像を複製せず、史料で根拠のある期間境界と差分を保持する。現行の年代差分を正本に焼き込む場合は、基準年代と適用済み一覧を必ず更新する。
4. 正本を読み、同じ処理で必要な配信用画像と判定を作る。現在の全域は 20,782 × 24,288 画素で、RGB 展開だけでも約 1.51 GB。編集の正本が一枚でも、ブラウザへ全域を一括展開する必要はない。既存の 216 / 26 / 9 タイルは表示用派生物として位置付ければ正本の重複にはならない。
5. 郡・国の入力や原史料は出典付きの入力として保持する。ただし領域画像と別の海陸正本として手修正を並行させない。境界線の左右 ID と海陸判定を同じ基準へ揃える。
6. 旧ベクター経路の削除完了は「通常地図が同じ」だけで判定しない。合戦背景、戦線位置図、選択、施設所属、分家分割、読込待ち・失敗時の各利用先を含めて確認する。

## 統合順と確認事項

1. Claude の正本・切出し生成器が入った時点で、旧ベクター生成器を通常入口から外す。正本→派生物のハッシュ対応と、同一入力で再生成した場合の一致を確認する。
2. Node の差分生成と検査へ集約し、旧 Python 生成器・検査・README の旧コマンドを同じ変更で整理する。
3. 未使用の `terrainBackdrop` を除去。残る `TKTerrain` 参照の移行後、`terrain-tiles.js` の読込・宣言・専用検査を整理する。overview は経路断面生成の参照も解消してから移す。
4. 旧ベクターの描画・判定の利用先を正本由来へ切り替え、旧補正の形状処理を削除する。資料・座標・河川など残る役割を必要なデータモジュールへ分離する。
5. 現行 compiled を新正本から作り直す。古い出力を削除する条件は「新しい索引から参照されず、再生成できる派生物」であり、ディレクトリの名前や日付だけではない。

`audit-provinces.cjs`（城位置・領域面積など）、`audit-raster-adjacency.py`（4/8近傍・タイル境界・差分）、`audit-province-consistency.cjs`（領域と郡割当）は役割が異なる。一本の起動コマンドにまとめることはできるが、同名に近いからと検査を消さない。

なお共有側には `build-copernicus-height.py` がなく、専用 worktree 側にはある。共有の `relief.json` は Copernicus 由来の出力なので、再生成手順を一本化する際は既存の生成器・監査の所在を揃える必要がある。過去の陰影試作を片付けるだけで正式な再現経路が完成したとは扱わない。

この点検は呼出関係と現存ファイルを読んだ構造監査であり、正本化後の画面検証や古湖岸の史実照合を完了したという報告ではない。

## 全域画像への独立照合

`tools/checks/province-source-image.cjs` は生成器・共通PNG復号器を読み込まず、W3C PNGのチャンクCRC・全フィルタを独立に復号する。全域をRGBAへ展開せず、行バッファとタイル1段で比較する。

2026-11-03、共有側 `game/map_data/provinces.png`（SHA-256 `9f6f03ed2628dc7ffb406c69fbe4dfb9f00daa0d2c266474541a682e83ae2dbf`、2,596,522 bytes）を旧コミット6325053のmanifest・definitionと照合した。20,782×24,288＝504,753,216画素で不一致0・未定義色0。100mの216タイルと省略海288区画を含む全域を検査した。400/800mを含む既存251タイルも旧版のSHAと一致。

結果は `data/verification/map-source-image/`。これは基準画像の同一性の確認であり、年代差分や変更後のブラウザ動作の確認を兼ねない。

新しい `definition.csv` / `default.map` でも全画素一致を再確認し、正本・定義表・分類・投影の4ファイルの合成SHAが配信manifestと一致することを確認。独立復号器の自己検査21件（全PNGフィルタ、不正CRC、切れた圧縮、色未定義、端タイル等）も通過。結果 `current-identity.json` / `selftest.json` を同じ検証フォルダへ保持した。
