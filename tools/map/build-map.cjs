/* 地図の通常の再生成の入口。正本 game/map_data/ から Web 配信用の生成物（game/map/）を順に作る。重い処理なので一つずつ直列に動かす。
   1. 領域タイル   tools/map/build-map-tiles.cjs      provinces.png → game/map/provinces{,-4,-8}/・manifest.json
   2. 年代別の版   tools/map/build-province-edits.cjs game/map/edits/*.json → game/map/edits/compiled/
   3. 境界線       tools/map/build-edges.cjs          領域タイル・版・data/map/gun.png → game/map/edges-1・edges-4・edges-8・versions.json
   4. 河川の線     tools/map/build-river-lines.cjs    rivers.png → game/map/rivers-lines.json
   5. 陰影         tools/map/build-height-cache.py    heightmap.png → game/map/relief-cache/・relief.json（--height の時だけ。NumPy・Pillow の Python が要る）
   最後に tools/build/stamp-assets.cjs で読み込みの確認値をそろえる。
   正本は画像そのものを直す。旧来の線や外部データから正本を作った移行用の道具は削除した（必要なら Git の履歴を見る）。
   実行：node tools/map/build-map.cjs [--height] [--python /path/to/python3]
         node tools/map/build-map.cjs --check   （書かずに、領域タイルと河川の線が正本どおりか確かめる） */
const {spawnSync}=require('node:child_process'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),args=process.argv.slice(2),arg=k=>{const i=args.indexOf(k);return i>=0?args[i+1]:null;};
const node=(file,...a)=>[process.execPath,['--max-old-space-size=8000',path.join(root,file),...a]];
const steps=args.includes('--check')?[
 ['領域タイル',...node('tools/map/build-map-tiles.cjs','--check')],
 ['河川の線',...node('tools/map/build-river-lines.cjs','--check')]]:[
 ['領域タイル',...node('tools/map/build-map-tiles.cjs')],
 ['年代別の版',...node('tools/map/build-province-edits.cjs')],
 ['境界線',...node('tools/map/build-edges.cjs')],
 ['河川の線',...node('tools/map/build-river-lines.cjs')],
 ...(args.includes('--height')?[['陰影',arg('--python')||'python3',[path.join(root,'tools/map/build-height-cache.py'),'--grid','game/map/manifest.json','--heightmap','game/map_data/heightmap.png','--projection','game/map_data/projection.json','--output','game/map']]]:[]),
 ['読み込みの確認値',...node('tools/build/stamp-assets.cjs')]];
for(const [name,cmd,a] of steps){const t=Date.now();console.log(`— ${name}`);const r=spawnSync(cmd,a,{cwd:root,stdio:'inherit'});
 if(r.status!==0){console.error(`${name} で止まった（${r.error?.message||'終了コード '+r.status}）。後の段は動かしていない。`);process.exit(1);}console.log(`  ${((Date.now()-t)/1000).toFixed(1)} 秒`);}
console.log(args.includes('--check')?'PASS: 配信物は正本どおり':'完了：配信物を正本から作り直した');
