# 再編の計画：website と系統を揃え、地理院地図Vector を下図にする（2026-11-05 決定）

## 利用者の決定

2026-11-05、利用者の判断：

1. 利用者が持つ `masuda-so/website`（Ether 合同会社の企業サイト）と、構造・言語・枠組みを揃える。範囲は「史実 DB も Django に載せる」まで（骨組み・道具・DB の全部）。
2. 国土地理院の **地理院地図Vector**（ベクトルタイル）を下図として使う。
3. これまでの決定は引き継ぐ：範囲は日本のみ（朝鮮半島は削除）、地図平面は経緯度に比例する旧来の平面のまま、画面の向きは回転で表す。

この文書は段取りと未決の点の記録で、実装の完了を示さない。各段は小さな PR に分け、段ごとに AGENTS.md・README（日英）を同じ PR で直す。

## 揃える先（website の系統）

| 項目 | website | 国絵図の今 | 揃えた後 |
|---|---|---|---|
| 枠組み | Django 6.1 | なし（素の HTML/JS） | Django。ページはテンプレート、公開は静的書き出し |
| 言語 | Python 3.14（＋テンプレート・少量の JS） | JavaScript（ゲーム 96 本、道具 200 本の `.cjs`）＋Python 64 本 | サーバー側・生成・検査の道具は Python。**ゲーム本体はブラウザで動くので JS のまま** `static/` に置く |
| 依存 | `pyproject.toml`＋`uv.lock` | なし | 同じ |
| 構成 | `manage.py`・`config/`・アプリ（`templates/`・`static/`・`migrations/`）・`scripts/`・`tests/`・`docs/`・`locale/` | `game/`・`tools/`・`data/`・`docs/` | 同じ並び。アプリ名は `kuniezu/` |
| 公開 | `scripts/build_sites_static.py` → `dist/client/` → Vercel | `game/` をそのまま配信 | 同じ書き出し |
| 道具 | Ruff・djLint・mypy・pytest・pre-commit | Node の検査スクリプト | 同じ道具。JS を動かす検査だけ Node を残す（下記） |
| DB | PostgreSQL（本番）、SQLite（書き出し） | curated JSON が正本、SQLite は派生 | Django のモデルと移行。エンジンは SQLite |

### 揃えられない点（正直な線引き）

- ゲームの進行・描画はブラウザの JavaScript で動く。これを Python に書き換えるのはゲームの作り直しで、行わない。website も JS は `static/js/` に置いている。
- `tools/checks/` の 175 本の多くは、ゲームの JS を Node の `vm` で実行して 720 日の進行などを確かめる。JS を実行する以上 Node が要る。これらは pytest から呼ぶ形に包み、**開発時の依存として Node を残す**。地図・史料・肖像・地理の生成器（JS を実行しないもの）は Python へ移す。

## 地理院地図Vector を下図にする

確認した事実（2026-11-05、国土地理院の公開ページ）：

- ベクトルタイル `experimental_bvmap`（提供実験）と最適化版 `optimal_bvmap`（PMTiles）。ズーム 4〜16、全国、四半期ごとに更新。MapLibre GL JS 用の style（標準・淡色・白地図ほか）が配られている。
- 提供実験・試験公開で、URL・データ構成・内容は変わりうる。基本測量成果とは位置づけられていない。利用による損害に国土地理院は責任を負わない。
- 国土地理院コンテンツ利用規約（PDL1.0）が適用され、出典の明示が要る（例：「国土地理院ベクトルタイル提供実験」「国土地理院最適化ベクトルタイル」）。加工した場合はその旨も書く。
- 測量法に基づく承認の要否（タイルをそのまま読み込んで表示する場合／加工・再配布する場合）と、商用・非商用の区別は、読んだページには記載が無い。**未確認として扱い、タイルを同梱・再配布しない**（実行時に国土地理院の配信から読むだけにする）。

設計：

| 点 | 方針 |
|---|---|
| 描画の土台 | MapLibre GL JS。座標は経緯度、回転は `bearing`（既定は大日本全図に合わせた 16 度。CSS で画布を回す今の実装は置き換える） |
| 下図 | 地理院のベクトルタイルを、海岸・水域・河川・等高線など自然の層だけ使う style で読む。**現代の道路・鉄道・建物・地名・行政界は表示しない**（史実観察の原則。現代の比較地形は別扱い） |
| 本作の層 | 城の支配域（区画ごとの多角形、領主の色は実行時に付け替え）、国・郡の境、年代別の水域（児島湾・八郎潟・香取海など、現代の海岸の上に重ねる）、街道 |
| 正本 | 変えない。`provinces.png` ほか CK3 方式の画像と表が正本。生成の段で経緯度の多角形・線（GeoJSON）を起こす |
| 部隊・名札 | 今の canvas の上層を残し、座標変換だけ `map.project()` に替える（段階的に移す） |
| 配信が止まった時 | 下図が読めなくても、本作の層（陸・境・水域）だけで遊べる状態を保つ |
| 出典 | 画面の出典欄に規約どおり明示 |

改める既存の決まり（該当の段の PR で AGENTS.md を直す）：

- 「実行時の依存を増やさない」→ MapLibre GL JS（と PMTiles の読み手）を版を固定して入れる。置き方（`static/vendor/` に通知付きで置くか、外部から読むか）は段 3 の最初に決める。
- 「実行時に外部の標高タイルは取り寄せない」→ 下図のベクトルタイルは実行時に読む。標高・陰影は当面 Copernicus 由来の自前の陰影を使う。
- 「配信 URL は変えない」→ Django の `static/` へ移すので変わる（利用者は以前「URL が変わっても統合」と判断）。

## 段取り

各段は main から枝を切り、1 段を複数の小さな PR に分ける。前の段が main に入ってから次を切る。

| 段 | 内容 | 終わりの条件 |
|---|---|---|
| 0 | この文書（決定と段取り） | 利用者の確認 |
| 1 | **Django の骨組み**（挙動は変えない）：`manage.py`・`config/`・`kuniezu/`（`templates/`・`static/`）・`scripts/`・`tests/`・`pyproject.toml`・`uv.lock`・Ruff・djLint・mypy・pytest・pre-commit・CI。`game/` を `kuniezu/static/kuniezu/` へ、`index.html` をテンプレートへ移し、静的書き出しで今と同じ画面が出る | 既存の検査が新しい置き場で通る。書き出した `dist/client/` を開いて今と同じに遊べる |
| 2 | **朝鮮半島の削除**：消す前の状態にタグ → 地図の朝鮮を範囲外に → データ・モジュール・検査の削除 → 文書 | 朝鮮の語が実行時のコードから消え、1592 年の筋書きは出陣・帰還と年表だけになる |
| 3 | **MapLibre＋地理院Vector**：試作ページ → 生成に多角形・線の出力を足す → 下層を置き換え → 上層の座標変換を替える → 旧来の線データ（`geo.js` ほか）と canvas の下層を退役 | 下図・支配域・境・水域・街道・部隊が同じ位置に出て、回転・拡大・当たり判定が合う。下図なしでも遊べる |
| 4 | **道具の Python 化**：地図（`tools/map`）→ 史料（`tools/research`）→ 肖像・地理。JS を実行する検査は pytest から Node を呼ぶ形に包む | 生成物が Node 版と一致し、Node 版を消せる |
| 5 | **史実 DB を Django に**：今の関係表（entity・alias・authority・place・source・record・event_date・spatial_reference ほか）をモデルと移行にし、管理画面で閲覧・編集、curated JSON との取り込み・書き出しを管理コマンドにする | 取り込み→書き出しで curated JSON が変わらない。時空間検索と集計が今の結果と一致する |

段 1 は 2 つに分ける。**1a**：Django・uv の骨組み（設定・URL・ページ・静的書き出し・試験・CI）を足し、`game/` は動かさない。ページは `game/index.html` に `<base>` を入れて返すだけの仮の橋渡し（`docs/structure.md`）。**1b**：`game/` を `kuniezu/static/kuniezu/` と `kuniezu/templates/` へ移し、道具・検査・文書の経路を直し、`index.html` を本物のテンプレートにする。1b は 3 つの PR に分ける：**1b-1** `game/` を `kuniezu/static/kuniezu/` へ移し、道具・検査・文書の経路を直す（`index.html` は仮の橋渡しのまま）。**1b-2** `index.html` を `kuniezu/templates/` のテンプレートにし、インライン CSS を静的ファイルへ出す（これ以後、ページは Django の開発サーバーか `dist/client/` の配信で開く）。**1b-3** 地図の正本を `kuniezu/map/` へ移し、`kuniezu/static/kuniezu/map/build/` には生成物だけを置く。

段 1 を最初にするのは、全ファイルの移動を、開いている枝が少ない今のうちに済ませるため。Codex の作業中の枝（`codex/*`、一時停止中）は、段 1 の後に main へ付け替える必要がある。

## 未決の点（該当の段で利用者に確認する）

1. 正本の置き場：**決定（2026-11-05、利用者）** アプリのデータに分ける。正本は `kuniezu/map/`、生成物だけを `kuniezu/static/kuniezu/map/build/` に置く。実行時に読む `definition.csv`・`default.map` は生成のときに `build/` へ写す（段 1b-3）。
2. MapLibre の置き方：`static/vendor/` に通知付きで置くか、外部から読むか（website は第三者の依存をアプリの原本に写さない決まり）。
3. 史実 DB の正本：curated JSON を正本のまま、Django の DB を派生物にするか。管理画面で編集した結果を JSON へ書き戻す運用にするか。
4. 測量法の承認の要否：必要なら国土地理院へ問い合わせる。確認が取れるまで、タイルの同梱・加工配布はしない。
5. 公開先：website と同じ Vercel に載せるか。

## 参照

- website の構成：`masuda-so/website` の `docs/structure.md`
- 地理院地図Vector：<https://github.com/gsi-cyberjapan/gsimaps-vector-experiment>、<https://github.com/gsi-cyberjapan/optimal_bvmap>、<https://maps.gsi.go.jp/development/vt.html>
- 国土地理院コンテンツ利用規約：<https://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html>
- 地図の向き：`docs/reports/MAP_ORIENTATION.md`。ラスター地図：`docs/architecture/raster-map.md`。史実 DB：`docs/architecture/history-database.md`
