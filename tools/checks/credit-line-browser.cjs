/* 起動画面の出典の欄（1 行と「出典と利用条件」の全文）を、起動済みHTTPサーバーと専用Chromeで確かめる。サーバーは起動・停止しない。 */
const {spawn}=require('node:child_process');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const URL=process.env.GAME_URL||'http://127.0.0.1:8000/index.html';
const OUT=path.resolve(process.env.GAME_TEST_OUTPUT||path.join(__dirname,'../../data/verification/claude-credit-line'));
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
const timer=setTimeout(()=>{console.error('timeout');chrome.kill();process.exitCode=1},240000);
(async()=>{try{
 const target=await call('Target.createTarget',{url:'about:blank'},null);session=(await call('Target.attachToTarget',{targetId:target.targetId,flatten:true},null)).sessionId;await call('Runtime.enable');await call('Page.enable');
 const report=[];
 for(const [w,h] of [[1400,900],[390,844]]){
  await view(w,h);await load();
  const box=await ev("(()=>{const r=document.getElementById('credit').getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height,width:r.width,text:document.querySelector('#credit .credit-short')?.textContent||''};})()");
  // 幅の広い画面では 1 行、狭い画面でも 3 行まで。画面の下からはみ出さない。
  assert.ok(box.height<=(w>=820?30:72),`credit too tall at ${w}px: ${JSON.stringify(box)}`);assert.ok(box.bottom<=h+1,'credit below the screen');
  assert.match(box.text,/OpenStreetMap/);
  await shot(`title-${w}`);
  await click('#credit .credit-more');await until("!!document.querySelector('#modal:not([hidden])')");
  const modal=await ev("document.getElementById('modal').textContent");
  for(const words of ['Copernicus WorldDEM','旧国・旧郡境界データセット','OpenStreetMap contributors','国土地理院'])assert.ok(modal.includes(words),'full credits lack '+words);
  await shot(`credits-${w}`);report.push({width:w,credit:box});
 }
 fs.writeFileSync(path.join(OUT,'credit-line-browser.json'),JSON.stringify(report,null,1));
 assert.deepEqual(errors,[]);console.log('PASS: title credit is one short line (1400 px) and at most three (390 px); its button opens the full credits; no JS errors');
}catch(e){console.error(e.stack);console.error(errors);try{await shot('failure')}catch{}process.exitCode=1;}finally{clearTimeout(timer);try{await call('Browser.close',{},null)}catch{}chrome.kill();setTimeout(()=>{try{fs.rmSync(profile,{recursive:true,force:true,maxRetries:20,retryDelay:250});}catch{}},500);}})();
