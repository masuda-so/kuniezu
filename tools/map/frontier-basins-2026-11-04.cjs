/* 一度だけの境の引き直し（2026-11-04、利用者の指示「雑な分類で史実の国境っぽくないので修正」）。
   assign-frontier-2026-11-04.cjs が経緯度の折れ線で引いた満州の勢力の境と和人地の境を、Copernicus DEM から求めた川の流域（分水嶺）で引き直す。
   流域：約1km（和人地は約200m）の格子で窪地を埋めながら海・格子の縁から遡る（priority-flood）。各格子が最後に流れ出る所で流域を分ける。
   ・海西女真  松花江（吉林・伊通河の上流を含む）の流域と、張広才嶺の西の松花江の支流
   ・東方の女真 牡丹江・ウスリー江（格子の北の縁の東側へ出る川）、豆満江と日本海へ注ぐ川
   ・建州女真  鴨緑江とその支流（渾江）、渾河・太子河の上流（明の遼東の区画の外）
   ・蒙古諸部  西遼河の流域と遼河の西岸、松嫩平原の西（ホルチン・ゴルロス）
   ・遼河は西遼河と東遼河が合わさって南へ流れる。東岸の東遼河・清河の流域で明の区画の外は海西（イェヘ・ハダ）、西岸は蒙古
   明・遼東、朝鮮、日本の城の区画は変えない。和人地は上ノ国天ノ川の河口から南を回って知内川の河口までの海岸へ注ぐ川の流域（天ノ川・知内川を含む）。
   川の名と流域の対応は韓国国史編纂委員会の分布の記述（建州＝鴨緑江の北、海西＝松花江の流域、野人＝牡丹江一帯と沿海地方）に合わせた解釈で、各勢力の確定した領界ではない。
   実行：node --max-old-space-size=4000 tools/map/frontier-basins-2026-11-04.cjs */
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const MD=require('./map-data.cjs'),{readRGB,writeRGB}=require('./png-big.cjs');
const root=MD.root,P=MD.readProjection(),W=P.width,H=P.height,S=P.stepUnits,[OX,OY]=P.origin,def=MD.readDefinition();
function readTiff(file){const b=fs.readFileSync(file);const le=b.toString('ascii',0,2)==='II';const u16=o=>le?b.readUInt16LE(o):b.readUInt16BE(o),u32=o=>le?b.readUInt32LE(o):b.readUInt32BE(o);
 const ifd=u32(4),n=u16(ifd),tags={},sz={1:1,2:1,3:2,4:4,5:8,11:4,12:8,16:8};
 for(let i=0;i<n;i++){const e=ifd+2+i*12,tag=u16(e),type=u16(e+2),cnt=u32(e+4),off=sz[type]*cnt<=4?e+8:u32(e+8),vals=[];for(let k=0;k<cnt;k++){const o=off+k*sz[type];vals.push(type===3?u16(o):type===4?u32(o):type===12?(le?b.readDoubleLE(o):b.readDoubleBE(o)):b[o]);}tags[tag]=vals;}
 const TW=tags[256][0],TH=tags[257][0],tw=tags[322][0],th=tags[323][0],offs=tags[324],cnts=tags[325],out=new Float32Array(TW*TH),tx=Math.ceil(TW/tw);
 for(let t=0;t<offs.length;t++){const buf=Buffer.from(zlib.inflateSync(b.subarray(offs[t],offs[t]+cnts[t]))),row=tw*4,tmp=Buffer.alloc(row),c0=(t%tx)*tw,r0=Math.floor(t/tx)*th;
  for(let y=0;y<th;y++){const o=y*row;for(let i=1;i<row;i++)buf[o+i]=(buf[o+i]+buf[o+i-1])&255;for(let x=0;x<tw;x++)for(let k=0;k<4;k++)tmp[x*4+k]=buf[o+k*tw+x];if(r0+y>=TH)continue;for(let x=0;x<tw&&c0+x<TW;x++)out[(r0+y)*TW+c0+x]=tmp.readFloatBE(x*4);}}
 return {W:TW,H:TH,data:out,lon0:tags[33922][3],lat0:tags[33922][4],dx:tags[33550][0],dy:tags[33550][1]};}
const dems=new Map();const height=(lon,lat)=>{const k=Math.floor(lat)+','+Math.floor(lon);if(!dems.has(k)){const f=path.join(root,`.cache/copernicus-dem-90m/Copernicus_DSM_COG_30_N${Math.floor(lat)}_00_E${Math.floor(lon)}_00_DEM.tif`);dems.set(k,fs.existsSync(f)?readTiff(f):null);}
 const r=dems.get(k);if(!r)return NaN;const c=Math.floor((lon-r.lon0)/r.dx),rr=Math.floor((r.lat0-lat)/r.dy);return c<0||rr<0||c>=r.W||rr>=r.H?NaN:r.data[rr*r.W+c];};
// 窪地を埋めながら海・縁から遡り、各格子の流れ出る先（outlet：海に接する格子か縁の格子）と下流の格子（recv）を求める
function drainage(lon0,lon1,lat0,lat1,dlon,dlat){const gw=Math.round((lon1-lon0)/dlon),gh=Math.round((lat1-lat0)/dlat),N=gw*gh,z=new Float32Array(N),sea=new Uint8Array(N);
 for(let y=0;y<gh;y++)for(let x=0;x<gw;x++){const h=height(lon0+(x+.5)*dlon,lat1-(y+.5)*dlat),i=y*gw+x;if(!(h>0.5)){sea[i]=1;z[i]=0;}else z[i]=h;}
 const recv=new Int32Array(N).fill(-1),outlet=new Int32Array(N).fill(-1),done=new Uint8Array(N);
 // 二分ヒープ（高さ、格子番号）
 const hz=new Float32Array(N+8),hi=new Int32Array(N+8);let hn=0;
 const push=(v,i)=>{let k=hn++;while(k>0){const p=(k-1)>>1;if(hz[p]<=v)break;hz[k]=hz[p];hi[k]=hi[p];k=p;}hz[k]=v;hi[k]=i;};
 const pop=()=>{const top=hi[0],tv=hz[0];const v=hz[--hn],i=hi[hn];let k=0;for(;;){let c=2*k+1;if(c>=hn)break;if(c+1<hn&&hz[c+1]<hz[c])c++;if(hz[c]>=v)break;hz[k]=hz[c];hi[k]=hi[c];k=c;}hz[k]=v;hi[k]=i;return [top,tv];};
 const fill=new Float32Array(N);
 for(let y=0;y<gh;y++)for(let x=0;x<gw;x++){const i=y*gw+x;if(sea[i]){done[i]=1;continue;}const edge=x===0||y===0||x===gw-1||y===gh-1;let coast=false;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const X=x+dx,Y=y+dy;if(X>=0&&Y>=0&&X<gw&&Y<gh&&sea[Y*gw+X])coast=true;}if(edge||coast){done[i]=1;outlet[i]=i;fill[i]=z[i];push(z[i],i);}}
 while(hn){const [i,v]=pop();const x=i%gw,y=(i/gw)|0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const X=x+dx,Y=y+dy;if(X<0||Y<0||X>=gw||Y>=gh)continue;const j=Y*gw+X;if(done[j])continue;done[j]=1;recv[j]=i;outlet[j]=outlet[i];fill[j]=Math.max(z[j],v+1e-3);push(fill[j],j);}}
 return {gw,gh,lon0,lat1,dlon,dlat,sea,recv,outlet,cell:(lon,lat)=>{const x=Math.floor((lon-lon0)/dlon),y=Math.floor((lat1-lat)/dlat);return x<0||y<0||x>=gw||y>=gh?-1:y*gw+x;},ll:i=>[lon0+(i%gw+.5)*dlon,lat1-(((i/gw)|0)+.5)*dlat]};}
// 満州：約1km の格子
const D=drainage(121.9,137.9,39.2,46.0,0.0125,0.01);
// 流れの集まり（上流の格子の数）で、目印の地点を本流に寄せる
const acc=new Float64Array(D.recv.length).fill(1);{const order=[...D.recv.keys()].filter(i=>!D.sea[i]);const depth=new Int32Array(D.recv.length);for(const i of order){let d=0,j=i;while(D.recv[j]>=0&&d<100000){j=D.recv[j];d++;}depth[i]=d;}order.sort((a,b)=>depth[b]-depth[a]);for(const i of order)if(D.recv[i]>=0)acc[D.recv[i]]+=acc[i];}
const snap=(lon,lat,r=6)=>{const c=D.cell(lon,lat),x0=c%D.gw,y0=(c/D.gw)|0;let best=c;for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){const X=x0+dx,Y=y0+dy;if(X<0||Y<0||X>=D.gw||Y>=D.gh)continue;const j=Y*D.gw+X;if(acc[j]>acc[best])best=j;}return best;};
// 目印（川の地点）と、そこより上流の勢力
const GAUGES=[['渾河・撫順',123.95,41.88,'context:jianzhou'],['太子河・本渓',123.75,41.30,'context:jianzhou'],['清河・開原',124.10,42.55,'context:haixi'],['東遼河・遼源',125.15,42.90,'context:haixi'],['東遼河・下流',124.05,43.30,'context:haixi'],
 ['西遼河・通遼',122.25,43.62,'context:mongol'],['松花江・吉林',126.55,43.85,'context:haixi'],['伊通河・長春',125.32,43.88,'context:haixi'],['牡丹江・牡丹江市',129.60,44.58,'context:eastern-jurchen'],['鴨緑江・集安',126.18,41.12,'context:jianzhou']];
const gaugeAt=new Map();for(const [n,lo,la,k] of GAUGES){const g=snap(lo,la);gaugeAt.set(g,{n,k,acc:acc[g]});}
const classify=new Map();const cls=i=>{if(D.sea[i])return null;if(classify.has(i))return classify.get(i);
 // 下流へたどり、最初に通る目印の勢力。目印を通らなければ流れ出る先で決める
 let j=i,path=[];while(j>=0){path.push(j);if(gaugeAt.has(j)){const k=gaugeAt.get(j).k;for(const p of path)classify.set(p,k);return k;}if(classify.has(j)&&j!==i){const k=classify.get(j);for(const p of path)classify.set(p,k);return k;}j=D.recv[j];}
 const o=D.outlet[i],[lon,lat]=D.ll(o),gx=o%D.gw,gy=(o/D.gw)|0;let k;
 if(gy===0)k=lon<127.7?(lon<125.6?'context:mongol':'context:haixi'):'context:eastern-jurchen';// 格子の北の縁：松嫩平原の西（ホルチン・ゴルロスの蒙古）、松花江（海西）、牡丹江・ウスリー江（東方）
 else if(gx===0)k='context:mongol';// 西の縁：遼西の草原
 else if(lon>=129.5&&lat>=42.0)k='context:eastern-jurchen';// 日本海・豆満江
 else if(lon>=123.9)k='context:jianzhou';// 黄海側：鴨緑江
 else k='context:mongol';// 渤海側（遼河）で東岸の目印（渾河・太子河・清河・東遼河）を通らない所＝西遼河と西岸の草原
 for(const p of path)classify.set(p,k);return k;};
// 和人地：約200m の格子
const E=drainage(139.8,140.7,41.25,42.10,0.0025,0.002);
const WAJIN=[[140.10,41.83],[140.425,41.603]];
const coastSW=(lon,lat)=>{const [[x1,y1],[x2,y2]]=WAJIN;return (x2-x1)*(lat-y1)-(y2-y1)*(lon-x1)<=1e-4;};
const wajin=i=>{if(E.sea[i])return false;const [lon,lat]=E.ll(E.outlet[i]);return coastSW(lon,lat)&&lon<=140.44;};
const MAN=new Set(['context:jianzhou','context:haixi','context:eastern-jurchen','context:mongol']);
const rgb=k=>def.byKey.get(k).rgb;const byRGB=new Map([...def.byRGB].map(([c,r])=>[c,r.key]));
const count={},tile=new Map();
(async()=>{
 const src=MD.files.provinces,raw=src+'.basins.raw',fd=fs.openSync(raw,'w');
 await readRGB(src,(r,row)=>{const lat=P.LAT0-(OY+(r+.5)*S)/P.K;if(lat>=39.2){for(let c=0;c<W;c++){const o=c*3,key=byRGB.get(row[o]+','+row[o+1]+','+row[o+2]);if(!key)continue;const lon=(OX+(c+.5)*S)/P.K/P.CX+P.LON0;let to=null;
   if(MAN.has(key)){const i=D.cell(lon,lat);if(i<0)continue;let k=D.sea[i]?null:cls(i);if(!k){// 海と判定された1km格子にかかる陸の画素は、近い陸の格子で決める
     for(let rad=1;rad<4&&!k;rad++)for(let dy=-rad;dy<=rad&&!k;dy++)for(let dx=-rad;dx<=rad&&!k;dx++){const j=D.cell(lon+dx*D.dlon,lat+dy*D.dlat);if(j>=0&&!D.sea[j])k=cls(j);}}
    if(k&&k!==key)to=k;}
   else if((key==='castle:matsumae'||key==='context:ainu')&&lon>=139.8&&lon<=140.7&&lat>=41.25&&lat<=42.10){const i=E.cell(lon,lat);let w=null;if(i>=0&&!E.sea[i])w=wajin(i);else{for(let rad=1;rad<4&&w===null;rad++)for(const [dx,dy] of [[rad,0],[-rad,0],[0,rad],[0,-rad]]){const j=E.cell(lon+dx*E.dlon,lat+dy*E.dlat);if(j>=0&&!E.sea[j]){w=wajin(j);break;}}}
    if(w!==null){const k=w?'castle:matsumae':'context:ainu';if(k!==key)to=k;}}
   if(to){const v=rgb(to);row[o]=v[0];row[o+1]=v[1];row[o+2]=v[2];const n=key+'→'+to;count[n]=(count[n]||0)+1;}}}fs.writeSync(fd,row);});
 fs.closeSync(fd);const rd=fs.openSync(raw,'r'),buf=Buffer.alloc(W*3);await writeRGB(src+'.basins',W,H,y=>{fs.readSync(rd,buf,0,W*3,y*W*3);return buf;});fs.closeSync(rd);fs.rmSync(raw);fs.renameSync(src+'.basins',src);
 console.log(JSON.stringify({gauges:[...gaugeAt.values()].map(g=>[g.n,g.k,g.acc]),count}));
})().catch(e=>{console.error(e);process.exit(1);});
