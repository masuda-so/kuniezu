/* ベクター比較ページを専用Chromeで検証。サーバーは起動・停止しない。 */
'use strict';
const {spawn}=require('node:child_process'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const url=process.env.VECTOR_PREVIEW_URL;if(!url)throw Error('VECTOR_PREVIEW_URL is required');
const output=path.resolve(process.env.GAME_TEST_OUTPUT||path.join(os.tmpdir(),'kuniezu-vector-browser'));fs.mkdirSync(output,{recursive:true});
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'kuniezu-vector-check-'));
const chrome=spawn(process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless','--disable-gpu','--no-first-run','--no-default-browser-check',`--user-data-dir=${profile}`,'--remote-debugging-pipe'],{stdio:['ignore','ignore','ignore','pipe','pipe']});
let seq=0,buf='',session,closed=false;const pending=new Map(),errors=[];
chrome.stdio[4].on('data',data=>{buf+=data.toString();let i;while((i=buf.indexOf('\0'))>=0){const m=JSON.parse(buf.slice(0,i));buf=buf.slice(i+1);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(p)m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);}});
const fail=error=>{closed=true;for(const p of pending.values())p.reject(error);pending.clear();};
chrome.once('error',fail);chrome.once('exit',code=>fail(Error('Chrome exited: '+code)));
const call=(method,params={},sid=session)=>new Promise((resolve,reject)=>{if(closed){reject(Error('Chrome is closed'));return;}const id=++seq;pending.set(id,{resolve,reject});chrome.stdio[3].write(JSON.stringify({id,method,params,...(sid?{sessionId:sid}:{})})+'\0');});
const ev=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function settle(){await ev('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');}
async function shot(name){const r=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(output,name+'.png'),Buffer.from(r.data,'base64'));}
const timer=setTimeout(()=>{chrome.kill();process.exitCode=1;console.error('Vector browser timeout');},60000);
(async()=>{try{
 const target=await call('Target.createTarget',{url:'about:blank'},null);session=(await call('Target.attachToTarget',{targetId:target.targetId,flatten:true},null)).sessionId;
 await call('Runtime.enable');await call('Page.enable');await call('Emulation.setDeviceMetricsOverride',{width:1200,height:900,deviceScaleFactor:1,mobile:false});await call('Page.navigate',{url});
 for(let i=0;i<300&&!await ev('!!window.codhPreview');i++)await sleep(100);
 assert.ok(await ev('!!window.codhPreview'),'preview loaded');
 const crypto=require('node:crypto'),sha=value=>crypto.createHash('sha256').update(value).digest('hex'),runtimeText=await ev("[...document.scripts].find(s=>s.textContent.includes('root.TKVectorMap={create}')).textContent"),runtimeSha256=sha(runtimeText);assert.equal(runtimeSha256,sha(fs.readFileSync(path.resolve(__dirname,'../../kuniezu/static/kuniezu/vector-map.js'))),'test page embeds the current runtime');const cases=[];
 for(const region of ['japan','kanto','kojima']){await ev(`document.querySelector('[data-region=${region}]').click()`);await settle();cases.push({region,...await ev('window.codhPreview')});await shot(region);}
 assert.equal(await ev("surfaceLayers['coast-polygons'].model.path('land',at)===surfaceLayers['coast-polygons'].model.path('land',[at[0],at[1],at[2]+1])"),true,'combined clip path is reused across days within a period');
 const parity=await ev(`(()=>{const model=surfaceLayers['coast-polygons'].model,p=model.path('land',at),c=document.createElement('canvas').getContext('2d');const samples=[[140.87117750808818,40.458659],[140.663234237704,39.724741],[140.09889753212292,37.4733445],[136.44419477540106,36.366313],[136.19439179474546,35.522787],[135.75,35.03],[140.5,34.5]];for(let lo=129;lo<=142;lo+=.7)for(let la=30;la<=43;la+=.7)samples.push([lo,la]);return samples.map(point=>{const xy=project(point);return {point,model:model.contains(...xy,at),canvas:c.isPointInPath(p,...xy,'nonzero')};});})()`);
 assert.ok(parity.length>300);assert.ok(parity.every(p=>p.model===p.canvas),'hit test agrees with actual Canvas fill');assert.ok(parity.slice(0,5).every(p=>!p.model),'five lake holes remain water');assert.equal(parity[5].model,true);assert.equal(parity[6].model,false);
 let ukitaEraChecks=null;
 if(await ev("data.layers['coast-polygons'].features.some(f=>String(f.id).startsWith('land:ukita1584:'))")){
  const root=path.resolve(__dirname,'../..'),edit=JSON.parse(fs.readFileSync(path.join(root,'kuniezu/map/edits/kojima-bay-ukita-land-from-1584.json'))).payload,projection=JSON.parse(fs.readFileSync(path.join(root,'kuniezu/map/projection.json'))),png=require('../geo/png-decode.cjs')(fs.readFileSync(path.resolve(root,'kuniezu/map/edits',edit.mask))),points=[];
  for(let i=0;i<png.width*png.height;i++)if(png.data[i*4+1]*256+png.data[i*4+2]){const col=i%png.width+edit.window[0]+.5,row=Math.floor(i/png.width)+edit.window[1]+.5;points.push([(projection.origin[0]+col*projection.stepUnits)/(projection.K*projection.CX)+projection.LON0,projection.LAT0-(projection.origin[1]+row*projection.stepUnits)/projection.K]);}
  const run=require('./browser-runtime.cjs')(call);ukitaEraChecks=await run(function(points){const model=surfaceLayers['coast-polygons'].model,path=model.path('land',at),context=document.createElement('canvas').getContext('2d'),expected=at[0]>=1584&&at[0]<1616;return {year:at[0],cells:points.length,allMatch:points.every(point=>{const xy=project(point);return model.contains(...xy,at)===expected&&context.isPointInPath(path,...xy,'nonzero')===expected;})};},points);
  assert.equal(ukitaEraChecks.cells,366);assert.ok(ukitaEraChecks.allMatch,'all original dated mask cell centres agree with actual draw and hit');
 }
 const overlap=await ev(`(()=>{const m=TKVectorMap.create({project:(x,y)=>[x,y]}),box=(id,x0,x1,hole)=>({type:'Feature',id,properties:{drawRole:'land'},geometry:{type:'Polygon',coordinates:[[[x0,0],[x1,0],[x1,3],[x0,3],[x0,0]],...(hole?[[[1.2,1],[1.8,1],[1.8,2],[1.2,2],[1.2,1]]]:[])]}});m.replace([{type:'FeatureCollection',features:[box('a',0,2,true),box('b',1,3,false)]}]);const c=document.createElement('canvas').getContext('2d'),p=m.path('land',[1560,1,1]);return [[.5,1.5],[1.5,1.5],[2.5,1.5],[4,1.5]].map(xy=>({model:m.contains(...xy,[1560,1,1]),canvas:c.isPointInPath(p,...xy,'nonzero')}));})()`);
 assert.deepEqual(overlap.map(p=>p.model),[true,true,true,false]);assert.ok(overlap.every(p=>p.model===p.canvas),'overlap and hole in another feature retain union semantics');
 const before=await ev('({...camera})');await call('Input.dispatchMouseEvent',{type:'mouseWheel',x:800,y:600,deltaX:0,deltaY:-120});await settle();assert.notEqual(await ev('camera.scale'),before.scale);
 const beforeDrag=await ev('({...camera})');
 await call('Input.dispatchMouseEvent',{type:'mousePressed',x:800,y:600,button:'left',clickCount:1});await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:860,y:630,button:'left',buttons:1});await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:860,y:630,button:'left',clickCount:1});await settle();assert.notEqual(await ev('camera.x'),beforeDrag.x);
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await settle();await shot('narrow');
 const idle=await ev('JSON.stringify(window.codhPreview)');await sleep(300);assert.equal(await ev('JSON.stringify(window.codhPreview)'),idle,'no idle repaint');assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(output,'result.json'),JSON.stringify({runtimeSha256,cases,paritySamples:parity.length,parityMatches:true,ukitaEraChecks,overlapUnion:true,fiveLakeHoles:true,panZoom:true,narrow:true,idleRepaint:false,errors},null,2)+'\n');console.log('PASS: actual Canvas/hit parity, five lake holes, three regions, wheel/pan, narrow display and idle sleep; no JS errors');
 }catch(error){console.error(error.stack);process.exitCode=1;}finally{clearTimeout(timer);const stopped=chrome.exitCode!==null||chrome.signalCode!==null?Promise.resolve():new Promise(resolve=>chrome.once('close',resolve));try{await call('Browser.close',{},null);}catch{}const force=setTimeout(()=>chrome.kill(),1500);await stopped;clearTimeout(force);fs.rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});}
})();
