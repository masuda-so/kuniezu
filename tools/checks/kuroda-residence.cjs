/* 中津本拠と日々の所在を区別し、旧1599年移動予約のみ無効化する。 */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {G,TK}=require('./history-focus.cjs').model();
const {loadEvidence}=require('../research/evidence-store.cjs'),{loadLocations,queryLocations}=require('../research/location-store.cjs');
G.newGame('s1600','tokugawa');G.S().player='__none';
const slots=TK.HIST.filter(e=>e.d.join('/')==='1599/1/20'&&e.n==='黒田長政');assert.equal(slots.length,1);assert.equal(slots[0].k,'note');assert.equal(slots[0].at,undefined);assert.equal(slots[0].title,undefined);
assert.ok(!TK.HIST.some(e=>e.k==='move'&&e.n==='黒田長政'&&e.at==='kawara'));
const y=G.YOSHO.find(y=>y.n==='中津城');assert.ok(y);assert.equal(y.at,'kawara');
// 所在が確定しない記録済みの人物は、城将の表（castleGens）にも表示にも城内確定として出さない。元の武将データは欠けない。
const long=G.genByName('黒田長政'),domainRows=G.castleGens(long.loc);assert.ok(G.S().gens.some(g=>g.id===long.id&&g.loc===long.loc),'source general data keeps 長政');assert.ok(!domainRows.some(g=>g.id===long.id));assert.ok(!G.displayCastleGens(long.loc).some(g=>g.id===long.id));assert.deepEqual(G.displayCastleGens(long.loc).map(g=>g.id),domainRows.map(g=>g.id));
const base=G.historicalPrincipalBase(long);assert.equal(base.place,'中津城');assert.equal(base.managementNode,'kawara');assert.equal(base.exactPresence,false);assert.equal(base.x,undefined);
const original=JSON.parse(JSON.stringify(G.S())),t=(1599-original.y0)*360+(1-original.m0)*30+19;
const wrong={n:'黒田長政',at:'kawara',cap:0,after:t,until:t+360};
const keep=[{...wrong,n:'立花宗茂'},{...wrong,at:'yanagawa'},{...wrong,after:t-1},{...wrong,home:1},{...wrong,cap:1},{...wrong,until:t+60}];
const date=G.date(),oldTime=(date.y-original.y0)*360+(date.m-original.m0)*30+date.d-1;
const save=JSON.parse(JSON.stringify(original));delete save.clockVersion;save.t=oldTime;save.pendMoves=[wrong,...keep];
const unit={id:999999,clan:'hashiba',gens:[G.genByName('黒田長政').id],troops:5000,path:['himeji','miki'],state:'return',hist:true,histRet:true,seg:0,pos:.43,visualTravel:{line:[[1,2],[3,4]],start:save.t,end:save.t+20}};save.units.push(unit);
const general=save.gens.find(g=>g.n==='黒田長政');general.unit=unit.id;general.loc='kawara';general.tr={line:[[4,5],[6,7]],t0:save.t,t1:save.t+5};
const before=JSON.parse(JSON.stringify(save));assert.equal(G.repairKurodaResidenceOrders(save),1);const expected={...before,pendMoves:keep};assert.deepEqual(save,expected,'cleanup must preserve date, armies, troops, routes, generals, capitals and historical cursors');assert.equal(G.repairKurodaResidenceOrders(save),0);
const divergent=JSON.parse(JSON.stringify(before));divergent.div={hashiba:1};assert.equal(G.repairKurodaResidenceOrders(divergent),0);assert.deepEqual(divergent,{...before,div:{hashiba:1}});
const versioned=JSON.parse(JSON.stringify(original));versioned.pendMoves=[wrong,...keep];const versionedBefore=JSON.stringify(versioned);assert.equal(G.repairKurodaResidenceOrders(versioned),0);assert.equal(JSON.stringify(versioned),versionedBefore,'old numeric signature never rewrites a new-clock save');
const load=JSON.parse(JSON.stringify(original));delete load.clockVersion;load.t=oldTime;load.pendMoves=[wrong,...keep];const units=JSON.stringify(load.units),castles=JSON.stringify(load.castles),gens=load.gens.map(g=>[g.id,g.loc,g.unit]);G.setS(load);assert.equal(JSON.stringify(G.S().units),units);assert.equal(JSON.stringify(G.S().castles),castles);assert.deepEqual(G.S().gens.map(g=>[g.id,g.loc,g.unit]),gens);assert.equal(G.S().pendMoves.length,keep.length);assert.equal(G.S().hi,original.hi);
G.setS(JSON.parse(JSON.stringify(original)));
const descriptions=[];for(const year of [1587,1588,1589,1599,1600,1602,1615]){G.S().t=G.evT({d:[year,1,1]});const p=G.sitePresentation(y);descriptions.push({year,...p});if(year===1587)assert.equal(p.state,'成立する前');if(year===1599){assert.match(p.role,/黒田氏の本拠/);assert.match(p.description,/1589年/);assert.doesNotMatch(p.description,/香春|1599.*移/);}if(year>=1602)assert.match(p.role,/細川/);}
const {sources}=loadEvidence({claimDir:'data/research/curated/claims',sourceDir:'data/research/curated/sources',baseSources:TK.RESEARCH_SOURCES,knownWaterKeys:require('../research/evidence-store.cjs').catalogWaterKeys('docs/work/catalog.jsonl')});
const loc=loadLocations({root:'data/research/curated',sources});const q=queryLocations(loc,{person:'黒田長政',lunarDate:[1599,1,20]});assert.equal(q.matches.length,1);assert.equal(q.matches[0].relation,'principal-base');assert.equal(q.matches[0].placeName,'中津城');assert.equal(q.exactPresenceConfirmed,false);assert.equal(q.continuousPresenceAssumed,false);const lord1600=queryLocations(loc,{person:'黒田長政',year:1600}).matches.filter(m=>m.relation==='held-castle-lordship');assert.equal(lord1600.length,1);assert.equal(lord1600[0].placeName,'中津城');
// KB has no DOM dependency. Check the rendered text and source attribution, not only the raw data.
const c={TK,G};vm.createContext(c);vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../../kuniezu/static/kuniezu/kb.js'),'utf8'),c);const person=TK.kb().find(x=>x.id==='p_黒田長政');assert.match(person.text,/本拠と家督：1589年 中津城/);assert.match(person.src,/福岡市博物館/);assert.doesNotMatch(person.text,/1599年.*家督/);
fs.writeFileSync('data/audits/kuroda-residence.json',JSON.stringify({slotPreserved:true,pendingOrderRemoved:1,stateFieldsPreserved:['t','hi','gens.loc','gens.unit','units','castles','clans','return routes'],descriptions,locationQuery:q,kb:person},null,2)+'\n');
console.log('PASS: no 1599 Kawara move; exact old order removed; army/return/save state preserved; Nakatsu principal-base and succession shown without asserting daily presence');
