/* 年代別の領域差分（game/map/edits/*.json）を基準版の領域画像へ当て、変わるタイルだけを版ごとに書き出す。Pillow を使わない Node 版。
   期間の境目（各差分の validFrom・validUntil）で区切った半開区間ごとに一つの版を作り、game/map/build/edits/compiled/<開始>-<終了>/ に置く。
   差分の中身は二通り。
   ・面（payload.file＋feature）：GeoJSON の多角形の内側に画素中心が入る所を fromKey から toKey へ置き換える（旧 Python 版と同じ規則）。
   ・型紙（payload.mask＋window）：正本の 100m 格子の窓 [列,行,幅,高さ] に合わせた PNG。画素の値 n（G が上位、B が下位）が 1 以上なら keys[n-1] を書く。
   差分の画素はどちらも正本の格子で決め、配信タイルの格子（円錐図法、game/map/build/grid/grid.json）へは、タイルの各画素が参照する正本の画素が
   差分に含まれるかで写す（tools/map/grid-map.cjs。土台の写しと同じ規則なので穴や重なりが出ない）。
     from が 'land' なら元の画素が陸、'sea' なら海、'key:区画キー' なら元の区画キーも一致することを確かめる。
   同じ版の中で書き込みが重なる差分、基準版に適用済みの ID、元の値の食い違いは止める。400m・800m は基準版と同じく画素中心の最近傍。
   全部の版を作り終えてから一時置き場に書き、置き場ごと入れ替える（途中で止まっても配信中の版を壊さない）。
   実行：node --max-old-space-size=6000 tools/map/build-province-edits.cjs   （検査からは build({mapDir, md, editsDir, compiledDir}) を呼ぶ）
   書き出しの後に node tools/map/build-edges.cjs で境界線を作り直す。 */
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const decodePNG=require('../geo/png-decode.cjs');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const MD=require('./map-data.cjs');
function build({mapDir=MD.out,md=MD,editsDir=path.join(MD.root,'game/map/edits'),compiledDir=path.join(mapDir,'edits/compiled')}={}){
const dir=mapDir,edits=editsDir,compiled=compiledDir;
const ledger=JSON.parse(fs.readFileSync(path.join(edits,'baseline-ledger.json'),'utf8'));
// 基準版は正本 game/map（provinces.png 全域1枚ほか）。読むのはそこから作った配信タイルなので、タイルが同じ正本から作られたことも確かめる。
const baseProvincesSha256=md.sourceSha256();
if(baseProvincesSha256!==ledger.sourceSha256)throw Error('正本 game/map が台帳と違う（土台を変えたら台帳と差分を見直す）');
const m=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8')),T=m.tile;
if(m.source?.sha256!==baseProvincesSha256)throw Error('配信タイルが正本と合わない。先に node tools/map/build-map-tiles.cjs');
// 正本の格子（差分の画素はここで決める）と、配信タイルの格子。タイルが円錐図法（manifest の projection.type が lcc）なら
// game/map/build/grid/grid.json を読んで写す。検査の固定具のように manifest が正本の格子そのものなら、そのまま（恒等）。
const TKP=require('../../game/map-projection.js'),lcc=m.projection?.type==='lcc';
const grid=lcc?md.grid.read():null,L=lcc?grid.source.legacy:m.projection,[OX,OY]=L.origin,S=L.stepUnits,mapRow=lcc?require('./grid-map.cjs')(grid):null;
if(lcc&&m.grid?.sha256!==grid.files['provinces.png'].sha256)throw Error('配信タイルが円錐図法の格子と合わない。先に node tools/map/build-map-tiles.cjs');
const defs=md.readDefinition().rows.filter(Boolean);
const byKey=new Map(defs.map(d=>[d.key,d])),byRGB=new Map(defs.map(d=>[d.rgb.join(','),d]));
const rgbOf=k=>{const d=byKey.get(k);if(!d)throw Error('未定義の区画 '+k);return d.rgb;};
// 差分の読み込みと検査
const applied=new Set(ledger.applied.map(a=>a.id)),list=[];
for(const f of fs.readdirSync(edits).filter(f=>f.endsWith('.json')&&f!=='baseline-ledger.json').sort()){
 const e=JSON.parse(fs.readFileSync(path.join(edits,f),'utf8'));
 if(e.layer!=='provinces'||e.baseRevision!==ledger.baselineCommit)throw Error('対象外の層か基準版: '+e.id);
 if(applied.has(e.id)||list.some(x=>x.id===e.id))throw Error('重複か適用済み: '+e.id);
 const a=e.validFrom,b=e.validUntil;if(!(a[0]*1e4+a[1]*100+a[2]<b[0]*1e4+b[1]*100+b[2]))throw Error('期間が逆: '+e.id);
 list.push({...e,file:f});}
const dnum=d=>d[0]*1e4+d[1]*100+d[2];
const bounds=[...new Map(list.flatMap(e=>[e.validFrom,e.validUntil]).map(d=>[dnum(d),d])).values()].sort((a,b)=>dnum(a)-dnum(b));
// 基準タイルの読み込み（RGB の Buffer）
const tileRow=new Map(m.tiles.map(t=>[t.col+','+t.row,t]));
const readTile=(sub,row)=>{const buf=fs.readFileSync(path.join(dir,sub,row.file));if(sha(buf)!==row.sha256)throw Error('基準タイルが manifest と違う: '+sub+'/'+row.file);const p=decodePNG(buf),rgb=Buffer.alloc(p.width*p.height*3);for(let i=0;i<p.width*p.height;i++){rgb[i*3]=p.data[i*4];rgb[i*3+1]=p.data[i*4+1];rgb[i*3+2]=p.data[i*4+2];}return {w:p.width,h:p.height,rgb};};
const blank=(w,h)=>{const rgb=Buffer.alloc(w*h*3),[r,g,b]=rgbOf('sea');for(let i=0;i<w*h;i++){rgb[i*3]=r;rgb[i*3+1]=g;rgb[i*3+2]=b;}return {w,h,rgb};};
// 面の判定（偶奇則）
const inside=(rings,x,y)=>{let c=false;for(const r of rings)for(let i=0,j=r.length-1;i<r.length;j=i++){const [ax,ay]=r[i],[bx,by]=r[j];if((ay>y)!==(by>y)&&x<ax+(bx-ax)*(y-ay)/(by-ay))c=!c;}return c;};
// 一つの差分が書く画素の一覧 [列,行,RGB,元の条件]
function pixelsOf(e){const p=e.payload,out=[];
 if(p.mask){const [c0,r0,w,h]=p.window,img=decodePNG(fs.readFileSync(path.join(edits,p.mask)));if(img.width!==w||img.height!==h)throw Error('型紙の大きさが窓と違う: '+e.id);
  if(p.maskSha256&&sha(fs.readFileSync(path.join(edits,p.mask)))!==p.maskSha256)throw Error('型紙のハッシュが違う: '+e.id);
  const rgbs=p.keys.map(rgbOf);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const o=(y*w+x)*4,v=img.data[o+1]<<8|img.data[o+2];if(!v)continue;if(v>rgbs.length)throw Error('型紙の値が keys の外: '+e.id);out.push([c0+x,r0+y,rgbs[v-1],p.from]);}}
 else{const g=JSON.parse(fs.readFileSync(path.join(edits,p.file),'utf8')).features[p.feature].geometry;if(g.type!=='Polygon')throw Error('多角形ではない: '+e.id);
  const rings=g.coordinates.map(r=>r.map(([lo,la])=>[(lo-L.LON0)*L.K*L.CX,(L.LAT0-la)*L.K]));// 正本の格子の平面（旧来の式。L は grid.json の source.legacy か固定具の manifest）
  const xs=rings[0].map(q=>q[0]),ys=rings[0].map(q=>q[1]);const c0=Math.floor((Math.min(...xs)-OX)/S),c1=Math.ceil((Math.max(...xs)-OX)/S),r0=Math.floor((Math.min(...ys)-OY)/S),r1=Math.ceil((Math.max(...ys)-OY)/S);
  const to=rgbOf(p.toKey);for(let r=r0;r<r1;r++)for(let c=c0;c<c1;c++)if(inside(rings,OX+(c+.5)*S,OY+(r+.5)*S))out.push([c,r,to,'key:'+p.fromKey]);}
 if(!out.length)throw Error('この縮尺で画素がない: '+e.id);return out;}
// 正本の格子の画素 [列,行,RGB,条件] を、配信タイルの格子の画素へ写す
function toGrid(src){if(!lcc)return src;const set=new Map(src.map(p=>[p[0]+','+p[1],p]));let c0=Infinity,r0=Infinity,c1=-Infinity,r1=-Infinity;for(const [c,r] of src){if(c<c0)c0=c;if(r<r0)r0=r;if(c>c1)c1=c;if(r>r1)r1=r;}
 // 正本の窓の四辺を円錐図法の平面へ写した外接長方形（画素の角）
 let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;const probe=(c,r)=>{const [x,y]=TKP.fromLegacy(OX+c*S,OY+r*S);if(x<x0)x0=x;if(y<y0)y0=y;if(x>x1)x1=x;if(y>y1)y1=y;};
 for(let c=c0;c<=c1+1;c++){probe(c,r0);probe(c,r1+1);}for(let r=r0;r<=r1+1;r++){probe(c0,r);probe(c1+1,r);}
 const [GX,GY]=grid.projection.origin,GS=grid.projection.stepUnits,gc0=Math.max(0,Math.floor((x0-GX)/GS)-1),gc1=Math.min(grid.width-1,Math.ceil((x1-GX)/GS)+1),gr0=Math.max(0,Math.floor((y0-GY)/GS)-1),gr1=Math.min(grid.height-1,Math.ceil((y1-GY)/GS)+1);
 const cols=new Int32Array(grid.width),rows=new Int32Array(grid.width),out=[];
 for(let r=gr0;r<=gr1;r++){mapRow(r,cols,rows);for(let c=gc0;c<=gc1;c++){const p=set.get(cols[c]+','+rows[c]);if(p)out.push([c,r,p[2],p[3]]);}}
 return out;}
const editPixels=new Map(list.map(e=>{const px=toGrid(pixelsOf(e));if(!px.length)throw Error('配信タイルの格子で画素がない: '+e.id);return [e.id,px];}));
// 書き出し
const crcT=new Int32Array(256).map((_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c;});
const crc=b=>{let c=-1;for(const x of b)c=crcT[(c^x)&255]^(c>>>8);return (c^-1)>>>0;};
const chunk=(t,d)=>{const l=Buffer.alloc(4);l.writeUInt32BE(d.length);const td=Buffer.concat([Buffer.from(t),d]),c=Buffer.alloc(4);c.writeUInt32BE(crc(td));return Buffer.concat([l,td,c]);};
const png=(w,h,rgb)=>{const raw=Buffer.alloc((w*3+1)*h);for(let y=0;y<h;y++)rgb.copy(raw,y*(w*3+1)+1,y*w*3,(y+1)*w*3);const ih=Buffer.alloc(13);ih.writeUInt32BE(w,0);ih.writeUInt32BE(h,4);ih[8]=8;ih[9]=2;return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ih),chunk('IDAT',zlib.deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);};
const ymd=d=>String(d[0]).padStart(4,'0')+String(d[1]).padStart(2,'0')+String(d[2]).padStart(2,'0');
const made=[],report=[];
for(let i=0;i+1<bounds.length;i++){const from=bounds[i],to=bounds[i+1];const act=list.filter(e=>dnum(e.validFrom)<=dnum(from)&&dnum(from)<dnum(e.validUntil));if(!act.length)continue;
 const id=ymd(from)+'-'+ymd(to),period=[from,to],changed=new Map(),writes=new Map(),counts={};
 for(const e of act){counts[e.id]=0;for(const [c,r,rgb,cond] of editPixels.get(e.id)){const k=c+','+r;if(writes.has(k))throw Error(`差分が重なる (${k}): ${writes.get(k)} と ${e.id}`);
   const tk=Math.floor(c/T)+','+Math.floor(r/T);if(!changed.has(tk)){const row=tileRow.get(tk);changed.set(tk,row?readTile('provinces',row):blank(Math.min(T,m.width-Math.floor(c/T)*T),Math.min(T,m.height-Math.floor(r/T)*T)));}
   const t=changed.get(tk),o=((r%T)*t.w+(c%T))*3,d=byRGB.get(t.rgb[o]+','+t.rgb[o+1]+','+t.rgb[o+2]);if(!d)throw Error('基準の色が定義にない ('+k+')');
   const ok=cond==='land'?d.kind==='land':cond==='sea'?d.kind==='sea':cond==='key:'+d.key;if(!ok)throw Error(`元の値が違う (${k}: ${d.key}): ${e.id}`);
   t.rgb[o]=rgb[0];t.rgb[o+1]=rgb[1];t.rgb[o+2]=rgb[2];writes.set(k,e.id);counts[e.id]++;}}
 const levels=[{factor:1,dir:'provinces',tiles:changed}];
 for(const L of m.levels||[]){const f=L.factor,orig=new Map(L.tiles.map(t=>[t.col+','+t.row,t])),rep=new Map();
  for(const k of writes.keys()){const [c,r]=k.split(',').map(Number),x=Math.floor(c/f),y=Math.floor(r/f);if(c!==Math.min(m.width-1,x*f+(f>>1))||r!==Math.min(m.height-1,y*f+(f>>1)))continue;
   const tk=Math.floor(x/T)+','+Math.floor(y/T);if(!rep.has(tk)){const row=orig.get(tk);rep.set(tk,row?readTile(L.dir,row):blank(Math.min(T,L.width-Math.floor(x/T)*T),Math.min(T,L.height-Math.floor(y/T)*T)));}
   const src=changed.get(Math.floor(c/T)+','+Math.floor(r/T)),so=((r%T)*src.w+(c%T))*3,t=rep.get(tk),o=((y%T)*t.w+(x%T))*3;t.rgb[o]=src.rgb[so];t.rgb[o+1]=src.rgb[so+1];t.rgb[o+2]=src.rgb[so+2];}
  levels.push({factor:f,dir:L.dir,tiles:rep});}
 const files=[];const tiles=[];
 for(const L of levels){if(!L.tiles.size)continue;
  for(const [tk,t] of [...L.tiles].sort()){const [col,row]=tk.split(',').map(Number),file=`${L.dir}/${col}-${row}@${id}.png`,buf=png(t.w,t.h,t.rgb);files.push([file,buf]);tiles.push({file,factor:L.factor,col,row,period,width:t.w,height:t.h,sha256:sha(buf)});}}
 const edIds=Object.keys(counts).sort();
 files.push(['manifest.json',JSON.stringify({generated:'tools/map/build-province-edits.cjs',baseRevision:ledger.baselineCommit,baseProvincesSha256,date:`${from[0]}-${String(from[1]).padStart(2,'0')}-${String(from[2]).padStart(2,'0')}`,
  versions:[{id,period,edits:edIds,sha256:sha(JSON.stringify(tiles))}],editPixels:counts,tiles},null,2)+'\n']);
 made.push({id,files});report.push({id,edits:counts,tiles:tiles.length});}
// 全部の版がそろってから書く：一時置き場に書き、置き場ごと入れ替える（今回作らなかった古い版は残らない）
const stage=compiled+'.staging',old=compiled+'.old';fs.rmSync(stage,{recursive:true,force:true});fs.rmSync(old,{recursive:true,force:true});fs.mkdirSync(stage,{recursive:true});
for(const v of made)for(const [file,body] of v.files){const p=path.join(stage,v.id,file);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,body);}
if(fs.existsSync(compiled))fs.renameSync(compiled,old);fs.renameSync(stage,compiled);fs.rmSync(old,{recursive:true,force:true});
return report;}
module.exports={build};
if(require.main===module)console.log(JSON.stringify(build(),null,1));
