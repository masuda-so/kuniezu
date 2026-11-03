/* 段階1：読み込み後の地図（TKGEO の陸・城の領域・中立地・湖）を、1画素1領域の領域画像（Paradox の provinces 画像と同じ考え方）へ変換する。
   出力：game/map/provinces/<列>-<行>.png（1024画素四方、可逆PNG、海だけのタイルは出さない）、game/map/definition.csv、game/map/manifest.json。
   1画素＝100m（緯度方向）。画素の中心が多角形の内側か（偶奇則）で塗る。漏れ・重なりの集計を manifest に記録する。
   実行：node tools/map/build-provinces.cjs */
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'game/map');
const {TKGEO:T}=require(path.join(root,'tools/checks/history-focus.cjs')).model();
const CONT={x0:-1045,x1:2285,y0:-168,y1:2195};          // game/ui.js の表示範囲と同じ
const STEP=0.1/(111.32/T.K);                            // 100m を地図平面の単位へ（緯度方向）
const W=Math.ceil((CONT.x1-CONT.x0)/STEP),H=Math.ceil((CONT.y1-CONT.y0)/STEP),TILE=1024;
// 領域の一覧：0=海、1=未割当の陸、2..=城の領域、続いて中立地、湖
const defs=[{id:0,key:'sea',name:'海',kind:'sea'},{id:1,key:'unassigned',name:'未割当の陸',kind:'land'}];
const add=(key,name,kind,polys)=>{const id=defs.length;defs.push({id,key,name,kind,polys});return id;};
for(const k of Object.keys(T.terr).sort())add('castle:'+k,k,'land',T.terr[k]);
for(const k of Object.keys(T.neutral||{}).sort())add('neutral:'+k,k,'land',T.neutral[k]);
T.lakes.forEach((poly,i)=>add('lake:'+i,'湖'+i,'lake',[poly]));
if(defs.length>65535)throw Error('too many ids');
// 色：IDから一意の24bit色を決める（隣り合うIDが似た色にならないよう掛け算で散らす）。海は黒に近い紺。
const color=id=>id===0?[8,24,48]:(()=>{const v=(id*2654435761>>>0)%16777213+1;return [v>>16&255,v>>8&255,v&255];})();
const seen=new Set();for(const d of defs){const c=color(d.id).join(',');if(seen.has(c))throw Error('color clash '+d.id);seen.add(c);d.rgb=color(d.id);}
// 偶奇則の走査線塗り。rings は平面座標の平らな配列 [x0,y0,x1,y1,...] の集まり。行 y0..y1 の範囲だけ塗る。
function fill(rings,row0,row1,cb){const edges=[];for(const r of rings){const n=r.length/2;for(let i=0;i<n;i++){const ax=r[i*2],ay=r[i*2+1],bx=r[((i+1)%n)*2],by=r[((i+1)%n)*2+1];if(ay===by)continue;edges.push(ay<by?[ax,ay,bx,by]:[bx,by,ax,ay]);}}
 const py=r=>CONT.y0+(r+.5)*STEP;let lo=Infinity,hi=-Infinity;for(const e of edges){lo=Math.min(lo,e[1]);hi=Math.max(hi,e[3]);}
 const ra=Math.max(row0,Math.ceil((lo-CONT.y0)/STEP-.5)),rb=Math.min(row1-1,Math.floor((hi-CONT.y0)/STEP-.5));if(ra>rb)return;
 const buckets=new Map();for(const e of edges){const s=Math.max(ra,Math.ceil((e[1]-CONT.y0)/STEP-.5));if(s>rb)continue;if(!buckets.has(s))buckets.set(s,[]);buckets.get(s).push(e);}
 let active=[];for(let r=ra;r<=rb;r++){const y=py(r);if(buckets.has(r))active.push(...buckets.get(r));active=active.filter(e=>e[3]>y);const xs=[];for(const e of active)if(e[1]<=y&&e[3]>y)xs.push(e[0]+(y-e[1])/(e[3]-e[1])*(e[2]-e[0]));xs.sort((a,b)=>a-b);
  for(let i=0;i+1<xs.length;i+=2){const c0=Math.max(0,Math.ceil((xs[i]-CONT.x0)/STEP-.5)),c1=Math.min(W-1,Math.floor((xs[i+1]-CONT.x0)/STEP-.5));if(c0<=c1)cb(r,c0,c1);}}}
const bbox=polys=>{let y0=Infinity,y1=-Infinity;for(const p of polys)for(const r of p)for(let i=1;i<r.length;i+=2){y0=Math.min(y0,r[i]);y1=Math.max(y1,r[i]);}return [y0,y1];};
const rowOf=y=>Math.floor((y-CONT.y0)/STEP);
const landB=T.land.map(p=>({p,b:bbox([p])})),items=defs.slice(2).map(d=>({d,b:bbox(d.polys)}));
// PNG（RGB、行ごとのフィルタ0、zlib）。
const crcT=new Int32Array(256).map((_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c;});
const crc=b=>{let c=-1;for(const x of b)c=crcT[(c^x)&255]^(c>>>8);return (c^-1)>>>0;};
const chunk=(t,d)=>{const l=Buffer.alloc(4);l.writeUInt32BE(d.length);const td=Buffer.concat([Buffer.from(t),d]),c=Buffer.alloc(4);c.writeUInt32BE(crc(td));return Buffer.concat([l,td,c]);};
const png=(w,h,rgb)=>{const raw=Buffer.alloc((w*3+1)*h);for(let y=0;y<h;y++)rgb.copy(raw,y*(w*3+1)+1,y*w*3,(y+1)*w*3);const ih=Buffer.alloc(13);ih.writeUInt32BE(w,0);ih.writeUInt32BE(h,4);ih[8]=8;ih[9]=2;return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ih),chunk('IDAT',zlib.deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);};
fs.rmSync(path.join(out,'provinces'),{recursive:true,force:true});fs.mkdirSync(path.join(out,'provinces'),{recursive:true});
const counts=new Float64Array(defs.length);let overlap=0,outsideLand=0;const tiles=[];
const cols=Math.ceil(W/TILE),rowsT=Math.ceil(H/TILE),N=W*H;
const land=new Uint8Array(N),id=new Uint16Array(N),hits=new Uint8Array(N);
// 1) 陸の形（海と陸はこれだけで決める）。2) 城の領域・中立地（重なりは後の領域が勝つ＝キー順で決定的）。3) 湖。
for(const {p} of landB)fill(p,0,H,(r,c0,c1)=>land.fill(1,r*W+c0,r*W+c1+1));
for(const {d} of items)for(const poly of d.polys)fill(poly,0,H,(r,c0,c1)=>{const o=r*W;for(let c=c0;c<=c1;c++){const k=o+c;if(d.kind==='lake'){if(land[k])id[k]=d.id;continue;}if(hits[k]&&id[k]!==d.id)overlap++;hits[k]=1;id[k]=d.id;}});
// 海の上にはみ出した領域は海に戻す。
for(let k=0;k<N;k++)if(!land[k]&&id[k]){if(defs[id[k]].kind==='land')outsideLand++;id[k]=0;}
// 陸なのにどの領域にも入らない画素は、4近傍で陸を伝って最も近い領域に寄せる（SLIVER画素＝約2kmまで）。それより遠い陸は「未割当の陸」。
const SLIVER=20;let frontier=[];for(let k=0;k<N;k++)if(id[k]>1){const x=k%W;if((x>0&&land[k-1]&&!id[k-1])||(x<W-1&&land[k+1]&&!id[k+1])||(k>=W&&land[k-W]&&!id[k-W])||(k<N-W&&land[k+W]&&!id[k+W]))frontier.push(k);}
let filled=0;for(let step=0;step<SLIVER&&frontier.length;step++){const next=[];for(const k of frontier){const x=k%W,v=id[k];for(const n of [x>0?k-1:-1,x<W-1?k+1:-1,k-W,k+W]){if(n<0||n>=N||!land[n]||id[n])continue;id[n]=v;filled++;next.push(n);}}frontier=next;}
let unassigned=0;for(let k=0;k<N;k++){if(land[k]&&!id[k]){id[k]=1;unassigned++;}counts[id[k]]++;}
// 未割当の陸がどこにあるか（タイル単位の画素数）
const unTiles={};for(let k=0;k<N;k++)if(id[k]===1){const t=Math.floor((k%W)/TILE)+'-'+Math.floor(Math.floor(k/W)/TILE);unTiles[t]=(unTiles[t]||0)+1;}
for(let ty=0;ty<rowsT;ty++){const r0=ty*TILE,r1=Math.min(H,r0+TILE),bh=r1-r0;
 for(let tx=0;tx<cols;tx++){const c0=tx*TILE,c1=Math.min(W,c0+TILE),bw=c1-c0;let any=false;const rgb=Buffer.alloc(bw*bh*3);
  for(let y=0;y<bh;y++)for(let x=0;x<bw;x++){const v=id[(r0+y)*W+c0+x];if(v)any=true;const c=defs[v].rgb,o=(y*bw+x)*3;rgb[o]=c[0];rgb[o+1]=c[1];rgb[o+2]=c[2];}
  if(!any)continue;const file=`${tx}-${ty}.png`,buf=png(bw,bh,rgb);fs.writeFileSync(path.join(out,'provinces',file),buf);tiles.push({file,col:tx,row:ty,width:bw,height:bh,sha256:crypto.createHash('sha256').update(buf).digest('hex')});}}
// 縮小版（全体表示用）：f画素ごとに中心の画素を採る（最近傍。領域の色を混ぜない）。400m はタイル、800m は1枚。
const levels=[];for(const f of [4,8]){const w=Math.ceil(W/f),h=Math.ceil(H/f),dirL=path.join(out,'provinces-'+f);fs.rmSync(dirL,{recursive:true,force:true});fs.mkdirSync(dirL,{recursive:true});const lt=[];
 const cw=Math.ceil(w/TILE),ch=Math.ceil(h/TILE);for(let ty=0;ty<ch;ty++)for(let tx=0;tx<cw;tx++){const c0=tx*TILE,r0=ty*TILE,bw=Math.min(TILE,w-c0),bh=Math.min(TILE,h-r0);let any=false;const rgb=Buffer.alloc(bw*bh*3);
  for(let y=0;y<bh;y++){const sy=Math.min(H-1,(r0+y)*f+(f>>1));for(let x=0;x<bw;x++){const sx=Math.min(W-1,(c0+x)*f+(f>>1)),v=id[sy*W+sx];if(v)any=true;const c=defs[v].rgb,o=(y*bw+x)*3;rgb[o]=c[0];rgb[o+1]=c[1];rgb[o+2]=c[2];}}
  if(!any)continue;const file=`${tx}-${ty}.png`,buf=png(bw,bh,rgb);fs.writeFileSync(path.join(dirL,file),buf);lt.push({file,col:tx,row:ty,width:bw,height:bh,sha256:crypto.createHash('sha256').update(buf).digest('hex')});}
 levels.push({factor:f,dir:'provinces-'+f,width:w,height:h,tiles:lt});}
const lost=defs.filter(d=>d.id>1&&!counts[d.id]).map(d=>d.key);
fs.writeFileSync(path.join(out,'definition.csv'),'id;r;g;b;key;name;kind;pixels\n'+defs.map(d=>[d.id,...d.rgb,d.key,d.name,d.kind,counts[d.id]].join(';')).join('\n')+'\n');
const manifest={generated:'tools/map/build-provinces.cjs',basis:'読み込み後の TKGEO（陸・城の領域・中立地・湖）の段階1変換。年代別の補正は未分離。',
 projection:{K:T.K,CX:T.CX,LON0:T.LON0,LAT0:T.LAT0,origin:[CONT.x0,CONT.y0],stepUnits:STEP,stepMetres:100},width:W,height:H,tile:TILE,tiles,levels,
 rules:{seaFromLandMask:true,overlapTiebreak:'後に塗った領域（キーの昇順で後のもの）',sliverAssignPixels:SLIVER,neighbourhood:4,pixelCentre:true},
 checks:{provinces:defs.length,overlapPixels:overlap,landIdOutsideLandPixelsReturnedToSea:outsideLand,sliverPixelsAssigned:filled,unassignedLandPixels:unassigned,unassignedByTile:unTiles,lostProvinces:lost}};
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,1));
console.log('\n',JSON.stringify({W,H,tiles:tiles.length,bytes:tiles.reduce((n,t)=>n+fs.statSync(path.join(out,'provinces',t.file)).size,0),...manifest.checks}));
