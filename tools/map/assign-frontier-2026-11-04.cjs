/* 一度だけの割り当て（2026-11-04、利用者の指示「戦国・安土桃山の時期に実在した勢力で、見える範囲を MECE に」）。
   正本 provinces.png の「未割当の陸」のうち、満州・沿海州と北海道・千島を、1560〜1615年に実在した勢力の地域へ分ける。
   ・建州女真  context:jianzhou        鴨緑江の北（NIKH）。明の遼東の東、長白山の西、北はホイファ川の南まで。
   ・海西女真  context:haixi           松花江の流域（NIKH、ハダ・イェヘ・ホイファ・ウラ）。張広才嶺の西、蒙古の東。
   ・東方の女真 context:eastern-jurchen 牡丹江一帯とその東の沿海地方（NIKH）。長白山〜張広才嶺の東、豆満江の北岸を含む。
   ・蒙古諸部  context:mongol          遼東の西北（李華彥、NIKH のホルチン）。
   ・蝦夷地（アイヌ） context:ainu     和人地の外の北海道・利尻・礼文・奥尻と千島。
   和人地は1550年の「夷狄の商舶往還の法度」で定まった上ノ国天ノ川〜知内の南西（函館市史 通説編第一巻）。蠣崎家（castle:matsumae）の区画の
   うちこれより北・東の画素は蝦夷地へ戻す（郡単位で渡島国の全郡を割り当てていたのは過大だった）。
   境の線は川と山の筋を経緯度の折れ線で引いた概略（20〜30km程度）で、各勢力の確定した領界ではない。
   実行：node --max-old-space-size=4000 tools/map/assign-frontier-2026-11-04.cjs   二度目は止まる（新しい区画が既にあれば）。 */
const fs=require('node:fs'),path=require('node:path');
const MD=require('./map-data.cjs'),{readRGB,writeRGB}=require('./png-big.cjs');
const P=MD.readProjection(),W=P.width,H=P.height,S=P.stepUnits,[OX,OY]=P.origin;
const def=MD.readDefinition();
const NEW=[['context:jianzhou',[176,150,96]],['context:haixi',[150,160,110]],['context:eastern-jurchen',[120,150,120]],['context:mongol',[190,170,120]],['context:ainu',[150,140,170]]];
for(const [k] of NEW)if(def.byKey.has(k))throw Error('既に割り当て済み: '+k);
// 新しい区画の行（色は既存と重ならないものを選ぶ）
const rows=def.rows.filter(Boolean).map(r=>({...r}));let next=Math.max(...rows.map(r=>r.id))+1;const used=new Set(rows.map(r=>r.rgb.join(',')));
const add=NEW.map(([key,rgb])=>{let c=rgb.slice();while(used.has(c.join(',')))c[2]=(c[2]+1)%256;used.add(c.join(','));const r={id:next++,rgb:c,key,kind:'land'};rows.push(r);return r;});
const rgbOf=Object.fromEntries(add.map(r=>[r.key,r.rgb]));
const unassigned=def.byKey.get('unassigned').rgb.join(','),matsumae=def.byKey.get('castle:matsumae').rgb.join(',');
const interp=(pts,x)=>{if(x<=pts[0][0])return pts[0][1];for(let i=1;i<pts.length;i++)if(x<=pts[i][0]){const [a,b]=pts[i-1],[c,d]=pts[i];return b+(d-b)*(x-a)/(c-a);}return pts[pts.length-1][1];};
// 東方の女真との境（長白山〜張広才嶺の筋）：緯度→経度
const EAST=[[42.0,128.1],[43.0,128.4],[44.0,128.7],[45.6,129.0]];
// 蒙古との境（遼河の上流・松花江との合流の西）：緯度→経度。北緯42.8度より南は明・建州で、ここは使わない
const MONGOL=[[42.8,124.0],[43.6,123.9],[44.4,124.4],[45.0,125.0],[45.6,125.3]];
// 建州と海西の境（ホイファ川の南・竜崗山脈の筋）：経度→緯度
const JH=[[124.4,42.6],[126.0,42.4],[127.0,42.35],[128.1,42.2]];
// 和人地：上ノ国（天河）と知内川河口を結ぶ線の南西。上ノ国の蠣崎氏の勝山館（北緯41.80度）を含むよう、西端は天ノ川河口の少し北に置く
const WAJIN=[[140.10,41.83],[140.425,41.603]];
const southwestOfWajinLine=(lon,lat)=>{const [[x1,y1],[x2,y2]]=WAJIN;return (x2-x1)*(lat-y1)-(y2-y1)*(lon-x1)<0;};
const classify=(lon,lat,key)=>{
 if(lon>=139.0&&lat>=41.3){// 北海道・千島
  if(key===unassigned)return 'context:ainu';
  if(key===matsumae&&!southwestOfWajinLine(lon,lat))return 'context:ainu';
  return null;}
 if(key!==unassigned||lon>=137.6||lat<39.5)return null;// 満州・沿海州だけ
 // 明の区画（遼東の辺牆の内側）の外に残る所：辺牆の東は建州、北西の外は蒙古
 if(lat<42.8&&lon<124.5)return lon>=123.9?'context:jianzhou':'context:mongol';
 if(lon>=interp(EAST,lat))return 'context:eastern-jurchen';
 if(lat>=42.8&&lon<interp(MONGOL,lat))return 'context:mongol';
 if(lat<interp(JH,lon))return 'context:jianzhou';
 return 'context:haixi';};
const count={};
(async()=>{
 const src=MD.files.provinces,tmpRaw=src+'.assign.raw',fd=fs.openSync(tmpRaw,'w');
 await readRGB(src,(r,row)=>{const lat=P.LAT0-(OY+(r+.5)*S)/P.K;if(lat>=39.5){for(let c=0;c<W;c++){const o=c*3,key=row[o]+','+row[o+1]+','+row[o+2];if(key!==unassigned&&key!==matsumae)continue;const lon=(OX+(c+.5)*S)/P.K/P.CX+P.LON0,to=classify(lon,lat,key);if(!to)continue;const v=rgbOf[to];row[o]=v[0];row[o+1]=v[1];row[o+2]=v[2];const k=(key===matsumae?'castle:matsumae→':'unassigned→')+to;count[k]=(count[k]||0)+1;}}fs.writeSync(fd,row);});
 fs.closeSync(fd);const rd=fs.openSync(tmpRaw,'r'),buf=Buffer.alloc(W*3);
 await writeRGB(src+'.assign',W,H,y=>{fs.readSync(rd,buf,0,W*3,y*W*3);return buf;});fs.closeSync(rd);fs.rmSync(tmpRaw);fs.renameSync(src+'.assign',src);
 MD.writeDefinition(rows);
 // 寛甸方面の年代別の差分（1573〜1605年に明）は、元が建州女真の画素に当てる
 const ep=path.join(MD.root,'game/map/edits/ming-kuandian-1573-1605-reference.json'),e=JSON.parse(fs.readFileSync(ep,'utf8'));if(e.payload.from==='key:unassigned'){e.payload.from='key:context:jianzhou';fs.writeFileSync(ep,JSON.stringify(e,null,2)+'\n');}
 console.log(JSON.stringify({added:add.map(r=>[r.id,r.key,r.rgb]),count}));
})().catch(e=>{console.error(e);process.exit(1);});
