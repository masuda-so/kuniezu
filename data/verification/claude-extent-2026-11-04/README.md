# 範囲の作り直しの確認（2026-11-04）

右上の角を択捉島カモイワッカ岬にし、北の空白の帯を削った後の確認。起動済みの 8000 番に専用の一時 Chrome（1400×1000）で接続した。

- `source-overview.png`：正本 provinces.png の縮小図（16画素ごと）。右上に千島、北端は陸が上の縁まで続く。
- `kuril.png`：国後・色丹・択捉と陰影。
- `north-korea-manchuria.png`：北端に空白の帯が無い。
- `fit.png`：全域で地図が画面全体を覆う。
- 児島湾8点のクリックは1560年（正本そのもの）・1600年（版 15840101-16060101）とも作り直す前と同じ結果。JavaScript 例外0。map-regressions・zoom-regressions・offline・organization・infrastructure・secret-scan・raster-map・province-edits と build-map.cjs --check が通過。
