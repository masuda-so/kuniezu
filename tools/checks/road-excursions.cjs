const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),clean=require('../geo/reference-excursions.cjs'),{G,TK,TKRoadSource}=require('./history-focus.cjs').model();
const root=path.resolve(__dirname,'../..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8')),equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
for(const points of [[[130,35],[130.01,35],[130.02,35],[130.01,35],[130.03,35]],[[130,35],[130.001,35],[130.002,35],[130.001,35],[130.003,35]]]){const before=JSON.stringify(points),fixed=clean(points);assert.equal(JSON.stringify(points),before);assert.equal(fixed.points.length,3);assert.equal(fixed.excursions.length,1);}
for(const cycle of [[[130,35],[130.01,35],[130.01,35.01],[130,35.01],[130,35],[130.02,35]],[[130,35],[130.001,35],[130.001,35.001],[130,35.001],[130,35],[130.002,35]]])assert.equal(clean(cycle).points.length,cycle.length,'genuine circuits retained');
const sourceFile=path.join(root,'kuniezu/map/physical/roads-reference.geojson'),sourceBefore=fs.readFileSync(sourceFile),legacy=read('data/inputs/road-vector-migration/legacy-comparison-lines.json'),rawBefore=JSON.stringify(G.ROADS),reviews=read('data/inputs/road-excursion-reviews.json').reviews,rows=[];
for(const r of G.ROADS){const feature=TKRoadSource.feature(r.name),view=TK.roadDisplay(r),adoption=feature.properties.migrationAdoption,c=adoption.referenceCleanup;
 assert.equal(JSON.stringify(view.referenceCleanup||null),JSON.stringify(c||null),'reader preserves recorded adoption: '+r.name);
 if(view.modernReference){const original=legacy[r.name];assert.ok(original,'retained comparison source: '+r.name);const before=JSON.stringify(original),fixed=clean(original,reviews.filter(q=>q.road===r.name));assert.equal(JSON.stringify(original),before,'legacy source immutable');
 // Tokaido's accepted Hakone ridge substitution follows cleanup; full final shape is checked by the migration baseline suite.
 if(r.name!=='東海道'){assert.equal(fixed.points.length,view.pts.length,'canonical comparison vertex count: '+r.name);for(let i=0;i<fixed.points.length;i++){const q=G.PJ(...fixed.points[i]);assert.ok(Math.hypot(q[0]-view.pts[i][0],q[1]-view.pts[i][1])<1e-8,'canonical comparison ordered vertex: '+r.name);}}
 for(const [a,b] of [[original[0],view.pts[0]],[original.at(-1),view.pts.at(-1)]]){const q=G.PJ(...a);assert.ok(Math.hypot(q[0]-b[0],q[1]-b[1])<1e-8,'comparison endpoints: '+r.name);}
assert.equal(JSON.stringify(c?.excursions||[]),JSON.stringify(fixed.excursions),'adopted cut metadata: '+r.name);assert.equal(c?.removedVertices||0,fixed.removedVertices);}
 if(c){assert.ok(view.modernReference);assert.equal(c.kind,'removed-reference-excursions');assert.ok(c.removedVertices>0);for(const e of c.excursions){assert.ok(e.returnRatio>=.999||e.reviewed);if(e.reviewed)assert.ok(reviews.some(q=>q.road===r.name&&equal(q.junction,e.junction)&&e.lengthKm>=q.lengthRange[0]&&e.lengthKm<=q.lengthRange[1]),'recorded cut has explicit adoption: '+r.name);}}
 rows.push({name:r.name,modernReference:!!view.modernReference,removedVertices:c?.removedVertices||0,excursions:c?.excursions||[]});assert.equal(TK.roadDisplay(r),view);
}
for(const [name,junction] of [['東山道',[137.814665,35.908807]],['白河街道',[140.06797,37.38636]],['石見路',[133.023579,35.12505]],['土佐東街道',[134.285063,33.547629]]])assert.ok(rows.find(r=>r.name===name).excursions.some(e=>e.reviewed&&equal(e.junction,junction)));
// Earlier Hyuga cuts remain reproducible from their retained before-input, not rerun at runtime.
const hyugaBefore=read('data/inputs/hyuga-road-review/before-modern-reference.json').points;assert.equal(clean(hyugaBefore,reviews.filter(r=>r.road==='日向街道')).excursions.filter(e=>e.reviewed).length,3);
// Sanshu was subsequently replaced by an explicitly accepted whole-line input.
assert.equal(read('data/inputs/sanshu-road-review/adoption.json').accepted,true);
assert.equal(JSON.stringify(G.ROADS),rawBefore);assert.ok(fs.readFileSync(sourceFile).equals(sourceBefore),'canonical source immutable');
const summary={roads:rows.length,correctedRoads:rows.filter(r=>r.removedVertices).length,excursions:rows.reduce((n,r)=>n+r.excursions.length,0),removedKm:rows.flatMap(r=>r.excursions).reduce((n,e)=>n+e.lengthKm,0)};
if(process.env.GAME_TEST_OUTPUT){const output=path.resolve(process.env.GAME_TEST_OUTPUT);fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'road-excursions-review.json'),JSON.stringify({scope:'Canonical adoption metadata and retained legacy decision fixtures; not proof of all historic branches.',summary,rows},null,2)+'\n');}
console.log('PASS: canonical excursion metadata matches retained adoption; legacy exact-return/circuit fixtures stay offline',summary);
