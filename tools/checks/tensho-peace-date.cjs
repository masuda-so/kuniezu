/* 和睦成立日と既知旧保存の外交を限定修復する。 */
const assert=require('node:assert/strict');
const model=require('./history-focus.cjs').model;
const old=model(),next=model(),clone=x=>JSON.parse(JSON.stringify(x));
const oldChange=old.TK.TENSHO_PEACE_DATE_CHANGE;
const oldNote=old.TK.HIST.find(e=>e.title==='徳川と北条の和睦');
oldNote.d=oldChange.previousNote.slice();oldNote.text=oldChange.previousText;
old.TK.HIST.find(e=>e.title==='天正壬午の和睦').d=oldChange.previousAlly.slice();
old.TK.ALLIANCE_HISTORY.find(r=>r.name==='天正壬午の和睦').from=oldChange.previousAlly.slice();
old.TK.HIST.sort((a,b)=>a.d[0]-b.d[0]||a.d[1]-b.d[1]||a.d[2]-b.d[2]);
const e=next.TK.HIST.find(e=>e.title==='天正壬午の和睦');assert.equal(e.d.join('/'),'1582/11/24');assert.equal(next.TK.HIST.find(e=>e.title==='徳川と北条の和睦').d.join('/'),'1582/11/24');assert.equal(next.TK.ALLIANCE_HISTORY.find(r=>r.name==='天正壬午の和睦').from.join('/'),'1582/11/24');
const {G}=old;G.newGame('s1582','oda');G.S().player='__none';G.fixHist();
const end=G.evT({d:[1582,11,24]}),key=G.ekey('tokugawa','hojo'),snap={};
while(G.S().t<end){G.day();for(const k of ['evQ','sceneQ','battleQ','propQ'])G.S()[k]=[];if([13,14,23,24].includes(G.date().d)&&G.date().m===11)snap[G.date().d]=clone(G.S());}
if(process.env.TENSHO_SAVE_OUTPUT){const fs=require('node:fs'),path=require('node:path');fs.mkdirSync(process.env.TENSHO_SAVE_OUTPUT,{recursive:true});for(const day of [13,14,23,24])fs.writeFileSync(path.join(process.env.TENSHO_SAVE_OUTPUT,day+'-legacy.json'),JSON.stringify(snap[day]));}
const stable=s=>JSON.stringify({t:s.t,units:s.units,castles:s.castles,gens:s.gens,clans:s.clans,war:s.war});
for(const day of [13,14,23]){const s=clone(snap[day]),before=stable(s),count=s.hOk;next.G.setS(s);assert.equal(stable(s),before);assert.ok(!s.ally[key]);assert.equal(s.chron.some(r=>r.title.includes('和睦')&&r.t>=G.evT({d:[1582,11,13]})),false);assert.equal(s.hOk,count-(day===13?1:2));const once=JSON.stringify(s);next.G.setS(s);assert.equal(JSON.stringify(s),once);next.G.fixHist();while(next.G.S().t<end){next.G.day();for(const k of ['evQ','sceneQ','battleQ','propQ'])next.G.S()[k]=[];}assert.equal(s.ally[key],1e9);assert.equal(s.chron.filter(r=>r.title==='天正壬午の和睦').length,1);}
for(const mutate of [s=>s.hsig=123,s=>s.chron=[],s=>delete s.war[key],s=>s.rel[key]=80]){const s=clone(snap[14]);mutate(s);const ally=s.ally[key],rel=s.rel[key];next.G.setS(s);assert.equal(s.ally[key],ally);assert.equal(s.rel[key],rel);assert.equal(s.tenshoPeaceDateRepair,undefined);}
const after=clone(snap[24]);next.G.setS(after);assert.equal(after.ally[key],1e9);assert.equal(after.tenshoPeaceDateRepair,undefined);
console.log('PASS: current model, date synchronization, real legacy progress 3 windows, replay, idempotence, unknown provenance guards, unrelated state preservation');
console.log('NOTE: rel uses existing historical-war cap15, not an assertion that lost pre-ally numeric relation was15. Post11/24 historical records remain unchanged.');
// 没日訂正前＋和睦訂正前という組合せも認識し、既存没日移行を壊さない。
for(const r of old.TK.VERIFIED_DEATH_DATE_CHANGES)old.TK.HIST.find(e=>e.k==='death'&&e.n===r.name).d=r.previousDate.slice();
old.TK.HIST.sort((a,b)=>a.d[0]-b.d[0]||a.d[1]-b.d[1]||a.d[2]-b.d[2]);
const mixed=clone(snap[14]);mixed.hsig=old.G.histSig();next.G.setS(mixed);assert.ok(!mixed.ally[key]);
old.G._ff={};old.G.newGame('s1560','oda');old.G.S().player='__none';old.G.fixHist();const deathDay=old.G.evT({d:[1561,8,1]});while(old.G.S().t<deathDay){old.G.day();for(const k of ['evQ','sceneQ','battleQ','propQ'])old.G.S()[k]=[];}
const legacyDeath=clone(old.G.S());assert.equal(legacyDeath.gens.find(g=>g.n==='長野業正').dead,true);next.G.setS(legacyDeath);assert.equal(legacyDeath.gens.find(g=>g.n==='長野業正').dead,false);next.G.fixHist();next.G.day();assert.equal(legacyDeath.gens.find(g=>g.n==='長野業正').dead,true);
console.log('PASS: death-old + peace-old combined signature; real legacy Nagano save restores then dies on corrected day');
for(const mutate of [s=>delete s.ally[key],s=>s.hFail=[{title:'天正壬午の和睦'}],s=>{s.chron.find(e=>e.title==='天正壬午の和睦').ok=false;s.hFail=[{title:'天正壬午の和睦'}];}]){const s=clone(snap[14]);mutate(s);const before=JSON.stringify(s);next.G.repairTenshoPeaceDate(s);assert.equal(JSON.stringify(s),before);}
next.TK.ALLIANCE_HISTORY.push({a:'tokugawa',b:'hojo',name:'別の有効な盟約（検査fixture）',from:[1582,11,1],to:[1583,1,1]});const other=clone(snap[14]),beforeOther=JSON.stringify(other);next.G.repairTenshoPeaceDate(other);assert.equal(JSON.stringify(other),beforeOther);next.TK.ALLIANCE_HISTORY.pop();
console.log('PASS: no ally, failed ally and other valid pact remain byte-equivalent');
