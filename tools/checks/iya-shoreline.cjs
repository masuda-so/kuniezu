/* Rebuild the map before checking the Iya reclamation correction. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const MD=require('../map/map-data.cjs'),decode=require('../geo/png-decode.cjs');
const recipe=require('../../data/research/iya-shoreline/pixel-reconstruction.json');
const manifest=JSON.parse(fs.readFileSync(path.join(MD.out,'manifest.json')));
assert.equal(manifest.source.sha256,MD.sourceSha256());
for(const key of ['K','CX','LON0','LAT0','origin','stepUnits']){
  assert.deepEqual(recipe.projection[key],manifest.projection[key],key);
}
assert.equal(manifest.width,recipe.projection.width);
assert.equal(manifest.height,recipe.projection.height);

const defs=MD.readDefinition();
const cache=new Map();
function expect(level,x,y,key){
  const col=Math.floor(x/manifest.tile),row=Math.floor(y/manifest.tile);
  const file=level.tiles.find(t=>t.col===col&&t.row===row)?.file;
  assert.ok(file,key+' tile missing');
  const target=path.join(MD.out,level.dir,file);
  if(!cache.has(target))cache.set(target,decode(fs.readFileSync(target)));
  const tile=cache.get(target),index=((y%manifest.tile)*tile.width+x%manifest.tile)*4;
  assert.deepEqual([...tile.data.subarray(index,index+3)],defs.byKey.get(key).rgb,`${level.factor}x ${x},${y}`);
}
const levels=[{factor:1,dir:'provinces',tiles:manifest.tiles},...manifest.levels];
const operation=recipe.operations[0],counts=[];
for(const level of levels){
  const f=level.factor;let count=0;
  for(const [y,a,b] of operation.runs){
    if(y%f!==(f>>1))continue;
    for(let x=a;x<b;x++)if(x%f===(f>>1)){
      expect(level,Math.floor(x/f),Math.floor(y/f),operation.toKey);count++;
    }
  }
  assert.ok(count>0);counts.push(count);
}
assert.deepEqual(counts,[operation.expectedPixels,20,4]);
for(const {xy:[x,y],key} of recipe.unchangedControls)expect(levels[0],x,y,key);
console.log('PASS: Iya lake cells at 100/400/800 m: '+counts.join('/')+'; four surrounding controls');
