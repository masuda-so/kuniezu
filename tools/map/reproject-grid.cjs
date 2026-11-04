/* 正本の格子（旧来の簡易平面、game/map/projection.json）から、表示とゲームの平面（ランベルト正角円錐図法、game/map-projection.js）の格子へ
   画像を写す。配信物を作る最初の段。正本は変えない。
   ・出力：game/map/build/grid/provinces.png・gun.png・heightmap.png（16bit 灰色、--height の時だけ）と grid.json（新しい格子の定義と確認値）。
   ・最近傍。出力の各画素の中心を経緯度に戻し、正本の画素を一つ選ぶ（色を混ぜない）。正本の外は海・郡なし・標高なし。
   ・全体を一度に持たない。正本を行ごとに読み、出力の1行が参照する正本の行（最大約1,300行）だけを手元に置く。
   ・出力の格子は、正本の四辺を新平面へ写した外接長方形。画素は正本と同じ 100m（0.17966 単位）。
   実行：node --max-old-space-size=4000 tools/map/reproject-grid.cjs [--height]   （--check：書かずに grid.json が今の正本・投影どおりか確かめる） */
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const MD=require('./map-data.cjs'),{readRGB,readGray16}=require('./png-big.cjs'),TKP=require('../../game/map-projection.js');
const out=path.join(MD.out,'grid'),CHECK=process.argv.includes('--check'),HEIGHT=process.argv.includes('--height');
const P=MD.readProjection(),[OX,OY]=P.origin,S=P.stepUnits,W=P.width,H=P.height;
if(Math.abs(P.K-TKP.legacy.K)>1e-9||Math.abs(P.CX-TKP.legacy.CX)>1e-12||P.LON0!==TKP.legacy.LON0||P.LAT0!==TKP.legacy.LAT0)throw Error('projection.json が game/map-projection.js の legacy と違う');
// 新しい格子：正本の四辺（画素の角）を新平面へ写した外接長方形
let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;const probe=(c,r)=>{const [x,y]=TKP.fromLegacy(OX+c*S,OY+r*S);if(x<x0)x0=x;if(y<y0)y0=y;if(x>x1)x1=x;if(y>y1)y1=y;};
for(let c=0;c<=W;c++){probe(c,0);probe(c,H);}for(let r=0;r<=H;r++){probe(0,r);probe(W,r);}
const GX=Math.floor(x0/S)*S,GY=Math.floor(y0/S)*S,GW=Math.ceil((x1-GX)/S),GH=Math.ceil((y1-GY)/S);
const grid={generated:'tools/map/reproject-grid.cjs',note:'正本（旧来の簡易平面の格子）を表示とゲームの平面（ランベルト正角円錐図法）へ最近傍で写した格子。手で直さない。',
 projection:{...TKP.params,n:TKP.plane.n,unitsPerDegree:TKP.plane.unitsPerDegree,origin:[GX,GY],stepUnits:S,stepMetres:P.stepMetres},width:GW,height:GH,
 source:{sourceSha256:MD.sourceSha256(),projectionSha256:MD.sha(MD.files.projection),legacy:{K:P.K,CX:P.CX,LON0:P.LON0,LAT0:P.LAT0,origin:P.origin,stepUnits:S,width:W,height:H}},files:{}};
// 出力の行 r の各列が参照する正本の [列,行]。64列ごとに計算して間を直線で補う（曲率による誤差は 0.01 画素未満）。返り値は参照する正本の行の [最小,最大]（無ければ [-1,-1]）
const STEP=64,NS=Math.ceil((GW-1)/STEP)+1,sc=new Float64Array(NS),sr=new Float64Array(NS);
function mapRow(r,cols,rows){const Y=GY+(r+.5)*S;for(let i=0;i<NS;i++){const [lx,ly]=TKP.toLegacy(GX+(Math.min(i*STEP,GW-1)+.5)*S,Y);sc[i]=(lx-OX)/S;sr[i]=(ly-OY)/S;}
 let lo=-1,hi=-1;for(let c=0;c<GW;c++){const i=Math.min(NS-2,Math.floor(c/STEP)),span=Math.min((i+1)*STEP,GW-1)-i*STEP||1,a=(c-i*STEP)/span;
  const col=Math.floor(sc[i]+(sc[i+1]-sc[i])*a),row=Math.floor(sr[i]+(sr[i+1]-sr[i])*a),ok=col>=0&&col<W&&row>=0&&row<H;cols[c]=ok?col:-1;rows[c]=ok?row:-1;if(ok){if(lo<0||row<lo)lo=row;if(row>hi)hi=row;}}
 return [lo,hi];}
// 行ごとに受け取って PNG を流し書きする（png-big の writeRGB と同じ形式。bpp=3：RGB 8bit、bpp=2：灰色 16bit）
function pngWriter(file,w,h,bpp,level=3){const fd=fs.openSync(file+'.part','w'),ih=Buffer.alloc(13);ih.writeUInt32BE(w,0);ih.writeUInt32BE(h,4);ih[8]=bpp===2?16:8;ih[9]=bpp===2?0:2;
 const crcT=new Int32Array(256).map((_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c;}),crc=(b,c=-1)=>{for(let i=0;i<b.length;i++)c=crcT[(c^b[i])&255]^(c>>>8);return c;};
 const chunk=(t,d)=>{const l=Buffer.alloc(4);l.writeUInt32BE(d.length);const tb=Buffer.from(t),c=Buffer.alloc(4);c.writeUInt32BE((crc(d,crc(tb))^-1)>>>0);return Buffer.concat([l,tb,d,c]);};
 fs.writeSync(fd,Buffer.from([137,80,78,71,13,10,26,10]));fs.writeSync(fd,chunk('IHDR',ih));
 const def=zlib.createDeflate({level,memLevel:9});let pend=[],size=0,n=0;const flush=()=>{if(!size)return;fs.writeSync(fd,chunk('IDAT',Buffer.concat(pend,size)));pend=[];size=0;};
 def.on('data',d=>{pend.push(d);size+=d.length;if(size>=1<<20)flush();});const done=new Promise((ok,ng)=>{def.on('end',ok);def.on('error',ng);});
 const line=Buffer.alloc(w*bpp+1);
 return {async row(buf){if(buf.length!==w*bpp)throw Error('行の長さが違う '+n);line[0]=0;buf.copy(line,1);n++;if(!def.write(Buffer.from(line)))await new Promise(r=>def.once('drain',r));},
  async end(){if(n!==h)throw Error(`行が足りない ${n}/${h}`);def.end();await done;flush();fs.writeSync(fd,chunk('IEND',Buffer.alloc(0)));fs.closeSync(fd);fs.renameSync(file+'.part',file);return MD.sha(file);}};}
/* 正本を行ごとに読みながら、参照する行がそろった出力の行から順に書く。read は png-big の読み手（pause/resume で読みを止められる）、
   fill(line,c) は正本の外の値、pick(srcRow,srcCol,line,c) が1画素を写す。手元の行が LIMIT を超えたら読みを止め、書いて減ったら再開する。 */
async function reproject(src,dst,read,bpp,fill,pick,onSourceRow){
 const cols=new Int32Array(GW),rows=new Int32Array(GW),need=new Int32Array(GH),lowFrom=new Int32Array(GH+1);// need[r]：行 r に要る正本の最後の行。lowFrom[r]：行 r 以降に要る正本の最初の行
 for(let r=0;r<GH;r++)need[r]=mapRow(r,cols,rows)[1];lowFrom[GH]=H;for(let r=GH-1;r>=0;r--){const lo=mapRow(r,cols,rows)[0];lowFrom[r]=lo<0?lowFrom[r+1]:Math.min(lo,lowFrom[r+1]);}
 const keep=new Map(),ctl={},LIMIT=2600,wr=pngWriter(dst,GW,GH,bpp),line=Buffer.alloc(GW*bpp);let next=0,got=-1,chain=Promise.resolve(),failed=null;
 async function emitUpTo(y){while(next<GH&&need[next]<=y){const r=next++;mapRow(r,cols,rows);
  for(let c=0;c<GW;c++){const row=rows[c];if(row<0){fill(line,c);continue;}const buf=keep.get(row);if(!buf)throw Error(`正本の行 ${row} が手元にない（出力の行 ${r}）`);pick(buf,cols[c],line,c);}
  await wr.row(line);const low=lowFrom[r+1];for(const k of keep.keys())if(k<low)keep.delete(k);}
  if(keep.size<LIMIT/2)ctl.resume?.();}
 const info=await read(src,(y,row)=>{if(failed)return;onSourceRow?.(row);keep.set(y,bpp===2?Uint16Array.from(row):Buffer.from(row));got=y;if(keep.size>LIMIT)ctl.pause?.();
  chain=chain.then(()=>emitUpTo(y)).catch(e=>{failed=e;ctl.resume?.();});},ctl);
 await chain;if(failed)throw failed;await emitUpTo(H);if(got!==H-1||info.width!==W||info.height!==H)throw Error(`${src} の大きさが projection.json と違う`);return wr.end();}
(async()=>{
 const t0=Date.now(),def=MD.readDefinition(),sea=def.byKey.get('sea').rgb,sec=()=>((Date.now()-t0)/1000).toFixed(0)+'s';
 if(CHECK){const f=path.join(out,'grid.json');if(!fs.existsSync(f))throw Error('grid.json が無い。先に node tools/map/reproject-grid.cjs');const g=JSON.parse(fs.readFileSync(f,'utf8'));
  if(JSON.stringify(g.source)!==JSON.stringify(grid.source))throw Error('grid.json の source が今の正本と違う');
  if(JSON.stringify(g.projection)!==JSON.stringify(grid.projection)||g.width!==GW||g.height!==GH)throw Error('grid.json の格子が今の投影と違う');
  for(const [k,v] of Object.entries(g.files))if(MD.sha(path.join(out,k))!==v.sha256)throw Error('grid/'+k+' の確認値が grid.json と違う');console.log('PASS: 円錐図法の格子は正本どおり');return;}
 fs.mkdirSync(out,{recursive:true});
 const rgb=(b,sc,l,c)=>{l[c*3]=b[sc*3];l[c*3+1]=b[sc*3+1];l[c*3+2]=b[sc*3+2];};
 // 正本の区画ごとの画素数（data/audits/raster-province-pixels.json）。正本を読むのはここだけなので、写しながら数える
 const counts=new Map();
 grid.files['provinces.png']={source:'control/provinces.png',outside:'sea',sha256:await reproject(MD.files.provinces,path.join(out,'provinces.png'),readRGB,3,(l,c)=>{l[c*3]=sea[0];l[c*3+1]=sea[1];l[c*3+2]=sea[2];},rgb,
  row=>{for(let x=0;x<W;x++){const c=row[x*3]<<16|row[x*3+1]<<8|row[x*3+2];counts.set(c,(counts.get(c)||0)+1);}})};console.log('provinces',sec());
 const rgbKey=c=>(c>>16)+','+(c>>8&255)+','+(c&255);for(const c of counts.keys())if(!def.byRGB.has(rgbKey(c)))throw Error('definition.csv にない色 '+rgbKey(c));
 fs.writeFileSync(path.join(MD.root,'data/audits/raster-province-pixels.json'),JSON.stringify({generated:'tools/map/reproject-grid.cjs',source:grid.source.sourceSha256,
  provinces:def.rows.filter(Boolean).map(r=>({id:r.id,key:r.key,kind:r.kind,pixels:counts.get(r.rgb[0]<<16|r.rgb[1]<<8|r.rgb[2])||0}))},null,1)+'\n');
 grid.files['gun.png']={source:'admin/gun.png',outside:'0,0,0',sha256:await reproject(path.join(MD.layers.admin,'gun.png'),path.join(out,'gun.png'),readRGB,3,(l,c)=>{l[c*3]=l[c*3+1]=l[c*3+2]=0;},rgb)};console.log('gun',sec());
 if(HEIGHT){const hm=path.join(MD.layers.physical,'heightmap.png'),head=Buffer.alloc(8);const fd=fs.openSync(hm,'r');fs.readSync(fd,head,0,8,0);fs.closeSync(fd);if(head.readUInt32BE(0)!==0x89504e47)throw Error('heightmap.png が PNG ではない（LFS のポインタなら git lfs pull）');
  grid.files['heightmap.png']={source:'physical/heightmap.png',outside:'noData',sha256:await reproject(hm,path.join(out,'heightmap.png'),readGray16,2,(l,c)=>{l[c*2]=0;l[c*2+1]=0;},(b,sc,l,c)=>{const v=b[sc];l[c*2]=v>>8;l[c*2+1]=v&255;})};console.log('heightmap',sec());
  // 陰影の生成器（build-height-cache.py）が読む付属情報。正本の heightmap.json の出典・符号化を引き継ぎ、格子だけ円錐図法のものにする
  const meta=JSON.parse(fs.readFileSync(path.join(MD.layers.physical,'heightmap.json'),'utf8')),hf=path.join(out,'heightmap.png');
  const keep=(({source,product,acquired,license,notice,disclaimer,encoding,resampling,pixelRegistration,basis})=>({source,product,acquired,license,notice,disclaimer,encoding,resampling,pixelRegistration,basis}))(meta);
  fs.writeFileSync(path.join(out,'heightmap.json'),JSON.stringify({kind:'elevation-master',schemaVersion:meta.schemaVersion,factor:1,projection:grid.projection,width:GW,height:GH,...keep,
   file:'heightmap.png',sha256:grid.files['heightmap.png'].sha256,bytes:fs.statSync(hf).size,derivedFrom:{file:'game/map/physical/heightmap.png',sha256:MD.sha(hm),metadataSha256:MD.sha(path.join(MD.layers.physical,'heightmap.json')),method:'nearest; outside the source is noData'}},null,1)+'\n');}
 fs.writeFileSync(path.join(out,'grid.json'),JSON.stringify(grid,null,1));
 console.log(JSON.stringify({width:GW,height:GH,origin:grid.projection.origin,seconds:Math.round((Date.now()-t0)/1000)}));
})().catch(e=>{console.error(e.message);process.exit(1);});
