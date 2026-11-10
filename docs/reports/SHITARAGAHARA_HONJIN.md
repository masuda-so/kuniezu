# 設楽原の本陣の順序を、既存の資料から所在の観察として登録する（2026-11-10）

Codex の依頼で、合戦図の既存の資料を使う代表例として、設楽原の三人の本陣とその順序を、人物の所在の観察（`curated/locations`）に登録した。main `d4685dda` から。合戦の描画コードと既存の経路（`TK.BATTLE_MOVEMENTS`・`TK.DEPLOYMENT_PLANS`）は変えていない。

## 資料

新城市設楽原歴史資料館「設楽原布陣図」（名品10選。本文は『広報ほのか』平成24年3月号より転載）の「家康と信長の本陣」「勝頼の本陣」の段落。既存の入力の横断検索で、同じ URL が `nagashinoMuseum`・`nagashinoShift`（ゲームの出典）として既に登録されていたので、本文を読み直した。HTML は Git で配らず `.cache/research-originals/shitaragahara/` に保全し、最小の抜粋 `data/research/source-notes/shitaragahara-honjin-excerpt.md` と SHA だけを残す。

## 登録したもの

| 人物 | 順序 | 場所 | 資料の記述 |
|---|---|---|---|
| 徳川家康 | 1 | 弾正山 | 本陣を置いた |
| 織田信長 | 1 → 2 | 極楽寺山（平井）→ 茶臼山 | 最初に極楽寺山、後に茶臼山へ移した |
| 武田勝頼 | 1 → 2 → 3 | 医王寺山 → 清井田 → 才ノ神 | 長篠城を攻めていたときは医王寺山、設楽原へ動くときに清井田、そこから才ノ神 |

- 場所 6 件を新しく登録した（座標は主張しない）。所在の観察 6 件は、関係 `attested-presence`、役割 `本陣`、順序 `sequence {group, order}` を持つ。
- 年は資料に書かれていないので、既存の命題 `nagashino-phases`（天正3年の長篠・設楽原の戦い）の年 1575 を年の精度で置いた。日付・時刻・滞在の長さ・移動の経路・個々の部隊の配置は補っていない。
- 医王寺山は、既存の命題 `nagashino-headquarters`（`site:医王寺山`、長篠城の約600m北方）と同じ山を指すが、名前空間が違うので場所の ID は統合していない。

## SQL での確認

隔離した手元の DB（`db.sqlite3`、Git に入れない）で `migrate` と `import_history` を行い、次を確かめた。

- 6 件とも取り込まれ、現象は `mode=state`・`kind=movement`・`subtype=attested-presence`。
- `history_record.payload` の `sequence` で、人物ごとの順序（家康 1、信長 1→2、勝頼 1→2→3）を並べ替えられる。
- `manage.py history_query --about 才ノ神` で引ける。

限界：順序は記録の payload に残るだけで、現象どうしの前後の関係（「この次に」）としては DB に入っていない。前後を関係として引けるようにするのは、型の追加なので別の PR で決める。

## 実測（その場で記録した UTC）

既存の入力の横断検索 1 秒、資料の本文と取り込み側の型の確認 91 秒、登録と書き出し・検査 63 秒（SQL の確認 7 秒を含む）。登録の段階の終わりの時刻は、SQL の確認の後に記録した。

## 検証

`data/verification/claude-shitaragahara-honjin/README.md`。
