# 照合パイロットの実測（Claude、2026-11-10）

main `ce109c5e` から。段階の開始・終了は、その場で `date -u` で記録した（末尾に全行を載せる）。後から推測した時刻は入れていない。時間は、エージェントの経過時間であって、人が読む時間ではない。

## 経過時間

- 全体：02:14:18〜02:37:16（約 23 分）。このうち検査（pytest・offline・CI の検査）が 6 分 17 秒。
- 内訳：段階に入った時間の合計が約 18 分（検査の 6 分 17 秒を含む）、段階のあいだの空き（エージェントの思考の時間で、どの段階にも入っていない）が約 5 分。合わせて全体の約 23 分（22 分 58 秒）になる。
- 件数：人物はユニークで 20 人（再利用 10・新規 10）。追加の 2 件は新規 10 のうちの 2 人（伊達輝宗・波多野秀治）を、公的機関の原本で照合し直したもので、内数。照合は延べ 22 回。年表の 5 件は、新しい命題 2（甲尾の婚姻・清洲会議）、既に結んであったもの 1、個別の条が無いもの 2。
- 計測の欠け：
  - 施設の判定（facility review）は、開始の時刻を書く前に済ませていたため、0 秒と記録されている。判定の時間は測れていない。
  - 年表の照合と登録は、境目を記録していないので、2 つを合わせた時間しか無い。

## 層ごとの結果

| 層 | 件数 | 主な段階の時間 | 結果 |
|---|---|---|---|
| 人物・再利用 | 10 | 照合 41 秒（失敗 1 回を含む）・確認 50 秒 | 10 件とも QID が curated と一致。2 件（安芸国虎・長束正家）は命題だけの人物で、ゲームの人物ではない |
| 人物・新規 | 10 | 取得 4 秒・NDL の検索 98 秒・原本の検索 18 秒・登録 105 秒 | 採用 1（今川氏真）、名前と年は一致するが要確認 2、要確認 7 |
| 人物・追加の照合（新規 10 の内数） | 2 | 50 秒（上限 15 分） | 採用 1（伊達輝宗）、要確認 1（波多野秀治） |
| 施設・再利用 | 5 | 1 秒未満 | 5 件とも CODH と 0km で一致。ゲームの位置が CODH 由来であることの確認で、独立の照合ではない |
| 施設・新規 | 5 | 取得 15 秒 | 候補 1、同じ場所だが別の対象 1、該当なし 3。登録 0 |
| 年表の命題 | 5 | 選定 47 秒・取得 125 秒・照合と登録 59 秒 | 新しい命題 2、既に結んであった 1、個別の条が無い 2 |

## 失敗と方法の変更

- 人物の照合のスクリプトが、読み込みの道の誤りで 1 回失敗した（7 秒）。
- 綱文の API は、直接の HTTP では 403 だった。内蔵ブラウザのタブに切り替え、和暦の書式を 5 通り試した（`永禄4年..1.1-永禄5年..12.30` の形だけが通る）。
- NDL 典拠の SPARQL は、完全一致（`rdfs:label`・`foaf:name`・別名）でしか引けない。`CONTAINS`・`STRSTARTS` は 0 件で、別名だけの記録（恵瓊）は最初の検索で取りこぼした。
- NDL の包み（`ndlSnapshot`）の形が `evidence-store.cjs` の求める形と違い、検査の段階で直した（15 秒）。
- 年表の「未結合」の判定が、古い `timeline:<題名>` の鍵を見落としていた。

## 再現と保存

- 人物：`data/research/source-notes/pilot-person-authority.json`（最終の内容は、同定の採用 4（records）と採用しない 6（notAdopted）。うち 23 分の計測の分は採用 2＝新規の登録 1・既存の登録への典拠の追加 1、追補の分は採用 2＝新規の登録 2）。原本は `pilot-person-raw/`・`pilot-person-ndl/`。仙台市博物館の HTML は Git に入れず、抜粋 `pilot-person-sendai-excerpt.md` だけを残す。
- 施設：`data/research/source-notes/pilot-facility-match.json`（候補の照合だけ。存在年代・城域・所在の命題には採用しない）。
- 年表：`data/research/curated/claims/oda-takeda-marriage-1565.json`・`kiyosu-council-1582.json`。
- 選定の規則と母数は、報告 `docs/reports/PILOT_MEASURE.md` に書いた。
- 検査：`python -m pytest -q tests/test_history*.py` → 148 passed。`offline.cjs`・`organization.cjs`・`infrastructure.cjs`・`evidence-store.cjs`・`history-index.cjs`・`secret-scan.cjs`・`history-sqlite.py`・`history-sqlite-inputs.py`・`history-cube.py`・`build-catalog.cjs --requests-only --check` → どれも終了コード 0。

## 計測の記録（timing.tsv の全行）

```
utc	layer	stage	event	count	note
2026-11-10T02:14:18Z	all	setup	start	0	worktree from ce109c5e
2026-11-10T02:14:40Z	person	select	start	0	inspect saved sources
2026-11-10T02:15:47Z	person	select	end	20	rule-based sampling
2026-11-10T02:16:00Z	person-reuse	match	start	10	curated vs candidate vs game
2026-11-10T02:16:07Z	person-reuse	match	fail	0	script require path error, retry
2026-11-10T02:16:41Z	person-reuse	match	end	10	no fetch
2026-11-10T02:16:48Z	person-reuse	review	start	2	gameNames mismatch
2026-11-10T02:17:38Z	person-reuse	review	end	2	both are DB-only persons (claims), not game units; not errors
2026-11-10T02:17:38Z	person-new	fetch	start	10	wikidata wbgetentities 1 call + NDL per P349
2026-11-10T02:17:42Z	person-new	fetch	end	10	
2026-11-10T02:17:51Z	person-new	fetch-ndl-search	start	9	no P349; try NDL authority search
2026-11-10T02:19:02Z	person-new	fetch-ndl-search	end	9	exact-label SPARQL with name split/date variants
2026-11-10T02:19:59Z	person-new	public-source	start	8	web search for municipal/official pages (lg.jp etc.)
2026-11-10T02:20:17Z	person-new	public-source	end	4	4 searched: 安国寺恵瓊 NDL 00622777 found via search (label 恵瓊); 伊達輝宗・斎藤義龍・波多野秀治 no public-institution identity page in one search -> needs-review; 4 others not searched (time-box)
2026-11-10T02:20:29Z	person-new	fetch-ndl-search2	start	7	retry with altLabel forms
2026-11-10T02:20:56Z	person-new	fetch-ndl-search2	end	7	
2026-11-10T02:21:16Z	person-new	register	start	3	今川氏真・足利義氏・安国寺恵瓊
2026-11-10T02:23:01Z	person-new	register	end	1	今川氏真 adopted; 2 matched-but-needs-review (no P349); 7 needs-review
2026-11-10T02:23:10Z	facility	select	start	0	inspect existing data
2026-11-10T02:23:32Z	facility	select	end	10	rule-based
2026-11-10T02:23:42Z	facility-reuse	match	start	5	nearest CODH by distance
2026-11-10T02:23:42Z	facility-reuse	match	end	5	
2026-11-10T02:24:06Z	facility-new	fetch	start	5	JapanSearch bunka keyword, 1.5s interval
2026-11-10T02:24:21Z	facility-new	fetch	end	5	
2026-11-10T02:24:38Z	facility	review	start	10	manual judgement of matches
2026-11-10T02:24:38Z	facility	review	end	10	reuse 5 consistent (CODH origin, not independent); new 1 candidate, 1 related-not-identity, 3 none
2026-11-10T02:25:16Z	claim	select	start	0	find unbound timeline rows
2026-11-10T02:26:03Z	claim	select	end	5	pool 36 unbound rows not covered by main or pending batches 10-12; strata: shared-existing 1 (1587-7-7 佐々成政の肥後拝領 / sassa-higo-grant), new 2 (1562-1-15 上杉輝虎, 1565-10-1 甲尾同盟), period-ambiguous 1 (1573-8-20 羽柴秀吉), place-ambiguous 1 (1582-7-18 丹羽長秀の若狭領・近江加増)
2026-11-10T02:26:03Z	claim	fetch	start	5	tsunabun search API
2026-11-10T02:26:47Z	claim	fetch	fail	4	direct HTTP to tsunabun API returns 403; switching to built-in browser tab (as in batches 1-12)
2026-11-10T02:28:08Z	claim	fetch	end	5	browser route: 5 queries (1 format probe x5 + 5 searches); 403→browser switch + format probing included
2026-11-10T02:28:08Z	claim	source-check	start	4	read kobun lists, decide
2026-11-10T02:29:07Z	claim	register	end	2	oda-takeda-marriage-1565, kiyosu-council-1582; 1 already bound (legacy timeline: key); 2 no individual article (上杉輝虎 rename, 羽柴 rename)
2026-11-10T02:29:43Z	person-new	register	fix	1	NDL snapshot wrapper format required by evidence-store (found at check stage)
2026-11-10T02:29:58Z	person-extra	public-source	start	2	rule: first and last of the 7 unresolved in ja title order; cap 15 min
2026-11-10T02:30:48Z	person-extra	public-source	end	2	伊達輝宗 adopted via 仙台市博物館 page; 波多野秀治 no public-institution original in 1 search -> needs-review
2026-11-10T02:30:59Z	all	check	start	0	pytest + CI checks
2026-11-10T02:37:16Z	all	check	end	0	
```

## 追補：既存の入力の横断検索（23 分の計測とは別の工程）

Codex の提案で、未解決の 8 人の名前を、Web の取得の前に既存の入力（`data/inputs`・`source-notes`・`curated/sources`）で横断検索した。

- 横断検索（grep）：1 秒未満。8 人のうち 2 人（斎藤義龍・三好長逸）に、公的機関の資料が既にあった。
- 原本の確認：67 秒。岐阜県のページは、肖像の帰属の観察として登録済みだったが本文の要旨が無かったので、取り直して義竜の段落を読んだ。大阪歴史博物館の研究報告は、本文が既に入力にあった。この 67 秒には、次の登録のスクリプトを書く時間も入っている。
- 登録：3 秒（機械の処理だけ。中身を決めたのは前の段階）。
- 結果：斎藤義龍・三好長逸を新しく登録した。curated の人物は、登録の総数が 127、外部 ID と同定の根拠を持つものが 113（パイロットの前は 124・109）。岐阜県のページの HTML は Git に入れず、抜粋 `pilot-person-gifu-excerpt.md` だけを残す。
- 分かったこと：Web の検索で見つからなかった人物の一部は、既存の入力の中にあった。照合の前に、まず既存の入力を横断検索するのが効く。

```
2026-11-10T02:53:52Z	supplement	corpus-search	start	6	grep existing inputs/source-notes for the 6+2 unresolved names (separate from the 23-min pilot)
2026-11-10T02:53:52Z	supplement	corpus-search	end	10	
2026-11-10T02:54:02Z	supplement	source-check	start	2	斎藤義龍 (Gifu pref), 三好長逸 (Osaka museum PDF text)
2026-11-10T02:55:09Z	supplement	source-check	end	2	both sufficient: 斎藤義竜 (道三の子・永禄4年5月11日没, Gifu pref page re-fetched to read body); 三好長逸 (野田・福島城の大将 1570, museum study text already in repo)
2026-11-10T02:55:09Z	supplement	register	start	2	
2026-11-10T02:55:12Z	supplement	register	end	2	斎藤義龍 (new registration), 三好長逸 (new registration)
```
