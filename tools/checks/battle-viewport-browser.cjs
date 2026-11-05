/* 起動済みHTTPサーバーを専用Chromeで検証する。起動停止は行わない。
   GAME_OVERRIDE_ROOT/GAME_OVERRIDE_BASE は候補のgame差分のみを専用ブラウザ内で差し替える。 */
const {spawn,execFileSync}=require('node:child_process');
const crypto=require('node:crypto');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const URL=process.env.GAME_URL||'http://localhost:8000/index.html';
const OUT=path.resolve(process.env.GAME_TEST_OUTPUT||path.join(os.tmpdir(),'kuniezu-browser-results'));
// 差し替えの鍵は URL のパス（Django は kuniezu/static/kuniezu/x を /static/kuniezu/x で配る）。ページはテンプレートを描いて返す。
const PAGE=require('../build/game-page.cjs'),root=process.env.GAME_OVERRIDE_ROOT,overrides={};
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
async function click(selector){const p=await ev(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el||el.disabled)throw Error('missing/disabled '+${JSON.stringify(selector)});el.scrollIntoView({block:'center'});const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);await call('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...p});await call('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...p});await sleep(120);}
async function shot(name){await ev("(()=>{const e=document.querySelector('.mbox');if(e)e.scrollTop=0;})()");const r=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(OUT,name+'.png'),Buffer.from(r.data,'base64'));}
async function view(width,height){await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<820});await sleep(300);}
async function load(){await call('Page.navigate',{url:URL});await until("!!document.querySelector('[data-act=new]')&&!document.getElementById('boot')");}
async function start(){await click('[data-act=new]');await click('[data-act=scen][data-id=s1560]');await click('[data-act=start]');await until("TKUI.modal==='intro'");}
const timer=setTimeout(()=>{console.error('timeout');chrome.kill();process.exitCode=1},480000);
(async()=>{try{
 const target=await call('Target.createTarget',{url:'about:blank'},null);session=(await call('Target.attachToTarget',{targetId:target.targetId,flatten:true},null)).sessionId;
 await call('Runtime.enable');await call('Page.enable');if(root)await call('Fetch.enable',{patterns:[{urlPattern:new globalThis.URL(URL).origin+'/*',requestStage:'Request'}]});await view(1400,1000);await load();await start();await click('#modal [data-act=close]');await ev('TKUI.speed=0');
 await ev(`(()=>{const make=TKBattleAtlas.make;TKBattleAtlas.make=(...args)=>(window.__viewportController=make(...args));})()`);
 const rows=[];
 for(const title of ['関ヶ原の戦い','高天神城の戦い','本能寺の変','耳川の戦い','木津川口の戦い']){
  const exists=await ev(`!!TK.BATTLES[${JSON.stringify(title)}]`);assert.ok(exists,title);
  await ev(`TKUI.open('scene',{title:${JSON.stringify(title)}})`);await until("document.querySelector('#bCv')?.dataset.mapReady==='true'");
  await ev('window.__viewportController.pause();window.__viewportController.seek(50)');
  const snapshot=()=>ev(`(()=>{const c=window.__viewportController,cv=document.querySelector('#bCv'),r=cv.getBoundingClientRect();return {time:c.t,width:r.width,height:r.height,states:c.unitStates(),choices:document.querySelectorAll('.atlas-selection [data-unit-id]').length,views:[...document.querySelectorAll('.atlas-views button')].map(b=>b.textContent)};})()`);
  if(title==='関ヶ原の戦い'){
   const turn=await ev(`(()=>{const u=TK.BATTLES[${JSON.stringify(title)}].units.find(u=>u.turn);return {id:u.id,time:u.turn[0]};})()`);
   const before=await ev(`(()=>{const c=window.__viewportController;c.seek(${turn.time}-2);c.select(${JSON.stringify(turn.id)});window.__choiceImage=document.querySelector('.atlas-selection [data-unit-id] img');return window.__choiceImage?.src;})()`);assert.ok(before,'turning unit has a portrait');
   const after=await ev(`(()=>{window.__viewportController.seek(${turn.time}+2);return {same:window.__choiceImage===document.querySelector('.atlas-selection [data-unit-id] img'),src:window.__choiceImage?.src};})()`);assert.ok(after.same,'turn preserves image node');assert.notEqual(after.src,before,'portrait border follows turn');
   assert.equal(await ev(`(()=>{window.__viewportController.seek(${turn.time}-2);return window.__choiceImage.src;})()`),before,'reverse seek restores portrait border');
   await click('.atlas-selection .mini');await ev('window.__viewportController.seek(50)');assert.ok(await ev("document.querySelector('.atlas-selection').hidden"),'closed panel stays closed');rows.push({title,selectionTurn:turn.id,portraitUpdatesInPlace:true,reverseSeek:true,closeStable:true});
  }
  const base=await snapshot();assert.ok(base.states.length,title);let maxDifference=0;
  for(const [width,height] of [[1400,1000],[390,844],[335,740],[1400,1000]]){
   await view(width,height);await ev('window.__viewportController.seek(50)');const state=await snapshot();
   for(const u of state.states){const b=base.states.find(b=>b.id===u.id);assert.ok(b);assert.equal(u.positionBasis,b.positionBasis);if(b.renderedPoint&&u.renderedPoint){const d=Math.hypot(u.renderedPoint[0]-b.renderedPoint[0],u.renderedPoint[1]-b.renderedPoint[1]);maxDifference=Math.max(maxDifference,d);assert.ok(d<1e-9,title+' resize moves '+u.id+': '+d);}else assert.equal(u.renderedPoint,b.renderedPoint);}
   await shot(title+'-'+width);rows.push({title,viewport:[width,height],...state,maxDifference});
  }
  const buttons=base.views.length;for(let i=0;i<buttons;i++){await ev(`document.querySelectorAll('.atlas-views button')[${i}].click()`);const state=await snapshot();for(const u of state.states){const b=base.states.find(b=>b.id===u.id);if(u.renderedPoint&&b.renderedPoint)assert.ok(Math.hypot(u.renderedPoint[0]-b.renderedPoint[0],u.renderedPoint[1]-b.renderedPoint[1])<1e-9,title+' district moves '+u.id);}rows.push({title,district:i,...state});if(i===1||i===buttons-1)await shot(title+'-district-'+i);}
  const estimated=await ev(`(()=>{const cv=document.querySelector('#bCv'),r=cv.getBoundingClientRect(),u=window.__viewportController.unitStates().find(u=>u.visible&&u.positionBasis==='estimated-placement'&&u.screenPoint&&u.screenPoint[0]>30&&u.screenPoint[0]<r.width-30&&u.screenPoint[1]>30&&u.screenPoint[1]<r.height-30);return u?{id:u.id,x:r.x+u.screenPoint[0],y:r.y+u.screenPoint[1]}:null;})()`);
  if(estimated){await call('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,x:estimated.x,y:estimated.y});await call('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,x:estimated.x,y:estimated.y});await sleep(100);const choices=await ev(`Array.from(document.querySelectorAll('.atlas-selection [data-unit-id]')).map(b=>b.dataset.unitId)`);assert.ok(choices.includes(estimated.id),title+' estimated click '+estimated.id+' choices '+choices);await click('.atlas-selection [data-unit-id="'+estimated.id+'"]');rows.push({title,estimatedClick:estimated.id,choices});await shot(title+'-selected');}
  if(title==='木津川口の戦い')assert.ok(base.states.every(u=>u.point===null&&u.renderedPoint===null),'schematic has no geographic points');
  await ev('TKUI.api.closeModal()');
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(OUT,'result.json'),JSON.stringify({url:URL,candidateOverrides:Object.keys(overrides),candidateHashes:Object.fromEntries(Object.entries(overrides).map(([name,body])=>[name,crypto.createHash('sha256').update(body).digest('hex')])),rows,errors},null,2));console.log('PASS: real Chrome viewport, district projections, estimated body selection and schematic isolation');
}catch(e){console.error(e.stack);console.error(errors);try{await shot('failure')}catch{}process.exitCode=1;}finally{clearTimeout(timer);try{await call('Browser.close',{},null)}catch{}chrome.kill();fs.rmSync(profile,{recursive:true,force:true});}})();
