# 史実取り込みの隔離プロファイル

main3699d932と同じimporter.py・固定入力（273命題）を使い、別の新規SQLiteへ
migration後に1回だけimport_historyをcProfileで計測した。sourceCommitはfef23c64。
通常配信のDBは触っていない。DB接続先を.cache/history-profile/20261110-fresh/db.sqlite3と照合した。

cProfile付き7.086秒。Importer.known_as 2795回/累積1.116秒、label1607回/0.861秒、
take_part1425回/0.813秒。ORMのget_or_createは全体6699回、createは16016回。
関数の累積時間は重なり、計測負荷も含む。最適化の達成やCIとの速度比較とはしない。

fresh-profile.json・fresh-profile.txtはこのディレクトリへ保存。
元のimport.prof・DB・結果は.cache/history-profile/20261110-fresh/に保持。
今後の候補は同じ入力のfresh/reimportと全グラフの一致で比較する。
追加の全件pytestをプロファイルのためだけに回していない。
