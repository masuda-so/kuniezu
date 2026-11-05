/* Canvas command recorder: no browser, no game start, no daily simulation.
   Text metrics are deterministic approximations; actual glyph appearance remains a browser acceptance check. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'../..');
const c=require('./history-focus.cjs').model();
const {TK,G}=c;
// Explicit display fixture: 11 km frame. This is not an assertion of the battle boundary.
const TAKATENJIN_BOUNDS=[137.98111632074472,34.740754030237156,138.10131617925526,34.671584069762844];
TK.BATTLE_ATLAS['高天神城の戦い']={...TK.BATTLE_ATLAS['高天神城の戦い'],bounds:TAKATENJIN_BOUNDS};
const fixedMotion=fs.readFileSync(path.join(ROOT,'kuniezu/static/kuniezu/battle-motion.js'),'utf8');
const fixedAtlas=fs.readFileSync(path.join(ROOT,'kuniezu/static/kuniezu/battle-atlas.js'),'utf8');
const simple=x=>JSON.parse(JSON.stringify(x));
let activeId=null,observer,stage;
class Context{
 constructor(){this.font='12px serif';this.textAlign='left';this.textBaseline='middle';this.m=[1,0,0,1,0,0];this.stack=[];this.lineDash=[];this.reset();}
 reset(){this.counters=[];this.counterStrokes=[];this.counterFills=[];this.rectStrokes=[];this.flags=[];this.faces=[];this.texts=[];}
 save(){this.stack.push({m:this.m.slice(),font:this.font,textAlign:this.textAlign,textBaseline:this.textBaseline,lineDash:this.lineDash.slice(),strokeStyle:this.strokeStyle,fillStyle:this.fillStyle,lineWidth:this.lineWidth});}
 restore(){Object.assign(this,this.stack.pop()||{});}
 setTransform(a,b,c,d,e,f){this.m=[a,b,c,d,e,f];}
 translate(x,y){const m=this.m;m[4]+=m[0]*x+m[2]*y;m[5]+=m[1]*x+m[3]*y;}
 scale(x,y){this.m[0]*=x;this.m[1]*=x;this.m[2]*=y;this.m[3]*=y;}
 rotate(a){const [aa,b,cc,d,e,f]=this.m,co=Math.cos(a),si=Math.sin(a);this.m=[aa*co+cc*si,b*co+d*si,cc*co-aa*si,d*co-b*si,e,f];}
 measureText(s){return {width:Array.from(String(s)).length*(Number(this.font.match(/([\d.]+)px/)?.[1])||12)};}
 fillText(text,x,y,maxWidth){const size=Number(this.font.match(/([\d.]+)px/)?.[1])||12,width=Math.min(this.measureText(text).width,maxWidth??Infinity);this.texts.push({text,x,y,width,size,align:this.textAlign});}
 drawImage(im,x,y,w,h){if(im.face)this.faces.push({id:activeId,x,y,w,h});else if(im.context)this.texts.push(...im.context.texts);}
 clearRect(){this.reset();}
 createLinearGradient(){return {addColorStop(){}};}
 beginPath(){this.counterPath=null;}closePath(){}moveTo(){}lineTo(){}arc(){}rect(){}clip(){}fill(){if(this.counterPath)this.counterFills.push({id:this.counterPath,color:this.fillStyle});}stroke(){if(this.counterPath)this.counterStrokes.push({id:this.counterPath,color:this.strokeStyle,width:this.lineWidth,dash:this.lineDash.slice()});}fillRect(){}strokeRect(){this.rectStrokes.push(this.lineDash.slice());}strokeText(){}setLineDash(dash){this.lineDash=Array.from(dash);}quadraticCurveTo(){}bezierCurveTo(){}
}
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.style={};this.dataset={};this.classList={toggle(){}};if(tag==='canvas')this.context=new Context();}
 getContext(){return this.context;}
 setAttribute(){}append(...xs){this.children.push(...xs);}replaceChildren(...xs){this.replaceCount=(this.replaceCount||0)+1;this.children=xs;}
 addEventListener(type,fn){(this.listeners??={})[type]=fn;}removeEventListener(type){delete this.listeners?.[type];}remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(x=>x!==this);}
 getBoundingClientRect(){return this.tag==='parent'?{width:this.width,top:0}:{width:parseFloat(this.style.width)||this.width||0,height:parseFloat(this.style.height)||this.height||0,left:0,top:0};}
 closest(){return stage;}
 querySelector(q){if(q==='.battle-dock')return {getBoundingClientRect:()=>({height:110})};if(q==='.atlas-selection')return this.selection||(this.selection=new Element('selection'));if(q==='.atlas-views')return this.children.find(x=>x.className==='atlas-views')||null;return null;}
 insertBefore(e){e.parentElement=this;this.children.unshift(e);}
}
c.document={createElement:tag=>new Element(tag)};
c.Path2D=class{moveTo(){}lineTo(){}closePath(){}rect(){}addPath(){}};
c.innerHeight=10000;c.devicePixelRatio=1;c.performance={now:()=>0};c.requestAnimationFrame=()=>1;c.cancelAnimationFrame=()=>{};
c.ResizeObserver=class{constructor(fn){observer=fn;}observe(){}disconnect(){}};
c.atob=s=>Buffer.from(s,'base64').toString('binary');
c.fetch=async()=>({ok:true,json:async()=>({width:2,height:2,heights:Buffer.from([0,128,0,128,0,128,0,128]).toString('base64'),comparisonRivers:[]})});
G.date=()=>({y:1600});G.ROADS=[];G.armyCrestKey=()=>null;G.kamonImage=()=>null;
G.S=()=>({clans:{tokugawa:{cap:'hamamatsu'},takeda:{cap:'tsutsujigasaki'},oda:{cap:'kiyosu'}}});
c.TKGEO.land=[];c.TKGEO.lakes=[];c.TKGEO.rivers=[];TK.HISTORIC_WATERS=[];TK.REGIONAL_RIVERS=[];TK.KOREAN_RIVERS_DETAIL=[];TK.periodWaters=()=>[];
c.TKCounter={path(ctx){ctx.counterPath=activeId;ctx.counters.push({id:activeId,p:[ctx.m[4],ctx.m[5]]});}};
c.TKBattleEffects={create:()=>({heading(id,a){activeId=id;return a;},flag(ctx,x,y,k){ctx.flags.push({id:activeId,x,y,k,dash:ctx.lineDash.slice()});},rnd:()=>1,spawn(){},cross(){},trail(){},clash(){},ring(){},step(){},draw(){},weather(){},clear(){},count:0})};
c.TKBattlePresentation={record(cv,sc,opt){let t=0;return {get t(){return t;},get playing(){return false;},get ended(){return t>=100;},seek(v){t=v;opt.onProgress(v);},pause(){},play(){},destroy(){}};}};
const distance=(a,b)=>Math.hypot((a[0]-b[0])*111.32*Math.cos((a[1]+b[1])*Math.PI/360),(a[1]-b[1])*111.32);
const world=(p,v,b)=>[b[0]+(p[0]+v.VX)/(v.W*v.VS)*(b[2]-b[0]),b[1]-(p[1]+v.VY)/(v.H*v.VS)*(b[1]-b[3])];
const rows=[];
async function make(title,width){
 vm.runInContext(fixedMotion,c);
 // Probe is inserted only in this test VM, not in the production source.
 const src=fixedAtlas.replace('return {...controller,play(){','return {testSelected:()=>selected,testBoxes:()=>boxes,viewport:()=>({W,H,VS,VX,VY}),setViewport(s,x,y){VS=s;VX=x;VY=y;motion=null;backdrop();frameDraw();},...controller,play(){');
 assert.ok(src.includes('setViewport(s,x,y)'));vm.runInContext(src,c);
 stage=new Element('stage');const parent=new Element('parent');parent.width=width;
 const cv=new Element('canvas');cv.parentElement=parent;
 const faceCalls=[];const ctrl=c.TKBattleAtlas.make(cv,TK.BATTLES[title],{title,face:(name,size,color)=>{faceCalls.push({name,size,color});return {face:true,toDataURL:()=>'data:image/png;base64,'+Buffer.from(color||'').toString('base64')};}});
 await new Promise(resolve=>setImmediate(resolve));
 return {cv,ctrl,stage,faceCalls,resize(width){parent.width=width;observer();},views(){return stage.querySelector('.atlas-views')?.children||[];}};
}
function decorations(h,title){
 const {W,H}=h.ctrl.viewport(),ctx=h.cv.context;
 for(const f of ctx.faces)assert.ok(f.x>=0&&f.y>=0&&f.x+f.w<=W&&f.y+f.h<=H,title+' face clipped '+JSON.stringify(f));
 for(const f of ctx.flags)assert.ok(f.x-2*f.k>=0&&f.x+18*f.k+1<=W&&f.y-41*f.k-1>=0&&f.y+10*f.k+1<=H,title+' flag clipped '+JSON.stringify(f));
 for(const tx of ctx.texts){if(tx.text.includes('点線の軌跡'))continue;const left=tx.align==='center'?tx.x-tx.width/2:tx.align==='right'?tx.x-tx.width:tx.x;assert.ok(left>=-1e-6&&left+tx.width<=W+1e-6&&tx.y-tx.size/2>=-1e-6&&tx.y+tx.size/2<=H+1e-6,title+' text clipped '+JSON.stringify(tx));}
}
function counters(h,sc){
 const states=h.ctrl.unitStates(),byUnit=new Map(states.map(u=>[u.id,u])),byId=new Map(),drawn=new Set(),{W,H}=h.ctrl.viewport();
 for(const g of sc.atlasGroups||[])g.members.forEach((id,i)=>byId.set(g.id+'-'+i,byUnit.get(id)));
 for(const u of states)byId.set('est-'+u.id,u);
 let checked=0;
 for(const item of h.cv.context.counters){const u=byId.get(item.id);assert.ok(u,'unmapped drawn counter '+item.id);assert.ok(u.screenPoint);assert.ok(Math.hypot(item.p[0]-u.screenPoint[0],item.p[1]-u.screenPoint[1])<1e-8,'counter body displaced '+item.id);drawn.add(u.id);checked++;}
 for(const stroke of h.cv.context.counterStrokes)assert.deepEqual(stroke.dash,stroke.id.startsWith('est-')?[3,2]:[],'only inferred placement is dashed '+stroke.id);
 assert.equal(h.cv.context.counterStrokes.length,drawn.size,'one body outline per drawn unit');
 assert.deepEqual(h.cv.context.lineDash,[],'counter dash does not escape its saved context');for(const flag of h.cv.context.flags)assert.deepEqual(flag.dash,[],'flag dash unchanged');for(const dash of h.cv.context.rectStrokes)assert.deepEqual(dash,[],'label border dash unchanged');
 const expected=states.filter(u=>u.visible&&u.screenPoint&&u.screenPoint[0]>=0&&u.screenPoint[0]<=W&&u.screenPoint[1]>=0&&u.screenPoint[1]<=H).map(u=>u.id).sort();
 assert.deepEqual([...drawn].sort(),simple(expected),'all and only visible in-frame troop bodies are drawn');
 return checked;
}
function choices(h){return (h.stage.selection?.children||[]).filter(x=>x.dataset?.unitId);}
function clickBody(h,id){const body=h.cv.context.counters.find(x=>x.id===id);assert.ok(body,'body exists '+id);h.cv.listeners.click({clientX:body.p[0],clientY:body.p[1]});}
function clickLabel(h,id){const box=h.ctrl.testBoxes().find(x=>x.id===id&&x.label);assert.ok(box,'label exists '+id);h.cv.listeners.click({clientX:box.x+box.w/2,clientY:box.y+box.h/2});}

(async()=>{
 for(const title of ['関ヶ原の戦い','高天神城の戦い']){
  const h=await make(title,940),sc=TK.BATTLES[title],bounds=TK.BATTLE_ATLAS[title].bounds,reference=new Map();let maxKm=0,bodyChecks=0,frameCount=0,offscreen=0;const held=title==='関ヶ原の戦い'?['mori','kikkawa','ankokuji','chosokabe','roster-長束正家']:[];
  for(const t of [0,20,50,80,100]){
   h.resize(940);h.ctrl.setViewport(1,0,0);h.ctrl.seek(t);for(const u of h.ctrl.unitStates())reference.set(t+'|'+u.id,u.renderedPoint);
   for(const width of [940,390,335,240]){
    h.resize(width);const {W,H}=h.ctrl.viewport();
    for(const [scale,ox,oy] of [[1,0,0],[1.8,.27,.2],[3.5,.8,.5]]){
     h.ctrl.setViewport(scale,W*ox,H*oy);h.ctrl.seek(t);const v=h.ctrl.viewport();
     for(const u of h.ctrl.unitStates()){
      const expected=reference.get(t+'|'+u.id);if(!expected)continue;
      const inverse=world(u.screenPoint,v,bounds);if(held.includes(u.id))assert.ok(distance(inverse,reference.get('0|'+u.id))<1e-8,'held unit remains at its initial point '+u.id);maxKm=Math.max(maxKm,distance(inverse,expected));assert.ok(distance(inverse,expected)<1e-8,title+' changed geography '+u.id);
      if(u.positionBasis==='recorded')assert.ok(distance(inverse,u.point)<1e-8,'recorded point changed');
      if(u.screenPoint[0]<0||u.screenPoint[0]>W||u.screenPoint[1]<0||u.screenPoint[1]>H)offscreen++;
     }
     bodyChecks+=counters(h,sc);decorations(h,title);frameCount++;
    }
   }
  }
  h.resize(335);h.ctrl.setViewport(1,0,0);h.ctrl.seek(20);
  if(title==='高天神城の戦い'){const txt=h.cv.context.texts.find(x=>x.text==='三井山砦');assert.ok(txt,'Mitsui label present');assert.ok(txt.y+txt.size/2<h.ctrl.viewport().H,'Mitsui label bottom safe');}
  assert.equal(frameCount,60);assert.ok(bodyChecks>0,title+' must draw troop counters');
  rows.push({title,frames:frameCount,bodyChecks,maxGeographicDifferenceKm:maxKm,offscreenStatesPreserved:offscreen,heldUnits:held});h.ctrl.destroy();
 }
 const schematic=await make('木津川口の戦い',335);schematic.ctrl.seek(80);const s=schematic.ctrl.unitStates();assert.ok(s.length>0&&s.every(u=>u.renderedPoint===null&&u.positionBasis==='schematic'));decorations(schematic,'木津川口模式図');assert.ok(counters(schematic,TK.BATTLES['木津川口の戦い'])>0);schematic.ctrl.destroy();
 // A sole group near each edge: body anchors remain exact; annotations fit; no hidden opposite-side assumptions.
 const fixtureTitle='viewport-edge-fixture';TK.BATTLE_ATLAS[fixtureTitle]={file:'fixture.json',bounds:[0,1,1,0],points:[{name:'下端地名',lon:.5,lat:.001}],geo:[.5,.5],label:'fixture'};
 TK.BATTLES[fixtureTitle]={title:fixtureTitle,units:[{id:'nw',g:'北西の隊',side:'a'},{id:'se',g:'南東の隊',side:'a'},{id:'se2',g:'同地点の隊',side:'a'}],atlasGroups:[{id:'nw',side:'a',point:[.001,.999],members:['nw']},{id:'se',side:'a',point:[.999,.001],members:['se','se2']}],beats:[]};
 const edge=await make(fixtureTitle,240);edge.ctrl.seek(20);decorations(edge,'edge fixture');counters(edge,TK.BATTLES[fixtureTitle]);const edgeStates=edge.ctrl.unitStates();assert.deepEqual(simple(edgeStates[1].screenPoint),simple(edgeStates[2].screenPoint),'overlap not displaced');edge.ctrl.destroy();
 const oneSide='one-side-fixture';TK.BATTLE_ATLAS[oneSide]={file:'one-side.json',bounds:[0,1,1,0],points:[],geo:[.5,.5],label:'fixture'};
 TK.BATTLES[oneSide]={title:oneSide,sides:{a:{clan:'tokugawa'},b:{clan:'takeda'}},units:[{id:'a',g:'既知地点',side:'a'},{id:'b',g:'推定の側',side:'b'}],atlasGroups:[{id:'a',side:'a',point:[.5,.5],members:['a']},{id:'b',side:'b',point:null,members:['b']}],beats:[[30,'',['a','b']]]};
 const one=await make(oneSide,940);one.ctrl.seek(50);const assumed=one.ctrl.unitStates().find(x=>x.id==='b');assert.equal(assumed.positionBasis,'estimated-placement');assert.ok(assumed.renderedPoint);assert.equal(assumed.point,null);assert.ok(counters(one,TK.BATTLES[oneSide])>0);
 clickBody(one,'est-b');assert.deepEqual(choices(one).map(x=>x.dataset.unitId),['b'],'estimated body selects its unit');
 clickLabel(one,'est-b');assert.deepEqual(choices(one).map(x=>x.dataset.unitId),['b'],'estimated label selects its unit');
 choices(one)[0].onclick();assert.equal(one.ctrl.testSelected(),'est-b');assert.equal(one.ctrl.unitStates().find(x=>x.id==='b').point,null);assert.equal(one.ctrl.unitStates().find(x=>x.id==='b').positionBasis,'estimated-placement');
 one.ctrl.select('b');assert.deepEqual(choices(one).map(x=>x.dataset.unitId),['b'],'existing public selection API remains valid');
 one.resize(335);one.ctrl.setViewport(2.3,20,30);one.ctrl.seek(50);const resizedAssumed=one.ctrl.unitStates().find(x=>x.id==='b');assert.ok(distance(assumed.renderedPoint,resizedAssumed.renderedPoint)<1e-8,'estimated placement remains view independent');counters(one,TK.BATTLES[oneSide]);one.ctrl.destroy();

 // Actual registered click handler and choice buttons, including mixed recorded/estimated overlap.
 const overlap='coincident-selection-fixture';TK.BATTLE_ATLAS[overlap]={file:'overlap.json',bounds:[0,1,1,0],points:[],geo:[.5,.5],label:'fixture'};
 TK.BATTLES[overlap]={title:overlap,units:[{id:'a',g:'同地点甲',side:'a'},{id:'b',g:'同地点乙',side:'a'}],atlasGroups:[{id:'both',side:'a',point:[.5,.5],members:['a','b']}],beats:[]};
 const same=await make(overlap,390);same.ctrl.seek(20);const sameBefore=simple(same.ctrl.unitStates());clickBody(same,'both-0');assert.deepEqual(choices(same).map(x=>x.dataset.unitId),['a','b']);
 for(const button of choices(same)){button.onclick();assert.deepEqual(simple(same.ctrl.unitStates()),sameBefore,'selection never displaces bodies');}counters(same,TK.BATTLES[overlap]);same.ctrl.destroy();
 const mixed=await make(oneSide,240);mixed.ctrl.seek(50);const mixedBefore=simple(mixed.ctrl.unitStates());clickBody(mixed,'est-b');assert.deepEqual(choices(mixed).map(x=>x.dataset.unitId).sort(),['a','b'],'all nearby recorded and estimated bodies are accessible');
 for(const button of choices(mixed)){button.onclick();assert.deepEqual(simple(mixed.ctrl.unitStates()),mixedBefore);}assert.equal(mixed.ctrl.unitStates().find(x=>x.id==='b').point,null);counters(mixed,TK.BATTLES[oneSide]);mixed.ctrl.destroy();
 const outside='outside-selection-fixture';TK.BATTLE_ATLAS[outside]={file:'outside.json',bounds:[0,1,1,0],points:[],geo:[.5,.5],label:'fixture'};
 TK.BATTLES[outside]={title:outside,units:[{id:'out',g:'画角外',side:'a'}],atlasGroups:[{id:'out',side:'a',point:[-.1,.5],members:['out']}],beats:[]};const out=await make(outside,390);out.ctrl.seek(20);assert.equal(counters(out,TK.BATTLES[outside]),0);assert.equal(out.cv.context.faces.length,0);assert.equal(out.cv.context.flags.length,0);assert.equal(out.ctrl.testBoxes().length,0);assert.ok(out.ctrl.unitStates()[0].screenPoint[0]<0);out.ctrl.destroy();

 const strokeStyles=[];
 for(const spec of [{name:'normal',extra:{},selected:false,fill:'#216d9f',outline:'#2a1d10'},{name:'selected',extra:{},selected:true,fill:'#216d9f',outline:'#e5ad3f'},{name:'dead',extra:{die:40},selected:false,fill:'#8a8174',outline:'#2a1d10'},{name:'turned',extra:{turn:[40,'a']},selected:false,fill:'#b47712',outline:'#2a1d10'}]){
  const title='placement-style-'+spec.name;TK.BATTLE_ATLAS[title]={...TK.BATTLE_ATLAS[oneSide],file:title+'.json'};TK.BATTLES[title]={...simple(TK.BATTLES[oneSide]),title};Object.assign(TK.BATTLES[title].units.find(u=>u.id==='b'),spec.extra);
  const h=await make(title,940);h.ctrl.seek(50);if(spec.selected)h.ctrl.select('b');counters(h,TK.BATTLES[title]);const stroke=h.cv.context.counterStrokes.find(x=>x.id==='est-b'),fill=h.cv.context.counterFills.find(x=>x.id==='est-b');assert.ok(stroke&&fill);assert.deepEqual(stroke.dash,[3,2]);assert.equal(stroke.color,spec.outline);assert.equal(fill.color,spec.fill);assert.equal(stroke.width,spec.selected?2.6:TK.BATTLES[title].beats.some(b=>b[0]<=50&&b[2]?.includes('b'))?2.4:1.7);assert.equal(h.ctrl.unitStates().find(x=>x.id==='b').point,null);strokeStyles.push({state:spec.name,dash:stroke.dash,fill:fill.color,outline:stroke.color});if(spec.name==='turned'){h.faceCalls.length=0;h.ctrl.select('b');assert.equal(h.faceCalls.find(f=>f.size===14)?.color,'#c83339','selection portrait follows the current side');}h.ctrl.destroy();
 }
 // An already open panel follows a turn without rebuilding its buttons; closed means closed.
 const turning=await make('placement-style-turned',940);turning.ctrl.seek(30);turning.ctrl.select('b');const panel=turning.stage.selection,button=choices(turning)[0],portrait=button.children.find(e=>e.tag==='img'),replaceCount=panel.replaceCount;
 const imageColor=()=>Buffer.from(portrait.src.split(',')[1],'base64').toString();assert.equal(imageColor(),'#216d9f','open before turn shows blue');assert.equal(panel.hidden,false);turning.faceCalls.length=0;
 turning.ctrl.seek(35);assert.equal(turning.faceCalls.filter(f=>f.size===14).length,0,'same side does not redraw selection portrait');
 turning.ctrl.seek(50);assert.equal(imageColor(),'#c83339','open panel updates blue to red across turn');assert.equal(turning.faceCalls.filter(f=>f.size===14).length,1,'one portrait update for turn');assert.strictEqual(choices(turning)[0],button,'choice button identity remains');assert.strictEqual(button.children.find(e=>e.tag==='img'),portrait,'image node identity remains');assert.equal(panel.replaceCount,replaceCount,'turn does not rebuild panel DOM');
 turning.ctrl.seek(50);assert.equal(turning.faceCalls.filter(f=>f.size===14).length,1,'same-time frame does not redraw selection portrait');
 turning.ctrl.seek(30);assert.equal(imageColor(),'#216d9f','reverse seek restores previous side');assert.equal(turning.faceCalls.filter(f=>f.size===14).length,2);assert.equal(panel.replaceCount,replaceCount);
 panel.children.find(e=>e.textContent==='閉じる').onclick();assert.equal(panel.hidden,true);assert.equal(turning.ctrl.testSelected(),null);turning.faceCalls.length=0;turning.ctrl.seek(50);turning.ctrl.seek(30);assert.equal(panel.hidden,true,'seek never reopens closed panel');assert.equal(turning.ctrl.testSelected(),null);assert.equal(turning.faceCalls.filter(f=>f.size===14).length,0,'closed panel does not regenerate portrait');assert.equal(panel.replaceCount,replaceCount);turning.ctrl.destroy();
 // Recorded anchors with inferred movement keep solid outlines, distinct from estimated placement.
 const moved='recorded-motion-style';TK.BATTLE_ATLAS[moved]={file:'moved.json',bounds:[0,1,1,0],points:[],geo:[.5,.5],label:'fixture'};TK.BATTLES[moved]={title:moved,units:[{id:'a',g:'記録地点甲',side:'a'},{id:'b',g:'記録地点乙',side:'b'}],atlasGroups:[{id:'a',side:'a',point:[.3,.5],members:['a']},{id:'b',side:'b',point:[.7,.5],members:['b']}],beats:[[30,'',['a','b']]]};const moving=await make(moved,940);moving.ctrl.seek(50);assert.ok(moving.ctrl.unitStates().every(u=>u.positionBasis==='estimated-motion'&&u.point));assert.ok(counters(moving,TK.BATTLES[moved])>0);assert.ok(moving.cv.context.counterStrokes.every(s=>s.dash.length===0));moving.ctrl.destroy();
 const report={passed:true,browserRun:false,newGameRun:false,dailySimulationRun:false,wholeMapDecoded:false,scope:'actual atlas draw commands for two geographic battles, one schematic, edge and one-side fixtures',rows,schematicHasNoGeographicPoint:true,estimatedPlacementDistinctFromRecordedPoint:true,edgeDecorationsInBounds:true,coincidentCountersNotDisplaced:true,estimatedBodiesChecked:true,allVisibleBodiesChecked:true,estimatedClickSelection:true,coincidentClickSelection:true,mixedClickSelection:true,offscreenBodiesNotClickable:true,estimatedPlacementStrokeStyles:strokeStyles,recordedMotionSolid:true,lineDashIsolation:true,selectionPanelFollowsTurn:true,selectionPanelReverseSeek:true,selectionPanelCloseStable:true,selectionPanelNoFrameRebuild:true,limits:['Canvas text metrics use deterministic character widths; actual font rendering needs a separate browser check.','This validates projections and draw command anchors, not historical truth of estimated motion.','Source movement geometry and historical source data were not modified.']};
 if(process.env.GAME_TEST_OUTPUT){const out=path.resolve(process.env.GAME_TEST_OUTPUT);fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'battle-viewport.json'),JSON.stringify(report,null,2)+'\n');}
 console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
