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
const timer=setTimeout(()=>{chrome.kill();process.exitCode=1},90000);
(async()=>{try{
 const target=await call('Target.createTarget',{url:'about:blank'},null);session=(await call('Target.attachToTarget',{targetId:target.targetId,flatten:true},null)).sessionId;await call('Runtime.enable');await call('Page.enable');await call('Performance.enable');
 for(const width of [1400,820,390]){await view(width,900);await load();await sleep(1200);await shot('title-'+width);await click('[data-act=new]');await shot('scenarios-'+width);await click('[data-act=scen][data-id=s1560]');await sleep(400);await shot('pick-'+width);}
 await view(1400,900);await load();await start();await click('#modal [data-act=close]');await sleep(4000);
 await ev('TKUI.fitAll()');await sleep(500);await shot('whole');
 const a=await call('Performance.getMetrics');await sleep(3000);const b=await call('Performance.getMetrics');const m=x=>Object.fromEntries(x.metrics.map(y=>[y.name,y.value]));const aa=m(a),bb=m(b);console.log('PAUSED_METRICS',Object.fromEntries(['TaskDuration','ScriptDuration','LayoutDuration','RecalcStyleDuration'].map(k=>[k,bb[k]-aa[k]])));
 await ev("(()=>{const s=G.S();while(G.date().y===1560&&G.date().m<7){G.day();s.sceneQ=[];}TKUI.api.renderAll();})()");await sleep(300);await shot('motoyasu');console.log('REL',await ev("({date:G.date(),allies:G.S().ally,vassal:G.S().vassal})"));
 console.log('JS_ERRORS',errors);console.log('OUT',OUT);
 }catch(e){console.error(e);process.exitCode=1}finally{clearTimeout(timer);try{await call('Browser.close',{},null)}catch{}chrome.kill();}})();
