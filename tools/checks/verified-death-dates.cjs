/* 採用した没日、前後日の生存、直前版が作った保存の限定移行。 */
const assert=require('node:assert/strict');
const {G,TK}=require('./history-focus.cjs').model();
const cases=[
 {name:'長野業正',scenario:'s1560',previous:[1561,8,1],date:[1561,8,2],lunar:[1561,6,21]},
 {name:'蜂須賀正勝',scenario:'s1585',previous:[1586,7,1],date:[1586,7,8],lunar:[1586,5,22]}
];
const event=name=>TK.HIST.find(e=>e.k==='death'&&e.n===name);
const sort=()=>TK.HIST.sort((a,b)=>a.d[0]-b.d[0]||a.d[1]-b.d[1]||a.d[2]-b.d[2]);
const dates=legacy=>{for(const row of cases)event(row.name).d=(legacy?row.previous:row.date).slice();sort();};
const clear=()=>{for(const key of ['evQ','sceneQ','battleQ','observerQ','propQ'])G.S()[key]=[];};
const advance=end=>{while(G.S().t<end){G.day();clear();}};
const clone=value=>JSON.parse(JSON.stringify(value));
const resources=s=>JSON.stringify({t:s.t,units:s.units,castles:s.castles,money:Object.entries(s.clans).map(([k,c])=>[k,c.gold,c.food])});
for(const row of cases){
 assert.deepEqual(Array.from(event(row.name).d),row.date);
 assert.deepEqual(Array.from(event(row.name).lunarDate),row.lunar);
 // 旧日付の実進行から保存を作る。手でdeadを立てた状態を移行根拠にしない。
 dates(true);G._ff={};G.newGame(row.scenario,'oda');G.S().player='__none';G.fixHist();
 advance(G.evT({d:row.previous}));const legacy=clone(G.S());
 assert.equal(legacy.gens.find(g=>g.n===row.name).dead,true);
 dates(false);G._ff={};G.newGame(row.scenario,'oda');G.S().player='__none';G.fixHist();
 advance(G.evT({d:row.previous}));assert.equal(G.S().gens.find(g=>g.n===row.name).dead,false);
 const unrelated=clone(legacy);unrelated.hsig=42;G.repairVerifiedDeathDates(unrelated);
 assert.equal(unrelated.gens.find(g=>g.n===row.name).dead,true,'unknown history is not rewritten');
 const alreadyDue=clone(legacy);alreadyDue.t=G.evT(event(row.name));G.repairVerifiedDeathDates(alreadyDue);
 assert.equal(alreadyDue.gens.find(g=>g.n===row.name).dead,true,'due death is not undone');
 const before=resources(legacy);G.setS(legacy);G.fixHist();
 const person=legacy.gens.find(g=>g.n===row.name);assert.equal(person.dead,false);
 if(row.name==='長野業正')assert.equal(legacy.clans[person.clan].leader,person.id);
 assert.equal(resources(legacy),before,'date, treasury, castles and armies preserved');
 const repaired=JSON.stringify(legacy);G.setS(legacy);G.fixHist();
 assert.equal(JSON.stringify(legacy),repaired,'loading twice is idempotent');
 advance(G.evT(event(row.name)));assert.equal(person.dead,true,'death occurs on adopted day');
 if(row.name==='長野業正')assert.equal(G.gen(legacy.clans[person.clan].leader).n,'長野業盛');
 console.log('PASS: '+row.name+' adopted date, legacy save and succession');
}
