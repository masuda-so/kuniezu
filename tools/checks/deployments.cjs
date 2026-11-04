const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {G,TK}=require('./history-focus.cjs').model();
assert.equal(Object.keys(TK.BATTLES).length,111);
for(const e of TK.HIST)if(TK.BATTLE_TROOPS[e.title]&&!TK.BATTLE_TROOPS[e.title].skip)assert.ok(TK.BATTLES[e.title]?.atlasGroups?.length,e.title+' omitted from catalog');
for(const e of TK.HIST)if(e.k!=='premarch'&&/戦い|合戦|落城|開城|の陣|攻め|平定|征伐|の変|の役|海戦/.test(e.title||''))assert.ok(TK.BATTLES[e.title]||TK.BATTLE_EVENT_EXCLUSIONS[e.title],e.title+' missing scene or documented event classification');
const {ganjaku}=require('./battle-event-classification.cjs').checkEvents({G,TK});
const report=[];
for(const [title,sc] of Object.entries(TK.BATTLES)){
 const ids=sc.atlasGroups.flatMap(g=>g.members),bounds=TK.BATTLE_ATLAS[title].bounds;
 assert.equal(ids.length,sc.units.length,title);assert.equal(new Set(ids).size,ids.length,title+' duplicate');
 for(const side of ['a','b'])assert.ok(sc.atlasGroups.some(g=>g.side===side),title+' missing '+side);
 for(const g of sc.atlasGroups){assert.ok(g.precision,title);assert.ok(!g.precision.includes('表示範囲外'),title+' deployment clipped');if(g.point){const [x,y]=g.point;assert.ok(x>=bounds[0]&&x<=bounds[2]&&y<=bounds[1]&&y>=bounds[3],title+' bounds');}else assert.ok(g.dock,title);}
 assert.ok(sc.sources.length);for(const id of sc.sources)assert.ok(TK.RESEARCH_SOURCES[id]||TK.BATTLE_SOURCES[id],title+' source '+id);
 report.push({title,participants:sc.units.length,groups:sc.atlasGroups.length,located:sc.atlasGroups.filter(g=>g.point).length,unlocated:sc.atlasGroups.filter(g=>g.dock).length,sources:sc.sources});
}
const snapshot=JSON.stringify(Object.values(TK.BATTLES).map(s=>s.atlasGroups));G.buildBattleCatalog();assert.equal(JSON.stringify(Object.values(TK.BATTLES).map(s=>s.atlasGroups)),snapshot,'catalog idempotent');
assert.equal(TK.BATTLE_TROOPS['慶長の役・漆川梁海戦'].a.tr,0);
assert.equal(TK.BATTLES['南原城の戦い'].sides.b.n,'明・朝鮮連合守備軍');
assert.ok(TK.BATTLES['石垣原の戦い'].atlasGroups.find(g=>g.members.includes('b-0')).dock);
for(const [title,lunar] of [['三木の干殺し',[1580,1,17]],['鳥取の渇え殺し',[1581,10,25]]])assert.equal(JSON.stringify(TK.BATTLES[title].eventDate),JSON.stringify(TK.lunarDate(...lunar)),title+' replay date');
assert.equal(TK.HIST.find(e=>e.title==='鳥取の渇え殺し').castles.length,1,'Awaji must not fall in the Tottori battle');
assert.ok(!TK.ROADS.some(r=>r[0]==='会津中街道'));
const east=TK.ROADS.find(r=>r[0]==='関東路')[1];assert.ok(east.at(-1)[0]>128.8&&east.at(-1)[1]>37.7);assert.ok(east.every(p=>p[1]>37.3),'no spurious Chungju detour');
G.newGame('s1585','hojo');G.S().player='__none';
const clear=()=>{const s=G.S();s.evQ=[];s.sceneQ=[];s.battleQ=[];s.propQ=[];};
const before=d=>{const t=G.evT({d});while(G.S().t<t-1){G.day();clear();}};
before(ganjaku.d);
const beforeGanjakuOwners=['kosho','kawara'].map(id=>G.S().castles[id].owner);
assert.ok(!G.S().chron.some(e=>e.title===ganjaku.title),'Ganjaku not recorded prematurely');
G.day();
assert.equal(G.S().chron.filter(e=>e.title===ganjaku.title&&e.ok).length,1,'Ganjaku fall recorded on its attested day');
assert.deepEqual(['kosho','kawara'].map(id=>G.S().castles[id].owner),beforeGanjakuOwners,'Ganjaku note does not transfer nearby castles');
assert.ok(!(G.S().sceneQ||[]).some(q=>(typeof q==='string'?q:q.title)===ganjaku.title),'Ganjaku does not queue an invented scene');
const ganjakuSite=G.S().sites.find(s=>s.n===ganjaku.site),ganjakuPoint=G.PJ(...TK.SITE_POS[ganjaku.site]);
assert.ok(ganjakuSite,'Ganjaku remains visible as a historic site');
assert.deepEqual([ganjakuSite.x,ganjakuSite.y2],Array.from(ganjakuPoint));clear();
before(TK.lunarDate(1587,10,25));assert.equal(G.S().castles.shibata.owner,'shibata');G.day();clear();assert.equal(G.S().castles.shibata.owner,'nagao');
for(const [id,lunar] of [['hachigata',[1590,6,14]],['nirayama',[1590,6,24]]]){
 before(TK.lunarDate(...lunar));assert.equal(G.S().castles[id].owner,'hojo',id+' before surrender');G.day();clear();assert.equal(G.S().castles[id].owner,'hashiba',id+' on surrender');assert.equal(G.S().castles.odawara.owner,'hojo','Odawara still holds');
}
const n=TK.HIST.find(e=>e.title==='韮山城の戦い');assert.equal(G.evT(n)+n.hold,G.evT({d:TK.BATTLES[n.title].eventDate}));
fs.writeFileSync(path.join(__dirname,'../../data/audits/deployment-audit.json'),JSON.stringify({generated:new Date().toISOString(),battles:report,note:'表示網羅性の検査。全隊の位置を史料で確定したとの意味ではない。'},null,2)+'\n');
console.log('PASS 111 deployment rosters, both sides, unique membership, bounds, source registry, idempotence, corrected sea-battle numbers, dated roads, actual castle handovers, and 4 classified timeline events without fabricated or duplicate scenes');
