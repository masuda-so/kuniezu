# 肖像代替画像の実画面検査

2026-11-07。確認済み5人と別名「島左近」、sm/lg/xlの18表示を専用Chromeで確認。UI/layout/stripだけを候補応答へ差し替え、元サーバーのファイルは変更しない方式。

- 通常: 全18画像を表示。
- 原画像だけ503: 確認済み5行のcropで全18画像を表示し、旧faces.webpへの逆戻りを拒否。
- 原画像とstripが503: 全18表示が文字へ戻り、誤画像を出さない。
- 同時取得最大2、各URLの再試行は1回以下、例外0。終了後にChromeと一時プロフィールを削除。

`portrait-fallback-browser.cjs` の `PORTRAIT_MODE=normal|primary-fail|all-fail` で再現する。候補差替え時のみ `PORTRAIT_CANDIDATE_ROOT` に候補worktreeを指定する。画像/JSONは親担当の `data/verification/codex-portrait-{normal,primary-fail,all-fail}/` に保持し、Gitには本要約のみ。画像同定と歴史精度の全件検証ではない。

合戦図PR80との統合後、実配信（候補ファイルの応答差替えなし）でも通常・原画失敗を確認した。記録は親worktreeの `codex-portrait-actual/` と `codex-portrait-actual-primary-fail/` に保持。入力失敗を作る503以外は実サーバーの応答を使用した。
