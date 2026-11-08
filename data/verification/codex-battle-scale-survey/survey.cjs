/* Canvas command recorder: no browser, no game start, no daily simulation.
   Text metrics are deterministic approximations; actual glyph appearance remains a browser acceptance check. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const ROOT='/Users/masudaso/.codex/worktrees/history-cube-query/天下分け目の国絵図';
const c=require('/Users/masudaso/.codex/worktrees/history-cube-query/天下分け目の国絵図/tools/checks/history-focus.cjs').model();
const {TK,G}=c;
// Explicit display fixture: 11 km frame. This is not an assertion of the battle boundary.
const TAKATENJIN_BOUNDS=[137.98111632074472,34.740754030237156,138.10131617925526,34.671584069762844];
// Keep actual atlas bounds for the scale survey.
const fixedMotion=fs.readFileSync(path.join(ROOT,'kuniezu/static/kuniezu/battle-motion.js'),'utf8');
const fixedAtlas=fs.readFileSync(process.env.BATTLE_ATLAS_CANDIDATE,'utf8');
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
G.date=()=>({y:1600});G.CN=k=>TK.CLANS[k]?.n||k;G.ROADS=[];G.armyCrestKey=()=>null;G.kamonImage=()=>null;
G.S=()=>({clans:{}});
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
 const src=fixedAtlas.replace('return {...controller,play(){','return {sampleAt(v){t=v;return this.unitStates();},testSelected:()=>selected,testBoxes:()=>boxes,testGroups:()=>groups,viewport:()=>({W,H,VS,VX,VY}),setViewport(s,x,y){VS=s;VX=x;VY=y;motion=null;backdrop();frameDraw();},...controller,play(){');
 assert.ok(src.includes('setViewport(s,x,y)'));vm.runInContext(src,c);
 stage=new Element('stage');const parent=new Element('parent');parent.width=width;
 const cv=new Element('canvas');cv.parentElement=parent;
 const faceCalls=[];const ctrl=c.TKBattleAtlas.make(cv,TK.BATTLES[title],{title,face:(name,size,color)=>{faceCalls.push({name,size,color});return {face:true,toDataURL:()=>'data:image/png;base64,'+Buffer.from(color||'').toString('base64')};}});
 await new Promise(resolve=>setImmediate(resolve));
 return {cv,ctrl,stage,faceCalls,resize(width){parent.width=width;observer();},views(){const children=stage.querySelector('.atlas-views')?.children||[];return children.flatMap(e=>e.tag==='select'?e.children.filter(o=>o.value!=='').map(o=>({textContent:o.textContent,onclick(){e.value=o.value;e.onchange();}})):[e]);}};
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


const crypto=require('crypto');
const sourceFolder=path.join(ROOT,'kuniezu/static/kuniezu');const sourceHashes=()=>Object.fromEntries(fs.readdirSync(sourceFolder).filter(n=>n.endsWith('.js')).sort().map(n=>[n,crypto.createHash('sha256').update(fs.readFileSync(path.join(sourceFolder,n))).digest('hex')]));
const hashes=sourceHashes(),rad=d=>d*Math.PI/180;
function km(a,b){const x=rad(b[1]-a[1]),y=rad(b[0]-a[0]),q=Math.sin(x/2)**2+Math.cos(rad(a[1]))*Math.cos(rad(b[1]))*Math.sin(y/2)**2;return 12742.0176*Math.asin(Math.min(1,Math.sqrt(q)));}
const rounded=x=>Math.round(x*1000)/1000;
function metrics(points){const ps=[...new Map(points.filter(p=>p&&p.length===2&&p.every(Number.isFinite)).map(p=>[p.join(','),p])).values()];if(!ps.length)return null;const xs=ps.map(p=>p[0]),ys=ps.map(p=>p[1]),w=Math.min(...xs),e=Math.max(...xs),s=Math.min(...ys),n=Math.max(...ys),cx=(w+e)/2,cy=(s+n)/2;let max=0;for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++)max=Math.max(max,km(ps[i],ps[j]));return {bbox:[w,s,e,n].map(x=>Math.round(x*1e6)/1e6),widthKm:rounded(km([w,cy],[e,cy])),heightKm:rounded(km([cx,s],[cx,n])),maxPairKm:rounded(max)};}
(async()=>{const rows=[],errors=[];for(const title of Object.keys(TK.BATTLES)){let h;try{const sc=TK.BATTLES[title],schematic=!!(sc.atlasSchematic||sc.atlasPlan),times=new Set(Array.from({length:101},(_,i)=>i));for(const u of sc.units){for(const x of [u.from,u.until,u.die,u.rout,u.turn?.[0]])if(Number.isFinite(x)&&x>=0&&x<=100)times.add(x);const v=G.battleUnitWindow(sc,u);for(const x of [v.from,v.until])if(Number.isFinite(x)&&x>=0&&x<=100){times.add(x);if(x>0)times.add(x-1e-6);}}
const paths=TK.BATTLE_MOVEMENTS[title]||[];for(const m of paths){times.add(m.from);times.add(m.to);}
h=await make(title,940);const categories={recorded:[],estimatedMotion:[],estimatedPlacement:[]},all=[],ever=new Set();let instant=null,maxUnplaced=0,maxVisible=0;for(const t of [...times].filter(t=>t>=0&&t<=100).sort((a,b)=>a-b)){const states=h.ctrl.sampleAt(t),located=[];let unplaced=0,visible=0;for(const u of states){if(!u.visible)continue;visible++;if(schematic){ever.add(u.id);continue;}const p=u.renderedPoint;if(!p){unplaced++;continue;}ever.add(u.id);located.push(p);all.push(p);const k=u.positionBasis==='recorded'?'recorded':u.positionBasis==='estimated-placement'?'estimatedPlacement':'estimatedMotion';categories[k].push(p);}maxVisible=Math.max(maxVisible,visible);maxUnplaced=Math.max(maxUnplaced,unplaced);if(!schematic){const v=metrics(located);if(v&&(!instant||v.maxPairKm>instant.maxPairKm))instant={at:rounded(t),...v};}}
const tr=sc.units.map(u=>u.tr).filter(n=>Number.isFinite(n)&&n>0),anchors=(sc.atlasGroups||[]).filter(g=>g.point).map(g=>g.point);rows.push({title,mode:schematic?'schematic':'geographic',units:sc.units.length,knownTroopUnits:tr.length,knownTroops:tr.length?tr.reduce((a,b)=>a+b,0):null,unplacedEver:schematic?null:sc.units.length-ever.size,maxVisibleUnplaced:schematic?null:maxUnplaced,maxVisibleUnits:maxVisible,samples:times.size,allTime:schematic?null:metrics(all),maxInstant:schematic?null:instant,recorded:schematic?null:metrics(categories.recorded),estimatedMotion:schematic?null:metrics(categories.estimatedMotion),estimatedPlacement:schematic?null:metrics(categories.estimatedPlacement),sourceAnchors:schematic?null:metrics(anchors),phaseReference:schematic?null:metrics(paths.flatMap(m=>m.points)),phasePaths:paths.length});}catch(e){errors.push({title,error:String(e),stack:e.stack});}finally{h?.ctrl.destroy();}}
assert.deepEqual(sourceHashes(),hashes,'source changed during survey');const out={schema:1,sourceSha256:hashes,sourceSnapshotSha256:crypto.createHash('sha256').update(JSON.stringify(hashes)).digest('hex'),scope:'Display-space survey in actual longitude/latitude km; not historical classification or full history validation',method:{sampling:'0..100 normalized replay at1-point intervals plus exact declared/window boundaries and immediately-before exit; no game-day interpretation',visibility:'Only concurrently visible units contribute to an instant. allTime unions those instants and is never called simultaneous.',distance:'Great-circle sphere radius6371.0088km, diagnostic approximation. bbox width at midlatitude/height at midlongitude; maxPair sampled positions only. Display3decimal rounding is not historical accuracy.',context:'No active game state; opponent-home lookup returns null. Estimated placement/motion may differ in a running save. Recorded anchors and explicit phase reference retained separately.',schematic:'Geographic metrics=null, never0km.',samplingLimit:'Sampled maxima are lower bounds;1 replay-point intervals can miss continuous wobble extrema. Explicit phase source vertices are separately reported, not promoted into recorded concurrent positions.',thresholds:'No small/medium/large thresholds inferred. Unknown troops are not zero. No new source claims.'},counts:{titles:Object.keys(TK.BATTLES).length,rows:rows.length,geographic:rows.filter(r=>r.mode==='geographic').length,schematic:rows.filter(r=>r.mode==='schematic').length,errors:errors.length},rows,errors};fs.writeFileSync('/tmp/kuniezu-battle-scale-survey/summary.json',JSON.stringify(out));console.log(JSON.stringify(out.counts));})().catch(e=>{console.error(e);process.exitCode=1});
