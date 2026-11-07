# 許可済み8000番の起動確認

2026-11-07。利用者が既存の起動・停止権限を再確認したため、待受なしを確認後、現worktreeから `uv run --locked python manage.py runserver 127.0.0.1:8000 --noreload` で起動した。127.0.0.1のみの待受とHTTP200を確認。

専用一時Chromeでゲーム本体へ接続し、タイトル「天下分け目の国絵図」、titleモード、boot完了、canvas2枚、JavaScript例外0を確認。画像とresult.jsonはローカルだけに保存する。通常のブラウザ・保存には触れていない。GeoJSON正本のゲーム表示切替を確認したものではない。

サーバーは継続起動。Python・テンプレート変更時は必要に応じて担当エージェントが再起動する。権限の最新合意はAGENTS.mdとHANDOFF.mdへ反映した。
