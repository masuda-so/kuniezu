'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),zlib=require('node:zlib');
const {model}=require('./history-focus.cjs'),root=path.resolve(__dirname,'../..'),plain=x=>JSON.parse(JSON.stringify(x)),sha=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex'),bytesha=x=>crypto.createHash('sha256').update(x).digest('hex');
const collection=JSON.parse(fs.readFileSync(path.join(root,'kuniezu/map/physical/roads-reference.geojson'))),record=JSON.parse(fs.readFileSync(path.join(root,'data/inputs/road-adoptions/ushu-edo-comparison-2026-11-09.json'))),before=plain(collection),feature=collection.features.find(f=>f.id===record.roadId),oldFeature=before.features.find(f=>f.id===record.roadId);
const archive=fs.readFileSync(path.join(root,record.source.file)),sourceBytes=zlib.gunzipSync(archive),source=JSON.parse(sourceBytes).features[record.source.featureIndex];
assert.equal(bytesha(archive),record.source.archiveSha256);assert.equal(bytesha(sourceBytes),record.source.sha256);assert.equal(source.properties.numbering,record.source.featureNumber);
assert.equal(record.splices.length,1);
for(const s of [...record.splices].reverse()){
 assert.deepEqual(s.insertedCoordinates,source.geometry.coordinates.slice(record.source.verticesZeroBasedInclusive[0],record.source.verticesZeroBasedInclusive[1]+1));
 assert.deepEqual(feature.geometry.coordinates.slice(s.keepIndex+1,s.keepIndex+1+s.insertedCoordinates.length),s.insertedCoordinates);
 oldFeature.geometry.coordinates.splice(s.keepIndex+1,s.insertedCoordinates.length,...s.removedCoordinates);
}
oldFeature.properties=plain(record.beforeProperties);
assert.equal(sha(before),record.beforeCollectionSha256,'the complete collection reverses to the preserved original');
assert.equal(sha(feature.geometry.coordinates),record.afterGeographicSha256);assert.equal(sha(oldFeature.geometry.coordinates),record.beforeGeographicSha256);
assert.equal(feature.geometry.coordinates.length,record.afterVertices);assert.equal(oldFeature.geometry.coordinates.length,record.beforeVertices);
assert.deepEqual(feature.geometry.coordinates[0],oldFeature.geometry.coordinates[0]);assert.deepEqual(feature.geometry.coordinates.at(-1),oldFeature.geometry.coordinates.at(-1));
assert.equal(feature.properties.historyVerificationUnchanged,true);assert.equal(record.historicalVerificationChanged,false);
const {G}=model({canonicalRoads:collection}),changes=new Map(record.changedRoutes.map(r=>[r.a+'>'+r.b,r]));
assert.equal(record.routeCount,319);assert.equal(Object.keys(G.EDGES).length,319);assert.equal(changes.size,2);
for(const b of record.beforeRoutes){const points=plain(G.visualEdgeGeo(b.a,b.b)),change=changes.get(b.a+'>'+b.b);assert.deepEqual(points[0],b.first);assert.deepEqual(points.at(-1),b.last);assert.equal(sha(points),change?change.afterSha256:b.sha256);if(change){assert.equal(change.beforeSha256,b.sha256);assert.equal(points.length,change.afterVertices);}}
// 旧点列上の合成保存。史実の新しい移動・所属・着陣日を作らない。
const legacy=model({canonicalRoads:before});
const line=plain(legacy.G.visualEdgeGeo('hiyama','ishikawa'));
G.newGame('s1560','oda');const saved=plain(G.S());saved.movementGeometryVersion=26;saved.visualFraction=.75;
const [commander,person]=saved.gens.filter(g=>!g.dead&&g.unit==null&&!G.documentedPerson(g.n));assert(commander&&person);
const start=saved.t+.5,end=saved.t+1,sample=saved.t+.75,expected=plain(G.visualPathPoint(line,.5)).slice(0,2);
const army={id:999999,clan:commander.clan,gens:[commander.id],troops:4321,path:['hiyama','ishikawa'],state:'return',hist:true,histRet:true,seg:0,pos:.5,visualTravel:{line:plain(line),start,end}};
commander.unit=army.id;saved.units.push(army);person.loc='hiyama';person.tr={p:['hiyama','ishikawa'],line:plain(line),t0:start,t1:end};
const unchanged=()=>JSON.stringify({t:saved.t,fraction:saved.visualFraction,castles:saved.castles,clans:saved.clans,people:saved.gens.map(g=>({id:g.id,loc:g.loc,clan:g.clan,unit:g.unit})),forces:saved.units.map(u=>({id:u.id,path:u.path,troops:u.troops}))}),snapshot=unchanged();
G.setS(saved);assert.equal(saved.movementGeometryVersion,27);assert.equal(unchanged(),snapshot);
for(const q of [{line:army.visualTravel.line,start:army.visualTravel.start,end:army.visualTravel.end},{line:person.tr.line,start:person.tr.t0,end:person.tr.t1}]){assert.equal(q.start,sample);assert.equal(q.end,end);assert(Math.hypot(q.line[0][0]-expected[0],q.line[0][1]-expected[1])<1e-8,'saved fractional position does not jump');assert.deepEqual(plain(q.line.at(-1)),line.at(-1));}
for(const fraction of [0,.5,.999999,1,1.1]){G._visualSampleTime=sample+fraction*(end-sample);const a=plain(G.historyPoint(army)).slice(0,2),p=plain(G.personPoint(person)).slice(0,2);assert(Math.hypot(a[0]-p[0],a[1]-p[1])<1e-8);if(fraction===0)assert(Math.hypot(a[0]-expected[0],a[1]-expected[1])<1e-8);if(fraction>=1)assert.deepEqual(a,line.at(-1));}
delete G._visualSampleTime;const rebuilt=person.tr.line;G.setS(saved);assert.equal(person.tr.line,rebuilt,'migration happens once');
console.log('PASS: CODH R201 exact comparison vertices; 319 routes / 2 changed; v26 sub-day army/person save migrates once to v27 without position/deadline changes');
