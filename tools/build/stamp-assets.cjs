/* kuniezu/templates/index.html の <script src> と <link href>（kuniezu/static/kuniezu/ のファイル）に、中身の確認値の先頭10桁を ?v= で付ける。
   ファイルを更新したらブラウザが古い版を使い続けないようにする（ビルドなしで動かすための最小の仕組み）。
   実行：node tools/build/stamp-assets.cjs    確認だけ：node tools/build/stamp-assets.cjs --check（ずれがあれば失敗） */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),game=path.join(root,'kuniezu/static/kuniezu'),file=path.join(root,'kuniezu/templates/index.html'),check=process.argv.includes('--check');
let stale=[];
/* 先に、レイヤー用の CSS が @import で読むファイル（Bootstrap と系列共通の主題）へ確認値を付ける。
   ページから直接読まないので、ここで付けないと更新してもブラウザが古い版を使い続ける。 */
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex').slice(0,10);
for(const name of ['bootstrap-layer.css']){const cssFile=path.join(game,name);if(!fs.existsSync(cssFile))continue;const css=fs.readFileSync(cssFile,'utf8');
  const next=css.replace(/(@import url\(")([^"?#:]+?\.css)(?:\?v=[0-9a-f]+)?("\))/g,(m,pre,src,post)=>{const p=path.join(game,src);if(!fs.existsSync(p))return m;const out=`${pre}${src}?v=${hash(p)}${post}`;if(out!==m)stale.push(name+' → '+src);return out;});
  if(!check&&next!==css)fs.writeFileSync(cssFile,next);}
const html=fs.readFileSync(file,'utf8');
const out=html.replace(/(<script src="|<link rel="stylesheet" href=")([^"?#:]+?\.(?:js|css))(?:\?v=[0-9a-f]+)?"/g,(m,pre,src)=>{const p=path.join(game,src);if(!fs.existsSync(p))return m;const v=crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex').slice(0,10);const next=`${pre}${src}?v=${v}"`;if(next!==m)stale.push(src);return next;});
if(check){if(stale.length){console.error('FAIL: 読み込みの確認値が古い（node tools/build/stamp-assets.cjs を実行）: '+stale.slice(0,10).join(', '));process.exit(1);}console.log('PASS: asset stamps match');}
else{fs.writeFileSync(file,out);console.log('stamped',stale.length,'files');}
