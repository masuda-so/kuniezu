# 高天神城の合戦図：六砦を含む範囲と標高の対応修正

既存の表示範囲は中心138.036°E・34.698°N、幅6km・高さ4.2km。史料台帳にある六砦の代表点は南北に約6.8km広がるため、範囲が足りなかった。小笠山砦と三井山砦の担当隊が `表示範囲外` となるほか、獅子ヶ鼻砦と中村砦の地点ラベルも旧枠の外だった。

## 修正

- 六砦の代表点は変更しない。中心を138.04121625°E・34.70616905°N、幅11km・高さ7.7kmへ変更。新boundsは `[137.98111632074472,34.740754030237156,138.10131617925526,34.671584069762844]`。
- 表示範囲の生成元 `data/inputs/battle-atlas-frames.json`、生成meta、実標高格子 `game/atlas/43.json` を同じ範囲へ更新。
- 既存図と同じTerrarium z12の3枚（計112,940 bytes）から160×112＝17,920標高値を新しい経緯度で再標本化。旧格子を拡大して貼っていない。格子数は増やしていない。
- 河川も旧枠内の54線を引き伸ばさず、Geofabrikの同じ2026-10-31中部地方データから新枠で再切出し。111線・778頂点。現代比較線であり、戦国期の河道・堤防を確定したとの意味ではない。
- 再生成器2本に `--titles` を追加し、他110図を再取得・再生成しない。標高は既存の代表点を保持する `--reuse-points` と、未取得時に失敗する `--offline` を使える。河川は `--waterways` で必要な地域資料を指定し、その範囲と交差するshapeだけを読む。
- 標高タイルと河川入力のSHAを出力側に保持する。原資料を追加の歴史的布陣と扱わない。

## 検証

- `atlas-regressions.cjs`：全111図のmetaと実格子bounds一致、六砦座標の保持・全包含、高天神担当隊の範囲外解消、既存の参加家・保存・駒の回帰PASS。
- `battle-rivers.cjs`：全111図の比較河川座標・範囲・出典/ライセンスPASS。
- 独立検算：17,920値すべてを新bboxの経緯度から元PNGのWeb Mercator画素へ引き直し、実atlas値との一致を確認。`verification.json`。
- 他110図はJSONのSHAもmetaの内容も不変。
- 不明title、offlineでの欠損タイルは出力を変更せず拒否。入力不変で再生成した4出力がbyte一致。`generator-check.json`。
- 実格子と実河川から描いた `actual-grid-preview.png` を目視確認。赤枠は旧範囲。番号1〜6は小笠山、能ヶ坂、火ヶ峰、獅子ヶ鼻、中村、三井山。ゲーム画面のスクリーンショットではない。

最新mainの分類・模式図検査と組み合わせた全deploymentsは、111場面の名簿・両陣営・重複・範囲・出典登録・再構築の同一性、海戦兵数、年代付き街道、実年代の開城・領主変更、4注記の保持まで合格した。これは全隊の詳細配置を史料で確定したという意味ではない。

## 入力と再生成

標高の公式配布情報：[Terrain Tiles / AWS Open Data](https://registry.opendata.aws/terrain-tiles/)。元PNGは次の3枚。`cache/` に取得済みで、SHAはatlas43と `verification.json` に保持。

- `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/12/3617/1626.png`
- `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/12/3618/1626.png`
- `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/12/3619/1626.png`

河川は [Geofabrik・中部地方](https://download.geofabrik.de/asia/japan/chubu.html) の `chubu-261031-free.shp.zip` から既存のRange取得器で河川ファイルだけを取得した。全ZIPや全国地形の再処理は行っていない。原入力は `/tmp/kuniezu-japan-waterways/261031/chubu/`、shp/shx/dbfのSHAは `verification.json`。

候補ルートでの実行例：

```sh
/tmp/kuniezu-map-tools/bin/python tools/geo/battle-atlas.py --titles '高天神城の戦い' --reuse-points --offline --cache data/inputs/battle-atlas-dem
/tmp/kuniezu-map-tools/bin/python tools/geo/battle-rivers.py --titles '高天神城の戦い' --waterways /tmp/kuniezu-japan-waterways/261031/chubu --accessed 2026-11-04
node tools/checks/atlas-regressions.cjs
node tools/checks/battle-rivers.cjs
```

パッチは `takatenjin-atlas.patch`。対象8ファイルの入出力SHAは `candidate-manifest.json`。`history-date-review.js` と `deployments.cjs` は候補内の結合検査fixtureにのみ存在し、本パッチから除外した。`index.html` の版は統合先の既存stamp処理で更新する。

親で範囲設定をdata/inputsへ移動し、生成器と移動台帳を更新。必要なDEM3枚（計112,940 bytes）を共有入力へ保持し、新パスによるオフライン再生成も確認した。広幅1400と狭幅390の専用Chromeで開始/途中を表示し、全登録隊の描画と例外0を確認した。狭幅では地名の混雑が残るため、全UIの視認性改善完了を意味しない。

CIにもatlas-regressionsとbattle-riversを追加した。atlas-regressionsは保持DEM3枚のSHAと17,920点をNode側で照合する。表示範囲入力の移動を含むorganizationと、asset stampsも確認する。実画面の要約は `data/verification/codex-takatenjin-atlas/README.md`。
