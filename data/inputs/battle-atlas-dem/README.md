# 合戦図の比較標高入力

Mapzen Terrarium / AWS Open Data Terrain Tiles の取得原本。ファイル名は `zoom-x-y.png`。現在の3枚は高天神の表示範囲の再生成に使用した。SHAと座標は `game/atlas/43.json` の `elevationSource.tiles` に保持する。現代比較標高であり、戦国期の地形測量ではない。

配布元：[AWS Open Data Terrain Tiles](https://registry.opendata.aws/terrain-tiles/)。出典表示：[Tilezen attribution](https://github.com/tilezen/joerd/blob/master/docs/attribution.md)。取得URLは `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`。

Pillowの入ったPythonで、ネット取得せずに高天神だけを再生成できる。

```sh
python3 tools/geo/battle-atlas.py --titles '高天神城の戦い' --reuse-points --offline --cache data/inputs/battle-atlas-dem
```

続いて河川の生成器を同じタイトルで実行する。DEMだけの再生成は河川入力の代替にはならない。
