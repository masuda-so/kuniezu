# 起動画面の出典を 1 行にする

利用者の指摘（2026-11-13、起動画面の下の部分）。出典の欄が、画面の幅いっぱいに小さな字で 3 行（狭い画面では 5 行以上）の文字の壁になり、最初の画面の印象を下げていた。

## 変更

- `kuniezu/templates/index.html`：起動画面の出典を短い 1 行（国土地理院・Copernicus DEM・CODH 旧国・旧郡境界（CC BY-NC 4.0）・© OpenStreetMap contributors ほか）と「出典と利用条件」のボタンにした。全文は `<template id="creditFull">` に項目ごとの箇条書きで持つ。
- `kuniezu/static/kuniezu/ui.js`：既存の「出典と利用条件」の画面が、全文の箇条書きを出す。
- `kuniezu/static/kuniezu/index.css`：起動画面の出典の欄の背景の帯をやめ、中央寄せの 1 行に。ボタンの見た目。

出典の全文（Copernicus の権利表記を含む）は削らず、ボタンから 1 回で開ける所に移した。OpenStreetMap の表記は画面の 1 行に残した。ゲーム中の画面の出典の扱いは変えていない（和紙の主題では元から出さない）。

## 確かめたこと

`data/verification/claude-credit-line/README.md`。
