/* 城の領域と国（令制国・朝鮮の道）の対応を全域で点検する。
   国の範囲：国境線（TKGEO.pborders）を壁にして陸を4近傍で塗り分け、国名の位置（TKGEO.plabels）で名前を付ける。
   調べること：城の領域が自分の国の外へどれだけ広がるか、一つの国に他国の城の領域がどれだけ入るか、国名の付かない陸。
   出力：data/audits/raster-province-consistency.json   実行：node --max-old-space-size=6000 tools/map/audit-province-consistency.cjs */
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const root=path.resolve(__dirname,'../..'),dir=path.join(root,'game/map');
const {G,TKGEO:T}=require(path.join(root,'tools/checks/history-focus.cjs')).model();G.newGame('s1560','oda');
const m=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
const defs=require(path.join(root,'tools/map/map-data.cjs')).readDefinition().rows;// 正本 game/map_data（id は1から、kind は default.map）
const byColor=new Map(defs.filter(Boolean).map(d=>[d.rgb[0]<<16|d.rgb[1]<<8|d.rgb[2],d.id]));
const W=m.width,H=m.height,N=W*H,id=new Uint16Array(N).fill(defs.find(d=>d&&d.key==='sea').id);
function decode(buf){let i=8,w=0,h=0;const parts=[];while(i<buf.length){const len=buf.readUInt32BE(i),type=buf.toString('ascii',i+4,i+8),data=buf.subarray(i+8,i+8+len);if(type==='IHDR'){w=data.readUInt32BE(0);h=data.readUInt32BE(4);}else if(type==='IDAT')parts.push(data);i+=12+len;}const raw=zlib.inflateSync(Buffer.concat(parts)),out=Buffer.alloc(w*h*3);for(let y=0;y<h;y++)raw.copy(out,y*w*3,y*(w*3+1)+1,(y+1)*(w*3+1));return {w,h,rgb:out};}
for(const t of m.tiles){const {w,h,rgb}=decode(fs.readFileSync(path.join(dir,'provinces',t.file)));for(let y=0;y<h;y++)for(let x=0;x<w;x++){const o=(y*w+x)*3;id[(t.row*m.tile+y)*W+t.col*m.tile+x]=byColor.get(rgb[o]<<16|rgb[o+1]<<8|rgb[o+2]);}}
const S=m.projection.stepUnits,[X0,Y0]=m.projection.origin,cr=(x,y)=>[Math.floor((x-X0)/S),Math.floor((y-Y0)/S)];
// 国境線を壁として描く（太さ1画素の線＋4近傍で漏れないよう斜めの段も埋める）
const wall=new Uint8Array(N);
for(const line of T.pborders){for(let i=2;i<line.length;i+=2){let [a,b]=cr(line[i-2],line[i-1]);const [c,d]=cr(line[i],line[i+1]);const n=Math.max(Math.abs(c-a),Math.abs(d-b),1);let pa=a,pb=b;for(let s=0;s<=n;s++){const x=Math.round(a+(c-a)*s/n),y=Math.round(b+(d-b)*s/n);if(x>=0&&y>=0&&x<W&&y<H){wall[y*W+x]=1;if(x!==pa&&y!==pb&&pa>=0&&pa<W)wall[y*W+pa]=1;}pa=x;pb=y;}}}
const isLand=k=>defs[id[k]]?.kind==='land';
// 陸の連結成分（壁で区切る）
const comp=new Int32Array(N).fill(-1),stack=new Int32Array(N);const comps=[];
for(let k=0;k<N;k++){if(comp[k]>=0||wall[k]||!isLand(k))continue;const c=comps.length;let sp=0,size=0;stack[sp++]=k;comp[k]=c;while(sp){const q=stack[--sp];size++;const x=q%W;for(const n of [x>0?q-1:-1,x<W-1?q+1:-1,q-W,q+W])if(n>=0&&n<N&&comp[n]<0&&!wall[n]&&isLand(n)){comp[n]=c;stack[sp++]=n;}}comps.push({size,prov:null});}
// 国名の位置で名前を付ける（壁の上にある時は近くの画素を探す）
for(const L of T.plabels){const [c,r]=cr(L.x,L.y);let found=-1;for(let rad=0;rad<30&&found<0;rad++)for(let dy=-rad;dy<=rad&&found<0;dy++)for(let dx=-rad;dx<=rad;dx++){const k=(r+dy)*W+c+dx;if(k>=0&&k<N&&comp[k]>=0){found=comp[k];break;}}if(found>=0){(comps[found].labels=comps[found].labels||[]).push(L.n);if(!comps[found].prov)comps[found].prov=L.n;}}
const merged=comps.filter(c=>c.labels?.length>1).map(c=>c.labels);
// 城の位置でも名前を付ける（国名の点が無い小さい成分用。城の国 C.prov）
for(const C of G.CL){const [c,r]=cr(C.x,C.y);const k=r*W+c;if(k>=0&&k<N&&comp[k]>=0&&!comps[comp[k]].prov&&C.prov)comps[comp[k]].prov=C.prov;}
const provOf=k=>comp[k]>=0?comps[comp[k]].prov:null;
// 集計
const regionProv=new Map(),provRegion=new Map();let unnamed=0;
for(let k=0;k<N;k++){if(!isLand(k)||wall[k])continue;const p=provOf(k);if(!p){unnamed++;continue;}const key=defs[id[k]].key;if(!regionProv.has(key))regionProv.set(key,new Map());regionProv.get(key).set(p,(regionProv.get(key).get(p)||0)+1);if(!provRegion.has(p))provRegion.set(p,new Map());provRegion.get(p).set(key,(provRegion.get(p).get(key)||0)+1);}
const castleProv=Object.fromEntries(G.CL.map(C=>['castle:'+C.id,C.prov]));
const regions=[];for(const [key,mp] of regionProv){if(!key.startsWith('castle:'))continue;const total=[...mp.values()].reduce((a,b)=>a+b,0),own=castleProv[key],ownShare=(mp.get(own)||0)/total,others=[...mp].filter(([p])=>p!==own).map(([p,n])=>({prov:p,km2:Math.round(n*.01),share:+(n/total).toFixed(3)})).filter(o=>o.share>=.02).sort((a,b)=>b.share-a.share);regions.push({key,ownProvince:own,km2:Math.round(total*.01),ownShare:+ownShare.toFixed(3),spillsInto:others});}
const provinces=[...provRegion].map(([p,mp])=>{const total=[...mp.values()].reduce((a,b)=>a+b,0);const parts=[...mp].map(([k,n])=>({key:k,ownProvince:castleProv[k]||null,share:+(n/total).toFixed(3)})).sort((a,b)=>b.share-a.share);return {province:p,km2:Math.round(total*.01),regions:parts.filter(x=>x.share>=.02).length,foreignShare:+parts.filter(x=>x.key.startsWith('castle:')&&x.ownProvince!==p).reduce((s,x)=>s+x.share,0).toFixed(3),unassignedShare:+parts.filter(x=>!x.key.startsWith('castle:')).reduce((s,x)=>s+x.share,0).toFixed(3),parts:parts.slice(0,6)};});
const crossing=regions.filter(r=>r.ownShare<.9).sort((a,b)=>a.ownShare-b.ownShare);
const foreign=provinces.filter(p=>p.foreignShare>=.1).sort((a,b)=>b.foreignShare-a.foreignShare);
const noCastle=provinces.filter(p=>!p.parts.some(x=>x.ownProvince===p.province));
// 国境線に沿った点検：線の両側（法線方向に±4画素）が同じ城の領域なら、その領域は国境をまたいでいる。
const straddle=new Map();let sampled=0;const koreaLines=T.pborders.filter(l=>l[0]<500).length;
for(const line of T.pborders)for(let i=2;i<line.length;i+=2){const ax=line[i-2],ay=line[i-1],bx=line[i],by=line[i+1],len=Math.hypot(bx-ax,by-ay);if(len<1e-6)continue;const nx=-(by-ay)/len,ny=(bx-ax)/len,steps=Math.max(1,Math.round(len/S));
 for(let s2=0;s2<steps;s2++){const x=ax+(bx-ax)*(s2+.5)/steps,y=ay+(by-ay)*(s2+.5)/steps,[c1,r1]=cr(x+nx*4*S,y+ny*4*S),[c2,r2]=cr(x-nx*4*S,y-ny*4*S);if(c1<0||c2<0||r1<0||r2<0||c1>=W||c2>=W||r1>=H||r2>=H)continue;const a=id[r1*W+c1],b=id[r2*W+c2];if(!a||!b)continue;sampled++;if(a===b&&defs[a].key.startsWith('castle:'))straddle.set(defs[a].key,(straddle.get(defs[a].key)||0)+1);}}
const straddling=[...straddle].map(([k,n])=>({key:k,ownProvince:castleProv[k],borderKm:+(n*.1).toFixed(1)})).sort((a,b)=>b.borderKm-a.borderKm);
const report={koreaBorderLines:koreaLines,mergedLabelComponents:merged,borderSamplesKm:Math.round(sampled*.1),regionsStraddlingBorders:straddling,scope:'城の領域（領域画像）と国・道（国境線で塗り分け）の対応。国境線は既存データで、史料の郡境ではない。',namedComponents:comps.filter(c=>c.prov).length,components:comps.length,unnamedLandKm2:Math.round(unnamed*.01),regionsCrossingProvince:crossing.length,regionsTotal:regions.length,crossing,provincesWithForeignRegions:foreign,provincesWithoutOwnCastle:noCastle.map(p=>({province:p.province,km2:p.km2,parts:p.parts.slice(0,3)})),provinces};
fs.writeFileSync(path.join(root,'data/audits/raster-province-consistency.json'),JSON.stringify(report,null,1));
console.log('merged',JSON.stringify(merged));console.log('koreaLines',koreaLines);console.log('straddling',JSON.stringify(straddling.slice(0,30)));console.log(JSON.stringify({regions:regions.length,crossing:crossing.length,foreign:foreign.length,noCastle:noCastle.length,unnamedLandKm2:report.unnamedLandKm2,provinces:provinces.length}));
console.log('crossing',JSON.stringify(crossing.slice(0,25).map(r=>[r.key,r.ownProvince,r.ownShare,r.spillsInto.slice(0,2).map(o=>o.prov+':'+o.share)])));
console.log('foreign',JSON.stringify(foreign.slice(0,20).map(p=>[p.province,p.foreignShare,p.parts.slice(0,3).map(x=>x.key+':'+x.share)])));
console.log('noCastle',JSON.stringify(noCastle.map(p=>[p.province,p.km2,p.parts.slice(0,2).map(x=>x.key+':'+x.share)])));
