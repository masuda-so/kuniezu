# 確認済み肖像5人の代替画像

2026年11月7日。基点 `801bfb926e2201477d047916f880a6d9c375cf7a`。顕如・丹羽長重・島清興・斎藤義龍・足利義輝は通常表示のcropが補正済みだが、原画の取得待ち・失敗時に旧atlasの別cropへ戻っていた。同じ確認済み原画とcropから小さな代替画像を生成して使う。代替画像も未読・失敗なら既存の文字表示となる。

## 生成元と表示

- 編集入力は `tools/faces/fallback-crops.json`。5素材のSHA・正方crop・出典を記録する。通常表示の正本 `portrait-layout.js` と、島清興を上書きする `kamon.js` のcropに一致する場合だけ生成できる。
- `tools/faces/build_fallback.py` が `faces-fallback.webp` と `portrait-layout.js` 末尾の生成定義を一括生成する。行順をUIへ複製しない。原画の変更・AI補作・新素材の採用はない。
- 代替画像は128×640px、133,260バイト、SHA-256 `8bbde2726c90b3143ec04742386845e013bd833bb14674bc9e59dad7e7e1ce93`。losslessで各行の復号後RGB画素が、確認済みcropの128px縮小と完全一致する。
- 共通loaderの同時2枚、URL共有、別名、再試行1回、可視DOMだけの更新を維持。UIは `portrait()` 内だけを変更し、基点のベクター地図UIを保持した。主atlas・通常crop・原画像・セーブ形式は変更しない。

三好長慶は現行qy入力とatlasが肖像で、`meta.json` だけ旧花押を指していた。該当項目だけに現行535×700px派生画像のSHAと旧入力履歴を追加した。他項目の値・順序・空白は保持。旧rawは旧花押の取得入力で、現行肖像には使わない。原本からqyへの切り抜き座標は未記録。`build.py` はmetaをloadするだけで、`ingest.py` は指定した取り込み対象だけを更新するため、既存生成器でこの付加情報を展開する処理はない。

## 出典の範囲

[岐阜県の義龍像説明](https://www.pref.gifu.lg.jp/page/354743.html)とCommonsの図像メタデータを照合した。島清興は芳幾による後世の浮世絵、義龍は追福像。生前の忠実な容貌を確定したという意味ではない。顕如のローカル651×542px・足利のquality画像・三好のqyは取得済み派生として扱い、公開原本そのものと呼ばない。権利表記と留保は `licenses/DATA_SOURCES.md` に追記。丹羽のCommons直接openはcache missで、同ページの検索全文表示を読んだ範囲。新たな別人誤同定・白い付加枠を確定する根拠は今回得ていない。

## 再生成

PillowとNodeが必要（Pillowは開発依存）。

```sh
uv run python tools/faces/build_fallback.py --root . --write
uv run python tools/faces/build_fallback.py --root . --check
node tools/build/stamp-assets.cjs
node tools/build/stamp-assets.cjs --check
```

`--validate-only` は入力を検査し書き込まない。cropや原画像SHAが変われば停止するので、manifestを無確認で追随させない。

## 検証

- 実データによる `--write` / `--check`、模擬rootでの2回生成の同一SHAと5crop画素一致に合格。
- `node tools/checks/portrait-loading.cjs`：既存loaderの検査に加え、5人の取得待ちで誤atlasを使わず、代替成功時の行と原画成功時のcropが一致すること、別名も同じ行を使うことに合格。
- `pytest tests/test_portrait_fallback.py -q`：生成物一致、誤SHA拒否、正本crop不一致拒否の3件に合格。
- 構文・asset stamp・構成・差分の検査に合格。既存素材のHEAD/SHA一致、UIの `portrait()` 外が基点とバイト一致すること、metaの他項目不変を確認。
- 親担当が専用Chrome内の応答差替えで、通常・原画だけ失敗・両方失敗の3条件を確認。5人と島左近の別名をsm/lg/xlで表示し、誤atlasへの逆戻りなし、同時取得2枚以下、再試行1回以下、JavaScript例外0。両方失敗では文字表示となる。通常サーバーへ新ファイルを配信した検査とは区別する。
