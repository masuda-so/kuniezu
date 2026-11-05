/* 年表の戦闘関連注記を、根拠のない独立合戦に変えないための回帰。 */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
function checkEvents({G,TK}){
 for(const e of TK.HIST)if(e.k!=='premarch'&&/戦い|合戦|落城|開城|の陣|攻め|平定|征伐|の変|の役|海戦/.test(e.title||''))assert.ok(TK.BATTLES[e.title]||TK.BATTLE_EVENT_EXCLUSIONS[e.title],e.title+' missing scene or documented event classification');
// A documented castle fall remains on the timeline without an invented battle scene.
const ganjakuClaim=JSON.parse(fs.readFileSync(path.join(__dirname,'../../data/research/curated/claims/ganjaku-fall.json'),'utf8'));
const ganjakuRows=TK.HIST.filter(e=>e.title==='岩石城の落城'&&e.k!=='premarch');
assert.equal(ganjakuRows.length,1,'Ganjaku fall remains a single historical event');
const ganjaku=ganjakuRows[0];
assert.equal(ganjaku.k,'note');assert.equal(ganjaku.site,'岩石城');
assert.equal(ganjaku.source,ganjakuClaim.sourceUrl);
assert.deepEqual(Array.from(ganjaku.lunarDate),ganjakuClaim.eventTime.date);
assert.deepEqual(Array.from(ganjaku.d),Array.from(TK.lunarDate(...ganjakuClaim.eventTime.date)));
assert.ok(TK.BATTLE_EVENT_EXCLUSIONS[ganjaku.title]);
assert.ok(!TK.BATTLES[ganjaku.title],'Ganjaku has no unsupported deployment scene');
const ganjakuPlace=require('../../data/research/curated/places/ganjaku.json');
for(const year of [1560,1587,1615]){
 const markers=TK.contextPlaces(year).filter(p=>p.name===ganjaku.site);
 assert.equal(markers.length,1,'Ganjaku has one geographic label in '+year);
 assert.deepEqual(Array.from(markers[0].at),ganjakuPlace.geometry.coordinates);
}
assert.ok(!G.YOSHO.some(y=>y.n===ganjaku.site),'site label grants no facility bonus');
for(const [title,battle,lunar,phase] of [
 ['鍋島勝茂が安濃津城を攻める','安濃津城の戦い',[1600,8,22],'8月22日'],
 ['毛利勢が安濃津城を攻める','安濃津城の戦い',[1600,8,24],'8月24日'],
 ['石垣原の戦いの後、大友義統が降伏','石垣原の戦い',[1600,9,15],'9月15日']
]){
 const events=TK.HIST.filter(e=>e.title===title&&e.k!=='premarch');assert.equal(events.length,1,title);
 const event=events[0],scene=TK.BATTLES[battle];
 assert.equal(event.k,'note');assert.deepEqual(Array.from(event.lunarDate),lunar,title);
 assert.deepEqual(Array.from(event.d),Array.from(TK.lunarDate(...lunar)),title+' converted date');
 assert.ok(TK.BATTLE_EVENT_EXCLUSIONS[title]);assert.ok(!TK.BATTLES[title],title+' duplicate scene');
 assert.ok(scene.calendar.some(([,label])=>label.includes(phase)),title+' existing phase');
 assert.equal(event.source,battle==='安濃津城の戦い'?TK.RESEARCH_SOURCES.anotsuChronology.url:'https://www.city.beppu.oita.jp/doc/gakusyuu/bunkazai/booklet/no44.pdf',title+' documented source');
}

 return {ganjaku};
}
function checkSchematic(sc,g){
 assert.ok(g.schematic&&sc.atlasSchematic&&!g.point,'schematic display must be explicit');
 assert.ok(g.members.length,'schematic group needs participants');
 for(const id of g.members){
  const route=sc.atlasSchematic.paths?.[id];assert.ok(Array.isArray(route)&&route.length,id+' missing schematic path');
  for(let i=0;i<route.length;i++){const p=route[i];assert.ok(Array.isArray(p)&&p.length===3&&p.every(Number.isFinite),id+' invalid schematic point');assert.ok(p[0]>=0&&p[0]<=100&&p[1]>=0&&p[1]<=1&&p[2]>=0&&p[2]<=1,id+' schematic bounds');assert.ok(i?p[0]>route[i-1][0]:p[0]===0,id+' schematic time order');}
 }
}
module.exports={checkEvents,checkSchematic};
if(require.main===module){
 const {G,TK}=require('./history-focus.cjs').model(),{ganjaku}=checkEvents({G,TK});
 // 注記単体の副作用を実エンジンで点検する。年代全体の再生ではない。
 G.newGame('s1560','hojo');const state=G.S();state.player='__none';state.t=G.evT(ganjaku);
 const owners=['kosho','kawara'].map(id=>state.castles[id].owner);G.applyEv(ganjaku);
 assert.equal(state.chron.filter(e=>e.title===ganjaku.title&&e.ok).length,1);
 assert.deepEqual(['kosho','kawara'].map(id=>state.castles[id].owner),owners);
 assert.ok(!(state.sceneQ||[]).some(q=>(typeof q==='string'?q:q.title)===ganjaku.title));
 const site=state.sites.find(s=>s.n===ganjaku.site);assert.ok(site);
 assert.deepEqual([site.x,site.y2],Array.from(G.PJ(...TK.SITE_POS[ganjaku.site])));
 const schematic=TK.BATTLES['木津川口の戦い'];for(const g of schematic.atlasGroups)checkSchematic(schematic,g);
 const group=schematic.atlasGroups[0],id=group.members[0];
 for(const mutate of [
  (sc,g)=>{g.schematic=false;},
  sc=>{delete sc.atlasSchematic.paths[id];},
  sc=>{sc.atlasSchematic.paths[id]=[[0,.2,.3],[10,1.1,.3]];},
  sc=>{sc.atlasSchematic.paths[id]=[[0,.2,.3],[10,.3,.3],[5,.4,.3]];},
  sc=>{sc.atlasSchematic.paths[id]=[[0,NaN,.3]];}
 ]){const sc=JSON.parse(JSON.stringify(schematic)),g=JSON.parse(JSON.stringify(group));mutate(sc,g);assert.throws(()=>checkSchematic(sc,g));}
 console.log('PASS: 4 sourced timeline notes and explicit schematic paths; invalid paths rejected');
}
