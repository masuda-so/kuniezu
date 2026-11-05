# 標高正本から配信用陰影を再生成する

標高の正本は `kuniezu/static/kuniezu/map/physical/heightmap.png` と同名の `heightmap.json`。実数標高を符号化した16bit灰色画像で、表示用の陰影やWebPから高さを逆算しない。Copernicusの元GeoTIFFが手元になくても、この正本と格子情報だけで配信用陰影を再生成できる。

## 一つのコマンド

リポジトリのルートから実行する。Python環境にはNumPyとPillow、変換するタイルがある場合はNode.jsとChromeが必要。CFFIとCコンパイラが利用できる場合はPNGの復号を加速する。利用できない場合も値が同じ参照実装で処理する。

検証したPython依存は `tools/map/requirements.txt`。専用の仮想環境へインストールして使う。例えば `python3 -m venv /tmp/kuniezu-map-env`、続いて `/tmp/kuniezu-map-env/bin/python3 -m pip install -r tools/map/requirements.txt`。以下の `python3` はその仮想環境のPythonへ読み替える。巨大画像ではCFFIの高速復号を有効にする。

```sh
python3 tools/map/build-height-cache.py \
  --grid kuniezu/static/kuniezu/map/build/manifest.json \
  --heightmap kuniezu/static/kuniezu/map/physical/heightmap.png \
  --projection kuniezu/static/kuniezu/map/projection.json \
  --output kuniezu/static/kuniezu/map/build
```

これはサーバーを起動・停止しない。元GeoTIFFの取得や再読込、ネットワークからの標高取得も行わない。`--heightmap` はPNGファイルを指定する。同じディレクトリの `heightmap.json` を読み込む。

配信中のフォルダへ書かずに確認する場合は、出力先を新しい一時ディレクトリへ変える。既存WebPの再利用元は `--previous` で指定する。

```sh
python3 tools/map/build-height-cache.py \
  --grid kuniezu/static/kuniezu/map/build/manifest.json \
  --heightmap kuniezu/static/kuniezu/map/physical/heightmap.png \
  --projection kuniezu/static/kuniezu/map/projection.json \
  --previous kuniezu/static/kuniezu/map \
  --output /tmp/kuniezu-height-preview
```

`--previous` を省略すると `--output` を再利用元とする。`--quality` の既定値は0.82。Chromeのパスは `--chrome` または `CHROME_PATH` で指定できる。既定はmacOSの `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`。全枚を再利用できればChromeを起動しない。

## 入力と派生の関係

1. `heightmap.png` と `heightmap.json` のSHA、画像寸法、投影、標高符号化を照合する。`projection.json` と配信用 `manifest.json` の格子も一致を要求する。
2. `build-copernicus-height.py --from-heightmap` と同じ実装で、100m正本から100m・400m・800mの標高タイルを作る。粗い段は正本の中心セルを抽出し、外縁で切り詰める。4倍は元セルの添字 `4*x+2`、8倍は `8*x+4`。
3. `build-hillshade-raster.py` が隣接タイルの1画素を参照し、陰影PNGを生成する。NoDataは透過にする。
4. `encode-relief-webp.cjs` が画素SHAを比較し、変わったタイルだけ専用ヘッドレスChromeのCanvasでWebPへ変換する。
5. 全WebPのSHA・寸法・透過範囲と、標高NoDataとの一致を確認してから配信用の新しい世代を公開する。

PNGの復号は行単位、標高はタイル1行分、陰影は周辺タイルと1枚、WebPは1枚ずつ処理する。全域の約5億画素を一度にRGBAへ展開しない。中間の標高・陰影PNGは作業用ディレクトリ内に生成し、完了後に削除する。

正本の符号化は `0=NoData`、それ以外は `-500 + (code - 1) / 4` メートル。これは本プロジェクトの契約であり、CK3の編集器が同じ符号化を採用しているという意味ではない。元データは現代のDSMであり、戦国期の地表高を確定したデータではない。

## 再利用とSHA

再利用には、既存配信メタデータの `sourcePixelSha256` と新しい陰影PNGの復号後画素SHAの一致、寸法とWebP品質の一致が必要。画素の形式はRGBA8、非乗算alpha、行優先。再利用するWebP自体のSHAも検査する。

PNGの圧縮器が変わると、同じ画素でもファイルのSHAが変わる。この違いを標高・陰影の変更と混同しないよう、タイルごとに次を保持する。

| フィールド | 意味 |
| --- | --- |
| `sourceSha256` | 実際にWebPへ入力したPNG。再利用時も書き換えない |
| `previousSourceSha256` | 前の配信画像が記録していた入力PNG |
| `regeneratedSourceSha256` | 今回正本から作った陰影PNG |
| `sourcePixelSha256` | 今回のPNGを復号したRGBA画素 |
| `sha256` | 配信するWebPのバイト列 |
| `reusedFromPrevious` | 今回、既存WebPをそのまま再利用したか |

古い `relief.json` に画素SHAがない場合は再利用を断定せず、そのタイルを再変換する。非可逆WebPを復号した画素を、元PNGの代わりの比較基準にはしない。

`relief.json` のルートには正本PNG・正本メタデータ・projection・配信用map manifestのSHAを保持する。各段には標高manifestと陰影manifestのSHAを保持し、元データの出典、製品、取得日、ライセンス表記も引き継ぐ。

領域正本の補正でmap manifestのSHAだけが変わった場合も、同じ格子なら標高正本を作り直さない。正本メタデータの生成当時の記録を保持し、派生側は今回のmap manifestへ接続する。

## 配信中の画像を保つ公開手順

出力は `kuniezu/static/kuniezu/map/build/relief-cache/<内容SHA>/` に世代別に生成する。そこに `relief-1/4/8` と `provenance/` を置き、全検査が通った後で `kuniezu/static/kuniezu/map/build/relief.json` だけを同一ファイルシステム上でatomic置換する。`TKRelief` は各段の `dir` を読むため、描画実装の変更は不要。

`provenance/` には正本メタデータ、投影、標高・陰影manifest各3件、入力と生成器のSHAを残す。巨大な正本PNGや中間PNGの複製は置かない。

変換・検査・入力変更の検出で失敗した場合、配信中の `relief.json` と旧世代の画像を残す。新世代を設置した直後にmanifestの公開だけが失敗した場合も、新世代は未参照のままで旧配信が続く。旧世代は開いたままのブラウザから参照され得るため、自動削除しない。

同じ出力先への並行生成は `.height-cache.lock` で拒否する。通常終了・捕捉可能な失敗ではロックを消す。強制終了でロックが残った場合は、記載されたPIDの生成プロセスが存在しないことを確認してからロックだけを除去する。世代フォルダを一括削除しない。

低水準の `encode-relief-webp.cjs` は新規ディレクトリへの変換専用とした。以前の `SHADE_ROOT=... node tools/map/encode-relief-webp.cjs` による配信先への直接書換えは使わず、上記入口から実行する。

## 検査

```sh
python3 tools/checks/height-cache.py
python3 tools/checks/copernicus-height.py
python3 tools/checks/hillshade-raster.py
```

最初の検査は小さな11枚で、初回変換、Chromeなしでの全再利用、PNG圧縮差だけの場合の再利用、NoDataの一致、元画像破損・Chrome起動失敗時の旧配信保持、並行生成ロックを確認する。実標高全域での生成結果は `data/research/source-notes/map-layer-inputs.json` を参照する。

2026年11月3日の入口確認では、児島湾補正後の格子（SHA `b8a6b1561f3ea75500cfad95daa053a12862b5101437c80f03867b9ec6a74a0a`）と標高正本（SHA `14d112e468c2e75b7d16c11376f19111c183a62cd9f7d3144cc1396fcd71befe`）だけから実全域を生成した。存在しないChromeパスを指定して351枚すべての再利用に成功し、再実行でも旧世代を保持した。各WebPは前の採用候補とバイト一致し、標高・陰影・配信manifestのSHA連鎖も通過。共有配信先は変更していない。結果は `/tmp/kuniezu-height-cache-regeneration-verification.json`、候補は `/tmp/kuniezu-height-cache-regeneration/`。
