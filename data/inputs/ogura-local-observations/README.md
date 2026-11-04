# 富ノ森第6区の局所観測資料

ここには公開する数値入力9件と、その保持先を示す `retention-manifest.json` を置く。史実DBへ登録する観測は建物1の1件であり、入力ファイル数や柱穴数を独立した史実命題数に数えない。

| 入力 | 用途 |
|---|---|
| `tomori-observations.geojson` | 調査枠、建物1の確認柱穴中心包絡、柱穴6点。湖岸・陸地マスクではない |
| `registration.json` | 元図格子、読取画素、局所座標換算の係数。読図画像はarchiveKey参照 |
| `gsi-coordinate-api.json` | 国土地理院APIの要求・取得時刻・応答・原応答SHA |
| `gsi-vi-0.json` ～ `gsi-vi-3.json` | 上記4回の原API応答。まとめ内のfileから相対参照 |
| `local-shapes-validation.json` | 元調査時の凍結比較結果。最新地図の検査ではない |
| `old-lake-comparison-snapshot.json` | 凍結比較で用いた旧湖画素と格子。最新正本の代用ではない |

PDF原本と図版5・10の読図画像はGit外の恒久資料アーカイブに置く。manifestのarchiveKeyとSHAで同一性を確認し、`archiveRelativePath` は任意のローカル保管ルートから解決する。個人の絶対パスをこの公開資料へ書かない。PDFは公開閲覧できるが、全文再配布の明示許諾は確認できていない。

読図画素は保存済み画像の解像度・切出位置に対応するため、任意の解像度で再描画した画像にそのまま適用しない。元の一時パスを論理キーへ置き換えた以外、登録係数と読取値を変更していない。

1秒単位の公刊代表点、VI系図面の詳細読取、歴史的な位置精度を分けて扱う。局所換算の検算差は絶対精度の保証ではない。234㎡の調査範囲から100mセル全体を陸へ変更せず、承認したセル変更は0件。

出典、年代区分、採否理由は `data/research/source-notes/ogura-tomori-archaeology.md` と同名JSONを参照する。
