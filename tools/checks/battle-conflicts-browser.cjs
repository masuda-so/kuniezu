/* 起動済みHTTPサーバーを専用Chromeで検証する。起動停止は行わない。
   GAME_OVERRIDE_ROOT/GAME_OVERRIDE_BASE は候補のgame差分のみを専用ブラウザ内で差し替える。 */
const {spawn,execFileSync}=require('node:child_process');
const crypto=require('node:crypto');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const URL=process.env.GAME_URL||'http://localhost:8000/index.html';
const OUT=path.resolve(process.env.GAME_TEST_OUTPUT||path.join(os.tmpdir(),'kuniezu-browser-results'));
// 差し替えの鍵は URL のパス（Django は kuniezu/static/kuniezu/x を /static/kuniezu/x で配る）。ページはテンプレートを描いて返す。
const PAGE=require(path.join(process.env.GAME_REPO_ROOT||process.cwd(),'tools/build/game-page.cjs')),root=process.env.GAME_OVERRIDE_ROOT,overrides={};
if(root){for(const f of execFileSync('git',['-C',root,'diff','--name-only',process.env.GAME_OVERRIDE_BASE||'origin/main','--','kuniezu/static/kuniezu',PAGE.TEMPLATE],{encoding:'utf8'}).trim().split('\n').filter(Boolean)){const p=path.join(root,f);if(!fs.existsSync(p))continue;if(f===PAGE.TEMPLATE)overrides['index.html']=Buffer.from(PAGE.render(root));else overrides[f.slice('kuniezu/'.length)]=fs.readFileSync(p);}}
const TYPES={js:'application/javascript',html:'text/html; charset=utf-8',json:'application/json',css:'text/css',png:'image/png',webp:'image/webp',svg:'image/svg+xml'};
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'kuniezu-check-'));fs.mkdirSync(OUT,{recursive:true});
const chrome=spawn(process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless',...(new globalThis.URL(URL).protocol==='file:'?['--allow-file-access-from-files']:[]),'--disable-gpu','--no-first-run','--no-default-browser-check',`--user-data-dir=${profile}`,'--remote-debugging-pipe'],{stdio:['ignore','ignore','ignore','pipe','pipe']});
let seq=0,buf='',session,chooser;const pending=new Map(),errors=[],events=[];
chrome.stdio[4].on('data',data=>{buf+=data.toString();let i;while((i=buf.indexOf('\0'))>=0){const str=buf.slice(0,i);buf=buf.slice(i+1);if(!str)continue;const m=JSON.parse(str);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(p)m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}else{
 if(m.method==='Fetch.requestPaused'){const f=decodeURIComponent(new globalThis.URL(m.params.request.url).pathname.slice(1))||'index.html',body=overrides[f];if(body)call('Fetch.fulfillRequest',{requestId:m.params.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:TYPES[f.split('.').pop()]||'application/octet-stream'}],body:body.toString('base64')}).catch(e=>console.error(e));else call('Fetch.continueRequest',{requestId:m.params.requestId}).catch(e=>console.error(e));}
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

const timer=setTimeout(()=>{chrome.kill();process.exitCode=1;console.error('campaign browser timeout');},180000);
(async()=>{try{
 const target=await call('Target.createTarget',{url:'about:blank'},null);session=(await call('Target.attachToTarget',{targetId:target.targetId,flatten:true},null)).sessionId;await call('Runtime.enable');await call('Page.enable');if(root)await call('Fetch.enable',{patterns:[{urlPattern:new globalThis.URL(URL).origin+'/*',requestStage:'Request'}]});await view(1400,950);await load();await start();
 await ev('(()=>{window.__campaignMounts=0;for(const owner of [TKBattleAtlas,TKBattlePresentation]){for(const key of ["make","record"]){const fn=owner[key];if(fn)owner[key]=function(...args){__campaignMounts++;return fn.apply(this,args);};}}})()');
 const compass=()=>ev('(()=>{const n=document.getElementById("northMark");return {visible:n.getClientRects().length>0,transform:getComputedStyle(n).transform,rotation:TKUI.mapRotation};})()');
 await ev('TKUI.setMapRotation(16)');
 const mapCompass=await compass();assert.equal(mapCompass.visible,true,'map compass is visible');assert.equal(mapCompass.rotation,16);
 const rows=[];
 for(const width of [940,335]){
  await view(width,950);const before=await ev('__campaignMounts');await run('function(){TKUI.open("scene",{title:"文禄の役"});}');
  const parent=await ev('(()=>{const p=document.querySelector(".mbox.scene");return {title:p.querySelector("h2").textContent,canvas:p.querySelectorAll("canvas").length,play:p.querySelectorAll("#bPlay,#bSeek,[data-act=b-spd]").length,mounts:__campaignMounts,links:[...p.querySelectorAll("[data-act=battle-view]")].map(b=>b.dataset.title),text:p.textContent,rect:p.getBoundingClientRect().toJSON(),viewport:innerWidth};})()');
  assert.equal((await compass()).visible,false,'campaign hides strategic compass');assert.equal(parent.title,'文禄の役');assert.equal(parent.canvas,0);assert.equal(parent.play,0);assert.equal(parent.mounts,before,'parent cannot create a playback instance');assert.ok(parent.links.includes('釜山鎮の戦い'));assert.ok(parent.links.includes('玉浦海戦'));assert.ok(parent.text.includes('東萊城の戦い'));assert.ok(!parent.links.includes('東萊城の戦い'),'unmapped battle stays text only');assert.ok(parent.rect.left>=-1&&parent.rect.right<=parent.viewport+1,'parent fits viewport');await shot('campaign-'+width);
  await click('[data-act=battle-view][data-title="釜山鎮の戦い"]');await until('document.querySelector("#bCv")?.dataset.mapReady==="true"');
  const child=await ev('(()=>{const p=document.querySelector(".mbox.scene");return {title:p.querySelector("h2").textContent,text:p.textContent,canvas:p.querySelectorAll("canvas").length,play:p.querySelectorAll("#bPlay").length,mounts:__campaignMounts,sources:[...p.querySelectorAll(".battle-sources a")].map(a=>({text:a.textContent,url:a.href})),rect:p.getBoundingClientRect().toJSON(),viewport:innerWidth};})()');
  assert.equal((await compass()).visible,false,'battle hides strategic compass');assert.equal(child.title,'釜山鎮の戦い');assert.ok(child.text.includes('朝鮮暦1592年4月14日（1592年5月24日）'));assert.equal(child.canvas,1);assert.equal(child.play,1);assert.ok(child.mounts>before);assert.ok(child.sources.some(s=>s.url.includes('astro.kasi.re.kr')),'KASI conversion citation');assert.ok(child.sources.some(s=>s.url.includes('sillok.history.go.kr/id/knb_12504014_001')),'annals citation');assert.ok(child.rect.left>=-1&&child.rect.right<=child.viewport+1,'child fits viewport');await shot('busan-'+width);
  await click('[data-act=modal-back]');assert.deepEqual(await ev('({title:document.querySelector(".mbox.scene h2").textContent,canvas:document.querySelectorAll(".mbox.scene canvas").length,play:document.querySelectorAll("#bPlay,#bSeek").length})'),{title:'文禄の役',canvas:0,play:0});await click('[data-act=b-close]');assert.equal(await ev('TKUI.modal'),null,'return to map closes modal');assert.deepEqual(await compass(),mapCompass,'map compass returns with its rotation');await run('function(){TKUI.open("menu-settings");}');assert.equal((await compass()).visible,false,'settings hides strategic compass');await run('function(){TKUI.api.closeModal();}');assert.deepEqual(await compass(),mapCompass,'closing settings preserves compass');
  await run('function(){TKUI.open("scene",{title:"関ヶ原の戦い"});}');await until('document.querySelector("#bCv")?.dataset.mapReady==="true"');assert.equal(await ev('document.querySelector(".mbox.scene h2").textContent'),'関ヶ原の戦い');assert.equal(await ev('document.querySelectorAll("[data-act=campaign]").length'),1,'existing Sekigahara separate-fronts UI remains');await click('[data-act=b-close]');rows.push({width,parent,child});
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(OUT,'campaign-result.json'),JSON.stringify({rows,errors},null,2)+'\n');console.log('PASS: campaign text-only view, Busan child/date/citations, parent and map return, existing battle preserved at 940/335px');
}catch(e){console.error(e.stack);console.error(errors);try{await shot('failure');}catch{}process.exitCode=1;}finally{clearTimeout(timer);const stopped=chrome.exitCode!==null||chrome.signalCode!==null?Promise.resolve():new Promise(r=>chrome.once('close',r));try{await call('Browser.close',{},null)}catch{}const force=setTimeout(()=>chrome.kill(),1500);await stopped;clearTimeout(force);fs.rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});}})();
