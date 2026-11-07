/* All registered displays use real source bounds; this is a draw/selection regression,
   not verification of the historical positions or of real portrait readability. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {c,TK,make,counters,choices,simple}=require('./fixtures/battle-atlas.cjs').createFixture({actualBounds:true,emptyGame:true});
const bodies=h=>[...new Map(h.cv.context.counters.map(b=>[b.id,b])).values()];
const geo=h=>simple(h.ctrl.unitStates().map(u=>[u.id,u.point,u.renderedPoint,u.status]));
const inFrame=(u,h)=>u.visible&&u.screenPoint&&u.screenPoint[0]>=0&&u.screenPoint[0]<=h.ctrl.viewport().W&&u.screenPoint[1]>=0&&u.screenPoint[1]<=h.ctrl.viewport().H;
function sizes(h,width){
 const narrow=width<560,base=narrow?16:22,floor=narrow?14:16;
 for(const b of bodies(h)){assert.ok(b.w>=floor-1e-8&&b.w<=base+1e-8);assert.ok(Math.abs(b.h/b.w-(narrow?11/16:15/22))<1e-8);}
 for(const f of h.cv.context.faces){assert.ok(f.w>=16&&f.w<=(narrow?16:24));assert.equal(f.w%2,0,'portrait radii stay in a bounded cache key set');assert.equal(f.h,f.w);}
 for(const f of h.cv.context.flags)assert.ok(f.k>=(narrow?.55:.7)&&f.k<=(narrow?.55:1));
}
(async()=>{
 const rows=[];let frames=0,reduced=0,fullSize=0;
 for(const title of Object.keys(TK.BATTLES))for(const width of [335,940]){
  const h=await make(title,width);let count=0;
  try{for(let vi=0;vi<Math.max(1,h.views().length);vi++){
   if(h.views().length)h.views()[vi].onclick();
   for(const t of [0,25,50,75,100]){h.ctrl.seek(t);counters(h,TK.BATTLES[title]);sizes(h,width);frames++;count++;
    for(const b of bodies(h)){if(b.w<(width<560?16:22)-1e-8)reduced++;else fullSize++;}
   }
  }}finally{h.ctrl.destroy();}
  rows.push({title,width,frames:count});
 }
 assert.ok(reduced>0,'crowded units use smaller bodies');assert.ok(fullSize>0,'uncrowded units keep their size');
 let selections=0,coincidentSelections=0,views=0;
 for(const title of ['関ヶ原の戦い','伏見城の戦い','長篠の戦い','大坂冬の陣','大坂夏の陣'])for(const width of [335,940]){
  const h=await make(title,width);
  try{for(let vi=0;vi<Math.max(1,h.views().length);vi++){
   if(h.views().length)h.views()[vi].onclick();views++;h.ctrl.seek(50);
   for(const u of h.ctrl.unitStates().filter(u=>inFrame(u,h))){
    const before=geo(h),beforeSizes=new Map(bodies(h).map(b=>[b.id,b.w]));h.ctrl.select(u.id);assert.deepEqual(geo(h),before,'selecting cannot move any unit');assert.equal(choices(h).find(b=>b.dataset.unitId===u.id)?.getAttribute('aria-pressed'),'true','unit-ID selection also marks its button');counters(h,TK.BATTLES[title]);sizes(h,width);
    const ctx=h.cv.context,body=bodies(h).at(-1),matching=(TK.BATTLES[title].atlasGroups||[]).flatMap(g=>g.members.map((id,i)=>[id,g.id+'-'+i])).find(x=>x[0]===u.id)?.[1]||'est-'+u.id;
    assert.equal(body.id,matching,'selected body is last');assert.equal(body.w,beforeSizes.get(matching),'selection preserves density size');
    const face=ctx.faces.findLast(f=>f.id===matching),flag=ctx.flags.findLast(f=>f.id===matching),button=choices(h).find(b=>b.dataset.unitId===u.id);
    assert.ok(face||button.children.some(el=>el.tag==='img'&&el.width===28),'selected commander portrait remains on map, annotation or individual record');
    if(flag){if(face)assert.equal(face.w,16,'selected name keeps its readable portrait');assert.equal(flag.k,Math.max(width<560?.55:.7,(width<560?.55:1)*body.w/(width<560?16:22)));}
    else if(face)assert.equal(face.w,16,'annotation portraits keep a readable common size');
    assert.equal(new Set(ctx.flags.map(f=>f.id)).size,ctx.flags.length,'a troop does not repeat its map flag');
    const geometry=JSON.stringify({states:h.ctrl.unitStates(),bodies:bodies(h).map(b=>[b.id,b.w,b.h]),boxes:h.ctrl.testBoxes()});
    h.ctrl.pause();h.ctrl.seek(50);assert.equal(JSON.stringify({states:h.ctrl.unitStates(),bodies:bodies(h).map(b=>[b.id,b.w,b.h]),boxes:h.ctrl.testBoxes()}),geometry,'pause and seek keep deterministic size and location');
    const peers=h.ctrl.unitStates().filter(v=>inFrame(v,h)&&Math.hypot(v.screenPoint[0]-u.screenPoint[0],v.screenPoint[1]-u.screenPoint[1])<1e-8);
    if(peers.length>1){h.cv.listeners.click({clientX:u.screenPoint[0],clientY:u.screenPoint[1]});const ids=choices(h).map(e=>e.dataset.unitId);for(const p of peers)assert.ok(ids.includes(p.id),'coincident unit remains selectable: '+p.id);coincidentSelections++;}
    selections++;
   }
  }}finally{h.ctrl.destroy();}
 }
 assert.ok(coincidentSelections>0,'exactly coincident selection regression exercised');
 let focusChecks=0;
 for(const title of ['関ヶ原の戦い','長篠の戦い','大坂冬の陣','大坂夏の陣'])for(const width of [335,940]){
  const h=await make(title,width);try{h.ctrl.seek(50);const u=h.ctrl.unitStates().find(u=>inFrame(u,h));assert.ok(u);h.ctrl.select(u.id);const before=geo(h),time=h.ctrl.t;
   const panel=h.stage.querySelector('.atlas-selection'),ids=choices(h).map(b=>b.dataset.unitId),focus=panel.children[0].children.find(b=>b.textContent==='この周辺を見る');assert.ok(focus);focus.onclick();assert.deepEqual(geo(h),before);assert.equal(h.ctrl.t,time);assert.deepEqual(choices(h).map(b=>b.dataset.unitId),ids);assert.ok(h.ctrl.viewport().VS>=2&&h.ctrl.viewport().VS<=6);counters(h,TK.BATTLES[title]);sizes(h,width);
   h.views()[0].onclick();assert.equal(h.ctrl.viewport().VS,1);assert.equal(h.ctrl.t,time);assert.deepEqual(geo(h),before);focusChecks++;
  }finally{h.ctrl.destroy();}
 }

 // A remote label overlapping a troop center must not hijack that troop's click.
 const title='density-click-and-fade';TK.BATTLE_ATLAS[title]={file:'fixture.json',bounds:[0,1,1,0],points:[],geo:[.5,.5]};
 TK.BATTLES[title]={title,units:[{id:'a',g:'退場する隊',side:'a',die:20},{id:'b',g:'別の隊',side:'b'}],atlasGroups:[{id:'a',side:'a',point:[.2,.5],members:['a']},{id:'b',side:'b',point:[.8,.5],members:['b']}],beats:[]};
 const fixture=await make(title,940);try{
  fixture.ctrl.seek(50);fixture.ctrl.select('a');const ctx=fixture.cv.context,stroke=ctx.counterStrokes.at(-1);assert.equal(stroke.alpha,.32,'selected fallen unit keeps fade');assert.equal(ctx.faces.at(-1).alpha,.32);assert.equal(ctx.globalAlpha,1,'foreground painting restores alpha');
  const a=fixture.ctrl.unitStates().find(u=>u.id==='a'),remote={x:a.screenPoint[0]-10,y:a.screenPoint[1]-10,w:20,h:20,id:'b-0',label:true};
  fixture.ctrl.testBoxes().push(remote);fixture.cv.listeners.click({clientX:a.screenPoint[0],clientY:a.screenPoint[1]});assert.deepEqual(choices(fixture).map(e=>e.dataset.unitId),['a'],'center beats an unrelated label');
  fixture.ctrl.testBoxes().push(remote);fixture.cv.listeners.click({clientX:a.screenPoint[0]+8,clientY:a.screenPoint[1]});assert.deepEqual(choices(fixture).map(e=>e.dataset.unitId),['b'],'label outside a troop center keeps its own action');
  fixture.ctrl.select('b');assert.equal(ctx.counterStrokes.at(-1).alpha,1);assert.equal(ctx.faces.at(-1).alpha,1);assert.equal(ctx.globalAlpha,1);
 }finally{fixture.ctrl.destroy();}

 {const focus=h=>{const header=h.stage.querySelector('.atlas-selection').children[0];header.children.find(b=>b.textContent==='この周辺を見る').onclick();};const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));for(const width of [335,940]){const h=await make('関ヶ原の戦い',width);h.ctrl.seek(50);const original=geo(h),time=h.ctrl.t,units=h.ctrl.unitStates().filter(u=>u.visible&&u.screenPoint);h.ctrl.setViewport(6,0,0);h.ctrl.select(units[0].id);focus(h);const a=h.ctrl.viewport();
const target=units.reduce((best,u)=>Math.hypot(u.screenPoint[0]-units[0].screenPoint[0],u.screenPoint[1]-units[0].screenPoint[1])>Math.hypot(best.screenPoint[0]-units[0].screenPoint[0],best.screenPoint[1]-units[0].screenPoint[1])?u:best,units[0]);h.ctrl.select(target.id);focus(h);const b=h.ctrl.viewport();assert.equal(b.VS,6);assert.ok(Math.hypot(a.VX-b.VX,a.VY-b.VY)>1,'at maximum zoom another unit recenters');assert.equal(h.ctrl.testSelected(),target.id);assert.equal(h.ctrl.t,time);assert.deepEqual(geo(h),original);
h.resize(width===335?940:335);const v=h.ctrl.viewport(),at=h.ctrl.unitStates().find(u=>u.id===target.id);assert.equal(v.VS,6);assert.equal(h.ctrl.testSelected(),target.id);assert.equal(h.ctrl.t,time);assert.deepEqual(geo(h),original);const base=[target.screenPoint[0]/width*v.W,target.screenPoint[1]/(a.H)*v.H];assert.ok(Math.abs(v.VX-clamp(base[0]*6-v.W/2,0,v.W*5))<1e-7);assert.ok(Math.abs(v.VY-clamp(base[1]*6-v.H/2,0,v.H*5))<1e-7);assert.ok(h.views().some(v=>v.textContent==='選択部隊の周辺'));h.ctrl.destroy();}}
 let estimatedFocusChecks=0;
 {const title='__estimated_focus_fixture__';TK.BATTLE_ATLAS[title]={bounds:[0,1,1,0],geo:[.5,.5],points:[]};TK.BATTLES[title]={title,units:[{id:'a',g:'記録点',side:'a'},{id:'b',g:'推定点',side:'b'},{id:'c',g:'未配置',side:'b'}],atlasGroups:[{id:'a',point:[.2,.5],members:['a'],side:'a'},{id:'b',members:['b'],side:'b'},{id:'c',members:['c'],side:'b'}],beats:[]};
  const h=await make(title,940),old=c.TKBattleMotion.plan;try{c.TKBattleMotion.plan=(sc,base,w,ht)=>({placed:new Set(['b']),estimated:new Set(['b']),pos:id=>id==='b'?[w*.8,ht*.5]:null,basis:'test'});h.ctrl.setViewport(1,0,0);h.ctrl.seek(50);h.ctrl.select('b');
   const focus=()=>h.stage.querySelector('.atlas-selection').children[0].children.find(b=>b.textContent==='この周辺を見る').onclick();focus();assert.ok(h.ctrl.viewport().VS>=2,'API selection focuses estimated placement');estimatedFocusChecks++;const scale=h.ctrl.viewport().VS,time=h.ctrl.t;
   h.resize(335);assert.equal(h.ctrl.viewport().VS,scale,'estimated group keeps local view on resize');assert.equal(h.ctrl.t,time);assert.equal(h.ctrl.testSelected(),'b');assert.ok(h.views().some(v=>v.textContent==='選択部隊の周辺'));
   const before=simple(h.ctrl.viewport());h.ctrl.select('c');focus();assert.deepEqual(simple(h.ctrl.viewport()),before,'unplaced unit cannot invent a focus point');
  }finally{c.TKBattleMotion.plan=old;h.ctrl.destroy();}
 }
 assert.ok(estimatedFocusChecks>0,'estimated placement focus is exercised');
 const result={estimatedFocusChecks,focusChecks,frames,reduced,fullSize,selections,coincidentSelections,views,rows,fadeRestored:true,centerLabelPriority:true,limits:['Canvas mock, fixed times and empty game context; no browser or historical-source verification.','Exact coincidence is handled by individual selection, not separated by invented positions.']};
 if(process.env.GAME_TEST_OUTPUT){const out=path.resolve(process.env.GAME_TEST_OUTPUT);fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'density.json'),JSON.stringify(result,null,2)+'\n');}
 console.log(`PASS: ${frames} frames; ${selections} selected units and ${coincidentSelections} coincident choices; fixed positions, readable size floors, foreground selection and bounded portrait sizes`);
})().catch(e=>{console.error(e);process.exitCode=1;});
