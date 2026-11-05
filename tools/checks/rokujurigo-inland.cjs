const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{G,TK}=require('./history-focus.cjs').model(),r=JSON.parse(fs.readFileSync(path.join(__dirname,'../../data/inputs/rokujurigo-review/inland-registration-accepted.json'))),road=TK.roadDisplay(G.ROADS.find(r=>r.name==='六十里越街道'));
assert.equal(r.status,'accepted-inland-sheet');assert.ok(r.control.residualPixels<r.control.readTolerancePixels);assert.equal(r.inlandRuns[0].length,395);
const expected=r.inlandRuns[0].map(p=>G.PJ(...p));let index=-1;for(const p of expected){index=road.pts.findIndex((q,i)=>i>index&&Math.hypot(q[0]-p[0],q[1]-p[1])<1e-7);assert.ok(index>=0,'source vertex retained in order');}
assert.ok(road.evidence.sources.includes('rokujurigoInlandMap'));assert.deepEqual(Array.from(road.pts[0]),Array.from(G.PJ(139.83,38.73)));assert.deepEqual(Array.from(road.pts.at(-1)),Array.from(G.PJ(140.33,38.25)));
const shonai=JSON.parse(fs.readFileSync(path.join(__dirname,'../../data/inputs/rokujurigo-review/shonai-registration-accepted.json')));assert.ok(shonai.independent.residualPixels<shonai.independent.tolerancePixels);assert.ok(!shonai.controls.some(c=>c.name===shonai.independent.name));assert.equal(shonai.vertices,353);for(const run of shonai.runs)for(const p of run){const q=G.PJ(...p);assert.ok(road.pts.some(v=>Math.hypot(v[0]-q[0],v[1]-q[1])<1e-7),'Shonai source point retained');}
const rounded=new Set(road.pts.map(p=>p.map(x=>x.toFixed(7)).join(',')));assert.equal(rounded.size,road.pts.length,'no repeated-vertex excursion');
const {seam}=JSON.parse(fs.readFileSync(path.join(__dirname,'../../data/inputs/rokujurigo-review/composite-road-review.json')));
assert.equal(road.sections.length,2);
assert.deepEqual(road.sections.flat(),road.pts,'only drawing continuity is changed');
assert.deepEqual(road.sections[0].at(-1),G.PJ(...seam.from));
assert.deepEqual(road.sections[1][0],G.PJ(...seam.to));
console.log(JSON.stringify({pass:true,vertices:road.pts.length,sourceVertices:395,independentPixels:r.control.residualPixels,shonaiVertices:353,remaining:'図間・図の遮蔽部分は概略接続を含む'}));
