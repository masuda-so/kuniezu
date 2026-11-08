/* 起動済みDjangoのベクター描画を専用Chromeで検証する。普段のブラウザは使わない。 */
const {spawn}=require('node:child_process');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const URL=process.env.GAME_URL||'http://127.0.0.1:8000/index.html';
const failSource=process.env.VECTOR_FAIL_SOURCE==='1';
const OUT=path.resolve(process.env.GAME_TEST_OUTPUT||path.join(os.tmpdir(),'kuniezu-browser-results'));
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'kuniezu-check-'));fs.mkdirSync(OUT,{recursive:true});
const chrome=spawn(process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless','--disable-gpu','--no-first-run','--no-default-browser-check',`--user-data-dir=${profile}`,'--remote-debugging-pipe'],{stdio:['ignore','ignore','ignore','pipe','pipe']});
let seq=0,buf='',session,chooser;const pending=new Map(),errors=[],events=[];
chrome.stdio[4].on('data',data=>{buf+=data.toString();let i;while((i=buf.indexOf('\0'))>=0){const str=buf.slice(0,i);buf=buf.slice(i+1);if(!str)continue;const m=JSON.parse(str);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(p)m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}else{
 events.push(m);if(m.method==='Fetch.requestPaused')call('Fetch.fulfillRequest',{requestId:m.params.requestId,responseCode:503,body:Buffer.from('source unavailable for failure fixture').toString('base64')}).catch(e=>errors.push(e.stack));if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);if(m.method==='Page.fileChooserOpened')chooser=m.params;
 }}});
const call=(method,params={},sid=session)=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});chrome.stdio[3].write(JSON.stringify({id,method,params,...(sid?{sessionId:sid}:{})})+'\0');});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const ev=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
async function until(expr){for(let i=0;i<600;i++){if(await ev(expr))return;if(!failSource&&await ev("document.getElementById('boot')?.getAttribute('role')==='alert'"))throw Error('Boot error');await sleep(100);}throw Error('Timed out: '+expr);}
async function click(selector){
 const target=await call('Runtime.evaluate',{expression:'window',returnByValue:false});let result;
 try{result=await call('Runtime.callFunctionOn',{objectId:target.result.objectId,functionDeclaration:'function(selector){const el=document.querySelector(selector);if(!el||el.disabled)throw Error("missing/disabled "+selector);el.scrollIntoView({block:"center"});const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};}',arguments:[{value:selector}],returnByValue:true});}
 finally{await call('Runtime.releaseObject',{objectId:target.result.objectId});}
 if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);
 const p=result.result.value;await call('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...p});await call('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...p});await sleep(120);
}
async function shot(name){await ev("(()=>{const e=document.querySelector('.mbox');if(e)e.scrollTop=0;})()");const r=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(OUT,name+'.png'),Buffer.from(r.data,'base64'));}
async function view(width,height){await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<820});await sleep(300);}
async function load(){await call('Page.navigate',{url:URL});await until("!!document.querySelector('[data-act=new]')&&!document.getElementById('boot')");}
async function start(){await click('[data-act=new]');await click('[data-act=scen][data-id=s1560]');await click('#pick [data-act=pick].on');await until("TKUI.mode==='game'&&!TKUI.modal");}
async function menu(){await click('#me [data-m=menu]');}
const timer=setTimeout(()=>{console.error('timeout');chrome.kill();process.exitCode=1},90000);
const cover=()=>ev('(()=>{const {corners}=TKUI.mapBounds();return corners[0][0]<=.01&&corners[0][1]<=.01&&corners[1][0]>=innerWidth-.01&&corners[1][1]>=innerHeight-.01})()');
(async()=>{try{
 const target=await call('Target.createTarget',{url:'about:blank'},null);session=(await call('Target.attachToTarget',{targetId:target.targetId,flatten:true},null)).sessionId;await call('Runtime.enable');await call('Page.enable');await call('Page.addScriptToEvaluateOnNewDocument',{source:`(()=>{let sdk;Object.defineProperty(window,'TKVectorUI',{configurable:true,get:()=>sdk,set:value=>{sdk=value;const create=value.create;value.create=(...args)=>{const result=create(...args);window.__vectorUnderTest=result;return result;};}});})()`});await view(1200,900);
 if(failSource){await call('Fetch.enable',{patterns:[{urlPattern:'*/map/build/vector/manifest.json',requestStage:'Request'}]});await call('Page.navigate',{url:URL});await until("document.getElementById('boot')?.getAttribute('role')==='alert'");assert.equal(await ev('!!window.__vectorUnderTest?.ready()'),false);assert.equal(await ev('!document.getElementById("bootReload").hidden'),true);await shot('source-failure');assert.deepEqual(errors,[]);fs.writeFileSync(path.join(OUT,'result.json'),JSON.stringify({scope:'Unavailable canonical source stays behind boot overlay and offers reload',errors},null,2)+'\n');console.log('PASS: missing source keeps boot overlay and reload; no partial source promoted');return;}
 await load();await shot('title');
 const state=await ev('({title:document.title,mode:TKUI.mode,boot:!!document.getElementById("boot"),vectorReady:__vectorUnderTest.ready(),stats:__vectorUnderTest.stats(),bounds:TKUI.mapBounds()})');assert.equal(state.mode,'title');assert.equal(state.boot,false);assert.equal(state.vectorReady,true);assert.ok(state.stats.features>5000);
 await start();await until("TKUI.mode==='game'&&!TKUI.modal");await shot('game-wide');
 const game=await ev('({mode:TKUI.mode,date:G.date(),vector:__vectorUnderTest.stats(),bounds:TKUI.mapBounds()})');
 const subcellControl=[];
 for(const width of [940,335]){await view(width,844);for(const [index,point] of [[133.81822404375,34.5986576875],[133.8206192921875,34.599295765625]].entries()){
  const probe=await ev(`(()=>{const point=G.PJ(${point[0]},${point[1]});TKUI.speed=0;TKUI.cam(...point,64);TKUI.api.renderAll();const b=TKUI.mapBounds();return {control:__vectorUnderTest.controlAt(...point),land:__vectorUnderTest.contains(...point),x:(point[0]-b.camera.x)*b.camera.z+b.viewport[0],y:(point[1]-b.camera.y)*b.camera.z+b.viewport[1],camera:b.camera};})()`);
  assert.equal(probe.land,true);assert.equal(probe.control,'castle:bmatsuyama');await sleep(300);
  await call('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,x:probe.x,y:probe.y});await call('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,x:probe.x,y:probe.y});await sleep(300);assert.equal(await ev('TKUI.sel'),'bmatsuyama');
  subcellControl.push({width,index,point,...probe,selected:'bmatsuyama'});await shot('subcell-'+width+'-'+index);
 }}
 await view(390,844);await shot('game-narrow');await ev('TKUI.setMapRotation(16)');await sleep(200);await shot('game-rotated');await ev('TKUI.setMapRotation(0);TKUI.fitAll()');await sleep(200);await shot('game-all-japan');assert.deepEqual(errors,[]);
 const inverseUnion=await ev(`(async()=>{
  const fc=features=>({type:'FeatureCollection',coordinateReferenceSystem:'OGC:CRS84',features});
  const box=(id,a,b,z,w)=>({type:'Feature',id,properties:{drawRole:'land'},geometry:{type:'Polygon',coordinates:[[[a,b],[z,b],[z,w],[a,w],[a,b]]]}});
  const texts={'physical/land.geojson':JSON.stringify(fc([box('a',2,2,20,20),box('b',10,10,25,25)])),'physical/water.geojson':JSON.stringify(fc([])),'physical/coastline.geojson':JSON.stringify(fc([])),'physical/water-evidence.geojson':JSON.stringify(fc([])),'control/subcell.geojson':JSON.stringify(fc([{...box('owned',3,3,8,8),properties:{drawRole:'control',key:'castle:sample'}}]))};
  const files=await Promise.all(Object.entries(texts).map(async([file,text])=>({file,bytes:new TextEncoder().encode(text).length,sha256:[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(n=>n.toString(16).padStart(2,'0')).join('')})));
  const assets={manifest:async()=>({files}),load:async file=>JSON.parse(texts[file])};
  const fixture=TKVectorUI.create({project:(x,y)=>[x,y],date:()=>[1560,1,1],assets});await fixture.loaded;window.__controlFixture=fixture;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=30;const c=canvas.getContext('2d');fixture.offLand(c,ctx=>{ctx.fillStyle='#fff';ctx.fillRect(0,0,30,30);});
  return [[3,3],[15,15],[28,28]].map(([x,y])=>c.getImageData(x,y,1,1).data[3]);
 })()`);assert.deepEqual(inverseUnion,[0,0,255],'off-land rendering uses the union, including overlap');
 const controlFill=await ev(`(()=>{const fixture=window.__controlFixture,canvas=document.createElement('canvas');canvas.width=canvas.height=30;const c=canvas.getContext('2d');fixture.paintLand(c,{flat:true,view:[0,0,30,30],owners:ctx=>{ctx.fillStyle='rgba(100,150,200,0.5019607843137255)';ctx.fillRect(0,0,30,30);},controlColor:()=>[100,150,200,128]});const result={control:[...c.getImageData(4,4,1,1).data],ordinary:[...c.getImageData(9,4,1,1).data],key:fixture.controlAt(4,4),outside:fixture.controlAt(9,4)};c.clearRect(0,0,30,30);fixture.paintLand(c,{flat:true,view:[0,0,30,30],owners:ctx=>{ctx.fillStyle='rgba(100,150,200,0.5019607843137255)';ctx.fillRect(0,0,30,30);},controlColor:()=>null});result.unavailable=[...c.getImageData(4,4,1,1).data];return result;})()`);assert.deepEqual(controlFill.control,controlFill.ordinary,'control area receives ownership tint once');assert.equal(controlFill.key,'castle:sample');assert.equal(controlFill.outside,null);assert.deepEqual(controlFill.unavailable,controlFill.ordinary,'missing control color preserves original ownership');
 fs.writeFileSync(path.join(OUT,'result.json'),JSON.stringify({scope:'Actual HTTP game served by Django; no response overrides',state,game,inverseUnion,controlFill,subcellControl,errors},null,2)+'\n');console.log('PASS: vector renderer boots from actual Django sources; scenario1560 wide/narrow and zero JS errors');

 }catch(e){console.error(e.stack);try{console.error(JSON.stringify(await ev('({boot:document.getElementById(\"boot\")?.innerText,mode:window.TKUI?.mode,vector:window.__vectorUnderTest?.stats(),scripts:document.scripts.length})')));console.error(JSON.stringify(errors));console.error(JSON.stringify(events.filter(m=>m.method==='Runtime.consoleAPICalled').map(m=>m.params.args.map(a=>a.description||a.value))));await shot('failure');}catch(d){console.error(d.stack)}process.exitCode=1;}finally{clearTimeout(timer);const stopped=chrome.exitCode!==null||chrome.signalCode!==null?Promise.resolve():new Promise(r=>chrome.once('close',r));try{await call('Browser.close',{},null)}catch{}const force=setTimeout(()=>chrome.kill(),1500);await stopped;clearTimeout(force);fs.rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});}})();