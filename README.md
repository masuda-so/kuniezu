# 天下分け目の国絵図

[日本語](README.md) | [English](README.en.md)

## 概要

日本の史実を描く地図ゲームです。次の大型アップデートに向けて、対象を信長誕生の1534年から元和偃武の1615年までに広げます。現在の開始シナリオは1560年で、1534年開始はまだ利用できません。朝鮮関連は年表・個別合戦図で扱います。素のHTML/JavaScriptで動き（地図の配信物だけは正本から生成します）、現在は史実観察を優先し、自由攻城・非史実ルートは保留しています。

最初に [HANDOFF.md](HANDOFF.md) を読んでください。開発・調査の入口は [docs/README.md](docs/README.md)、残要望と分担は [docs/work/README.md](docs/work/README.md) です。

## 主な機能と制約

- ゲーム時計と史実DBの西暦は1582年10月4日までユリウス暦、10月15日以降グレゴリオ暦です。月末・閏日を実日で進め、改暦の翌日は10月15日になります。史実DBへの改暦の欠番入力は拒否し、日本暦と朝鮮暦も区別します。
- 旧時計の保存は元の内容を保管して移行します。実在しない日付は前後の実在日から選び、補正前の保存は「保存・読込」から書き出せます。
- 文禄の役・長篠の戦い・小牧長久手は、戦役の案内と各地の局地戦を分けて閲覧できます。設楽原の図は本戦の11隊、長久手の図は局地戦の5隊に限定し、別戦線の人物を同じ画面へ詰め込みません。釜山鎮の図は旧城の攻防に限定し、朝鮮暦の日付と換暦の出典を示します。

- 勢力選択は日本の戦略地図上の家を対象とし、朝鮮関連は年表・個別合戦図に残します。停止中も選択した速度を保持し、再開時に同じ速度へ戻ります。
- 左の勢力カードや地図の城から家を選ぶと観察を開始し、選択パネルは年表に切り替わります。地形図／白地図の切り替えは設けず、和紙・青海波と地形の陰影を表示します。
- 地図の陸・水域・岸線は編集済みGeoJSONからベクター描画します。[CODH参照入力と変換手順](data/inputs/codh-edo/README.md)を保持し、江戸期の比較形状と戦国期の採用補正を区別します。支配色と陰影は画像を組み合わせ、細かな管理境界は`control/subcell.geojson`を色と選択で共用します。これはゲームの管理領域で、史実の領主を確定する命題とは分けます。
- 移行後のベクターは改変済みGeoJSONを正本として直接編集し、描画側は年代に応じたファイルを読みます。CODH原本は照合用に残し、通常ビルドで編集正本を上書きしません。
- 陸・水域・岸線の正本を `kuniezu/map/physical/{land,water,coastline}.geojson` へ移行しました。[採用記録](data/inputs/vector-map-migration/README.md)と年代別整合検査を保持します。本体も同じ正本を読みます。比較する場合は `--canonical kuniezu/map/physical --at 1584-01-01` を指定できます。
- `uv run python tools/geo/codh_topology.py --output /tmp/codh-surfaces-new` で、原本の辺・座標位置を保持する方式による有効な参照面と陸・湖の合成面を生成できます。面にならない元の線は残差層へ保持し、戦国期の岸線とは扱いません。Shapelyは開発時だけの依存です。
- 比較画面の生成に `--surfaces /tmp/codh-surfaces-new` を付けると、原本版とSHAを検査して合成済みの面を読み込めます。
- 比較画面の `--canonical <ディレクトリ>` は編集済み `land.geojson`・`water.geojson` を読みます。共通描画器が面の穴と年代を保って描画・位置判定し、実行時の形状補正は行いません。比較ページとは別に、本体の起動・操作・失敗時の表示を検査します。
- `uv run python tools/geo/codh_preview.py --output /tmp/codh-preview-new` で独立した江戸期ベクター参照画面を生成し、出力先の `index.html` を直接開けます。関東・児島湾への移動、拡大縮小と層の切替ができ、ゲームの地図や保存には適用しません。
- `node tools/geo/prepare-mask-vectors.cjs --output /tmp/kojima-vectors-new` で、児島湾の既存補正マスクを対応する格子版から経緯度の面へ取り出せます。100mの採用範囲を保持する変換であり、史実岸線の精密化やゲームへの再適用は行いません。
- `uv run python tools/geo/prepare_era_overrides.py --at 1560-01-01 --output /tmp/era-overrides-new` で、香取海の既存推定水面・保護陸・岸線として描かない切口を一体で取り出せます。CODH原本やゲーム画面には自動適用しません。
- 街道も[編集済みGeoJSONの正本](data/inputs/road-vector-migration/README.md)を使い、描画と行軍表示が同じ道筋を参照します。通常ビルドは線を再補正せず、そのまま複写します。
- 米沢・越後の比較線の4閉路を除き、旧保存の途中位置と着陣時刻を保持します。[適用範囲と検証](docs/reports/AIZU_VECTOR_REFERENCE_LOOPS.md)を記録しています。
- 羽州道の矢立峠―石川付近はCODHの江戸期比較線を編集正本へ採用し、交差点へ戻る閉路を除きます。概略接続と戦国期の未確定範囲は[採用記録](docs/reports/USHU_VECTOR_REFERENCE.md)で区別します。
- 東山道の現代比較線に残っていた同一点へ戻る巡回を除きました。旧保存は位置と着陣日を保って道筋を更新します。戦国期の精密な道筋の確定とは区別します。[採否と検査](docs/reports/TOSANDO_REFERENCE_LOOP.md)を参照してください。
- 古湖岸、城・施設・人物の史実照合、街道上の行軍、合戦の布陣と動きを、出典を付けて表示します。
- 合戦図の駒は表示幅や地区切替で地理的位置を変えません。同地点の隊は選択候補から個別に確認できます。密集時は駒の大きさを抑え、選択した隊は大きさを変えず前面で強調します。
- 合戦図は再生中、交戦している隊へ視点を寄せます（「動きを追う」で切替、表示範囲を選ぶと止まります）。典拠のある段階移動と交戦中の推定の動きには矢じり付きの軌跡を出し、推定は点線で区別します。端末が動きを減らす設定のときは、視点の移動と自動の軌跡を出しません。
- 広域戦は全体図と地区表示を切り替えられます。人物名の引き出し線は使わず、名前は囲み枠なしで駒の近くへ置き、肖像は選択した隊に表示します。名前を収められない隊も駒から個別に選択できます。狭幅の地区選択は一行で操作できます。
- 関ヶ原は本戦を初期表示し、全体・南宮山方面へ切り替えられます。桶狭間は鳴海・大高・桶狭間を見渡す表示から始まります。標高の陰影と細い等高線は現代比較地形です。
- 後期シナリオでは城名と移転先の位置を揃えます。既知の旧保存も行軍途中の位置と着陣時刻を保って修復します。[位置初期化と保存互換](docs/reports/CASTLE_ERA_POSITION_INIT.md)を参照してください。
- ファイル書き出し・手動枠・自動保存で日内時刻を保持し、取り込み後も行軍途中の位置から再開します。
- 外交は国境のみを表示し、行軍は街道上の駒で表します。合戦は自軍参加時だけ自動表示します。関ヶ原の不参戦5隊には汎用の前進演出を加えません。
- 自由攻城、非史実ルート、プレイ中のAI生成は停止しています。`archive/` の非史実実装は通常の起動では読みません。
- 合戦関連の年表注記は既存合戦の経過と区別して分類し、個別布陣の根拠がない落城は年表・史跡で保持します。
- 標高・河川・境界線の読み込みが遅れた場合も、カメラを動かさずに地図を更新します。
- 顕如・丹羽長重・島清興・斎藤義龍・足利義輝の肖像は、原画の取得待ちや失敗時も同じ確認済み切り抜きを使います。肖像は後世の図像を含みます。[素材の再生成と確認](docs/reports/PORTRAIT_FALLBACK_CROPS.md)を参照してください。
- 現代の比較地形、史料からの推定、確認済みの史実は区別して扱います。根拠のない文章をプレイ画面へ出しません。
- 三州街道は伊那谷・駒場・根羽経由の比較線を表示します。山間部には現代の道路・隧道を含み、戦国期の精密中心線とは区別します。[入力と再生成](data/inputs/sanshu-road-review/README.md)を参照してください。
- 史実DBは原暦と日付精度を維持し、時間形式と矛盾する追加日付欄を拒否します。[DB構成と操作](docs/architecture/history-database.md)を参照してください。
- 富ノ森の発掘観測を出典付きで史実DBに登録しています。考古学的な時期区分と確定年月日を分け、原本はSHA付きで参照し、読書用Markdownと数値を保持します。
- 史実DBの集計は `python3 tools/research/history_sqlite.py cube --db <生成済みDB> --from-year 1600 --to-year 1615 --calendar Japanese-lunisolar` で読取専用検索できます。出典記録数を原暦・精度別に集計し、不明な年を展開しません。
- 史実DBでは、日・年が判明し関連地点が不明な出来事も、主対象から検索できます。場所を推定して補わず、江戸期の干拓記録は戦国期の湖岸と区別します。
- 史実DBは本人の典拠IDと出典付き別名を保持します。[人物典拠10人の照合記録](data/research/source-notes/person-authority-expansion.md)を追加し、取得版と同名人物の判別根拠を保存しています。別名で検索でき、ゲーム期間外の比較史料を期間内の出来事へ置き換えません。
- 三好実休／義賢、真田幸綱／幸隆、立花道雪／戸次鑑連の[同定記録](data/research/source-notes/person-alias-three-authority.md)も保持します。別名の対応と、生没日・所在の確認を分けて扱います。
- 香取海の内浪逆浦・外浪逆浦は、中世の湖沼資料と後世の比較岸による推定湖面として表示します。補正範囲を閉じる水面上の辺は、岸線として描きません。[根拠と検査](docs/reports/KATORI_WIDE_LAKE_PERIMETER.md)を参照してください。

- 八郎潟は干拓前の比較地形図を用いた推定湖面として修正し、後世の造成が疑われる湖岸を陸へ先取りしません。[根拠と検査](docs/reports/HACHIROGATA_WATER_REVIEW.md)を参照してください。

| フォルダ | 内容 |
|---|---|
| `kuniezu/static/kuniezu/` | ブラウザへ配信するゲームと同梱素材 |
| `kuniezu/templates/` | ゲームのページ `index.html`（Django のテンプレート）。スクリプトの読込順はここで決まる |
| `kuniezu/history/` | 史実の関係データベース（Django のアプリ）。対象・事象・出典と、取り込み・検索 |
| `kuniezu/geo/` | 地理のアプリ（GeoDjango）。地理ありの設定だけが読み込む。今は土台だけ |
| `docs/architecture/` | 構成、ファイルの移動記録、依存順 |
| `docs/work/` | 残要望、完了条件、対象別作業一覧、担当と成果の記録 |
| `docs/reports/` | 調査・修正・実画面確認の報告書 |
| `docs/history/` | 過去の引き継ぎ記録。現行仕様の指示ではない |
| `data/inputs/` | 調査・生成処理への入力資料 |
| `data/research/` | 出典、検証した史実命題、参考原本、実装との対応 |
| `data/audits/` | 検査によって生成する一覧・照合結果 |
| `data/verification/` | 実画面、同縮尺比較、性能測定の証拠 |
| `tools/checks/` | サーバー不要の検査と専用ブラウザの検証 |
| `tools/geo/`, `tools/faces/`, `tools/research/` | 地理・肖像・史料の生成と照合 |
| `tools/work/` | 分担用の作業一覧と担当管理 |
| `archive/` | 停止中の非史実実装等。通常の起動では読まない |

## 導入と使い方

公開版は Cloudflare Workers の静的ファイルとして配信します（`wrangler.jsonc`）。`npx wrangler deploy` で地図の生成と静的書き出しを行い、配信します。未完成の段階の公開で、内容は予告なく変わります。

編集済みGeoJSONだけを配信し直す場合は `node tools/map/build-map.cjs --vectors-only`、正本とのバイト一致を確かめる場合は `node tools/map/build-map.cjs --vectors-only --check` を使います。原本からの再生成や正本への補正は行いません。5湖の比較形状は [入力ノート](data/inputs/mlit-w09-2005/README.md) に出典と限界を記録しています。

地図の正本は `kuniezu/map/` に層ごとに置き、Git で管理します。行政区分 `admin/`（郡）、支配 `control/`（城の支配域。Paradox 方式の `provinces.png` 全域1枚など）、自然 `physical/`（標高・川）、年代別の差分 `edits/` です。ブラウザへ配る分割タイル・境界線・河川の線・陰影（`kuniezu/static/kuniezu/map/build/` の生成物）はリポジトリに含めません。取得後と、正本や年代別の差分（`kuniezu/map/edits/*.json`）を変えた後に、一度生成してください（数分かかります）。

```sh
node tools/map/build-map.cjs
```

地形の陰影も作る場合は、Git LFS で `kuniezu/map/physical/heightmap.png` を取得し、NumPy と Pillow の入った Python を指定します（陰影が無くてもゲームは動きます）。その Python は `uv sync --locked --group map` で作れ、`--python .venv/bin/python` と指定します。

```sh
node tools/map/build-map.cjs --height --python /path/to/python3
```

正本の PNG は大きすぎて VS Code などでは開けないので、生成の最後に、層ごとの 1/4 の縮小版（経緯度の目盛り付き）を `kuniezu/static/kuniezu/map/build/previews/` に作ります（`control.png` 支配、`admin.png` 行政区分、`rivers.png` 川、`height.png` 標高）。目で確かめるときはこちらを開いてください。

生成後は Django の開発サーバーを起動し、ブラウザで `http://localhost:8000/index.html` を開きます（`uv sync --locked` の後 `uv run python manage.py runserver 8000`。Python 3.14 と uv が必要）。ページは Django のテンプレートなので、`kuniezu/static/kuniezu/` だけを静的ファイルとして配信しても開けません。`uv run python scripts/build_static.py` は公開用の静的ファイルを `dist/client/` に書き出し、こちらは静的ファイルとして配信すれば開けます。構成は website と同じ Django の並びへ揃える途中です（`docs/structure.md`、`docs/architecture/replatform-plan.md`）。画面の地図は北が上です。表示設定の「地図の向き」で、明治「大日本全図」に合わせた向き（北を左へ 16 度）などに回せます（`docs/reports/MAP_ORIENTATION.md`）。領地は既定で郡ごとに塗ります。郡（CODH の江戸末期の郡境）を、その日に郡の中の城を持つ家の色で塗り、城の無い郡は同じ国の城がすべて同じ家ならその家の色にします。どちらでも決められない郡には、絵巻物のような金雲（すやり霞）を重ねます。色は今のゲームの城の持ち主から決めた推定で、史料で照合した支配ではありません。表示設定の「領地の塗り」で、従来の城の領域の塗りに戻せます（`docs/designs/county-territory.md`）。

史実の関係データベースは、`uv run python manage.py migrate` の後 `uv run python manage.py import_history` で、`data/research/` と `docs/work/` の入力から根の `db.sqlite3` に作ります（Git には入れません）。`uv run python manage.py history_query --about 織田信長 --year 1582` のように、対象・年・経緯度の範囲で引けます。全件の背骨として、史料編纂所の綱文を 1 本条＝1 件で並べた所在の目録（`data/research/kobun-index/`、文面は置かない）を取り込みます。今は 1534 年分（478 条）で、どの条も未分類です。戦役と、それを作る合戦の親子（`data/research/conflicts.json`）も取り込みます。対象は名前でも識別子（`place:ganjaku` など）でも指せ、名前が複数の対象に当たると候補を並べて止まります。2 つの識別子が同じ対象であること、ゲームの拠点が台帳の場所を代表することは、出典付きの記録として `data/research/curated/identities/*.json` に置きます（形は同フォルダの `README.md`。記録が無い限り、同じ名前の対象を自動ではまとめません）。城の支配の記録（`data/research/curated/control/`）も取り込み、`uv run python manage.py export_game_data --output <ディレクトリ>` で城の持ち主の区間（`owners.js`）を書き出します。公開の書き出し（`scripts/build_static.py`）は一時の DB でこれを自動で行います。ゲームがこの区間を読むのは次の段階で、今はまだ年表が持ち主を決めます。入っているのは今ある入力の全件で、出典で確認済みのものと、実装の棚卸し（未照合）を区別して持ちます（`docs/architecture/history-rdb.md`）。

地理の機能（GeoDjango と SQLite の拡張 SpatiaLite）は、地理ありの設定 `config.settings.geo` だけで使い、データベースも別のファイル `geo.sqlite3` にします。GDAL・GEOS・PROJ・SpatiaLite を OS の道具で入れる必要があり（uv では入りません）、ゲームの公開と静的書き出しには要りません。今入っているのは土台だけで、郡・国の面と場所の点はまだありません。手順は `docs/structure.md`、計画は `docs/architecture/replatform-plan.md` の段 7 です。

エージェントが起動・停止してよいサーバーは `127.0.0.1:8000` だけです。8001番や他ポートは起動・利用しません。検証は起動済みの `http://127.0.0.1:8000/index.html` に接続します。検査結果の保存先は `GAME_TEST_OUTPUT` で指定できます。

基本の確認は次のコマンドです。詳しくは [検証手順](tools/checks/README.md) を参照してください。

```sh
node tools/checks/offline.cjs
```

## サポートと関連資料

- 現行仕様と合意事項: [HANDOFF.md](HANDOFF.md)
- 文書の入口: [docs/README.md](docs/README.md)
- 史料と実装の区別: [data/research/README.md](data/research/README.md)
- 地形・水域データの出典と加工: [kuniezu/static/kuniezu/licenses/DATA_SOURCES.md](kuniezu/static/kuniezu/licenses/DATA_SOURCES.md)
- 第三者データの表記: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)

## 開発と貢献

画面は、`masuda-so/website` と共通の方式で Bootstrap 5.3 の部品へ順に組み直しています。Bootstrap 5.3.8 は `kuniezu/static/kuniezu/vendor/` に無改変で同梱し、`bootstrap-layer.css` が系列共通の主題 `series-theme.css` と合わせて読み込みます。現時点で入っているのは土台だけで、既存の画面はまだ独自の CSS で描いており、見た目は導入前と同じです。段取りは `docs/architecture/replatform-plan.md` の段 6 にあります。

受入条件だけを更新した場合は `node tools/work/build-catalog.cjs --requests-only` で要望行のみ同期します。対象ID・担当・完了証拠を保持し、`--requests-only --check` で整合を確認できます。

GitHub Actionsの通常CIは、サーバー不要の検査（構文・保存・領土、フォルダと担当、基盤）を Node.js で実行します。実画面の検証は利用者の環境で行い、結果の要約を `data/verification/` に記録します（画像は PR に添付し、リポジトリには入れません）。

リポジトリを変更する場合は、[HANDOFF.md](HANDOFF.md) の合意事項と [docs/work/README.md](docs/work/README.md) の完了条件を確認し、作業ごとに main からブランチを切り、一つの目的に絞った小さな PR で変更内容と検証結果を記載してください（GitHub flow。取り込みは squash）。作業時の共通方針は [AGENTS.md](AGENTS.md) を参照してください。

合戦図の範囲入力は `data/inputs/battle-atlas-frames.json` です。生成器の `--titles` で対象だけを更新できます。細密比較標高の指定がある対象は旧生成器で上書きせず、[原本と再生成手順](data/inputs/battle-dem-detail/README.md)に従います。[高天神の再生成と検証](docs/reports/TAKATENJIN_ATLAS_BOUNDS.md)を参照してください。

追加肖像の原本・出典・切出しは `tools/faces/reviewed-portraits.json` で管理します。`uv run python tools/faces/build_reviewed.py --check` で配信画像との一致を確認し、入力を更新した場合は `--write` と `node tools/build/stamp-assets.cjs` で再生成します。ネットワーク取得や全肖像の再生成は行いません。

ライセンスは [LICENSE](LICENSE)（MIT）です。同梱・派生する地図データ等は各出典の条件に従います。
