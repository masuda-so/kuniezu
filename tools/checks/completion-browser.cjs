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
async function shot(name){await ev("(()=>{const e=document.querySelector('.mbox');if(e)e.scrollTop=0;})()");const r=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(OUT,name+'.png'),Buffer.from(r.data,'base64'));}
async function view(width,height){await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<820});await sleep(300);}
async function load(){await call('Page.navigate',{url:URL});await until("!!document.querySelector('[data-act=new]')&&!document.getElementById('boot')");}
async function start(){await click('[data-act=new]');await click('[data-act=scen][data-id=s1560]');await click('#pick [data-act=pick].on');await until("TKUI.mode==='game'&&!TKUI.modal");}
async function menu(){await click('#me [data-m=menu]');}
const timer=setTimeout(()=>{console.error('timeout');chrome.kill();process.exitCode=1},480000);
const cover=()=>ev('(()=>{const {corners}=TKUI.mapBounds();return corners[0][0]<=.01&&corners[0][1]<=.01&&corners[1][0]>=innerWidth-.01&&corners[1][1]>=innerHeight-.01})()');
(async()=>{try{
 const target=await call('Target.createTarget',{url:'about:blank'},null);session=(await call('Target.attachToTarget',{targetId:target.targetId,flatten:true},null)).sessionId;await call('Runtime.enable');await call('Page.enable');
 await view(1400,950);await load();await start();
 await menu();await shot('menu');await click('[data-m=menu-save]');await click('[data-act=save][data-v="1"]');assert.ok(await ev("!!localStorage.getItem('kuniezu-history-v1-1')"));await click('[data-act=modal-back]');assert.equal(await ev('TKUI.modal'),'menu');await click('[data-m=menu-settings]');await shot('settings');await click('[data-act=modal-back]');await click('[data-act=close]');
 const savedT=await ev("(()=>{const s=G.S();s.settings.scenes=false;for(let i=0;i<37;i++){G.day();s.sceneQ=[];}TKUI.api.renderAll();TKUI.speed=1;return s.t;})()");await until("JSON.parse(localStorage.getItem('kuniezu-history-v1-auto')).t>="+savedT);await ev('TKUI.speed=0');await menu();await click('[data-m=menu-save]');await click('[data-act=load][data-v=auto]');assert.ok(await ev('G.S().t')>=savedT);
 await ev("TKUI.cam(...G.PJ(140.35,36),5)");await sleep(10000);await shot('kasumi');
 for(const [i,title] of Object.keys(await ev('TK.BATTLES')).entries()){await ev(`TKUI.open('scene',{title:${JSON.stringify(title)}})`);await until("document.querySelector('canvas[data-map-ready]')?.dataset.mapReady==='true'");assert.ok(await ev("!!document.querySelector('.evidence-scene')"),title);if(i%10===0)console.log('battle maps',i+1,'/ 111');}
 await ev("TKUI.open('scene',{title:'\u4f0f\u898b\u57ce\u306e\u6226\u3044'})");await sleep(250);await click('[data-act=b-play]');await shot('fushimi');await ev("TKUI.open('scene',{title:'\u95a2\u30f6\u539f\u306e\u6226\u3044'})");await sleep(8000);await click('[data-act=b-play]');await shot('sekigahara');
 await ev('TKUI.api.closeModal()');for(const width of [820,390,320,1400]){await view(width,900);await sleep(300);const h=await ev("(()=>{const e=document.querySelector('#era'),m=document.querySelector('#me');return {bottom:m.getBoundingClientRect().bottom,sw:document.documentElement.scrollWidth,w:innerWidth,inside:e.contains(m)}})()");assert.ok(h.sw<=h.w);assert.equal(h.inside,width<=820);if(width<=820)assert.ok(h.bottom<125);await shot('hud-'+width);await menu();await shot('menu-'+width);await click('[data-m=menu-save]');await shot('save-'+width);await click('[data-act=close]');}
 await ev("(()=>{const b=TK.BATTLES['\u4e03\u5c3e\u57ce\u306e\u6226\u3044'];window.dur=b.dur;b.dur=.1;TKUI.open('scene',{title:'\u4e03\u5c3e\u57ce\u306e\u6226\u3044'});})()");await until('TKUI.modal===null');assert.equal(await ev('TKUI.modal'),null);
 assert.deepEqual(errors,[]);console.log('PASS: menu back/save/settings, elapsed-day autosave and restore, all 111 evidence views, responsive HUD, record auto close, no JS exceptions');console.log('OUT',OUT);
}catch(e){console.error(e.stack);console.error(errors);try{console.error('save diagnosis',await ev('({failure:TKUI.saveFailure,keys:Object.keys(localStorage),storageType:typeof TKStorage})'));}catch{}try{await shot('failure')}catch{}process.exitCode=1;}finally{clearTimeout(timer);try{await call('Browser.close',{},null)}catch{}chrome.kill();}})();
