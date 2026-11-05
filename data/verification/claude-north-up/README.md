# 地図の向きの既定を北が上にした後の確認（Claude、2026-11-05）

`U.mapRotation` の既定を 16 から 0 に変えた（`kuniezu/static/kuniezu/ui.js`）。表示設定の選択肢と回転の実装は変えていない。

## 実画面（この worktree から起動した Django の開発サーバー、8001 番）

- 向きを選んだことの無い状態（`localStorage` の `tenka-maprot` が無い）で開くと、`TKUI.mapRotation` は 0、画布の `transform` は空、北の印は `rotate(0deg)`。保存した局（慶長五年六月十六日、徳川家）を読み込むと、北が上の地図が出る。
- `TKUI.setMapRotation(16)` で画布と北の印が `rotate(-16deg)` になり、`tenka-maprot` に 16 が入る。0 に戻すと `transform` は空に戻る（確認の後、`tenka-maprot` は消した）。
- `GAME_URL=http://localhost:8001/index.html` で `march-clock-browser.cjs` と `usability-browser.cjs` が PASS。

## 検査

- `offline.cjs`・`organization.cjs`・`infrastructure.cjs`・`stamp-assets --check`、`uv run pytest` 7 件が PASS。

## 未確認

- 表示設定の画面から選んで切り替える操作（関数を直接呼んで確かめた）。
- 16 度以外の選択肢（11 度、25 度）と、ほかのブラウザ検査。
