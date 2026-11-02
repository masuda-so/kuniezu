/* 城域の共通分割（日朝共通の算法）。
   国・道の外枠（既存の境）は変えず、その中で隣り合う城どうしの境だけを、地形の「越えにくさ」で引き直す。
   各城から外へ広がる最短の道のりを比べ（多始点の最短経路）、二つの城からの道のりが等しくなる線を境とする。
   越えにくさ：標高の傾斜（共通 DEM：地理院 dem_png、無い所は Mapzen Terrarium）と、主要河川の横断。
   出力は機械的な地形推定であり、領有・郡境の史料ではない。境ごとに basis / sourceIds / confidence を残す。
   使い方: node tools/geo/castle-regions.cjs hikuma kakegawa   （隣接する2城の境を比較生成）  */
const fs=require('node:fs'),path=require('node:path'),decodePNG=require('./png-decode.cjs');
const root=path.resolve(__dirname,'../..'),{G,TKGEO}=require(path.join(root,'tools/checks/history-focus.cjs')).model();
const [A,B]=process.argv.slice(2);if(!A||!B)throw Error('usage: castle-regions.cjs <castleA> <castleB>');
const edge=TKGEO.edges.find(e=>(e[0]===A&&e[1]===B)||(e[0]===B&&e[1]===A));if(!edge)throw Error('not adjacent: '+A+' '+B);
const RIVER_KM=+(process.env.RIVER_KM||25);
const K=TKGEO.K,CX=TKGEO.CX,LON0=TKGEO.LON0,LAT0=TKGEO.LAT0,km=111.32/K;
const toLL=(x,y)=>[LON0+x/K/CX,LAT0-y/K];
// 1) 2城の領域を格子にする（セル 0.35 単位 ≒ 195m）
const rings=[...TKGEO.terr[A],...TKGEO.terr[B]].map(p=>p[0]);
let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;for(const r of rings)for(let i=0;i<r.length;i+=2){x0=Math.min(x0,r[i]);x1=Math.max(x1,r[i]);y0=Math.min(y0,r[i+1]);y1=Math.max(y1,r[i+1]);}
const C=.35,nx=Math.ceil((x1-x0)/C)+3,ny=Math.ceil((y1-y0)/C)+3,ox=x0-C,oy=y0-C,N=nx*ny;
const inRing=(r,x,y)=>{let s=false;for(let i=0,j=r.length-2;i<r.length;j=i,i+=2){const xi=r[i],yi=r[i+1],xj=r[j],yj=r[j+1];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)s=!s;}return s;};
const inside=new Uint8Array(N);for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const x=ox+(i+.5)*C,y=oy+(j+.5)*C;for(const r of rings)if(inRing(r,x,y)){inside[j*nx+i]=1;break;}}
// 2) 標高（地理院 z11 → 無ければ Mapzen z11）。取得したタイルは入力として保存し再現できるようにする
const Z=11,tiles=new Map(),demDir=path.join(root,'data/inputs/castle-regions/dem');fs.mkdirSync(demDir,{recursive:true});
const lonX=lo=>(lo+180)/360*2**Z,latY=la=>(1-Math.asinh(Math.tan(la*Math.PI/180))/Math.PI)/2*2**Z;
async function tile(tx,ty){const key=tx+'/'+ty;if(tiles.has(key))return tiles.get(key);let t=null;
 for(const [prov,url] of [['gsi',`https://cyberjapandata.gsi.go.jp/xyz/dem_png/${Z}/${tx}/${ty}.png`],['dem',`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${Z}/${tx}/${ty}.png`]]){
  const f=path.join(demDir,`${prov}-${Z}-${tx}-${ty}.png`);let buf=null;if(fs.existsSync(f))buf=fs.readFileSync(f);else{const r=await fetch(url);if(r.ok){buf=Buffer.from(await r.arrayBuffer());fs.writeFileSync(f,buf);}}
  if(!buf)continue;const d=decodePNG(buf);t={prov,d};break;}
 tiles.set(key,t);return t;}
async function elev(lo,la){const fx=lonX(lo),fy=latY(la),tx=Math.floor(fx),ty=Math.floor(fy),t=await tile(tx,ty);if(!t)return NaN;const px=Math.min(255,Math.floor((fx-tx)*256)),py=Math.min(255,Math.floor((fy-ty)*256)),i=(py*256+px)*4,d=t.d.data;
 if(t.prov==='gsi'){const n=d[i]*65536+d[i+1]*256+d[i+2];return n===8388608?NaN:(n>8388608?n-16777216:n)*.01;}return d[i]*256+d[i+1]+d[i+2]/256-32768;}
(async()=>{
 const H=new Float32Array(N).fill(NaN);for(let k=0;k<N;k++){if(!inside[k])continue;const i=k%nx,j=(k/nx)|0;H[k]=await elev(...toLL(ox+(i+.5)*C,oy+(j+.5)*C));}
 // 3) 主要河川の格子（共通河川線）。川をまたぐ一歩に大きな越えにくさを足す
 // 共通河川線：TKGEO.rivers に加え、出典付きの追加河川入力（RIVER_INPUTS、[lon,lat] の点列）を同じ形に投影して使う。
 const extraRivers=(process.env.RIVER_INPUTS||'data/inputs/japan-rivers-review/tenryu-oi-modern.json').split(',').filter(f=>fs.existsSync(path.join(root,f))).flatMap(f=>{const d=JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));return (d.rivers||[]).map(r=>r.points.flatMap(([lo,la])=>[(lo-LON0)*K*CX,(LAT0-la)*K]));});
 const river=new Uint8Array(N);for(const r of [...TKGEO.rivers,...extraRivers])for(let i=2;i<r.length;i+=2){const ax=r[i-2],ay=r[i-1],bx=r[i],by=r[i+1],steps=Math.ceil(Math.hypot(bx-ax,by-ay)/(C/2));for(let s=0;s<=steps;s++){const x=ax+(bx-ax)*s/steps,y=ay+(by-ay)*s/steps,ci=Math.floor((x-ox)/C),cj=Math.floor((y-oy)/C);if(ci>=0&&cj>=0&&ci<nx&&cj<ny)river[cj*nx+ci]=1;}}
 // 斜めの一歩で川の格子の隙間をすり抜けないよう、川を1格子ふくらませる
 {const r2=river.slice();for(let k=0;k<N;k++){if(!r2[k])continue;const i=k%nx,j=(k/nx)|0;for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){const ii=i+di,jj=j+dj;if(ii>=0&&jj>=0&&ii<nx&&jj<ny)river[jj*nx+ii]=1;}}}
 // 4) 多始点の最短経路（越えにくさ = 距離 × (1 + 25×傾斜)、川へ入る一歩に +6km 相当）
 const cost=[new Float64Array(N).fill(Infinity),new Float64Array(N).fill(Infinity)];
 const seed=id=>{const c=G.C[id];return Math.floor((c.y-oy)/C)*nx+Math.floor((c.x-ox)/C);};
 for(const [s,id] of [[0,A],[1,B]]){const D=cost[s],heap=[];const push=(d,k)=>{heap.push([d,k]);let i=heap.length-1;while(i){const p=(i-1)>>1;if(heap[p][0]<=d)break;[heap[i],heap[p]]=[heap[p],heap[i]];i=p;}};
  const pop=()=>{const top=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let i=0;for(;;){let l=i*2+1,r=l+1,m=i;if(l<heap.length&&heap[l][0]<heap[m][0])m=l;if(r<heap.length&&heap[r][0]<heap[m][0])m=r;if(m===i)break;[heap[i],heap[m]]=[heap[m],heap[i]];i=m;}}return top;};
  const k0=seed(id);D[k0]=0;push(0,k0);
  while(heap.length){const [d,k]=pop();if(d>D[k])continue;const i=k%nx,j=(k/nx)|0;
   for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const ii=i+di,jj=j+dj;if(ii<0||jj<0||ii>=nx||jj>=ny)continue;const q=jj*nx+ii;if(!inside[q])continue;
    const step=Math.hypot(di,dj)*C*km,dh=Number.isFinite(H[q])&&Number.isFinite(H[k])?Math.abs(H[q]-H[k])/(step*1000):0,w=step*(1+25*dh)+(river[q]&&!river[k]?RIVER_KM:0),nd=d+w;if(nd<D[q]){D[q]=nd;push(nd,q);}}}}
 // 5) 二城からの越えにくさが等しくなる線（差の 0 等値線）を、旧境の両端を結ぶ一本の線として取り出す
 const f=new Float64Array(N);for(let k=0;k<N;k++)f[k]=inside[k]&&Number.isFinite(cost[0][k])&&Number.isFinite(cost[1][k])?cost[0][k]-cost[1][k]:NaN;
 const old=edge[2].flatMap(l=>{const o=[];for(let i=0;i<l.length;i+=2)o.push([l[i],l[i+1]]);return o;}),start=old[0],end=old.at(-1);
 // 差が 0 に近い格子をつなぐ最短路（0 から離れるほど高くつく）で両端を結ぶ
 const near=(p)=>Math.floor((p[1]-oy)/C)*nx+Math.floor((p[0]-ox)/C);const s0=near(start),s1=near(end);
 const W=new Float64Array(N).fill(Infinity),prev=new Int32Array(N).fill(-1),heap=[[0,s0]];W[s0]=0;
 const pop2=()=>{let m=0;for(let i=1;i<heap.length;i++)if(heap[i][0]<heap[m][0])m=i;return heap.splice(m,1)[0];};
 // 境の上の格子 = 隣に相手の城の側の格子があるもの（符号が変わる所）。川で越えにくさが跳ぶ所でも、ちょうど川沿いが境になる。
 const edgeCell=new Uint8Array(N);for(let k=0;k<N;k++){if(!Number.isFinite(f[k]))continue;const i=k%nx,j=(k/nx)|0;for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){const q=(j+dj)*nx+i+di;if(i+di<0||j+dj<0||i+di>=nx||j+dj>=ny)continue;if(Number.isFinite(f[q])&&Math.sign(f[q])!==Math.sign(f[k])){edgeCell[k]=1;break;}}}
 const band=k=>edgeCell[k]?0:Number.isFinite(f[k])?2+Math.min(50,Math.abs(f[k])):1e3;
 while(heap.length){const [d,k]=pop2();if(k===s1)break;if(d>W[k])continue;const i=k%nx,j=(k/nx)|0;
  for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const ii=i+di,jj=j+dj;if(ii<0||jj<0||ii>=nx||jj>=ny)continue;const q=jj*nx+ii;if(!inside[q]&&q!==s1)continue;const nd=d+Math.hypot(di,dj)*(1+4*band(q));if(nd<W[q]){W[q]=nd;prev[q]=k;heap.push([nd,q]);}}}
 if(prev[s1]<0)throw Error('no path between edge endpoints');const cells=[];for(let k=s1;k!==-1;k=prev[k])cells.push(k);cells.reverse();
 let line=[start,...cells.slice(1,-1).map(k=>[ox+((k%nx)+.5)*C,oy+(((k/nx)|0)+.5)*C]),end];
 // 格子の段差を除く：Chaikin 2回（両端は固定）、その後 0.4 単位未満の折れを省く
 for(let it=0;it<2;it++){const o=[line[0]];for(let i=0;i<line.length-1;i++){const a=line[i],b=line[i+1];o.push([a[0]*.75+b[0]*.25,a[1]*.75+b[1]*.25],[a[0]*.25+b[0]*.75,a[1]*.25+b[1]*.75]);}o.push(line.at(-1));line=o;}
 const simplify=(p,tol)=>{const keep=new Uint8Array(p.length);keep[0]=keep[p.length-1]=1;const st=[[0,p.length-1]];while(st.length){const [a,b]=st.pop();let mi=-1,md=tol;for(let i=a+1;i<b;i++){const [ax,ay]=p[a],[bx,by]=p[b],L=Math.hypot(bx-ax,by-ay)||1e-9,d=Math.abs((bx-ax)*(ay-p[i][1])-(ax-p[i][0])*(by-ay))/L;if(d>md){md=d;mi=i;}}if(mi>0){keep[mi]=1;st.push([a,mi],[mi,b]);}}return p.filter((_,i)=>keep[i]);};
 line=simplify(line,.25).map(p=>[+p[0].toFixed(2),+p[1].toFixed(2)]);
 const len=line.slice(1).reduce((n,p,i)=>n+Math.hypot(p[0]-line[i][0],p[1]-line[i][1])*km,0),oldLen=old.slice(1).reduce((n,p,i)=>n+Math.hypot(p[0]-old[i][0],p[1]-old[i][1])*km,0);
 const riverShare=line.filter(p=>{const k=near(p);return river[k];}).length/line.length;
 const provs=[...new Set([...tiles.values()].filter(Boolean).map(t=>t.prov))];
 const out={id:[A,B].sort().join('|'),a:A,b:B,line,oldLine:old,basis:'terrain-estimate',method:`cost-distance equal line (slope ×25, major-river crossing +${RIVER_KM}km), Chaikin×2, simplify 0.25`,sourceIds:provs.map(p=>p==='gsi'?'gsiDemPng':'mapzenTerrarium').concat(['commonRivers'],extraRivers.length?['osmJapanRivers']:[]),confidence:'low',note:'地形の越えにくさによる機械的な推定境。領有・郡境の史料ではない。',lengthKm:+len.toFixed(1),oldLengthKm:+oldLen.toFixed(1),riverShare:+riverShare.toFixed(2),demTiles:tiles.size};
 const dir=path.join(root,'data/inputs/castle-regions');fs.writeFileSync(path.join(dir,`${out.id.replace('|','-')}.json`),JSON.stringify(out,null,1)+'\n');
 console.log(JSON.stringify({id:out.id,points:line.length,lengthKm:out.lengthKm,oldLengthKm:out.oldLengthKm,riverShare:out.riverShare,demTiles:out.demTiles,sources:out.sourceIds}));
})().catch(e=>{console.error(e);process.exitCode=1;});
