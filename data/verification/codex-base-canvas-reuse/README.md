# ベースcanvas再利用の候補確認

2026-11-09、main86ec0c14の通常配信に候補ui.jsとテンプレートだけを差し替えて確認。最終案の`path/zoom.json`は7条件、142キャッシュフレーム未被覆0、fresh画素一致、転写元canvas各1枚、例外0。

`path-performance/performance.json`はGPU有効・実縮尺5の実入力比較。準備・パン・ズーム後のPNG3枚が通常版とバイト一致した。パンScriptDuration54.0ms、ズーム698.0ms。基準は72.1/639.4msなので速度改善や無劣化は主張しない。

save/restoreだけで画素不一致となった初回、全reset案、最終案の記録を混ぜず保持する。検査用のPNG・JSONはローカル証拠として残す。[変更と判断](../../../docs/reports/BASE_CANVAS_REUSE.md)。
