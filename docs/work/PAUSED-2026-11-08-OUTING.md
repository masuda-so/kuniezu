# 外出による一時停止（2026-11-08）

> 18:16 JSTに利用者指示で再開。以下は停止時点の記録。ゴールはactive、8000番も再起動済み。

利用者の明示指示でゴールをpausedに変更。担当サーバー127.0.0.1:8000（PID12254、実行セッション31284）をCtrl-Cで停止し、lsofで待受なしを確認。子エージェント3人も全員完了済み。再開指示まで作業・サーバーを再開しない。Claudeにも停止を連絡済み。

## 保存状態

- main反映済み：PR89 文禄と釜山鎮分離（e0b4e89e）、PR87 密集駒と局所表示（b0fceacc）。
- ROOT：codex/shitaragahara-scene、c3ce7134までpush済み。設楽原11隊、時計35..100切出し、元ease保持、局地地形投影・縦横縮尺、自軍かつ実キュー同日だけ自動接続。独立レビュー指摘対応済み。113布陣、1380フレーム、2211点path、940/335のChrome（親子・地形・河川・cache・resize・自軍/別日/北条除外）成功。offlineも成功（/tmp/kuniezu-shitaragahara-offline.log）。まだPR未作成。生成history-focus-audit差分とverificationのJSONはコミットしない。
- PR88 大友宗麟/義鎮：全CI通過済みだが、74→79後にmain追従・export再生成して取り込む。
- PR90 暦境界：665c61af、欠番1582/10/5〜14拒否。DB日付/取込/検索63件＋最終17件、ruff/mypy、Claude元作者レビュー成功。取り込み前に最新main/CI確認。
- PR91 受入条件同期：81f4d97d。20要望のみ同期、対象ID/非要望行/state/証拠保持。最新main/CI確認後取り込み。

## 引き継いだDB PR

Claudeから74/79の追従・生成・CI・squash取り込みの担当を受領。Claudeは両remote branchへ以後pushしない。

別ツリー：/Users/masudaso/.codex/worktrees/person-authority-next-twelve/天下分け目の国絵図

現在codex/death-dates-integration（origin/claude/untitled-death-dates起点）。最新mainを署名merge済み。export-evidence実行後のsources.jsonlとmanifest.jsonだけ未コミット。144命題（118+26）、evidence-store/history-index成功。未push。既存Claude作業ツリーは変更していない。次は差分を精査・保存し、DB試験/CIの後にHEADをclaude/untitled-death-datesへpushする。79は未着手（remote dc9fe9df）。74取り込み後、79を最新mainへ追従し生成物を再生成する。squash本文末尾にClaude Opus 5.5とCodexのCo-authored-byを付ける。完了時にClaudeへ通知し、元worktreeの片付けはClaudeが行う。

## Claudeからの未返答事項

Claudeがconflicts.jsonからPhenomenon.parentへの接続を担当すると表明。importer/models/migration/tests/設計書、conflicts正本は読取のみ。利用者停止を連絡し、その作業も保存・停止を依頼済み。

質問：conflictsのidを安定識別子として扱い、既存のbattle:長篠の戦い等と同じ名前空間・同じidは同事象として統合してよいか。**まだ許諾していない**。campaign:長篠の戦いと既存battle:長篠の戦いは別IDだが同名なので、自動で名前だけ統合しないよう検討・返答が必要。既存claimの対象が戦役/本戦どちらなのか根拠を確認する。

現在DB importerはHISTとdocs/work/catalogを読み、ゲームの新sceneを自動でDBへ入れない。TK.BATTLES=112/113という描画母数と、カタログ111、確認済み史実命題数を混同しない（Claudeへ説明を訂正済み）。

## ローカルDBと今後

ROOTの空だったdb.sqlite3にmigration3件とimport_historyを実施済み。3377入力レコード（典拠84、地点43、実装拠点461、実装年表665、catalog1506、claim118、location22、kobun目録478）。人物・年・別名検索とquick_check=ok。これは確認済み史実3377件という意味ではない。証拠：data/verification/codex-history-db-resume/README.md（未コミット）。

長久手切分け案：/tmp/kuniezu-campaign-resume/scope-plans.json。追加人物別名3件（実休/義賢、幸綱/幸隆、道雪/鑑連）：/tmp/kuniezu-alias-next/。まだ正本へ未採用。飯尾は保留。

利用者は作業中約30分ごとの残時間通知を希望。直近通知（11:05頃JST）：駒/文禄反映済み、設楽原・長久手の区切りまで1.5〜3時間目安。停止中は時計を進めた作業見積もりにしない。
