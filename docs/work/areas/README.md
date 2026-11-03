# 担当別の入口

## 現在の分担（2026年11月3日）

ユーザーの指示により、今日中の到達を目指して以下を並行する。全体ゴールの完了条件は `requests.json` のまま維持し、期限だけで達成扱いにしない。

| 担当 | 今回の範囲 | 編集の境界と受入 |
|---|---|---|
| Claude（Reasonの合戦図・駒改良） | 地図の通常描画、河川正本の接続、古い陸輪郭への依存除去、拡縮と性能 | `raster-map.js`、`ui.js` の地形/河川/クリップ。正本からの再生成と実画面を確認 |
| Codex root | 史料・年代・行軍/合戦修正の統合、領域の色と説明、全体受入 | 他担当の新しい演出を保持して変更を取り込み、起動済み8000番で確認 |
| Codex fort_sources | 児島湾・遼東の正本と年代差分 | 地域外の全画素、海・湖・城、児島湾の全年代を保持。候補をrootへ渡す |
| Codex shiotsu_sources | 標高の正本生成を完了し、未統合の城/領土変更を照合 | 共有版との差分と依存を確認。道路など別担当の変更を戻さない |
| Codex siege_placements | 遼東の史料登録を完了し、全111合戦の実画面受入 | 時系列、参加者、再生、自然閉鎖をまとめて確認 |

共有配信元へは検証済みコミット単位で反映する。中核ファイルは担当箇所を合わせ、古いファイル全体で上書きしない。サーバーの起動・停止はユーザーのみ。

| 分野 | 主な対象 | 主な編集先 | 主な検査 |
|---|---|---|---|
| geography | 古湖岸、河川、海岸、街道、遼東 | `game/*waters*`, `*lake*`, `*road*`, `tools/geo/`, 調査資料 | map-history, road-display, battle-rivers, zoom-regressions |
| history | 城・施設・人物、領主継承、領土移転、外交、開始年代 | 各 evidence / register / families、出典と命題 | historical-register, families-territory, history-audit |
| movement | 軍・単独人物の経路、速度、停止、帰還、保存互換 | movement-continuity, movement-display, march-model, convoys, logistics-review | movement-clock, movement-save, warp-audit, march-clock-browser |
| battles | 全合戦の布陣・地物・段階移動・読込・再生 | battle-deployments, battle-phases, battle-atlas, atlas生成元 | atlas-regressions, all-battles-browser, battle-loading-browser |
| ui-assets | 小画面、メニュー、兵数、駒、肖像、家紋、性能 | ui, counter-symbol, portrait-layout, kamon, index CSS | usability-browser, portrait-browser, render-performance |

`game/index.html` が実際の依存順。上記はファイル所有権ではなく担当の入口。`docs/architecture/modules.json` で現在の読込順と生成候補を確認する。

依頼例：「catalogの対象ID、調べる年代/地域、編集予定ファイル、期待する成果、実行する検査、触れないファイル」を明記する。複数担当が同じ中核ファイルを編集する場合は代表担当へ変更案を渡し、勝手に置き換えない。新しい分岐機能やサーバー操作を依頼のついでに実施しない。
