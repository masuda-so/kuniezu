/* 朝鮮の義州大路・関北路の比較線を、経由地の区間ごとに OSRM の車道経路で作る。各経由地は線の頂点として必ず残す。
   区間の経路が直線の2倍を超える（軍事境界線で道がつながらない等）場合は、その区間だけ経由地を直線で結ぶ。
   取得：node tools/geo/korea-road-reference.cjs fetch  生成：node tools/geo/korea-road-reference.cjs */
const fs=require('node:fs'),path=require('node:path');const root=path.resolve(__dirname,'../..'),dir=path.join(root,'data/inputs/korea-road-review');
const {TK}=require(path.join(root,'tools/checks/history-focus.cjs')).model();
const ROADS={'義州大路':1,'関北路':1};
const m=(a,b)=>Math.hypot((a[0]-b[0])*Math.cos((a[1]+b[1])/2*Math.PI/180),a[1]-b[1])*111320;
const wps=n=>{const p=TK.ROADS.find(r=>r[0]===n)[1],s=ROADS[n];return p.filter((_,i)=>i%s===0||i===p.length-1);};
async function fetchAll(){fs.mkdirSync(dir,{recursive:true});for(const n of Object.keys(ROADS)){const w=wps(n),legs=[];
 for(let i=1;i<w.length;i++){const url=`https://router.project-osrm.org/route/v1/driving/${w[i-1].join(',')};${w[i].join(',')}?overview=full&geometries=geojson`;
  let j=null;for(let t=0;t<3&&!j;t++){try{j=await (await fetch(url)).json();}catch{await new Promise(r=>setTimeout(r,2000));}}
  const leg={from:w[i-1],to:w[i],code:j?.code,distance:j?.routes?.[0]?.distance??null,snap:j?.waypoints?.map(x=>x.distance)??null,points:j?.routes?.[0]?.geometry?.coordinates??null};
  // つながらない区間：経由地の途中（直線上）から先だけを車道でつなげるか試す（軍事境界線の北側など）
  if(leg.code!=='Ok'||!leg.points){for(const f of [.15,.3,.45,.6]){const P=[+(leg.from[0]+(leg.to[0]-leg.from[0])*f).toFixed(5),+(leg.from[1]+(leg.to[1]-leg.from[1])*f).toFixed(5)];
   const u=`https://router.project-osrm.org/route/v1/driving/${P.join(',')};${leg.to.join(',')}?overview=full&geometries=geojson`;let k=null;try{k=await (await fetch(u)).json();}catch{}await new Promise(r=>setTimeout(r,600));
   if(k?.code==='Ok'&&k.routes[0].distance<=2*m(P,leg.to)+3000&&Math.max(...k.waypoints.map(x=>x.distance))<1500){leg.partial={start:P,fraction:f,distance:k.routes[0].distance,points:k.routes[0].geometry.coordinates};break;}}}
  legs.push(leg);await new Promise(r=>setTimeout(r,600));}
 fs.writeFileSync(path.join(dir,`osrm-${n}.json`),JSON.stringify({name:n,fetched:new Date().toISOString().slice(0,10),source:'router.project-osrm.org driving (OpenStreetMap)',legs}));console.log(n,legs.length,'legs');}}
const simplify=(p,tol)=>{if(p.length<3)return p;const keep=new Uint8Array(p.length);keep[0]=keep[p.length-1]=1;const st=[[0,p.length-1]];
 while(st.length){const [a,b]=st.pop();let best=-1,bi=-1;for(let i=a+1;i<b;i++){const A=p[a],B=p[b],P=p[i],cx=Math.cos(A[1]*Math.PI/180),dx=(B[0]-A[0])*cx,dy=B[1]-A[1],px=(P[0]-A[0])*cx,py=P[1]-A[1],L=dx*dx+dy*dy,t=L?Math.max(0,Math.min(1,(px*dx+py*dy)/L)):0,d=Math.hypot(px-t*dx,py-t*dy)*111320;if(d>best){best=d;bi=i;}}
 if(best>tol){keep[bi]=1;st.push([a,bi],[bi,b]);}}return p.filter((_,i)=>keep[i]);};
function build(){const game=path.join(root,'kuniezu/static/kuniezu/modern-road-reference.js'),text=fs.readFileSync(game,'utf8'),lines=text.split('\n'),at=lines.findIndex(l=>l.startsWith('TK.MODERN_ROAD_REFERENCE={')),refs=JSON.parse(lines[at].slice('TK.MODERN_ROAD_REFERENCE='.length).replace(/;$/,''));
 const report={};for(const n of Object.keys(ROADS)){const src=JSON.parse(fs.readFileSync(path.join(dir,`osrm-${n}.json`),'utf8'));let pts=[],routed=0,straight=0;const gaps=[];
  for(const leg of src.legs){const direct=m(leg.from,leg.to);let line;
   if(leg.code==='Ok'&&leg.points&&leg.distance<=Math.max(2*direct,direct+3000)&&Math.max(...leg.snap)<1500){line=leg.points.map(p=>[+p[0].toFixed(6),+p[1].toFixed(6)]);line[0]=leg.from;line[line.length-1]=leg.to;routed+=leg.distance;}
   else if(leg.partial){line=[leg.from,leg.partial.start,...leg.partial.points.map(p=>[+p[0].toFixed(6),+p[1].toFixed(6)])];line[line.length-1]=leg.to;routed+=leg.partial.distance;straight+=m(leg.from,leg.partial.start);gaps.push({from:leg.from,to:leg.partial.start,km:+(m(leg.from,leg.partial.start)/1000).toFixed(1),routedKm:null,partialOf:leg.to});}
   else{line=[leg.from,leg.to];straight+=direct;gaps.push({from:leg.from,to:leg.to,km:+(direct/1000).toFixed(1),routedKm:leg.distance?+(leg.distance/1000).toFixed(1):null});}
   line=simplify(line,15);pts.push(...(pts.length?line.slice(1):line));}
  for(let changed=true;changed;){changed=false;const seen=new Map();for(let i=0;i<pts.length;i++){const k=pts[i].join();if(seen.has(k)&&i-seen.get(k)>=2){pts.splice(seen.get(k)+1,i-seen.get(k));changed=true;break;}seen.set(k,i);}}
  let km=0;for(let i=1;i<pts.length;i++)km+=m(pts[i-1],pts[i])/1000;
  refs[n]=pts;report[n]={points:pts.length,km:+km.toFixed(1),routedKm:+(routed/1000).toFixed(1),straightKm:+(straight/1000).toFixed(1),straightLegs:gaps};}
 lines[at]='TK.MODERN_ROAD_REFERENCE='+JSON.stringify(refs)+';';fs.writeFileSync(game,lines.join('\n'));
 fs.writeFileSync(path.join(dir,'accepted-reference.json'),JSON.stringify({scope:'現代の車道（OpenStreetMap、OSRM）を経由地の区間ごとに照会した比較線。戦国期の道筋そのものではない。軍事境界線などで道がつながらない区間は経由地の直線のまま。',report},null,1));
 console.log(JSON.stringify(report,null,1));}
if(process.argv[2]==='fetch')fetchAll();else build();
