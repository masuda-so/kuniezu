# 2026-11-01 実画面確認

詳細はプロジェクト直下の `DEPLOYMENT_REVIEW.md`。既に起動している8000番を一時Chromeプロフィールで確認し、サーバーとユーザー保存は操作していない。

- `results.json`：検証範囲、合戦・部隊の件数、処理時間、限界。
- `deployments-browser.json`：全111図の読込・全部隊の対応、描画再利用と更新。
- `performance-before.json` / `performance-after.json`：1400×950、倍率5、霞ヶ浦周辺24回移動。地形取得完了後に1回ずつ測定。変更前1.804秒→最終版0.319秒。全端末の性能保証やFPSではない。
- `sekigahara-*` / `fushimi-*` / `myeongnyang-*` / `noryang-*` / `okpo-*` / `kanegasaki-*`：代表的な広幅・狭幅の配置図。
- `menu-390.png` / `save-390.png` / `hud-390.png`：メニュー・保存・上部の操作。
- `kasumi-final.png`：最終版の霞ヶ浦周辺。湖岸は現代の比較資料。
- `startup-connection-failure.png`：通信失敗を意図的に再現した時の案内。
- `title-without-external-font.png`：外部書体に接続できない場合のタイトル。

配置図は概略所在地と位置不詳の群を区分する。画像は全隊の精密な陣地や古地形の考証完了を意味しない。近接軍勢の検証配置はテスト用であり、史実データに書き込んでいない。
