/* 一度だけの割り当て（2026-11-04、利用者の指示「南の島も分けましょう」）。
   正本 provinces.png の北緯35.3度より南に残る「未割当の陸」（島558個、約18万画素）を、1560〜1615年の帰属で分ける。
   ・奄美群島（奄美大島・喜界・徳之島・沖永良部・与論ほか） castle:shuri。1609年3月の島津の琉球侵攻の後は薩摩へ割かれたので、
     年代別の差分 kuniezu/map/edits/amami-satsuma-from-1609.json（型紙）で castle:uchi にする。
   ・琉球の島（久米島・粟国・渡名喜・慶良間・硫黄鳥島など） castle:shuri。硫黄鳥島は1609年の後も琉球に残るので奄美の差分に入れない。
   ・伊豆諸島 castle:nirayama（伊豆国賀茂郡の島々。国郡制での所属に合わせた。北条氏の島の支配の実態は未確認）。
   ・無人島（大東諸島・小笠原諸島・火山列島・鳥島・孀婦岩・西之島・尖閣諸島） context:uninhabited。1560〜1615年に定住の記録がない。
   ・舟山群島の北（嵊泗列島など、地図の西の縁） context:ming-zhejiang。
   ・そのほか（口永良部島・大隅の小島・朝鮮の沿岸の小島・本土沿いの1画素ほどの岩など）は、最も近い割り当て済みの陸の区画にする（60km まで）。
   実行：node --max-old-space-size=6000 tools/map/assign-south-islands-2026-11-04.cjs   二度目は止まる（新しい区画が既にあれば）。 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const MD=require('./map-data.cjs'),{readRGB,writeRGB}=require('./png-big.cjs');
const P=MD.readProjection(),W=P.width,H=P.height,S=P.stepUnits,[OX,OY]=P.origin;
const def=MD.readDefinition();
const NEW=[['context:uninhabited',[214,208,190]],['context:ming-zhejiang',[184,167,119]]];
for(const [k] of NEW)if(def.byKey.has(k))throw Error('既に割り当て済み: '+k);
const rows=def.rows.filter(Boolean).map(r=>({...r}));let next=Math.max(...rows.map(r=>r.id))+1;const used=new Set(rows.map(r=>r.rgb.join(',')));
for(const [key,rgb] of NEW){const c=rgb.slice();while(used.has(c.join(',')))c[2]=(c[2]+1)%256;used.add(c.join(','));rows.push({id:next++,rgb:c,key,kind:'land'});}
const rgbOf=k=>rows.find(r=>r.key===k).rgb,keyOf=new Map(rows.map(r=>[r.rgb.join(','),r]));
const UN=def.byKey.get('unassigned').rgb.join(',');
const ll=(c,r)=>[(OX+(c+.5)*S)/P.K/P.CX+P.LON0,P.LAT0-(OY+(r+.5)*S)/P.K];
const box=(lo,la,a,b,c,d)=>lo>=a&&lo<=b&&la>=c&&la<=d;
function classify(lo,la){
 if(box(lo,la,128.2,128.3,27.8,27.95))return ['castle:shuri','ryukyu'];// 硫黄鳥島
 if(box(lo,la,128.3,130.2,26.95,28.6))return ['castle:shuri','amami'];
 if(box(lo,la,123.4,123.75,25.6,25.85))return ['context:uninhabited'];// 尖閣諸島
 if(box(lo,la,122.9,128.35,24.0,27.15))return ['castle:shuri','ryukyu'];
 if(box(lo,la,131.0,131.45,24.3,26.1))return ['context:uninhabited'];// 大東諸島・沖大東島
 if(box(lo,la,139.0,140.0,32.3,34.85))return ['castle:nirayama','izu'];
 if(box(lo,la,140.2,142.5,24.0,30.6))return ['context:uninhabited'];// 鳥島・孀婦岩・西之島・小笠原・火山列島
 if(lo<123.2&&la>29.5)return ['context:ming-zhejiang'];
 return null;}
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
(async()=>{
 // 1. 未割当の陸を連結成分にまとめる（北緯23.5〜35.3度）
 const parent=[],runs=[];const find=a=>{while(parent[a]!==a)a=parent[a]=parent[parent[a]];return a;};let prev=[];
 await readRGB(MD.files.provinces,(r,row)=>{const la=ll(0,r)[1];if(la>35.3||la<23.5){prev=[];return;}const cur=[];let c=0;
  while(c<W){if(row[c*3]+','+row[c*3+1]+','+row[c*3+2]!==UN){c++;continue;}const s=c;while(c<W&&row[c*3]+','+row[c*3+1]+','+row[c*3+2]===UN)c++;
   const id=parent.length;parent.push(id);runs.push([r,s,c-1]);cur.push([s,c-1,id]);for(const [a,b,p] of prev)if(a<=c&&b>=s-1){const x=find(p),y=find(id);if(x!==y)parent[y]=x;}}
  prev=cur;});
 const comps=new Map();runs.forEach(([r,a,b],i)=>{const k=find(i);const g=comps.get(k)||{runs:[],n:0,sx:0,sy:0,c0:1e9,c1:0,r0:1e9,r1:0};g.runs.push(i);g.n+=b-a+1;g.sx+=(a+b)/2*(b-a+1);g.sy+=r*(b-a+1);g.c0=Math.min(g.c0,a);g.c1=Math.max(g.c1,b);g.r0=Math.min(g.r0,r);g.r1=Math.max(g.r1,r);comps.set(k,g);});
 const list=[...comps.values()].map(g=>{const [lo,la]=ll(g.sx/g.n,g.sy/g.n);return {...g,lo,la,cls:lo>122?classify(lo,la):['skip']};}).filter(g=>g.cls?.[0]!=='skip');
 // 2. 規則で決まらない島は、最も近い割り当て済みの陸（城・中立・地域の区画）の区画にする
 const R=600,todo=list.filter(g=>!g.cls);for(const g of todo)g.best=[Infinity,null];
 const ok=k=>{const d=keyOf.get(k);return d&&d.kind==='land'&&d.key!=='unassigned';};
 await readRGB(MD.files.provinces,(r,row)=>{for(const g of todo){if(r<g.r0-R||r>g.r1+R)continue;const dy=r<g.r0?g.r0-r:r>g.r1?r-g.r1:0;if(dy>=g.best[0])continue;
  for(let c=Math.max(0,g.c0-R);c<=Math.min(W-1,g.c1+R);c++){const dx=c<g.c0?g.c0-c:c>g.c1?c-g.c1:0,d=Math.hypot(dx,dy);if(d>=g.best[0])continue;const k=row[c*3]+','+row[c*3+1]+','+row[c*3+2];if(ok(k))g.best=[d,keyOf.get(k).key];}}});
 for(const g of todo)g.cls=g.best[1]?[g.best[1],'nearest']:['context:uninhabited'];
 // 3. 書き込み
 const target=new Map();for(const g of list){const v=rgbOf(g.cls[0]);for(const i of g.runs){const [r,a,b]=runs[i];if(!target.has(r))target.set(r,[]);target.get(r).push([a,b,v,g.cls[1]]);}}
 const amami=[];const count={};for(const g of list){const k=g.cls[0]+(g.cls[1]?'('+g.cls[1]+')':'');count[k]=(count[k]||0)+g.n;}
 const src=MD.files.provinces,tmpRaw=src+'.south.raw',fd=fs.openSync(tmpRaw,'w');
 await readRGB(src,(r,row)=>{for(const [a,b,v,tag] of target.get(r)||[]){for(let c=a;c<=b;c++){row[c*3]=v[0];row[c*3+1]=v[1];row[c*3+2]=v[2];if(tag==='amami')amami.push([c,r]);}}fs.writeSync(fd,row);});
 fs.closeSync(fd);const rd=fs.openSync(tmpRaw,'r'),buf=Buffer.alloc(W*3);
 await writeRGB(src+'.south',W,H,y=>{fs.readSync(rd,buf,0,W*3,y*W*3);return buf;});fs.closeSync(rd);fs.rmSync(tmpRaw);fs.renameSync(src+'.south',src);
 MD.writeDefinition(rows);
 // 4. 奄美の型紙（1609年からは薩摩）。値1＝keys[0]
 const c0=Math.min(...amami.map(p=>p[0])),c1=Math.max(...amami.map(p=>p[0])),r0=Math.min(...amami.map(p=>p[1])),r1=Math.max(...amami.map(p=>p[1])),w=c1-c0+1,h=r1-r0+1;
 const grid=new Uint8Array(w*h);for(const [c,r] of amami)grid[(r-r0)*w+(c-c0)]=1;
 const maskDir=path.join(MD.root,'data/inputs/south-islands-review'),mask=path.join(maskDir,'amami-satsuma-from-1609-mask.png');fs.mkdirSync(maskDir,{recursive:true});
 const line=Buffer.alloc(w*3);await writeRGB(mask,w,h,y=>{line.fill(0);for(let x=0;x<w;x++)if(grid[y*w+x])line[x*3+2]=1;return line;});
 const edit={id:'amami-satsuma-from-1609',layer:'provinces',baseRevision:'liaodong-1560-source-v1',validFrom:[1609,3,7],validUntil:[1616,1,1],
  payload:{mask:'../../../data/inputs/south-islands-review/amami-satsuma-from-1609-mask.png',maskSha256:sha(mask),window:[c0,r0,w,h],from:'key:castle:shuri',keys:['castle:uchi']},
  sourceIds:['mlit-amami-history'],
  basis:'1609年の島津氏の琉球侵攻の後、奄美群島（奄美大島・喜界島・徳之島・沖永良部島・与論島ほか）は薩摩に割かれた（国土交通省 観光庁 多言語解説文「奄美大島の歴史」）。',
  review:'開始日は島津軍の奄美大島への渡海（慶長14年3月）に合わせた。名目上は琉球の一部とされ、統治の制度（大島置目之条々など）は後年に整う。硫黄鳥島は琉球に残るので含めない。',
  uncertaintyKm:0};
 fs.writeFileSync(path.join(MD.root,'kuniezu/map/edits/amami-satsuma-from-1609.json'),JSON.stringify(edit,null,2)+'\n');
 console.log(JSON.stringify({islands:list.length,count,amamiPixels:amami.length,window:[c0,r0,w,h]}));
})().catch(e=>{console.error(e);process.exit(1);});
