# 江島の写真登録（Codex、2026-11-09）

- 国土地理院 `ort_old10` と `std` 各9枚を取得。欠落0。個別撮影年は未照合。
- 論文PDF4頁の図4写真と年代別地理院写真を局所正規化相関で比較。候補37点、アフィン整合36点、最大残差2.415タイル画素。地理院写真の測地精度や歴史的汀線の精度を表す値ではない。
- `tools/geo/register-ejima-photo.py`、`inspect-ejima-lineage.py` はRuff合格。旧手動4点の変換は造成区画の年代混在があり不採用。
- `matches.png` は整合点、`current-coast-overlay.png` は地理院写真へ現行陸を無補正で投影した画像。画像はGitへ入れない。南西岸と北東造成地を区別して目視確認した。
- `data/research/ejima-review/photo-registration.json` に入力のURL・SHA・寸法と数値結果を保持。ゲーム正本への変更なし。湖岸修正後の実画面検証は別途必要。
