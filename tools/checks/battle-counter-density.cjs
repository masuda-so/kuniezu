/* All registered displays use real source bounds; this is a draw/selection regression,
   not verification of the historical positions or of real portrait readability. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {TK,make,counters,choices,simple}=require('./fixtures/battle-atlas.cjs').createFixture({actualBounds:true,emptyGame:true});
const bodies=h=>[...new Map(h.cv.context.counters.map(b=>[b.id,b])).values()];
const geo=h=>simple(h.ctrl.unitStates().map(u=>[u.id,u.point,u.renderedPoint,u.status]));
const inFrame=(u,h)=>u.visible&&u.screenPoint&&u.screenPoint[0]>=0&&u.screenPoint[0]<=h.ctrl.viewport().W&&u.screenPoint[1]>=0&&u.screenPoint[1]<=h.ctrl.viewport().H;
function sizes(h,width){
 const narrow=width<560,base=narrow?18:28,floor=narrow?14:18;
 for(const b of bodies(h)){assert.ok(b.w>=floor-1e-8&&b.w<=base+1e-8);assert.ok(Math.abs(b.h/b.w-(narrow?13/18:19/28))<1e-8);}
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
    for(const b of bodies(h)){if(b.w<(width<560?18:28)-1e-8)reduced++;else fullSize++;}
   }
  }}finally{h.ctrl.destroy();}
  rows.push({title,width,frames:count});
 }
 assert.ok(reduced>0,'crowded units use smaller bodies');assert.ok(fullSize>0,'uncrowded or selected units keep their size');
 let selections=0,coincidentSelections=0,views=0;
 for(const title of ['関ヶ原の戦い','伏見城の戦い','長篠の戦い','大坂冬の陣','大坂夏の陣'])for(const width of [335,940]){
  const h=await make(title,width);
  try{for(let vi=0;vi<Math.max(1,h.views().length);vi++){
   if(h.views().length)h.views()[vi].onclick();views++;h.ctrl.seek(50);
   for(const u of h.ctrl.unitStates().filter(u=>inFrame(u,h))){
    const before=geo(h);h.ctrl.select(u.id);assert.deepEqual(geo(h),before,'selecting cannot move any unit');assert.equal(choices(h).find(b=>b.dataset.unitId===u.id)?.getAttribute('aria-pressed'),'true','unit-ID selection also marks its button');counters(h,TK.BATTLES[title]);sizes(h,width);
    const ctx=h.cv.context,body=bodies(h).at(-1),matching=(TK.BATTLES[title].atlasGroups||[]).flatMap(g=>g.members.map((id,i)=>[id,g.id+'-'+i])).find(x=>x[0]===u.id)?.[1]||'est-'+u.id;
    assert.equal(body.id,matching,'selected body is last');assert.equal(body.w,width<560?18:28);
    assert.equal(ctx.faces.at(-1).id,matching);assert.equal(ctx.faces.at(-1).w,width<560?16:24);
    assert.equal(ctx.flags.at(-1).id,matching);assert.equal(ctx.flags.at(-1).k,width<560?.55:1);
    const geometry=JSON.stringify({states:h.ctrl.unitStates(),bodies:bodies(h).map(b=>[b.id,b.w,b.h]),boxes:h.ctrl.testBoxes()});
    h.ctrl.pause();h.ctrl.seek(50);assert.equal(JSON.stringify({states:h.ctrl.unitStates(),bodies:bodies(h).map(b=>[b.id,b.w,b.h]),boxes:h.ctrl.testBoxes()}),geometry,'pause and seek keep deterministic size and location');
    const peers=h.ctrl.unitStates().filter(v=>inFrame(v,h)&&Math.hypot(v.screenPoint[0]-u.screenPoint[0],v.screenPoint[1]-u.screenPoint[1])<1e-8);
    if(peers.length>1){h.cv.listeners.click({clientX:u.screenPoint[0],clientY:u.screenPoint[1]});const ids=choices(h).map(e=>e.dataset.unitId);for(const p of peers)assert.ok(ids.includes(p.id),'coincident unit remains selectable: '+p.id);coincidentSelections++;}
    selections++;
   }
  }}finally{h.ctrl.destroy();}
 }
 assert.ok(coincidentSelections>0,'exactly coincident selection regression exercised');
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
 const result={frames,reduced,fullSize,selections,coincidentSelections,views,rows,fadeRestored:true,centerLabelPriority:true,limits:['Canvas mock, fixed times and empty game context; no browser or historical-source verification.','Exact coincidence is handled by individual selection, not separated by invented positions.']};
 if(process.env.GAME_TEST_OUTPUT){const out=path.resolve(process.env.GAME_TEST_OUTPUT);fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'density.json'),JSON.stringify(result,null,2)+'\n');}
 console.log(`PASS: ${frames} frames; ${selections} selected units and ${coincidentSelections} coincident choices; fixed positions, readable size floors, foreground selection and bounded portrait sizes`);
})().catch(e=>{console.error(e);process.exitCode=1;});
