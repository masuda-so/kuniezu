/* 領域画像の総点検。game/map の 100m タイルを読み戻し、次を調べて data/audits/raster-provinces-audit.json に書く。
   1) 城の位置（G.C の座標）の画素が、その城の領域か。違えば何の領域の上か。
   2) 領域ごとの連結成分（4近傍）。本体から離れた飛び地の数・大きさ・位置。
   3) 線のデータ（TKGEO.terr の多角形）の面積と、画像の画素数の差。
   実行：node --max-old-space-size=4096 tools/map/audit-provinces.cjs */
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const root=path.resolve(__dirname,'../..'),dir=path.join(root,'game/map/build');
const {G,TKGEO:T}=require(path.join(root,'tools/checks/history-focus.cjs')).model();G.newGame('s1560','oda');
const m=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
const defs=require(path.join(root,'tools/map/map-data.cjs')).readDefinition().rows;// 正本 game/map（id は1から、kind は default.map）
const byColor=new Map(defs.filter(Boolean).map(d=>[d.rgb[0]<<16|d.rgb[1]<<8|d.rgb[2],d.id]));
const W=m.width,H=m.height,N=W*H,id=new Uint16Array(N).fill(defs.find(d=>d&&d.key==='sea').id);
function decode(buf){let i=8,w=0,h=0;const parts=[];while(i<buf.length){const len=buf.readUInt32BE(i),type=buf.toString('ascii',i+4,i+8),data=buf.subarray(i+8,i+8+len);if(type==='IHDR'){w=data.readUInt32BE(0);h=data.readUInt32BE(4);}else if(type==='IDAT')parts.push(data);i+=12+len;}
 const raw=zlib.inflateSync(Buffer.concat(parts)),out=Buffer.alloc(w*h*3);for(let y=0;y<h;y++){if(raw[y*(w*3+1)]!==0)throw Error('filter');raw.copy(out,y*w*3,y*(w*3+1)+1,(y+1)*(w*3+1));}return {w,h,rgb:out};}
for(const t of m.tiles){const {w,h,rgb}=decode(fs.readFileSync(path.join(dir,'provinces',t.file)));for(let y=0;y<h;y++)for(let x=0;x<w;x++){const o=(y*w+x)*3,v=byColor.get(rgb[o]<<16|rgb[o+1]<<8|rgb[o+2]);if(v===undefined)throw Error('unknown colour in '+t.file);id[(t.row*m.tile+y)*W+t.col*m.tile+x]=v;}}
const S=m.projection.stepUnits,[X0,Y0]=m.projection.origin,px=(x,y)=>[Math.floor((x-X0)/S),Math.floor((y-Y0)/S)];
const toLonLat=(c,r)=>{const x=X0+(c+.5)*S,y=Y0+(r+.5)*S;return [+(x/T.K/T.CX+T.LON0).toFixed(3),+(T.LAT0-y/T.K).toFixed(3)];};
// 1) 城の位置
const castleMismatch=[];for(const C of G.CL){const [c,r]=px(C.x,C.y);if(c<0||r<0||c>=W||r>=H)continue;const v=defs[id[r*W+c]];if(v.key!=='castle:'+C.id&&T.terr[C.id])castleMismatch.push({castle:C.id,name:C.n1||C.n||'',at:toLonLat(c,r),pixelIs:v.key});}
// 2) 連結成分
const seen=new Uint8Array(N),comps=new Map(),stack=new Int32Array(N);
for(let k=0;k<N;k++){const v=id[k];if(defs[v].key==='sea'||defs[v].key==='unassigned'||seen[k])continue;let sp=0,size=0,sx=0,sy=0;stack[sp++]=k;seen[k]=1;while(sp){const q=stack[--sp];size++;sx+=q%W;sy+=Math.floor(q/W);const x=q%W;for(const n of [x>0?q-1:-1,x<W-1?q+1:-1,q-W,q+W])if(n>=0&&n<N&&!seen[n]&&id[n]===v){seen[n]=1;stack[sp++]=n;}}
 if(!comps.has(v))comps.set(v,[]);comps.get(v).push({size,cx:sx/size,cy:sy/size});}
const fragments=[];for(const [v,list] of comps){list.sort((a,b)=>b.size-a.size);const main=list[0];for(const f of list.slice(1)){const km=Math.hypot(f.cx-main.cx,f.cy-main.cy)*.1;if(f.size>=50)fragments.push({key:defs[v].key,pixels:f.size,km2:+(f.size*.01).toFixed(1),distanceKm:+km.toFixed(1),at:toLonLat(Math.round(f.cx),Math.round(f.cy)),mainPixels:main.size});}}
fragments.sort((a,b)=>b.pixels-a.pixels);
// 3) 面積の差
const area=rings=>rings.reduce((n,r,i)=>{let s=0;for(let j=0;j<r.length;j+=2){const k=(j+2)%r.length;s+=r[j]*r[k+1]-r[k]*r[j+1];}return n+Math.abs(s)/2*(i?-1:1);},0);
const areaDiff=[];const pixelsOf=new Map(JSON.parse(fs.readFileSync(path.join(root,'data/audits/raster-province-pixels.json'),'utf8')).provinces.map(p=>[p.key,p.pixels]));
for(const d of defs.filter(d=>d&&d.key.startsWith('castle:'))){const polys=T.terr[d.key.slice(7)];if(!polys)continue;const vec=polys.reduce((n,p)=>n+area(p),0)/(S*S);if(vec<1)continue;const ratio=pixelsOf.get(d.key)/vec;if(ratio<.85||ratio>1.15)areaDiff.push({key:d.key,vectorPixels:Math.round(vec),rasterPixels:pixelsOf.get(d.key),ratio:+ratio.toFixed(2)});}
const report={scope:'領域画像（段階1・100m）の総点検。城の位置・飛び地・線データとの面積差。',castles:G.CL.length,castleMismatch,fragmentsOver50px:fragments.length,fragments:fragments.slice(0,80),areaDiff};
fs.writeFileSync(path.join(root,'data/audits/raster-provinces-audit.json'),JSON.stringify(report,null,1));
console.log(JSON.stringify({castleMismatch:castleMismatch.length,fragments:fragments.length,areaDiff:areaDiff.length}));
console.log('mismatch',JSON.stringify(castleMismatch.slice(0,20)));console.log('fragments',JSON.stringify(fragments.slice(0,15)));console.log('area',JSON.stringify(areaDiff.slice(0,15)));
