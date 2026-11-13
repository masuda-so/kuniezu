/* 郡の塗り（docs/designs/county-territory.md）を起動済みHTTPサーバーと専用Chromeで確かめる。サーバーは起動・停止しない。 */
const {spawn}=require('node:child_process');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const URL=process.env.GAME_URL||'http://127.0.0.1:8000/index.html';
const OUT=path.resolve(process.env.GAME_TEST_OUTPUT||path.join(__dirname,'../../data/verification/claude-county-map'));
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
const evArgs=require('./browser-runtime.cjs')(call);
async function click(selector){const p=await evArgs(selector=>{const el=document.querySelector(selector);if(!el||el.disabled)throw Error('missing/disabled '+selector);el.scrollIntoView({block:'center'});const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};},selector);await call('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...p});await call('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...p});await sleep(120);}
async function shot(name){await ev("(()=>{const e=document.querySelector('.mbox');if(e)e.scrollTop=0;})()");const r=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(OUT,name+'.png'),Buffer.from(r.data,'base64'));}
async function view(width,height){await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<820});await sleep(300);}
async function load(){await call('Page.navigate',{url:URL});await until("!!document.querySelector('[data-act=new]')&&!document.getElementById('boot')");}
async function start(){await click('[data-act=new]');await click('[data-act=scen][data-id=s1560]');await click('#pick [data-act=pick].on');await until("TKUI.mode==='game'&&!TKUI.modal");}
async function menu(){await click('#me [data-m=menu]');}
const timer=setTimeout(()=>{console.error('timeout');chrome.kill();process.exitCode=1},480000);
async function scenario(sid){
 if(sid!=='s1560'){await evArgs(sid=>{G.newGame(sid,'oda');localStorage.setItem('kuniezu-history-v1-county',JSON.stringify(G.S()));TKUI.api.ACT.load({dataset:{v:'county'}});},sid);await until("TKUI.mode==='game'&&!TKUI.modal");}
 await ev('TKUI.speed=0');await until('TKUI.county?.ready()');await sleep(300);
 // 読み込みの後に出る出来事の大きな札と通知は、地図を確かめるために閉じる（ゲームの状態は変えない）。
 await ev("(()=>{const b=document.getElementById('big');if(b)b.hidden=true;document.querySelectorAll('.toast').forEach(t=>t.remove());})()");
}
const VIEWS=[['kinki',135.75,34.9,1.6],['kanto',139.6,35.9,1.4]];
(async()=>{try{
 const target=await call('Target.createTarget',{url:'about:blank'},null);session=(await call('Target.attachToTarget',{targetId:target.targetId,flatten:true},null)).sessionId;await call('Runtime.enable');await call('Page.enable');
 const report=[];
 for(const [w,h] of [[1400,900],[390,844]]){
  await view(w,h);await load();await start();
  for(const sid of ['s1560','s1582','s1600']){
   await scenario(sid);assert.equal(await ev("TKUI.landPaint"),'county');
   for(const [name,lon,lat,z] of VIEWS){await ev(`TKUI.cam(...G.PJ(${lon},${lat}),${z})`);await sleep(700);await shot(`${sid}-${name}-${w}`);}
   // 城がいくつかあっても全部が同じ家の郡（区画の鍵）で家を引ける：桑名
   if(sid==='s1560'){const k=await ev("(()=>{const p=G.PJ(136.68,35.07);return {clan:TKUI.county.clanAt(p[0],p[1]),info:TKUI.county.infoAt(p[0],p[1],G.CN)};})()");assert.ok(k.clan,'Kuwana clan '+JSON.stringify(k));report.push({kuwana:k});}
   // 指した所の説明：京（山城国の葛野郡あたり）
   const info=await ev("(()=>{const p=G.PJ(135.70,35.02);return TKUI.county.infoAt(p[0],p[1],G.CN);})()");
   assert.ok(info&&info.title.includes('郡（')&&info.description,sid+' info');
   report.push({width:w,scenario:sid,date:await ev('(()=>{const d=G.date();return [d.y,d.m,d.d];})()'),kyoto:info});
  }
 }
 // 塗りの色：本物の郡の形とその日の持ち主で試しのキャンバスに塗らせ、郡の中の画素を読む（甲府＝甲斐国山梨郡、1582年は織田）。
 await view(1400,900);await load();await start();await scenario('s1582');
 const paint=await ev(`(()=>{const probe=(lon,lat)=>{const [x,y]=G.PJ(lon,lat),c=document.createElement('canvas');c.width=c.height=40;const g=c.getContext('2d');g.setTransform(1,0,0,1,20-x,20-y);
   TKUI.county.paint(g,[x-20,y-20,x+20,y+20],{clanColor:()=>[255,0,0,255],contextColor:()=>[0,0,255,255],cloudScale:1});const d=g.getImageData(20,20,1,1).data;return {rgba:[...d],info:TKUI.county.infoAt(x,y,G.CN)};};
   return {kofu:probe(138.57,35.66)};})()`);
 assert.deepEqual(paint.kofu.rgba.slice(0,3),[255,0,0],'Kofu painted with the clan colour');assert.ok(paint.kofu.info.role==='織田',JSON.stringify(paint.kofu.info));
 // 雲：規則で決められない郡を地図から探し、試しのキャンバスで白が乗ること
 const cloud=await ev(`(()=>{for(let lon=130;lon<=142;lon+=0.25)for(let lat=31;lat<=40;lat+=0.25){const [x,y]=G.PJ(lon,lat),info=TKUI.county.infoAt(x,y,G.CN);if(info?.description==='持ち主を決められない'){const c=document.createElement('canvas');c.width=c.height=60;const g=c.getContext('2d');g.setTransform(1,0,0,1,30-x,30-y);TKUI.county.paint(g,[x-30,y-30,x+30,y+30],{clanColor:()=>[255,0,0,255],contextColor:()=>null,cloudScale:1});const d=g.getImageData(0,0,60,60).data;let gold=0;for(let i=0;i<d.length;i+=4)if(d[i+3]>0&&d[i]>190&&d[i+1]>140&&d[i+1]<215&&d[i+2]<140)gold++;return {lon,lat,title:info.title,gold};}}return null;})()`);
 assert.ok(cloud&&cloud.gold>0,'gold clouds over an underived county '+JSON.stringify(cloud));
 // 表示設定の選択を実際に変える
 await ev("TKUI.open('menu-settings')");await until("!!document.getElementById('landPaintSetting')");
 await ev("(()=>{const s=document.getElementById('landPaintSetting');s.value='castle';s.dispatchEvent(new Event('change',{bubbles:true}));})()");
 assert.equal(await ev('TKUI.landPaint'),'castle');await ev('TKUI.api.closeModal()');await sleep(500);await shot('castle-paint-1582-1400');
 await ev("TKUI.open('menu-settings')");await until("!!document.getElementById('landPaintSetting')");
 await ev("(()=>{const s=document.getElementById('landPaintSetting');s.value='county';s.dispatchEvent(new Event('change',{bubbles:true}));})()");
 assert.equal(await ev('TKUI.landPaint'),'county');await ev('TKUI.api.closeModal()');
 // 城から離れた郡の面を実際に押すと、郡の説明の小窓が開く
 await ev("TKUI.cam(...G.PJ(138.6,35.7),1.4)");await sleep(700);
 const spot=await ev(`(()=>{const castles=G.CL.map(c=>TKUI.api.w2s(c.x,c.y));for(let sy=200;sy<innerHeight-200;sy+=23)for(let sx=420;sx<innerWidth-200;sx+=23){if(castles.some(([x,y])=>Math.hypot(x-sx,y-sy)<40))continue;if((TKUI.armyGroups||[]).some(g=>Math.hypot(g.x-sx,g.y-sy)<60))continue;const info=TKUI.county.infoAt(...TKUI.api.s2w(sx,sy),G.CN);if(info&&info.description!=='持ち主を決められない')return {sx,sy,title:info.title};}return null;})()`);
 assert.ok(spot,'no clickable county surface found');
 for(const type of ['mousePressed','mouseReleased'])await call('Input.dispatchMouseEvent',{type,x:spot.sx,y:spot.sy,button:'left',clickCount:1});
 await until("!!document.querySelector('#modal')&&document.querySelector('#modal').innerText.includes('郡（')");
 report.push({paint,cloud,clicked:spot,modal:(await ev("document.querySelector('#modal').innerText")).slice(0,120)});await shot('county-click-1582-1400');await ev('TKUI.api.closeModal()');
 fs.writeFileSync(path.join(OUT,'county-map-browser.json'),JSON.stringify({errors,report},null,1));
 assert.deepEqual(errors,[]);console.log('PASS: county paint at 1560/1582/1600, Kinki and Kanto, 1400 and 390 px; clan colour and clouds read from pixels; settings select switches paint; clicking a county opens its description; no JS errors');
}catch(e){console.error(e.stack);console.error(errors);try{await shot('failure')}catch{}process.exitCode=1;}finally{clearTimeout(timer);try{await call('Browser.close',{},null)}catch{}chrome.kill();setTimeout(()=>{try{fs.rmSync(profile,{recursive:true,force:true,maxRetries:20,retryDelay:250});}catch{}},500);}})();
