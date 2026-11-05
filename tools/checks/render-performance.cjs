/* 起動済みHTTPサーバーを専用Chromeで検証する。サーバーは起動・停止しない。 */
const {spawn}=require('node:child_process');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const URL=process.env.GAME_URL||'http://localhost:8000/index.html';
const OUT=path.resolve(process.env.GAME_TEST_OUTPUT||path.join(os.tmpdir(),'kuniezu-browser-results'));
const DOWNLOAD=path.join(OUT,'downloads-'+Date.now());fs.mkdirSync(DOWNLOAD,{recursive:true});
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'kuniezu-check-'));fs.mkdirSync(OUT,{recursive:true});
const chrome=spawn(process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless','--disable-gpu','--no-first-run','--no-default-browser-check',`--user-data-dir=${profile}`,'--remote-debugging-pipe'],{stdio:['ignore','ignore','ignore','pipe','pipe']});
const baseline=process.env.GAME_PERF_BASELINE;
const overrides=baseline?Object.fromEntries(['ui.js','terrain-tiles.js'].map(f=>[f,fs.readFileSync(path.join(baseline,'kuniezu/static/kuniezu',f))])):{};
let seq=0,buf='',session,chooser;const pending=new Map(),errors=[],events=[];
chrome.stdio[4].on('data',data=>{buf+=data.toString();let i;while((i=buf.indexOf('\0'))>=0){const str=buf.slice(0,i);buf=buf.slice(i+1);if(!str)continue;const m=JSON.parse(str);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(p)m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}else{
 if(m.method==='Fetch.requestPaused'){const f=new globalThis.URL(m.params.request.url).pathname.split('/').pop();call('Fetch.fulfillRequest',{requestId:m.params.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'application/javascript'}],body:overrides[f].toString('base64')}).catch(e=>console.error(e));}
 events.push(m);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);if(m.method==='Page.fileChooserOpened')chooser=m.params;
 }}});
const call=(method,params={},sid=session)=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});chrome.stdio[3].write(JSON.stringify({id,method,params,...(sid?{sessionId:sid}:{})})+'\0');});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const ev=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
async function until(expr){for(let i=0;i<600;i++){if(await ev(expr))return;await sleep(100);}throw Error('Timed out: '+expr);}
async function click(selector){const p=await ev(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el||el.disabled)throw Error('missing/disabled '+${JSON.stringify(selector)});el.scrollIntoView({block:'center'});const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);await call('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...p});await call('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...p});await sleep(120);}
async function shot(name){const r=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(OUT,name+'.png'),Buffer.from(r.data,'base64'));}
async function view(width,height){await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<820});await sleep(300);}
async function load(){await call('Page.navigate',{url:URL});await until("!!document.querySelector('[data-act=new]')&&!document.getElementById('boot')");}
async function start(){await ev("document.querySelector('[data-act=new]').click()");await until("!!document.querySelector('[data-act=scen][data-id=s1560]')");await ev("document.querySelector('[data-act=scen][data-id=s1560]').click()");await until("!!document.querySelector('[data-act=start]')");await ev("document.querySelector('[data-act=start]').click()");await until("TKUI.modal==='intro'");}
async function menu(){await click('#me [data-m=menu]');}
const timer=setTimeout(()=>{console.error('timeout');chrome.kill();process.exitCode=1},180000);
const cover=()=>ev('(()=>{const {corners}=TKUI.mapBounds();return corners[0][0]<=.01&&corners[0][1]<=.01&&corners[1][0]>=innerWidth-.01&&corners[1][1]>=innerHeight-.01})()');
(async()=>{try{
const target=await call('Target.createTarget',{url:'about:blank'},null);session=(await call('Target.attachToTarget',{targetId:target.targetId,flatten:true},null)).sessionId;await call('Runtime.enable');await call('Page.enable');await call('Performance.enable');if(baseline)await call('Fetch.enable',{patterns:Object.keys(overrides).map(f=>({urlPattern:'*/'+f+'*',requestStage:'Request'}))});
await view(1400,950);await load();await start();await click('#modal [data-act=close]');await ev('TKUI.cam(...G.PJ(140.35,36.0),5)');await sleep(1000);await shot('kasumi');const loadingStart=await ev('TKTerrain.stats()');for(let i=0;i<300;i++){if(await ev('TKTerrain.stats().pending===0&&TKTerrain.stats().running===0'))break;await sleep(100);}await sleep(500);const ready=await ev('TKTerrain.stats()');assert.equal(ready.pending+ready.running,0,'wait for terrain before comparing movement');await shot('kasumi-ready');
const report={environment:{baseline:baseline||null,viewport:[1400,950],zoom:5,terrainBeforeWait:loadingStart,terrainReady:ready}};
for(const [name,expr] of [['play','TKUI.speed=2'],['pan','TKUI.speed=0']]){
 await ev(expr);await call('Profiler.enable');await call('Profiler.start');
 const before=await call('Performance.getMetrics');const startStats=await ev('({...TKUI.drawStats})');
 if(name==='pan'){for(let i=0;i<24;i++){await ev(`TKUI.cam(...G.PJ(${140.2+(i%12)*.01},36.0),5)`);await sleep(80);}}else await sleep(4000);
 const {profile}=await call('Profiler.stop');const after=await call('Performance.getMetrics');
 const map=new Map(profile.nodes.map(n=>[n.id,n]));const totals={};for(let i=0;i<(profile.samples||[]).length;i++){const n=map.get(profile.samples[i]);const key=n.callFrame.functionName+' '+n.callFrame.url.split('/').pop()+':'+(n.callFrame.lineNumber+1);totals[key]=(totals[key]||0)+(profile.timeDeltas[i]||0)/1000;}
 report[name]={terrainAfter:await ev('TKTerrain.stats()'),baseCache:await ev('TKUI.baseCacheStats||null'),metrics:after.metrics.map(m=>({name:m.name,delta:m.value-(before.metrics.find(b=>b.name===m.name)?.value||0)})).filter(m=>/Duration/.test(m.name)),drawBefore:startStats,drawAfter:await ev('TKUI.drawStats'),cpu:Object.entries(totals).sort((a,b)=>b[1]-a[1]).slice(0,25)};
}
await ev('TKUI.speed=0');console.log(JSON.stringify(report,null,2));fs.writeFileSync(path.join(OUT,'performance.json'),JSON.stringify(report,null,2));console.log('JS_ERRORS',errors);assert.deepEqual(errors,[]);console.log('OUT',OUT);
}catch(e){console.error(e.stack);console.error(errors);try{await shot('failure')}catch{}process.exitCode=1;}finally{clearTimeout(timer);try{await call('Browser.close',{},null)}catch{}chrome.kill();}})();
