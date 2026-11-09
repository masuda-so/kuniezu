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
const controls=create({project,Path});
const owned=feature('precise',[outer,hole],{drawRole:'control',key:'castle:bmatsuyama',validFrom:[1560,1,1],validUntil:[1584,1,1]});
controls.replace([{type:'FeatureCollection',features:[owned]}]);
assert.equal(controls.controlAt(...project(130.5,30.5),[1560,1,1]),'castle:bmatsuyama');
assert.equal(controls.controlAt(...project(132,32),[1560,1,1]),null,'control hole remains unassigned');
assert.equal(controls.controlAt(...project(130.5,30.5),[1584,1,1]),null,'control end is exclusive');
const painted=[],controlContext={fillStyle:'',fill(p,rule){painted.push({style:this.fillStyle,rule,ops:p.ops});}};
assert.equal(controls.paintControl(controlContext,[1560,1,1],[259,-69,269,-59],key=>{assert.equal(key,'castle:bmatsuyama');return [100,150,200,128];}),1);
assert.equal(painted[0].style,'rgba(100,150,200,0.5019607843137255)');
assert.equal(painted[0].ops.filter(o=>o[0]==='Z').length,2);
assert.equal(controls.paintControl(controlContext,[1584,1,1],[259,-69,269,-59],()=>[0,0,0,255]),0);
assert.throws(()=>controls.replace([{type:'FeatureCollection',features:[feature('invalid',[outer],{drawRole:'control'})]}]),/control key/);
assert.equal(controls.controlAt(...project(130.5,30.5),[1560,1,1]),'castle:bmatsuyama','invalid control is not partially promoted');
console.log('PASS: shared control geometry paints/picks the same keyed surface, holes and period; missing key rejected atomically');

assert.equal(controls.path('control',[1560,1,1],undefined,()=>false).ops.length,0,'unknown color key does not remove original ownership');
assert.ok(controls.path('control',[1560,1,1],undefined,key=>key==='castle:bmatsuyama').ops.length>0);
