# 対象の同一性

2 つの識別子の関係を、1 件 1 ファイル（`<名前>.json`）で記録する。史実データベース（`docs/architecture/history-rdb.md`）の取り込みが読む。**名前が同じというだけでは登録しない。** 根拠と出典を必ず書く。

```json
{
  "id": "identity:<名前>",
  "relation": "same-site",
  "things": ["place:<台帳の場所>", "yosho:<ゲームの拠点の識別子>"],
  "basis": "同じ対象と判断した根拠",
  "source": "<出典 ID（sources の ID）>",
  "sourceUrl": "https://…",
  "locator": "出典の該当箇所",
  "checked": "2026-11-05",
  "status": "verified-in-specified-scope",
  "uncertainty": "範囲と限界"
}
```

`things` は 2 つ。1 つ目が残す側（台帳の場所など）の識別子。

| `relation` | 意味 | データベースでの扱い |
|---|---|---|
| `same-site` | 出典で、2 つの識別子が同じ対象と確認できた | 1 つの対象にまとめる。どちらの識別子でも引ける。台帳の座標があれば、それを残す |
| `represented-by` | ゲームの拠点（2 つ目）が、台帳の場所（1 つ目）を実装の上で代表している。同じ場所だという主張ではない | 対象は別のまま。台帳の場所に座標が無いときだけ、拠点の位置を借りる（根拠は `represented-by-game-site`）。出典付きの座標は置き換えない |

取り込みは、必須の項目（`id`・`relation`・`things`・`basis`・`source`・`locator`・`checked`）が欠けた記録、登録の無い出典、どの入力にも無い識別子、ほかの同一性と重なる識別子を拒む。

まだ記録は無い（2026-11-05）。
