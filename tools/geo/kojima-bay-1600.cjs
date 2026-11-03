/* 移行時の記録用。旧基準に対する型紙を生成した道具で、正本へ焼き込み後の通常再生成には使わない。
   現行の宇喜多期差分は保存済みの型紙と build-province-edits.cjs から生成する。 */
/* 児島湾・高梁川河口の1560〜1615年の海陸を、国土交通省の資料にある「岡山平野の干拓進展図」（高田正規原図）から復元し、年代別の領域差分の型紙を作る。
   考え方
   ・図は現代の海岸線の上に、干拓地を時期別の網点で塗った区画として描く。区画の外の白地は干拓前からの陸（または水面）。
   ・17世紀以降の干拓地（網点・白抜きの区画）は1560〜1615年には海。16世紀末の濃い網点（宇喜多期、早島―帯江）は天正12年（1584）の宇喜多堤から陸とする。
   ・区画の外の広い白地は、陸か水面かを Copernicus DEM（現代の標高 0.5m 超を陸）で決める。区画の中でも標高10m以上のまとまった丘は島として陸に残す。
   ・藤戸の瀬戸は Codex の100m比較経路（史跡3画素を避けた上下左右の経路）を海にし、現代標高6m未満の隣へ1画素広げる。
   ・早島の丘（基準版に入れた8m連結域）、経ヶ島・藤戸寺・浮洲岩跡の画素は海にしない。
   ・旧来の地図が帯状の海にしていた倉敷以西は、図で干拓前からの陸と読める所を陸に戻す（図の西端より西の約3kmは、同じ帯の続きとして標高で補う）。
   どれも推定。図は小縮尺の概観図で、年ごとの汀線や水路の幅を示さない。
   入力（取得済み・再配布しない）
     .cache/kojima-takada/ref1-1.pdf      国土交通省「高梁川水系の流域及び河川の概要」参考資料1-1（図4-1-1 は43ページ＝PDF 47ページ）
     .cache/kojima-takada/p047-x4.png     上の47ページを pdf.js 3.11.174 で 4 倍に描いた画像
     .cache/copernicus-dem-90m/…N34_00_E133/E134…tif
   出力
     data/inputs/kojima-coast-review/kojima-bay-1600/*.png と report.json、game/map/edits/kojima-bay-*.json
   実行：node --max-old-space-size=6000 tools/geo/kojima-bay-1600.cjs  → 続けて node tools/map/build-province-edits.cjs と node tools/map/build-edges.cjs */
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const decodePNG=require('./png-decode.cjs');
const root=path.resolve(__dirname,'../..'),mapDir=path.join(root,'game/map'),editsDir=path.join(mapDir,'edits');
const outDir=path.join(root,'data/inputs/kojima-coast-review/kojima-bay-1600'),review=path.join(root,'data/inputs/kojima-coast-review');
if(require('../map/map-data.cjs').sourceSha256()!=='9b949f63027df04ce0f12ce36294dd1ac338e057693952b752eff9627680b42f')throw Error('移行記録用の型紙生成器です。児島湾補正の焼き込み後は実行しません。年代差分の再生成は tools/map/build-province-edits.cjs を使用してください。');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const FIG=path.join(root,'.cache/kojima-takada/p047-x4.png'),PDF=path.join(root,'.cache/kojima-takada/ref1-1.pdf');
const FIG_SHA='939b9c720a877febd2365137a28fd258ca087358802726bfdef5ff612b77ea0b',PDF_SHA='d31c082725b9b42dea803a0ff6a892fe871586685d3b3a5f7ecef06a44a2cef2';
if(sha(fs.readFileSync(FIG))!==FIG_SHA||sha(fs.readFileSync(PDF))!==PDF_SHA)throw Error('入力の図か PDF が想定と違う');
const ledger=JSON.parse(fs.readFileSync(path.join(editsDir,'baseline-ledger.json'),'utf8'));

// ---- 図の位置合わせ：図の黒画素と DEM の現代海岸（標高0と正の境）を、縮尺・平行移動の格子探索で合わせた結果（一致率0.85、近傍3画素）。
// 図の画素 (x,y) ↔ 経緯度： x = tx + (経度-LON)·KX·s,  y = ty + (LAT-緯度)·KY·s（KX・KY は km/度、s は 画素/km）
const REG={LON:133.9,LAT:34.55,KX:Math.cos(34.55*Math.PI/180)*111.32,KY:110.95,s:37.35,tx:1315,ty:1417};
const figToLL=(x,y)=>[REG.LON+((x-REG.tx)/REG.s)/REG.KX,REG.LAT-((y-REG.ty)/REG.s)/REG.KY];
const llToFig=(lon,lat)=>[Math.round(REG.tx+(lon-REG.LON)*REG.KX*REG.s),Math.round(REG.ty+(REG.LAT-lat)*REG.KY*REG.s)];

// ---- DEM（Copernicus GLO-90 の COG：タイル、DEFLATE、浮動小数の予測子3）
function readTiff(file){const b=fs.readFileSync(file);const le=b.toString('ascii',0,2)==='II';const u16=o=>le?b.readUInt16LE(o):b.readUInt16BE(o),u32=o=>le?b.readUInt32LE(o):b.readUInt32BE(o);
 const ifd=u32(4),n=u16(ifd),tags={},sz={1:1,2:1,3:2,4:4,5:8,11:4,12:8,16:8};
 for(let i=0;i<n;i++){const e=ifd+2+i*12,tag=u16(e),type=u16(e+2),cnt=u32(e+4),off=sz[type]*cnt<=4?e+8:u32(e+8),vals=[];for(let k=0;k<cnt;k++){const o=off+k*sz[type];vals.push(type===3?u16(o):type===4?u32(o):type===12?(le?b.readDoubleLE(o):b.readDoubleBE(o)):b[o]);}tags[tag]=vals;}
 const W=tags[256][0],H=tags[257][0],tw=tags[322][0],th=tags[323][0],offs=tags[324],cnts=tags[325];if(tags[259][0]!==8||(tags[317]||[1])[0]!==3)throw Error('想定外の TIFF');
 const out=new Float32Array(W*H),tx=Math.ceil(W/tw);
 for(let t=0;t<offs.length;t++){const buf=Buffer.from(zlib.inflateSync(b.subarray(offs[t],offs[t]+cnts[t]))),row=tw*4,tmp=Buffer.alloc(row),c0=(t%tx)*tw,r0=Math.floor(t/tx)*th;
  for(let y=0;y<th;y++){const o=y*row;for(let i=1;i<row;i++)buf[o+i]=(buf[o+i]+buf[o+i-1])&255;for(let x=0;x<tw;x++)for(let k=0;k<4;k++)tmp[x*4+k]=buf[o+k*tw+x];if(r0+y>=H)continue;for(let x=0;x<tw&&c0+x<W;x++)out[(r0+y)*W+c0+x]=tmp.readFloatBE(x*4);}}
 return {W,H,data:out,lon0:tags[33922][3],lat0:tags[33922][4],dx:tags[33550][0],dy:tags[33550][1]};}
const dem=[133,134].map(e=>readTiff(path.join(root,`.cache/copernicus-dem-90m/Copernicus_DSM_COG_30_N34_00_E${e}_00_DEM.tif`)));
const height=(lon,lat)=>{const r=dem[lon<134?0:1];return r.data[Math.floor((r.lat0-lat)/r.dy)*r.W+Math.floor((lon-r.lon0)/r.dx)];};

// ---- 図の分類：1 干拓前からの陸、2 水面、3 17世紀以降の干拓地、4 16世紀末の干拓地、0 対象外
const fig=decodePNG(fs.readFileSync(FIG)),FW=fig.width,FH=fig.height,[X0,X1,Y0,Y1]=[400,2010,840,1880];// 図の枠（4倍のページ座標）
const CFG={dilate:2,openMin:100000,polyMin:400,landH:0.5,hillH:10,hillMin:80,late16Dark:15,late16Box:[920,1137,1193,1273],
 islands:[[730,1390,'大平山（連島）'],[548,1462,'乙島'],[460,1470,'柏島'],[1015,1340,'天城']],industrial:[[710,1645],[685,1533],[821,1620],[561,1583]],
 zone:[[400,1026],[772,1026],[945,1088],[994,1075],[1168,1026],[1267,1001],[1477,951],[1762,939],[2010,1026],[2010,1533],[1713,1533],[1713,1880],[400,1880]]};
const dark=new Uint8Array(FW*FH);for(let y=Y0;y<Y1;y++)for(let x=X0;x<X1;x++){const k=y*FW+x;dark[k]=fig.data[k*4]+fig.data[k*4+1]+fig.data[k*4+2]<380?1:0;}
// 線と文字（大きな連結成分）を壁にし、網点（小さな粒）は通す。スキャンの途切れは膨張で塞ぐ。
const wall=new Uint8Array(FW*FH);{const seen=new Uint8Array(FW*FH);for(let y=Y0;y<Y1;y++)for(let x=X0;x<X1;x++){const k=y*FW+x;if(!dark[k]||seen[k])continue;const cc=[],st=[k];seen[k]=1;let x0=x,x1=x,y0=y,y1=y;
 while(st.length){const q=st.pop();cc.push(q);const qx=q%FW,qy=(q/FW)|0;x0=Math.min(x0,qx);x1=Math.max(x1,qx);y0=Math.min(y0,qy);y1=Math.max(y1,qy);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const m=q+dy*FW+dx;if(dark[m]&&!seen[m]){seen[m]=1;st.push(m);}}}
 if(!(cc.length<=14&&x1-x0<=5&&y1-y0<=5))for(const q of cc)wall[q]=1;}}
for(let it=0;it<CFG.dilate;it++){const nw=wall.slice();for(let y=Y0+1;y<Y1-1;y++)for(let x=X0+1;x<X1-1;x++){const k=y*FW+x;if(!wall[k]&&(wall[k-1]||wall[k+1]||wall[k-FW]||wall[k+FW]))nw[k]=1;}wall.set(nw);}
const comp=new Int32Array(FW*FH),info=[null];
for(let y=Y0;y<Y1;y++)for(let x=X0;x<X1;x++){const k=y*FW+x;if(wall[k]||comp[k])continue;const id=info.length,st=[k];comp[k]=id;let n=0;while(st.length){const q=st.pop();n++;for(const m of [q-1,q+1,q-FW,q+FW]){const mx=m%FW,my=(m/FW)|0;if(mx<X0||mx>=X1||my<Y0||my>=Y1)continue;if(!wall[m]&&!comp[m]){comp[m]=id;st.push(m);}}}info.push({id,n});}
const open=new Set(info.filter(i=>i&&i.n>=CFG.openMin).map(i=>i.id));
const islands=new Map(CFG.islands.map(([x,y,name])=>[comp[y*FW+x],name]));if(islands.has(0))throw Error('島の種が線の上にある');
const industrial=new Set(CFG.industrial.map(([x,y])=>comp[y*FW+x]));
// 16世紀末：枠内で、壁を除く区画の3×3近傍の黒の割合が凡例の「16世紀末」に近い（15%以上）区画
const late16=new Set();{const [bx0,by0,bx1,by1]=CFG.late16Box,acc=new Map();for(let y=by0;y<by1;y++)for(let x=bx0;x<bx1;x++){const id=comp[y*FW+x];if(!id||open.has(id)||info[id].n<CFG.polyMin)continue;const a=acc.get(id)||[0,0];a[0]++;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)a[1]+=dark[(y+dy)*FW+x+dx];acc.set(id,a);}
 for(const [id,[n,d]] of acc)if(d/(n*9)*100>=CFG.late16Dark&&n>=info[id].n*.9)late16.add(id);}
const cls=new Uint8Array(FW*FH);
for(let y=Y0;y<Y1;y++)for(let x=X0;x<X1;x++){const k=y*FW+x,id=comp[k];if(!id)continue;
 if(open.has(id)){const [lon,lat]=figToLL(x,y);cls[k]=height(lon,lat)>CFG.landH?1:2;}else if(info[id].n<CFG.polyMin)continue;else cls[k]=islands.has(id)?1:late16.has(id)?4:3;}
for(let it=0;it<CFG.dilate+4;it++){const nx=cls.slice();for(let y=Y0+1;y<Y1-1;y++)for(let x=X0+1;x<X1-1;x++){const k=y*FW+x;if(cls[k])continue;for(const m of [k-1,k+1,k-FW,k+FW])if(cls[m]){nx[k]=cls[m];break;}}cls.set(nx);}
for(let y=Y0;y<Y1;y++)for(let x=X0;x<X1;x++)if(!cls[y*FW+x])cls[y*FW+x]=3;// 文字の集まりなど決まらない所は干拓地。丘は次で陸に戻す
// 干拓地の中の丘：標高10m以上のまとまり（80画素≒0.06km²以上）。工業用地の区画は建物を拾うので除く
{const hill=new Uint8Array(FW*FH),hs=new Uint8Array(FW*FH);for(let y=Y0;y<Y1;y++)for(let x=X0;x<X1;x++){const k=y*FW+x;if(industrial.has(comp[k]))continue;const [lon,lat]=figToLL(x,y);if(height(lon,lat)>=CFG.hillH)hill[k]=1;}
 for(let k=0;k<FW*FH;k++){if(!hill[k]||hs[k])continue;const st=[k],cc=[];hs[k]=1;while(st.length){const q=st.pop();cc.push(q);for(const m of [q-1,q+1,q-FW,q+FW])if(hill[m]&&!hs[m]){hs[m]=1;st.push(m);}}if(cc.length>=CFG.hillMin)for(const q of cc)if(cls[q]===3||cls[q]===4)cls[q]=1;}}
const zone=CFG.zone,inZone=(x,y)=>{let c=false;for(let i=0,j=zone.length-1;i<zone.length;j=i++){const [ax,ay]=zone[i],[bx,by]=zone[j];if((ay>y)!==(by>y)&&x<ax+(bx-ax)*(y-ay)/(by-ay))c=!c;}return c;};
for(let y=Y0;y<Y1;y++)for(let x=X0;x<X1;x++)if(!inZone(x,y))cls[y*FW+x]=0;

// ---- 基準版の領域画像（窓の中だけ読む）
const man=JSON.parse(fs.readFileSync(path.join(mapDir,'manifest.json'),'utf8')),P=man.projection,[OX,OY]=P.origin,S=P.stepUnits,T=man.tile;
const MD=require('../map/map-data.cjs'),defs=MD.readDefinition().rows.filter(Boolean);// 正本 game/map_data の区画（kind は default.map から）
const byRGB=new Map(defs.map(d=>[d.rgb.join(','),d]));
const toCR=(lon,lat)=>[Math.floor(((lon-P.LON0)*P.K*P.CX-OX)/S),Math.floor(((P.LAT0-lat)*P.K-OY)/S)];
const toLL=(c,r)=>[(OX+(c+.5)*S)/P.K/P.CX+P.LON0,P.LAT0-(OY+(r+.5)*S)/P.K];
const WIN=[133.55,134.25,34.40,34.75],[c0,r0]=toCR(WIN[0],WIN[3]),[c1,r1]=toCR(WIN[1],WIN[2]),w=c1-c0,h=r1-r0;
const readGrid=(sub,rows)=>{const cache=new Map();return (c,r)=>{const tk=Math.floor(c/T)+','+Math.floor(r/T);if(!cache.has(tk)){const row=rows.get(tk);cache.set(tk,row?decodePNG(fs.readFileSync(path.join(mapDir,sub,row.file))):null);}return [cache.get(tk),(r%T)*(cache.get(tk)?.width||0)+(c%T)];};};
const prov=readGrid('provinces',new Map(man.tiles.map(t=>[t.col+','+t.row,t])));
(async()=>{
// 郡画像 data/map/gun.png（全域1枚）から窓の中だけ取り出す
const gunWin=new Int32Array(w*h);await require('../map/png-big.cjs').readRGB(path.join(root,'data/map/gun.png'),(y,row)=>{if(y<r0||y>=r1)return;for(let c=0;c<w;c++)gunWin[(y-r0)*w+c]=row[(c0+c)*3+1]<<8|row[(c0+c)*3+2];});
const cur=new Array(w*h),gunId=new Int32Array(w*h);
for(let r=0;r<h;r++)for(let c=0;c<w;c++){const [t,o]=prov(c0+c,r0+r);const d=t?byRGB.get(t.data[o*4]+','+t.data[o*4+1]+','+t.data[o*4+2]):byRGB.get(defs.find(x=>x.key==='sea').rgb.join(','));if(!d)throw Error('定義にない色');cur[r*w+c]=d;
 gunId[r*w+c]=gunWin[r*w+c];}
const isLand=d=>d.kind==='land';
// ほかの差分（水島など）が書く画素は、それを当てた後の値として扱い、触らない
const otherEdits=fs.readdirSync(editsDir).filter(f=>f.endsWith('.json')&&f!=='baseline-ledger.json'&&!f.startsWith('kojima-bay-')).map(f=>JSON.parse(fs.readFileSync(path.join(editsDir,f),'utf8')));
const taken=new Uint8Array(w*h);for(const e of otherEdits){if(!e.payload.file)continue;const g=JSON.parse(fs.readFileSync(path.join(editsDir,e.payload.file),'utf8')).features[e.payload.feature].geometry;const rings=g.coordinates;
 const inside=(lon,lat)=>{let c=false;for(const ring of rings)for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [ax,ay]=ring[i],[bx,by]=ring[j];if((ay>lat)!==(by>lat)&&lon<ax+(bx-ax)*(lat-ay)/(by-ay))c=!c;}return c;};
 const to=defs.find(d=>d.key===e.payload.toKey);for(let r=0;r<h;r++)for(let c=0;c<w;c++){const [lon,lat]=toLL(c0+c,r0+r);if(inside(lon,lat)){taken[r*w+c]=1;cur[r*w+c]=to;}}}

// ---- ゲーム格子へ：tgt 1 陸に、2 海に、4 16世紀末（1584年まで海、以後陸）
const inCorridor=(lon,lat)=>(lon>=133.55&&lon<=134.0&&lat>=34.555&&lat<=34.645)||(lon>134.0&&lon<=134.10&&lat>=34.54&&lat<=34.645);// 旧来の帯状の海と、湾口までの直線の岸を見直す範囲
const tgt=new Uint8Array(w*h),why=new Uint8Array(w*h);// why：1 図の陸 2 図の水面 3 図の干拓地 4 16世紀末 5 図の西の補い 6 藤戸の経路 7 経路の拡幅
for(let r=0;r<h;r++)for(let c=0;c<w;c++){const i=r*w+c;if(taken[i])continue;const land=isLand(cur[i]),[lon,lat]=toLL(c0+c,r0+r),inCor=inCorridor(lon,lat),[fx,fy]=llToFig(lon,lat);
 if(fx>=X0&&fx<X1&&fy>=Y0&&fy<Y1){const v=cls[fy*FW+fx];if(v===3&&land){tgt[i]=2;why[i]=3;}else if(v===4){tgt[i]=4;why[i]=4;}else if(v===1&&!land&&inCor){tgt[i]=1;why[i]=1;}else if(v===2&&land&&inCor){tgt[i]=2;why[i]=2;}}
 else if(inCor&&!land&&lon<133.64&&height(lon,lat)>CFG.landH){tgt[i]=1;why[i]=5;}}
// 藤戸の瀬戸
const route=JSON.parse(fs.readFileSync(path.join(review,'fujito-100m-connectivity-comparison.json'),'utf8')),prot=route.protected.map(([c,r])=>[c,r]),isProt=(c,r)=>prot.some(p=>p[0]===c&&p[1]===r);
const routeSet=new Set(route.samples.map(([c,r])=>c+','+r));
const toSea=(C,R,wy)=>{const c=C-c0,r=R-r0,i=r*w+c;if(c<0||r<0||c>=w||r>=h||isProt(C,R)||taken[i])return;if(!isLand(cur[i])){if(tgt[i]===1){tgt[i]=0;why[i]=0;}return;}tgt[i]=2;why[i]=wy;};
for(const [C,R] of route.samples){toSea(C,R,6);for(const [dc,dr] of [[1,0],[-1,0],[0,1],[0,-1]]){const C2=C+dc,R2=R+dr;if(routeSet.has(C2+','+R2)||prot.some(p=>Math.abs(p[0]-C2)<=1&&Math.abs(p[1]-R2)<=1))continue;const [lon,lat]=toLL(C2,R2);if(height(lon,lat)<6)toSea(C2,R2,7);}}
// 早島の丘と史跡
const hay=JSON.parse(fs.readFileSync(path.join(review,'hayashima-upland-comparison.geojson'),'utf8')).features.find(f=>f.properties.minimumMetres===8).geometry.coordinates[0];
const inHay=(lon,lat)=>{let c=false;for(let i=0,j=hay.length-1;i<hay.length;j=i++){const [ax,ay]=hay[i],[bx,by]=hay[j];if((ay>lat)!==(by>lat)&&lon<ax+(bx-ax)*(lat-ay)/(by-ay))c=!c;}return c;};
for(let i=0;i<w*h;i++){if(tgt[i]!==2&&tgt[i]!==4)continue;const [lon,lat]=toLL(c0+i%w,r0+((i/w)|0));if(inHay(lon,lat)&&isLand(cur[i])){tgt[i]=0;why[i]=0;}}
for(const [C,R] of prot){const i=(R-r0)*w+(C-c0);tgt[i]=0;why[i]=0;}
// 細かな残りの掃除：囲まれた小さな海（40画素以下）は陸に、変更で孤立した小さな陸（2画素以下、史跡を除く）は海に
const state=(i,late)=>{const t=tgt[i];if(t===1)return 1;if(t===2)return 0;if(t===4)return late?1:0;return isLand(cur[i])?1:0;};
const comps=(late,want)=>{const seen=new Uint8Array(w*h),out=[];for(let i=0;i<w*h;i++){if(seen[i]||state(i,late)!==want)continue;const st=[i],cc=[];seen[i]=1;let edge=false;while(st.length){const q=st.pop();cc.push(q);const x=q%w,y=(q/w)|0;if(!x||!y||x===w-1||y===h-1)edge=true;for(const m of [x>0?q-1:-1,x<w-1?q+1:-1,q-w,q+w])if(m>=0&&m<w*h&&!seen[m]&&state(m,late)===want){seen[m]=1;st.push(m);}}out.push({cc,edge});}return out;};
let filled=0,dropped=0;
for(const late of [false,true])for(const {cc,edge} of comps(late,0)){if(edge||cc.length>40)continue;for(const q of cc){const t=tgt[q];if(late&&t!==4&&!isLand(cur[q])){tgt[q]=4;why[q]=4;}else if(!late){if(isLand(cur[q])){tgt[q]=0;why[q]=0;}else{tgt[q]=1;why[q]=1;}}else if(late&&isLand(cur[q])&&t===2){tgt[q]=4;why[q]=4;}filled++;}}
for(const {cc,edge} of comps(false,1)){if(edge||cc.length>2)continue;if(cc.some(q=>isProt(c0+q%w,r0+((q/w)|0))))continue;if(!cc.some(q=>[q-1,q+1,q-w,q+w].some(m=>m>=0&&m<w*h&&tgt[m]===2)))continue;for(const q of cc){if(tgt[q]===1){tgt[q]=0;why[q]=0;}else if(isLand(cur[q])){tgt[q]=2;why[q]=3;}dropped++;}}

// ---- 新しく陸にする画素の領域：隣の既存の陸から、同じ郡の中を優先して広げる
const keyOf=new Array(w*h).fill(null),newLand=i=>(tgt[i]===1||tgt[i]===4)&&!isLand(cur[i]);
for(const sameGun of [true,false]){let front=[];for(let i=0;i<w*h;i++)if(isLand(cur[i])||keyOf[i])front.push(i);
 while(front.length){const next=[];for(const q of front){const k=keyOf[q]||cur[q].key;const x=q%w;for(const m of [x>0?q-1:-1,x<w-1?q+1:-1,q-w,q+w]){if(m<0||m>=w*h||keyOf[m]||!newLand(m))continue;if(sameGun&&gunId[m]!==gunId[q])continue;keyOf[m]=k;next.push(m);}}front=next;}}
// 既存の陸に接しない小島は、海を越えて最も近い陸の領域に
{const k2=new Array(w*h).fill(null);let front=[];for(let i=0;i<w*h;i++)if(isLand(cur[i])){k2[i]=cur[i].key;front.push(i);}
 while(front.length){const next=[];for(const q of front){const x=q%w;for(const m of [x>0?q-1:-1,x<w-1?q+1:-1,q-w,q+w]){if(m<0||m>=w*h||k2[m])continue;k2[m]=k2[q];next.push(m);}}front=next;}
 for(let i=0;i<w*h;i++)if(newLand(i)&&!keyOf[i])keyOf[i]=k2[i];}
const missing=[...Array(w*h).keys()].filter(i=>newLand(i)&&!keyOf[i]).length;if(missing)throw Error('領域を決められない陸の画素 '+missing);

// ---- 型紙と差分の書き出し
const crcT=new Int32Array(256).map((_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c;});
const crc=b=>{let c=-1;for(const x of b)c=crcT[(c^x)&255]^(c>>>8);return (c^-1)>>>0;};
const chunk=(t,d)=>{const l=Buffer.alloc(4);l.writeUInt32BE(d.length);const td=Buffer.concat([Buffer.from(t),d]),c=Buffer.alloc(4);c.writeUInt32BE(crc(td));return Buffer.concat([l,td,c]);};
const png=(W,H,rgb)=>{const raw=Buffer.alloc((W*3+1)*H);for(let y=0;y<H;y++)rgb.copy(raw,y*(W*3+1)+1,y*W*3,(y+1)*W*3);const ih=Buffer.alloc(13);ih.writeUInt32BE(W,0);ih.writeUInt32BE(H,4);ih[8]=8;ih[9]=2;return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ih),chunk('IDAT',zlib.deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);};
fs.mkdirSync(outDir,{recursive:true});
const SRC=[{author:'国土交通省 河川局',title:'高梁川水系の流域及び河川の概要（案）参考資料1-1',locator:'図4-1-1 岡山平野の干拓進展図（高田正規原図、出典『日本地誌 第17巻』）、43ページ',file:'.cache/kojima-takada/ref1-1.pdf',sha256:PDF_SHA},
 {author:'農林水産省',title:'近代の児島湾干拓計画を策定したムルデル',url:'https://www.maff.go.jp/j/nousin/sekkei/museum/m_izin/okayama_02/index.html',locator:'1582年の児島は島'},
 {author:'倉敷市',title:'文化財資料（宇喜多堤）',url:'https://www.city.kurashiki.okayama.jp/_res/projects/default_project/_page_/001/007/924/26390_276.pdf',locator:'宇喜多堤は天正12年（1584）、早島から二日市の岩崎へ'},
 {author:'岡山県 砂防史',title:'海面古図と年表',url:'https://sites.google.com/site/okayamasabo/',locator:'連島・倉敷・早島・箕島・天城は島。児島が陸続きになったのは元和4年（1618）'},
 {author:'岡山シティミュージアム',title:'広がる大地－絵図でたどる児島湾のかんたく－',url:'https://www.city.okayama.jp/okayama-city-museum/0000079739.html',locator:'慶長期（1596〜1615年推定）の備前国図で児島・天城は島'}];
const edits=[
 {id:'kojima-bay-reclaimed-sea',sel:i=>tgt[i]===2&&isLand(cur[i]),keys:['sea'],from:'land',validFrom:[1560,1,1],validUntil:[1616,1,1],
  basis:'干拓進展図で17世紀以降の干拓地の区画（網点・白抜き）と、区画の外で現代標高0.5m以下の水面。区画の中の標高10m以上の丘、早島の丘、藤戸の史跡3画素は除く。藤戸の瀬戸は Codex の100m比較経路と標高6m未満の隣を加える。',
  review:'小縮尺の概観図を現代の海岸で位置合わせした推定。各年の汀線、干潟と深い海の区別、藤戸の水路幅は示さない。'},
 {id:'kojima-bay-restored-land',sel:i=>tgt[i]===1&&!isLand(cur[i]),keys:null,from:'sea',validFrom:[1560,1,1],validUntil:[1616,1,1],
  basis:'旧来の地図が倉敷から岡山の南まで帯状に海としていた所のうち、干拓進展図で干拓区画の外（干拓前からの陸）にあり、現代標高0.5m超の所。図の西端（東経133.63度）より西は同じ帯の続きとして標高で補う。',
  review:'図の区画の外を干拓前からの陸と読む推定。河口の州や後世の盛土を区別していない。領域は隣の既存の陸から同じ郡の中で広げたゲーム上の管理単位。'},
 {id:'kojima-bay-ukita-sea-before-1584',sel:i=>tgt[i]===4&&isLand(cur[i]),keys:['sea'],from:'land',validFrom:[1560,1,1],validUntil:[1584,1,1],
  basis:'干拓進展図の「16世紀末」（宇喜多期）の区画。宇喜多堤（天正12年・1584）の前は海とする。',review:'築堤の月日と開墾の完了日は不明。1584年1月1日で切り替えるのは年単位の推定。'},
 {id:'kojima-bay-ukita-land-from-1584',sel:i=>tgt[i]===4&&!isLand(cur[i]),keys:null,from:'sea',validFrom:[1584,1,1],validUntil:[1616,1,1],
  basis:'干拓進展図の「16世紀末」（宇喜多期）の区画のうち、旧来の地図で海だった所。宇喜多堤（天正12年・1584）の後は陸とする。',review:'築堤の月日と開墾の完了日は不明。1584年1月1日で切り替えるのは年単位の推定。'}];
const report={generated:'tools/geo/kojima-bay-1600.cjs',scope:'1560〜1615年の児島湾・高梁川河口の海陸の推定。図4-1-1（高田正規原図）の干拓区画と現代標高から復元。',sources:SRC,
 registration:{...REG,method:'図の黒画素と Copernicus DEM の現代海岸（0mと正の境、0.001度ごと）を、縮尺30〜42画素/km・平行移動の格子探索で照合。近傍3画素以内の一致率0.847。',figureSha256:FIG_SHA,render:'pdf.js 3.11.174 で PDF 47ページを scale 4 で描画（2384×3368）'},
 classification:CFG,window:[c0,r0,w,h],edits:{},cleanup:{filledSeaPixels:filled,droppedLandPixels:dropped}};
for(const e of edits){let keys=e.keys,index=null;if(!keys){keys=[...new Set([...Array(w*h).keys()].filter(e.sel).map(i=>keyOf[i]))].sort();index=new Map(keys.map((k,n)=>[k,n+1]));}
 const rgb=Buffer.alloc(w*h*3);let n=0;for(let i=0;i<w*h;i++){if(!e.sel(i))continue;const v=index?index.get(keyOf[i]):1;rgb[i*3+1]=v>>8;rgb[i*3+2]=v&255;n++;}
 const file=path.join(outDir,e.id+'.png'),jfile=path.join(editsDir,e.id+'.json');if(!n){fs.rmSync(file,{force:true});fs.rmSync(jfile,{force:true});report.edits[e.id]={pixels:0,note:'基準版で既に条件どおりのため差分なし'};continue;}
 const buf=png(w,h,rgb);fs.writeFileSync(file,buf);
 const json={id:e.id,layer:'provinces',baseRevision:ledger.baselineCommit,validFrom:e.validFrom,validUntil:e.validUntil,
  payload:{mask:path.relative(editsDir,file),maskSha256:sha(buf),window:[c0,r0,w,h],from:e.from,keys},sourceIds:SRC.map(s=>s.title),basis:e.basis,review:e.review,generated:'tools/geo/kojima-bay-1600.cjs'};
 fs.writeFileSync(jfile,JSON.stringify(json,null,2)+'\n');report.edits[e.id]={pixels:n,keys};}

// ---- 検査：1584年の前と後で、藤戸の通水・児島/天城/早島が島か・史跡・城
const {G}=require(path.join(root,'tools/checks/history-focus.cjs')).model();G.newGame('s1560','oda');
const checks={};for(const late of [false,true]){const kind=(C,R)=>{const c=C-c0,r=R-r0;if(c<0||r<0||c>=w||r>=h)return 'out';const i=r*w+c;return state(i,late)?'land':'sea';};
 const reach=(s,t,ok)=>{const seen=new Set([s+'']),q=[s];while(q.length){const [x,y]=q.shift();if(x===t[0]&&y===t[1])return true;for(const p of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]])if(!seen.has(p+'')&&ok(...p)){seen.add(p+'');q.push(p);}}return false;};
 const [L,Tp]=toCR(133.675,34.625),[Rt,B]=toCR(133.925,34.530),west=toCR(133.6858034,34.5730514),east=toCR(133.9000368,34.5722033),[gate,gT]=toCR(133.811,34.562),[,gB]=toCR(133.811,34.556);
 const water=(x,y)=>L<=x&&x<=Rt&&Tp<=y&&y<=B&&(x!==gate||(gT<=y&&y<=gB))&&kind(x,y)==='sea',land=(x,y)=>kind(x,y)==='land';
 const mainland=toCR(133.771,34.645),pt=(lon,lat)=>kind(...toCR(lon,lat));
 const offLand=G.CL.filter(C=>{const c=Math.floor((C.x-OX)/S),r=Math.floor((C.y-OY)/S);return c>=c0&&c<c1&&r>=r0&&r<r1&&kind(c,r)!=='land';}).map(C=>C.id);
 checks[late?'1584-1615':'1560-1583']={fujitoPassage:reach(west,east,water),kojimaJoinsMainland:reach(toCR(133.835,34.488),mainland,land),amakiJoinsMainland:reach(toCR(133.8124,34.5686),mainland,land),
  hayashimaJoinsMainland:reach(toCR(133.81842,34.599915),mainland,land),kyogashima:pt(133.8108903,34.5610021),fujitoji:pt(133.8095872,34.5601554),ukisuiwa:pt(133.8052177,34.5598924),shionasu:pt(133.771388,34.476388),
  hayashimaShrine:pt(133.81842,34.599915),kurashiki:pt(133.772,34.596),mizushima:pt(133.718,34.517),castlesOffLand:offLand};}
report.checks=checks;fs.writeFileSync(path.join(outDir,'report.json'),JSON.stringify(report,null,1)+'\n');
const bad=[];for(const [p,c] of Object.entries(checks)){if(!c.fujitoPassage)bad.push(p+' 藤戸が通じない');if(c.kojimaJoinsMainland)bad.push(p+' 児島が本土と続く');if(c.amakiJoinsMainland)bad.push(p+' 天城が本土と続く');
 for(const k of ['kyogashima','fujitoji','ukisuiwa','shionasu','hayashimaShrine'])if(c[k]!=='land')bad.push(p+' '+k+' が陸でない');if(c.castlesOffLand.length)bad.push(p+' 城が海に '+c.castlesOffLand);}
if(checks['1560-1583'].hayashimaJoinsMainland)bad.push('1584年より前に早島が本土と続く');
console.log(JSON.stringify({edits:report.edits&&Object.fromEntries(Object.entries(report.edits).map(([k,v])=>[k,v.pixels])),cleanup:report.cleanup,checks},null,1));
if(bad.length){console.error(bad.join('\n'));process.exitCode=1;}
})().catch(e=>{console.error(e);process.exit(1);});
