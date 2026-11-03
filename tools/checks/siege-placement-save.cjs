const assert=require('node:assert/strict');
const {G,TK}=require('./history-focus.cjs').model();
function advance(end){
 while(G.S().t<end){
  G.day();
  for(const k of ['evQ','sceneQ','battleQ','propQ','observerQ'])G.S()[k]=[];
 }
}
function verify(title,legacyCastle,previouslyMigratedHasedo){
 G.newGame('s1600','tokugawa');
 const event=TK.HIST.find(e=>e.title===title);
 const end=G.evT(event);
 advance(end-2);
 const s=JSON.parse(JSON.stringify(G.S()));
 delete s.siegePlacementVersion;
 if(previouslyMigratedHasedo)s.hasedoApproachVersion=1;
 s.visualFraction=.42;
 const u=s.units.find(u=>u.until===title);
 assert.ok(u?.visualTravel);
 const castle=G.C[legacyCastle];
 u.visualTravel.line=[u.visualTravel.line[0],[castle.x,castle.y]];
 const sample=s.t+s.visualFraction;
 const expected=G.visualPathPoint(u.visualTravel.line,(sample-u.visualTravel.start)/(u.visualTravel.end-u.visualTravel.start));
 const unchanged=JSON.stringify([s.t,s.castles,s.clans,u.troops,u.schedule.end]);
 G.setS(s);
 assert.equal(s.siegePlacementVersion,2);
 assert.equal(JSON.stringify([s.t,s.castles,s.clans,u.troops,u.schedule.end]),unchanged);
 G._visualSampleTime=sample;
 const point=G.historyPoint(u);
 assert.ok(Math.hypot(point[0]-expected[0],point[1]-expected[1])<1e-6);
 const target=G.battleArrivalPoint(u);
 assert.deepEqual([...u.visualTravel.line.at(-1)],[...target]);
 const once=JSON.stringify(u.visualTravel);
 G.setS(s);
 assert.equal(JSON.stringify(u.visualTravel),once);
 delete G._visualSampleTime;

 advance(end+1);
 const siege=JSON.parse(JSON.stringify(G.S()));
 delete siege.siegePlacementVersion;
 const camp=siege.units.find(unit=>unit.until==='#hold'&&unit.historyTitle===title);
 assert.ok(camp?.visualTravel);
 camp.visualTravel.line=[camp.visualTravel.line[0],[castle.x,castle.y]];
 const release=camp.releaseAt;
 G.setS(siege);
 assert.deepEqual([...G.historyPoint(camp).slice(0,2)],[...target]);
 assert.equal(camp.releaseAt,release);
}
verify('長谷堂城の戦い','yamagata',false);
verify('大津城の戦い','kannonji',true);
console.log('PASS: existing Hasedo and Otsu marches retain their saved positions and reach the corrected camps');
