'use strict';
/* 採用済み比較線の巡回だけを除き、新辺なし・保存途中位置を検査する。 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),plain=x=>JSON.parse(JSON.stringify(x));
const collection=JSON.parse(fs.readFileSync(path.join(root,'kuniezu/map/physical/roads-reference.geojson'))),record=JSON.parse(fs.readFileSync(path.join(root,'data/inputs/road-adoptions/tosando-reference-loop-2026-11-09.json')));
const feature=collection.features.find(f=>f.id===record.roadId),pts=feature.geometry.coordinates,old=plain(pts);old.splice(record.keepIndex+1,0,...record.removedCoordinates);
assert.deepEqual(old[record.keepIndex],old[record.keepIndex+record.removedCoordinates.length]);
assert.deepEqual(pts.slice(0,record.keepIndex+1),old.slice(0,record.keepIndex+1));assert.deepEqual(pts.slice(record.keepIndex+1),old.slice(record.keepIndex+record.removedCoordinates.length+1));
const edges=new Set(old.slice(1).map((p,i)=>JSON.stringify([old[i],p])));for(let i=1;i<pts.length;i++)assert(edges.has(JSON.stringify([pts[i-1],pts[i]])),'no new straight connector');
assert.equal(feature.properties.geometryBasis,'modern-comparison');assert.deepEqual(feature.properties.geometrySources,['modernRoadReference']);
const {G,TK,TKRoadSource}=require('./history-focus.cjs').model(),road=G.ROADS.find(r=>r.name===record.roadName);assert.equal(TK.roadDisplay(road).pts,TKRoadSource.view(road,G.PJ).pts,'same drawing/movement reader');
// 合成保存fixture：実在軍の史実行程を新しく設定せず、旧点列上の単独移動を検査する。
G.newGame('s1560','oda');const saved=plain(G.S());saved.movementGeometryVersion=24;saved.visualFraction=.37;
const person=saved.gens.find(g=>!g.dead&&g.unit==null&&!G.documentedPerson(g.n)),line=old.slice(3990,4170).map(p=>plain(G.PJ(...p)));assert(person);
person.tr={p:[person.loc,person.loc],line,t0:saved.t-3,t1:saved.t+6};const time=saved.t+saved.visualFraction,expected=G.visualPathPoint(line,(time-person.tr.t0)/(person.tr.t1-person.tr.t0)),end=person.tr.t1,endPoint=line.at(-1);
const untouched=JSON.stringify({t:saved.t,fraction:saved.visualFraction,castles:saved.castles,clans:saved.clans,units:saved.units.map(u=>({id:u.id,troops:u.troops,schedule:u.schedule})),people:saved.gens.map(g=>({id:g.id,n:g.n,clan:g.clan,loc:g.loc,dead:g.dead,unit:g.unit}))});
G.setS(saved);assert.equal(saved.movementGeometryVersion,25);assert.equal(person.tr.t1,end);assert.deepEqual(plain(person.tr.line.at(-1)),endPoint);assert.equal(person.tr.t0,time);assert(Math.hypot(person.tr.line[0][0]-expected[0],person.tr.line[0][1]-expected[1])<1e-8,'no warp at saved fraction');
assert.equal(JSON.stringify({t:saved.t,fraction:saved.visualFraction,castles:saved.castles,clans:saved.clans,units:saved.units.map(u=>({id:u.id,troops:u.troops,schedule:u.schedule})),people:saved.gens.map(g=>({id:g.id,n:g.n,clan:g.clan,loc:g.loc,dead:g.dead,unit:g.unit}))}),untouched,'time, forces, resources, ownership and identity unchanged');
const rebuilt=person.tr.line;G.setS(saved);assert.equal(person.tr.line,rebuilt,'one-time route repair');
console.log('PASS: Tosando removal creates no edge, keeps reader identity and old v24 fractional position, destination and arrival date');
