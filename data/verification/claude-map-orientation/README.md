# 地図の向き（図北を 16 度回す）の実画面の確認（Claude、2026-11-04、worktree を 8001 番で配信）

- `reference-dainippon-zenzu-1880s.jpg`：手本の明治「大日本全図」（Wikimedia Commons、パブリックドメイン）。
- `fit-overlay-16deg.jpg`：海岸線全体の合わせ込み。本作の海岸の帯（赤）と陸（黄）を最適な相似変換（回転 16.5 度）で手本に重ねたもの。
- `whole-japan-rot16.jpg`・`kinai-rot16.jpg`：回した画面の全域と畿内の拡大。城名・大名の札は画面で読める向き。
- `select-rot16.jpg`：回した画面で札を押して城が選ばれる（当たり判定の逆変換）。
- 比較ページ `orientation-compare.html` は画像を埋め込むため Git に入れず、利用者へ直接渡した。画像も Git に入れない（.gitignore）。
