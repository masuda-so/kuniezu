const assert=require('node:assert/strict'),{G}=require('./history-focus.cjs').model();
const same=(a,b,message)=>assert(Math.hypot(a[0]-b[0],a[1]-b[1])<1e-6,message);
for(const geometryVersion of [22,23,24,25])for(const phase of ['outbound','return','waiting']){
 G.newGame('s1560','oda');const old=JSON.parse(JSON.stringify(G.S()));old.movementGeometryVersion=geometryVersion;old.visualFraction=.37;const u=old.units.find(u=>u.clan==='imagawa'),a=G.C[u.path[0]],b=G.C[u.path.at(-1)];
 const start=old.t+(phase==='waiting'?3:-2),end=old.t+9;u.schedule.start=start;u.schedule.end=end;u.visualTravel={line:[[a.x,a.y],[a.x+4,a.y+3],[b.x,b.y]],start,end};
 if(phase==='return'){u.until=null;u.histRet=1;u.mission='return';u.path.reverse();}
 const sample=old.t+old.visualFraction,expected=G.visualPathPoint(u.visualTravel.line,(sample-start)/(end-start)),before={t:old.t,troops:u.troops,castles:JSON.stringify(old.castles)};
 const savedLine=u.visualTravel.line;
 G.setS(old);assert.notEqual(u.visualTravel.line,savedLine,'old route is rebuilt');G._visualSampleTime=sample;try{same(G.historyPoint(u),expected,'saved '+phase+' position');}finally{delete G._visualSampleTime;}
 assert.equal(old.movementGeometryVersion,26);assert.equal(old.t,before.t);assert.equal(u.troops,before.troops);assert.equal(JSON.stringify(old.castles),before.castles);assert.equal(u.visualTravel.end,end);assert.equal(u.visualTravel.start,phase==='waiting'?start:sample);
 const rebuilt=u.visualTravel.line;G.setS(old);assert.equal(u.visualTravel.line,rebuilt,'updated route remains stable on repeated load');
}
G.newGame('s1560','oda');const old=JSON.parse(JSON.stringify(G.S()));old.movementGeometryVersion=23;old.visualFraction=.63;const g=old.gens.find(g=>!g.dead&&g.unit==null&&!G.documentedPerson(g.n)),c=G.C[g.loc];assert(c);g.tr={p:[g.loc,g.loc],line:[[c.x-2,c.y-2],[c.x+2,c.y+2]],t0:old.t-2,t1:old.t+4};
const expected=G.visualPathPoint(g.tr.line,(2+.63)/6);G.setS(old);G._visualSampleTime=old.t+.63;try{same(G.personPoint(g),expected,'unaccompanied person keeps saved position');}finally{delete G._visualSampleTime;}
console.log('PASS: outgoing, returning, waiting armies and unaccompanied people retain saved fractional positions and deadlines');
