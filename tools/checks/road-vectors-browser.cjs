/* 起動済みHTTPサーバーを専用Chromeで検証する。起動停止は行わない。
   GAME_OVERRIDE_ROOT/GAME_OVERRIDE_BASE は候補のgame差分のみを専用ブラウザ内で差し替える。 */
const {spawn,execFileSync}=require('node:child_process');
const crypto=require('node:crypto');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const BASELINE=process.env.ROAD_VECTOR_BASELINE==='1';let fault=false;
const URL=process.env.GAME_URL||'http://localhost:8000/index.html';
const OUT=path.resolve(process.env.GAME_TEST_OUTPUT||path.join(os.tmpdir(),'kuniezu-browser-results'));
// 差し替えの鍵は URL のパス（Django は kuniezu/static/kuniezu/x を /static/kuniezu/x で配る）。ページはテンプレートを描いて返す。
const PAGE=require('../build/game-page.cjs'),root=process.env.GAME_OVERRIDE_ROOT,overrides={};
if(root&&!BASELINE){for(const f of execFileSync('git',['-C',root,'diff','--name-only',process.env.GAME_OVERRIDE_BASE||'origin/main','--','kuniezu/static/kuniezu',PAGE.TEMPLATE],{encoding:'utf8'}).trim().split('\n').filter(Boolean)){const p=path.join(root,f);if(!fs.existsSync(p))continue;if(f===PAGE.TEMPLATE)overrides['index.html']=Buffer.from(PAGE.render(root));else overrides[f.slice('kuniezu/'.length)]=fs.readFileSync(p);}}
if(root&&!BASELINE){
 for(const name of ['vector-assets.js','road-source.js'])overrides['static/kuniezu/'+name]=fs.readFileSync(path.join(root,PAGE.STATIC,name));
 const directory=process.env.GAME_VECTOR_BUILD||path.join(root,PAGE.STATIC,'map/build/vector'),manifest=JSON.parse(fs.readFileSync(path.join(directory,'manifest.json')));
 for(const name of ['manifest.json',...manifest.files.map(f=>f.file)])overrides['static/kuniezu/map/build/vector/'+name]=fs.readFileSync(path.join(directory,name));
}
const TYPES={js:'application/javascript',html:'text/html; charset=utf-8',json:'application/json',geojson:'application/geo+json',css:'text/css',png:'image/png',webp:'image/webp',svg:'image/svg+xml'};
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'kuniezu-check-'));fs.mkdirSync(OUT,{recursive:true});
const chrome=spawn(process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless',...(new globalThis.URL(URL).protocol==='file:'?['--allow-file-access-from-files']:[]),'--disable-gpu','--no-first-run','--no-default-browser-check',`--user-data-dir=${profile}`,'--remote-debugging-pipe'],{stdio:['ignore','ignore','ignore','pipe','pipe']});
let seq=0,buf='',session,chooser;const pending=new Map(),errors=[],events=[];
chrome.stdio[4].on('data',data=>{buf+=data.toString();let i;while((i=buf.indexOf('\0'))>=0){const str=buf.slice(0,i);buf=buf.slice(i+1);if(!str)continue;const m=JSON.parse(str);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(p)m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}else{
 if(m.method==='Fetch.requestPaused'){const f=decodeURIComponent(new globalThis.URL(m.params.request.url).pathname.slice(1))||'index.html',body=overrides[f];if(fault&&f.endsWith('/physical/roads-reference.geojson')&&body){const bad=Buffer.from(body);bad[0]^=1;call('Fetch.fulfillRequest',{requestId:m.params.requestId,responseCode:200,body:bad.toString('base64')}).catch(e=>console.error(e));continue;}if(body)call('Fetch.fulfillRequest',{requestId:m.params.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:TYPES[f.split('.').pop()]||'application/octet-stream'}],body:body.toString('base64')}).catch(e=>console.error(e));else call('Fetch.continueRequest',{requestId:m.params.requestId}).catch(e=>console.error(e));}
 events.push(m);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);if(m.method==='Page.fileChooserOpened')chooser=m.params;
 }}});
const call=(method,params={},sid=session)=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});chrome.stdio[3].write(JSON.stringify({id,method,params,...(sid?{sessionId:sid}:{})})+'\0');});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const ev=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
async function until(expr){for(let i=0;i<100;i++){if(await ev(expr))return;await sleep(100);}throw Error('Timed out: '+expr);}
async function run(functionDeclaration,...values){
 const target=await call('Runtime.evaluate',{expression:'window',returnByValue:false});let result;
 try{result=await call('Runtime.callFunctionOn',{objectId:target.result.objectId,functionDeclaration,arguments:values.map(value=>({value})),returnByValue:true,awaitPromise:true});}
 finally{await call('Runtime.releaseObject',{objectId:target.result.objectId});}
 if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;
}
async function click(selector){const p=await run('function(selector){const el=document.querySelector(selector);if(!el||el.disabled)throw Error("missing/disabled "+selector);el.scrollIntoView({block:"center"});const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};}',selector);await call('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...p});await call('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...p});await sleep(120);}
async function shot(name){await ev("(()=>{const e=document.querySelector('.mbox');if(e)e.scrollTop=0;})()");const r=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(OUT,name+'.png'),Buffer.from(r.data,'base64'));}
async function view(width,height){await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<820});await sleep(300);}
async function load(){await call('Page.navigate',{url:URL});await until("!!document.querySelector('[data-act=new]')&&!document.getElementById('boot')");}
async function start(){await click('[data-act=new]');await click('[data-act=scen][data-id=s1560]');await click('#pick [data-act=pick].on');await until("TKUI.mode==='game'&&!TKUI.modal");}

const timer=setTimeout(()=>{chrome.kill();process.exitCode=1;console.error('road vector browser timeout');},240000);
(async()=>{try{
 const target=await call('Target.createTarget',{url:'about:blank'},null);session=(await call('Target.attachToTarget',{targetId:target.targetId,flatten:true},null)).sessionId;
 await call('Runtime.enable');await call('Page.enable');await call('Network.enable');
 if(root&&!BASELINE)await call('Fetch.enable',{patterns:[{urlPattern:new globalThis.URL(URL).origin+'/*',requestStage:'Request'}]});
 await view(1400,950);await load();await start();await ev('TKUI.speed=0');
 const init=await ev(`({version:G.S().movementGeometryVersion,roads:G.ROADS.length,canonical:!!window.TKRoadSource?.ready(),legacy:!!TK.MODERN_ROAD_REFERENCE,cleanup:typeof TK.cleanReferenceExcursions,strategy:G.ROADS.filter(r=>window.TKRoadSource?.isStrategyRoad(r.name)).length,shared:G.ROADS.every(r=>!window.TKRoadSource||TK.roadDisplay(r).pts===TKRoadSource.view(r,G.PJ).pts)})`);
 assert.equal(init.version,BASELINE?24:25);assert.equal(init.roads,85);assert(init.shared);
 if(!BASELINE){assert(init.canonical);assert(!init.legacy);assert.equal(init.cleanup,'undefined');assert.equal(init.strategy,74);}
 const requested=events.filter(e=>e.method==='Network.requestWillBeSent').map(e=>new globalThis.URL(e.params.request.url).pathname);
 const counts={manifests:requested.filter(p=>p.endsWith('/map/build/vector/manifest.json')).length,roads:requested.filter(p=>p.endsWith('/physical/roads-reference.geojson')).length,legacy:requested.filter(p=>p.endsWith('/modern-road-reference.js')).length};
 assert.equal(counts.manifests,1,'shared vector manifest is requested once');if(!BASELINE){assert.equal(counts.roads,1);assert.equal(counts.legacy,0);}
 const rows=[];
 for(const width of [1400,390]){
  await view(width,950);
  for(const [name,lon,lat]of [['東山道',137.814665,35.908807],['三州街道',137.708965,35.306391],['若狭街道',135.9,35.35]]){
   const row=await run(`async function(name,lon,lat){const raw=G.ROADS.find(r=>r.name===name),road=TK.roadDisplay(raw);TKUI.cam(...G.PJ(lon,lat),5);const samples=[];for(let i=0;i<10;i++){const before=TKUI.drawStats.base,start=performance.now();TKUI.cam(...G.PJ(lon+(i%2)*.0002,lat),i%2?4.8:5);TKUI.wakeLoop();await new Promise((resolve,reject)=>{let tries=0;function painted(){if(TKUI.drawStats.base>before)resolve();else if(++tries>120)reject(Error('Camera redraw stalled'));else requestAnimationFrame(painted);}requestAnimationFrame(painted);});samples.push(performance.now()-start);}return {name,vertices:road.pts.length,source:road.canonicalId||null,cleanup:road.referenceCleanup?.removedVertices||0,frameSamples:samples};}`,name,lon,lat);
   await call('Runtime.evaluate',{expression:'new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))',awaitPromise:true});
   assert(row.vertices>2);rows.push({...row,width});await shot(name+'-'+width);
  }
  const before=await ev(`(()=>{const u=G.S().units.find(u=>u.clan==='imagawa'),p=G.historyPoint(u);TKUI.cam(p[0],p[1],5);TKUI.speed=1;TKUI.acc=.65;return {id:u.id,point:p,schedule:u.schedule};})()`);
  await sleep(200);
  const paused=await ev(`(()=>{const u=G.S().units.find(u=>u.clan==='imagawa'),p=G.historyPoint(u);document.getElementById('ppBtn').click();return {before:p,after:G.historyPoint(u),speed:TKUI.speed,date:G.date(),id:u.id};})()`);
  assert.equal(paused.speed,0);assert.deepEqual(paused.before,paused.after,'pausing keeps the same road position');await sleep(220);
  assert.deepEqual(await ev(`G.historyPoint(G.S().units.find(u=>u.id===${JSON.stringify(before.id)}))`),paused.after);
  await shot('army-paused-'+width);await ev(`document.getElementById('ppBtn').click()`);await sleep(180);
  const resumed=await ev(`G.historyPoint(G.S().units.find(u=>u.clan==='imagawa'))`);assert.notDeepEqual(resumed,paused.after,'resuming advances the army');await ev('TKUI.speed=0');
  const schedules=await ev(`G.S().units.map(u=>({id:u.id,schedule:u.schedule}))`);assert.deepEqual(schedules.find(u=>u.id===before.id).schedule,before.schedule,'display migration does not reschedule arrival');
  rows.push({width,army:before.id,pausePosition:paused.after,resumed});await shot('army-resumed-'+width);
 }
 await call('HeapProfiler.collectGarbage');const retainedHeap=await call('Runtime.getHeapUsage');
 const memory=await ev('performance.memory?({used:performance.memory.usedJSHeapSize,total:performance.memory.totalJSHeapSize}):null');
 assert.deepEqual(errors,[]);let retry=false;
 if(root&&!BASELINE){
  fault=true;await call('Page.navigate',{url:URL});await until(`document.querySelector('#boot[role=alert]')&&!document.querySelector('#bootReload').hidden`);
  assert.equal(await ev('!!window.TKUI'),false,'failed road integrity blocks game initialization');assert.equal(await ev('TKRoadSource.ready()'),false);
  await shot('integrity-error');fault=false;await click('#bootReload');await until(`!!window.TKUI?.ready&&!document.getElementById('boot')`);
  assert.equal(await ev('TKRoadSource.ready()'),true);retry=true;
 }
 fs.writeFileSync(path.join(OUT,'result.json'),JSON.stringify({baseline:BASELINE,init,counts,rows,memory,retainedHeap,retry,errors},null,2)+'\n');
 console.log(BASELINE?'RECORDED: legacy roads under the same browser flow':'PASS: canonical boot, shared manifest, no legacy payload, wide/narrow road and marching pause/resume, integrity failure and reload');
}catch(e){console.error(e.stack);console.error(errors);try{await shot('failure')}catch{}process.exitCode=1;}finally{
 clearTimeout(timer);const stopped=chrome.exitCode!==null||chrome.signalCode!==null?Promise.resolve():new Promise(r=>chrome.once('close',r));try{await call('Browser.close',{},null)}catch{}
 const force=setTimeout(()=>chrome.kill(),1500);await stopped;clearTimeout(force);fs.rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});
}})();
