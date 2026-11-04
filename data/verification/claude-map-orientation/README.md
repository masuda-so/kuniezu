# 地図の向き（図北を 11 度回す）の実画面の確認（Claude、2026-11-04、worktree を 8001 番で配信、1400×900）

- `reference-dainippon-zenzu-1880s.jpg`：手本の明治「大日本全図」（Wikimedia Commons、パブリックドメイン）。鹿児島→津軽半島の軸が図の上から約 28 度。
- `whole-japan-rot11.jpg`：全域。円錐図法の平面で同じ軸は 38.9 度なので、反時計回りに 11 度回して 27.9 度にした。北の印は右上。
- `kinai-rot11.jpg`：畿内の拡大。城名・大名の札は画面で読める向き、国名（わざと回して描く文字）は地図と一緒に回る。
- `select-date-rot11.jpg`：回した画面で伊達政宗の札を押し、名生城が選ばれた（当たり判定の逆変換）。
- 画像は Git に入れない（.gitignore）。
- `side-by-side.jpg`・`overlay-dainippon-vs-game.jpg`：手本と本作を並べ、重ねた比較。重ねを動かせる比較ページ `orientation-compare.html` は画像を埋め込むため Git に入れず、利用者へ直接渡した（画像と同じ扱い）。
