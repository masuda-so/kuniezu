'use strict';
/* 比較線4閉路だけを除き、全接続と旧保存の連続時刻を検査する。 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {model,prepareRoads}=require('./history-focus.cjs'),root=path.resolve(__dirname,'../..'),plain=x=>JSON.parse(JSON.stringify(x)),sha=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const file=path.join(root,'kuniezu/map/physical/roads-reference.geojson'),collection=JSON.parse(fs.readFileSync(file)),old=plain(collection),record=JSON.parse(fs.readFileSync(path.join(root,'data/inputs/road-adoptions/aizu-reference-loops-2026-11-09.json')));
assert.equal(record.roadEdits.length,2);assert.equal(record.roadEdits.reduce((n,e)=>n+e.removals.length,0),4);
for(const e of record.roadEdits){
 const f=collection.features.find(f=>f.id===e.roadId),before=old.features.find(f=>f.id===e.roadId),pts=f.geometry.coordinates;
 assert.equal(sha(pts),e.afterGeographicSha256);assert.equal(pts.length,e.afterVertices);
 for(const r of e.removals){assert.equal(pts.filter(p=>JSON.stringify(p)===JSON.stringify(r.junction)).length,1,'closed excursion no longer drawn');before.geometry.coordinates.splice(r.keepIndex+1,0,...r.removedCoordinates);}
 assert.equal(sha(before.geometry.coordinates),e.beforeGeographicSha256);assert.equal(before.geometry.coordinates.length,e.beforeVertices);
 const edges=new Set(before.geometry.coordinates.slice(1).map((p,i)=>JSON.stringify([before.geometry.coordinates[i],p])));
 for(let i=1;i<pts.length;i++)assert(edges.has(JSON.stringify([pts[i-1],pts[i]])),'no new connector');
 assert.deepEqual(pts[0],before.geometry.coordinates[0]);assert.deepEqual(pts.at(-1),before.geometry.coordinates.at(-1));
 assert.equal(f.properties.geometryBasis,'modern-comparison');assert.equal(f.properties.historyVerificationUnchanged,true);
}
const {G}=model(),changes=new Map(record.changedRoutes.map(r=>[r.a+'>'+r.b,r]));
assert.equal(record.routeCount,319);assert.equal(Object.keys(G.EDGES).length,record.routeCount);assert.equal(changes.size,10);
for(const b of record.beforeRoutes){const points=plain(G.visualEdgeGeo(b.a,b.b)),change=changes.get(b.a+'>'+b.b);assert.deepEqual(points[0],b.first);assert.deepEqual(points.at(-1),b.last);assert.equal(sha(points),change?change.afterSha256:b.sha256,'only recorded routes change');if(change){assert.equal(change.beforeSha256,b.sha256);assert.equal(points.length,change.afterVertices);}}
// 旧点列上の合成保存。史実の新しい移動・所属・着陣日を作らない。
const legacy=model();prepareRoads(legacy,()=>JSON.stringify(old));legacy.G.build();
const line=plain(legacy.G.visualEdgeGeo('yonezawa','kurokawa'));
G.newGame('s1560','oda');const saved=plain(G.S());saved.movementGeometryVersion=25;saved.visualFraction=.75;
const [commander,person]=saved.gens.filter(g=>!g.dead&&g.unit==null&&!G.documentedPerson(g.n));assert(commander&&person);
const start=saved.t+.5,end=saved.t+1,sample=saved.t+.75,expected=plain(G.visualPathPoint(line,.5)).slice(0,2);
const army={id:999999,clan:commander.clan,gens:[commander.id],troops:4321,path:['yonezawa','kurokawa'],state:'return',hist:true,histRet:true,seg:0,pos:.5,visualTravel:{line:plain(line),start,end}};
commander.unit=army.id;saved.units.push(army);person.loc='yonezawa';person.tr={p:['yonezawa','kurokawa'],line:plain(line),t0:start,t1:end};
const unchanged=()=>JSON.stringify({t:saved.t,fraction:saved.visualFraction,castles:saved.castles,clans:saved.clans,people:saved.gens.map(g=>({id:g.id,loc:g.loc,clan:g.clan,unit:g.unit})),forces:saved.units.map(u=>({id:u.id,path:u.path,troops:u.troops}))}),snapshot=unchanged();
G.setS(saved);assert.equal(saved.movementGeometryVersion,26);assert.equal(unchanged(),snapshot);
for(const q of [{line:army.visualTravel.line,start:army.visualTravel.start,end:army.visualTravel.end},{line:person.tr.line,start:person.tr.t0,end:person.tr.t1}]){assert.equal(q.start,sample);assert.equal(q.end,end);assert(Math.hypot(q.line[0][0]-expected[0],q.line[0][1]-expected[1])<1e-8,'saved fractional position does not jump');assert.deepEqual(plain(q.line.at(-1)),line.at(-1));}
for(const fraction of [0,.5,.999999,1,1.1]){G._visualSampleTime=sample+fraction*(end-sample);const a=plain(G.historyPoint(army)).slice(0,2),p=plain(G.personPoint(person)).slice(0,2);assert(Math.hypot(a[0]-p[0],a[1]-p[1])<1e-8);if(fraction===0)assert(Math.hypot(a[0]-expected[0],a[1]-expected[1])<1e-8);if(fraction>=1)assert.deepEqual(a,line.at(-1));}
delete G._visualSampleTime;const rebuilt=person.tr.line;G.setS(saved);assert.equal(person.tr.line,rebuilt,'migration happens once');
console.log('PASS: four reversible excursions, 319 routes / 10 changed, no new edges; v25 sub-day army/person save migrates once to v26 without position/deadline changes');
