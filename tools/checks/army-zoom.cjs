/* 拡大で集約を解き、同地点の座標を動かさない。HTTPサーバー不要。 */
const assert=require('node:assert/strict'),{cluster}=require('../../game/battle-layout.js');
const source=[{id:'a',x:0,y:0},{id:'b',x:28,y:2},{id:'c',x:58,y:5}];
function projected(z){return source.map(p=>({...p,x:200+p.x*z,y:200+p.y*z}));}
const low=cluster(projected(1),{zoom:1}),high=cluster(projected(4),{zoom:4});
assert.equal(low.visible.length,1);assert.equal(low.visible[0].members.length,3);
assert.equal(high.visible.length,3);assert.ok(high.visible.every(p=>p.members.length===1));
const overlap=[{id:'a',x:200,y:200},{id:'b',x:200,y:200},{id:'c',x:200,y:200}],original=JSON.stringify(overlap);
const same=cluster(overlap,{zoom:8});assert.equal(JSON.stringify(overlap),original);assert.equal(same.visible.length,1);assert.equal(same.visible[0].members.length,3);
const medium=[{id:'a',x:200,y:200},{id:'b',x:275,y:200}];assert.equal(cluster(medium,{zoom:1}).visible.length,1);assert.equal(cluster(medium,{zoom:2.5}).visible.length,2);
const off=cluster([{id:'out',x:-50,y:200},...overlap],{zoom:8});assert.equal(off.outside.left.length,1);assert.equal(off.visible[0].members.length,3);
console.log('PASS: zoom separates nearby armies, detail thresholds shrink, exact overlaps keep position and IDs, offscreen army preserved');
