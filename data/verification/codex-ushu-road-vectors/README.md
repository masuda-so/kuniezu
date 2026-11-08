# 羽州道の比較線採用の検証

2026-11-09、候補ブランチ `codex/ushu-vector-reference`、基点 `7dd75c72`。編集正本を直接修正し、実行時の補正は増やさない。

- `ushu-edo-comparison.cjs`：保存原本SHA・R201の196点の完全一致、変更前コレクションへの復元、全319接続（変更2・不変317）、全端点保持、v26旧保存の軍・単独人物の途中位置と到着期限、移行一回性。
- `road-vectors.cjs`：全85路線・135202頂点・56587節点、東山道と会津の既採用差分の回帰、同じ道路reader、実行時補正なし。
- `movement-save-position.cjs`・`movement-save.cjs`・`movement-clock.cjs`・`castle-era-position.cjs`：途中・帰還・待機・単独人物、旧版22〜26と年代別座標の回帰。
- `build-map.cjs --vectors-only` と `--vectors-only --check`：7ファイルの無改変複写・正本とバイト一致。29変更JSの構文、asset stamps、diff形式も確認。

## 専用ブラウザ

起動済み `http://localhost:8000/index.html`、専用一時Chrome。`GAME_OVERRIDE_ROOT` は候補の専用作業ツリー、`ROAD_VECTOR_USHU=1`。通常配信のmainへの反映試験とは別。

1400×950／390×950、南端接続・旧閉路・北端接続の3地点×2幅を撮影・確認。軍の停止直前と直後は同一点、停止中は不動、再開で前進し着陣予定不変。v26合成保存の軍と単独人物は同じ途中点から進み、残り0.25日の元期限で目的地に一致。原本破損でゲーム初期化を拒否し、再読込で復帰。共通manifest 1回、道路GeoJSON 1回、旧比較JS 0回、JavaScript例外0。

`browser/result.json`・画面12枚はローカル証拠として保持しGitへは含めない。描画待ち60標本は中央値128.6ms・最大237.7ms、GC後JSヒープ166.7MB。これは同条件の前後比較ではなく、性能改善を主張しない。

史実の精密線形や全街道の照合完了を示す試験ではない。採用範囲・概略接続・出典は[報告](../../../docs/reports/USHU_VECTOR_REFERENCE.md)に記録する。

提出前の `offline.cjs`・`organization.cjs`・`work-policy.cjs`・`infrastructure.cjs` も通過。検査前に退避した64監査ファイルは、生成差分を戻した後で全SHAの一致を確認した。
