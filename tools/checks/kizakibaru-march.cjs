const assert=require('node:assert/strict'),{G,TK}=require('./history-focus.cjs').model();
G.newGame('s1570','shimazu');G.auditVisualMoves=true;
const title='木崎原の戦い',end=G.evT({d:TK.lunarDate(1572,5,4)}),clear=()=>{for(const q of ['evQ','sceneQ','battleQ','propQ','prisonQ','observerQ'])G.S()[q]=[];};
for(;G.S().t<end;G.day()){
 clear();assert.ok(!G.S().units.some(u=>u.until===title),'no invented Uchi-Koyama-Obi sortie');
 if(G.S().t===end-1){
  const commander=G.genByName('島津忠平');
  G._visualSampleTime=end;
  try{assert.deepEqual(Array.from(G.personPoint(commander).slice(0,2)),Array.from(G.PJ(130.867591,32.054126)));}
  finally{delete G._visualSampleTime;}
 }
}
clear();const u=G.documentedArmies().find(u=>u.record?.id==='kizakibaru-local');assert(u);assert.deepEqual(Array.from(u.commanders),['島津忠平']);
const origin=G.PJ(130.867591,32.054126),field=G.PJ(130.83012518518,32.041051361571),line=G.historyGeometry(u);
assert(line.length>=150);assert.deepEqual(Array.from(G.historyPoint(u).slice(0,2)),Array.from(origin));
let previous=G.historyPoint(u);for(let f=.02;f<1;f+=.02){G._visualSampleTime=end+f;const p=G.historyPoint(u);assert(Math.hypot(p[0]-previous[0],p[1]-previous[1])*111.32/200<.5,'continuous local road motion');previous=p;}
G._visualSampleTime=end+.8;assert.equal(G.marchPhase(u).key,'camp');assert(Math.hypot(G.historyPoint(u)[0]-field[0],G.historyPoint(u)[1]-field[1])<1e-6);delete G._visualSampleTime;
const km=G.visualPathLength(line)*111.32/200;assert(km>4&&km<7);assert(Math.max(...line.slice(1).map((b,i)=>Math.hypot(b[0]-line[i][0],b[1]-line[i][1])*111.32/200))<.5,'no 15km terminal connector');
const scene=TK.BATTLES[title],move=TK.BATTLE_MOVEMENTS[title][0];assert.equal(move.estimated,true);assert.deepEqual(Array.from(G.battlePhasePoint(scene,'島津義弘',0,field)),[130.867591,32.054126]);assert.deepEqual(Array.from(G.battlePhasePoint(scene,'島津義弘',25,field)),[130.83012518518,32.041051361571]);
for(let i=0;i<4;i++){G.day();clear();}assert.ok(!G.documentedArmies().some(u=>u.record?.id==='kizakibaru-local'));const g=G.genByName('島津忠平'),p=G.personPoint(g);assert(Math.hypot(p[0]-origin[0],p[1]-origin[1])<1e-6,'return to Iino base, not Uchi');
// Legacy bad sortie is removed once without changing date, territories, resources or troops.
const saved=JSON.parse(JSON.stringify(G.S()));delete saved.kizakibaruDisplayVersion;saved.sites=[{n:'木崎原',y:1572,x:0,y2:0}];const gen=saved.gens.find(g=>g.n==='島津忠平');saved.units.push({id:99999,hist:true,until:title,historyTitle:title,mission:'show',gens:[gen.id],path:['uchi','kouyama','obi'],seg:0,pos:.3,state:'march',clan:'shimazu',troops:300});gen.unit=99999;const before=JSON.stringify({t:saved.t,castles:saved.castles,clans:saved.clans});G.setS(saved);assert(!G.S().units.some(u=>u.id===99999));assert.equal(G.gen(gen.id).unit,null);assert.equal(JSON.stringify({t:saved.t,castles:saved.castles,clans:saved.clans}),before);assert.equal(saved.kizakibaruDisplayVersion,1);assert.equal(saved.sites[0].x,field[0]);assert.equal(saved.sites[0].y2,field[1]);
console.log('PASS: no distant fake sortie; same-day Iino road motion and battle approach; local return; legacy troop/resource/date preservation');
