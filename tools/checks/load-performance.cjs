/* 起動時間と再生中・停止中の負荷を、起動済みHTTPサーバーに専用Chromeで接続して測る。サーバーは起動・停止しない。
   GAME_OVERRIDE_ROOT を指定すると、その作業ツリーで基準コミット（GAME_OVERRIDE_BASE、既定 HEAD）から変えた kuniezu/static/kuniezu/ のファイルだけを差し替えて配信する。 */
const {spawn,execFileSync}=require('node:child_process');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const URL=process.env.GAME_URL||'http://localhost:8000/index.html';
const OUT=path.resolve(process.env.GAME_TEST_OUTPUT||path.join(os.tmpdir(),'kuniezu-load-performance'));fs.mkdirSync(OUT,{recursive:true});
const SCEN=process.env.GAME_PERF_SCENARIO||'s1585';
const [W,H,DSF]=(process.env.GAME_PERF_VIEW||'1024,768,2').split(',').map(Number);
// 差し替えの鍵は URL のパス（Django は kuniezu/static/kuniezu/x を /static/kuniezu/x で配る）。ページはテンプレートを描いて返す。
const PAGE=require('../build/game-page.cjs'),root=process.env.GAME_OVERRIDE_ROOT,overrides={};
if(root){const base=process.env.GAME_OVERRIDE_BASE||'HEAD';const git=(...a)=>execFileSync('git',['-C',root,...a],{encoding:'utf8'}).split('\n').filter(Boolean);
 for(const f of [...git('diff','--name-only',base,'--','kuniezu/static/kuniezu',PAGE.TEMPLATE),...git('ls-files','--others','--exclude-standard','--','kuniezu/static/kuniezu')]){const p=path.join(root,f);if(!fs.existsSync(p))continue;if(f===PAGE.TEMPLATE)overrides['index.html']=Buffer.from(PAGE.render(root));else overrides[f.slice('kuniezu/'.length)]=fs.readFileSync(p);}}
const TYPES={js:'application/javascript',html:'text/html; charset=utf-8',json:'application/json',css:'text/css',png:'image/png',webp:'image/webp',svg:'image/svg+xml'};
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'kuniezu-perf-'));
const chrome=spawn(process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless','--disable-gpu','--no-first-run','--no-default-browser-check',`--user-data-dir=${profile}`,'--remote-debugging-pipe'],{stdio:['ignore','ignore','ignore','pipe','pipe']});
let seq=0,buf='',session;const pending=new Map(),errors=[],net={requests:0,bytes:0,js:0,kinds:{}},urls=new Map();let loadAt=0,domAt=0;
chrome.stdio[4].on('data',data=>{buf+=data.toString();let i;while((i=buf.indexOf('\0'))>=0){const str=buf.slice(0,i);buf=buf.slice(i+1);if(!str)continue;const m=JSON.parse(str);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(p)m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);continue;}
 if(m.method==='Fetch.requestPaused'){const u=new globalThis.URL(m.params.request.url),f=decodeURIComponent(u.pathname.slice(1))||'index.html';const body=overrides[f];
  if(body)call('Fetch.fulfillRequest',{requestId:m.params.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:TYPES[f.split('.').pop()]||'application/octet-stream'}],body:body.toString('base64')}).catch(e=>console.error(e));
  else call('Fetch.continueRequest',{requestId:m.params.requestId}).catch(e=>console.error(e));}
 if(m.method==='Network.requestWillBeSent')urls.set(m.params.requestId,m.params.request.url);
 if(m.method==='Network.loadingFinished'){net.requests++;net.bytes+=m.params.encodedDataLength;const u=urls.get(m.params.requestId)||'',k=(u.startsWith(new globalThis.URL(URL).origin)?'local':new globalThis.URL(u||'about:x').host)+' '+((u.match(/\.(\w+)(\?|$)/)||[])[1]||'');(net.kinds[k]??=[0,0]);net.kinds[k][0]++;net.kinds[k][1]+=m.params.encodedDataLength;}
 if(m.method==='Network.responseReceived'&&/\.js(\?|$)/.test(m.params.response.url))net.js++;
 if(m.method==='Page.loadEventFired')loadAt=m.params.timestamp;if(m.method==='Page.domContentEventFired')domAt=m.params.timestamp;
 if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);}});
const call=(method,params={},sid=session)=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});chrome.stdio[3].write(JSON.stringify({id,method,params,...(sid?{sessionId:sid}:{})})+'\0');});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const ev=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
async function until(expr,limit=900){for(let i=0;i<limit;i++){if(await ev(expr))return;await sleep(100);}throw Error('Timed out: '+expr);}
async function shot(name){const r=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(OUT,name+'.png'),Buffer.from(r.data,'base64'));}
const metrics=async()=>Object.fromEntries((await call('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
// 画面の書き換えを数える。年表や札の変化を MutationObserver で拾う。
const observe=`(()=>{window.__mut=0;window.__raf=0;const o=new MutationObserver(l=>{__mut+=l.length});o.observe(document.body,{subtree:true,childList:true,attributes:true,characterData:true});const f=()=>{__raf++;requestAnimationFrame(f)};requestAnimationFrame(f);return 1})()`;
async function sample(name,ms){const modal0=await ev("TKUI.modal||null"),m0=await metrics(),s0=await ev('({top:TKUI.drawStats.top,base:TKUI.drawStats.base,mut:__mut,raf:__raf,t:G.S().t})'),w0=Date.now();await call("Profiler.enable");await call("Profiler.start");await sleep(ms);const {profile}=await call("Profiler.stop");const nodes=new Map(profile.nodes.map(n=>[n.id,n])),tot={};(profile.samples||[]).forEach((id,i)=>{const n=nodes.get(id).callFrame,k=(n.functionName||"(anon)")+" "+n.url.split("/").pop()+":"+(n.lineNumber+1);tot[k]=(tot[k]||0)+(profile.timeDeltas[i]||0)/1000;});const cpu=Object.entries(tot).filter(([k])=>!/^\((idle|program|garbage)/.test(k)).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([k,v])=>k+" "+Math.round(v)+"ms");
 const m1=await metrics(),s1=await ev('({top:TKUI.drawStats.top,base:TKUI.drawStats.base,mut:__mut,raf:__raf,t:G.S().t})'),sec=(Date.now()-w0)/1000;const d=k=>(m1[k]||0)-(m0[k]||0);
 return {name,seconds:+sec.toFixed(2),topDrawsPerSec:+((s1.top-s0.top)/sec).toFixed(1),baseDrawsPerSec:+((s1.base-s0.base)/sec).toFixed(1),domMutationsPerSec:+((s1.mut-s0.mut)/sec).toFixed(1),framesPerSec:+((s1.raf-s0.raf)/sec).toFixed(1),days:s1.t-s0.t,modal:modal0||(await ev("TKUI.modal||null")),
  mainThreadBusy:+(d('TaskDuration')/sec).toFixed(3),scriptBusy:+(d('ScriptDuration')/sec).toFixed(3),layoutsPerSec:+(d('LayoutCount')/sec).toFixed(1),styleRecalcsPerSec:+(d('RecalcStyleCount')/sec).toFixed(1),heapMB:+(m1.JSHeapUsedSize/1048576).toFixed(1),cpu};}
const timer=setTimeout(()=>{console.error('timeout');chrome.kill();process.exitCode=1},300000);
(async()=>{try{
 const target=await call('Target.createTarget',{url:'about:blank'},null);session=(await call('Target.attachToTarget',{targetId:target.targetId,flatten:true},null)).sessionId;
 await call('Runtime.enable');await call('Page.enable');await call('Network.enable');await call('Performance.enable',{timeDomain:'timeTicks'});await call('Network.setCacheDisabled',{cacheDisabled:true});
 if(root)await call('Fetch.enable',{patterns:[{urlPattern:new globalThis.URL(URL).origin+'/*',requestStage:'Request'}]});
 await call('Emulation.setDeviceMetricsOverride',{width:W,height:H,deviceScaleFactor:DSF,mobile:false});
 const t0=(await metrics()).Timestamp;await call('Page.navigate',{url:URL});
 await until("!!document.querySelector('[data-act=new]')&&!document.getElementById('boot')");const ready=(await metrics()).Timestamp;await until('document.readyState==="complete"');await sleep(300);
 const startup={domContentLoadedSec:+(domAt-t0).toFixed(2),loadSec:+(loadAt-t0).toFixed(2),titleReadySec:+(ready-t0).toFixed(2),requests:net.requests,transferMB:+(net.bytes/1048576).toFixed(2),byKind:Object.fromEntries(Object.entries(net.kinds).sort((a,b)=>b[1][1]-a[1][1]).slice(0,8).map(([k,[n,b]])=>[k,n+"件 "+(b/1048576).toFixed(1)+"MB"])),scripts:await ev("document.querySelectorAll('script[src]').length"),heapMB:+((await metrics()).JSHeapUsedSize/1048576).toFixed(1)};
 await ev("document.querySelector('[data-act=new]').click()");await until("!!document.querySelector('[data-act=scen][data-id="+SCEN+"]')");await ev("document.querySelector('[data-act=scen][data-id="+SCEN+"]').click()");await until("!!document.querySelector('#pick [data-act=pick].on')");await ev("document.querySelector('#pick [data-act=pick].on').click()");await until("TKUI.mode==='game'&&!TKUI.modal");
 await until('!TKUI.modal');await ev(observe);await sleep(1500);
 const rows=[];
 // 新しい地域へ寄った直後の地形タイル読込中（停止中）の負荷。
 await ev("TKUI.speed=0");await ev("TKUI.cam(...G.PJ(130.6,32.4),2.2),1");rows.push({view:"九州へ移動",...await sample("地形読込",6000),tilesLoaded:await ev("TKTerrain.stats().loaded")});
 for(const [view,expr] of [['全国','1'],['近景',"TKUI.cam(...G.PJ(135.6,34.7),1.6),1"]]){await ev(expr);await sleep(1200);await until("TKTerrain.stats().pending+TKTerrain.stats().running===0",600).catch(()=>{});await sleep(500);
  await ev('TKUI.speed=0');rows.push({view,...await sample('停止',3000)});
  await ev('TKUI.speed=2');rows.push({view,...await sample('再生×2',5000)});
  await ev('TKUI.speed=5');rows.push({view,...await sample('再生×16',5000)});await ev('TKUI.speed=0');if(view==='近景')await shot('near-after-play');}
 const report={url:URL,view:[W,H,DSF],overrides:Object.keys(overrides),startup,rows,afterPlay:{heapMB:+((await metrics()).JSHeapUsedSize/1048576).toFixed(1),domNodes:(await metrics()).Nodes}};
 console.log(JSON.stringify(report,null,1));fs.writeFileSync(path.join(OUT,'load-performance.json'),JSON.stringify(report,null,2));console.log('JS_ERRORS',errors);assert.deepEqual(errors,[]);console.log('OUT',OUT);
}catch(e){console.error(e.stack);console.error(errors);try{await shot('failure')}catch{}process.exitCode=1;}finally{clearTimeout(timer);try{await call('Browser.close',{},null)}catch{}chrome.kill();}})();
