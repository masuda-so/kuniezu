const assert=require('node:assert/strict');const {G,TK}=require('./history-focus.cjs').model();G.newGame('s1560','oda');
const e=Object.values(G.EDGES).find(e=>!e.sea&&G.routeCrossings(G.visualEdgeGeo(e.a,e.b)).some(x=>x>.05&&x<.95));assert.ok(e,'actual river intersections');
const a=e.a,b=e.b,line=G.visualEdgeGeo(a,b),p=G.visualEdgePoint(a,b,.5),oldA=G.YOSHO_AT[a],oldB=G.YOSHO_AT[b];
const active=G.yActive,owner=G.yOwner;let on=true,own='oda';G.yActive=()=>on;G.yOwner=()=>own;
const inn={n:'検査用の宿',kind:'宿',x:p[0],y:p[1]},bridge={...inn,n:'検査用の橋',kind:'橋'};G.YOSHO_AT[a]=[inn,inn];G.YOSHO_AT[b]=[];
const u={clan:'oda',food:10000,troops:5000,days:0,pos:.5};let r=G.yoshoEffects(u,a,b,e);assert.equal(r.speed,1.2);assert.equal(r.food,.7);assert.equal(r.rows.length,1,'same kind must not stack');on=false;r=G.yoshoEffects(u,a,b,e);assert.equal(r.speed,1);assert.equal(r.food,1,'inactive inn must not save supplies');on=true;G.YOSHO_AT[a]=[bridge];assert.equal(G.yoshoEffects(u,a,b,e).speed,1.15);assert.equal(G.yoshoEffects(u,a,b,{...e,river:0}).speed,1.15,'crossings come from displayed route, not stale edge flags');const visual=G.visualEdgeGeo;G.visualEdgeGeo=()=>[p,p];assert.equal(G.yoshoEffects({...u},a,b,e).speed,1,'bridge only affects a route that actually crosses water');G.visualEdgeGeo=visual;
const domain=G.S().castles[a].owner;own=domain;G.YOSHO_AT[a]=Array.from({length:9},(_,i)=>({...inn,n:'検査の支城'+i,kind:'城'}));assert.equal(G.branchDef(a),1.3,'supporting castle defense is capped');on=false;assert.equal(G.branchDef(a),1,'inactive supporting castles give no defense');on=true;own='__enemy';assert.equal(G.branchDef(a),1,'enemy-held supporting castles give no defense');G.yActive=active;G.yOwner=owner;G.YOSHO_AT[a]=oldA;G.YOSHO_AT[b]=oldB;
let last=0;for(let i=0;i<=1000;i++){const f=G.visualDistanceFraction(line,i/1000);assert.ok(f>=last-1e-9);last=f;}assert.equal(G.visualDistanceFraction(line,0),0);assert.ok(Math.abs(G.visualDistanceFraction(line,1)-1)<1e-9);
const xs=G.routeCrossings(line),x=xs.find(x=>x>.05&&x<.95);assert.ok(x!=null);let near=0,far=0,nd=0,fd=0;for(let i=1;i<10000;i++){const a=G.visualDistanceFraction(line,(i-1)/10000),b=G.visualDistanceFraction(line,i/10000);if(xs.some(x=>Math.abs(a-x)<.015)){near+=b-a;nd++;}else if(xs.every(x=>Math.abs(a-x)>.04)){far+=b-a;fd++;}}assert.ok(near/nd<far/fd,'moving visibly slower at the river than away from it');
assert.ok(TK.PERIOD_WATERS.reduce((n,w)=>n+w.rings.reduce((n,r)=>n+r.length,0),0)>800);assert.deepEqual(TK.periodWaters(1589),TK.periodWaters(1590),'no fabricated wholesale shoreline shift in 1590');
console.log('PASS active nearby inns/bridges, no duplicate stacking, inactive food correction, actual river crossing slowdown, monotonic endpoints, no abrupt 1590 drying');

// Compare the same historical march with and without logistics costs.
const event=TK.HIST.find(event=>event.title&&event.k!=='premarch');
const state=G.S(), originalTime=state.t, marchFactors=G.marchFactors;
function sampleHistoricalArrival(neutral){
 G.marchFactors=neutral?()=>({days:1}):marchFactors;
 const army={hist:true,mission:'show',until:event.title,depart:[1560,5,1],arrive:[1560,5,10],
  path:[a,b],troops:40000,food:0,marchDays:50};
 state.t=G.evT({d:army.arrive})-1;
 assert.ok(G.scheduleHistorical(army));
 assert.equal(army.state,'march');
 assert.ok(army.pos<1);
 state.t++;
 assert.ok(G.scheduleHistorical(army));
 return [army.schedule.end,army.seg,army.pos,army.state];
}
try {
 const arrival=sampleHistoricalArrival(false);
 assert.deepEqual(arrival,[state.t,0,1,'camp']);
 assert.deepEqual(sampleHistoricalArrival(true),arrival);
} finally {
 G.marchFactors=marchFactors;
 state.t=originalTime;
}
console.log('PASS historical arrival fixed with and without logistics costs');

// A long road and a short road crossing one river use the same display distance.
const crossingRoads=Object.values(G.EDGES).flatMap(edge=>{
 if(edge.sea)return [];
 const road=G.visualEdgeGeo(edge.a,edge.b), crossings=G.routeCrossings(road);
 return crossings.length===1&&crossings[0]>.1&&crossings[0]<.9
  ? [{road,crossing:crossings[0],length:G.visualPathLength(road)}] : [];
}).sort((left,right)=>left.length-right.length);
const short=crossingRoads.find(road=>road.length>8), long=crossingRoads.at(-1);
assert.ok(short&&long.length>short.length*2,'fixture needs two different route lengths');
function firstSlowPosition(road){
 let lower=0,upper=road.crossing;
 const step=1e-8;
 for(let i=0;i<35;i++){
  const time=(lower+upper)/2;
  const position=G.visualDistanceFraction(road.road,time);
  if(G.visualDistanceFraction(road.road,time+step)-position<step*.8)upper=time;
  else lower=time;
 }
 return G.visualDistanceFraction(road.road,upper);
}
for(const road of [short,long]){
 const radius=(road.crossing-firstSlowPosition(road))*road.length;
 assert.ok(Math.abs(radius*111.32/200-.3)<1e-5,'new games slow near the crossing');
}
delete state.riverPacingVersion;
for(const road of [short,long]){
 assert.ok(Math.abs(road.crossing-firstSlowPosition(road)-.025)<1e-6,'legacy games retain the old pacing');
}
console.log('PASS fixed crossing distance on roads of different lengths and legacy pacing');
