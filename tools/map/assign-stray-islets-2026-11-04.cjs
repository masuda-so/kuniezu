/* 一度だけの割り当て（2026-11-04）。南の島の割り当ての後に残った「未割当の陸」（朝鮮の西海岸の小島など、228個・1,846画素、最大でも約0.5km²）を、
   最も近い割り当て済みの陸の区画にする（60km まで）。これで未割当の陸は無くなる。
   実行：node --max-old-space-size=6000 tools/map/assign-stray-islets-2026-11-04.cjs */
const fs=require('node:fs'),MD=require('./map-data.cjs'),{readRGB,writeRGB}=require('./png-big.cjs');
const P=MD.readProjection(),W=P.width,H=P.height,def=MD.readDefinition();
const keyOf=new Map(def.rows.filter(Boolean).map(r=>[r.rgb.join(','),r])),UN=def.byKey.get('unassigned').rgb.join(',');
const ok=k=>{const d=keyOf.get(k);return d&&d.kind==='land'&&d.key!=='unassigned';};
(async()=>{
 const parent=[],runs=[];const find=a=>{while(parent[a]!==a)a=parent[a]=parent[parent[a]];return a;};let prev=[];
 await readRGB(MD.files.provinces,(r,row)=>{const cur=[];let c=0;
  while(c<W){if(row[c*3]+','+row[c*3+1]+','+row[c*3+2]!==UN){c++;continue;}const s=c;while(c<W&&row[c*3]+','+row[c*3+1]+','+row[c*3+2]===UN)c++;
   const id=parent.length;parent.push(id);runs.push([r,s,c-1]);cur.push([s,c-1,id]);for(const [a,b,p] of prev)if(a<=c&&b>=s-1){const x=find(p),y=find(id);if(x!==y)parent[y]=x;}}
  prev=cur;});
 const comps=new Map();runs.forEach(([r,a,b],i)=>{const k=find(i);const g=comps.get(k)||{runs:[],c0:1e9,c1:0,r0:1e9,r1:0,best:[Infinity,null]};g.runs.push(i);g.c0=Math.min(g.c0,a);g.c1=Math.max(g.c1,b);g.r0=Math.min(g.r0,r);g.r1=Math.max(g.r1,r);comps.set(k,g);});
 const list=[...comps.values()],R=600;if(!list.length){console.log('未割当の陸は無い');return;}
 await readRGB(MD.files.provinces,(r,row)=>{for(const g of list){if(r<g.r0-R||r>g.r1+R)continue;const dy=r<g.r0?g.r0-r:r>g.r1?r-g.r1:0;if(dy>=g.best[0])continue;
  for(let c=Math.max(0,g.c0-R);c<=Math.min(W-1,g.c1+R);c++){const dx=c<g.c0?g.c0-c:c>g.c1?c-g.c1:0,d=Math.hypot(dx,dy);if(d>=g.best[0])continue;const k=row[c*3]+','+row[c*3+1]+','+row[c*3+2];if(ok(k))g.best=[d,k];}}});
 const target=new Map(),count={};for(const g of list){if(!g.best[1])throw Error('60km 以内に陸の区画が無い島がある');const v=g.best[1].split(',').map(Number),key=keyOf.get(g.best[1]).key;
  for(const i of g.runs){const [r,a,b]=runs[i];count[key]=(count[key]||0)+b-a+1;if(!target.has(r))target.set(r,[]);target.get(r).push([a,b,v]);}}
 const src=MD.files.provinces,tmp=src+'.stray.raw',fd=fs.openSync(tmp,'w');
 await readRGB(src,(r,row)=>{for(const [a,b,v] of target.get(r)||[])for(let c=a;c<=b;c++){row[c*3]=v[0];row[c*3+1]=v[1];row[c*3+2]=v[2];}fs.writeSync(fd,row);});
 fs.closeSync(fd);const rd=fs.openSync(tmp,'r'),buf=Buffer.alloc(W*3);
 await writeRGB(src+'.stray',W,H,y=>{fs.readSync(rd,buf,0,W*3,y*W*3);return buf;});fs.closeSync(rd);fs.rmSync(tmp);fs.renameSync(src+'.stray',src);
 console.log(JSON.stringify({islets:list.length,count}));
})().catch(e=>{console.error(e);process.exit(1);});
