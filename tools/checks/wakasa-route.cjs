// 若狭街道：比較線が一本で経由地を順に通り、往復や寄り道が残らず、移動用の経由地が熊川・保坂を通ることを確かめる。
const fs=require('node:fs'),assert=require('node:assert/strict'),{G,TK}=require('./history-focus.cjs').model();
const input=JSON.parse(fs.readFileSync('data/inputs/wakasa-road-review/accepted-whole-reference.json','utf8'));
const before=JSON.parse(fs.readFileSync('data/inputs/wakasa-road-review/before-modern-reference.json','utf8'));
const ref=Array.from(TK.MODERN_ROAD_REFERENCE['若狭街道'],p=>Array.from(p));
assert.deepEqual(ref,input.points);assert.deepEqual(ref[0],before.points[0]);assert.deepEqual(ref.at(-1),before.points.at(-1));
const m=(a,b)=>Math.hypot((a[0]-b[0])*Math.cos((a[1]+b[1])/2*Math.PI/180),a[1]-b[1])*111320;
let km=0;for(let i=1;i<ref.length;i++)km+=m(ref[i-1],ref[i])/1000;
const direct=m(ref[0],ref.at(-1))/1000;assert.ok(km/direct<1.6,'detour ratio '+(km/direct).toFixed(2));
assert.equal(new Set(ref.map(p=>p.join())).size,ref.length,'no repeated vertex');
const order=['大原','途中','花折峠','朽木市場','保坂','熊川','上中'].map(k=>{const P={大原:[135.832,35.118],途中:[135.854,35.156],花折峠:[135.860161,35.187257],朽木市場:[135.915,35.358],保坂:[135.938,35.427],熊川:[135.899,35.444],上中:[135.857,35.466]}[k];let bi=0;ref.forEach((p,i)=>{if(m(p,P)<m(ref[bi],P))bi=i;});assert.ok(m(ref[bi],P)<500,k);return bi;});
for(let i=1;i<order.length;i++)assert.ok(order[i]>order[i-1],'waypoints in order');
G.newGame('s1560','oda');const view=TK.roadDisplay(G.ROADS.find(r=>r.name==='若狭街道'));
assert.ok(view.modernReference);assert.ok(!view.referenceCleanup,'no excursion left to clean');assert.ok(view.evidence.sources.includes('wakasaMlit'));
const raw=TK.ROADS.find(r=>r[0]==='若狭街道')[1];assert.ok(raw.some(p=>m(p,[135.899,35.444])<300)&&raw.some(p=>m(p,[135.938,35.427])<300),'movement waypoints pass Hosaka and Kumagawa');
fs.writeFileSync('data/audits/wakasa-route-review.json',JSON.stringify({scope:input.scope,lengthKm:+km.toFixed(1),detourRatio:+(km/direct).toFixed(2),beforeVertices:before.points.length,afterVertices:ref.length,viaDistanceMetres:input.viaDistanceMetres},null,2));
console.log('PASS: Wakasa road single line',km.toFixed(1)+'km','ratio',(km/direct).toFixed(2),'vertices',before.points.length,'->',ref.length);
