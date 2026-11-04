/* 限定回帰。全シナリオや1582年までの日送りは実行しない。 */
'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const model=process.env.KIYOSU_MODEL?require(process.env.KIYOSU_MODEL):require('./history-focus.cjs').model;
const {G,TK}=model();G.newGame('s1560','oda');const s=G.S();
s.y0=1582;s.m0=7;s.t=14;s.hi=TK.HIST.length;s.units=[];s.pendMoves=[];s.pendAppear=[];s.waitAp=[];
for(const g of s.gens){g.unit=null;g.tr=null;}
for(const id of ['kiyosu','gifu','kannonji','kiriyama','ueno','kyo','kishiwada','yakami','nochiseyama','ishiyama','ichijodani','oyama','odani'])s.castles[id].owner='oda';
for(const name of ['織田信雄','織田信孝','柴田勝家','丹羽長秀','池田恒興'])G.mkGen(name+'|60|60|60|60|1550','oda','kiyosu');
s.clans.oda.cap='kiyosu';s.clans.oda.leader=G.genByName('織田信雄').id;
const meeting=TK.HIST.find(e=>e.title==='清洲会議'),heir=TK.HIST.find(e=>e.title==='三法師を支える織田宗家');
assert.equal(TK.HIST.filter(e=>e.title===heir.title).length,1);
assert.deepEqual(Array.from(heir.d),Array.from(meeting.d));
assert.ok(TK.HIST.indexOf(meeting)<TK.HIST.indexOf(heir));
assert.equal(G.genByName('織田秀信'),null);
const rows=[];
for(const d of [16,17,18,19]){
 s.t=G.evT({d:[1582,7,d]});
 for(const e of TK.HIST.filter(e=>e.d[0]===1582&&e.d[1]===7&&e.d[2]===d&&e.k!=='premarch'))G.applyEv(e);
 G.hist();const g=G.genByName('織田秀信');
 assert.equal(s.clans.oda.leader,g.id,'宗家当主は三法師');assert.equal(g.clan,'oda');assert.equal(g.loc,'gifu','行政移転で岐阜から飛ばさない');assert.equal(s.clans.oda.cap,'kannonji');assert.equal(G.documentedResidence(g).status,'custody');
 assert.ok(G.displayCastleGens('gifu').some(p=>p.id===g.id));assert.ok(!G.displayCastleGens('kannonji').some(p=>p.id===g.id));
 assert.ok(!G.castleGens('gifu').some(p=>p.id===g.id));assert.ok(!G.idleGens('gifu').some(p=>p.id===g.id));
 if(d>=17){assert.equal(G.gen(s.clans.nobukatsu.leader).n,'織田信雄');assert.equal(s.castles.gifu.owner,'nobutaka');}
 rows.push({date:[1582,7,d],person:g.n,clan:g.clan,at:g.loc,capital:s.clans.oda.cap,gifuOwner:s.castles.gifu.owner});
}
const g=G.genByName('織田秀信'),r=TK.DOCUMENTED_RESIDENCES[g.documentedResidence],id=g.documentedResidence;
// appear の一般的な「所有城へ」代替より、根拠のある他家での預かりが優先する。
g.loc='kannonji';G.applyEv(heir);assert.equal(g.loc,'gifu');
const administrative=()=>{s.pendingAdminExtinction={oda:'hashiba'};G.hist();};
administrative();assert.equal(g.loc,'gifu');
const saved=JSON.stringify(s);G.setS(JSON.parse(saved));assert.equal(G.genByName(g.n).documentedResidence,id);assert.equal(G.genByName(g.n).loc,'gifu');
// 以後は現在の保存状態を参照する（setS 後の古いオブジェクトを使わない）。
const cases=[];
function probe(label,edit,expected){const state=JSON.parse(saved);G.setS(state);const h=G.genByName('織田秀信');edit(state,h);state.pendingAdminExtinction={oda:'hashiba'};G.hist();assert.equal(h.loc,expected,label);cases.push(label);}
probe('記録欠落は行政保護の対象外（表示移行前の対照）',(_,h)=>delete h.documentedResidence,'kannonji');
probe('未知の記録IDは例外にならない',(_,h)=>h.documentedResidence='missing','kannonji');
const source=TK.RESEARCH_SOURCES[r.sourceId];delete TK.RESEARCH_SOURCES[r.sourceId];probe('出典なしは例外にならない',()=>{},'kannonji');TK.RESEARCH_SOURCES[r.sourceId]=source;
const claim=r.claim;delete r.claim;probe('命題なしは例外にならない',()=>{},'kannonji');r.claim=claim;
const until=r.until;r.until=r.from.slice();probe('逆転・空期間は例外にならない',()=>{},'kannonji');r.until=until;
probe('期間前は例外にならない',(state)=>state.t=G.evT({d:r.from})-1,'kannonji');
probe('終了当日以降は例外にならない',(state)=>state.t=G.evT({d:r.until}),'kannonji');
probe('別の家の分岐も史実例外の対象外',(state)=>state.div.tokugawa=1,'kannonji');
const historyOnly=TK.HISTORY_ONLY;TK.HISTORY_ONLY=false;probe('自由進行では例外にならない',()=>{},'kannonji');TK.HISTORY_ONLY=historyOnly;
probe('別の武将へ記録を付けても例外にならない',(_,h)=>h.n='架空の人物','kannonji');
// 預かり終了は索引の境界だけ。新たな行軍・安土到着イベントは作らない。
G.setS(JSON.parse(saved));const post=G.S(),p=G.genByName('織田秀信');post.t=G.evT({d:r.until});
const info=G.documentedResidence(p);assert.equal(info.status,'unknown');assert.equal(info.at,null);assert.equal(info.arrivalDate,null);assert.equal(p.loc,'gifu');
G.hist();assert.equal(p.loc,'gifu');assert.ok(p.tr==null);assert.equal(post.units.some(u=>u.gens.includes(p.id)),false);
assert.equal(TK.HIST.some(e=>e.d.every((v,i)=>v===r.until[i])&&e.k==='move'&&e.n===p.n),false);
// 未確認時の古い補間も、行政loc変化からの新しい補間も表示しない。
p._visualPoint=[G.C.gifu.x,G.C.gifu.y];p.ll='gifu';p.tr={p:['gifu','kannonji'],line:[[G.C.gifu.x,G.C.gifu.y],[G.C.kannonji.x,G.C.kannonji.y]],t0:post.t,t1:post.t+3};
assert.equal(G.personPoint(p),null);assert.equal(G.inTransit(p),false);post.pendingAdminExtinction={oda:'hashiba'};G.hist();G.trackContinuousMoves();
assert.equal(p.loc,'kannonji');assert.equal(G.personPoint(p),null);assert.equal(p._visualPoint,undefined);assert.equal(p.tr,null);assert.ok(!G.displayCastleGens('gifu').some(g=>g.id===p.id));assert.ok(!G.displayCastleGens('kannonji').some(g=>g.id===p.id));
const later=TK.HIST.find(e=>e.title==='織田秀信、岐阜城主に');post.t=G.evT(later);G.applyEv(later);G.trackContinuousMoves();assert.ok(!p.tr);
assert.equal(p.loc,'gifu');assert.equal(p.documentedResidence,undefined);assert.equal(G.documentedResidence(p),null);
// 旧版の生成前2日間だけ補完する。実保存との比較は別途snapshotで確認。
const repairRows=[];
for(const d of [15,16,17,18]){
 const state=JSON.parse(saved);state.t=G.evT({d:[1582,7,d]});state.gens=state.gens.filter(h=>h.n!=='織田秀信');
 const count=state.gens.length,chron=JSON.stringify(state.chron),time=state.t;G.setS(state);
 const h=G.genByName('織田秀信');assert.equal(!!h,d===16||d===17);assert.equal(state.t,time);assert.equal(JSON.stringify(state.chron),chron);
 if(h){assert.equal(h.loc,'gifu');assert.equal(state.gens.length,count+1);assert.equal(G.documentedResidence(h).status,'custody');}
 const once=JSON.stringify(state);G.setS(state);assert.equal(JSON.stringify(state),once);repairRows.push({day:d,repaired:!!h});
}
// 管理locは安土のまま、旧保存の表示を岐阜へ訂正する。
const legacy=JSON.parse(saved);legacy.t=G.evT({d:[1582,7,18]});const old=legacy.gens.find(g=>g.n==='織田秀信');old.loc='kannonji';old.ll='kannonji';old.tr=null;delete old.documentedResidence;old._visualPoint=[G.C.kannonji.x,G.C.kannonji.y];
G.setS(legacy);assert.equal(old.loc,'kannonji');assert.equal(G.documentedResidence(old).at,'gifu');assert.ok(G.displayCastleGens('gifu').some(g=>g.id===old.id));assert.ok(!G.displayCastleGens('kannonji').some(g=>g.id===old.id));assert.ok(!G.castleGens('gifu').some(g=>g.id===old.id));
assert.deepEqual(Array.from(G.personPoint(old).slice(0,2)),[G.C.gifu.x,G.C.gifu.y]);G.trackContinuousMoves();assert.ok(!old.tr);
// Frozen old-software saves make the migration regression portable; no long replay.
const realLegacyRows=[];
{
 const fs=require('node:fs'),zlib=require('node:zlib'),crypto=require('node:crypto');
 const input=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.resolve(__dirname,'../../data/inputs/kiyosu-custody/legacy-saves.json.gz'))));
 const load=day=>{const raw=input.snapshots[day];assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),input.originalSnapshotSha256[day]);return JSON.parse(raw);};
 const retained=state=>JSON.stringify({t:state.t,y0:state.y0,m0:state.m0,castles:state.castles,units:state.units,chron:state.chron,log:state.log,rel:state.rel,ally:state.ally});
 for(const day of ['16','17','18']){
  const state=load(day),before=retained(state),count=state.gens.length;G.setS(state);const heir=G.genByName('織田秀信');
  assert.equal(retained(state),before,'legacy facts preserved '+day);assert.equal(state.gens.length,count+(day==='18'?0:1));assert.equal(heir.loc,day==='18'?'kannonji':'gifu');
  assert.equal(G.documentedResidence(heir).status,'custody');assert.deepEqual(Array.from(G.personPoint(heir).slice(0,2)),[G.C.gifu.x,G.C.gifu.y]);
  assert.ok(G.displayCastleGens('gifu').some(g=>g.id===heir.id));assert.ok(!G.displayCastleGens('kannonji').some(g=>g.id===heir.id));
  for(const city of ['gifu','kannonji']){assert.ok(!G.castleGens(city).some(g=>g.id===heir.id));assert.ok(!G.idleGens(city).some(g=>g.id===heir.id));}
  const once=JSON.stringify(state);G.setS(state);assert.equal(JSON.stringify(state),once,'legacy load idempotent '+day);G.fixHist();G.hist();assert.equal(retained(state),before,'past events not replayed '+day);
  realLegacyRows.push({day:+day,management:heir.loc,display:'gifu',militaryEligible:false,added:state.gens.length-count});
 }
 for(const offset of [0,1,10]){
  const state=load('18');G.setS(state);const heir=G.genByName('織田秀信');state.t=G.evT({d:TK.DOCUMENTED_RESIDENCES[heir.documentedResidence].until})+offset;state.hi=TK.HIST.length;
  heir.loc='gifu';heir.ll='gifu';heir._visualPoint=[G.C.gifu.x,G.C.gifu.y];heir.tr={p:['gifu','kannonji'],line:[[G.C.gifu.x,G.C.gifu.y],[G.C.kannonji.x,G.C.kannonji.y]],t0:state.t,t1:state.t+3};
  G.setS(state);assert.equal(heir.tr,null,'old interpolation cleared on load');assert.equal(G.personPoint(heir),null);assert.equal(G.inTransit(heir),false);
  state.pendingAdminExtinction={oda:'hashiba'};G.hist();G.trackContinuousMoves();assert.equal(heir.loc,'kannonji');assert.equal(heir.tr,null);assert.equal(heir._visualPoint,undefined);assert.equal(G.personPoint(heir),null);
  for(const city of ['gifu','kannonji']){assert.ok(!G.displayCastleGens(city).some(g=>g.id===heir.id));assert.ok(!G.castleGens(city).some(g=>g.id===heir.id));assert.ok(!G.idleGens(city).some(g=>g.id===heir.id));}
  const later=TK.HIST.find(e=>e.title==='織田秀信、岐阜城主に');state.t=G.evT(later);G.applyEv(later);G.trackContinuousMoves();assert.equal(heir.documentedResidence,undefined);assert.ok(G.personPoint(heir));assert.ok(!heir.tr);assert.ok(G.castleGens('gifu').some(g=>g.id===heir.id));
  realLegacyRows.push({expiredOffset:offset,pointUnknown:true,noInterpolation:true,noMilitaryRole:true,explicitPlacementRestores:true});
 }
}
// The runtime period and the two historical observations share stable evidence IDs.
const fs=require('node:fs'),root=path.resolve(__dirname,'../..');
const evidence=require('../research/evidence-store.cjs').loadEvidence({claimDir:path.join(root,'data/research/curated/claims'),sourceDir:path.join(root,'data/research/curated/sources'),baseSources:TK.RESEARCH_SOURCES});
const periodClaim=evidence.facts.find(c=>c.id===r.claimId),receiptClaim=evidence.facts.find(c=>c.id===r.receiptClaimId);
assert.equal(periodClaim.entity,r.personId);assert.ok(periodClaim.linkedEntities.includes(r.placeId));assert.equal(periodClaim.eventTime.boundsAreHistoricalStartEnd,false);
assert.ok(receiptClaim.linkedEntities.includes(r.personId));assert.ok(!receiptClaim.linkedEntities.some(id=>id.startsWith('place:')));assert.deepEqual(receiptClaim.eventTime.date,Array.from(r.lunarUntil));assert.equal(receiptClaim.eventTime.calendar,'Japanese-lunisolar');assert.equal(receiptClaim.eventTime.leapMonth,false);
const person=JSON.parse(fs.readFileSync(path.join(root,'data/research/curated/people/oda-hidenobu.json'))),place=JSON.parse(fs.readFileSync(path.join(root,'data/research/curated/places/gifu.json')));
assert.equal(person.id,r.personId);assert.ok(person.aliases.includes('三法師'));assert.equal(place.id,r.placeId);assert.equal(place.geometry,null);assert.equal(place.geometryStatus,'not-asserted');
const data={realLegacyRows,runtimeEvidenceLinked:true,fixtures:cases.length+15,repairRows,rows,negativeCases:cases,until:Array.from(r.until),postCustody:JSON.parse(JSON.stringify(info)),sameDayArrivalCreated:false,laterPlacementClearsPastCustody:true};
if(process.env.KIYOSU_RESULT)require('node:fs').writeFileSync(process.env.KIYOSU_RESULT,JSON.stringify(data,null,2)+'\n');
console.log('PASS: Kiyosu succession / foreign custody / old save / source-period guards / unknown after receipt ('+data.fixtures+' fixture groups; '+realLegacyRows.length+' legacy cases; linked evidence)');
