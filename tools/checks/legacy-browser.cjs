/* 旧版UIの回帰用保管。現在の検証は browser.cjs。 */
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
const timer=setTimeout(()=>{console.error('browser verification timed out');chrome.kill();process.exitCode=1;},150000);
(async()=>{try{
 const target=await call('Target.createTarget',{url:'about:blank'},null);session=(await call('Target.attachToTarget',{targetId:target.targetId,flatten:true},null)).sessionId;
 await call('Runtime.enable');await call('Page.enable');await call('Page.setInterceptFileChooserDialog',{enabled:true});await call('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:DOWNLOAD},null);
 await view(1400,900);await load();await shot('desktop-title');await start();assert.equal(await ev('TKUI.modal'),null);await shot('desktop-game');
 console.log('PASS: title, scenario, immediate faction selection');
 await click('#ppBtn');await sleep(1300);await click('#ppBtn');assert.ok(await ev('G.S().t')>0);await menu();await click('[data-act=save][data-v="1"]');const saved=await ev('G.S().t');await ev('G.S().t+=3');await click('[data-act=load][data-v="1"]');assert.equal(await ev('G.S().t'),saved);
 await menu();await click('[data-act=export]');await untilDownload();const file=fs.readdirSync(DOWNLOAD).filter(n=>n.endsWith('.json')).sort().pop();assert.ok(file);const exported=path.join(DOWNLOAD,file);assert.equal(JSON.parse(fs.readFileSync(exported)).format,'kuniezu');
 await click('[data-act=import]');await untilChooser();await call('DOM.setFileInputFiles',{backendNodeId:chooser.backendNodeId,files:[exported]});await until("TKUI.modal==='import-confirm'");await click('[data-act=import-cancel]');assert.equal(await ev('TKUI.modal'),'menu');chooser=null;
 await click('[data-act=import]');await untilChooser();await call('DOM.setFileInputFiles',{backendNodeId:chooser.backendNodeId,files:[exported]});await until("TKUI.modal==='import-confirm'");await click('[data-act=import-go]');assert.equal(await ev('G.S().t'),saved);assert.equal(await ev('TKUI.modal'),null);
 console.log('PASS: time, pause, save/load, JSON download, import cancel/confirm');
 await ev("TKUI.open('scene',{title:'関ヶ原の戦い'})");await sleep(600);await click('[data-act=b-routes]');assert.equal(await ev("document.querySelector('[data-act=b-routes]').getAttribute('aria-pressed')"),'true');await ev("const slider=document.querySelector('#bSeek');slider.value=50;slider.dispatchEvent(new Event('input',{bubbles:true}))");await sleep(150);assert.equal(await ev("Math.round(+document.querySelector('#bSeek').value)"),50);await shot('desktop-battle');await click('[data-act=site-map]');assert.equal(await ev('TKUI.modal'),'site-map');assert.equal(await ev("document.querySelectorAll('#modal svg circle').length"),4);await shot('desktop-site-map');await click('[data-act=site-back]');await click('[data-act=b-close]');
 await ev("TKUI.open('scene',{title:'大坂冬の陣'})");await sleep(300);const canvasWidth=await ev("document.querySelector('#bCv').getBoundingClientRect().width");await shot('desktop-osaka-winter');await click('[data-act=b-zoom]');assert.ok(await ev("document.querySelector('#bCv').getBoundingClientRect().width")>canvasWidth*1.8);await shot('desktop-osaka-zoom');await click('[data-act=b-close]');
 const rendered=await ev(`(async()=>{let n=0;for(const title of Object.keys(TK.BATTLES)){TKUI.open('scene',{title});await new Promise(r=>requestAnimationFrame(r));if(!document.querySelector('#bCv'))throw Error('missing canvas '+title);n++;}TKUI.api.closeModal();return n;})()`);console.log('PASS: rendered all '+rendered+' battle scenes with common display');
 console.log('PASS: historical battle, route overlay, seek/pause');
 await menu();await click('#modal [data-act=open][data-m=histv]');assert.ok((await ev("document.querySelector('#modal').innerText")).includes('この先、分岐によって止まる史実'));await click('#modal [data-act=close]');
 // 支城の実画面テスト。専用プロフィール内の状態だけを用意し、命令は画面から出す。
 const branch=await ev(`(()=>{const S=G.S();S.clans[S.player].gold=10000;S.clans[S.player].food=10000;const y=G.YOSHO.find(y=>G.branchOffer(y.id).ok&&G.branchCells(y.at).some(c=>c.id===y.id&&c.polygons.length));if(!y)throw Error('no branch frontier');const r=G.branchOffer(y.id);S.clans[S.player].food=Math.floor(r.food*1.5);TKUI.open('branch',{id:y.id});return {id:y.id,at:y.at};})()`);
 await click('[data-act=branch-tac][data-v=hyoro]');assert.ok((await ev("document.querySelector('#modal').innerText")).includes('兵糧'));await click('[data-act=branch-tac][data-v=chikara]');await shot('desktop-branch-order');await click('[data-act=branch-go]');assert.ok(await ev(`!!G.branchUnit(${JSON.stringify(branch.id)})`));
 await ev(`(()=>{for(let i=0;i<280;i++){const S=G.S();G.day();S.evQ=[];S.sceneQ=[];S.battleQ=[];S.propQ=[];if(G.yOwner(G.YOSHO.find(y=>y.id===${JSON.stringify(branch.id)}))===S.player)break;}TKUI.api.renderAll();})()`);assert.equal(await ev(`G.yOwner(G.YOSHO.find(y=>y.id===${JSON.stringify(branch.id)}))===G.S().player`),true);
 await menu();await click('[data-act=save][data-v="2"]');await click('[data-act=load][data-v="2"]');assert.equal(await ev(`G.yOwner(G.YOSHO.find(y=>y.id===${JSON.stringify(branch.id)}))===G.S().player`),true);await ev(`(()=>{const y=G.YOSHO.find(y=>y.id===${JSON.stringify(branch.id)});TKUI.cam(y.x,y.y,2.4);})()`);await sleep(300);await shot('desktop-branch');
 console.log('PASS: branch command/capture, territory generation, branch save/load');
 await view(390,844);await sleep(3000);const hud=await ev("({chronBottom:document.querySelector('#chron').getBoundingClientRect().bottom,chronTop:document.querySelector('#chron').getBoundingClientRect().top,meBottom:document.querySelector('#me').getBoundingClientRect().bottom,eraLine:document.querySelector('#eraTxt .e1').getBoundingClientRect().height})");assert.ok(Math.abs(hud.chronBottom-844)<2);assert.ok(hud.chronTop>hud.meBottom);assert.ok(hud.eraLine<30);await shot('mobile-game');await menu();await shot('mobile-menu');await click('[data-act=open][data-m=menu-help]');await shot('mobile-help');await click('#modal [data-act=close]');
 await ev("TKUI.open('scene',{title:'関ヶ原の戦い'})");await sleep(500);await click('[data-act=b-routes]');await shot('mobile-battle');await click('[data-act=site-map]');await shot('mobile-site-map');await click('[data-act=site-back]');await click('[data-act=b-close]');
 await ev("TKUI.open('scene',{title:'大坂冬の陣'})");await sleep(300);await shot('mobile-osaka-winter');await click('[data-act=b-close]');
 const overflow=await ev('({width:innerWidth,scroll:document.documentElement.scrollWidth})');assert.ok(overflow.scroll<=overflow.width);
 console.log('PASS: mobile 390x844 game/menu/help/battle; no document horizontal overflow');
 await menu();await click('#modal [data-act=to-title]');await start();
 const withdrawal=await ev(`(()=>{const S=G.S();S.clans[S.player].food=50000;S.clans[S.player].gold=10000;const y=G.YOSHO.find(y=>G.branchOffer(y.id).ok),r=G.branchOffer(y.id);TKUI.open('branch',{id:y.id});return {id:y.id,from:r.from,before:S.castles[r.from].troops};})()`);
 await click('[data-act=branch-go]');await ev(`TKUI.open('branch',{id:${JSON.stringify(withdrawal.id)}})`);await click('[data-act=branch-withdraw]');assert.equal(await ev(`G.S().castles[${JSON.stringify(withdrawal.from)}].troops`),withdrawal.before);console.log('PASS: ordinary branch army withdrawal through UI');
 // 改訂した史実表示・関係図・密集表示の回帰。
 await view(1400,1000);
 await ev("TKUI.open('scene',{title:'伏見城の戦い'})");await sleep(450);
 assert.equal(await ev("document.querySelector('#bPlay').getAttribute('aria-label')"),'一時停止');
 assert.ok(await ev("+document.querySelector('#bSeek').value")>0);
 await click('[data-act=b-play]');const paused=await ev("+document.querySelector('#bSeek').value");await sleep(200);assert.equal(await ev("+document.querySelector('#bSeek').value"),paused);
 assert.equal(await ev("document.querySelectorAll('.battle-person').length"),8);
 assert.ok((await ev("document.querySelector('#modal').innerText")).includes('内藤元長'));
 const fitted=await ev("(()=>{const s=document.querySelector('.bcv'),c=document.querySelector('#bCv'),a=document.querySelector('.battle-stage').getBoundingClientRect(),b=document.querySelector('.battle-dock').getBoundingClientRect();return {fits:c.clientHeight<=s.clientHeight+2,inside:b.bottom<=a.bottom&&b.top>=a.top};})()");assert.ok(fitted.fits&&fitted.inside);
 await ev("document.querySelector('.mbox').scrollTop=0");assert.equal(await ev("getComputedStyle(document.querySelector('#news')).visibility"),'hidden');await shot('review-fushimi');
 const worldDate=await ev('G.S().t');await click('[data-act=campaign]');await click('[data-act=campaign-stage][data-i="4"]');
 assert.equal(await ev('G.S().t'),worldDate);assert.equal(await ev("document.querySelectorAll('.campaign-names span').length"),62);
 for(const name of ['本庄繁長','結城秀康','織田信包','前田茂勝','榊原康政','毛利元康'])assert.ok((await ev("document.querySelector('#modal').innerText")).includes(name),name);
 await ev("document.querySelector('.mbox').scrollTop=0");await shot('review-campaign');await click('[data-act=campaign-back]');
 await ev("TKUI.open('scene',{title:'関ヶ原の戦い'});const ss=document.querySelector('#bSeek');ss.value=70;ss.dispatchEvent(new Event('input',{bubbles:true}));");await sleep(100);
 assert.equal(await ev("document.querySelector('[data-id=kobayakawa] small').textContent"),'寝返り');
 assert.equal(await ev("document.querySelector('[data-id=wakisaka]').style.getPropertyValue('--army')"),'#c83c39');
 assert.ok((await ev("document.querySelector('[data-id=kikkawa] small').textContent")).includes('内応'));
 await ev("document.querySelector('.mbox').scrollTop=0");await shot('review-sekigahara');
 await ev("TKUI.open('scene',{title:'大坂冬の陣'});const ws=document.querySelector('#bSeek');ws.value=50;ws.dispatchEvent(new Event('input',{bubbles:true}));window.__rays=[];window.__stroke=CanvasRenderingContext2D.prototype.stroke;CanvasRenderingContext2D.prototype.stroke=function(...args){if(this.canvas.id==='bCv'&&this.getLineDash().length)window.__rays.push([this.strokeStyle,this.getLineDash()]);return window.__stroke.apply(this,args);};");await sleep(150);
 const rays=await ev("window.__rays");assert.ok(rays.some(r=>r[0]==='#c83c39'&&r[1][0]===9));assert.ok(rays.some(r=>r[0]==='#247fc1'&&r[1][0]===2));await ev("CanvasRenderingContext2D.prototype.stroke=window.__stroke;document.querySelector('.mbox').scrollTop=0");await shot('review-osaka-fire');
 await view(390,844);await sleep(200);const mobileFits=await ev("(()=>{const s=document.querySelector('.bcv'),c=document.querySelector('#bCv'),d=document.querySelector('.battle-dock').getBoundingClientRect();return c.clientHeight<=s.clientHeight+2&&d.width<=innerWidth;})()");assert.ok(mobileFits);await shot('review-mobile-osaka');await click('[data-act=b-close]');
 console.log('PASS: autoplay/pause, castle roster, in-frame controls, full initial view, 62-person campaign, defection/collusion and two firing-line styles');
 await view(1400,1000);await menu();await click('#modal [data-act=to-title]');await click('[data-act=new]');await click('[data-act=scen][data-id=s1600]');await click('[data-act=pick][data-clan=tokugawa]');
 assert.equal(await ev("G.S().castles.kyo.owner"),'tokugawa');assert.equal(await ev("G.historicalGarrison('kyo').length"),5);
 await click('[data-act=dipview]');assert.ok((await ev("document.querySelector('#legend').innerText")).includes('中立'));await shot('review-relations');
 const progression=await ev("(()=>{const S=G.S(),f=TK.HIST.find(e=>e.title==='伏見城の戦い'&&e.k==='take'),end=G.evT(f);while(S.t<end-1){G.day();S.evQ=[];S.sceneQ=[];S.battleQ=[];S.propQ=[];}const before=S.castles.kyo.owner;G.day();const after=S.castles.kyo.owner;S.evQ=[];S.sceneQ=[];S.battleQ=[];S.propQ=[];TKUI.api.renderAll();return {before,after,dead:S.gens.find(g=>g.n==='鳥居元忠').dead};})()");assert.deepEqual(progression,{before:'tokugawa',after:'ishida',dead:true});
 const dense=await ev("(()=>{const S=G.S(),sample=S.units.find(u=>u.path.length>1);if(!sample)throw Error('no marching sample');S.units=Array.from({length:8},(_,i)=>({...sample,id:500000+i,gens:[],path:sample.path.slice()}));const c=G.C[sample.path[sample.seg]];TKUI.cam(c.x,c.y,1.5);return S.units.map(u=>u.id);})()");await sleep(250);
 const places=await ev("[...TKUI._UP.values()]");assert.equal(places.length,8);for(let i=0;i<places.length;i++)for(let j=i+1;j<places.length;j++)assert.ok(Math.abs(places[i][0]-places[j][0])>=94||Math.abs(places[i][1]-places[j][1])>=40);await sleep(6000);await shot('review-army-spacing');
 await click('[data-act=army-list]');assert.equal(await ev("document.querySelectorAll('.campaign-grid section').length"),8);await click('#modal [data-act=close]');
 console.log('PASS: actual 1600 daily Fushimi progression, relationship legend and eight coincident moving armies');
 assert.deepEqual(errors,[]);console.log('PASS: no JavaScript runtime errors');console.log('ARTIFACTS',OUT);
 }catch(e){console.error(e.stack);console.error('JS_ERRORS',errors);console.error('ARTIFACTS',OUT);try{await shot('failure');}catch{}process.exitCode=1;
 }finally{clearTimeout(timer);try{await call('Browser.close',{},null);}catch{}chrome.kill();}})();
async function untilChooser(){for(let i=0;i<60;i++){if(chooser)return;await sleep(100);}throw Error('no file chooser');}
async function untilDownload(){for(let i=0;i<60;i++){if(fs.readdirSync(DOWNLOAD).some(n=>n.endsWith('.json')))return;await sleep(100);}throw Error('no download');}
