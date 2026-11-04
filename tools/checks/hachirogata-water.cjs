/* 正本から生成した局所タイルと、採用した行差分を照合する。 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const MD=require('../map/map-data.cjs'),decode=require('../geo/png-decode.cjs'),root=MD.root,p=MD.readProjection();
const recipe=JSON.parse(fs.readFileSync(path.join(root,'data/research/hachirogata-reference/pixel-reconstruction.json'))),man=JSON.parse(fs.readFileSync(path.join(root,'game/map/build/manifest.json'))),defs=MD.readDefinition(),cache=new Map();
for(const k of ['K','CX','LON0','LAT0','origin','stepUnits','width','height'])assert.deepEqual(recipe.projection[k],p[k]);
function at(x,y){const col=Math.floor(x/man.tile),row=Math.floor(y/man.tile),key=col+','+row;if(!cache.has(key)){const t=man.tiles.find(t=>t.col===col&&t.row===row);cache.set(key,t?decode(fs.readFileSync(path.join(root,'game/map/build/provinces',t.file))):null);}const t=cache.get(key);if(!t)return defs.byKey.get('sea');const o=((y%man.tile)*t.width+x%man.tile)*4;return defs.byRGB.get(Array.from(t.data.subarray(o,o+3)).join(','));}
let total=0;for(const op of recipe.operations){let count=0;for(const [y,a,b] of op.runs)for(let x=a;x<b;x++){assert.equal(at(x,y).key,op.toKey,`${x},${y}`);count++;}assert.equal(count,op.expectedPixels);total+=count;}
assert.equal(total,10021);
// Later works must not be projected backward as confirmed medieval land.
const deferred=JSON.parse(fs.readFileSync(path.join(root,'data/research/hachirogata-reference/edo-review/deferral-overlap-results.json')));
let held=0;for(const [y,a,b] of deferred.excludedToLandRuns)for(let x=a;x<b;x++){assert.equal(at(x,y).key,'lake:139.99,39.98',`deferred ${x},${y}`);held++;}
assert.equal(held,199);
// The broad comparison window contains the whole named lake, not just its changed cells.
const box=[15344,5986,15697,6433];let lake=0;for(let y=box[1];y<box[3];y++)for(let x=box[0];x<box[2];x++)if(at(x,y).key==='lake:139.99,39.98')lake++;
assert.equal(lake,23423);
// The former lagoon must reach the sea through the old Funakoshi waterway.
// Four-neighbour connectivity matches the source map's pixel contract.
const w=box[2]-box[0],h=box[3]-box[1],seen=new Uint8Array(w*h),queue=[];
for(let y=box[1];y<box[3]&&!queue.length;y++)for(let x=box[0];x<box[2];x++)if(at(x,y).key==='lake:139.99,39.98'){queue.push((y-box[1])*w+x-box[0]);break;}
seen[queue[0]]=1;let reachesSea=false;
for(let i=0;i<queue.length&&!reachesSea;i++){
 const n=queue[i],x=n%w,y=Math.floor(n/w);
 for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||nx>=w||ny<0||ny>=h)continue;const next=ny*w+nx;if(seen[next])continue;seen[next]=1;const key=at(box[0]+nx,box[1]+ny).key;if(key==='sea'){reachesSea=true;break;}if(key==='lake:139.99,39.98')queue.push(next);}
}
assert.ok(reachesSea,'Hachirogata must connect to the sea through the historical Funakoshi outlet');
// Nakajima is an island inside the historical channel, not a mainland spur.
const islandSeed=[15514,6313],islandSeen=new Uint8Array(w*h),islandQueue=[(islandSeed[1]-box[1])*w+islandSeed[0]-box[0]];
assert.equal(at(...islandSeed).key,'castle:hiyama','Nakajima remains land');islandSeen[islandQueue[0]]=1;
for(let i=0;i<islandQueue.length;i++){const n=islandQueue[i],x=n%w,y=Math.floor(n/w);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||nx>=w||ny<0||ny>=h)continue;const next=ny*w+nx;if(islandSeen[next])continue;islandSeen[next]=1;if(at(box[0]+nx,box[1]+ny).key==='castle:hiyama')islandQueue.push(next);}}
assert.equal(islandQueue.length,18,'Nakajima stays an isolated 18-cell land component');
console.log('PASS: 6201 restored lake cells, 3820 restored land cells; 23423 local lake cells; original projection preserved');
