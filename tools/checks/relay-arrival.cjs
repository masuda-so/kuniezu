const assert=require('node:assert/strict'),{G}=require('./history-focus.cjs').model();
const queues=['evQ','sceneQ','battleQ','propQ','prisonQ','observerQ'],clear=()=>{for(const q of queues)G.S()[q]=[];},army=()=>G.S().units.find(u=>u.gens.some(id=>G.gen(id)?.n==='羽柴秀吉'));
G.newGame('s1582','oda');let migrated=false,arrived=false,previous=G.personPoint(G.genByName('羽柴秀吉')),maxDailyKm=0;
for(let day=0;day<40;day++){
 let u=army();
 if(!migrated&&u?.until==='山崎の戦い'&&G.S().t===u.schedule.start+2){
  assert.equal(u.histRet,1,'troop bookkeeping flag is intentionally retained');assert(!G.isHistoryReturning(u));assert.equal(G.marchPhase(u).key,'march');
  const old=JSON.parse(JSON.stringify(G.S()));old.movementGeometryVersion=20;old.visualFraction=.63;const v=old.units.find(v=>v.id===u.id),last=G.C[v.path.at(-1)];
  v.visualTravel.line=[v.visualTravel.line[0],[last.x,last.y]];v.visualTravel.end=v.schedule.end-1;v._visualRouteKey=v._visualRouteKey.replace('|out|','|return|');
  const expected=G.visualPathPoint(v.visualTravel.line,(old.t+old.visualFraction-v.visualTravel.start)/(v.visualTravel.end-v.visualTravel.start)),before={t:old.t,troops:v.troops,castles:JSON.stringify(old.castles),clans:JSON.stringify(old.clans)};
  G.setS(old);assert.equal(old.movementGeometryVersion,22);assert.equal(old.t,before.t);assert.equal(v.troops,before.troops);assert.equal(JSON.stringify(old.castles),before.castles);assert.equal(JSON.stringify(old.clans),before.clans);
  G._visualSampleTime=old.t+old.visualFraction;const point=G.historyPoint(v);delete G._visualSampleTime;assert(Math.hypot(point[0]-expected[0],point[1]-expected[1])<1e-6,'old relay save stays at current position');assert.equal(v.visualTravel.end,v.schedule.end);assert(!G.isHistoryReturning(v));previous=G.personPoint(G.genByName('羽柴秀吉'));migrated=true;u=v;
 }
 if(u?.until==='山崎の戦い'&&G.S().t===u.schedule.end-1){G._visualSampleTime=u.schedule.end;const point=G.historyPoint(u),target=G.battleArrivalPoint(u);assert(Math.hypot(point[0]-target[0],point[1]-target[1])<1e-6,'arrive at Yamazaki, not the management castle');delete G._visualSampleTime;arrived=true;}
 G.day();clear();const point=G.personPoint(G.genByName('羽柴秀吉'));maxDailyKm=Math.max(maxDailyKm,Math.hypot(point[0]-previous[0],point[1]-previous[1])*111.32/200);previous=point;
}
assert(migrated&&arrived);assert(maxDailyKm<75);assert(G.isHistoryReturning({histRet:1,mission:'show',until:null,state:'march'}));assert(!G.isHistoryReturning({histRet:1,mission:'show',until:'#hold',state:'camp'}));
console.log(JSON.stringify({pass:true,relayArrival:'山崎の戦い',legacyVersion:22,legacyPositionPreserved:true,maxDailyKm}));
