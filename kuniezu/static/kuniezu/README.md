# 配信用ゲーム

`index.html` と同じ場所から素のJavaScriptを依存順に読み込む。ビルド不要。今回の文書・データ整理では配信URLを変更していない。

- 実際の依存順：`index.html` の `game-scripts`。
- [構成の説明](../docs/architecture/README.md)、[モジュール一覧](../docs/architecture/modules.json)。
- `atlas/`：合戦ごとの同梱地形と比較河川。
- `terrain/`：概観の標高・陰影。詳細取得に失敗しても下敷きを残す。
- `portraits/`、肖像シート：人物画像。手動で確認した切出しを保持する。
- `kamon/`：家紋素材。代表紋と旗の史実性を混同しない。
- `licenses/`：素材・地理資料の出典と利用条件。

調査資料の原本や作業結果はここへ追加せず、`data/research/`、`data/verification/` に置く。生成物は生成元を確認して更新する。日付・所属・地形に変更を入れたら、該当年代と保存互換を検査する。
