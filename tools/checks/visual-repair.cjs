/* 起動済みHTTPサーバーを専用Chromeで検証する。サーバーは起動・停止しない。 */
const {spawn}=require('node:child_process');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const URL=process.env.GAME_URL||'http://localhost:8000/index.html';
const OUT=path.resolve(process.env.GAME_TEST_OUTPUT||path.join(os.tmpdir(),'kuniezu-browser-results'));
const DOWNLOAD=path.join(OUT,'downloads-'+Date.now());fs.mkdirSync(DOWNLOAD,{recursive:true});
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'kuniezu-check-'));fs.mkdirSync(OUT,{recursive:true});
const chrome=spawn(process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless','--disable-gpu','--no-first-run','--no-default-browser-check',`--user-data-dir=${profile}`,'--remote-debugging-pipe'],{stdio:['ignore','ignore','ignore','pipe','pipe']});
let seq=0,buf='',session,chooser;const pending=new Map(),errors=[],events=[];
chrome.stdio[4].on('data',data=>{buf+=data.toString();let i;while((i=buf.indexOf('\0'))>=0){const str=buf.slice(0,i);buf=buf.slice(i+1);if(!str)continue;const m=JSON.parse(str);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(p)m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}else{
 events.push(m);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);if(m.method==='Page.fileChooserOpened')chooser=m.params;
 }}});
const call=(method,params={},sid=session)=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});chrome.stdio[3].write(JSON.stringify({id,method,params,...(sid?{sessionId:sid}:{})})+'\0');});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const ev=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
async function until(expr){for(let i=0;i<100;i++){if(await ev(expr))return;await sleep(100);}throw Error('Timed out: '+expr);}
async function click(selector){const p=await ev(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el||el.disabled)throw Error('missing/disabled '+${JSON.stringify(selector)});el.scrollIntoView({block:'center'});const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);await call('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...p});await call('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...p});await sleep(120);}
async function shot(name){const r=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(OUT,name+'.png'),Buffer.from(r.data,'base64'));}
async function view(width,height){await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<820});await sleep(300);}
async function load(){await call('Page.navigate',{url:URL});await until("!!document.querySelector('[data-act=new]')");}
async function start(){await click('[data-act=new]');await click('[data-act=scen][data-id=s1560]');await click('[data-act=start]');await until("TKUI.modal==='intro'");}
async function menu(){await click('#me [data-m=menu]');}
const timer=setTimeout(()=>{console.error('timeout');chrome.kill();process.exitCode=1},180000);
const cover=()=>ev('(()=>{const {corners}=TKUI.mapBounds();return corners[0][0]<=.01&&corners[0][1]<=.01&&corners[1][0]>=innerWidth-.01&&corners[1][1]>=innerHeight-.01})()');
(async()=>{try{
const target=await call('Target.createTarget',{url:'about:blank'},null);session=(await call('Target.attachToTarget',{targetId:target.targetId,flatten:true},null)).sessionId;await call('Runtime.enable');await call('Page.enable');
await view(1400,950);await load();await sleep(3000);await shot('title-wide');assert.ok(await cover());await start();await click('#modal [data-act=close]');
for(const [name,lon,lat,z] of [['terrain',136.7,35.3,4],['minoji',136.76,35.28,8],['otsu',135.85,35.00,8]]){await ev(`TKUI.cam(...G.PJ(${lon},${lat}),${z})`);await sleep(4000);await shot(name);}
assert.ok(await ev('TKTerrain.stats().gsiLoaded>0'));console.log('TERRAIN',await ev('TKTerrain.stats()'));
await ev("TKUI.open('scene',{title:'伏見城の戦い'})");await sleep(250);assert.equal(await ev("document.querySelector('#bPlay').getAttribute('aria-label')"),'一時停止');await click('[data-act=b-play]');await ev("document.querySelector('#modal .mbox').scrollTop=0");await shot('fushimi');
const canvas=await ev("document.querySelector('#bCv').toDataURL('image/png')");fs.writeFileSync(path.join(OUT,'fushimi-map.png'),Buffer.from(canvas.split(',')[1],'base64'));
await click('[data-act=b-close]');
await ev("(()=>{const s=G.S(),t=G.evT({d:TK.lunarDate(1560,5,18)});while(s.t<t){G.day();s.sceneQ=[];}TKUI.api.renderAll();TKUI.cam(...G.PJ(127,38),4);})()");await sleep(400);
const edge=await ev("({visible:TKUI._UP.size,groups:Object.values(TKUI.outsideArmies).reduce((n,a)=>n+a.length,0),side:document.querySelector('#armyEdges button')?.dataset.side})");assert.ok(edge.groups>0);assert.equal(edge.visible,0);assert.ok(edge.side);await shot('armies-outside');await click('#armyEdges button');await sleep(250);assert.ok(await ev('TKUI._UP.size>0'));await shot('armies-focused');
for(const width of [820,390,320]){await view(width,900);await load();assert.ok(await cover());await shot('title-'+width);await click('[data-act=new]');assert.ok(await cover());await shot('scenario-'+width);await click('[data-act=scen][data-id=s1560]');assert.ok(await cover());await shot('pick-'+width);await click('[data-act=start]');await click('#modal [data-act=close]');await sleep(250);
 const hud=await ev("(()=>{const e=document.querySelector('#era'),m=document.querySelector('#me'),d=document.querySelector('#eraTxt .e3');return {top:e.getBoundingClientRect().top,bottom:m.getBoundingClientRect().bottom,date:getComputedStyle(d).display,text:d.innerText,width:document.documentElement.scrollWidth,edge:innerWidth}})()");assert.ok(hud.top<=4);assert.ok(hud.bottom<=115);assert.notEqual(hud.date,'none');assert.ok(hud.text.includes('1560'));assert.ok(hud.width<=hud.edge);assert.ok(await cover());await shot('game-'+width);
 for(const z of [8,.01,4,.01]){await ev(`TKUI.cam(...G.PJ(136.7,35.3),${z})`);await sleep(60);assert.ok(await cover());}await shot('zoom-out-'+width);console.log('HUD',width,hud);
}
await view(1400,950);const n=await ev("(async()=>{let n=0;for(const title of Object.keys(TK.BATTLES)){TKUI.open('scene',{title});await new Promise(r=>requestAnimationFrame(r));if(!document.querySelector('#bCv'))throw Error(title);n++;}TKUI.api.closeModal();return n;})()");assert.equal(n,79);
await ev("(()=>{window.oldDur=TK.BATTLES['伏見城の戦い'].dur;TK.BATTLES['伏見城の戦い'].dur=.1;TKUI.open('scene',{title:'伏見城の戦い'});})()");await sleep(2200);assert.equal(await ev('TKUI.modal'),null);await ev("TK.BATTLES['伏見城の戦い'].dur=window.oldDur");assert.deepEqual(errors,[]);console.log('PASS: full viewport 1400/820/390/320, compact western dates, GSI relief, outside army focus, 79 scenes, Fushimi autoplay/autoclose; JS_ERRORS=[]');console.log('OUT',OUT);
}catch(e){console.error(e.stack);console.error(errors);try{await shot('failure')}catch{}process.exitCode=1;}finally{clearTimeout(timer);try{await call('Browser.close',{},null)}catch{}chrome.kill();}})();
