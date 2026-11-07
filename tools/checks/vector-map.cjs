'use strict';
const assert=require('node:assert/strict'),{create}=require('../../kuniezu/static/kuniezu/vector-map.js');
class Path{constructor(){this.ops=[];}moveTo(...p){this.ops.push(['M',...p]);}lineTo(...p){this.ops.push(['L',...p]);}closePath(){this.ops.push(['Z']);}addPath(p){this.ops.push(...p.ops);}}
const project=(x,y)=>[x*2,-y*2],map=create({project,Path});let changes=0;map.onChange(()=>changes++);
const feature=(id,coordinates,properties={})=>({type:'Feature',id,properties:{drawRole:'land',...properties},geometry:{type:'Polygon',coordinates}});
const outer=[[130,30],[134,30],[134,34],[130,34],[130,30]],hole=[[131,31],[131,33],[133,33],[133,31],[131,31]];
const input={type:'FeatureCollection',features:[feature('land',[outer,hole]),feature('late',[[[136,32],[137,32],[137,33],[136,33],[136,32]]],{validFrom:[1584,1,1],validUntil:[1616,1,1]})]},before=JSON.stringify(input);
assert.equal(map.replace([input]),2);assert.equal(changes,1);assert.equal(map.stats().paths,0);assert.equal(map.contains(...project(130.5,30.5),[1560,1,1]),true);assert.equal(map.contains(...project(132,32),[1560,1,1]),false);assert.equal(map.contains(...project(136.5,32.5),[1583,12,31]),false);assert.equal(map.contains(...project(136.5,32.5),[1584,1,1]),true);assert.equal(map.contains(...project(136.5,32.5),[1616,1,1]),false);
const fills=[],ctx={fill(p,rule){fills.push({p,rule});},stroke(){throw Error('land must fill');}};
assert.equal(map.draw(ctx,'land',[1560,1,1],[259,-69,269,-59]),1);assert.equal(fills[0].rule,'nonzero');assert.deepEqual(fills[0].p.ops[0],['M',260,-60]);assert.equal(fills[0].p.ops.filter(o=>o[0]==='Z').length,2);assert.equal(map.draw(ctx,'land',[1560,1,1],[100,0,110,10]),0);assert.equal(map.stats().paths,1);
assert.throws(()=>map.replace([{type:'FeatureCollection',features:[feature('bad',[[[999,0],[0,0],[0,1],[999,0]]])]}]));assert.equal(changes,1);assert.equal(map.stats().features,2);assert.equal(JSON.stringify(input),before);


const allBefore=map.path('land',[1560,1,1]);assert.equal(map.path('land',[1561,2,3]),allBefore,'same period reuses the combined clip path across days');assert.notEqual(map.path('land',[1584,1,1]),allBefore,'period boundary gets its own clip');
assert.throws(()=>map.path('land',undefined),/map date/);assert.equal(map.path('land',[1562,1,1]),allBefore);
assert.equal(map.epoch([1560,1,1]),map.epoch([1561,1,1]));assert.notEqual(map.epoch([1560,1,1]),map.epoch([1584,1,1]));
console.log('PASS: holes, projection, dates, culling, unchanged source and atomic failure; combined clip reused across days');
