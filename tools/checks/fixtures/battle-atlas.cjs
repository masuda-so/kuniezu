/* Canvas command recorder: no browser, no game start, no daily simulation.
   Text metrics are deterministic approximations; actual glyph appearance remains a browser acceptance check. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
function createFixture({actualBounds=false,emptyGame=false}={}){
const ROOT=path.resolve(__dirname,'../../..');
const c=require('../history-focus.cjs').model();
const {TK,G}=c;
// Explicit display fixture: 11 km frame. This is not an assertion of the battle boundary.
const TAKATENJIN_BOUNDS=[137.98111632074472,34.740754030237156,138.10131617925526,34.671584069762844];
if(!actualBounds)TK.BATTLE_ATLAS['高天神城の戦い']={...TK.BATTLE_ATLAS['高天神城の戦い'],bounds:TAKATENJIN_BOUNDS};
const fixedMotion=fs.readFileSync(path.join(ROOT,'kuniezu/static/kuniezu/battle-motion.js'),'utf8');
const fixedAtlas=fs.readFileSync(path.join(ROOT,'kuniezu/static/kuniezu/battle-atlas.js'),'utf8').replace('const paintCounter=()=>{','const paintCounter=()=>{__setActive(g.id);');
const simple=x=>JSON.parse(JSON.stringify(x));
let activeId=null,observer,stage;c.__setActive=id=>{activeId=id;};
class Context{
 constructor(){this.font='12px serif';this.textAlign='left';this.textBaseline='middle';this.m=[1,0,0,1,0,0];this.stack=[];this.lineDash=[];this.globalAlpha=1;this.reset();}
 reset(){this.counters=[];this.counterStrokes=[];this.counterFills=[];this.rectStrokes=[];this.flags=[];this.faces=[];this.texts=[];}
 save(){this.stack.push({m:this.m.slice(),font:this.font,textAlign:this.textAlign,textBaseline:this.textBaseline,lineDash:this.lineDash.slice(),strokeStyle:this.strokeStyle,fillStyle:this.fillStyle,lineWidth:this.lineWidth,globalAlpha:this.globalAlpha});}
 restore(){Object.assign(this,this.stack.pop()||{});}
 setTransform(a,b,c,d,e,f){this.m=[a,b,c,d,e,f];}
 translate(x,y){const m=this.m;m[4]+=m[0]*x+m[2]*y;m[5]+=m[1]*x+m[3]*y;}
 scale(x,y){this.m[0]*=x;this.m[1]*=x;this.m[2]*=y;this.m[3]*=y;}
 rotate(a){const [aa,b,cc,d,e,f]=this.m,co=Math.cos(a),si=Math.sin(a);this.m=[aa*co+cc*si,b*co+d*si,cc*co-aa*si,d*co-b*si,e,f];}
 measureText(s){return {width:Array.from(String(s)).length*(Number(this.font.match(/([\d.]+)px/)?.[1])||12)};}
 fillText(text,x,y,maxWidth){const size=Number(this.font.match(/([\d.]+)px/)?.[1])||12,width=Math.min(this.measureText(text).width,maxWidth??Infinity);this.texts.push({text,x,y,width,size,align:this.textAlign});}
 drawImage(im,x,y,w,h){if(im.face)this.faces.push({id:activeId,x,y,w,h,alpha:this.globalAlpha});else if(im.context)this.texts.push(...im.context.texts);}
 clearRect(){this.reset();}
 createLinearGradient(){return {addColorStop(){}};}
 beginPath(){this.counterPath=null;}closePath(){}moveTo(){}lineTo(){}arc(){}rect(){}clip(){}fill(){if(this.counterPath)this.counterFills.push({id:this.counterPath,color:this.fillStyle});}stroke(){if(this.counterPath)this.counterStrokes.push({id:this.counterPath,color:this.strokeStyle,width:this.lineWidth,dash:this.lineDash.slice(),alpha:this.globalAlpha});}fillRect(){}strokeRect(){this.rectStrokes.push(this.lineDash.slice());}strokeText(){}setLineDash(dash){this.lineDash=Array.from(dash);}quadraticCurveTo(){}bezierCurveTo(){}
}
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.style={};this.dataset={};this.classList={toggle(){}};if(tag==='canvas')this.context=new Context();}
 getContext(){return this.context;}
 setAttribute(k,v){(this.attributes??={})[k]=String(v);}getAttribute(k){return this.attributes?.[k]??null;}append(...xs){this.children.push(...xs);}replaceChildren(...xs){this.replaceCount=(this.replaceCount||0)+1;this.children=xs;}
 addEventListener(type,fn){(this.listeners??={})[type]=fn;}removeEventListener(type){delete this.listeners?.[type];}remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(x=>x!==this);}
 getBoundingClientRect(){return this.tag==='parent'?{width:this.width,top:0}:{width:parseFloat(this.style.width)||this.width||0,height:parseFloat(this.style.height)||this.height||0,left:0,top:0};}
 closest(){return stage;}
 querySelector(q){if(q==='.battle-dock')return {getBoundingClientRect:()=>({height:110})};if(q==='.atlas-selection')return this.selection||(this.selection=new Element('selection'));if(q==='.atlas-views')return this.children.find(x=>x.className==='atlas-views')||null;const find=nodes=>{for(const n of nodes){if(q==='.'+n.className||q===n.tag)return n;const nested=find(n.children||[]);if(nested)return nested;}return null;};return find(this.children);}
 insertBefore(e){e.parentElement=this;this.children.unshift(e);}
}
c.document={createElement:tag=>new Element(tag)};
c.Path2D=class{moveTo(){}lineTo(){}closePath(){}rect(){}addPath(){}};
c.innerHeight=10000;c.devicePixelRatio=1;c.performance={now:()=>0};c.requestAnimationFrame=()=>1;c.cancelAnimationFrame=()=>{};
c.ResizeObserver=class{constructor(fn){observer=fn;}observe(){}disconnect(){}};
c.atob=s=>Buffer.from(s,'base64').toString('binary');
c.fetch=async()=>({ok:true,json:async()=>({width:2,height:2,heights:Buffer.from([0,128,0,128,0,128,0,128]).toString('base64'),comparisonRivers:[]})});
G.date=()=>({y:1600});G.CN=k=>TK.CLANS[k]?.[0]||k;G.ROADS=[];G.armyCrestKey=()=>null;G.kamonImage=()=>null;
G.S=()=>({clans:emptyGame?{}:{tokugawa:{cap:'hamamatsu'},takeda:{cap:'tsutsujigasaki'},oda:{cap:'kiyosu'}}});
c.TKGEO.land=[];c.TKGEO.lakes=[];c.TKGEO.rivers=[];TK.HISTORIC_WATERS=[];TK.REGIONAL_RIVERS=[];TK.KOREAN_RIVERS_DETAIL=[];TK.periodWaters=()=>[];
c.TKCounter={path(ctx,w,h){ctx.counterPath=activeId;ctx.counters.push({id:activeId,p:[ctx.m[4],ctx.m[5]],w,h,m:ctx.m.slice()});}};
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
 return {cv,ctrl,stage,faceCalls,resize(width){parent.width=width;observer();},views(){const children=stage.querySelector('.atlas-views')?.children||[];return children.flatMap(e=>e.tag==='select'?e.children.filter(o=>o.value!=='').map(o=>({textContent:o.textContent,onclick(){e.value=o.value;e.onchange();}})):[e]);}};
}
function decorations(h,title){
 const {W,H}=h.ctrl.viewport(),ctx=h.cv.context;
 for(const f of ctx.faces)assert.ok(f.x>=0&&f.y>=0&&f.x+f.w<=W&&f.y+f.h<=H,title+' face clipped '+JSON.stringify(f));
 for(const f of ctx.flags)assert.ok(f.x-2*f.k>=0&&f.x+18*f.k+1<=W&&f.y-41*f.k-1>=0&&f.y+10*f.k+1<=H,title+' flag clipped '+JSON.stringify(f));
 for(const tx of ctx.texts){assert.ok(!tx.text.includes('点線の軌跡'),'inferred-motion annotation stays outside the map');const left=tx.align==='center'?tx.x-tx.width/2:tx.align==='right'?tx.x-tx.width:tx.x;assert.ok(left>=-1e-6&&left+tx.width<=W+1e-6&&tx.y-tx.size/2>=-1e-6&&tx.y+tx.size/2<=H+1e-6,title+' text clipped '+JSON.stringify(tx));}
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
function choices(h){return (h.stage.selection?.querySelector('.atlas-selection-choices')?.children||[]).filter(x=>x.dataset?.unitId);}
function clickBody(h,id){const body=h.cv.context.counters.find(x=>x.id===id);assert.ok(body,'body exists '+id);h.cv.listeners.click({clientX:body.p[0],clientY:body.p[1]});}
function clickLabel(h,id){const box=h.ctrl.testBoxes().find(x=>x.id===id&&x.label);assert.ok(box,'label exists '+id);h.cv.listeners.click({clientX:box.x+box.w/2,clientY:box.y+box.h/2});}


return {c,TK,G,make,counters,choices,clickBody,clickLabel,simple,distance,world,rows,decorations,TAKATENJIN_BOUNDS};
}
module.exports={createFixture};
