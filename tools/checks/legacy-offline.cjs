/* 非史実ルートを含む旧版専用。現行版の検証には offline.cjs を使用。 */
/* UI・サーバーを起動せず、構文・保存と支城処理を検証する。 */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),game=path.join(root,'game');
for(const f of fs.readdirSync(game).filter(f=>f.endsWith('.js')))new vm.Script(fs.readFileSync(path.join(game,f),'utf8'),{filename:f});
console.log('PASS: JavaScript syntax');
const storage=require(path.join(game,'storage.js'));
const map=new Map(),mem={setItem:(k,v)=>map.set(k,v)},state={x:'日本語',t:42};
assert.equal(storage.write(mem,'test',state,'meta').ok,true);assert.deepEqual(JSON.parse(map.get('test')),state);
assert.equal(storage.write({setItem(){throw new Error('quota')}},'test',state,'meta').ok,false);
assert.equal(storage.write({setItem(k,v){if(k.endsWith('-meta'))throw Error('quota');map.set(k,v)}},'partial',state,'meta').ok,true);
assert.deepEqual(storage.decode(storage.encode(state)),state);assert.deepEqual(storage.decode(JSON.stringify(state)),state);
assert.throws(()=>storage.decode('{'));assert.throws(()=>storage.decode('{"format":"kuniezu","version":99}'));
console.log('PASS: storage success, quota failure, metadata failure, import/export, invalid file');
const geo=require(path.join(game,'territory.js'));
const area=r=>Math.abs(r.reduce((v,_,i)=>i%2?v:v+r[i]*r[(i+3)%r.length]-r[(i+2)%r.length]*r[i+1],0))/2;
const square=[[[0,0,10,0,10,10,0,10]]];const cells=geo.split(square,[{x:2,y:5},{x:8,y:5}]);
assert.equal(cells.length,2);assert.equal(area(cells[0].polygons[0][0]),50);assert.equal(area(cells[1].polygons[0][0]),50);
const coincident=geo.split(square,[{x:5,y:5},{x:5,y:5}]);assert.equal(coincident[1].polygons.length,0);
const donut=geo.split([[[0,0,10,0,10,10,0,10],[4,4,4,6,6,6,6,4]]],[{x:2,y:5},{x:8,y:5}]);
assert.equal(donut.reduce((n,c)=>n+c.polygons.reduce((a,p)=>a+area(p[0])-p.slice(1).reduce((b,r)=>b+area(r),0),0),0),96);
console.log('PASS: clipped territories area, duplicate seeds, lake/hole preservation');
// 隔離した JS 環境でモデルだけを用意する。HTML・画像・ブラウザは読み込まない。
const ctx=vm.createContext({console});ctx.window=ctx;
for(const f of ['data','koyomi','geo','hist','jokaku','battles','battles2','battle-osaka','engine','battle-catalog','territory','events'])vm.runInContext(fs.readFileSync(f==='events'?path.join(root,'archive/alternate-history/events.js'):path.join(game,f+'.js'),'utf8'),ctx,{filename:f});
vm.runInContext(`G.build();G.newGame('s1560','oda');`,ctx);
const G=ctx.G,s=G.S();assert.equal(new Set(G.YOSHO.map(y=>y.id)).size,G.YOSHO.length);assert.equal(G.YOSHO.length,Object.values(G.YOSHO_AT).flat().length);
const y=G.YOSHO.find(y=>y.kind==='城'&&G.yActive(y)&&G.ADJ[y.at].length);assert.ok(y);
const base=y.at,from=G.ADJ[base][0];s.castles[base].owner='imagawa';s.castles[from].owner='oda';s.castles[from].troops=5000;s.clans.oda.food=10000;s.clans.oda.gold=10000;s.ally={};s.units=[];
const before=G.branchDef(base),ownerIncome=G.monthIncome('imagawa').gold,playerIncome=G.monthIncome('oda').gold;
assert.equal(G.attackBranch(y.id).ok,true);assert.equal(G.attackBranch(y.id).ok,false);
assert.equal(s.castles[from].troops,4000);assert.equal(s.clans.oda.food,9400);assert.equal(s.clans.oda.gold,9800);
s.t+=30;G.branchDay();assert.equal(G.yOwner(y),'oda');assert.equal(s.castles[from].troops,4800);assert.equal(s.branchSieges.length,0);
assert.ok(G.branchDef(base)<=before);assert.equal(G.monthIncome('imagawa').gold,ownerIncome-10);assert.equal(G.monthIncome('oda').gold,playerIncome+10);
assert.equal(G.attackBranch(y.id).ok,false);
const saved=JSON.parse(JSON.stringify(s));G.setS(saved);assert.equal(G.yOwner(y),'oda');G.setS(s);
// 本城の持ち主が変われば独立した占領記録を解除する。
s.castles[base].owner='takeda';assert.equal(G.yOwner(y),'takeda');
// 攻略中の同盟成立では資源を再消費せず兵を返す。
s.castles[base].owner='imagawa';delete s.branches[y.id];s.castles[from].troops=5000;s.ally={};assert.equal(G.attackBranch(y.id).ok,true);s.ally[G.ekey('oda','imagawa')]=720;G.branchDay();assert.equal(s.castles[from].troops,5000);assert.equal(s.branchSieges.length,0);assert.equal(G.yOwner(y),'imagawa');
// AIは分岐前に動かず、分岐後は自領の占領された支城を奪還できる。
s.ally={};s.div={};s.branches[y.id]={owner:'oda',base:'imagawa'};s.castles[base].troops=5000;s.clans.imagawa.food=10000;s.clans.imagawa.gold=10000;
G.branchAI('imagawa');assert.equal(s.branchSieges.length,0);s.div.imagawa=1;G.branchAI('imagawa');assert.equal(s.branchSieges[0].clan,'imagawa');
s.t+=30;G.branchDay();assert.equal(G.yOwner(y),'imagawa');
assert.ok(G.branchCells(base).length>1);assert.ok(G.branchCells(base).some(c=>!c.main&&c.polygons.length>0));
console.log('PASS: AI retakes branch only after divergence; clipped cell generation');
console.log('PASS: branch indexing, cost, duplicate order, capture, income, ownership, save roundtrip, cancellation');
// 通常軍勢による支城攻略（従来の保存レコードの検証後に新実装をロード）。
vm.runInContext(fs.readFileSync(path.join(game,'branch-war.js'),'utf8'),ctx,{filename:'branch-war.js'});
G.newGame('s1560','oda');const normal=G.S();normal.clans.oda.food=50000;normal.clans.oda.gold=10000;
const target=G.YOSHO.find(y=>G.branchOffer(y.id,'oda').ok);assert.ok(target);const offer=G.branchOffer(target.id,'oda'),ids=offer.gids.slice();
assert.equal(G.attackBranch(target.id,'oda').ok,true);assert.equal(normal.branchSieges?.length||0,0);const unit=G.branchUnit(target.id);assert.ok(unit&&unit.gens.length&&unit.state==='march');assert.ok(ids.every(id=>G.gen(id).unit===unit.id));
assert.equal(G.attackBranch(target.id,'oda').ok,false);let conquered=false;normal.player='__none';
for(let i=0;i<280;i++){G.day();normal.evQ=[];normal.sceneQ=[];normal.battleQ=[];normal.propQ=[];if(G.yOwner(target)==='oda'){conquered=true;break;}}
assert.ok(conquered,'ordinary army captures');assert.ok(normal.branchGarrisons[target.id].troops>0);assert.ok(G.branchUnit(target.id)==null);assert.ok(unit.troops<unit.troops0);assert.ok(unit.food<offer.food);
for(let i=0;i<100&&normal.units.some(u=>u.id===unit.id);i++){G.day();normal.evQ=[];normal.sceneQ=[];normal.battleQ=[];normal.propQ=[];}
assert.ok(!normal.units.some(u=>u.id===unit.id),'survivors return');assert.ok(ids.every(id=>G.gen(id).unit==null),'generals released');
console.log('PASS: ordinary branch army, commanders, march, siege, casualties, food, garrison and return');
vm.runInContext(fs.readFileSync(path.join(game,'history-evidence.js'),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(game,'battle-osaka.js'),'utf8'),ctx);
for(const f of ['battle-research','campaigns','battle-timing'])vm.runInContext(fs.readFileSync(f==='events'?path.join(root,'archive/alternate-history/events.js'):path.join(game,f+'.js'),'utf8'),ctx,{filename:f});G.buildBattleCatalog();
// UI内の保存検証関数だけを取り出して、新旧シナリオの保存を確認。
const ui=fs.readFileSync(path.join(game,'ui.js'),'utf8');const clean=ui.slice(ui.indexOf('function cleanSave('),ui.indexOf('function doLoad('));vm.runInContext(clean,ctx);
for(const sid of Object.keys(ctx.TK.SCEN)){G.newGame(sid,'oda');const state=JSON.parse(JSON.stringify(G.S()));assert.ok(ctx.cleanSave(state),sid);delete state.castles[Object.keys(G.C)[0]];assert.equal(ctx.cleanSave(state),null);
 const live=G.S();live.player='__none';for(let i=0;i<720;i++){G.day();live.evQ=[];live.sceneQ=[];live.battleQ=[];live.propQ=[];}
 for(const c of Object.values(live.castles)){assert.ok(live.clans[c.owner]?.alive,sid+' owner');assert.ok(Number.isFinite(c.troops)&&c.troops>=0,sid+' troops');}
 for(const k of G.alive()){assert.ok(G.gen(live.clans[k].leader)&&!G.gen(live.clans[k].leader).dead,sid+' leader');assert.equal(live.castles[live.clans[k].cap]?.owner,k,sid+' capital');}
}
console.log('PASS: all 7 scenarios save validation and missing-castle rejection');

console.log('PASS: all 7 scenarios model-only 720-day progression and ownership/troops/leaders/capitals');

G.newGame('s1600','tokugawa');const peace=ctx.TK.HIST.find(e=>e.title==='大坂冬の陣の和睦');const lunar=G.kyu(G.evT(peace));assert.equal(lunar.m,12);assert.equal(lunar.d,19);
G.newGame('s1560','oda');const hamochi=G.YOSHO.find(y=>y.n==='羽茂城');assert.equal(G.yOwner(hamochi),'hamochi');assert.equal(G.branchOffer(hamochi.id).ok,false);console.log('PASS: peace lunar date and detached Hamochi ownership');

G.newGame('s1560','oda');for(const k of G.alive())if(k!=='oda'&&!G.FOREIGN.includes(k))G.S().clans[k].alive=false;assert.ok(G.S().clans.joseon.alive);assert.ok(G.hasUnifiedJapan());G.S().clans.takeda.alive=true;assert.equal(G.hasUnifiedJapan(),false);console.log('PASS: domestic victory excludes foreign kingdoms');

G.newGame('s1560','oda');const W=G.S();W.clans.oda.food=50000;W.clans.oda.gold=10000;const withdrawTarget=G.YOSHO.find(y=>G.branchOffer(y.id).ok);const wo=G.branchOffer(withdrawTarget.id),troopsBefore=W.castles[wo.from].troops;assert.ok(G.attackBranch(withdrawTarget.id).ok);assert.ok(G.withdrawBranch(withdrawTarget.id).ok);assert.equal(W.castles[wo.from].troops,troopsBefore);console.log('PASS: branch withdrawal restores troops without duplication');

G.newGame('s1560','oda');G.S().clans.oda.food=100000;G.S().clans.oda.gold=10000;const hy=G.YOSHO.find(y=>G.branchOffer(y.id).ok);assert.equal(G.branchOffer(hy.id,'oda','hyoro').food,G.branchOffer(hy.id,'oda','chikara').food*2);console.log('PASS: siege tactic provisions reflect 90/180-day preparation');
