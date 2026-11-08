const {legacyRoad,canonicalView}=require('./fixtures/road-inputs.cjs');
// 義州大路・関北路：比較線が両端を保ち、往復の頂点を含まず、経由地から5km以内を通り、直線のまま残す区間が記録どおりであることを確かめる。
const fs=require('node:fs'),assert=require('node:assert/strict'),{G,TK}=require('./history-focus.cjs').model();
const acc=JSON.parse(fs.readFileSync('data/inputs/korea-road-review/accepted-reference.json','utf8'));
const seg=(P,A,B)=>{const cx=Math.cos(P[1]*Math.PI/180),dx=(B[0]-A[0])*cx,dy=B[1]-A[1],px=(P[0]-A[0])*cx,py=P[1]-A[1],L=dx*dx+dy*dy,t=L?Math.max(0,Math.min(1,(px*dx+py*dy)/L)):0;return Math.hypot(px-t*dx,py-t*dy)*111320};
const m=(a,b)=>Math.hypot((a[0]-b[0])*Math.cos((a[1]+b[1])/2*Math.PI/180),a[1]-b[1])*111320;
G.newGame('s1560','oda');const out={};
for(const n of ['義州大路','関北路']){const ref=legacyRoad(n).map(p=>Array.from(p)),wp=TK.ROADS.find(r=>r[0]===n)[1];
 assert.deepEqual(ref[0],Array.from(wp[0]));assert.deepEqual(ref.at(-1),Array.from(wp.at(-1)));
 assert.equal(new Set(ref.map(p=>p.join())).size,ref.length,n+' repeated vertex');
 const far=wp.map(p=>{let b=1e9;for(let i=1;i<ref.length;i++)b=Math.min(b,seg(p,ref[i-1],ref[i]));return b;});assert.ok(Math.max(...far)<5000,n+' waypoint '+Math.max(...far).toFixed(0)+'m');
 let km=0,wkm=0;for(let i=1;i<ref.length;i++)km+=m(ref[i-1],ref[i])/1000;for(let i=1;i<wp.length;i++)wkm+=m(wp[i-1],wp[i])/1000;assert.ok(km/wkm<1.45,n+' ratio');
 assert.ok(acc.report[n].straightLegs.every(g=>g.km<30),n+' long straight leg');
 const v=TK.roadDisplay(G.ROADS.find(r=>r.name===n));const feature=canonicalView(n,v,G.PJ);assert.equal(feature.properties.strategyScope,'outside-japan-strategy-map','retained as context, not a Korean strategy map');assert.ok(v.modernReference);assert.ok(v.evidence.sources.includes('koreaRoadComparison'));
 out[n]={points:ref.length,km:+km.toFixed(1),waypointKm:+wkm.toFixed(1),maxWaypointMetres:Math.round(Math.max(...far)),straightLegs:acc.report[n].straightLegs.length};}
assert.ok(TK.ROAD_EVIDENCE['義州大路'].sources.includes('krUiju1488'),'1488 itinerary kept');
fs.writeFileSync('data/audits/korea-roads-review.json',JSON.stringify({scope:acc.scope,roads:out},null,2));console.log('PASS: Korean roads',JSON.stringify(out));
