/* 局地戦の切出し：史実の再確認ではなく、部隊・時計・投影の整合を検査する。 */
const assert=require('node:assert/strict'),vm=require('node:vm');
const {filterLocalScene}=require('../research/local-battle-scene.cjs');
const {TK,G,TKBattleMotion,TKBattleAtlas}=require('./history-focus.cjs').model();
const record=TK.CONFLICT_CATALOG['設楽原の戦い'],spec={...record.scene.selection,childTitle:record.title,date:record.scene.date,scope:record.scene.scope};
const original=TK.BATTLES[spec.sourceTitle||record.scene.sourceTitle],before=JSON.stringify(original);
const isolated=vm.runInNewContext('('+filterLocalScene.toString()+')'),out=isolated(original,spec),child=TK.BATTLES[record.title];
assert.equal(child.units.length,11);assert.equal(JSON.stringify(original),before);assert.equal(out.movements.length,0);
assert.ok(!child.units.some(u=>['sakai','kawakubo','okudaira'].includes(u.id)));
let samples=0;
for(const u of child.units){const old=original.units.find(v=>v.id===u.id);for(let t=0;t<=100;t+=.5){const a=TKBattleMotion.atUnit(u,t),b=TKBattleMotion.at(old.path,35+t*.65);for(let k=0;k<2;k++)assert.ok(Math.abs(a[k]-b[k])<1e-12);samples++;}
 for(const t of [0,1,25,50,75,99,100])assert.equal(G.battleUnitVisible(child,u,t),G.battleUnitVisible(original,old,35+t*.65));
}
for(const key of ['atlasGroups','atlasUnits'])for(const g of child[key]||[])assert.ok(g.members.every(id=>child.units.some(u=>u.id===id)));
assert.ok(child.beats.every(b=>(b[2]||[]).every(id=>child.units.some(u=>u.id===id))));
assert.deepEqual(JSON.parse(JSON.stringify(TK.BATTLE_MOVEMENTS[record.title])),[]);
for(const bad of [{sourceClockWindow:[100,35]},{sourceClockWindow:[-1,100]},{allowUnitIds:[...spec.allowUnitIds,'missing']},{allowGroupIds:[...spec.allowGroupIds,'missing']},{allowUnitIds:spec.allowUnitIds.filter(id=>id!=='nobunaga')},{keepBeatSourcePercentages:[0]}])assert.throws(()=>isolated(original,{...spec,...bad}),/Invalid local scene scope/);
const sourceBounds=TK.BATTLE_ATLAS['長篠の戦い'].bounds,frame=TK.BATTLE_ATLAS[record.title].bounds;
for(const [W,H] of [[335,235],[940,658]]){const tr=TKBattleAtlas.reliefTransform(sourceBounds,frame,W,H);for(let x=0;x<=4;x++)for(let y=0;y<=4;y++){
 const p=[frame[0]+(frame[2]-frame[0])*x/4,frame[1]-(frame[1]-frame[3])*y/4];
 const sourcePixel=[(p[0]-sourceBounds[0])/(sourceBounds[2]-sourceBounds[0])*W,(sourceBounds[1]-p[1])/(sourceBounds[1]-sourceBounds[3])*H];
 assert.ok(Math.abs(sourcePixel[0]*tr.scale[0]+tr.translate[0]-x*W/4)<1e-7);
 assert.ok(Math.abs(sourcePixel[1]*tr.scale[1]+tr.translate[1]-y*H/4)<1e-7);
}}
G.newGame('s1575','oda');
const trigger=G.evT({d:record.scene.eventDate});
assert.equal(G.sceneTitleForEvent('長篠の戦い',trigger),record.title);assert.equal(G.sceneTitleForEvent('長篠の戦い',trigger+.75),record.title);assert.equal(G.sceneTitleForEvent('長篠の戦い',trigger-1),null);assert.equal(G.sceneTitleForEvent('長篠の戦い',trigger+1),null);assert.equal(G.sceneTitleForEvent('長篠の戦い'),null);assert.equal(G.sceneTitleForEvent('文禄の役'),null);assert.equal(G.sceneTitleForEvent('関ヶ原の戦い'),'関ヶ原の戦い');
const event=TK.HIST.find(e=>e.title==='長篠の戦い'&&e.k!=='premarch'),date=event.d;try{event.d=[1575,6,28];assert.equal(G.sceneTitleForEvent('長篠の戦い',trigger),null,'another date cannot auto-play this local battle');}finally{event.d=date;}
G.S().sceneQ=[];while(G.S().t<trigger){G.day();G.S().evQ=[];}
const queued=G.S().sceneQ.find(q=>q.title==='長篠の戦い');assert.ok(queued,'historical progression queues the parent event');assert.equal(G.sceneTitleForEvent(queued.title,queued.t),record.title,'the actual engine queue resolves to the local battle');
const count=Object.keys(TK.BATTLES).length;G.buildBattleCatalog();assert.equal(Object.keys(TK.BATTLES).length,count);assert.equal(TK.BATTLES[record.title].units.length,11);
console.log('PASS: 11 local units, '+samples+' exact source-path samples, event clocks, reference closure, 50 relief projection points, matching-day auto scene and idempotence');
