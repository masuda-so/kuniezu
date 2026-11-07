const {legacyRoad,canonicalView,hasProjectedPoint}=require('./fixtures/road-inputs.cjs');
const fs=require('node:fs'),assert=require('node:assert/strict'),{G,TK}=require('./history-focus.cjs').model();
const input=JSON.parse(fs.readFileSync('data/inputs/hyuga-road-review/accepted-whole-reference.json'));
const old=JSON.parse(fs.readFileSync('data/inputs/hyuga-road-review/before-modern-reference.json'));
assert.deepEqual(legacyRoad('日向街道'),input.points);
assert.deepEqual(input.points[0],old.points[0]);assert.deepEqual(input.points.at(-1),old.points.at(-1));
assert.ok(input.joinMetres.every(d=>d<25));
const section=input.segments.find(s=>s.kind==='official-map-segment');assert.ok(section.last-section.first>500);
G.newGame('s1560','oda');
const road=TK.roadDisplay(G.ROADS.find(r=>r.name==='日向街道'));
canonicalView('日向街道',road,G.PJ);assert.ok(road.evidence.sources.includes('hyugaMikuniMap'));
assert.ok((road.referenceCleanup?.excursions||[]).every(c=>c.last<section.first||c.first>section.last),'source-map hairpins must not be removed as modern routing excursions');

for(const point of input.points.slice(section.first,section.last+1))assert.ok(hasProjectedPoint(road.pts,G.PJ(...point)),'every adopted source-map point remains in the displayed line');
const distances=[];
for(const i of [section.first,Math.floor((section.first+section.last)/2),section.last]){
 const p=G.PJ(...input.points[i]);
 const display=Math.min(...road.pts.map(q=>Math.hypot(p[0]-q[0],p[1]-q[1])));
 assert.ok(display<.002,'official-map segment remains in the drawn road');
 const network=Math.min(...G.DISPLAY_RNET.filter(n=>n.roads.has('日向街道')).map(n=>Math.hypot(p[0]-n.x,p[1]-n.y)));
 assert.ok(network<.3,'movement graph uses the same source-map road, rather than the old coastal corridor');
 distances.push({index:i,displayUnits:display,networkUnits:network});
}
fs.writeFileSync('data/audits/hyuga-mapped-route-review.json',JSON.stringify({scope:input.scope,joinMetres:input.joinMetres,distances},null,2));
console.log('PASS: official Mikuni-map segment is in both the drawn road and movement graph; outer endpoints and short joins retained');
