/* 河川の正本 game/map/physical/rivers.png（全域1枚、1画素幅の中心線。色は rivers.json の codes でその画素が属する河川の組）から、
   Web 配信用の線 game/map/build/rivers-lines.json を作る。画素の中心を河川ごとに辿って折れ線にし、0.5画素の許容で間引き、点を表示の平面（円錐図法、game/map-projection.js）へ写す。
   斜めのつながりは、共通の上下左右の画素で既につながっている時は辿らない（階段の二重線を作らない）。
   線は現代の参考の河道（basis: modern-reference）で、戦国期の河道を確定したものではない。正本を直したらこれを流し直す。
   実行：node --max-old-space-size=4000 tools/map/build-river-lines.cjs   （--check：書かずに、今の配信物が正本どおりか確かめる） */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const MD=require('./map-data.cjs'),{readRGB}=require('./png-big.cjs'),TKP=require('../../game/map-projection.js');
const CHECK=process.argv.includes('--check'),src=path.join(MD.layers.physical,'rivers.png'),meta=path.join(MD.layers.physical,'rivers.json'),out=path.join(MD.out,'rivers-lines.json');
(async()=>{
 const R=JSON.parse(fs.readFileSync(meta,'utf8')),P=MD.readProjection(),W=P.width,H=P.height,[OX,OY]=P.origin,S=P.stepUnits;
 if(R.sha256!==MD.sha(src))throw Error('rivers.png が rivers.json の確認値と違う');
 const codeOf=new Map(R.encoding.codes.map(c=>[c.rgb.join(','),c]));
 const px=new Map();// 河川 id → 画素の番号（行×幅＋列）
 await readRGB(src,(y,row)=>{for(let x=0;x<W;x++){const o=x*3;if(!row[o]&&!row[o+1]&&!row[o+2])continue;const c=codeOf.get(row[o]+','+row[o+1]+','+row[o+2]);if(!c)throw Error(`rivers.json に無い色 (${x},${y})`);
  for(const f of c.featureIds){let a=px.get(f);if(!a)px.set(f,a=[]);a.push(y*W+x);}}});
 const simplify=(pts,tol)=>{if(pts.length<=4)return pts;const n=pts.length/2,keep=new Uint8Array(n);keep[0]=keep[n-1]=1;const st=[[0,n-1]];
  while(st.length){const [a,b]=st.pop(),ax=pts[a*2],ay=pts[a*2+1],dx=pts[b*2]-ax,dy=pts[b*2+1]-ay,L=dx*dx+dy*dy;let best=-1,bi=-1;
   for(let i=a+1;i<b;i++){const qx=pts[i*2]-ax,qy=pts[i*2+1]-ay,t=L?Math.max(0,Math.min(1,(qx*dx+qy*dy)/L)):0,d=Math.hypot(qx-t*dx,qy-t*dy);if(d>best){best=d;bi=i;}}
   if(best>tol){keep[bi]=1;st.push([a,bi],[bi,b]);}}const o=[];for(let i=0;i<n;i++)if(keep[i])o.push(pts[i*2],pts[i*2+1]);return o;};
 const features=[];let segments=0,points=0;
 for(const f of R.features){const list=px.get(f.id)||[],set=new Set(list);if(list.length!==f.pixels)throw Error(`画素数が rivers.json と違う: ${f.name} ${list.length}/${f.pixels}`);
  const nb=k=>{const x=k%W,o=[];const has=(dx,dy)=>{const X=x+dx,Y=Math.floor(k/W)+dy;return X>=0&&X<W&&Y>=0&&Y<H&&set.has(Y*W+X);};
   for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])if(has(dx,dy))o.push(k+dy*W+dx);
   for(const [dx,dy] of [[1,1],[1,-1],[-1,1],[-1,-1]])if(has(dx,dy)&&!has(dx,0)&&!has(0,dy))o.push(k+dy*W+dx);return o;};
  const adj=new Map(list.map(k=>[k,nb(k)])),used=new Set(),edge=(a,b)=>a<b?a+':'+b:b+':'+a,lines=[];
  const walk=(start,next)=>{const pts=[start,next];used.add(edge(start,next));let prev=start,cur=next;
   while(adj.get(cur).length===2){const nx=adj.get(cur).find(n=>n!==prev);if(used.has(edge(cur,nx)))break;used.add(edge(cur,nx));pts.push(nx);prev=cur;cur=nx;}return pts;};
  for(const k of list)if(adj.get(k).length!==2)for(const n of adj.get(k))if(!used.has(edge(k,n)))lines.push(walk(k,n));
  for(const k of list)for(const n of adj.get(k))if(!used.has(edge(k,n)))lines.push(walk(k,n));// 端のない輪
  for(const k of list)if(!adj.get(k).length)lines.push([k]);// 孤立した1画素
  const geo=lines.filter(l=>l.length>=2).map(l=>{const flat=l.flatMap(k=>[k%W+.5,Math.floor(k/W)+.5]);const simp=simplify(flat,.5),o=[];for(let i=0;i<simp.length;i+=2){const [x,y]=TKP.fromLegacy(OX+simp[i]*S,OY+simp[i+1]*S);o.push(+x.toFixed(2),+y.toFixed(2));}return o;});// 正本の格子で辿り、点を円錐図法の平面へ
  segments+=geo.length;points+=geo.reduce((n,g)=>n+g.length/2,0);features.push({id:f.id,name:f.name,pixels:f.pixels,lines:geo});}
 const doc={generated:'tools/map/build-river-lines.cjs',basis:R.basis||'modern-reference',
  note:'正本 game/map/physical/rivers.png の1画素幅の中心線を河川ごとに辿った線（円錐図法の地図平面の座標）。現代の参考の河道で、戦国期の河道を確定したものではない。手で直さない。',
  source:{rivers:'game/map/physical/rivers.png',sha256:R.sha256,meta:'game/map/physical/rivers.json',metaSha256:MD.sha(meta),projectionSha256:MD.sha(MD.files.projection),plane:TKP.params},
  license:R.license,features};
 const text=JSON.stringify(doc);
 if(CHECK){if(!fs.existsSync(out)||fs.readFileSync(out,'utf8')!==text)throw Error('rivers-lines.json が正本と違う。node tools/map/build-river-lines.cjs で作り直す');console.log('PASS: 河川の線は正本どおり');}
 else{fs.writeFileSync(out+'.part',text);fs.renameSync(out+'.part',out);console.log(JSON.stringify({features:features.length,lines:segments,points,bytes:text.length}));}
})().catch(e=>{console.error(e.message);process.exit(1);});
