/* 正本1560化のHTTP受入検証。起動済み8000番へ専用Chromeで接続する。サーバー/普段のプロファイルは操作しない。
 * 実行: GAME_TEST_OUTPUT=/tmp/kuniezu-kojima-http-result node /tmp/kuniezu-kojima-http-browser.cjs
 * 日付は専用セッションの地図版だけを切り替える。史実イベントを全期間進めた検査とは区別する。
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const URL=process.env.GAME_URL||'http://localhost:8000/index.html',OUT=path.resolve(process.env.GAME_TEST_OUTPUT||'/tmp/kuniezu-kojima-http-result');
const EXPECTED_SOURCE='46ac04975ed4291bd7f1ead55f985818b5daf91f0f84430c8064e909b09bd7a4',EXPECTED_PNG='2b2fe511a86fb8bdfa6b8d671a2883304b21f1499da3a7544f94128922c7f1a1';
const points=[['経ヶ島',133.8108903,34.5610021,'castle:tenjin'],['藤戸寺',133.8095872,34.5601554,'castle:tenjin'],['浮洲岩跡',133.8052177,34.5598924,'castle:tenjin'],['塩生',133.771388,34.476388,'castle:tenjin'],['水島',133.718,34.517,'sea'],['早島の丘',133.81842,34.599915,'castle:bmatsuyama'],['北岸',133.9,34.64,'castle:tenjin'],['宇喜多期',133.83584341367313,34.59907294286741,null]];
const sleep=ms=>new Promise(r=>setTimeout(r,ms)),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
let chrome,profile,session,seq=0,buf='',watchdog;const pending=new Map(),requests=new Map(),errors=[],httpErrors=[],loadFailures=[],rows=[],clicks=[];
function rejectPending(error){for(const p of pending.values()){clearTimeout(p.timer);p.reject(error);}pending.clear();}
function call(method,params={},sid=session){if(!chrome||chrome.exitCode!==null||chrome.signalCode!==null)return Promise.reject(Error('Chrome is not running'));return new Promise((resolve,reject)=>{const id=++seq,timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout: '+method));},30000);pending.set(id,{resolve,reject,timer});chrome.stdio[3].write(JSON.stringify({id,method,params,...(sid?{sessionId:sid}:{})})+'\0');});}
async function ev(expression){const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;}
async function until(expression){for(let i=0;i<150;i++){if(await ev(expression))return;await sleep(100);}throw Error('Timed out: '+expression);}
async function press(p){await call('Input.dispatchMouseEvent',{type:'mouseMoved',...p});await call('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...p});await call('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...p});}
async function button(selector){const p=await ev(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e||e.disabled)throw Error('missing button '+${JSON.stringify(selector)});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);await press(p);await sleep(120);}
async function shot(name){await sleep(350);const s=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(OUT,name+'.png'),Buffer.from(s.data,'base64'));}
async function idle(){for(let i=0;i<100;i++){if(!requests.size){await sleep(300);if(!requests.size)return;}await sleep(100);}throw Error('Network did not settle: '+JSON.stringify([...requests.values()]));}
async function focus(lon=133.82,lat=34.58){await ev(`(()=>{if(TKUI.modal)TKUI.api.closeModal();TKUI.speed=0;TKUI.cam(...G.PJ(${lon},${lat}),8);TKUI.wakeLoop?.();})()`);await sleep(150);}

// ブラウザ内の本物の100m pickAtを使う。2タイルを先に読み、海峡を外海へ迂回しない窓で4近傍を調べる。
function inspectMap(points,P){
 const cell=(lon,lat)=>[Math.floor(((lon-P.LON0)*P.K*P.CX-P.origin[0])/P.stepUnits),Math.floor(((P.LAT0-lat)*P.K-P.origin[1])/P.stepUnits)];
 const kind=(x,y)=>{const d=TKRaster.pickAt(P.origin[0]+(x+.5)*P.stepUnits,P.origin[1]+(y+.5)*P.stepUnits);if(!d||d.factor!==1)throw Error('100m tile not ready '+x+','+y);return d.kind;};
 const [left,top]=cell(133.675,34.625),[right,bottom]=cell(133.925,34.530),[gate,gt]=cell(133.811,34.562),[,gb]=cell(133.811,34.556);
 const west=cell(133.6858034,34.5730514),east=cell(133.9000368,34.5722033),w=right-left+1,seen=new Uint8Array(w*(bottom-top+1));
 const allowed=(x,y)=>x>=left&&x<=right&&y>=top&&y<=bottom&&(x!==gate||y>=gt&&y<=gb)&&kind(x,y)==='sea';
 const queue=[west];seen[(west[1]-top)*w+west[0]-left]=1;let connected=false;
 if(allowed(...west))for(let i=0;i<queue.length;i++){const [x,y]=queue[i];if(x===east[0]&&y===east[1]){connected=true;break;}for(const [xx,yy] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]){if(xx<left||xx>right||yy<top||yy>bottom)continue;const k=(yy-top)*w+xx-left;if(!seen[k]&&allowed(xx,yy)){seen[k]=1;queue.push([xx,yy]);}}}
 return {mode:TKUI.mode,date:G.S()?G.date():null,version:TKMapVersion.active()?.id||null,fujitoPassageConnected:connected,visitedSeaCells:queue.length,points:points.map(([name,lon,lat])=>({name,point:[lon,lat],pick:TKRaster.pickAt(...G.PJ(lon,lat))})),relief:TKRelief.states()};
}
async function inspect(label,date,P){
 if(date)await ev(`(()=>{const s=G.S();s.t=G.evT({d:${JSON.stringify(date)}});s.visualFraction=0;TKUI.acc=0;TKUI.speed=0;TKUI.baseDirty=true;TKUI.wakeLoop?.();})()`);
 await focus();await until(`[[133.59,34.69],[134.09,34.35],...${JSON.stringify(points)}.map(p=>[p[1],p[2]])].every(p=>TKRaster.pickAt(...G.PJ(...p))?.factor===1)`);
 const r=await ev(`(${inspectMap.toString()})(${JSON.stringify(points)},${JSON.stringify(P)})`),expected=date&&date[0]>=1584?'15840101-16160101':null;
 assert.equal(r.version,expected,label+' version');assert.equal(r.fujitoPassageConnected,true,label+' Fujito 4-neighbour passage');
 for(let i=0;i<points.length;i++){const wanted=i===7?(expected?'castle:bmatsuyama':'sea'):points[i][3];assert.equal(r.points[i].pick?.factor,1,label+' 100m '+points[i][0]);assert.equal(r.points[i].pick?.key,wanted,label+' hit '+points[i][0]);}
 rows.push({label,...r});await idle();console.log('PASS',label,'version',r.version,'Fujito connected, 8 hits');return r;
}
async function clickPoint(label,index,expected){
 const [name,lon,lat]=points[index];await focus(lon,lat);await until(`TKRaster.pickAt(...G.PJ(${lon},${lat}))?.factor===1`);
 const p=await ev(`(()=>{const b=TKUI.mapBounds(),w=G.PJ(${lon},${lat}),r=document.getElementById('top').getBoundingClientRect();return {x:r.left+(w[0]-b.camera.x)*b.camera.z+b.viewport[0],y:r.top+(w[1]-b.camera.y)*b.camera.z+b.viewport[1]}})()`);await press(p);await sleep(120);
 const result=await ev('({selected:TKUI.sel||null,modal:TKUI.modal||null})');assert.equal(result.modal,null,label+' no unexpected modal');assert.equal(result.selected,expected,label+' actual click '+name);clicks.push({label,name,...result});await sleep(450);
}
async function main(){
 fs.mkdirSync(OUT,{recursive:true});const address=new globalThis.URL(URL);assert.ok(['http:','https:'].includes(address.protocol));
 async function fetchJson(file){const r=await fetch(new globalThis.URL(file,URL),{signal:AbortSignal.timeout(10000)});assert.equal(r.status,200,file);return r.json();}
 // まだ統合前ならChromeを起動せず止める。HTTPで配られる正本自体も確認する。
 const [manifest,versions]=await Promise.all([fetchJson('map/manifest.json'),fetchJson('map/versions.json')]);assert.equal(manifest.source.sha256,EXPECTED_SOURCE,'new source not deployed');assert.equal(versions.baseProvincesSha256,EXPECTED_SOURCE);assert.deepEqual(versions.versions.map(v=>v.id),['15840101-16160101']);
 const response=await fetch(new globalThis.URL('map_data/provinces.png',URL),{signal:AbortSignal.timeout(10000)});assert.equal(response.status,200);assert.equal(sha(Buffer.from(await response.arrayBuffer())),EXPECTED_PNG,'HTTP canonical PNG');
 profile=fs.mkdtempSync(path.join(os.tmpdir(),'kuniezu-kojima-http-'));chrome=spawn(process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless','--disable-gpu','--no-first-run','--no-default-browser-check',`--user-data-dir=${profile}`,'--remote-debugging-pipe'],{stdio:['ignore','ignore','ignore','pipe','pipe']});
 chrome.on('error',rejectPending);chrome.stdio[3].on('error',rejectPending);chrome.on('exit',()=>rejectPending(Error('Chrome exited')));chrome.stdio[4].on('data',data=>{buf+=data.toString();let at;while((at=buf.indexOf('\0'))>=0){const raw=buf.slice(0,at);buf=buf.slice(at+1);if(!raw)continue;const m=JSON.parse(raw);if(m.id){const p=pending.get(m.id);if(p){clearTimeout(p.timer);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);else if(m.method==='Network.requestWillBeSent')requests.set(m.params.requestId,m.params.request.url);else if(m.method==='Network.responseReceived'&&m.params.response.status>=400)httpErrors.push({url:m.params.response.url,status:m.params.response.status});else if(m.method==='Network.loadingFailed'){loadFailures.push({...m.params,url:requests.get(m.params.requestId)});requests.delete(m.params.requestId);}else if(m.method==='Network.loadingFinished')requests.delete(m.params.requestId);}});
 watchdog=setTimeout(()=>{rejectPending(Error('HTTP acceptance timed out'));chrome.kill();},150000);
 const target=await call('Target.createTarget',{url:'about:blank'},null);session=(await call('Target.attachToTarget',{targetId:target.targetId,flatten:true},null)).sessionId;
 await call('Runtime.enable');await call('Page.enable');await call('Network.enable');await call('Network.setCacheDisabled',{cacheDisabled:true});await call('Emulation.setDeviceMetricsOverride',{width:1400,height:1000,deviceScaleFactor:1,mobile:false});await call('Page.navigate',{url:URL});
 await until("!!document.querySelector('[data-act=new]')&&!document.getElementById('boot')&&TKRaster.ready()&&TKRelief.ready()&&TKEdges.ready()&&TKMapVersion.list().length===1");
 await inspect('title',null,manifest.projection);
 await button('[data-act=new]');await button('[data-act=scen][data-id=s1560]');await button('[data-act=start]');await until("TKUI.modal==='intro'");await button('#modal [data-act=close]');await sleep(600);
 for(const date of [[1560,1,1],[1583,12,30],[1584,1,1],[1600,1,1]]){
  const label=date.join('-');await inspect(label,date,manifest.projection);
  if(date[0]===1560||date[0]===1600){await shot('kojima-'+date[0]);await clickPoint(label,4,null);await clickPoint(label,5,'bmatsuyama');await clickPoint(label,7,date[0]===1600?'bmatsuyama':null);}
 }
 await inspect('1600-to-1560',[1560,1,1],manifest.projection);await clickPoint('1600-to-1560',7,null);await idle();assert.deepEqual(errors,[]);const optionalBrowserRequests=httpErrors.filter(e=>e.status===404&&new globalThis.URL(e.url).pathname==='/favicon.ico');const gameHttpErrors=httpErrors.filter(e=>!optionalBrowserRequests.includes(e));assert.deepEqual(gameHttpErrors,[]);assert.deepEqual(loadFailures,[]);
 fs.writeFileSync(path.join(OUT,'result.json'),JSON.stringify({ok:true,url:URL,scope:'map date switching in an isolated profile; not a full historical simulation',sourceSha256:EXPECTED_SOURCE,canonicalPngSha256:EXPECTED_PNG,rows,clicks,errors,httpErrors,gameHttpErrors,optionalBrowserRequests,loadFailures},null,2)+'\n');console.log('PASS: title/1560/1583/1584/1600, reverse switch, Fujito passage, 8 raster hits per state, 7 actual clicks, no exceptions/game HTTP errors; '+OUT);
}
main().catch(async error=>{console.error(error.stack);process.exitCode=1;fs.mkdirSync(OUT,{recursive:true});fs.writeFileSync(path.join(OUT,'failure.json'),JSON.stringify({ok:false,error:String(error),rows,clicks,errors,httpErrors,loadFailures},null,2)+'\n');if(session)try{await shot('failure');}catch{}}).finally(async()=>{clearTimeout(watchdog);if(chrome){try{await call('Browser.close',{},null);}catch{}chrome.kill();if(chrome.exitCode===null&&chrome.signalCode===null)await Promise.race([new Promise(resolve=>chrome.once('exit',resolve)),sleep(5000)]);}if(profile)fs.rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100});});
