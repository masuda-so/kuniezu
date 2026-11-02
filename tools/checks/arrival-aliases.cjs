const assert=require('node:assert/strict'),{G,TK}=require('./history-focus.cjs').model();
const point=name=>G.battleArrivalPoint({until:'木崎原の戦い',commanders:[name],gens:[]}),expected=G.PJ(130.84,32.035);
for(const name of ['島津忠平','島津義弘'])assert.deepEqual(Array.from(point(name)),Array.from(expected));
for(const name of ['木下秀吉','羽柴秀吉','豊臣秀吉'])assert.deepEqual(Array.from(G.battleArrivalPoint({until:'山崎の戦い',commanders:[name],gens:[]})),Array.from(G.PJ(135.68,34.893)));
assert.equal(G.battleArrivalPoint({until:'山崎の戦い',commanders:['羽柴秀勝'],gens:[]}),null,'unknown identity must not acquire a position');
G.newGame('s1570','shimazu');G.auditVisualMoves=true;const title='木崎原の戦い',end=G.evT({d:TK.BATTLES[title].eventDate});
for(;G.S().t<end-1;G.day())for(const q of ['evQ','sceneQ','battleQ','propQ','prisonQ','observerQ'])G.S()[q]=[];
const u=G.S().units.find(u=>u.until===title&&u.gens.some(id=>G.gen(id)?.n==='島津忠平'));assert(u,'original-name army must exist');
G._visualSampleTime=end;try{const p=G.historyPoint(u);assert(Math.hypot(p[0]-expected[0],p[1]-expected[1])<1e-6,'the actual army reaches its alias-matched battle point');}finally{delete G._visualSampleTime;}
console.log('PASS: verified in-game aliases share battle targets; unknown identity stays unlocated; original-name Kizakibaru army arrives');
