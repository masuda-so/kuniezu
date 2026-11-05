/* kuniezu/templates/index.html の <script src> と <link href>（kuniezu/static/kuniezu/ のファイル）に、中身の確認値の先頭10桁を ?v= で付ける。
   ファイルを更新したらブラウザが古い版を使い続けないようにする（ビルドなしで動かすための最小の仕組み）。
   実行：node tools/build/stamp-assets.cjs    確認だけ：node tools/build/stamp-assets.cjs --check（ずれがあれば失敗） */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),game=path.join(root,'kuniezu/static/kuniezu'),file=path.join(root,'kuniezu/templates/index.html'),check=process.argv.includes('--check');
const stamp=bytes=>crypto.createHash('sha256').update(bytes).digest('hex').slice(0,10);
const uiFile=path.join(game,'ui.js'),ui=fs.readFileSync(uiFile,'utf8'),stale=[];
const uiOut=ui.replace(/(faceImg\.src|const portraitFallbackSrc)='(faces(?:-fallback)?\.webp)(?:\?v=[0-9a-f]+)?'/g,
  (m,key,src)=>`${key}='${src}?v=${stamp(fs.readFileSync(path.join(game,src)))}'`);
if(uiOut!==ui)stale.push('ui.js (肖像画像)');
const html=fs.readFileSync(file,'utf8');
const out=html.replace(/(<script src="|<link rel="stylesheet" href=")([^"?#:]+?\.(?:js|css))(?:\?v=[0-9a-f]+)?"/g,(m,pre,src)=>{const p=path.join(game,src);if(!fs.existsSync(p))return m;const v=stamp(p===uiFile?uiOut:fs.readFileSync(p));const next=`${pre}${src}?v=${v}"`;if(next!==m)stale.push(src);return next;});
if(check){if(stale.length){console.error('FAIL: 読み込みの確認値が古い（node tools/build/stamp-assets.cjs を実行）: '+stale.slice(0,10).join(', '));process.exit(1);}console.log('PASS: asset stamps match');}
else{if(uiOut!==ui)fs.writeFileSync(uiFile,uiOut);if(out!==html)fs.writeFileSync(file,out);console.log('stamped',stale.length,'files');}
