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
async function start(){await click('[data-act=new]');await click('[data-act=scen][data-id=s1560]');await click('[data-act=start]');await until("TKUI.modal==='intro'");}
async function menu(){await click('#me [data-m=menu]');}
const timer=setTimeout(()=>{console.error('timeout');chrome.kill();process.exitCode=1},480000);
const cover=()=>ev('(()=>{const {corners}=TKUI.mapBounds();return corners[0][0]<=.01&&corners[0][1]<=.01&&corners[1][0]>=innerWidth-.01&&corners[1][1]>=innerHeight-.01})()');
(async()=>{try{
 const target=await call('Target.createTarget',{url:'about:blank'},null);session=(await call('Target.attachToTarget',{targetId:target.targetId,flatten:true},null)).sessionId;await call('Runtime.enable');await call('Page.enable');
 await view(1400,1000);await load();await start();await click('#modal [data-act=close]');await ev('TKUI.speed=0');
 await ev("(()=>{window.testOrigin=G.PJ(136.46,35.36);const u=G.S().units[0];window.testArmies=[0,1,2].map(i=>({...u,id:9100+i,gens:[],commanders:[['徳川家康','石田三成','宇喜多秀家'][i]],clan:['tokugawa','ishida','ukita'][i],state:'march',__p:[...testOrigin,null]}));const old=G.historyPoint;G.historyPoint=u=>u.__p||old(u);G.visibleNativeArmies=()=>testArmies;G.documentedArmies=()=>[];G.marchPhase=()=>({key:'march'});TKUI.cam(...testOrigin,1);})()");await sleep(300);
 for(const zoom of [1,4]){await ev(`TKUI.cam(...testOrigin,${zoom})`);await sleep(250);assert.equal(await ev('TKUI.armyGroups.length'),3);assert.ok(await ev('TKUI.armyGroups.every(g=>g.members.length===1)'));await shot('individual-'+zoom);}
 await ev("TKUI.open('scene',{title:'関ヶ原の戦い'})");await until("document.querySelector('#bCv')?.dataset.mapReady==='true'");
 assert.equal(await ev("+document.querySelector('#bCv').dataset.mapGroups"),await ev("TK.BATTLES['関ヶ原の戦い'].units.length"));assert.equal(await ev("getComputedStyle(document.querySelector('.battle-key')).display"),'none');await shot('sekigahara-individual');
 await ev("TKUI.api.closeModal();TKUI.open('kb',{q:'石川数正'})");await sleep(500);await shot('extra-portrait');
 await ev('TKUI.api.closeModal();TKUI.acc=0;TKUI.speed=1');const day=await ev('G.S().t');await sleep(1200);assert.equal(await ev('G.S().t'),day,'one real second must not advance a day at x1');await sleep(3400);assert.equal(await ev('G.S().t'),day+1,'x1 advances one day in about four seconds');await ev('TKUI.speed=0');assert.deepEqual(errors,[]);console.log('PASS: all 3 armies individual at low/high zoom; every Sekigahara unit independent; removed legend; portrait loads without errors');
}catch(e){console.error(e.stack);console.error(errors);try{await shot('failure')}catch{}process.exitCode=1;}finally{clearTimeout(timer);try{await call('Browser.close',{},null)}catch{}chrome.kill();}})();
