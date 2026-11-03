/* 陰影の PNG（標高・陰影の生成器の出力）を、ヘッドレス Chrome の画像変換で WebP に縮め、game/map/relief-<段>/ と
   game/map/relief.json を書く。サーバーは使わない（about:blank の上で変換する）。node に WebP の符号器が無いため。
   実行：SHADE_ROOT=/path/to/output（shade-1, shade-4, shade-8 と各 manifest.json を含む）node tools/map/encode-relief-webp.cjs
   任意：QUALITY=0.82（既定）、CHROME_PATH。生成器の各段の manifest の source・product・acquired・license・notice・disclaimer を引き継ぐ。
   安全のため、全段の入力の確認値を先に照合し、一時フォルダへ全段を書き終えてから配布先と入れ替える。途中で失敗しても既存の画像は消さない。 */
const {spawn}=require('node:child_process');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),SRC=process.env.SHADE_ROOT,Q=+(process.env.QUALITY||0.82),LEVELS=[1,4,8];
if(!SRC)throw Error('SHADE_ROOT を指定してください');
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'kuniezu-webp-'));
const chrome=spawn(process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless','--disable-gpu','--no-first-run','--no-default-browser-check',`--user-data-dir=${profile}`,'--remote-debugging-pipe','about:blank'],{stdio:['ignore','ignore','ignore','pipe','pipe']});
let seq=0,buf='',session;const pending=new Map();
chrome.stdio[4].on('data',d=>{buf+=d.toString();let i;while((i=buf.indexOf('\0'))>=0){const s=buf.slice(0,i);buf=buf.slice(i+1);if(!s)continue;const m=JSON.parse(s);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}}});
const call=(method,params={},sid=session)=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});chrome.stdio[3].write(JSON.stringify({id,method,params,...(sid?{sessionId:sid}:{})})+'\0');});
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{try{
 const target=await call('Target.createTarget',{url:'about:blank'},null);session=(await call('Target.attachToTarget',{targetId:target.targetId,flatten:true},null)).sessionId;await call('Runtime.enable');
 const out={generated:'tools/map/encode-relief-webp.cjs（陰影 PNG をブラウザの WebP 変換で縮めたもの）',quality:Q,levels:[]};
 // 1) 全段の入力を先に照合する（不一致なら何も書かずに止める）
 const inputs=LEVELS.map(f=>{const dir=path.join(SRC,'shade-'+f),m=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
  for(const t of m.tiles)if(sha(fs.readFileSync(path.join(dir,t.file)))!==t.sha256)throw Error('入力の確認値が一致しない: shade-'+f+'/'+t.file);return {f,dir,m};});
 // 2) 一時フォルダへ全段を書く
 const stage=fs.mkdtempSync(path.join(root,'game/map','.relief-stage-'));
 try{for(const {f,dir,m} of inputs){
  if(f===1)Object.assign(out,{gridSha256:m.gridSha256,elevationManifestSha256:m.elevationManifestSha256,source:m.source,product:m.product,acquired:m.acquired,license:m.license,notice:m.notice,disclaimer:m.disclaimer,shading:m.shading});
  const dst=path.join(stage,'relief-'+f);fs.mkdirSync(dst);const tiles=[];
  for(const t of m.tiles){const png=fs.readFileSync(path.join(dir,t.file));
   const r=await call('Runtime.evaluate',{expression:`(async()=>{const im=new Image();im.src='data:image/png;base64,${png.toString('base64')}';await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;c.getContext('2d').drawImage(im,0,0);return c.toDataURL('image/webp',${Q}).split(',')[1];})()`,awaitPromise:true,returnByValue:true});
   if(!r?.result?.value)throw Error('変換に失敗: shade-'+f+'/'+t.file);
   const webp=Buffer.from(r.result.value,'base64'),file=t.file.replace(/\.png$/,'.webp');fs.writeFileSync(path.join(dst,file),webp);
   tiles.push({file,col:t.col,row:t.row,width:png.readUInt32BE(16),height:png.readUInt32BE(20),sourceSha256:t.sha256,sha256:sha(webp)});}
  out.levels.push({factor:f,dir:'relief-'+f,tiles});console.log('level',f,tiles.length,'tiles');}
  fs.writeFileSync(path.join(stage,'relief.json'),JSON.stringify(out,null,1));
  // 3) 全段がそろってから入れ替える（旧版は退避してから消す）
  const old=fs.mkdtempSync(path.join(root,'game/map','.relief-old-'));
  for(const f of LEVELS){const d=path.join(root,'game/map','relief-'+f);if(fs.existsSync(d))fs.renameSync(d,path.join(old,'relief-'+f));fs.renameSync(path.join(stage,'relief-'+f),d);}
  const j=path.join(root,'game/map','relief.json');if(fs.existsSync(j))fs.renameSync(j,path.join(old,'relief.json'));fs.renameSync(path.join(stage,'relief.json'),j);
  fs.rmSync(old,{recursive:true,force:true});
 }finally{fs.rmSync(stage,{recursive:true,force:true});}
}catch(e){console.error(e.stack);process.exitCode=1;}finally{try{await call('Browser.close',{},null)}catch{}chrome.kill();}})();
