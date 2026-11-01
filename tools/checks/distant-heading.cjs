const assert=require('node:assert/strict'),{G}=require('./history-focus.cjs').model();
const line=Array.from({length:1001},(_,i)=>[i*.1,Math.sin(i*.7)*.3]);
const variation=a=>a.slice(1).reduce((n,v,i)=>n+Math.abs(Math.atan2(Math.sin(v-a[i]),Math.cos(v-a[i]))),0);
const samples=Array.from({length:160},(_,i)=>G.visualPathPoint(line,.2+i*.003));
const raw=samples.map(p=>p[2]),far=samples.map(p=>G.visualCounterHeading(line,p,.4)),near=samples.map(p=>G.visualCounterHeading(line,p,20));
assert.ok(variation(far)<variation(raw)*.1);assert.ok(variation(near)>variation(far));
for(const p of samples){const before=[...p];assert.equal(G.visualCounterHeading(line,p,.4),G.visualCounterHeading(line,p,.4));assert.deepEqual(Array.from(p),before);}
assert.equal(G.visualCounterHeading([[0,0],[0,100]],[0,50,Math.PI/2],.4),Math.PI/2);
assert.equal(G.visualCounterHeading([[0,0],[0,0]],[0,0,null],.4),null);
assert.equal(G.visualCounterHeading([[100,0],[0,0]],[50,0,Math.PI],.4),Math.PI);
console.log(JSON.stringify({pass:true,rawVariation:variation(raw),distantVariation:variation(far),nearVariation:variation(near),positionsUnchanged:true}));
