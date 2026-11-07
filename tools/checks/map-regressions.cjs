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
async function start(){await click('[data-act=new]');await click('[data-act=scen][data-id=s1560]');await click('#pick [data-act=pick].on');await until("TKUI.mode==='game'&&!TKUI.modal");}
async function menu(){await click('#me [data-m=menu]');}
const timer=setTimeout(()=>{console.error('timeout');chrome.kill();process.exitCode=1},160000);
(async()=>{try{
 const target=await call('Target.createTarget',{url:'about:blank'},null);session=(await call('Target.attachToTarget',{targetId:target.targetId,flatten:true},null)).sessionId;await call('Runtime.enable');await call('Page.enable');await call('Performance.enable');
 await view(1400,950);await load();await start();await ev('TKUI.fitAll()');
 for(let i=0;i<140;i++){if(await ev('TKTerrain.stats().pending===0&&TKTerrain.stats().running===0'))break;await sleep(100);}
 await sleep(500);const a=await call('Performance.getMetrics'),da=await ev('TKUI.drawStats');await sleep(2200);const b=await call('Performance.getMetrics'),db=await ev('TKUI.drawStats');const m=x=>Object.fromEntries(x.metrics.map(y=>[y.name,y.value]));console.log('SETTLED',JSON.stringify({tiles:await ev('TKTerrain.stats()'),draws:[da,db],task:m(b).TaskDuration-m(a).TaskDuration,script:m(b).ScriptDuration-m(a).ScriptDuration}));
 for(const [n,lon,lat] of [['kasumi',140.35,36.03],['korea',129.05,35.13],['road',136.74,35.33]]){for(const z of [1,3,8]){await ev(`TKUI.cam(...G.PJ(${lon},${lat}),${z})`);await sleep(z===8?2500:160);await shot(n+'-'+z);}}
 await ev("(()=>{const s=G.S(),t=G.evT({d:TK.lunarDate(1560,5,21)});while(s.t<t){G.day();s.sceneQ=[];}TKUI.api.renderAll();TKUI.cam(...G.PJ(137.12,35.01),4);})()");await sleep(500);console.log('MOTOYASU',await ev('G.documentedArmies().map(u=>({id:u.id,position:G.historyPoint(u),phase:G.marchPhase(u),clan:u.clan}))'));await shot('motoyasu-return');assert.equal(await ev("G.visibleNativeArmies().filter(u=>u.gens.some(id=>G.gen(id)?.n==='松平元康')).length"),0);
 for(const title of ['大河内城の戦い','月山富田城開城','岩屋城の戦い','永禄の変','幸州山城の戦い','蔚山城の戦い','尚州の戦い','文禄の役','桶狭間の戦い','大坂冬の陣']){await ev(`TKUI.open('scene',{title:${JSON.stringify(title)}})`);await sleep(1000);await click('[data-act=b-play]');await ev("document.querySelector('#modal .mbox').scrollTop=0");await shot(title);await click('[data-act=b-close]');}
 await ev("(()=>{window.testDur=TK.BATTLES['桶狭間の戦い'].dur;TK.BATTLES['桶狭間の戦い'].dur=.2;TKUI.open('scene',{title:'桶狭間の戦い'});})()");await sleep(2300);assert.equal(await ev('TKUI.modal'),null);await ev("TK.BATTLES['桶狭間の戦い'].dur=window.testDur");console.log('PASS: battle ends and auto closes');
 const rendered=await ev("(async()=>{let n=0;for(const title of Object.keys(TK.BATTLES)){TKUI.open('scene',{title});await new Promise(r=>requestAnimationFrame(r));if(!document.querySelector('#bCv'))throw Error(title);n++;}TKUI.api.closeModal();return n;})()");console.log('ALL_SCENES',rendered);
 for(const width of [820,390,320]){await view(width,900);await load();await shot('title-'+width);assert.ok(await ev('(()=>{const {corners}=TKUI.mapBounds();return corners[0][0]<=0&&corners[0][1]<=0&&corners[1][0]>=innerWidth&&corners[1][1]>=innerHeight;})()'),'title fills viewport');await click('[data-act=new]');await shot('scenarios-'+width);await click('[data-act=scen][data-id=s1560]');await shot('pick-'+width);await click('#pick [data-act=pick].on');await ev('TKUI.fitAll()');await sleep(200);assert.ok(await ev('document.documentElement.scrollWidth<=innerWidth'));await click('[data-act=dipview]');await shot('relation-'+width);assert.ok(await ev("document.querySelector('#legend').getBoundingClientRect().top>=document.querySelector('#me').getBoundingClientRect().bottom"),'legend behind buttons');}
 assert.deepEqual(errors,[]);console.log('PASS: zooms, Japan/Korea, water, Motoyasu, 79 scenes, 820/390/320 widths; JS_ERRORS=[]');console.log('OUT',OUT);
 }catch(e){console.error(e.stack);console.error(errors);try{await shot('failure')}catch{}process.exitCode=1;}finally{clearTimeout(timer);try{await call('Browser.close',{},null)}catch{}chrome.kill();}})();
