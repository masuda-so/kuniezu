/* 起動済みHTTPサーバーまたはローカルHTMLを専用Chromeで検証する。 */
const {spawn}=require('node:child_process');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const URL=process.env.GAME_URL||'http://localhost:8000/index.html';
const OUT=path.resolve(process.env.GAME_TEST_OUTPUT||path.join(os.tmpdir(),'kuniezu-browser-results'));
const DOWNLOAD=path.join(OUT,'downloads-'+Date.now());fs.mkdirSync(DOWNLOAD,{recursive:true});
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'kuniezu-check-'));fs.mkdirSync(OUT,{recursive:true});
const chrome=spawn(process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless',...(new globalThis.URL(URL).protocol==='file:'?['--allow-file-access-from-files']:[]),'--disable-gpu','--no-first-run','--no-default-browser-check',`--user-data-dir=${profile}`,'--remote-debugging-pipe'],{stdio:['ignore','ignore','ignore','pipe','pipe']});
let seq=0,buf='',session,chooser;const pending=new Map(),errors=[],events=[];
chrome.stdio[4].on('data',data=>{buf+=data.toString();let i;while((i=buf.indexOf('\0'))>=0){const str=buf.slice(0,i);buf=buf.slice(i+1);if(!str)continue;const m=JSON.parse(str);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(p)m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}else{
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
async function start(){await click('[data-act=new]');await click('[data-act=scen][data-id=s1575]');await click('#pick [data-act=pick].on');await until("TKUI.mode==='game'&&!TKUI.modal");}
async function menu(){await click('#me [data-m=menu]');}
const timer=setTimeout(()=>{console.error('timeout');chrome.kill();process.exitCode=1},480000);

(async()=>{try{
 const target=await call('Target.createTarget',{url:'about:blank'},null);
 session=(await call('Target.attachToTarget',{targetId:target.targetId,flatten:true},null)).sessionId;
 await call('Runtime.enable');await call('Page.enable');await view(1400,1000);await load();await start();await ev('TKUI.speed=0');
 await ev(`(()=>{const make=TKBattleAtlas.make;TKBattleAtlas.make=(...args)=>(window.__siegeController=make(...args));const text=CanvasRenderingContext2D.prototype.fillText;window.__siegeText=[];window.__canvasUnderflows=0;const levels=new WeakMap(),save=CanvasRenderingContext2D.prototype.save,restore=CanvasRenderingContext2D.prototype.restore;CanvasRenderingContext2D.prototype.save=function(){if(this.canvas.id==='bCv')levels.set(this,(levels.get(this)||0)+1);return save.call(this);};CanvasRenderingContext2D.prototype.restore=function(){if(this.canvas.id==='bCv'){const n=levels.get(this)||0;if(!n)window.__canvasUnderflows++;levels.set(this,Math.max(0,n-1));}return restore.call(this);};CanvasRenderingContext2D.prototype.fillText=function(s,...args){if(this.canvas.id==='bCv')window.__siegeText.push(String(s));return text.call(this,s,...args);};})()`);
 const rows=[];
 for(const title of ['上月城の戦い','有岡城の戦い','安濃津城の戦い']){
  await ev(`TKUI.open('scene',{title:${JSON.stringify(title)}})`);
  await until("document.querySelector('#bCv')?.dataset.mapReady==='true'");
  assert.equal(await ev("document.querySelector('#bPlay').getAttribute('aria-label')"),'一時停止',title+' autoplay');
  const phases=await ev(`(()=>{const s=TK.BATTLES[${JSON.stringify(title)}];return [...new Set([0,99,100,...s.calendar.map(v=>Math.min(100,v[0]+1)),...Object.values(s.mapVisibleUntil||{}).flatMap(t=>[t-1,t])])].filter(t=>t>=0&&t<=100).sort((a,b)=>a-b);})()`);
  for(const time of phases){
   const row=await ev(`(()=>{window.__siegeText=[];const seek=document.querySelector('#bSeek');seek.value=${time};seek.dispatchEvent(new Event('input',{bubbles:true}));const c=window.__siegeController,s=TK.BATTLES[${JSON.stringify(title)}];return {title:s.title,time:c.t,clock:document.querySelector('#bClock').textContent,description:document.querySelector('#bNow').textContent,states:c.unitStates().map(u=>({...u,name:s.units.find(v=>v.id===u.id).g})),located:+document.querySelector('#bCv').dataset.locatedGroups,expected:s.atlasGroups.filter(g=>g.point).flatMap(g=>g.members).filter(id=>G.battleUnitVisible(s,s.units.find(u=>u.id===id),c.t)),texts:[...new Set(window.__siegeText)]};})()`);
   assert.equal(row.located,row.expected.length,title+' located '+time);
   for(const state of row.states.filter(s=>s.point&&!s.visible))assert.ok(!row.texts.some(text=>(text===state.name||text.startsWith(state.name+'・'))),title+' exited label '+state.id);
   rows.push(row);
   if([0,99,100].includes(time))await shot(title+'-'+time);
  }
  const removed=await ev(`Object.keys(TK.BATTLES[${JSON.stringify(title)}].mapVisibleUntil||{})`);
  for(const id of removed){
   const row=await ev(`(()=>{const c=window.__siegeController; c.pause();c.seek(100);c.select(${JSON.stringify(id)});return {t:c.t,state:c.unitStates().find(u=>u.id===${JSON.stringify(id)})};})()`);
   assert.ok(row.state?.visible,title+' select departed '+id);
   assert.ok(row.t<100,title+' returns to recorded phase');
  }
  await view(390,844);await ev('window.__siegeController.seek(50)');await shot(title+'-narrow');await view(1400,1000);
  await ev('window.__siegeController.seek(99)');await click('#bPlay');await until('TKUI.modal===null');
 }
 assert.equal(await ev('window.__canvasUnderflows'),0,'balanced counter canvas transforms');
 const fort=await ev(`(()=>{const notices=[];const notify=G.onSuccession;G.onSuccession=(...args)=>{notices.push({clan:args[0],old:args[1]?.n,next:args[2]?.n});notify?.(...args);};const y=G.YOSHO.find(y=>y.n==='中村砦');const dates=[];for(const year of [1578,1579,1580]){const end=G.evT({d:[year,10,1]});while(G.S().t<end){G.day();G.S().evQ=[];G.S().sceneQ=[];G.S().battleQ=[];G.S().propQ=[];}dates.push({year,active:G.yActive(y),owner:G.yOwner(y)});}TKUI.api.renderAll();TKUI.open('branch',{id:y.id});return {dates,id:y.id,notices};})()`);
 assert.deepEqual(fort.dates.map(r=>r.active),[false,true,true]);assert.equal(fort.dates[1].owner,'tokugawa');assert.ok(!fort.notices.some(n=>n.old==='竹中重治'),'retainer death must not become a succession toast');await shot('nakamura-active-1580');
 rows.push({fort});assert.deepEqual(errors,[]);fs.writeFileSync(path.join(OUT,'result.json'),JSON.stringify({rows,errors},null,2));
 console.log('PASS: three siege timelines, dated arrivals/departures, roster selection, wide/narrow display, autoplay and natural close');
}catch(e){console.error(e.stack);console.error(errors);try{await shot('failure')}catch{}process.exitCode=1;}finally{clearTimeout(timer);try{await call('Browser.close',{},null)}catch{}chrome.kill();}})();
