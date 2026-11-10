# 没日3件の台帳・SQL検証

候補ブランチcodex/death-source-precision、基準main860e1882。通常配信ではなく、作業ツリー内の隔離SQLiteを対象にした。

- `node tools/research/export-evidence.cjs`：292命題・22所在記録。
- `node tools/checks/evidence-store.cjs`：出典・日付精度・対象参照の構造検査が通過。
- 既存289命題は基準コミットのclaims.jsonlとJSONの全項目で一致。追加は自治体の没日採用3件だけ。
- Django migrate/import_history：初回3.097秒、再取込2.336秒。単回測定であり性能比較ではない。
- 原日付を保持：毛利隆元1563/8/4（JDN2292177）、相良義陽1581/12/2（2298879）、竹中重治1579/6/13（2297974）。Japanese-lunisolar、日精度のまま。西暦月日と取り違えない。
- 人物検索と年検索で各命題の同じキーが得られることを確認。
- 再取込：新規版0・退役0、活動中Recordの内容ハッシュ全件一致。SQLite integrity_check / foreign_key_checkが通過。
- 隔離DB名と設定が一致することを取込前にassertし、通常配信DBは変更していない。

生出力result.jsonはこのディレクトリに保持し、Gitには要約のみを登録する。元画像・SHAと公開資料の読取記録は時計作業ツリー内.cache/research-notesに保全。根拠と限界はdocs/reports/DEATH_SOURCE_PRECISION.mdに記す。これは3名分の自治体資料の照合であり、全人物・全史料の照合完了ではない。

追加検査：`node tools/checks/history-index.cjs`が通過。`python tools/checks/history-sqlite.py`は314レコード・863条件のJavaScript/SQL検索結果一致、旧暦原日付・期間精度・R-tree・外部キー・既存出力保護が通過した。314は命題292と所在22を合算した軽量検索DBの記録数。Django DBの全Record数とは異なる。

Codexの独立レビューは既存命題・出典の無変更と、自治体限定scope・竹中の留保を確認。留保の出典URLとlocatorをGit追跡対象の報告書へ残すという改善点を反映した。レビュー担当は隔離DB検査を独立再実行していない。

必須検査`node tools/checks/offline.cjs`はコミット4cf99732を対象に最後まで実行し、終了コード0。生成された監査結果は検証ディレクトリへ保全し、正本の監査差分は本作業へ混ぜない。PRと通常配信の受入は引き続き保留。

書誌を2件追加した後の限定検査：`evidence-store.cjs`通過。
隔離Django DBで書誌554件・命題292件、追加書誌の全項目を保持。
NDL取得画像のSHA256と書誌内の値が一致。
再取込2.435秒、新規版0・退役0、全Recordの内容ハッシュ不変。
生出力は`source-metadata-result.json`。直前の必須検査の対象版と、
その後の書誌だけの追加検査を区別する。
