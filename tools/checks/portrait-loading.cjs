'use strict';
// 実候補のローダー部分だけを評価する。ネットワーク・ブラウザ・画像の復号は行わない。
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const s=fs.readFileSync(require('node:path').resolve(__dirname,'../../kuniezu/static/kuniezu/ui.js'),'utf8');
const code=s.slice(s.indexOf('const FT=128,FCOLS=10;'),s.indexOf('function portrait(name,r,ring,col){'));
function fixture(){const images=[],timers=[],events={},els=[];const context={Image:class{constructor(){images.push(this);}set src(v){this.url=v;}get src(){return this.url;}},devicePixelRatio:1,TK:{faceOf:()=>-1},document:{hidden:false,querySelectorAll:()=>els,addEventListener:(n,f)=>events[n]=f},setTimeout:(f,ms)=>{const t={f,ms};timers.push(t);return t;},pressLock:0,topSig:'old',U:{wakeLoop(){}},faceHTML:(n,z,k)=>n+'|'+z+'|'+k};vm.createContext(context);vm.runInContext(code+'\nglobalThis.api={extraPortrait,pumpPortraits,refreshPortraits,queuePortraitRefresh,pcache,urlCache,extraFaceImages,get active(){return faceActive;}};',context);return {context,images,timers,events,els,api:context.api,finish(im,ok=true){im.naturalWidth=ok?128:0;(ok?im.onload:im.onerror)();},timer(ms){const i=timers.findIndex(t=>t.ms===ms);assert.ok(i>=0,'timer '+ms);timers.splice(i,1)[0].f();}};}
const a=fixture();assert.deepEqual(a.images.map(i=>i.url),['faces.webp'],'no eager extras');
for(let i=0;i<6;i++)a.api.extraPortrait('p'+i,{src:'p'+i+'.jpg'});
a.api.extraPortrait('alias',{src:'p0.jpg'});assert.equal(a.images.length,3);assert.equal(a.api.active,2);assert.equal(a.api.extraFaceImages.size,6);
let p=1;while(p<a.images.length){a.finish(a.images[p++]);assert.ok(a.api.active<=2);}assert.equal(a.images.length,7);assert.equal(a.api.active,0);assert.equal(a.timers.filter(t=>t.ms===120).length,1,'one batched refresh');
a.api.pcache.set('p0|0|15','old');a.api.pcache.set('unrelated|0|15','keep');a.els.push({offsetParent:{},dataset:{portrait:'alias',portraitSize:'sm',portraitClan:'oda'}},{offsetParent:null,dataset:{portrait:'p0',portraitSize:'sm'}});a.timer(120);assert.equal(a.els[0].outerHTML,'alias|sm|oda');assert.equal(a.els[1].outerHTML,undefined);assert.equal(a.api.pcache.has('p0|0|15'),false);assert.equal(a.api.pcache.get('unrelated|0|15'),'keep');
const b=fixture();b.api.extraPortrait('failed',{src:'f.jpg'});b.finish(b.images[1],false);b.timer(500);b.finish(b.images[2],false);assert.equal(b.images.length,3);assert.equal(b.timers.length,0,'no endless retry');assert.equal(b.api.extraFaceImages.get('f.jpg').attempts,2);
const c=fixture();c.context.document.hidden=true;c.api.extraPortrait('hidden',{src:'h.jpg'});assert.equal(c.images.length,1);c.context.document.hidden=false;c.events.visibilitychange();assert.equal(c.images.length,2);c.context.document.hidden=true;c.finish(c.images[1]);assert.equal(c.timers.length,0);c.context.document.hidden=false;c.events.visibilitychange();assert.equal(c.timers.filter(t=>t.ms===120).length,1);
console.log('PASS: on-demand, 2-flight cap, URL dedup/alias, batch refresh, selective cache, visible DOM only, one retry, hidden defer/resume');

{
const snippet=s.slice(s.indexOf('function portrait(name,r,ring,col){'),s.indexOf('function faceHTML(name,size,k){'));
const path=require('node:path'),root=path.resolve(__dirname,'../..'),game=path.join(root,'kuniezu/static/kuniezu');
const defs=JSON.parse(fs.readFileSync(path.join(root,'tools/faces/fallback-crops.json'))).portraits;
const canonical={TK:{}};vm.runInNewContext(fs.readFileSync(path.join(game,'portrait-layout.js'),'utf8'),canonical);
const shima=fs.readFileSync(path.join(game,'kamon.js'),'utf8').match(/TK\.EXTRA_PORTRAITS\['島清興'\]=(\{[^;]+\});/);canonical.TK.EXTRA_PORTRAITS['島清興']=vm.runInNewContext('('+shima[1]+')');
let draws=[],ready=new Set(),requested=[];
const c={TK:{faceOf:()=>103,PORTRAIT_ALIAS:{alias:'丹羽長重'},EXTRA_PORTRAITS:canonical.TK.EXTRA_PORTRAITS,PORTRAIT_LAYOUT:{},PORTRAIT_FALLBACK:canonical.TK.PORTRAIT_FALLBACK},faceImg:{id:'legacy'},FT:128,FCOLS:10,faceReady:true,PDPR:1,pcache:new Map(),extraPortrait(name,e){requested.push(e.src);return ready.has(e.src)?{id:e.src}:null;},document:{createElement(){return{getContext(){return{scale(){},save(){},beginPath(){},arc(){},clip(){},fillRect(){},restore(){},stroke(){},drawImage(...args){draws.push(args);}}}};}}};vm.createContext(c);vm.runInContext(snippet,c);
for(const d of defs){draws=[];ready.clear();c.pcache.clear();assert.equal(c.portrait(d.name,20,false),null,'no legacy incorrect sprite while source/fallback pending');assert.equal(draws.length,0);ready.add(canonical.TK.PORTRAIT_FALLBACK[d.name].src);c.pcache.clear();assert.ok(c.portrait(d.name,20,false));assert.equal(draws.at(-1)[0].id,canonical.TK.PORTRAIT_FALLBACK[d.name].src);assert.deepEqual(Array.from(draws.at(-1).slice(1,5)),Array.from(c.TK.PORTRAIT_FALLBACK[d.name].crop));ready.add(d.source);c.pcache.clear();c.portrait(d.name,20,false);assert.equal(draws.at(-1)[0].id,d.source);assert.deepEqual(Array.from(draws.at(-1).slice(1,5)),d.crop);}
assert.equal(new Set(defs.map((d,i)=>c.TK.PORTRAIT_FALLBACK[d.name].crop[1])).size,5);
c.pcache.clear();c.portrait('alias',20,false);assert.deepEqual(Array.from(draws.at(-1).slice(1,5)),Array.from(c.TK.PORTRAIT_FALLBACK['丹羽長重'].crop),'alias shares canonical fallback row');
console.log('PASS: five reviewed fallback rows, no old atlas while pending, ready originals keep canonical crops');
}
