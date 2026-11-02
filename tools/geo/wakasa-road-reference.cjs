/* 若狭街道の近現代参考線を、京都・大原・途中・花折峠・朽木市場・保坂・熊川・上中を通る一本の車道経路へ置き換える。
   入力：data/inputs/wakasa-road-review/osrm-driving-route.json（OSRM driving、経由点は旧線の両端・朽木市場・熊川）。
   旧線は before-modern-reference.json に保存し、両端の座標は旧線と同じにする。経由地から500mを超えて離れる場合は止める。
   実行：node tools/geo/wakasa-road-reference.cjs */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),inputs=path.join(root,'data/inputs/wakasa-road-review'),game=path.join(root,'game/modern-road-reference.js');
const text=fs.readFileSync(game,'utf8'),lines=text.split('\n'),at=lines.findIndex(l=>l.startsWith('TK.MODERN_ROAD_REFERENCE={')),refs=JSON.parse(lines[at].slice('TK.MODERN_ROAD_REFERENCE='.length).replace(/;$/,''));
const backup=path.join(inputs,'before-modern-reference.json');
if(!fs.existsSync(backup))fs.writeFileSync(backup,JSON.stringify({name:'若狭街道',points:refs['若狭街道'],gameFileSha256:crypto.createHash('sha256').update(text).digest('hex')}));
const old=JSON.parse(fs.readFileSync(backup,'utf8')).points,route=JSON.parse(fs.readFileSync(path.join(inputs,'osrm-driving-route.json'),'utf8'));
if(route.code!=='Ok')throw Error('route not ok');
const m=(a,b)=>Math.hypot((a[0]-b[0])*Math.cos((a[1]+b[1])/2*Math.PI/180),a[1]-b[1])*111320;
let pts=route.routes[0].geometry.coordinates.map(p=>[+p[0].toFixed(6),+p[1].toFixed(6)]);
// 経由点で道路へ寄るための完全な往復（同じ点へ戻る区間）を除く
for(let changed=true;changed;){changed=false;const seen=new Map();for(let i=0;i<pts.length;i++){const k=pts[i].join();if(seen.has(k)&&i-seen.get(k)>=2){pts.splice(seen.get(k)+1,i-seen.get(k));changed=true;break;}seen.set(k,i);}}
// Douglas-Peucker（約8m）
const simplify=(p,tol)=>{if(p.length<3)return p;const keep=new Uint8Array(p.length);keep[0]=keep[p.length-1]=1;const st=[[0,p.length-1]];
 while(st.length){const [a,b]=st.pop();let best=-1,bi=-1;for(let i=a+1;i<b;i++){const A=p[a],B=p[b],P=p[i],cx=Math.cos(A[1]*Math.PI/180),dx=(B[0]-A[0])*cx,dy=B[1]-A[1],px=(P[0]-A[0])*cx,py=P[1]-A[1],L=dx*dx+dy*dy,t=L?Math.max(0,Math.min(1,(px*dx+py*dy)/L)):0,d=Math.hypot(px-t*dx,py-t*dy)*111320;if(d>best){best=d;bi=i;}}
 if(best>tol){keep[bi]=1;st.push([a,bi],[bi,b]);}}return p.filter((_,i)=>keep[i]);};
pts=simplify(pts,8);
const joins=[m(pts[0],old[0]),m(pts.at(-1),old.at(-1))];if(Math.max(...joins)>100)throw Error('endpoint too far '+joins);
pts[0]=old[0];pts[pts.length-1]=old.at(-1);
const via={'大原':[135.832,35.118],'途中':[135.854,35.156],'花折峠':[135.860161,35.187257],'朽木市場':[135.915,35.358],'保坂':[135.938,35.427],'熊川':[135.899,35.444],'上中':[135.857,35.466]};
const near=Object.fromEntries(Object.entries(via).map(([k,P])=>[k,Math.round(Math.min(...pts.map(p=>m(p,P))))]));
for(const [k,d] of Object.entries(near))if(d>500)throw Error(k+' '+d+'m');
let km=0;for(let i=1;i<pts.length;i++)km+=m(pts[i-1],pts[i])/1000;
const keys=new Set();let repeats=0;for(const p of pts){const k=p.join();if(keys.has(k))repeats++;keys.add(k);}if(repeats)throw Error('repeated vertices '+repeats);
fs.writeFileSync(path.join(inputs,'accepted-whole-reference.json'),JSON.stringify({name:'若狭街道',status:'accepted-modern-comparison',geometry:'modern-reference',
 scope:'国道367号・303号・27号に沿う現代の車道経路。花折峠はトンネルの位置を通るため峠道から約300m離れる。戦国期の道筋そのものではなく、経由地の順序だけを史料に合わせた比較線。',
 lengthKm:+km.toFixed(1),viaDistanceMetres:near,joinMetres:joins.map(v=>+v.toFixed(1)),points:pts},null,1));
refs['若狭街道']=pts;lines[at]='TK.MODERN_ROAD_REFERENCE='+JSON.stringify(refs)+';';fs.writeFileSync(game,lines.join('\n'));
console.log({points:pts.length,km:+km.toFixed(1),near,joins});
