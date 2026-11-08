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
 await view(1400,1100);await load();await start();
 const results=[];const names=await ev('Object.keys(TK.BATTLES)');
 for(const [i,title] of names.entries()){
  await ev(`TKUI.open('scene',{title:${JSON.stringify(title)}})`);await until("document.querySelector('#bCv')?.dataset.mapReady==='true'");
  const row=await ev(`(()=>{const sc=TK.BATTLES[${JSON.stringify(title)}],cv=document.querySelector('#bCv'),b=document.querySelector('.mbox');return {title:sc.title,units:sc.units.length,displayed:+cv.dataset.mapParticipants,groups:+cv.dataset.mapGroups,located:+cv.dataset.locatedGroups,people:document.querySelectorAll('.atlas-person-link').length,overflow:b.scrollWidth>b.clientWidth+1};})()`);
  assert.equal(row.units,row.displayed,title);assert.equal(row.people,row.units,title);assert.ok(row.groups>=2,title);assert.equal(row.overflow,false,title);results.push(row);
  if([0,2,3,16,17].includes(i)||await ev(`!!TK.EXTRA_BATTLES[${JSON.stringify(title)}]`)){await click('[data-act=b-play]');await shot('battle-'+String(i).padStart(2,'0'));}
  if(i%10===0)console.log('deployments',i+1,'/ '+names.length);
 }
 for(const width of [320,390,820]){await view(width,900);await ev("TKUI.open('scene',{title:'関ヶ原の戦い'})");await until("document.querySelector('#bCv')?.dataset.mapReady==='true'");await click('[data-act=b-play]');await shot('sekigahara-'+width);assert.equal(await ev("document.querySelector('.mbox').scrollWidth>document.querySelector('.mbox').clientWidth+1"),false);}
 await view(390,900);
 for(const [i,title] of ['伏見城の戦い','三木の干殺し','金ヶ崎の退き口','鳴梁海戦','玉浦海戦'].entries()){
  await ev(`TKUI.open('scene',{title:${JSON.stringify(title)}})`);await until("document.querySelector('#bCv')?.dataset.mapReady==='true'");await click('[data-act=b-play]');await shot('compact-'+i);
  assert.equal(await ev("document.querySelector('.mbox').scrollWidth>document.querySelector('.mbox').clientWidth+1"),false);
  const counts=await ev(`({index:document.querySelectorAll('.evidence-person').length,groups:TK.BATTLES[${JSON.stringify(title)}].atlasGroups.length,unlocated:document.querySelectorAll('.atlas-unlocated').length,unknown:TK.BATTLES[${JSON.stringify(title)}].atlasGroups.filter(g=>g.dock).length})`);assert.equal(counts.index,await ev(`TK.BATTLES[${JSON.stringify(title)}].units.length`));assert.equal(counts.unlocated,await ev(`TK.BATTLES[${JSON.stringify(title)}].atlasGroups.filter(g=>g.dock).reduce((n,g)=>n+g.members.length,0)`));
 }
 await view(1400,1100);await ev("TKUI.open('scene',{title:'関ヶ原の戦い'})");await until("document.querySelector('#bCv')?.dataset.mapReady==='true'");await click('[data-act=b-play]');await ev("document.querySelector('.battle-roster').open=true");await click('[data-act=b-person]');await shot('selected');
 await ev('TKUI.api.closeModal();TKUI.speed=0;TKUI.mapStyle="flat"');await ev("TKUI.cam(...G.PJ(140.35,36),5)");await sleep(500);
 const before=await ev('({...TKUI.baseCacheStats})');for(let i=0;i<10;i++){await ev(`TKUI.cam(...G.PJ(${140.35+i*.001},36),5)`);await sleep(100);}const after=await ev('({...TKUI.baseCacheStats})');console.log('cache',before,after);assert.ok(after.hits>before.hits+5);
 const invalidations=[];
 for(const [label,code] of [['ownership',"G.S().castles.kiyosu.owner='imagawa'"],['alliance',"G.S().ally['oda|hojo']=120"],['year',"G.S().t+=360"],['relation',"TKUI.dipView=true"],['selection',"TKUI.sel='edo'"]]){const b=await ev('TKUI.baseCacheStats.builds');await ev(code+';TKUI.api.renderAll()');await sleep(200);const a=await ev('TKUI.baseCacheStats.builds');assert.ok(a>b,label);invalidations.push(label);}
 await ev('TKUI.mapStyle="relief";TKUI.api.renderAll()');await sleep(1500);await shot('pan');
 fs.writeFileSync(path.join(OUT,'deployments.json'),JSON.stringify({battles:results,cache:{before,after,invalidations},errors},null,2));assert.deepEqual(errors,[]);console.log('PASS all 111 deployment views, every registered participant, responsive 320/390/820, cache reuse, no JS exceptions');console.log('OUT',OUT);
}catch(e){console.error(e.stack);console.error(errors);try{await shot('failure')}catch{}process.exitCode=1;}finally{clearTimeout(timer);try{await call('Browser.close',{},null)}catch{}chrome.kill();}})();
