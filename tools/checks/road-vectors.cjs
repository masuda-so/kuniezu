'use strict';
/* 移行前の採用形状・経路網と、編集GeoJSONを読む実際の共通入口を比較する。 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),file=path.join(root,'kuniezu/map/physical/roads-reference.geojson'),bytes=fs.readFileSync(file),collection=JSON.parse(bytes);
const report=JSON.parse(fs.readFileSync(path.join(root,'data/inputs/road-vector-migration/migration-report.json'))),sha=b=>crypto.createHash('sha256').update(b).digest('hex'),plain=x=>JSON.parse(JSON.stringify(x));
const adoption=JSON.parse(fs.readFileSync(path.join(root,'data/inputs/road-adoptions/tosando-reference-loop-2026-11-09.json')));
const {G,TK,TKRoadSource}=require('./history-focus.cjs').model(),features=new Map(collection.features.map(f=>[f.properties.name,f]));
assert.equal(features.size,report.roads);assert.equal(features.size,G.ROADS.length);assert.equal(TK.MODERN_ROAD_REFERENCE,undefined,'legacy comparison payload is not executed');assert.equal(TK.cleanReferenceExcursions,undefined,'no runtime repair');
assert.equal(collection.features.reduce((n,f)=>n+f.geometry.coordinates.length,0),report.vertices-adoption.removedCoordinates.length);
assert.equal(collection.features.filter(f=>f.properties.strategyScope==='japan-strategy-map').length,report.strategyJapan);
const baseline=new Map(report.roadBaselines.map(r=>[r.name,r])),rawBefore=JSON.stringify(G.ROADS);
for(const raw of G.ROADS){
 const f=features.get(raw.name),b=baseline.get(raw.name);assert(f&&b);assert.equal(f.id,b.id);const edited=f.id===adoption.roadId;
 assert.equal(f.geometry.coordinates.length,edited?adoption.afterVertices:b.vertices);
 assert.equal(sha(JSON.stringify(f.geometry.coordinates)),edited?adoption.afterGeographicSha256:b.geographicSha256,'adopted vertex sequence: '+raw.name);
 if(edited){const restored=plain(f.geometry.coordinates);restored.splice(adoption.keepIndex+1,0,...adoption.removedCoordinates);assert.equal(sha(JSON.stringify(restored)),b.geographicSha256,'recorded removal reconstructs immutable migration baseline');assert.equal(adoption.beforeGeographicSha256,b.geographicSha256);}
 const view=TK.roadDisplay(raw);assert.equal(view,TK.roadDisplay(raw));assert.equal(view.pts,TKRoadSource.view(raw,G.PJ).pts,'drawing and march share the same points');assert.equal(view.canonicalId,f.id);
 assert.equal(view.pts.length,f.geometry.coordinates.length);for(let i=0;i<view.pts.length;i++)assert.deepEqual(plain(view.pts[i]),plain(G.PJ(...f.geometry.coordinates[i])),'project only; no line correction');
 for(const id of f.properties.geometrySources)assert(TK.RESEARCH_SOURCES[id],'retained source ID: '+id);
}
assert.equal(JSON.stringify(G.ROADS),rawBefore);
const graphSha=sha(JSON.stringify(G.DISPLAY_RNET.map(n=>({x:Math.round(n.x*1e9)/1e9,y:Math.round(n.y*1e9)/1e9,e:n.e.map(([j,d,k])=>[j,Math.round(d*1e9)/1e9,k]),roads:[...n.roads]}))));
assert.equal(G.DISPLAY_RNET.length,adoption.afterGraph.nodes);assert.equal(graphSha,adoption.afterGraph.sha,'adopted display graph at 1e-9 units');
let routePoints=0;
for(const old of report.routeBaselines){
 const current=G.visualEdgeGeo(old.a,old.b);assert.equal(current.length,old.vertices);routePoints+=current.length;
 for(let i=0;i<current.length;i++)assert(Math.hypot(current[i][0]-old.points[i][0],current[i][1]-old.points[i][1])<1e-8,'route vertex preserved');
 for(const [i,fraction]of [0,.25,.5,.75,1].entries()){const p=G.visualEdgePoint(old.a,old.b,fraction),q=old.samples[i];assert(Math.hypot(p[0]-q[0],p[1]-q[1])<1e-8,'same fractional clock');}
}
G.newGame('s1560','oda');assert.equal(G.S().movementGeometryVersion,25,'edited geometry rebuilds old saved routes');
assert(fs.readFileSync(path.join(root,'kuniezu/static/kuniezu/ui.js'),'utf8').includes('TKRoadSource.isStrategyRoad(road.name)'),'strategy map uses Japan scope');
const html=fs.readFileSync(path.join(root,'kuniezu/templates/index.html'),'utf8');assert(!html.includes('src="modern-road-reference.js'));assert(fs.readFileSync(file).equals(bytes),'validation never rewrites canonical data');
console.log('PASS: '+features.size+' canonical roads, '+(report.vertices-adoption.removedCoordinates.length)+' vertices, graph '+G.DISPLAY_RNET.length+' nodes, '+routePoints+' route points and saved geometry version 25; no runtime cleanup');

require('./tosando-reference-loop.cjs');
