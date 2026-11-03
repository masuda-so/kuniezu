/* 段階1：読み込み後の地図（TKGEO の陸・城の領域・中立地・湖）を、1画素1領域の領域画像（Paradox の provinces 画像と同じ考え方）へ変換する。
   出力：正本 game/map_data/（provinces.png 全域1枚・definition.csv・default.map・projection.json、tools/map/map-data.cjs の書式）と、集計 data/audits/raster-provinces-build.json。
   正本を作り直すのは土台そのものを変える時だけ（一度作った後は provinces.png を正本として直す）。配信タイルは続けて node tools/map/build-map-tiles.cjs で作る。
   この中の番号は 0＝海、1＝未割当の陸…（内部の番号）で、definition.csv には +1 して書く（CK3 の書式で 0 は予約）。
   1画素＝100m（緯度方向）。画素の中心が多角形の内側か（偶奇則）で塗る。漏れ・重なりの集計を manifest に記録する。
   実行：正本がまだ存在しない移行用の置き場で node tools/map/build-provinces.cjs。既存正本への上書きは拒否。 */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'data/map'),MD=require('./map-data.cjs');// out：郡画像と割り当て表
// 一度画像へ移した後の正本を、補正前のベクトルで上書きしない。新規移行の空の置き場だけで使う。
if(fs.existsSync(MD.files.provinces))throw Error('既存の provinces.png は画像の正本です。旧ベクトルから上書きできません。配信物の再生成は node tools/map/build-map-tiles.cjs を使ってください。');
const MODEL=require(path.join(root,'tools/checks/history-focus.cjs')).model(),{TKGEO:T}=MODEL;MODEL.G.newGame('s1560','oda');
const CONT={x0:-1014.1,x1:2688.7,y0:-755.3,y1:3459.7};          // game/ui.js の表示範囲と同じ
const STEP=0.1/(111.32/T.K);                            // 100m を地図平面の単位へ（緯度方向）
const TILE=1024;
// 原点は初版（x0=-1045, y0=-168）からタイルの整数倍だけ左上へずらし、タイルの区切りを保つ（差分データのタイル・画素の対応を崩さない）。
const SHIFT=[0,4],ORIGIN=[-1045-SHIFT[0]*TILE*STEP,-168-SHIFT[1]*TILE*STEP];
if(ORIGIN[0]>CONT.x0||ORIGIN[1]>CONT.y0)throw Error('origin must cover CONT');
const W=Math.ceil((CONT.x1-ORIGIN[0])/STEP),H=Math.ceil((CONT.y1-ORIGIN[1])/STEP);
// 領域の一覧：0=海、1=未割当の陸、続いて城の領域・中立地・湖。番号は一度付けたら変えない（既存の definition.csv を読み、
// 同じキーには同じ番号と色を使い、新しいキーだけ末尾に足す。消えたキーも行を残す）。湖のキーは配列の順ではなく重心の経緯度で付ける。
const prev=new Map();
if(fs.existsSync(MD.files.definition))for(const r of MD.readDefinition().rows)if(r)prev.set(r.key,{id:r.id-1,rgb:r.rgb,name:r.key,kind:r.kind});
const lakeKey=poly=>{const r=poly[0];let sx=0,sy=0,n=r.length/2;for(let i=0;i<r.length;i+=2){sx+=r[i];sy+=r[i+1];}const lon=sx/n/T.K/T.CX+T.LON0,lat=T.LAT0-sy/n/T.K;return 'lake:'+lon.toFixed(2)+','+lat.toFixed(2);};
// 旧形式（lake:<添字>）の行は、同じ添字の湖の重心キーへ名前だけ移す（番号と色は保つ）。
T.lakes.forEach((poly,i)=>{const o=prev.get('lake:'+i);if(o&&!prev.has(lakeKey(poly))){prev.set(lakeKey(poly),o);prev.delete('lake:'+i);}});
const wanted=[{key:'sea',name:'海',kind:'sea'},{key:'unassigned',name:'未割当の陸',kind:'land'}];
for(const k of Object.keys(T.terr).sort())wanted.push({key:'castle:'+k,name:k,kind:'land',polys:T.terr[k]});
// 線の領域を持たない城（地図を広げた地域の拠点など）は郡画像だけで領域を作る。
for(const C of MODEL.G.CL)if(!T.terr[C.id])wanted.push({key:'castle:'+C.id,name:C.id,kind:'land',polys:[]});
for(const k of Object.keys(T.neutral||{}).sort())wanted.push({key:'neutral:'+k,name:k,kind:'land',polys:T.neutral[k]});
T.lakes.forEach(poly=>wanted.push({key:lakeKey(poly),name:'湖',kind:'lake',polys:[poly]}));
let next=Math.max(1,...[...prev.values()].map(v=>v.id))+1;const defs=[];
for(const w of wanted){const o=prev.get(w.key);const id=o?o.id:(w.key==='sea'?0:w.key==='unassigned'?1:next++);defs[id]={...w,id,rgb:o?.rgb};}
for(const [key,o] of prev)if(!defs[o.id])defs[o.id]={key,id:o.id,name:o.name,kind:o.kind,rgb:o.rgb,polys:[],retired:true};
for(let i=0;i<defs.length;i++)if(!defs[i])throw Error('gap in ids '+i);
if(defs.length>65535)throw Error('too many ids');
// 色：IDから一意の24bit色を決める（隣り合うIDが似た色にならないよう掛け算で散らす）。海は黒に近い紺。
const color=id=>id===0?[8,24,48]:(()=>{const v=(id*2654435761>>>0)%16777213+1;return [v>>16&255,v>>8&255,v&255];})();
const seen=new Set();for(const d of defs){d.rgb=d.rgb||color(d.id);const c=d.rgb.join(',');if(seen.has(c))throw Error('color clash '+d.id);seen.add(c);}
// 偶奇則の走査線塗り。rings は平面座標の平らな配列 [x0,y0,x1,y1,...] の集まり。行 y0..y1 の範囲だけ塗る。
function fill(rings,row0,row1,cb){const edges=[];for(const r of rings){const n=r.length/2;for(let i=0;i<n;i++){const ax=r[i*2],ay=r[i*2+1],bx=r[((i+1)%n)*2],by=r[((i+1)%n)*2+1];if(ay===by)continue;edges.push(ay<by?[ax,ay,bx,by]:[bx,by,ax,ay]);}}
 const py=r=>ORIGIN[1]+(r+.5)*STEP;let lo=Infinity,hi=-Infinity;for(const e of edges){lo=Math.min(lo,e[1]);hi=Math.max(hi,e[3]);}
 const ra=Math.max(row0,Math.ceil((lo-ORIGIN[1])/STEP-.5)),rb=Math.min(row1-1,Math.floor((hi-ORIGIN[1])/STEP-.5));if(ra>rb)return;
 const buckets=new Map();for(const e of edges){const s=Math.max(ra,Math.ceil((e[1]-ORIGIN[1])/STEP-.5));if(s>rb)continue;if(!buckets.has(s))buckets.set(s,[]);buckets.get(s).push(e);}
 let active=[];for(let r=ra;r<=rb;r++){const y=py(r);if(buckets.has(r))active.push(...buckets.get(r));active=active.filter(e=>e[3]>y);const xs=[];for(const e of active)if(e[1]<=y&&e[3]>y)xs.push(e[0]+(y-e[1])/(e[3]-e[1])*(e[2]-e[0]));xs.sort((a,b)=>a-b);
  for(let i=0;i+1<xs.length;i+=2){const c0=Math.max(0,Math.ceil((xs[i]-ORIGIN[0])/STEP-.5)),c1=Math.min(W-1,Math.floor((xs[i+1]-ORIGIN[0])/STEP-.5));if(c0<=c1)cb(r,c0,c1);}}}
const bbox=polys=>{let y0=Infinity,y1=-Infinity;for(const p of polys)for(const r of p)for(let i=1;i<r.length;i+=2){y0=Math.min(y0,r[i]);y1=Math.max(y1,r[i]);}return [y0,y1];};
const rowOf=y=>Math.floor((y-ORIGIN[1])/STEP);
const landB=T.land.map(p=>({p,b:bbox([p])})),items=defs.slice(2).filter(d=>d.polys&&d.polys.length).map(d=>({d,b:bbox(d.polys)}));
const counts=new Float64Array(defs.length);let overlap=0,outsideLand=0;
const N=W*H;
const land=new Uint8Array(N),id=new Uint16Array(N);
// 1) 陸の形（海と陸はこれだけで決める）。2) 城の領域・中立地（重なりは後の領域が勝つ＝キー順で決定的）。3) 湖。
for(const {p} of landB)fill(p,0,H,(r,c0,c1)=>land.fill(1,r*W+c0,r*W+c1+1));
for(const {d} of items)for(const poly of d.polys)fill(poly,0,H,(r,c0,c1)=>{const o=r*W;for(let c=c0;c<=c1;c++){const k=o+c;if(d.kind==='lake'){if(land[k])id[k]=d.id;continue;}if(id[k]&&id[k]!==d.id)overlap++;id[k]=d.id;}});
// 海の上にはみ出した領域は海に戻す。
for(let k=0;k<N;k++)if(!land[k]&&id[k]){if(defs[id[k]].kind==='land')outsideLand++;id[k]=0;}
// 陸なのにどの領域にも入らない画素は、4近傍で陸を伝って最も近い領域に寄せる（SLIVER画素＝約2kmまで）。それより遠い陸は「未割当の陸」。
const SLIVER=20;let frontier=[];for(let k=0;k<N;k++)if(id[k]>1){const x=k%W;if((x>0&&land[k-1]&&!id[k-1])||(x<W-1&&land[k+1]&&!id[k+1])||(k>=W&&land[k-W]&&!id[k-W])||(k<N-W&&land[k+W]&&!id[k+W]))frontier.push(k);}
let filled=0;for(let step=0;step<SLIVER&&frontier.length;step++){const next=[];for(const k of frontier){const x=k%W,v=id[k];for(const n of [x>0?k-1:-1,x<W-1?k+1:-1,k-W,k+W]){if(n<0||n>=N||!land[n]||id[n])continue;id[n]=v;filled++;next.push(n);}}frontier=next;}
// 郡による割り当て直し（日本）。data/map/gun.png（全域1枚）の郡画像（CODH 旧郡、江戸末期）を最小の単位とし、郡ごとに城の領域へ振り分ける。
// 決まり（gun-assignment.csv の basis）：
//  castle-point … 郡の中に城が一つ → 郡全体をその城へ。
//  split        … 郡の中に城が複数 → 郡の中は従来の線の領域の割り当てを保つ（その城どうしで分ける。推定）。
//  same-province … 郡の中に城がない → 同じ国の城の中で、従来の領域の票が多い城（票が無ければ最も近い城）へ（推定）。
//  majority-other-province … その国に城が一つも無い（河内・志摩・安房など）→ 従来の領域で最も多い城へ（推定）。
// 郡の無い陸（朝鮮・大陸）は従来どおり。日本の海岸で郡データと陸地の輪郭がずれた画素は、4近傍で2kmまで隣の郡に寄せる。
let gunReport=null;
(async()=>{
if(fs.existsSync(path.join(out,'gun.png'))){const gun=new Uint16Array(N);
 await require('./png-big.cjs').readRGB(path.join(out,'gun.png'),(y,row)=>{const o=y*W;for(let x=0;x<W;x++)gun[o+x]=row[x*3+1]<<8|row[x*3+2];});
 // 海岸のずれ：郡の無い日本側の陸画素を、郡のある陸から4近傍で寄せる（2kmまで）。
 let fr=[];for(let k=0;k<N;k++)if(gun[k]&&land[k])fr.push(k);for(let step=0;step<20&&fr.length;step++){const nx=[];for(const k of fr){const x=k%W;for(const n of [x>0?k-1:-1,x<W-1?k+1:-1,k-W,k+W]){if(n<0||n>=N||!land[n]||gun[n])continue;gun[n]=gun[k];nx.push(n);}}fr=nx;}
 const rows=fs.readFileSync(path.join(out,'gun.csv'),'utf8').trim().split('\n').slice(1).map(l=>{const p=l.split(';');return {n:+p[0],codh:p[1],name:p[2],kuni:p[4]};});
 const isOwner=v=>v>1&&(defs[v].key.startsWith('castle:')||defs[v].key.startsWith('neutral:'));
 const votes=new Map();for(let k=0;k<N;k++){const g=gun[k];if(!g||!land[k])continue;const v=id[k];if(!isOwner(v))continue;let m=votes.get(g);if(!m){m=new Map();votes.set(g,m);}m.set(v,(m.get(v)||0)+1);}
 const byKey=new Map(defs.map(d=>[d.key,d.id])),castlesIn=new Map();
 for(const C of MODEL.G.CL){const dId=byKey.get('castle:'+C.id);if(dId==null)continue;const c=Math.floor((C.x-ORIGIN[0])/STEP),r=Math.floor((C.y-ORIGIN[1])/STEP);if(c<0||r<0||c>=W||r>=H)continue;const g=gun[r*W+c];if(!g)continue;if(!castlesIn.has(g))castlesIn.set(g,new Set());castlesIn.get(g).add(dId);}
 const normKuni=k=>['磐城','岩代','陸前','陸中','陸奥'].includes(k)?'陸奥':['羽前','羽後'].includes(k)?'出羽':k;
 const gunKuni=new Map(rows.map(r=>[r.n,normKuni(r.kuni)])),kuniCastles=new Map(),castlePt=new Map();
 for(const [g,cs] of castlesIn)for(const v of cs){const kn=gunKuni.get(g);if(!kuniCastles.has(kn))kuniCastles.set(kn,[]);kuniCastles.get(kn).push(v);}
 for(const C of MODEL.G.CL){const dId=byKey.get('castle:'+C.id);if(dId!=null)castlePt.set(dId,[(C.x-ORIGIN[0])/STEP,(C.y-ORIGIN[1])/STEP]);}
 const gunCentroid=new Map();{const sx=new Float64Array(rows.length+2),sy=new Float64Array(rows.length+2),sn=new Float64Array(rows.length+2);for(let k=0;k<N;k+=7){const g=gun[k];if(!g)continue;sx[g]+=k%W;sy[g]+=Math.floor(k/W);sn[g]++;}for(const r of rows)if(sn[r.n])gunCentroid.set(r.n,[sx[r.n]/sn[r.n],sy[r.n]/sn[r.n]]);}
 const assign=new Map(),rowsOut=[];
 const overrides=fs.existsSync(path.join(out,'gun-overrides.json'))?JSON.parse(fs.readFileSync(path.join(out,'gun-overrides.json'),'utf8')).guns:{};
 for(const row of rows){const g=row.n,cs=castlesIn.get(g),m=votes.get(g)||new Map();let basis,target=null;
  if(overrides[row.codh]?.basis==='assign'){const t=byKey.get(overrides[row.codh].region);if(t==null)throw Error('override region missing '+overrides[row.codh].region);assign.set(g,{basis:'override',target:t,castles:[]});rowsOut.push([g,row.codh,row.name,row.kuni,'override',overrides[row.codh].region,'']);continue;}
  if(overrides[row.codh]?.basis==='excluded'){assign.set(g,{basis:'excluded',target:null,castles:[]});rowsOut.push([g,row.codh,row.name,row.kuni,'excluded','','']);continue;}
  if(cs&&cs.size===1){basis='castle-point';target=[...cs][0];}
  else if(cs&&cs.size>1){basis='split';}
  else{// 城のない郡：同じ国（令制国。陸奥・出羽の明治の分割は戻す）の城の中から、従来の領域の票が多い城、票が無ければ最も近い城へ。
   const kn=normKuni(row.kuni),same=kuniCastles.get(kn)||[];
   if(same.length){basis='same-province';let best=-1;for(const v of same){const n=m.get(v)||0;if(n>best){best=n;target=v;}}
    if(best<=0){const c=gunCentroid.get(g);let bd=Infinity;for(const v of same){const p=castlePt.get(v);const d=c&&p?Math.hypot(c[0]-p[0],c[1]-p[1]):Infinity;if(d<bd){bd=d;target=v;}}}}
   else{basis=m.size?'majority-other-province':'unassigned';let best=-1;for(const [v,n] of m)if(n>best){best=n;target=v;}}}
  const tot=[...m.values()].reduce((a,b)=>a+b,0),share=target&&tot?(m.get(target)||0)/tot:null;
  assign.set(g,{basis,target,castles:cs?[...cs]:[]});rowsOut.push([g,row.codh,row.name,row.kuni,basis,target!=null?defs[target].key:(cs?[...cs].map(v=>defs[v].key).join('|'):''),share!=null?share.toFixed(3):'']);}
 let changed=0;for(let k=0;k<N;k++){const g=gun[k];if(!g||!land[k])continue;const a=assign.get(g);if(!a)continue;let v=id[k];
  if(a.basis==='split'){if(!a.castles.includes(v)){// 郡内で、その郡の城以外へ塗られていた画素は郡内の城の中で最寄りの票の多い城へ
     let best=-1,bt=a.castles[0];const m=votes.get(g)||new Map();for(const c of a.castles)if((m.get(c)||0)>best){best=m.get(c)||0;bt=c;}v=bt;}}
  else if(a.basis==='excluded'){v=0;}else if(a.target!=null)v=a.target;else continue;
  if(defs[id[k]].kind==='lake')continue;if(v!==id[k]){id[k]=v;changed++;}}
 fs.writeFileSync(path.join(out,'gun-assignment.csv'),'n;codh_id;name;kuni;basis;region;share\n'+rowsOut.map(r=>r.join(';')).join('\n')+'\n');
 const cnt=b=>rowsOut.filter(r=>r[4]===b).length;gunReport={guns:rows.length,castlePoint:cnt('castle-point'),split:cnt('split'),sameProvince:cnt('same-province'),majorityOtherProvince:cnt('majority-other-province'),unassigned:cnt('unassigned'),pixelsChanged:changed};
 console.log('gun',JSON.stringify(gunReport));}

let unassigned=0;for(let k=0;k<N;k++){if(land[k]&&!id[k]){id[k]=1;unassigned++;}counts[id[k]]++;}
// 未割当の陸がどこにあるか（タイル単位の画素数）
const unTiles={};for(let k=0;k<N;k++)if(id[k]===1){const t=Math.floor((k%W)/TILE)+'-'+Math.floor(Math.floor(k/W)/TILE);unTiles[t]=(unTiles[t]||0)+1;}
const lost=defs.filter(d=>d.id>1&&!d.retired&&!counts[d.id]).map(d=>d.key);
await require('./png-big.cjs').writeRGB(MD.files.provinces,W,H,y=>{const row=Buffer.alloc(W*3),o=y*W;for(let x=0;x<W;x++){const c=defs[id[o+x]].rgb;row[x*3]=c[0];row[x*3+1]=c[1];row[x*3+2]=c[2];}return row;});
MD.writeDefinition(defs.map(d=>({id:d.id+1,rgb:d.rgb,key:d.key,kind:d.kind})));
fs.writeFileSync(MD.files.projection,JSON.stringify({note:'経緯度→格子。x=(経度-LON0)·K·CX、y=(LAT0-緯度)·K の地図平面で、画素(列,行)の左上が origin+(列,行)·stepUnits。1画素＝緯度方向100m。',K:T.K,CX:T.CX,LON0:T.LON0,LAT0:T.LAT0,origin:ORIGIN,tileShiftFromV1:SHIFT,stepUnits:STEP,stepMetres:100,width:W,height:H},null,1)+'\n');
const report={generated:'tools/map/build-provinces.cjs',basis:'読み込み後の TKGEO（陸・城の領域・中立地・湖）と郡画像から正本 game/map_data を作った時の集計。',source:MD.sourceSha256(),
 rules:{seaFromLandMask:true,overlapTiebreak:'後に塗った領域（キーの昇順で後のもの）',sliverAssignPixels:SLIVER,neighbourhood:4,pixelCentre:true},
 gun:gunReport,checks:{provinces:defs.length,overlapPixels:overlap,landIdOutsideLandPixelsReturnedToSea:outsideLand,sliverPixelsAssigned:filled,unassignedLandPixels:unassigned,unassignedByTile:unTiles,lostProvinces:lost}};
fs.writeFileSync(path.join(root,'data/audits/raster-provinces-build.json'),JSON.stringify(report,null,1)+'\n');
console.log('\n',JSON.stringify({W,H,...report.checks}),'\n配信タイルは node tools/map/build-map-tiles.cjs で作る');
})().catch(e=>{console.error(e);process.exit(1);});
