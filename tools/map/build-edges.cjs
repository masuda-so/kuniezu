/* 領域画像から、隣り合う領域どうしの共有辺（境界線）を起こす。Paradox 方式で「塗りの画像が正本、線は生成物」。
   各辺は左右の領域ID（小さい方 a・大きい方 b）と種別（coast＝海と陸、lake＝湖と陸、region＝陸どうし）を持つ。
   画素の角を結ぶ階段の線を、段ごとの許容誤差で間引く（100m：0.6画素、400m・800m：0.8画素）。
   出力：game/map/edges-<段>/<列>-<行>.json（タイルごと。タイルの外へ出る線はタイルの縁で切る）と game/map/edges.json（一覧）。
   実行：node --max-old-space-size=4096 tools/map/build-edges.cjs */
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),dir=path.join(root,'game/map');
const m=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
const MD=require('./map-data.cjs'),DEF=MD.readDefinition(),defs=DEF.rows,SEA=DEF.byKey.get('sea').id;// 正本 game/map_data の definition.csv・default.map（id は1から、海は SEA）
const byColor=new Map(defs.filter(Boolean).map(d=>[d.rgb[0]<<16|d.rgb[1]<<8|d.rgb[2],d.id]));
function decode(file){const buf=fs.readFileSync(file);let i=8,w=0,h=0;const parts=[];while(i<buf.length){const len=buf.readUInt32BE(i),type=buf.toString('ascii',i+4,i+8),data=buf.subarray(i+8,i+8+len);if(type==='IHDR'){w=data.readUInt32BE(0);h=data.readUInt32BE(4);}else if(type==='IDAT')parts.push(data);i+=12+len;}
 // PNG の行ごとのフィルタ（0〜4）を戻す。RGB 8bit（1画素3バイト）だけを扱う。
 const raw=zlib.inflateSync(Buffer.concat(parts)),bpp=3,stride=w*bpp,img=Buffer.alloc(stride*h),ids=new Uint16Array(w*h);
 for(let y=0;y<h;y++){const ft=raw[y*(stride+1)],src=y*(stride+1)+1,o=y*stride;for(let i=0;i<stride;i++){const x=raw[src+i],a=i>=bpp?img[o+i-bpp]:0,b=y?img[o-stride+i]:0,c=y&&i>=bpp?img[o-stride+i-bpp]:0;let v;
  if(ft===0)v=x;else if(ft===1)v=x+a;else if(ft===2)v=x+b;else if(ft===3)v=x+((a+b)>>1);else if(ft===4){const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);v=x+(pa<=pb&&pa<=pc?a:pb<=pc?b:c);}else throw Error('PNG filter '+ft+': '+file);img[o+i]=v&255;}}
 for(let k=0;k<w*h;k++){const v=byColor.get(img[k*3]<<16|img[k*3+1]<<8|img[k*3+2]);if(v===undefined)throw Error('unknown colour '+file);ids[k]=v;}return {w,h,ids};}
const kindOf=(a,b)=>{const ka=defs[a]?.kind,kb=defs[b]?.kind;/* 郡の線では a・b が国の番号なので定義に無い */if(ka==='sea'||kb==='sea')return 'coast';if(ka==='lake'||kb==='lake')return 'lake';return 'region';};
function simplify(pts,tol){if(pts.length<=4)return pts;const n=pts.length/2,keep=new Uint8Array(n);keep[0]=keep[n-1]=1;const st=[[0,n-1]];
 while(st.length){const [a,b]=st.pop();const ax=pts[a*2],ay=pts[a*2+1],bx=pts[b*2],by=pts[b*2+1],dx=bx-ax,dy=by-ay,L=dx*dx+dy*dy;let best=-1,bi=-1;
  for(let i=a+1;i<b;i++){const px=pts[i*2]-ax,py=pts[i*2+1]-ay,t=L?Math.max(0,Math.min(1,(px*dx+py*dy)/L)):0,d=Math.hypot(px-t*dx,py-t*dy);if(d>best){best=d;bi=i;}}
  if(best>tol){keep[bi]=1;st.push([a,bi],[bi,b]);}}const o=[];for(let i=0;i<n;i++)if(keep[i])o.push(pts[i*2],pts[i*2+1]);return o;}
const levels=[{factor:1,dir:'provinces',tiles:m.tiles,tol:.6},...m.levels.map(l=>({factor:l.factor,dir:l.dir,tiles:l.tiles,tol:.8}))];
const index={generated:'tools/map/build-edges.cjs',gridSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,'manifest.json'))).digest('hex'),
 note:'領域画像の共有辺。a<b の領域ID、kind は coast/lake/region。座標は地図平面。塗りの画像と同じ版・段から作る。',levels:[]};
// 年代別の差分（game/map/edits/compiled/<版>/manifest.json）。差し替えるタイルとその左・上の隣（縁の辺がそのタイルに掛かる）の辺を、版ごとに作り直す。
// 土台の領域画像が変わったら差分は作り直しが要る。差分の manifest の baseProvincesSha256（正本 game/map_data の確認値）が今の土台と一致する版だけ使う。
const baseSha=MD.sourceSha256();
const compiledRoot=path.join(dir,'edits/compiled'),allVersions=fs.existsSync(compiledRoot)?fs.readdirSync(compiledRoot).filter(v=>fs.existsSync(path.join(compiledRoot,v,'manifest.json'))).map(v=>({id:v,m:JSON.parse(fs.readFileSync(path.join(compiledRoot,v,'manifest.json'),'utf8'))})):[];
const versions=allVersions.filter(v=>v.m.baseProvincesSha256===baseSha),staleVersions=allVersions.filter(v=>v.m.baseProvincesSha256!==baseSha).map(v=>v.id);
if(staleVersions.length)console.log('stale versions skipped (rebuild against baseProvincesSha256='+baseSha+'):',staleVersions.join(','));
function edgesOfTile(L,get,c,r,none=SEA){// none：タイルの外・地図の外の値（領域は海、郡は0＝郡なし）
 const step=m.projection.stepUnits*L.factor,[X0,Y0]=m.projection.origin,T=m.tile;const me=get(c,r);if(!me)return [];const {w,h,ids}=me,right=get(c+1,r),down=get(c,r+1);
  const at=(x,y)=>{if(x<w&&y<h)return ids[y*w+x];if(x>=w&&y<h)return right?right.ids[y*right.w+(x-w)]:none;if(y>=h&&x<w)return down?down.ids[(y-h)*down.w+x]:none;return none;};
  const leftNone=!get(c-1,r),upNone=!get(c,r-1);const segs=new Map();
  const add=(a,b,x0,y0,x1,y1)=>{if(a===b)return;const lo=Math.min(a,b),hi=Math.max(a,b),k=lo+':'+hi;let s=segs.get(k);if(!s){s=[];segs.set(k,s);}s.push(x0,y0,x1,y1);};
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const v=ids[y*w+x];add(v,at(x+1,y),x+1,y,x+1,y+1);add(v,at(x,y+1),x,y+1,x+1,y+1);if(x===0&&leftNone)add(v,none,0,y,0,y+1);if(y===0&&upNone)add(v,none,x,0,x+1,0);}
  const items=[];
  for(const [k,s] of segs){const [a,b]=k.split(':').map(Number);
   const adj=new Map(),key=(x,y)=>x*65536+y,link=(p,i)=>{let l=adj.get(p);if(!l){l=[];adj.set(p,l);}l.push(i);};
   const n=s.length/4;for(let i=0;i<n;i++){link(key(s[i*4],s[i*4+1]),i);link(key(s[i*4+2],s[i*4+3]),i);}
   const used=new Uint8Array(n),lines=[];
   const walk=(startKey)=>{const pts=[];let cur=startKey;pts.push(Math.floor(cur/65536),cur%65536);for(;;){const l=adj.get(cur);let nx=-1;for(const i of l)if(!used[i]){nx=i;break;}if(nx<0)break;used[nx]=1;const p=key(s[nx*4],s[nx*4+1]),q=key(s[nx*4+2],s[nx*4+3]);cur=p===cur?q:p;pts.push(Math.floor(cur/65536),cur%65536);}return pts;};
   for(const [p,l] of adj)if(l.length===1&&!used[l[0]])lines.push(walk(p));
   for(let i=0;i<n;i++)if(!used[i])lines.push(walk(key(s[i*4],s[i*4+1])));
   const geo=lines.filter(p=>p.length>=4).map(p=>{const q=simplify(p,L.tol);const o=[];for(let j=0;j<q.length;j+=2)o.push(+(X0+(c*T+q[j])*step).toFixed(2),+(Y0+(r*T+q[j+1])*step).toFixed(2));return o;});
   if(geo.length)items.push({a,b,kind:kindOf(a,b),lines:geo});}
  return items;}
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
index.versions=[];
for(const L of levels){const byPos=new Map(L.tiles.map(t=>[t.col+','+t.row,path.join(dir,L.dir,t.file)]));
 const mk=(pos)=>{const cache=new Map();return (c,r)=>{const k=c+','+r;if(!cache.has(k)){const f=pos.get(k);cache.set(k,f?decode(f):null);if(cache.size>8)cache.delete(cache.keys().next().value);}return cache.get(k);};};
 const get=mk(byPos);const outDir=path.join(dir,'edges-'+L.factor);fs.rmSync(outDir,{recursive:true,force:true});fs.mkdirSync(outDir,{recursive:true});const list=[];
 const cols=Math.max(...L.tiles.map(t=>t.col))+1,rows=Math.max(...L.tiles.map(t=>t.row))+1;
 for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const items=edgesOfTile(L,get,c,r);if(!items.length)continue;const file=`${c}-${r}.json`,body=JSON.stringify(items);fs.writeFileSync(path.join(outDir,file),body);list.push({file,col:c,row:r,sha256:sha(body)});}
 index.levels.push({factor:L.factor,dir:'edges-'+L.factor,tiles:list});console.log('level',L.factor,'tiles',list.length);
 for(const v of versions){const vt=v.m.tiles.filter(t=>t.factor===L.factor);if(!vt.length)continue;const pos=new Map(byPos);for(const t of vt)pos.set(t.col+','+t.row,path.join(compiledRoot,v.id,t.file));const vget=mk(pos);
  const touched=new Set();for(const t of vt){touched.add(t.col+','+t.row);touched.add((t.col-1)+','+t.row);touched.add(t.col+','+(t.row-1));}
  const vdir=path.join(dir,'edges-'+L.factor,'@'+v.id);fs.mkdirSync(vdir,{recursive:true});
  for(const k of touched){const [c,r]=k.split(',').map(Number);if(c<0||r<0)continue;const items=edgesOfTile(L,vget,c,r),file=`@${v.id}/${c}-${r}.json`,body=JSON.stringify(items);fs.writeFileSync(path.join(dir,'edges-'+L.factor,file),body);
   index.versions.push({id:v.id,period:v.m.versions.find(x=>x.id===v.id)?.period||v.m.tiles[0].period,factor:L.factor,col:c,row:r,file,sha256:sha(body)});}}
}
// 国・道の境界線：郡画像（data/map/gun.png 全域1枚、日本は CODH の旧国、朝鮮は1910年の道を八道へ戻したもの）の国が変わる所に引く（kind:'kuni'）。
// 陸奥・出羽の明治の分割は戻す。海との境は引かない（海岸は coast で引く）。郡画像は年代の版で変わらないので、版の辺のファイルにも同じ線を足す。
const gunDir=path.join(MD.root,'data/map'),gunRows=fs.readFileSync(path.join(gunDir,'gun.csv'),'utf8').trim().split('\n').slice(1).map(l=>l.split(';'));
const normK=k=>['磐城','岩代','陸前','陸中','陸奥'].includes(k)?'陸奥':['羽前','羽後'].includes(k)?'出羽':k;const kuniNames=[...new Set(gunRows.map(r=>normK(r[4])))],kuniOf=new Uint16Array(gunRows.length+2);for(const r of gunRows)kuniOf[+r[0]]=kuniNames.indexOf(normK(r[4]))+1;
// 郡画像 data/map/gun.png（全域1枚、G が上位・B が下位の郡番号）を国の番号の配列にし、段ごとのタイルは画素中心の最近傍で切り出す。
const GW=m.width,GH=m.height,kuniPx=new Uint8Array(GW*GH);
let kuniLines=0;
(async()=>{await require('./png-big.cjs').readRGB(path.join(gunDir,'gun.png'),(y,row)=>{const o=y*GW;for(let x=0;x<GW;x++)kuniPx[o+x]=kuniOf[row[x*3+1]<<8|row[x*3+2]];});
const gunTile=(f,c,r)=>{const lw=Math.ceil(GW/f),lh=Math.ceil(GH/f),T=m.tile,c0=c*T,r0=r*T;if(c<0||r<0||c0>=lw||r0>=lh)return null;const w=Math.min(T,lw-c0),h=Math.min(T,lh-r0),ids=new Uint16Array(w*h);let any=false;
 for(let y=0;y<h;y++){const sy=f===1?r0+y:Math.min(GH-1,(r0+y)*f+(f>>1));for(let x=0;x<w;x++){const sx=f===1?c0+x:Math.min(GW-1,(c0+x)*f+(f>>1)),v=kuniPx[sy*GW+sx];if(v)any=true;ids[y*w+x]=v;}}return any?{w,h,ids}:null;};
for(const L of levels){const cache=new Map(),get=(c,r)=>{const k=c+','+r;if(!cache.has(k)){cache.set(k,gunTile(L.factor,c,r));if(cache.size>8)cache.delete(cache.keys().next().value);}return cache.get(k);};
 const lvl=index.levels.find(x=>x.factor===L.factor),edgeDir=path.join(dir,'edges-'+L.factor);
 const lw=Math.ceil(GW/L.factor),lh=Math.ceil(GH/L.factor);for(let tr=0;tr*m.tile<lh;tr++)for(let tc=0;tc*m.tile<lw;tc++){const t={col:tc,row:tr};if(!get(tc,tr))continue;const items=edgesOfTile(L,get,t.col,t.row,0).filter(it=>it.a&&it.b).map(it=>({a:kuniNames[it.a-1],b:kuniNames[it.b-1],kind:'kuni',lines:it.lines}));if(!items.length)continue;kuniLines+=items.length;
  const targets=[`${t.col}-${t.row}.json`,...index.versions.filter(v=>v.factor===L.factor&&v.col===t.col&&v.row===t.row).map(v=>v.file)];
  for(const file of targets){const fp=path.join(edgeDir,file);const cur=fs.existsSync(fp)?JSON.parse(fs.readFileSync(fp,'utf8')):[];const body=JSON.stringify(cur.concat(items));fs.writeFileSync(fp,body);
   const sh=sha(body);if(file.startsWith('@')){const v=index.versions.find(v=>v.factor===L.factor&&v.file===file);if(v)v.sha256=sh;}else{const e=lvl.tiles.find(x=>x.file===file);if(e)e.sha256=sh;else lvl.tiles.push({file,col:t.col,row:t.row,sha256:sh});}}}}
console.log('kuni edge groups',kuniLines);
// 実行時が読む版の一覧（塗り・当たり判定・境界線が同じ版を使うため一つにまとめる）
const ver={generated:'tools/map/build-edges.cjs',baseProvincesSha256:baseSha,staleVersions,note:'年代別の領域タイルの差し替え。同じ段・同じ列行の基準タイルの上に重ねず置き換える。期間は半開区間。',versions:versions.map(v=>({id:v.id,period:v.m.versions.find(x=>x.id===v.id)?.period,edits:v.m.versions.find(x=>x.id===v.id)?.edits,tiles:v.m.tiles.map(t=>({factor:t.factor,col:t.col,row:t.row,file:'edits/compiled/'+v.id+'/'+t.file,sha256:t.sha256}))}))};
fs.writeFileSync(path.join(dir,'versions.json'),JSON.stringify(ver,null,1));
fs.writeFileSync(path.join(dir,'edges.json'),JSON.stringify(index,null,1));
})().catch(e=>{console.error(e);process.exit(1);});
