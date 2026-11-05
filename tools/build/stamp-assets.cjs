/* kuniezu/static/kuniezu/index.html の <script src> と <link href>（同じフォルダのファイル）に、中身の確認値の先頭10桁を ?v= で付ける。
   ファイルを更新したらブラウザが古い版を使い続けないようにする（ビルドなしで動かすための最小の仕組み）。
   実行：node tools/build/stamp-assets.cjs    確認だけ：node tools/build/stamp-assets.cjs --check（ずれがあれば失敗） */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),game=path.join(root,'kuniezu/static/kuniezu'),file=path.join(game,'index.html'),check=process.argv.includes('--check');
const html=fs.readFileSync(file,'utf8');let stale=[];
const out=html.replace(/(<script src="|<link rel="stylesheet" href=")([^"?#:]+?\.(?:js|css))(?:\?v=[0-9a-f]+)?"/g,(m,pre,src)=>{const p=path.join(game,src);if(!fs.existsSync(p))return m;const v=crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex').slice(0,10);const next=`${pre}${src}?v=${v}"`;if(next!==m)stale.push(src);return next;});
if(check){if(stale.length){console.error('FAIL: 読み込みの確認値が古い（node tools/build/stamp-assets.cjs を実行）: '+stale.slice(0,10).join(', '));process.exit(1);}console.log('PASS: asset stamps match');}
else{fs.writeFileSync(file,out);console.log('stamped',stale.length,'files');}
