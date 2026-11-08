/* 局地戦の採用範囲・時計・参照整合。史実配置の真偽を証明する検査ではない。 */
'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(process.env.GAME_REPO_ROOT||path.resolve(__dirname,'../..'));
const {TK,G,TKBattleMotion}=require(path.join(root,'tools/checks/history-focus.cjs')).model();
const parentTitle='小牧・長久手の戦い',childTitle='長久手の戦い',parent=TK.BATTLES[parentTitle],child=TK.BATTLES[childTitle],record=TK.CONFLICT_CATALOG[childTitle];
assert.ok(parent,'parent material retained');assert.equal(parent.units.length,9);assert.ok(child,'local child attached after catalog build');assert.ok(record?.scene,'local scene contract');
const parentBefore=JSON.stringify(parent),parentMetaBefore=JSON.stringify(TK.BATTLE_ATLAS[parentTitle]);
const expected=['tsuneoki','nagayoshi','mizuno','ieyasu','ii'];
assert.deepEqual([...child.units.map(u=>u.id)].sort(),[...expected].sort());assert.equal(new Set(child.units.map(u=>u.id)).size,5);assert.deepEqual([...child.atlasGroups.map(g=>g.id)].sort(),['group-4','group-5']);
assert.deepEqual(JSON.parse(JSON.stringify(child.sourceClock)),{title:parent.title,from:62,to:90});assert.deepEqual(JSON.parse(JSON.stringify(record.scene.selection.sourceClockWindow)),[62,90]);
let samples=0;
for(const u of child.units){const old=parent.units.find(v=>v.id===u.id);assert.ok(old);assert.deepEqual(JSON.parse(JSON.stringify(u.sourcePath)),JSON.parse(JSON.stringify(old.path)));assert.deepEqual(JSON.parse(JSON.stringify(u.pathClock)),{from:62,to:90});for(let t=0;t<=100;t+=.5){const a=TKBattleMotion.atUnit(u,t),b=TKBattleMotion.at(old.path,62+t*.28);for(let k=0;k<2;k++)assert.ok(Math.abs(a[k]-b[k])<1e-12,'exact source-path sample: '+u.id+' '+t);samples++;}
 for(const t of [0,1,25,50,75,99,100])assert.equal(G.battleUnitVisible(child,u,t),G.battleUnitVisible(parent,old,62+t*.28),'source visibility retained: '+u.id);
}
assert.equal(samples,1005);
const death=child.beats.find(b=>/森長可/.test(b[1]||'')&&/討/.test(b[1]||''));assert.ok(death,'death narration retained');const sourceDeath=parent.beats.find(b=>b[1]===death[1]);assert.ok(sourceDeath,'narration remains source-backed');assert.ok([76,80].includes(sourceDeath[0]),'source narration clock recognized');const aligned=(80-62)/28*100;assert.ok(Math.abs(death[0]-aligned)<1e-10,'source 76 narration postponed to source 80 before local-clock conversion');assert.ok(!child.beats.some(b=>b[1]===death[1]&&b[0]<aligned));
for(const id of ['tsuneoki','nagayoshi']){const u=child.units.find(u=>u.id===id);assert.ok(u.die!=null);assert.ok(death[0]>=u.die-1e-10,'death must not be narrated before unit death');}
assert.equal(TK.BATTLE_ATLAS[childTitle].file,'nagakute-local.json');assert.equal(TK.BATTLE_ATLAS[parentTitle].file,'09.json');assert.deepEqual(JSON.parse(JSON.stringify(TK.BATTLE_ATLAS[childTitle].bounds)),[137.04,35.18,137.06,35.163]);
assert.equal(child.relatedPeople?.length,3,'three related people remain list-only');assert.equal(new Set(child.relatedPeople.map(p=>p.n)).size,3);for(const p of child.relatedPeople){assert.ok(typeof p.n==='string'&&p.n&&typeof p.role==='string'&&p.role);assert.ok(!child.units.some(u=>(u.g||u.n)===p.n),'related person cannot create a drawn troop');assert.ok(!child.atlasGroups.some(g=>g.members.includes(p.n)),'related person has no invented placement');}
for(const id of ['hidemasa','hidetsugu','hideyoshi','nobukatsu']){assert.ok(parent.units.some(u=>u.id===id),'omitted unit remains in parent material');assert.ok(!child.units.some(u=>u.id===id));}
for(const key of ['atlasGroups','atlasUnits'])for(const g of child[key]||[])assert.ok(g.members.every(id=>expected.includes(id)),'reference closure');for(const b of child.beats)assert.ok((b[2]||[]).every(id=>expected.includes(id)));assert.deepEqual(JSON.parse(JSON.stringify(TK.BATTLE_MOVEMENTS[childTitle])),[]);
assert.equal(JSON.stringify(parent),parentBefore);assert.equal(JSON.stringify(TK.BATTLE_ATLAS[parentTitle]),parentMetaBefore);const count=Object.keys(TK.BATTLES).length,before=JSON.stringify(child);G.buildBattleCatalog();assert.equal(Object.keys(TK.BATTLES).length,count);assert.equal(JSON.stringify(TK.BATTLES[childTitle]),before,'catalog rebuild is deterministic');assert.equal(TK.BATTLES[parentTitle].units.length,9);
const {filterLocalScene}=require('../research/local-battle-scene.cjs');
const spec={...record.scene.selection,childTitle,date:record.scene.date,scope:record.scene.scope};
for(const beatTiming of [[{from:76,to:101,reason:'invalid'}],[{from:14,to:80,reason:'not retained'}],[{from:76,to:80}]])assert.throws(()=>filterLocalScene(parent,{...spec,beatTiming}),/beat timing/);
assert.deepEqual(Array.from(child.relatedPeople,p=>p.n),['池田元助','永井直勝','安藤直次']);
console.log('PASS: parent 9 / local 5 units, groups 4/5, 1005 exact path samples, source62..90, death narration80, local DEM, related3 list-only, idempotence');
