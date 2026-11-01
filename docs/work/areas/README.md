# 担当別の入口

| 分野 | 主な対象 | 主な編集先 | 主な検査 |
|---|---|---|---|
| geography | 古湖岸、河川、海岸、街道、遼東 | `game/*waters*`, `*lake*`, `*road*`, `tools/geo/`, 調査資料 | map-history, road-display, battle-rivers, zoom-regressions |
| history | 城・施設・人物、領主継承、領土移転、外交、開始年代 | 各 evidence / register / families、出典と命題 | historical-register, families-territory, history-audit |
| movement | 軍・単独人物の経路、速度、停止、帰還、保存互換 | movement-continuity, movement-display, march-model, convoys, logistics-review | movement-clock, movement-save, warp-audit, march-clock-browser |
| battles | 全合戦の布陣・地物・段階移動・読込・再生 | battle-deployments, battle-phases, battle-atlas, atlas生成元 | atlas-regressions, all-battles-browser, battle-loading-browser |
| ui-assets | 小画面、メニュー、兵数、駒、肖像、家紋、性能 | ui, counter-symbol, portrait-layout, kamon, index CSS | usability-browser, portrait-browser, render-performance |

`game/index.html` が実際の依存順。上記はファイル所有権ではなく担当の入口。`docs/architecture/modules.json` で現在の読込順と生成候補を確認する。

依頼例：「catalogの対象ID、調べる年代/地域、編集予定ファイル、期待する成果、実行する検査、触れないファイル」を明記する。複数担当が同じ中核ファイルを編集する場合は代表担当へ変更案を渡し、勝手に置き換えない。新しい分岐機能やサーバー操作を依頼のついでに実施しない。
