/* 採用した没日、前後日の生存、直前版が作った保存の限定移行。 */
const assert=require('node:assert/strict');
const {G,TK}=require('./history-focus.cjs').model();
const cases=[
 {name:'長野業正',scenario:'s1560',previous:[1561,8,1],date:[1561,8,2],lunar:[1561,6,21]},
 {name:'蜂須賀正勝',scenario:'s1585',previous:[1586,7,1],date:[1586,7,8],lunar:[1586,5,22]},
 {name:'斎藤義龍',scenario:'s1560',previous:[1561,6,20],date:[1561,6,23],lunar:[1561,5,11]}
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
 const oldTime=legacy.t,message=event(row.name).text||'';
 if(message)assert.equal(legacy.log.filter(e=>e.t===oldTime&&e.msg===message).length,1);
 const unrelatedLog={t:oldTime,msg:'保存移行で保持する別の記録',kind:'big',pl:false};legacy.log.push(unrelatedLog);
 dates(false);G._ff={};G.newGame(row.scenario,'oda');G.S().player='__none';G.fixHist();
 advance(G.evT({d:row.previous}));assert.equal(G.S().gens.find(g=>g.n===row.name).dead,false);
 const unrelated=clone(legacy);unrelated.hsig=42;G.repairVerifiedDeathDates(unrelated);
 assert.equal(unrelated.gens.find(g=>g.n===row.name).dead,true,'unknown history is not rewritten');
 const alreadyDue=clone(legacy);alreadyDue.t=G.evT(event(row.name));G.repairVerifiedDeathDates(alreadyDue);
 assert.equal(alreadyDue.gens.find(g=>g.n===row.name).dead,true,'due death is not undone');
 const before=resources(legacy);G.setS(legacy);G.fixHist();
 const person=legacy.gens.find(g=>g.n===row.name);assert.equal(person.dead,false);
 if(message)assert.equal(legacy.log.filter(e=>e.t===oldTime&&e.msg===message).length,0);
 assert.ok(legacy.log.some(e=>e.msg===unrelatedLog.msg),'unrelated same-day log preserved');
 if(row.name==='長野業正')assert.equal(legacy.clans[person.clan].leader,person.id);
 assert.equal(resources(legacy),before,'date, treasury, castles and armies preserved');
 const repaired=JSON.stringify(legacy);G.setS(legacy);G.fixHist();
 assert.equal(JSON.stringify(legacy),repaired,'loading twice is idempotent');
 advance(G.evT(event(row.name)));assert.equal(person.dead,true,'death occurs on adopted day');
 if(message)assert.equal(legacy.log.filter(e=>e.msg===message).length,1,'one corrected death log');
 if(row.name==='長野業正')assert.equal(G.gen(legacy.clans[person.clan].leader).n,'長野業盛');
 console.log('PASS: '+row.name+' adopted date, legacy save and succession');
}

// 前便の二人は訂正済み、今回の義龍だけ旧日付という実際の直前版を再現する。
const yoshitatsu=cases.find(r=>r.name==='斎藤義龍');
dates(false);event(yoshitatsu.name).d=yoshitatsu.previous.slice();sort();
G._ff={};G.newGame('s1560','oda');G.S().player='__none';G.fixHist();
const snapshots=[];
for(const day of [20,21,22]){
 advance(G.evT({d:[1561,6,day]}));const saved=clone(G.S());
 assert.equal(saved.gens.find(g=>g.n===yoshitatsu.name).dead,true);
 // 既存の移行済み印だけを直前版の値に戻す。死亡状態は旧日付の実進行で生成する。
 saved.verifiedDeathDateRepair=1;snapshots.push(saved);
}
const saveDir=process.env.VERIFIED_DEATH_SAVE_OUTPUT;
const writeSave=(name,s)=>{if(!saveDir)return;const fs=require('node:fs'),path=require('node:path');fs.mkdirSync(saveDir,{recursive:true});fs.writeFileSync(path.join(saveDir,name+'.json'),JSON.stringify(s)+'\n');};
for(const saved of snapshots)writeSave(G.date(saved.t).d+'-legacy',saved);
advance(G.evT({d:[1561,6,23]}));const due=clone(G.S());due.verifiedDeathDateRepair=1;writeSave('23-legacy',due);
dates(false);G._ff={};G.newGame('s1560','oda');G.S().player='__none';G.fixHist();
advance(G.evT({d:[1561,6,22]}));writeSave('22-current',G.S());
for(const saved of snapshots){
 const before=resources(saved),count=saved.hOk;
 G.setS(saved);G.fixHist();
 const person=saved.gens.find(g=>g.n===yoshitatsu.name);
 assert.equal(person.dead,false,'revision 1 state revives only before adopted death');
 assert.equal(saved.clans[person.clan].leader,person.id,'義龍の家督を復元');
 assert.equal(saved.verifiedDeathDateRepair,2);
 assert.equal(saved.hOk,count,'untitled death never changes the titled-event success count');
 assert.equal(resources(saved),before,'date, castles, armies and treasury preserved');
 const once=JSON.stringify(saved);G.fixHist();assert.equal(JSON.stringify(saved),once);
 advance(G.evT(event(yoshitatsu.name)));
 assert.equal(person.dead,true);assert.equal(saved.clans[person.clan].leader,G.S().gens.find(g=>g.n==='斎藤龍興').id);
 assert.equal(saved.log.filter(e=>e.msg===(event(yoshitatsu.name).text||'')).length,1);
}
console.log('PASS: revision 1 saves on all three days, chronology counts and succession');
