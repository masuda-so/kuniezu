/* 一度だけの範囲の作り直し（2026-11-04、利用者の指示）。地図の右上の角を国土地理院の日本の最北端（択捉島カモイワッカ岬）にする。
   ・北：陸のデータが無い帯（旧北端 北緯46.27度〜択捉島の緯度）を削る（上から 792 行）
   ・東：択捉島の東端（東経148.75度）まで 2,644 列を足す
   正本の provinces.png・data/map/gun.png・rivers.png（8bit RGB）を作り直し、projection.json・rivers.json・年代別の差分の窓をずらす。
   足した東の範囲の陸（色丹・歯舞・択捉など）と、北端の帯（北緯45.50度以北、旧来の陸のデータが北緯45.53度で切れていた所）は、
   Copernicus DEM GLO-90 で標高 0.5m 超を陸とし、未割当の陸にする。海は海。
   標高の正本 heightmap.png は tools/map/build-copernicus-height.py で新しい格子に作り直す（この道具では扱わない）。
   実行：node --max-old-space-size=4000 tools/map/regrid-extent-2026-11-04.cjs   二度目は止まる（projection.json の大きさで判定）。 */
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const MD=require('./map-data.cjs'),{readRGB,writeRGB}=require('./png-big.cjs');
const root=MD.root,P=MD.readProjection(),W=P.width,H=P.height;
const DROP=792,ADD=2644,W2=W+ADD,H2=H-DROP;
if(W!==20782||H!==24288)throw Error('この作り直しは済んでいる（projection.json が旧い大きさではない）');
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
// DEM（Copernicus COG、タイル・DEFLATE・浮動小数の予測子3）
function readTiff(file){const b=fs.readFileSync(file);const le=b.toString('ascii',0,2)==='II';const u16=o=>le?b.readUInt16LE(o):b.readUInt16BE(o),u32=o=>le?b.readUInt32LE(o):b.readUInt32BE(o);
 const ifd=u32(4),n=u16(ifd),tags={},sz={1:1,2:1,3:2,4:4,5:8,11:4,12:8,16:8};
 for(let i=0;i<n;i++){const e=ifd+2+i*12,tag=u16(e),type=u16(e+2),cnt=u32(e+4),off=sz[type]*cnt<=4?e+8:u32(e+8),vals=[];for(let k=0;k<cnt;k++){const o=off+k*sz[type];vals.push(type===3?u16(o):type===4?u32(o):type===12?(le?b.readDoubleLE(o):b.readDoubleBE(o)):b[o]);}tags[tag]=vals;}
 const TW=tags[256][0],TH=tags[257][0],tw=tags[322][0],th=tags[323][0],offs=tags[324],cnts=tags[325],out=new Float32Array(TW*TH),tx=Math.ceil(TW/tw);
 for(let t=0;t<offs.length;t++){const buf=Buffer.from(zlib.inflateSync(b.subarray(offs[t],offs[t]+cnts[t]))),row=tw*4,tmp=Buffer.alloc(row),c0=(t%tx)*tw,r0=Math.floor(t/tx)*th;
  for(let y=0;y<th;y++){const o=y*row;for(let i=1;i<row;i++)buf[o+i]=(buf[o+i]+buf[o+i-1])&255;for(let x=0;x<tw;x++)for(let k=0;k<4;k++)tmp[x*4+k]=buf[o+k*tw+x];if(r0+y>=TH)continue;for(let x=0;x<tw&&c0+x<TW;x++)out[(r0+y)*TW+c0+x]=tmp.readFloatBE(x*4);}}
 return {W:TW,H:TH,data:out,lon0:tags[33922][3],lat0:tags[33922][4],dx:tags[33550][0],dy:tags[33550][1]};}
const demDir=path.join(root,'.cache/copernicus-dem-90m'),dems=new Map();
const height=(lon,lat)=>{const la=Math.floor(lat),lo=Math.floor(lon),k=la+','+lo;if(!dems.has(k)){const f=path.join(demDir,`Copernicus_DSM_COG_30_N${la}_00_E${lo}_00_DEM.tif`);dems.set(k,fs.existsSync(f)?readTiff(f):null);}
 const r=dems.get(k);if(!r)return 0;const c=Math.floor((lon-r.lon0)/r.dx),rr=Math.floor((r.lat0-lat)/r.dy);return c<0||rr<0||c>=r.W||rr>=r.H?0:r.data[rr*r.W+c];};
const OX=P.origin[0],OY2=P.origin[1]+DROP*P.stepUnits,S=P.stepUnits;
const cellLL=(c,r)=>[(OX+(c+.5)*S)/P.K/P.CX+P.LON0,P.LAT0-(OY2+(r+.5)*S)/P.K];
// 千島：東の足した範囲と、旧範囲の東端の島々。旧い画像で海の所だけ、DEM で陸にする（北海道本島は変えない）
const KURIL={lon0:145.40,lon1:148.80,lat0:43.20,lat1:45.60};
const def=MD.readDefinition(),seaRGB=def.byKey.get('sea').rgb,landRGB=def.byKey.get('unassigned').rgb;
let added=0;
async function regrid(src,dst,fillRGB,{kuril=false}={}){const tmp=dst+'.regrid';let r2=0;const rows=[];
 // 行を順に読み、上の DROP 行を捨てて、右に ADD 列を足して書く（書きは読みに追いつかないよう全行をためずに流す）
 const out=fs.openSync(tmp+'.raw','w');
 await readRGB(src,(y,row)=>{if(y<DROP)return;const r=y-DROP,line=Buffer.alloc(W2*3);row.copy(line,0,0,W*3);for(let c=W;c<W2;c++){line[c*3]=fillRGB[0];line[c*3+1]=fillRGB[1];line[c*3+2]=fillRGB[2];}
  if(kuril){const [,lat]=cellLL(0,r),band=lat>=45.50;if(band||lat>=KURIL.lat0&&lat<=KURIL.lat1)for(let c=0;c<W2;c++){const [lon]=cellLL(c,r);if(!band&&(lon<KURIL.lon0||lon>KURIL.lon1))continue;const o=c*3;if(line[o]!==seaRGB[0]||line[o+1]!==seaRGB[1]||line[o+2]!==seaRGB[2])continue;if(height(lon,lat)>0.5){line[o]=landRGB[0];line[o+1]=landRGB[1];line[o+2]=landRGB[2];added++;}}}
  fs.writeSync(out,line);});
 fs.closeSync(out);const fd=fs.openSync(tmp+'.raw','r'),buf=Buffer.alloc(W2*3);
 await writeRGB(tmp,W2,H2,y=>{fs.readSync(fd,buf,0,W2*3,y*W2*3);return buf;});fs.closeSync(fd);fs.rmSync(tmp+'.raw');fs.renameSync(tmp,dst);}
(async()=>{
 const before={provinces:sha(MD.files.provinces),gun:sha(path.join(root,'data/map/gun.png')),rivers:sha(path.join(MD.dir,'rivers.png'))};
 await regrid(MD.files.provinces,MD.files.provinces,seaRGB,{kuril:true});
 await regrid(path.join(root,'data/map/gun.png'),path.join(root,'data/map/gun.png'),[0,0,0]);
 await regrid(path.join(MD.dir,'rivers.png'),path.join(MD.dir,'rivers.png'),[0,0,0]);
 const proj={...P,origin:[OX,OY2],width:W2,height:H2,extent:'右上の角＝国土地理院の日本の最北端（択捉島カモイワッカ岬、北緯45°33′26″・東経148°45′08″）、左下＝最西端（与那国島）の西側。2026-11-04 に北の空白を削り東を足した。'};
 delete proj.tileShiftFromV1;proj.tileShiftFromV1=[0,4];proj.rowsDroppedFromV2=DROP;
 fs.writeFileSync(MD.files.projection,JSON.stringify(proj,null,1)+'\n');
 // 河川の正本の表：大きさ・投影・確認値。移行時のタイル一覧は旧い格子なので外す
 const rj=JSON.parse(fs.readFileSync(path.join(MD.dir,'rivers.json'),'utf8'));rj.width=W2;rj.height=H2;rj.projection={...rj.projection,origin:[OX,OY2],width:W2,height:H2};rj.gridSha256=sha(MD.files.projection);rj.sha256=sha(path.join(MD.dir,'rivers.png'));
 if(rj.tiles){rj.migrationTilesOldGrid=rj.tiles.length;delete rj.tiles;}rj.regrid='2026-11-04：北を792行削り東に2,644列を足した（河川の画素は変わらない）';
 fs.writeFileSync(path.join(MD.dir,'rivers.json'),JSON.stringify(rj,null,2)+'\n');
 // 郡画像の表
 const gj=JSON.parse(fs.readFileSync(path.join(root,'data/map/gun.json'),'utf8'));gj.projectionSha256=sha(MD.files.projection);gj.gunPngSha256=sha(path.join(root,'data/map/gun.png'));gj.regrid='2026-11-04：北を792行削り東に2,644列を足した（足した所は郡なし）';
 fs.writeFileSync(path.join(root,'data/map/gun.json'),JSON.stringify(gj,null,1));
 // 年代別の差分の型紙の窓（行）をずらす
 const ed=path.join(root,'game/map/edits');for(const f of fs.readdirSync(ed).filter(f=>f.endsWith('.json'))){const p=path.join(ed,f),e=JSON.parse(fs.readFileSync(p,'utf8'));if(!e.payload?.window)continue;e.payload.window[1]-=DROP;if(e.payload.window[1]<0)throw Error('窓が北の削った所にかかる: '+e.id);fs.writeFileSync(p,JSON.stringify(e,null,2)+'\n');}
 console.log(JSON.stringify({before,width:W2,height:H2,origin:[OX,OY2],kurilLandAdded:added,demTiles:[...dems].filter(([,v])=>v).map(([k])=>k)}));
})().catch(e=>{console.error(e);process.exit(1);});
