# 取り込みの 1 回の中で、同じ照会をくり返さない（2026-11-10）

Codex の cProfile（隔離 DB、7.086 秒、#154 の報告）で、`Importer.known_as`・`label`・`take_part` と、`records.add` が、同じ取り込みの中で同じキー・名前・参加・記録の結び付きを何度も DB に問い合わせていると分かった。

`import_all` は最初に Phenomenon と Thing を消して作り直すので、ThingName・ThingKey・Participation と、Thing・Phenomenon の records の結び付きは、毎回の取り込みの中で新しく作られる。そこで、1 回の `Importer` の中だけで、書いた (thing, 名前)・キー・(現象, thing)・(種類, 対象, record) を覚え、2 回目からは問い合わせない。永続のキャッシュやグローバルの状態は作らず、入力も減らさない。最初の role（`get_or_create` の defaults）、`merged_things` の数え方、`by_name` に足す条件、`transaction.atomic` の rollback は変えていない。

## 変更前後の比較

main `3699d932`、同じ固定入力、隔離した新しい DB で、新しい DB への取り込みと、続けての 2 回目の取り込みを行い、pk に依存しない形で書き出して比べた。

| 書き出し | 件数 | 新しい DB | 2 回目 |
|---|---|---|---|
| Thing（key・種類・名前・registered） | 1467 | 一致 | 一致 |
| ThingName | 1510 | 一致 | 一致 |
| ThingKey | 1552 | 一致 | 一致 |
| Participation（role を含む） | 1230 | 一致 | 一致 |
| Thing の records | 3175 | 一致 | 一致 |
| Phenomenon の records | 1829 | 一致 | 一致 |
| Phenomenon（あり方・種類・時刻・場所・親） | 1567 | 一致 | 一致 |
| Record（種類・状態・内容のハッシュ・退役） | 3710 | 一致 | 一致 |
| RecordVersion | 3710 | 一致 | 一致 |
| Place・Authority | 519・151 | 一致 | 一致 |
| Summary（取り込みの件数） | — | 一致 | 一致 |

時間（同じ端末、cProfile なし、3 回の中央値）：新しい DB 3.190 → 2.924 秒、2 回目 2.374 → 2.133 秒。8〜10% ほどの短縮で、大きくはない。残りの大半は INSERT そのもの（`create`・`save`）なので、これ以上は bulk 化の判断になる（この PR ではしない）。

## 検証

`data/verification/claude-importer-run-cache/README.md`。
