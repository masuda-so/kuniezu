/* 関ヶ原の不参戦隊と、他隊の移動が変わらないことの局所回帰。
   日次進行・ゲーム開始・ブラウザを使わない。
   node tools/checks/sekigahara-motion.cjs [repository-root] [candidate-overlay] [report.json] */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=process.argv[2]||path.resolve(__dirname,'../..'),overlay=process.argv[3],reportPath=process.argv[4];
const read=f=>fs.readFileSync(overlay&&fs.existsSync(path.join(overlay,f))?path.join(overlay,f):path.join(root,f),'utf8');
const c=vm.createContext({console});c.window=c;
for(const [,f] of read('kuniezu/templates/index.html').matchAll(/<script src="([^"?]+)(?:\?v=[0-9a-f]+)?"/g)){
 if(!['ui.js','kb.js','bscene.js','terrain-tiles.js'].includes(f))vm.runInContext(read('kuniezu/static/kuniezu/'+f),c,{filename:f});
}
c.G.build();c.G.buildBattleCatalog();
const {TK,G,TKBattleMotion:M}=c,sc=TK.BATTLES['関ヶ原の戦い'];
const held=['mori','kikkawa','ankokuji','chosokabe','roster-長束正家'],heldSet=new Set(held);
const phases=Array.from({length:201},(_,i)=>i/2),norm=p=>p&&Array.from(p);
function setup(scene,W=940,H=Math.round(W*.7),api=M,sourcedOverride){
 const b=TK.BATTLE_ATLAS[scene.title].bounds,pj=(lo,la)=>[(lo-b[0])/(b[2]-b[0])*W,(b[1]-la)/(b[1]-b[3])*H];
 const group=u=>scene.atlasGroups.find(g=>g.members.includes(u.id));
 const base=new Map(scene.units.filter(u=>group(u)?.point).map(u=>[u.id,pj(...group(u).point)]));
 const moves=TK.BATTLE_MOVEMENTS[scene.title]||[],sourced=sourcedOverride||new Set(scene.units.filter(u=>moves.some(m=>m.name===(u.g||u.n))).map(u=>u.id));
 const plan=api.plan(scene,base,W,H,()=>null,sourced);
 const pin=(u,t)=>norm(plan.pos(u.id,t)||pj(...G.battlePhasePoint(scene,u.g||u.n,t,group(u).point)));
 return {base,plan,pin};
}
assert.equal(sc.units.length,45);
assert.deepEqual(Object.keys(sc.motionFallbacks).sort(),held.slice().sort());
assert.ok(TK.RESEARCH_SOURCES.sekigaharaGuide?.url);
for(const id of held){const u=sc.units.find(u=>u.id===id);assert.ok(u);assert.equal(sc.motionFallbacks[id].source,'sekigaharaGuide');assert.equal(sc.motionFallbacks[id].mode,'hold');assert.equal(u.turn,undefined);assert.equal(u.rout,undefined);}
assert.deepEqual(Object.values(TK.BATTLES).filter(s=>s.motionFallbacks).map(s=>s.title),['関ヶ原の戦い']);
const control={...sc,motionFallbacks:undefined},differences=[];
for(const W of [940,390]){
 const now=setup(sc,W),before=setup(control,W);
 for(const u of sc.units){
  if(heldSet.has(u.id)){
   assert.equal(now.plan.estimated.has(u.id),false,u.g+' has no invented trajectory');
   assert.equal(now.plan.placed.has(u.id),false);
   let max=0;
   for(const t of phases){assert.deepEqual(now.pin(u,t),norm(now.base.get(u.id)),u.g+' remains at the documented representative point');const p=before.pin(u,t),q=now.pin(u,t);max=Math.max(max,Math.hypot(p[0]-q[0],p[1]-q[1]));}
   assert.ok(max>1,u.g+' fixture detects the old movement');differences.push({id:u.id,width:W,maximumRemovedDisplacementPx:max});
  }else for(const t of phases)assert.deepEqual(now.pin(u,t),before.pin(u,t),u.g+' unchanged at '+t);
 }
}
// 明示された経路・史料地点移動・寝返り・退却が待機の既定値より優先される。
for(const kind of ['legacy-path','turn','rout','documented']){
 const f=JSON.parse(JSON.stringify(sc)),u=f.units.find(u=>u.id==='mori');
 if(kind==='legacy-path')u.path=[[0,.3,.4],[100,.5,.6]];
 if(kind==='turn')u.turn=[55,'a'];
 if(kind==='rout')u.rout=70;
 const sourced=kind==='documented'?new Set(['mori']):undefined;
 const a=setup(f,940,658,M,sourced),b=setup({...f,motionFallbacks:undefined},940,658,M,sourced);
 for(const t of phases)assert.deepEqual(norm(a.plan.pos('mori',t)),norm(b.plan.pos('mori',t)),kind+' preserves explicit motion');
 if(kind==='documented')assert.equal(a.plan.estimated.has('mori'),false);
 else assert.equal(a.plan.estimated.has('mori'),true);
}
// 位置のない待機隊に、汎用の半円配置を新造しない。
const missing={title:'fixture',units:[{id:'a',side:'a',path:[[0,.2,.3]]},{id:'b',side:'b',path:[[0,.8,.7]]}],beats:[],motionFallbacks:{b:{mode:'hold'}}};
const noPoint=M.plan(missing,new Map([['a',[100,100]]]),400,280,()=>null);
assert.equal(noPoint.placed.has('b'),false);assert.equal(noPoint.pos('b',50),null);
const switched=sc.units.filter(u=>u.turn).map(u=>[u.id,u.turn[0],u.turn[1]]);
assert.deepEqual(JSON.parse(JSON.stringify(switched)),[['kobayakawa',55,'a'],['wakisaka',61,'a'],['kutsuki',61,'a'],['akaza',61,'a'],['ogawa',61,'a']]);
assert.ok(sc.units.find(u=>u.id==='shimazu').path.length>1);
const report={passed:true,scope:'関ヶ原45隊、2画面幅×201段階。日次進行・Chromeなし。',held,unchangedUnits:40,samplesPerWidth:201,widths:[940,390],explicitMotionPreserved:['documented','legacy-path','turn','rout'],missingPointNotInvented:true,defectionPhases:switched,differences};
if(reportPath)fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
console.log('PASS: Sekigahara 5 held / 40 unchanged; sourced movement, paths, defection and retreat preserved');
