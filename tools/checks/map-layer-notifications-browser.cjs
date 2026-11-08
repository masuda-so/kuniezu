/* 標高の遅い復号を専用Chromeで再現する。サーバーは起動しない。 */
const fs=require('fs'),path=require('path'),os=require('os'),assert=require('assert/strict'),{spawn}=require('child_process');
const root=path.resolve(__dirname,'../..');
const out=path.resolve(process.env.GAME_TEST_OUTPUT||path.join(os.tmpdir(),'kuniezu-layer-notify-results'));fs.mkdirSync(out,{recursive:true});
const page=fs.mkdtempSync(path.join(os.tmpdir(),'kuniezu-layer-notify-page-'));
const url=process.env.GAME_URL||require('../build/game-page.cjs').writeLocalPage(page,root);
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'kuniezu-layer-notify-profile-'));
const chrome=spawn(process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless','--disable-gpu','--no-first-run','--no-default-browser-check','--allow-file-access-from-files','--user-data-dir='+profile,'--remote-debugging-pipe'],{stdio:['ignore','ignore','ignore','pipe','pipe']});
let seq=0,buffer='',session;const pending=new Map();
chrome.stdio[4].on('data',chunk=>{buffer+=chunk;let end;while((end=buffer.indexOf('\0'))>=0){const packet=buffer.slice(0,end);buffer=buffer.slice(end+1);if(!packet)continue;const m=JSON.parse(packet),p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}}});
const call=(method,params={},sid=session)=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});chrome.stdio[3].write(JSON.stringify({id,method,params,...(sid?{sessionId:sid}:{})})+'\0');});
const invoke=async(fn,...values)=>{const global=await call('Runtime.evaluate',{expression:'globalThis'});try{const r=await call('Runtime.callFunctionOn',{objectId:global.result.objectId,functionDeclaration:fn.toString(),arguments:values.map(value=>({value})),returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;}finally{await call('Runtime.releaseObject',{objectId:global.result.objectId}).catch(()=>{});}};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const timeout=setTimeout(()=>{chrome.kill();process.exitCode=1},90000);
(async()=>{try{
const target=await call('Target.createTarget',{url:'about:blank'},null);session=(await call('Target.attachToTarget',{targetId:target.targetId,flatten:true},null)).sessionId;
await call('Runtime.enable');await call('Page.enable');
await call('Page.addScriptToEvaluateOnNewDocument',{source:`
 globalThis.__releaseRelief=false;globalThis.__heldRelief=[];
 const decode=globalThis.createImageBitmap;
 globalThis.createImageBitmap=async function(blob,...args){
  const image=await decode(blob,...args);
  if(blob.type==='image/webp'&&!globalThis.__releaseRelief)await new Promise(resolve=>globalThis.__heldRelief.push(resolve));
  return image;
 };`});
const rows=[];
for(const version of ['current']){
 await call('Page.navigate',{url:url});
 for(let i=0;i<300;i++){if(await invoke(function(){return !!document.querySelector('[data-act=new]')&&!document.getElementById('boot')}))break;if(i===299)throw Error('page load timeout');await sleep(100);}
 await invoke(function(){document.querySelector('[data-act=new]').click();document.querySelector('[data-act=scen][data-id=s1560]').click();document.querySelector('#pick [data-act=pick].on').click();});
 for(let i=0;i<100;i++){if(await invoke(function(){return TKUI.mode==='game'&&!TKUI.modal}))break;if(i===99)throw Error('faction selection did not enter the game');await sleep(100);}
 await invoke(function(){TKUI.speed=0;TKUI.cam(...G.PJ(139.7,36),3);});
 for(let i=0;i<100;i++){if(await invoke(function(){return __heldRelief.length>0&&TKRaster.ready()}))break;if(i===99)throw Error('no held relief bitmap');await sleep(100);}
 let previous=-1,stable=0;for(let i=0;i<80;i++){const current=await invoke(function(){return TKUI.baseCacheStats.builds});stable=current===previous?stable+1:0;previous=current;if(stable>=8)break;await sleep(150);}
 const before=await invoke(function(){return {builds:TKUI.baseCacheStats.builds,revision:TKRelief.revision(),held:__heldRelief.length,day:G.dstr(),cam:TKUI.mapBounds().camera}});
 await invoke(function(){__releaseRelief=true;__heldRelief.splice(0).forEach(release=>release());});
 await sleep(2000);
 const after=await invoke(function(){return {builds:TKUI.baseCacheStats.builds,revision:TKRelief.revision(),day:G.dstr(),cam:TKUI.mapBounds().camera}});
 assert.ok(after.revision>before.revision,version+' late bitmap completes');
 assert.equal(after.day,before.day,version+' simulation stays paused');
 assert.deepEqual(after.cam,before.cam,version+' camera stays still');
 assert.ok(after.builds>before.builds,'stopped view repaints after late relief');
 const shot=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,version+'.png'),Buffer.from(shot.data,'base64'));
 rows.push({version,before,after});
}
fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(rows,null,2));
console.log('PASS: late relief redraws without moving the camera or game date');

}catch(e){console.error(e.stack);process.exitCode=1;}finally{clearTimeout(timeout);const exited=chrome.exitCode!==null||chrome.signalCode!==null?Promise.resolve():new Promise(resolve=>chrome.once('exit',resolve));try{await call('Browser.close',{},null)}catch{}chrome.kill();await exited;fs.rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100});fs.rmSync(page,{recursive:true,force:true});}})();
