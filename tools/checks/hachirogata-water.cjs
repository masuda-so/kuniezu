/* 正本から生成した局所タイルと、採用した行差分を照合する。 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const MD=require('../map/map-data.cjs'),decode=require('../geo/png-decode.cjs'),root=MD.root,p=MD.readProjection();
const recipe=JSON.parse(fs.readFileSync(path.join(root,'data/research/hachirogata-reference/pixel-reconstruction.json'))),man=JSON.parse(fs.readFileSync(path.join(root,'game/map/manifest.json'))),defs=MD.readDefinition(),cache=new Map();
for(const k of ['K','CX','LON0','LAT0','origin','stepUnits','width','height'])assert.deepEqual(recipe.projection[k],p[k]);
function at(x,y){const col=Math.floor(x/man.tile),row=Math.floor(y/man.tile),key=col+','+row;if(!cache.has(key)){const t=man.tiles.find(t=>t.col===col&&t.row===row);cache.set(key,t?decode(fs.readFileSync(path.join(root,'game/map/provinces',t.file))):null);}const t=cache.get(key);if(!t)return defs.byKey.get('sea');const o=((y%man.tile)*t.width+x%man.tile)*4;return defs.byRGB.get(Array.from(t.data.subarray(o,o+3)).join(','));}
let total=0;for(const op of recipe.operations){let count=0;for(const [y,a,b] of op.runs)for(let x=a;x<b;x++){assert.equal(at(x,y).key,op.toKey,`${x},${y}`);count++;}assert.equal(count,op.expectedPixels);total+=count;}
assert.equal(total,10226);
// Later works must not be projected backward as confirmed medieval land.
const deferred=JSON.parse(fs.readFileSync(path.join(root,'data/research/hachirogata-reference/edo-review/deferral-overlap-results.json')));
let held=0;for(const [y,a,b] of deferred.excludedToLandRuns)for(let x=a;x<b;x++){assert.equal(at(x,y).key,'lake:139.99,39.98',`deferred ${x},${y}`);held++;}
assert.equal(held,199);
// The broad comparison window contains the whole named lake, not just its changed cells.
const box=[15344,5986,15697,6433];let lake=0;for(let y=box[1];y<box[3];y++)for(let x=box[0];x<box[2];x++)if(at(x,y).key==='lake:139.99,39.98')lake++;
assert.equal(lake,23098);
console.log('PASS: 6141 restored lake cells, 4085 restored land cells; 23098 local lake cells; original projection preserved');
