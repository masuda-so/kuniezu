"use strict";
/* ===== 地図生成と合戦・内政・AI ===== */
const G = window.G = {};
(function(){
const ekey=(a,b)=>a<b?a+'|'+b:b+'|'+a;G.ekey=ekey;G.evT=ev=>evT(ev);
G.build=function(){
 const geo=window.TKGEO;G.W=geo.W;G.H=geo.H;
 G.C={};G.CL=[];
 TK.CASTLES.forEach((a,idx)=>{const p=geo.cpos[a[0]];
  const o={id:a[0],n1:a[1],n2:a[2]||a[1],prov:a[3],x:p[0],y:p[1],bx:p[0],by:p[1],koku:a[6],shogyo:a[7],dur:a[8],snow:!!a[9],idx};G.C[o.id]=o;G.CL.push(o);});
 // 城の位置の補正（史実の場所が領域の中にあるときだけ）
 const PJ0=(lon,lat)=>[(lon-129.2)*200*Math.cos(36*Math.PI/180),(41.75-lat)*200];
 const inT=(id,x,y)=>{const T=geo.terr[id];if(!T)return false;let c=false;for(const poly of T)for(const r of poly){for(let i=0,j=r.length-2;i<r.length;j=i,i+=2){const xi=r[i],yi=r[i+1],xj=r[j],yj=r[j+1];if(((yi>y)!=(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))c=!c;}}return c;};
 for(const [id,lon,lat] of (TK.CASTLE_FIX||[])){const C=G.C[id];if(!C)continue;const [x,y]=PJ0(lon,lat);if(inT(id,x,y)){C.x=C.bx=x;C.y=C.by=y;}}
 G.YOSHO=(TK.YOSHO||[]).map(([n,kind,lon,lat,desc,y0,y1])=>{const [x,y]=PJ0(lon,lat);let at=null;for(const id in geo.terr)if(inT(id,x,y)){at=id;break;}if(!at){let bd=1e9;for(const C of G.CL){const d=Math.hypot(C.x-x,C.y-y);if(d<bd){bd=d;at=C.id;}}}return {id:TK.SITE_STABLE_IDS?.[n]||'yosho:'+n+':'+lon+':'+lat,n,kind,x,y,desc,at,y0,y1};});
 G.YOSHO_AT={};for(const y of G.YOSHO)(G.YOSHO_AT[y.at]=G.YOSHO_AT[y.at]||[]).push(y);
 G.ADJ={};G.EDGES={};G.CL.forEach(c=>G.ADJ[c.id]=[]);
 if(!TK._alsoDone){TK._alsoDone=1;const add=[];for(const ev of TK.HIST)for(const w of (ev.also||[]))add.push({d:ev.d,k:'premarch',title:ev.title,site:ev.site,big:1,who:w,at:ev.at2||ev.at||(ev.castles||[])[0],sub:1});TK.HIST.push(...add);TK.HIST.sort((a,b)=>(a.d[0]-b.d[0])*400+(a.d[1]-b.d[1])*32+(a.d[2]-b.d[2]));}
 const addE=(a,b,sea)=>{if(G.ADJ[a].includes(b))return;G.ADJ[a].push(b);G.ADJ[b].push(a);
  const A=G.C[a],B=G.C[b],len=Math.hypot(A.x-B.x,A.y-B.y),rough=geo.rough[ekey(a,b)]||0;
  const days=Math.max(2,len/25*(1+rough*2.2)*(sea?1.1:1)); /* 25単位＝約14km／日（大軍の野の行軍） */
  G.EDGES[ekey(a,b)]={a,b,len,days,sea:!!sea,rough};};
 geo.edges.forEach(e=>addE(e[0],e[1],false));
 TK.SEA_LINKS.forEach(([a,b])=>addE(a,b,true));
 // 街道：史実の往還を経緯度で引き、その近くを通る城と城の道は速く進める
 const PJ=(lon,lat)=>[(lon-129.2)*200*Math.cos(36*Math.PI/180),(41.75-lat)*200];G.PJ=PJ;
 // 街道の折れ線を、角を落としたなめらかな曲線にする（端の点は動かさない）
 // 街道は、記した宿場・峠の点を必ず通る曲線（向心 Catmull-Rom）でつなぐ。角を削らないので、道がずれず、山道の曲がりも残る
 const spline=(P)=>{if(P.length<3)return P;const o=[P[0]];const ext=[[2*P[0][0]-P[1][0],2*P[0][1]-P[1][1]],...P,[2*P[P.length-1][0]-P[P.length-2][0],2*P[P.length-1][1]-P[P.length-2][1]]];
  for(let i=1;i<ext.length-2;i++){const p0=ext[i-1],p1=ext[i],p2=ext[i+1],p3=ext[i+2];const d=Math.hypot(p2[0]-p1[0],p2[1]-p1[1]);const n=Math.max(2,Math.ceil(d/3));
   const t01=Math.pow(Math.hypot(p1[0]-p0[0],p1[1]-p0[1]),.5)||1e-3,t12=Math.pow(d,.5)||1e-3,t23=Math.pow(Math.hypot(p3[0]-p2[0],p3[1]-p2[1]),.5)||1e-3;
   for(let j=1;j<=n;j++){const t=j/n;const m1=[0,1].map(k=>(p2[k]-p1[k]+t12*((p1[k]-p0[k])/t01-(p2[k]-p0[k])/(t01+t12)))),m2=[0,1].map(k=>(p2[k]-p1[k]+t12*((p3[k]-p2[k])/t23-(p3[k]-p1[k])/(t12+t23))));
    const h00=2*t*t*t-3*t*t+1,h10=t*t*t-2*t*t+t,h01=-2*t*t*t+3*t*t,h11=t*t*t-t*t;o.push([0,1].map(k=>h00*p1[k]+h10*m1[k]+h01*p2[k]+h11*m2[k]));}}return o;};
 // 平城・平山城の城下を通る街道は、城の場所を必ず通す（城と街道がずれて見えないように）。山城は麓を通るのでそのまま
 const snapC=(P)=>{P=P.slice();for(const C of G.CL){const tp=(TK.CTERR&&TK.CTERR[C.id]&&TK.CTERR[C.id][2])||'平';if(tp==='山')continue;let bi=-1,bd=10,bt=0;
   for(let i=0;i<P.length-1;i++){const a=P[i],b=P[i+1],dx=b[0]-a[0],dy=b[1]-a[1],L=dx*dx+dy*dy||1;let t=((C.bx-a[0])*dx+(C.by-a[1])*dy)/L;t=Math.max(0,Math.min(1,t));const d=Math.hypot(a[0]+t*dx-C.bx,a[1]+t*dy-C.by);if(d<bd){bd=d;bi=i;bt=t;}}
   if(bi<0)continue;const q=[C.bx,C.by];if(bt<.15)P[bi]=q;else if(bt>.85)P[bi+1]=q;else P.splice(bi+1,0,q);}return P;};
 G.ROADS=(TK.ROADS||[]).map(([name,pts])=>{const evidence=TK.ROAD_EVIDENCE?.[name],raw=TK.NO_CASTLE_ROAD_SNAP?pts.map(([lo,la])=>PJ(lo,la)):snapC(pts.map(([lo,la])=>PJ(lo,la)));
  // 照合済み折点を曲線や近傍道路への吸着で動かさない。
  const old=TK.ROADFIX?.[name],validOld=old&&old[0]===spline(raw).length;return {name,evidence,pts:TK.ROAD_POLYLINE?(evidence?.geometry==='polyline'?raw:validOld&&!window.__NOFIX?old[2]:raw):spline(raw)};});
 // 曲線にしたとき岸から海へはみ出す点は、陸の内へ寄せる（点の数が変わっていなければ当てる）
 if(!TK.ROAD_POLYLINE&&!window.__NOFIX)for(const r of G.ROADS){const f=TK.ROADFIX&&TK.ROADFIX[r.name];if(f&&f[0]===r.pts.length)r.pts=f[2];}
 const dSeg=(px,py,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],L=dx*dx+dy*dy||1;let t=((px-a[0])*dx+(py-a[1])*dy)/L;t=Math.max(0,Math.min(1,t));return Math.hypot(px-a[0]-t*dx,py-a[1]-t*dy);};
 const dRoad=(r,x,y)=>{let m=1e9;for(let i=1;i<r.pts.length;i++)m=Math.min(m,dSeg(x,y,r.pts[i-1],r.pts[i]));return m;};
 // 街道を細かく刻み、途切れた端は近くの別の街道へつなぐ
 for(const r of G.ROADS){const o=[r.pts[0]];for(let i=1;i<r.pts.length;i++){const a=r.pts[i-1],b=r.pts[i],L=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.max(1,Math.ceil(L/6));for(let j=1;j<=n;j++)o.push([a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n]);}r.pts=o;}
 const near=(x,y,skip)=>{let best=null,bd=1e9;for(const r of G.ROADS){if(r===skip)continue;for(let i=1;i<r.pts.length;i++){const a=r.pts[i-1],b=r.pts[i],dx=b[0]-a[0],dy=b[1]-a[1],L=dx*dx+dy*dy||1;let t=((x-a[0])*dx+(y-a[1])*dy)/L;t=Math.max(0,Math.min(1,t));const px=a[0]+t*dx,py=a[1]+t*dy,d=Math.hypot(x-px,y-py);if(d<bd){bd=d;best=[px,py];}}}return [best,bd];};
 for(const r of G.ROADS){if(r.evidence?.geometry==='polyline')continue;for(const end of [0,1]){const P=end?r.pts[r.pts.length-1]:r.pts[0];const [q,d]=near(P[0],P[1],r);if(q&&d>1.5&&d<16){if(end)r.pts.push(q);else r.pts.unshift(q);}}}
 // 街道の網（近い点はひとつの辻にまとめる）
 const N=[],H=new Map(),key=(x,y)=>Math.round(x/4)+','+Math.round(y/4);
 const node=(x,y)=>{const k=key(x,y);let i=H.get(k);if(i==null){i=N.length;N.push({x,y,e:[]});H.set(k,i);}return i;};
 const link=(i,j,name)=>{if(i===j)return;const a=N[i],b=N[j],w=Math.hypot(a.x-b.x,a.y-b.y);a.e.push([j,w,name]);b.e.push([i,w,name]);};
 for(const r of G.ROADS){let prev=null;for(const P of r.pts){const i=node(P[0],P[1]);if(prev!=null)link(prev,i,r.name);prev=i;}}
 {const cell=new Map();N.forEach((n,i)=>{const k=Math.floor(n.x/8)+','+Math.floor(n.y/8);(cell.get(k)||cell.set(k,[]).get(k)).push(i);});
  N.forEach((n,i)=>{const cx=Math.floor(n.x/8),cy=Math.floor(n.y/8);for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(const j of (cell.get((cx+dx)+','+(cy+dy))||[])){if(j<=i)continue;const m=N[j];const d=Math.hypot(n.x-m.x,n.y-m.y);if(d<5&&!n.e.some(x=>x[0]===j))link(i,j,'');}});}
 const nearNode=(x,y,lim)=>{let b=-1,bd=lim;N.forEach((n,i)=>{const d=Math.hypot(n.x-x,n.y-y);if(d<bd){bd=d;b=i;}});return [b,bd];};
 const route=(s,t)=>{const dist=new Float64Array(N.length).fill(Infinity),prev=new Int32Array(N.length).fill(-1),nm=new Array(N.length);dist[s]=0;const T=N[t];const open=[[Math.hypot(N[s].x-T.x,N[s].y-T.y),s]];const done=new Uint8Array(N.length);
  while(open.length){let bi=0;for(let i=1;i<open.length;i++)if(open[i][0]<open[bi][0])bi=i;const [,u]=open.splice(bi,1)[0];if(done[u])continue;done[u]=1;if(u===t)break;
   for(const [v,w,name] of N[u].e){const nd=dist[u]+w;if(nd<dist[v]){dist[v]=nd;prev[v]=u;nm[v]=name;open.push([nd+Math.hypot(N[v].x-T.x,N[v].y-T.y),v]);}}}
  if(!isFinite(dist[t]))return null;const pts=[],names=new Set();for(let v=t;v!==-1;v=prev[v]){pts.push([N[v].x,N[v].y]);if(nm[v])names.add(nm[v]);}pts.reverse();return {pts,len:dist[t],names:[...names]};};
 G.RNET=N;
 // 城と城の道筋：街道を通るほうが近ければ街道を通る
 const cn={};for(const C of G.CL){cn[C.id]=nearNode(C.x,C.y,70);}
 for(const k in G.EDGES){const e=G.EDGES[k];if(e.sea)continue;const A=G.C[e.a],B=G.C[e.b];const [ia,da]=cn[e.a],[ib,db]=cn[e.b];
  if(ia<0||ib<0||ia===ib)continue;const r=route(ia,ib);if(!r)continue;const tot=da+db+r.len;
  if(tot>e.len*1.9||r.len<e.len*.35)continue;
  e.geo=[[A.x,A.y],...r.pts,[B.x,B.y]];e.road=r.names[0]||'街道';e.roads=r.names;
  e.days=Math.max(1.5,e.days*Math.max(.62,Math.min(1.25,(da+db+r.len*.72)/e.len))); /* 街道は約20km／日 */}
 // 大きな川を渡る道（渡河は遅れ、川を背にした城攻めは難しい）
 {const segX=(a,b,c,d)=>{const d1=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]),d2=(b[0]-a[0])*(d[1]-a[1])-(b[1]-a[1])*(d[0]-a[0]),d3=(d[0]-c[0])*(a[1]-c[1])-(d[1]-c[1])*(a[0]-c[0]),d4=(d[0]-c[0])*(b[1]-c[1])-(d[1]-c[1])*(b[0]-c[0]);return d1*d2<0&&d3*d4<0;};
  const RS=[];for(const l of (geo.rivers||[])){for(let i=2;i<l.length;i+=2)RS.push([[l[i-2],l[i-1]],[l[i],l[i+1]]]);}
  for(const k in G.EDGES){const e=G.EDGES[k];if(e.sea)continue;const g=e.geo||[[G.C[e.a].x,G.C[e.a].y],[G.C[e.b].x,G.C[e.b].y]];let n=0;
   const bx0=Math.min(...g.map(p=>p[0])),bx1=Math.max(...g.map(p=>p[0])),by0=Math.min(...g.map(p=>p[1])),by1=Math.max(...g.map(p=>p[1]));
   for(const [p,q] of RS){if(Math.max(p[0],q[0])<bx0||Math.min(p[0],q[0])>bx1||Math.max(p[1],q[1])<by0||Math.min(p[1],q[1])>by1)continue;for(let i=1;i<g.length;i++)if(segX(g[i-1],g[i],p,q)){n++;break;}}
   if(n){e.river=n;e.days*=1+.12*Math.min(2,n);}}}
 // 道筋の長さを積み上げておく（駒をなめらかに進めるため）
 // 城が移ったとき（小谷→長浜、吉田郡山→広島など）は、道筋の両端をいまの城の場所へつなぎ直す。
 // 城のすぐそばで街道へ出て引き返す小さな折り返しも取り除く（駒が城の前で行き来しないように）
 for(const k in G.EDGES){const e=G.EDGES[k];e.mid=e.geo?e.geo.slice(1,-1):[];e.sig='';}
 const fitEdge=e=>{const A=G.C[e.a],B=G.C[e.b];const sig=A.x+','+A.y+','+B.x+','+B.y;if(e.sig===sig)return e;e.sig=sig;
  let g=[[A.x,A.y],...e.mid,[B.x,B.y]];if(!e.mid.length&&!e.sea){/* 街道のない道は、定規で引いたような直線でなく、ゆるい弧で結ぶ */const dx=B.x-A.x,dy=B.y-A.y,L=Math.hypot(dx,dy)||1;let h=0;for(const ch of e.a+e.b)h=(h*31+ch.charCodeAt(0))|0;const sg=(h&1)?1:-1,off=L*.07*sg;const cx=(A.x+B.x)/2-dy/L*off,cy=(A.y+B.y)/2+dx/L*off;g=[];for(let i=0;i<=12;i++){const t=i/12,u=1-t;g.push([u*u*A.x+2*u*t*cx+t*t*B.x,u*u*A.y+2*u*t*cy+t*t*B.y]);}}
  const bad=(P,Q,R)=>{const ax=Q[0]-P[0],ay=Q[1]-P[1],bx=R[0]-Q[0],by=R[1]-Q[1];const la=Math.hypot(ax,ay),lb=Math.hypot(bx,by);if(la<.01||lb<.01)return true;return (ax*bx+ay*by)/(la*lb)<-.2;};
  while(g.length>2&&bad(g[0],g[1],g[2]))g.splice(1,1);
  while(g.length>2&&bad(g[g.length-3],g[g.length-2],g[g.length-1]))g.splice(g.length-2,1);
  // 城が街道から離れた所へ移ったら、城から遠い側の街道点を飛ばす
  while(g.length>2&&Math.hypot(g[1][0]-g[0][0],g[1][1]-g[0][1])>Math.hypot(g[2][0]-g[0][0],g[2][1]-g[0][1])+1)g.splice(1,1);
  while(g.length>2&&Math.hypot(g[g.length-2][0]-g[g.length-1][0],g[g.length-2][1]-g[g.length-1][1])>Math.hypot(g[g.length-3][0]-g[g.length-1][0],g[g.length-3][1]-g[g.length-1][1])+1)g.splice(g.length-2,1);
  const cum=[0];for(let i=1;i<g.length;i++)cum.push(cum[i-1]+Math.hypot(g[i][0]-g[i-1][0],g[i][1]-g[i-1][1]));e.g=g;e.cum=cum;return e;};
 for(const k in G.EDGES)fitEdge(G.EDGES[k]);G.fitEdge=fitEdge;
 G.edgePoint=(a,b,f)=>{let e=G.EDGES[ekey(a,b)];if(e)fitEdge(e);if(!e){const A=G.C[a],B=G.C[b];return [A.x+(B.x-A.x)*f,A.y+(B.y-A.y)*f,Math.atan2(B.y-A.y,B.x-A.x)];}
  const rev=e.a!==a;const L=e.cum[e.cum.length-1];let d=(rev?1-f:f)*L;let i=1;while(i<e.cum.length-1&&e.cum[i]<d)i++;const p=e.g[i-1],q=e.g[i],seg=e.cum[i]-e.cum[i-1]||1,t=Math.max(0,Math.min(1,(d-e.cum[i-1])/seg));
  let ang=Math.atan2(q[1]-p[1],q[0]-p[0]);if(rev)ang+=Math.PI;return [p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t,ang];};
 G.edgeGeo=(a,b)=>{const e=G.EDGES[ekey(a,b)];if(e)fitEdge(e);if(!e)return [[G.C[a].x,G.C[a].y],[G.C[b].x,G.C[b].y]];return e.a===a?e.g:e.g.slice().reverse();};
};
/* ===== 状態 ===== */
let S=null;G.S=()=>S;G.setS=s=>{S=s;G.syncCastles&&G.syncCastles();G.repairCastleEraPositions&&G.repairCastleEraPositions(s);};
const rnd=Math.random;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));G.clamp=clamp;
G.cname=id=>(S.cst&&S.cst[id]&&S.cst[id].n)||(S.sc==='s1585'?G.C[id].n2:G.C[id].n1);
G.CN=k=>(S&&S.cnm&&S.cnm[k])||(TK.CLANS[k]?TK.CLANS[k][0]:k);
// 「〇〇家」の呼び方。家でない国（朝鮮・明）は王朝の呼び名で
G.CNK=k=>({joseon:'李氏朝鮮',ming:'明'})[k]||(/家$/.test(G.CN(k))?G.CN(k):G.CN(k)+'家');
G.CC=k=>TK.CLANS[k]?TK.CLANS[k][1]:'#888';
G.date=function(t){t=t===undefined?S.t:t;return S.clockVersion===TKCalendar.version?TKCalendar.fromJD(TKCalendar.toJD(S.y0,S.m0,1)+Math.floor(t)):TKCalendar.legacyDate(S,t);};
// 旧暦（和暦）は実日の番号から月表で引く。旧時計の保存は移行前のみ月末を丸める。
const KAN='〇一二三四五六七八九';const kanN=n=>n<=10?(n===10?'十':KAN[n]):n<20?'十'+KAN[n-10]:KAN[Math.floor(n/10)]+'十'+(n%10?KAN[n%10]:'');G.kanN=kanN;
function jdJul(y,m,d){const a=Math.floor((14-m)/12),Y=y+4800-a,M=m+12*a-3;return d+Math.floor((153*M+2)/5)+365*Y+Math.floor(Y/4)-32083;}
function jdGre(y,m,d){const a=Math.floor((14-m)/12),Y=y+4800-a,M=m+12*a-3;return d+Math.floor((153*M+2)/5)+365*Y+Math.floor(Y/4)-Math.floor(Y/100)+Math.floor(Y/400)-32045;}
function realJD(d){const greg=d.y>1582||(d.y===1582&&(d.m>10||(d.m===10&&d.d>=15)));const leap=greg?(d.y%4===0&&(d.y%100!==0||d.y%400===0)):d.y%4===0;
 const dm=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31][d.m-1];const dd=Math.min(d.d,dm);return greg?jdGre(d.y,d.m,dd):jdJul(d.y,d.m,dd);}
const KAIGEN=[[1615,7,13,'元和'],[1596,10,27,'慶長'],[1592,12,8,'文禄'],[1573,7,28,'天正'],[1570,4,23,'元亀'],[1558,2,28,'永禄'],[1555,10,23,'弘治'],[1532,7,29,'天文']];
G.kyu=function(t){const d=G.date(t);const jd=realJD(d);const K=TK.KOYOMI;
 if(!K)return {y:d.y,m:d.m,leap:0,d:d.d,gy:d.y};
 const x=jd-K.j0;let lo=0,hi=K.m.length-1;while(lo<hi){const mid=(lo+hi+1)>>1;if(K.m[mid][3]<=x)lo=mid;else hi=mid-1;}
 const r=K.m[lo];return {y:r[0],m:r[1],leap:r[2],d:x-r[3]+1,gy:d.y,gm:d.m,gd:d.d};};
G.eraK=function(t){const k=G.kyu(t);for(const [y,m,dd,n] of KAIGEN){if(k.y>y||(k.y===y&&(k.m>m||(k.m===m&&(k.leap||k.d>=dd))))){const n2=k.y-y+1;return n+(n2===1?'元':kanN(n2))+'年';}}return '';};
G.monK=function(t){const k=G.kyu(t);return (k.leap?'閏':'')+(k.m===1?'正':kanN(k.m))+'月';};
G.dayK=function(t){return kanN(G.kyu(t).d)+'日';};
G.dstr=function(t){const k=G.kyu(t);const w=G.wdate(t);return `${G.eraK(t)}${G.monK(t)}${G.dayK(t)}（${w.y}年${w.m}月${w.d}日）`;};
G.wdate=function(t){const d=G.date(t);if(S.clockVersion===TKCalendar.version)return d;const greg=d.y>1582||(d.y===1582&&(d.m>10||d.m===10&&d.d>=15));const leap=greg?(d.y%4===0&&(d.y%100!==0||d.y%400===0)):d.y%4===0;const dm=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31][d.m-1];return {y:d.y,m:d.m,d:Math.min(d.d,dm)};};
G.dstrW=function(t){const d=G.wdate(t);return `${d.y}年${d.m}月${d.d}日`;};
G.era=function(y,m,dd){m=m||12;dd=dd||31;const v=y*10000+m*100+dd;const E=[[[1596,12,16],'慶長'],[[1593,1,10],'文禄'],[[1573,8,25],'天正'],[[1570,5,27],'元亀'],[[1558,3,18],'永禄'],[[1555,11,7],'弘治']];for(const [b,n] of E)if(v>=b[0]*10000+b[1]*100+b[2]){const k=y-b[0]+1;return n+(k===1?'元':k)+'年';}return '';};
function log(t,kind,clans){const d=G.date();S.log.unshift({t:S.t,s:`${d.y}.${d.m}.${d.d}`,msg:t,kind:kind||'',pl:clans?clans.includes(S.player):false});if(S.log.length>300)S.log.length=300;G.onLog&&G.onLog(S.log[0]);}
G.log=log;

G._ff={};
// 過去の再生と時の帯は、登録済みの最も早い開始配置を共用する。
const historyDateOrder=d=>d[0]*400+d[1]*32+d[2];
G.historyOrigin=function(){
 const roots=Object.entries(TK.SCEN).filter(([,sc])=>!sc.base).map(([id,sc])=>({id,date:(sc.openingDate||[sc.year,sc.month||1,1]).slice()}));
 roots.sort((a,b)=>historyDateOrder(a.date)-historyDateOrder(b.date)||a.id.localeCompare(b.id));
 if(!roots.length)throw Error('史実を再生できる開始配置がありません。');return roots[0];
};
// 半年ごとの控えは一時的な再生用。史実DBの日別の所在データにはしない。
G._past=null;
G.pastStep=function(endD,maxDays){const cur=S,origin=G.historyOrigin(),key=origin.id+'|'+origin.date.join('/');
 if(historyDateOrder(endD)<historyDateOrder(origin.date))throw RangeError('史実の再生は'+origin.date.join('/')+'から開けます。');
 try{
  if(!G._past||G._past.origin!==key){G.newGame(origin.id,Object.keys(TK.SCEN[origin.id].owners)[0]);S.player='__none';const d=G.date(),done=[d.y,d.m,d.d],str=JSON.stringify(S);
   if(historyDateOrder(endD)<historyDateOrder(done))throw RangeError('史実の再生は'+done.join('/')+'から開けます。');
   G._past={origin:key,cur:str,snaps:[{y:d.y,m:d.m,d:d.d,s:str}],done};}
  const P=G._past;const [ey,em,ed]=endD;if(P.done[0]*400+P.done[1]*32+P.done[2]>=ey*400+em*32+ed)return true;
  S=JSON.parse(P.cur);G.syncCastles();const end=evT({d:endD});let n=0;
  while(S.t<end&&n<maxDays){G.day();n++;S.evQ=[];const d=G.date();if(d.d===1&&(d.m===1||d.m===7)){S.log=S.log.slice(0,30);P.snaps.push({y:d.y,m:d.m,d:1,s:JSON.stringify(S)});}}
  const d=G.date();P.done=[d.y,d.m,d.d];P.cur=JSON.stringify(S);return S.t>=end;}
 finally{S=cur;G.syncCastles&&S&&G.syncCastles();}};
// 書き留めた過去の一場面を、選んだ家の立場で開く
// 史実の並び（版が変わると出来事が増減する）。古い保存を読んだ時は、日付から読み直す
G.histSig=()=>{let h=TK.HIST.length;for(const e of TK.HIST){const t=(e.title||e.k)+e.d.join('');for(let i=0;i<t.length;i++)h=(h*31+t.charCodeAt(i))|0;}return h;};
G.fixHist=function(){const changed=G.fixJokaku();const sig=G.histSig();if(S.hsig===sig)return changed;let i=0;while(i<TK.HIST.length&&evT(TK.HIST[i])<=S.t)i++;S.hi=i;
 const keep={};for(const u of S.units)if(u.until)keep[u.until]=1;S.pm={};for(let j=i;j<TK.HIST.length;j++){const e=TK.HIST[j];const k=e.title||e._pk;if(k&&keep[k])S.pm[j]=1;}S.hsig=sig;return true;};
G.adoptPast=function(str,player){const next=JSON.parse(str);if(!next?.clans?.[player]?.alive)return null;S=next;G.syncCastles();S.hsig=G.histSig();
 S.player=player;S.evQ=[];S.evSeen={};S.lastInc=S.t;S.sceneQ=[];S.battleQ=[];S.div={};S.auto=false;S.extinct=0;S.over=null;
 for(const f of (TK.FORKS||[]))if(evT(f)<S.t)S.evSeen[f.id]=1;G._lr=null;return S;};
// まもなく史実で立つ家（本能寺の後の羽柴、関ヶ原前の石田など）。いまは主家の下にいる
const PRE_EXTRA={hashiba:['himeji','miki','tottori']};
G.preList=function(){const out=[];const seen={};
 for(const e of TK.HIST){if(e.k!=='newclan')continue;const t=evT(e);if(t<S.t||t>S.t+25*360)continue;const k=e.clan;if(seen[k]||(S.clans[k]&&S.clans[k].alive))continue;
  const L=genByName(e.leader);const apL=[].concat(e.appear||[]).find(x=>x.split('|')[0]===e.leader);if((!L||L.dead)&&!apL)continue;let cs=[];
  if(PRE_EXTRA[k])cs=PRE_EXTRA[k].filter(id=>S.castles[id]);else{const ec=(e.castles||[]).filter(id=>S.castles[id]);const o0=ec.length?S.castles[ec[0]].owner:null;cs=ec.filter(id=>S.castles[id].owner===o0);}
  if(L&&L.loc&&S.castles[L.loc]&&!cs.includes(L.loc)&&(e.castles||[]).includes(L.loc))cs.unshift(L.loc);
  if(!cs.length)cs=(e.castles||[]).filter(id=>S.castles[id]).slice(0,1);
  // 主家は、当主になる人がいま仕えている家（先の史実なら、いまの居城を足場にする）
  let parent=cs.length?S.castles[cs[0]].owner:null;
  if(L&&!L.dead&&L.clan&&S.clans[L.clan]&&S.clans[L.clan].alive&&L.clan!==k){parent=L.clan;const own=cs.filter(id=>S.castles[id].owner===parent);
   if(own.length)cs=own;else if(L.loc&&S.castles[L.loc]&&S.castles[L.loc].owner===parent)cs=[L.loc];else cs=[];}
  cs=cs.filter(id=>S.castles[id].owner===parent);
  if(!cs.length||!parent||parent===k||!(S.clans[parent]&&S.clans[parent].alive))continue;
  // 主家の本城は渡さない
  cs=cs.filter(id=>id!==S.clans[parent].cap);if(!cs.length)continue;
  seen[k]=1;out.push({k,leader:e.leader,castles:cs,parent,title:e.title,d:e.d,appear:(!L||L.dead)?[].concat(e.appear||[]):null});}
 return out;};
G.setupPre=function(k){const p=G.preList().find(x=>x.k===k);if(!p)return false;const pa=p.parent;
 S.clans[k]=Object.assign(S.clans[k]||{},{gold:500,food:Math.round(p.castles.length*9000),leader:null,cap:p.castles[0],alive:true});
 for(const id of p.castles){S.castles[id].owner=k;}
 for(const a of G.alive())if(a!==k&&S.rel[ekey(a,k)]==null)S.rel[ekey(a,k)]=S.rel[ekey(a,pa)]??45;
 if(p.appear)for(const a of p.appear)mkGen(a,k,p.castles[0]);
 const L=genByName(p.leader);
 for(const g of S.gens)if(!g.dead&&g.clan===pa&&p.castles.includes(g.loc)&&!G.isLeader(g)&&g.unit==null)g.clan=k;
 if(L){if(L.unit!=null){const u=S.units.find(x=>x.id===L.unit);if(u&&u.clan===pa){u.clan=k;for(const id of u.gens){const g=gen(id);if(g)g.clan=k;}}}setLeader(k,L);if(!L.loc||S.castles[L.loc].owner!==k)L.loc=p.castles[0];}
 S.vassal=Object.assign(S.vassal||{},{[k]:pa});S.ally[ekey(k,pa)]=1e9;S.rel[ekey(k,pa)]=90;S.pre=Object.assign(S.pre||{},{[k]:pa});
 log(`${G.CNK(k)}は、${G.CNK(pa)}の下で${p.castles.map(id=>G.cname(id)).join('・')}を預かっている。`,'big',[k]);return true;};
G.newGame=function(scId,player){G._lr=null;const r=newGame0(scId,player);if(player&&S&&!(S.clans[player]&&S.clans[player].alive)&&G.preList().some(x=>x.k===player)){G.setupRetainer(player);}return r;};
/* ===== 主家に仕える家（家臣として始め、時が来れば自立を選ぶ） ===== */
// はじめは城を持たない。当主は主家の武将として働き、自立はイベントで選ぶ
G.setupRetainer=function(k){const p=G.preList().find(x=>x.k===k);if(!p)return false;const ev=TK.HIST.find(e=>e.k==='newclan'&&e.clan===k&&evT(e)>=S.t);
 S.retainer={k,parent:p.parent,leader:p.leader,castles:p.castles.slice(),t:ev?evT(ev):null,title:ev&&ev.title,asked:0,lastTry:-9999};
 if(p.appear)for(const a of p.appear)mkGen(a,p.parent,p.castles[0]);
 log(`${p.leader}は、いまは${G.CNK(p.parent)}の家臣である。時が来れば自立を選べる。`,'big',[p.parent]);return true;};
G.retainer=()=>S.retainer&&S.retainer.k===S.player&&!(S.clans[S.player]&&S.clans[S.player].alive)?S.retainer:null;
// 自立のしかた：mode 'grant' 主家の許しで城持ち（臣従のまま） / 'rebel' 主家に背く
G.becomeIndependent=function(mode){const R=G.retainer();if(!R)return null;const L=genByName(R.leader);const pa=R.parent;if(!L||L.dead)return null;
 let cs=R.castles.filter(id=>S.castles[id]&&S.castles[id].owner===pa&&id!==(S.clans[pa]&&S.clans[pa].cap));
 if(L.loc&&S.castles[L.loc]&&S.castles[L.loc].owner===pa&&L.loc!==S.clans[pa].cap&&!cs.includes(L.loc))cs.unshift(L.loc);
 if(mode==='rebel')cs=cs.slice(0,Math.max(1,Math.min(3,cs.length)));else cs=cs.slice(0,Math.max(1,Math.min(2,cs.length)));
 if(!cs.length)return null;const k=R.k;
 S.clans[k]=Object.assign(S.clans[k]||{},{gold:mode==='rebel'?300:500,food:cs.length*9000,leader:null,cap:cs[0],alive:true});
 for(const id of cs){S.castles[id].owner=k;}
 for(const a of G.alive())if(a!==k&&S.rel[ekey(a,k)]==null)S.rel[ekey(a,k)]=S.rel[ekey(a,pa)]??45;
 if(L.unit!=null){const u=S.units.find(x=>x.id===L.unit);if(u)u.gens=u.gens.filter(x=>x!==L.id);L.unit=null;}
 L.clan=k;L.loc=cs[0];setLeader(k,L);
 for(const g of S.gens)if(!g.dead&&g.clan===pa&&cs.includes(g.loc)&&!G.isLeader(g)&&g.unit==null&&g.loyal<85)g.clan=k;
 if(mode==='grant'){S.vassal=Object.assign(S.vassal||{},{[k]:pa});S.ally[ekey(k,pa)]=1e9;S.rel[ekey(k,pa)]=85;S.pre=Object.assign(S.pre||{},{[k]:pa});}
 else{S.war=S.war||{};S.war[ekey(k,pa)]=S.t;S.rel[ekey(k,pa)]=5;G.diverge(k);G.diverge(pa);}
 S.retainer=null;G.onTerr&&G.onTerr();return cs;};
function newGame0(scId,player){G._lr=null;
 const sc0=TK.SCEN[scId];
 if(sc0.base){ // 史実を早送りして作る配置図
  if(!G._ff[scId]){G.newGame(sc0.base,Object.keys(TK.SCEN[sc0.base].owners)[0]);S.player='__none';const end=evT({d:sc0.start});while(S.t<end)G.day();S.log=[];S.chron=S.chron.slice(0,8);G._ff[scId]=JSON.stringify(S);}
  S=JSON.parse(G._ff[scId]);G.syncCastles();S.scen=scId;S.player=player;S.extinct=0;S.over=null;S.evQ=[];S.evSeen={};S.lastInc=S.t;S.sceneQ=[];S.battleQ=[];S.hOk=0;S.hNg=0;S.hFail=[];
  for(const f of (TK.FORKS||[]))if(evT(f)<S.t)S.evSeen[f.id]=1;
  addShows(scId);
  if(S.clans[player]&&S.clans[player].alive){const L=gen(S.clans[player].leader);log(`${G.CNK(player)}当主・${L?L.n:''}として、天下に名乗りを上げた。`,'big',[player]);}
  return S;}
 const sc=sc0;
 S={v:4,clockVersion:TKCalendar.version,castleEraPositionVersion:1,div:{},cnm:{},chron:[],hi:0,auto:false,sc:scId,t:0,y0:sc.year,m0:sc.month,player,castles:{},clans:{},gens:[],units:[],rel:{},ally:{},log:[],uid:1,over:null,flags:{},prisonQ:[],propQ:[],settings:{pauseOnAttack:true}};
 const owner={};for(const k in sc.owners)sc.owners[k].split(' ').forEach(id=>owner[id]=k);
 for(const c of G.CL){
  const k=owner[c.id];
  S.castles[c.id]={owner:k,troops:0,dur:c.dur,durMax:c.dur,koku:c.koku,kokuMax:Math.round(c.koku*1.6),shogyo:c.shogyo,shogyoMax:Math.round(c.shogyo*1.9),train:sc.train,morale:65,loyal:62,pool:c.koku*120,deleg:false};
 }
 for(const k in sc.owners){
  const ids=sc.owners[k].split(' ');
  const cap=sc.caps[k]||ids[0];
  S.clans[k]={gold:0,food:0,leader:null,cap,alive:true};
 }
 for(const cid in sc.gens){const k=owner[cid];sc.gens[cid].forEach(str=>{const [n,t,b,c,s,born]=str.split('|');
  const g={id:S.uid++,n,t:+t,b:+b,c:+c,s:+s,born:+born,clan:k,loc:cid,unit:null,busy:0,loyal:80+Math.floor(rnd()*20),ronin:false,prisoner:null,dead:false};
  S.gens.push(g);if(!S.clans[k].leader)S.clans[k].leader=g.id;});}
 for(const k in S.clans){const atCap=S.gens.find(g=>g.clan===k&&g.loc===S.clans[k].cap);if(atCap)S.clans[k].leader=atCap.id;const L=gen(S.clans[k].leader);if(L)L.loyal=100;}
 for(const c of G.CL){const st=S.castles[c.id],isCap=S.clans[st.owner].cap===c.id;
  st.troops=Math.round(c.koku*240*sc.mul*(isCap?1.5:1)/100)*100+800;
  if(sc.boost[c.id])st.troops+=sc.boost[c.id];}
 for(const k in S.clans){let g=0,f=0;for(const id of clanCastles(k)){g+=G.C[id].shogyo;f+=G.C[id].koku;}S.clans[k].gold=Math.round(g*2.2+300);S.clans[k].food=Math.round(f*1100+3000);}
 const keys=Object.keys(S.clans);
 for(let i=0;i<keys.length;i++)for(let j=i+1;j<keys.length;j++)S.rel[ekey(keys[i],keys[j])]=45;
 sc.allies.forEach(([a,b])=>{if(S.clans[a]&&S.clans[b]){S.ally[ekey(a,b)]=900;S.rel[ekey(a,b)]=80;}});
 sc.hostile.forEach(([a,b])=>{if(S.clans[a]&&S.clans[b])S.rel[ekey(a,b)]=12;});
 (sc.rel||[]).forEach(([a,b,v])=>{S.rel[ekey(a,b)]=v;});
 if(scId==='s1560'){S.cnm.nagao='長尾';}
 while(S.hi<TK.HIST.length&&evT(TK.HIST[S.hi])<0)S.hi++;
 S.cst={};S.ruins=[];S.forts={};S.plans={};S.works={};S.jpend=[];S.ji=0;G.syncCastles();
 while(S.ji<TK.JOKAKU.length&&evT(TK.JOKAKU[S.ji])<0){jApply(TK.JOKAKU[S.ji++],true);}
 S.jsig=G.jokakuSig();
 addShows(scId);
 if(S.clans[player]&&S.clans[player].alive){const L=gen(S.clans[player].leader);log(`${G.CNK(player)}当主・${L?L.n:''}として、天下に名乗りを上げた。`,'big',[player]);}
 return S;
};
// 配置図の始まりにすでに動いている軍勢
function addShows(scId){for(const x of (TK.SHOW||[])){if(x.scen!==scId)continue;const k=x.clan;if(!S.clans[k]||!S.clans[k].alive)continue;
 const from=S.castles[x.from]&&S.castles[x.from].owner===k?x.from:S.clans[k].cap;const path=x.path&&x.path[0]===from?x.path.slice():G.findPath(from,x.to,k,'any');if(!path||path.length<2)continue;
 let g=genByName(x.gen);if(g&&!freeGen(g))g=null;const u={id:S.uid++,clan:k,gens:g?[g.id]:[],troops:x.troops,troops0:x.troops,morale:85,train:70,food:x.troops*2,path,seg:Math.max(0,path.length-2-(x.back||0)),pos:x.pos||0,state:'march',mission:'show',enemy:null,origin:from,days:0,hist:true,spd:x.spd||1,until:x.until,depart:x.depart,arrive:x.arrive,routeNote:x.routeNote,stopAt:x.stopAt||.6};
 if(g)g.unit=u.id;
 S.units.push(u);}}
// 武将はいつも一か所：すでに別の軍勢にいる武将は新しい軍勢に入れない
function freeGen(g){return g&&!g.dead&&(g.unit==null||!S.units.some(v=>v.id===g.unit));}
G.freeGen=freeGen;
// 念のための見回り：軍勢と武将の記録が食い違っていたら直す
function fixGens(){const ids=new Set(S.units.map(u=>u.id));
 for(const u of S.units){u.gens=u.gens.filter(id=>{const g=gen(id);if(!g||g.dead)return false;if(g.unit==null||!ids.has(g.unit)){g.unit=u.id;return true;}return g.unit===u.id;});}
 for(const g of S.gens)if(g.unit!=null&&!ids.has(g.unit))g.unit=null;}
G.fixGens=()=>fixGens();
function dropUnits(f){for(const u of S.units)if(f(u))for(const id of u.gens){const g=gen(id);if(g&&g.unit===u.id){g.unit=null;if(!g.loc||!S.castles[g.loc]||S.castles[g.loc].owner!==g.clan)g.loc=S.clans[g.clan]?S.clans[g.clan].cap:g.loc;}}S.units=S.units.filter(u=>!f(u));}
// 新しい家へ移る武将を旧軍勢から外す。全指揮官が移る隊は入城先へ兵をまとめる。
// 数は既存モデルの兵を保存するための処理であり、史料上の実数を追加するものではない。
function transferClanGen(g,k,at){
 const u=S.units.find(x=>x.id===g.unit);if(u){u.gens=u.gens.filter(id=>id!==g.id);
  if(!u.gens.length&&S.castles[at]?.owner===k){S.castles[at].troops+=u.troops;dropUnits(x=>x===u);}}
 g.clan=k;g.loc=at;g.unit=null;g.ronin=false;g.prisoner=null;
}


/* ===== 参照 ===== */
function gen(id){return S.gens.find(g=>g.id===id);}G.gen=gen;
// 改名した人も同じ人として探す（木下秀吉＝羽柴秀吉＝豊臣秀吉 など）
function canonName(n){const A=TK.PORTRAIT_ALIAS||{};return A[n]||n;}
function genByName(n){if(!n)return null;const g=S.gens.find(g=>g.n===n&&!g.dead);if(g)return g;const c=canonName(n);return S.gens.find(g=>!g.dead&&canonName(g.n)===c)||null;}
G.genByName=n=>genByName(n);
function clanCastles(k){const r=[];for(const id in S.castles)if(S.castles[id].owner===k)r.push(id);return r;}G.clanCastles=clanCastles;
function clanGens(k){return S.gens.filter(g=>g.clan===k&&!g.dead&&!g.ronin&&g.prisoner===null);}G.clanGens=clanGens;
function clanTroops(k){let t=0;for(const id in S.castles)if(S.castles[id].owner===k)t+=S.castles[id].troops;for(const u of S.units)if(u.clan===k)t+=u.troops;return t;}G.clanTroops=clanTroops;
function clanKoku(k){let t=0;for(const id in S.castles)if(S.castles[id].owner===k)t+=S.castles[id].koku;return t;}G.clanKoku=clanKoku;
G.power=k=>clanTroops(k)+clanKoku(k)*250;
G.alive=()=>Object.keys(S.clans).filter(k=>S.clans[k].alive);
G.allied=(a,b)=>a===b||(S.ally[ekey(a,b)]||0)>0;
G.atWar=(a,b)=>a!==b&&S.war&&S.war[ekey(a,b)]!==undefined&&S.t-S.war[ekey(a,b)]<300&&!G.allied(a,b);
G.rel=(a,b)=>a===b?100:(S.rel[ekey(a,b)]??45);
G.addRel=(a,b,v)=>{if(a===b)return;const k=ekey(a,b);S.rel[k]=clamp((S.rel[k]??45)+v,0,100);};
G.castleGens=id=>S.gens.filter(g=>g.loc===id&&g.unit===null&&!g.dead&&!g.ronin&&g.prisoner===null&&g.clan===S.castles[id].owner);
G.idleGens=id=>G.castleGens(id).filter(g=>!g.busy&&!(g.tr&&S.t<g.tr.t1));
G.ronins=id=>S.gens.filter(g=>g.loc===id&&g.ronin&&!g.dead);
G.prisoners=k=>S.gens.filter(g=>g.prisoner===k&&!g.dead);
G.capOf=id=>G.C[id].koku*380+2500;
G.unitAt=id=>S.units.filter(u=>u.state==='siege'&&u.path[u.path.length-1]===id);
G.age=g=>G.date().y-g.born;
G.isLeader=g=>S.clans[g.clan]&&S.clans[g.clan].leader===g.id;
// 地形の効き目：山城は守りが固く、平城は攻めやすい
G.FOREIGN=['joseon','ming'];
G.CTYPE={山:{n:'山城',def:1.35,d:'険しい山の上。攻め手の損害が大きく、城は落ちにくい'},平山:{n:'平山城',def:1.15,d:'丘の上の城。ほどよく守りやすい'},平:{n:'平城',def:1,d:'平地の城。攻めやすいが、城下は栄えやすい'}};
G.ctype=id=>{const t=(TK.CTERR||{})[id];return G.CTYPE[t?t[2]:'平山'];};
function defStats(id){const gs=G.castleGens(id);let t=40,b=40,c=40;for(const g of gs){t=Math.max(t,g.t);b=Math.max(b,g.b);c=Math.max(c,g.c);}return {t,b,c};}
G.defStats=defStats;
G.frontier=function(id){const o=S.castles[id].owner;return G.ADJ[id].some(n=>{const k=S.castles[n].owner;return k!==o&&!G.allied(o,k);});};
// 要所の効き目：宿は味方の行軍を速め、関と橋は敵の行軍を遅らせ、湊は味方の船を速める
G.YOSHO_FX={関:{n:'関',fx:'敵の行軍を遅らせる（−20%）・関銭 月25'},宿:{n:'宿',fx:'味方の行軍が速い（+20%）・兵糧の消費が少ない'},湊:{n:'湊',fx:'味方の船が速い（+25%）・商い 月40'},橋:{n:'橋',fx:'味方は速く渡り（+15%）、敵は遅れる（−15%）'},
 金:{n:'金山',fx:'金 月90'},銀:{n:'銀山',fx:'金 月70（銀を売る）'},寺:{n:'寺社',fx:'その城の民忠が月+2（90まで）・寄進 月10・一揆が起きにくい'},
 鉄:{n:'鉄砲の産地',fx:'その城の兵の訓練が月+2（90まで）・鉄砲の売買 月20'},市:{n:'市・町',fx:'商い 月45'},馬:{n:'牧',fx:'その城の兵の訓練が月+1・味方の行軍が少し速い（+5%）'},
 城:{n:'支城',fx:'領内の本城の守りが+6%（支城が多いほど固い、最大+30%）・関銭 月10'}};
// 施設が働いている年か（金山は掘り始めから、焼かれた寺はその年まで）
G.yActive=y=>{const yr=G.date().y,periods=TK.SITE_ACTIVITY?.[y.id]||TK.SITE_ACTIVITY?.[y.n];if(periods)return periods.some(p=>(p.fromYear==null||yr>=p.fromYear)&&(p.toYear==null||yr<p.toYear));return (!y.y0||yr>=y.y0)&&(!y.y1||yr<y.y1);};
G.YINC={湊:40,関:25,宿:25,橋:25,金:90,銀:70,寺:10,鉄:20,市:45,馬:10,城:10};
// 支城：領内に持つ支城の数だけ、本城の守りが固くなる（1つにつき+6%、最大+30%）
G.branchDef=id=>{let n=0;for(const y of (G.YOSHO_AT&&G.YOSHO_AT[id]||[]))if(y.kind==='城'&&G.yActive(y)&&G.yOwner(y)===S.castles[id].owner)n++;return 1+Math.min(.3,n*.06);};
// 支城は本城の領域を共有するが、攻略後の支配と収入・防御は別に扱う。
G.yOwner=y=>{const base=S.castles[y.at]?.owner,b=S.branches?.[y.id];return b&&b.base===base&&S.clans[b.owner]?.alive?b.owner:base;};
G.branchOffer=function(key,k=S.player){const y=G.YOSHO.find(y=>y.id===key&&y.kind==='城');
 if(!y||!G.yActive(y)||!S.clans[k]?.alive)return {ok:false,msg:'いまは攻略できません。'};
 const owner=G.yOwner(y);if(owner===k||G.allied(k,owner))return {ok:false,msg:'自家や同盟国の支城は攻められません。'};
 if(S.branchSieges?.some(b=>b.id===key))return {ok:false,msg:'攻略中です。'};
 const sources=[y.at,...(G.ADJ[y.at]||[])].filter(id=>S.castles[id].owner===k&&S.castles[id].troops>=2000&&!G.unitAt(id).some(u=>u.clan!==k));
 sources.sort((a,b)=>S.castles[b].troops-S.castles[a].troops);
 if(!sources.length)return {ok:false,msg:'領内または隣接する自城に兵2,000以上が必要です。'};
 if(S.clans[k].food<600||S.clans[k].gold<200)return {ok:false,msg:'兵糧600・金200が必要です。'};
 return {ok:true,y,k,owner,from:sources[0],days:30,troops:1000,loss:200};
};
G.attackBranch=function(key,k=S.player){const r=G.branchOffer(key,k);if(!r.ok)return r;
 S.castles[r.from].troops-=r.troops;S.clans[r.k].food-=600;S.clans[r.k].gold-=200;
 S.branchSieges=S.branchSieges||[];S.branchSieges.push({id:key,clan:r.k,from:r.from,base:S.castles[r.y.at].owner,owner:r.owner,end:S.t+r.days,troops:r.troops,loss:r.loss});
 G.diverge(r.k,'branch');G.diverge(r.owner,'branch');G.chron({alt:true,title:r.y.n+'の攻略',text:`${G.CNK(r.k)}が兵千を送り、支城の攻略を始めた。`,d:G.date()},true);
 return {ok:true,msg:r.y.n+'の攻略を始めました（30日）。'};
};
G.branchDay=function(){S.branches=S.branches||{};for(const id of Object.keys(S.branches)){const y=G.YOSHO.find(y=>y.id===id),b=S.branches[id];if(!y||b.base!==S.castles[y.at]?.owner||!S.clans[b.owner]?.alive)delete S.branches[id];}if(!S.branchSieges)return;
 S.branchSieges=S.branchSieges.filter(b=>{const y=G.YOSHO.find(y=>y.id===b.id),base=y&&S.castles[y.at]?.owner;
 const valid=y&&G.yActive(y)&&S.clans[b.clan]?.alive&&base===b.base&&G.yOwner(y)===b.owner&&!G.allied(b.clan,b.owner)&&S.castles[b.from]?.owner===b.clan;
 if(valid&&S.t<b.end)return true;
 const dest=S.castles[b.from]?.owner===b.clan?b.from:G.clanCastles(b.clan)[0];
 if(dest&&S.clans[b.clan]?.alive)S.castles[dest].troops+=b.troops-(valid?b.loss:0);
 if(valid){S.branches[b.id]={owner:b.clan,base};G.chron({alt:true,title:y.n+'を攻略',text:`${G.CNK(b.clan)}が支城を押さえた。本城の領域は変わらない。兵二百を失い、残兵は帰還した。`,d:G.date()},true);}
 else if(y)G.chron({alt:true,title:y.n+'の攻略中止',text:'本城・出発地の支配や同盟が変わったため攻略を中止し、残兵は帰還先のある場合に帰還した。',d:G.date()},true);
 return false;});
};
// 史実の筋書きを離れた家のみ、月に一つまで支城攻略を判断する。
G.branchAI=function(k){if(!S.div[k]||!S.clans[k]?.alive||(k===S.player&&!S.auto)||S.branchSieges?.some(b=>b.clan===k))return;
 const candidates=G.YOSHO.filter(y=>y.kind==='城'&&G.yActive(y)&&G.yOwner(y)!==k&&G.branchOffer(y.id,k).ok);
 candidates.sort((a,b)=>Number(S.castles[b.at].owner===k)-Number(S.castles[a.at].owner===k));
 const y=candidates[0];if(y)G.attackBranch(y.id,k);
};
// 合戦ごとの史実の兵数（調べた通説の概数）。家の側を大将の家で見分ける
G.battleTroops=function(ev,k){const T=TK.BATTLE_TROOPS&&ev.title&&TK.BATTLE_TROOPS[ev.title];if(!T||T.skip)return null;
 const cap=v=>Math.min(120000,v);
 for(const sd of ['a','b']){const x=T[sd];if(!x||!x.tr)continue;const names=String(x.lead||'').split(/[・、,（()）\s]+/).filter(Boolean);
  const cls=[...new Set(names.map(n=>{const g=genByName(n);return g&&g.clan;}).filter(Boolean))];
  if(cls.includes(k)){const tot=cls.reduce((a,c)=>a+Math.max(1,G.power(c)),0);return cap(Math.round(x.tr*Math.max(1,G.power(k))/tot));}}
 if(ev.clan===k&&T.a&&T.a.tr)return cap(T.a.tr);return null;};
// 一つの合戦に同じ家から幾手も出るときは、その家の兵数を本隊6・別手4の割で分ける
G.splitTroops=function(ev,k,who){const side=G.battleTroops(ev,k);if(!side)return null;
 const subs=TK.HIST.filter(e=>e.k==='premarch'&&e.sub&&e.title===ev.title&&e.who).map(e=>genByName(e.who)).filter(g=>g&&g.clan===k&&(!who||g.id!==who.id||ev.sub));
 const n=subs.length;if(!n)return Math.round(side/100)*100;
 const mainEv=TK.HIST.find(e=>e.title===ev.title&&e.k!=='premarch');const mw=mainEv&&mainEv.who&&genByName(mainEv.who);const mainK=mainEv&&(mainEv.k==='take'?mainEv.clan:(mw&&mw.clan));
 const mainIsHere=!ev.sub;const r=mainK!==k?side/(n+(mainIsHere?1:0)):mainIsHere?side*.6:side*.4/n;return Math.max(500,Math.round(r/100)*100);};
G.yoshoOf=id=>(G.YOSHO||[]).filter(y=>y.at===id);G.YOSHO_AT={};for(const y of (G.YOSHO||[]))(G.YOSHO_AT[y.at]=G.YOSHO_AT[y.at]||[]).push(y);
G.monthIncome=function(k){let g=0,up=0;for(const id of clanCastles(k)){const c=S.castles[id];g+=c.shogyo*(.45+c.loyal/180);up+=c.troops*.07;}for(const y of (G.YOSHO||[]))if(S.castles[y.at]&&G.yOwner(y)===k&&G.yActive(y))g+=G.YINC[y.kind]??25;for(const u of S.units)if(u.clan===k)up+=u.troops*.07;for(const b of S.branchSieges||[])if(b.clan===k)up+=b.troops*.07;return {gold:Math.round(g),food:Math.round(up)};};

/* ===== 戦闘 ===== */
/* 軍の種別（史実の家風） */
G.ARMS={yari:{n:'足軽',k:'槍',m:1},kiba:{n:'騎馬',k:'騎',m:1.12},teppo:{n:'鉄砲',k:'鉄',m:1.1},ikki:{n:'門徒',k:'門',m:1.03},suigun:{n:'水軍',k:'船',m:1}};
G.armOf=function(u){if(u.path&&u.path.length>1){const a=u.path[Math.min(u.seg,u.path.length-2)],b=u.path[Math.min(u.seg+1,u.path.length-1)];const e=G.EDGES[ekey(a,b)];if(e&&e.sea&&u.state==='march')return 'suigun';}
 const k=u.clan,y=G.date().y;
 if(k==='takeda'||k==='nanbu')return 'kiba';
 if(k==='honganji')return 'ikki';
 if(k==='saika'||k==='shimazu'||(k==='oda'&&y>=1570)||k==='hashiba'||(k==='tokugawa'&&y>=1575)||(k==='otomo'&&y>=1576))return 'teppo';
 return 'yari';};
const armMul=u=>{const t=G.armOf(u);let m=G.ARMS[t].m;if(t==='teppo'&&G.date().y>=1575)m+=.06;return m;};

const pw=(tr,t,b,mor,train)=>Math.max(0,tr)*(.55+t/220+b/450)*(.55+mor/220)*(.75+train/400);
G.pw=pw;
function siegeDay(a,d,walls,tac){ // tac: chikara 力攻め / hyoro 包囲（兵糧攻めと内応）
 const P=pw(a.tr,a.t,a.b,a.mor,a.train),Q=pw(d.tr,d.t,d.b,d.mor,d.train);
 if(tac==='hyoro'){const ratio=Math.min(3,a.tr/Math.max(1,d.tr));return {dDur:0,dLoss:d.tr*(ratio<1?.0012:.0035+.003*ratio),aLoss:Q*.0015,dMor:ratio<1?.05:.15+.15*ratio,aMor:.06};}
 return {dDur:P*.014,dLoss:P*(walls?.0055:.032),aLoss:Q*(walls?.0115:.009),dMor:walls?.15:1.3,aMor:.13};
}
G.siegeStep=siegeDay;
G.TACTICS={chikara:{n:'力攻め',d:'城の堅さを削り、一気に攻め落とす。早いが損害が大きい'},hyoro:{n:'包囲',d:'城を囲んで兵糧を断ち、内応も誘う。時間はかかるが損害は少ない'}};
function choryakuRoll(u,at){const c=S.castles[at],ds=defStats(at);let cc=30;for(const id of u.gens){const g=gen(id);if(g)cc=Math.max(cc,g.c);}
 return clamp(.06+(cc-ds.c)/220+(55-c.loyal)/220+(Math.min(4,u.troops/Math.max(1,c.troops))-1)*.04,.02,.45);}
G.choryakuChance=(gs,at,tr)=>{const c=S.castles[at],ds=defStats(at);let cc=30;for(const g of gs)cc=Math.max(cc,g.c);return clamp(.06+(cc-ds.c)/220+(55-c.loyal)/220+(Math.min(4,tr/Math.max(1,c.troops))-1)*.04,.02,.45);};
G.simSiege=function(send,ga,castleId,extraDef,tac){
 const c=S.castles[castleId],ds=defStats(castleId);
 const a={tr:send,t:ga.t,b:ga.b,mor:ga.mor??70,train:ga.train};
 const d={tr:c.troops+(extraDef||0),t:ds.t,b:ds.b,mor:c.morale,train:c.train};
 let dur=c.dur,days=0;const a0=send;
 const tm=G.ctype(castleId).def*G.branchDef(castleId);
 while(days<240){days++;const w=dur>0,r=siegeDay(a,d,w,tac);r.dDur/=tm;r.dLoss/=tm;r.aLoss*=tm;dur-=r.dDur;d.tr-=r.dLoss;a.tr-=r.aLoss;a.mor-=r.aMor;d.mor-=r.dMor;
  if(d.tr<=0||d.mor<=8)return {win:true,days,left:Math.round(a.tr),loss:a0-a.tr};
  if(a.tr<a0*.3||a.mor<15)return {win:false,days,left:Math.round(a.tr),loss:a0-a.tr};}
 return {win:false,days,left:Math.round(a.tr),loss:a0-a.tr};
};
function unitStats(u){let t=30,b=30;for(const gid of u.gens){const g=gen(gid);if(g){t=Math.max(t,g.t);b=Math.max(b,g.b);}}return {t,b};}
G.unitStats=unitStats;

/* ===== 部隊 ===== */
G.findPath=function(from,to,k,through){ // through: 'own' 自領のみ / 'any'（よその領も通るが、自領・同盟・行き先の家の領を選んで通る）
 // 日数で重みをつけて最短を探す。よその家の領を通るのは大きく遠回り扱いにする
 const tgt=S.castles[to]&&S.castles[to].owner;
 const cost=(v)=>{const o=S.castles[v].owner;if(o===k||v===to||o===tgt)return 1;if(G.allied(k,o)||(S.vassal&&(S.vassal[k]===o||S.vassal[o]===k)))return 1.6;return 6;};
 const dist={[from]:0},prev={[from]:null},done=new Set();
 for(;;){let u=null,bd=Infinity;for(const x in dist)if(!done.has(x)&&dist[x]<bd){bd=dist[x];u=x;}if(u===null||u===to)break;done.add(u);
  for(const v of G.ADJ[u]){if(done.has(v))continue;const o=S.castles[v].owner;if(v!==to&&through==='own'&&o!==k)continue;if(v!==to&&through==='pass'&&o!==k&&!G.passOK(k,o,tgt))continue;
   const e=G.EDGES[ekey(u,v)];const w=(e?e.days:5)*(through==='own'?1:through==='pass'?(o===k||v===to?1:1.3):cost(v));const nd=bd+w;if(nd<(dist[v]??Infinity)){dist[v]=nd;prev[v]=u;}}}
 if(!(to in prev))return null;const p=[];for(let x=to;x!==null;x=prev[x])p.unshift(x);return p;
};
// 同盟国（臣従・主家を含む）の領内を通る許し：その家が攻め先と結んでおらず、こちらとの仲が悪くなければ通してくれる（その家は戦に加わらない）
G.passOK=(k,o,tgt)=>!!o&&o!==tgt&&o!==k&&(G.allied(k,o)||!!(S.vassal&&(S.vassal[k]===o||S.vassal[o]===k)))&&!(tgt&&G.allied(o,tgt))&&G.rel(k,o)>=40;
G.launch=function(k,from,to,gids,troops,food,mission,tac){
 const c=S.castles[from];gids=gids.filter(id=>freeGen(gen(id)));troops=Math.min(troops,c.troops);if(troops<100||!gids.length)return null;
 let path=(mission==='attack'||mission==='branch')?(G.ADJ[from].includes(to)?[from,to]:(G.findPath(from,to,k,'own')||G.findPath(from,to,k,'pass'))):G.findPath(from,to,k,'own');if(!path)return null;
 c.troops-=troops;S.clans[k].food-=food;
 const u={id:S.uid++,clan:k,gens:gids.slice(),troops,troops0:troops,morale:Math.round(c.morale*.6+40),train:c.train,food,path,seg:0,pos:0,state:'march',mission,enemy:null,origin:from,days:0,tac:tac||'chikara'};
 gids.forEach(id=>{const g=gen(id);g.unit=u.id;g.busy=1;});
 S.units.push(u);G.onSortie&&G.onSortie(u,to);
 const tk=S.castles[to].owner;
 if(mission==='attack'&&tk!==k){
  S.war=S.war||{};if(S.war[ekey(k,tk)]===undefined||S.t-S.war[ekey(k,tk)]>=300){const r=ekey(k,tk);S.rel[r]=Math.min(S.rel[r]??45,15);}S.war[ekey(k,tk)]=S.t;
  if(S.div[k]||k===S.player){G.diverge(k);G.diverge(tk);}
  if(G.allied(k,tk)){delete S.ally[ekey(k,tk)];log(`${G.CNK(k)}が${G.CNK(tk)}との同盟を破棄した。`,'dip',[k,tk]);for(const o of G.alive())if(o!==k&&o!==tk)G.addRel(o,k,-5);}
  S.rel[ekey(k,tk)]=Math.min(G.rel(k,tk),8);
  log(`${G.CNK(k)}の${gen(gids[0]).n}隊 ${fmt(troops)}、${G.cname(to)}へ進軍。`,'war',[k,tk]);
  if(tk===S.player&&G.onAttacked)G.onAttacked(u,to);
  if(tk===S.player&&k!==S.player&&S.t-(S.lastRaidEv||-999)>90&&troops>=4000){S.lastRaidEv=S.t;S.evQ=S.evQ||[];S.evQ.push({dyn:'raid',uid:u.id,to});}
 }
 return u;
};
const fmt=n=>Math.round(n).toLocaleString('ja-JP');G.fmt=fmt;
function nearestOwn(k,from){const q=[from],seen={[from]:1};while(q.length){const u=q.shift();if(S.castles[u].owner===k&&u!==from)return u;for(const v of G.ADJ[u])if(!seen[v]){seen[v]=1;q.push(v);}}return null;}
function retreat(u,why){
 const mid=u.state==='march'&&u.seg<u.path.length-1&&u.pos>0;
 const here=u.state==='march'?u.path[u.seg]:u.path[u.path.length-1];
 let dest=S.castles[u.origin].owner===u.clan?u.origin:nearestOwn(u.clan,here);
 if(!mid&&S.castles[here].owner===u.clan)dest=here;
 if(!dest){disband(u);return;}
 const path=G.findPath(here,dest,u.clan,'any');if(!path){disband(u);return;}
 u.state='march';u.mission='return';u.enemy=null;
 if(mid){u.path=[u.path[u.seg+1],...path];u.seg=0;u.pos=1-u.pos;return;}
 u.path=path;u.seg=0;u.pos=0;
 if(path.length===1)arrive(u);
}
G._retreat=retreat;
function disband(u){
 u.gens.forEach(id=>{const g=gen(id);if(!g)return;g.unit=null;const own=nearestOwn(u.clan,u.path[Math.min(u.seg,u.path.length-1)]);if(own)g.loc=own;else{g.ronin=true;g.clan=null;}});
 S.units=S.units.filter(x=>x!==u);
}
function bestC(u){let c=0;for(const id of u.gens){const g=gen(id);if(g)c=Math.max(c,g.c);}return c;}
function startBattle(u,v){u.state=v.state='battle';u.enemy=v.id;v.enemy=u.id;u.kishu=v.kishu=0;
 const e=G.EDGES[ekey(u.path[u.seg],u.path[Math.min(u.seg+1,u.path.length-1)])];
 const cu=bestC(u),cv=bestC(v),bonus=e&&e.rough>.15?8:4;
 if(cu-cv+bonus>=6&&rnd()<.25+(cu-cv+bonus)/30){u.kishu=4;log(`${gen(u.gens[0]).n}隊が奇襲をしかけた！`,'big',[u.clan,v.clan]);}
 else if(cv-cu+bonus>=6&&rnd()<.25+(cv-cu+bonus)/30){v.kishu=4;log(`${gen(v.gens[0]).n}隊が奇襲をしかけた！`,'big',[u.clan,v.clan]);}
 if(!u.hist&&!v.hist&&(u.clan===S.player||v.clan===S.player)&&!(S.settings&&S.settings.battleScene===false)){u.bq=v.bq=1;S.battleQ=S.battleQ||[];S.battleQ.push({a:u.clan===S.player?u.id:v.id,b:u.clan===S.player?v.id:u.id});}
 G.onBattle&&G.onBattle(u,v);}
/* ===== 合戦（陣形と策を選ぶ野戦） ===== */
G.FORMS={kakuyoku:{n:'鶴翼',d:'翼を広げて包み込む。数で勝るとき強い',beats:'gyorin'},gyorin:{n:'魚鱗',d:'鱗のように重ねて中央を突く。寡兵で強い',beats:'hoshi'},hoshi:{n:'鋒矢',d:'矢のように一点を貫く。鶴翼の薄い中央を破る',beats:'kakuyoku'},houen:{n:'方円',d:'円く固めて守る。損害は小さいが押し切れない'}};
G.SAKU={shomen:{n:'正面から当たる',d:'力と数で押す'},kishu:{n:'奇襲を狙う',d:'知略と地形しだい。当たれば大きいが、外れれば痛手'},hiku:{n:'兵を引く',d:'戦わずに退く。わずかな損害で済む'}};
G.battleInfo=function(aId,bId){const a=S.units.find(x=>x.id===aId),b=S.units.find(x=>x.id===bId);if(!a||!b)return null;
 const e=G.EDGES[ekey(a.path[Math.min(a.seg,a.path.length-1)],a.path[Math.min(a.seg+1,a.path.length-1)])];
 const sa=unitStats(a),sb=unitStats(b);return {a,b,sa,sb,ca:bestC(a),cb:bestC(b),rough:e?e.rough:0,river:!!(e&&e.river),rain:(a.brain??(a.brain=b.brain=rnd()<.18))};};
G.resolveBattle=function(aId,bId,fa,ta){const I=G.battleInfo(aId,bId);if(!I)return null;const {a,b}=I;
 const fbList=Object.keys(G.FORMS);const ratio=b.troops/Math.max(1,a.troops);
 let fb=ratio>1.3?'kakuyoku':ratio<.8?(rnd()<.5?'gyorin':'hoshi'):fbList[Math.floor(rnd()*4)];
 const tb=I.cb>=75&&rnd()<.35?'kishu':(b.troops<a.troops*.45&&rnd()<.6?'hiku':'shomen');
 const fm=(f,o,r)=>{let m=1;if(G.FORMS[f].beats===o)m*=1.2;if(G.FORMS[o].beats===f)m*=.85;if(f==='kakuyoku'&&r>1.3)m*=1.1;if((f==='gyorin'||f==='hoshi')&&r<.8)m*=1.12;if(f==='houen')m*=.88;return m;};
 const rA=a.troops/Math.max(1,b.troops),rB=1/rA;
 const res={armA:G.armOf(a),armB:G.armOf(b),rough:I.rough,fa,ta,fb,tb,rounds:[],a0:a.troops,b0:b.troops,ga:(gen(a.gens[0])||{}).n,gb:(gen(b.gens[0])||{}).n,rain:I.rain,river:I.river};
 if(ta==='hiku'||tb==='hiku'){const w=ta==='hiku'?a:b;const loss=Math.round(w.troops*.08);w.troops-=loss;res.rounds.push({la:ta==='hiku'?loss:0,lb:tb==='hiku'?loss:0,txt:(ta==='hiku'?'こちらは兵を引いた。':'敵は兵を引いた。')});res.end=ta==='hiku'?'retreatA':'retreatB';
  a.bq=b.bq=0;a.enemy=b.enemy=null;if(ta==='hiku'){retreatUnit(a);b.state=b.seg>=b.path.length-1?'siege':'march';}else{retreatUnit(b);a.state=a.seg>=a.path.length-1?'siege':'march';}return res;}
 let kA=0,kB=0;
 if(ta==='kishu'){const p=clamp(.25+(I.ca-I.cb)/90+I.rough*.6+(I.rain?.15:0),.06,.8);res.kishuA=rnd()<p;res.pA=p;}
 if(tb==='kishu'){const p=clamp(.25+(I.cb-I.ca)/90+I.rough*.6+(I.rain?.15:0),.06,.8);res.kishuB=rnd()<p;}
 for(let r=0;r<3;r++){const P=pw(a.troops,I.sa.t,I.sa.b,a.morale,a.train)*armMul(a)*fm(fa,fb,rA),Q=pw(b.troops,I.sb.t,I.sb.b,b.morale,b.train)*armMul(b)*fm(fb,fa,rB);
  let lb=P*.085*(.85+rnd()*.3),la=Q*.085*(.85+rnd()*.3);
  // 兵の主力の相性：鉄砲は緒戦に強いが雨に弱い。騎馬は開けた地で強く、山や川では鈍る。鉄砲は騎馬の突撃を挫く
  const am=(arm,oarm,r)=>{let m=1;if(arm==='teppo'){m*=I.rain?.72:(r===0?1.35:1.05);if(oarm==='kiba'&&!I.rain)m*=1.12;}if(arm==='kiba'){m*=I.rough<.08&&!I.river?1.15:.9;}if(arm==='ikki')m*=r===2?1.1:1;return m;};
  lb*=am(res.armA,res.armB,r);la*=am(res.armB,res.armA,r);
  if(r===0){if(res.kishuA)lb*=2.6;else if(ta==='kishu')la*=1.5;if(res.kishuB)la*=2.6;else if(tb==='kishu')lb*=1.5;}
  if(I.river){la*=1.08;}
  if(fa==='houen'){la*=.7;lb*=.85;}if(fb==='houen'){lb*=.7;la*=.85;}
  la=Math.min(a.troops-1,Math.round(la));lb=Math.min(b.troops-1,Math.round(lb));a.troops-=la;b.troops-=lb;
  a.morale=Math.max(0,a.morale-la/Math.max(1,a.troops)*170-(r===0&&res.kishuB?25:0));b.morale=Math.max(0,b.morale-lb/Math.max(1,b.troops)*170-(r===0&&res.kishuA?25:0));
  const ra=a.troops<res.a0*.35||a.morale<20,rb=b.troops<res.b0*.35||b.morale<20;res.rounds.push({la,lb,ma:Math.round(a.morale),mb:Math.round(b.morale)});
  if(ra||rb){res.end=ra&&rb?(a.troops>b.troops?'winA':'winB'):ra?'winB':'winA';break;}}
 if(!res.end){const sa=a.troops*(a.morale+10),sb=b.troops*(b.morale+10);res.end=sa>sb*1.3?'winA':sb>sa*1.3?'winB':'draw';}
 a.bq=b.bq=0;
 if(res.end==='winA'){b.morale=5;}else if(res.end==='winB'){a.morale=5;}
 return res;};
function retreatUnit(u){u.state='march';u.enemy=null;retreat(u);}

function deathCheck(lose,win){
 for(const id of lose.gens.slice()){const g=gen(id);if(!g)continue;const p=(lose.troops<lose.troops0*.2?.16:.05)*(win.kishu>0?2.2:1);
  if(rnd()<p){g.dead=true;lose.gens=lose.gens.filter(x=>x!==id);log(`${G.CNK(g.clan)}の${g.n}、討死。`,'big',[g.clan,win.clan]);
   if(S.clans[g.clan]&&S.clans[g.clan].leader===g.id)succession(g.clan,g);}}
}
function arrive(u){
 const at=u.path[u.path.length-1],c=S.castles[at];
 if(u.branch&&u.mission==='attack'){G.branchArrive(u);return;}
 if(c.owner===u.clan){
  const besiegers=S.units.filter(v=>v.state==='siege'&&v.path[v.path.length-1]===at&&v.clan!==u.clan);
  if(besiegers.length&&u.mission!=='return'){startBattle(u,besiegers[0]);log(`${G.CNK(u.clan)}の援軍が${G.cname(at)}を囲む${G.CN(besiegers[0].clan)}軍に襲いかかった。`,'war',[u.clan,besiegers[0].clan]);return;}
  if(!u.histRet){c.troops+=u.troops;S.clans[u.clan].food+=Math.max(0,u.food);}
  u.gens.forEach(id=>{const g=gen(id);if(!g||g.unit!==u.id)return;g.unit=null;if(g.clan===u.clan)g.loc=at;});
  S.units=S.units.filter(x=>x!==u);
  return;
 }
 // 帰る・移るだけの軍勢は、途中で城の持ち主が替わっていたら攻めずに別の自分の城へ向かう
 if(u.mission==='return'||u.mission==='move'){const d=nearestOwn(u.clan,at);if(!d){disband(u);return;}const p=G.findPath(at,d,u.clan,'any');if(!p){disband(u);return;}u.path=p;u.seg=0;u.pos=0;u.state='march';u.mission='return';u.origin=d;return;}
 if(G.allied(u.clan,c.owner)&&!u.hist){retreat(u);return;}
 if(u.hist&&G.allied(u.clan,c.owner))delete S.ally[ekey(u.clan,c.owner)];
 u.state='siege';
 callRelief(at,u);
}
// 後詰め：囲まれた城へ、隣の味方の城から援軍を出す（史実の筋書きを離れた家のみ）
function callRelief(at,u){const o=S.castles[at].owner;if(!S.div[o])return;if(o===S.player&&S.settings&&S.settings.relief===false)return;
 const enemy=S.units.filter(v=>v.state==='siege'&&v.path[v.path.length-1]===at&&v.clan!==o).reduce((s,v)=>s+v.troops,0);
 let sent=0;for(const n of G.ADJ[at]){const nc=S.castles[n];if(nc.owner!==o&&!G.allied(nc.owner,o))continue;if(G.unitAt(n).length)continue;if(S.units.some(x=>x.clan===nc.owner&&x.mission==='move'&&x.path[x.path.length-1]===at))continue;
  if(nc.troops<3000||S.clans[nc.owner].cap===n&&nc.troops<6000)continue;const g=G.bestFor(n,'t');if(!g||G.isLeader(g)&&nc.owner!==S.player)continue;
  const send=Math.floor(nc.troops*(nc.owner===o?.4:.25)/100)*100;if(send<1000)continue;
  if(G.launch(nc.owner,n,at,[g.id],send,send*.012*30,'move')){sent+=send;if(nc.owner===S.player||o===S.player)log(`${G.cname(n)}から${man(send)}の後詰めが${G.cname(at)}へ向かった。`,'war',[nc.owner]);}
  if(sent>enemy*.8)break;}}
const man=n=>n>=10000?(Math.round(n/1000)/10)+'万':String(Math.round(n));

function capture(u,at){
 const c=S.castles[at],old=c.owner,k=u.clan;
 c.owner=k;c.troops=Math.round(u.hist?Math.min(u.troops*.5,G.capOf(at)):u.troops);c.dur=Math.max(c.dur,c.durMax*.15);c.loyal=Math.max(20,c.loyal-15);c.morale=Math.max(40,u.morale);c.deleg=false;
 S.clans[k].food+=Math.max(0,u.food);
 u.gens.forEach(id=>{const g=gen(id);g.unit=null;g.loc=at;});
 S.units=S.units.filter(x=>x!==u);
 log(`${G.CNK(k)}が${G.cname(at)}を攻め落とした。`,'war',[k,old]);
 if(!u.hist&&(u.tac||'chikara')==='chikara'&&rnd()<.2){S.cst=S.cst||{};const o=S.cst[at]=S.cst[at]||{};o.n=G.cname(at);o.burnt=true;o.bm=0;c.dur=Math.round(c.dur*.4);c.shogyo=Math.round(c.shogyo*.8);log(`力攻めの末、${G.cname(at)}は炎に包まれた。`,'war',[k,old]);}
 if(!u.hist){c.loyal=Math.max(10,c.loyal-12);const seen=new Set();for(const n of G.ADJ[at]){const j=S.castles[n].owner;if(j!==k&&j!==old&&!seen.has(j)){seen.add(j);G.addRel(k,j,-4);}}}
 // 城内の武将
 const inside=S.gens.filter(g=>g.loc===at&&g.clan===old&&g.unit===null&&!g.dead&&g.prisoner===null&&!g.ronin);
 const rest=clanCastles(old);
 for(const g of inside){
  const esc=rest.length&&(u.hist||(G.isLeader(g)?.92:.5)>rnd());
  if(esc){g.loc=nearestOwn(old,at)||rest[0];}
  else{g.prisoner=k;g.loc=at;}
 }
 if(S.clans[old].cap===at&&rest.length){rest.sort((a,b)=>G.C[b].koku-G.C[a].koku);S.clans[old].cap=rest[0];}
 // 他の部隊の扱い
 for(const v of S.units.slice()){
  if(v.path[v.path.length-1]===at&&v.clan===old&&v.state!=='siege'){if(v.state==='march'){v.mission='attack';}}
  if(v.path[v.path.length-1]===at&&v.state==='siege'&&v.clan!==k){if(G.allied(v.clan,k))retreat(v);}
 }
 if(!rest.length)destroy(old,k);
 const pris=G.prisoners(k).filter(g=>g.loc===at);
 if(pris.length){if(k===S.player)S.prisonQ.push(at);else aiPrisoners(k,pris);}
 if(old===S.player&&G.onLost)G.onLost(at,k);
 checkOver();
}
function destroy(k,by){
 S.clans[k].alive=false;
 log(`${G.CNK(k)}、滅亡。`,'big',[k,by]);
 for(const u of S.units.slice())if(u.clan===k)disband(u);
 for(const g of S.gens)if(g.clan===k&&!g.dead){if(g.prisoner===null){g.ronin=true;g.clan=null;g.unit=null;}}
 for(const key in S.ally)if(key.split('|').includes(k))delete S.ally[key];
 G.onDestroy&&G.onDestroy(k,by);
}
function aiPrisoners(k,pris){for(const g of pris){if(!G.isLeader(g)&&rnd()<.55){g.clan=k;g.prisoner=null;g.loyal=55+Math.floor(rnd()*20);g.busy=1;}else{release(g);}}}
function release(g){g.prisoner=null;const home=g.clan&&S.clans[g.clan]&&S.clans[g.clan].alive?clanCastles(g.clan):[];if(home.length){g.loc=S.clans[g.clan].cap||home[0];}else{g.ronin=true;g.clan=null;}}
G.release=release;
function absorb(k,j){
 for(const id of clanCastles(j))S.castles[id].owner=k;
 for(const g of S.gens)if(g.clan===j&&!g.dead){g.clan=k;g.loyal=Math.min(g.loyal,70);}
 for(const u of S.units)if(u.clan===j)u.clan=k;
 S.clans[j].alive=false;
 for(const key in S.ally)if(key.split('|').includes(j))delete S.ally[key];
 log(`${G.CNK(j)}が${G.CNK(k)}に臣従した。`,'big',[k,j]);
 G.onDestroy&&G.onDestroy(j,k);
 checkOver();
}
G.absorb=absorb;
G.hasUnifiedJapan=()=>!G.FOREIGN.includes(S.player)&&G.alive().filter(k=>!G.FOREIGN.includes(k)).length===1&&G.alive().filter(k=>!G.FOREIGN.includes(k))[0]===S.player;
function checkOver(){
 if(S.over)return;if(G.retainer())return;
 if(!clanCastles(S.player).length){if(!S.div[S.player]){S.extinct=1;return;}S.over='lose';G.onOver&&G.onOver();}
 else if(G.hasUnifiedJapan()){S.over='win';G.onOver&&G.onOver();}
}
G.checkOver=checkOver;

/* ===== 1日の進行 ===== */
// 武将の居場所が（軍勢を率いずに）遠くへ変わったら、道中を旅させる
// 史実の戦の続く間は、国境を敵対として示す
function histWars(){if(!TK.HWARS)return;const t=S.t;S.war=S.war||{};
 for(const w of TK.HWARS){const t0=evT({d:w[2]}),t1=evT({d:w[3]});if(t<t0||t>t1)continue;const a=w[0],b=w[1];
  if(!S.clans[a]||!S.clans[b]||!S.clans[a].alive||!S.clans[b].alive||S.div[a]||S.div[b])continue;if(G.allied(a,b))continue;
  if(S.arcs&&S.arcs.some(x=>t>=x.t0&&t<=x.t1&&(x.clans.includes(a)||x.clans.includes(b))))continue;
  const r=ekey(a,b);S.war[r]=t;if((S.rel[r]??45)>15)S.rel[r]=15;}}
G.histWars=()=>histWars();
function trackMoves(){if(G.trackContinuousMoves){G.trackContinuousMoves();return;}for(const g of S.gens){if(g.dead){g.ll=null;continue;}
  // 軍勢が解かれた時は、軍勢がいた所から居城まで歩いて帰る（一瞬で戻らないように）
  if(g.unit!=null){const u=S.units.find(x=>x.id===g.unit);if(u)g.lc=u.path[Math.min(u.seg+(u.pos>.5?1:0),u.path.length-1)];}
  else if(g.lu)g.ll=(g.lc&&G.C[g.lc]&&g.prisoner==null)?g.lc:g.loc;
  if(g.unit==null)g.lc=null;
  if(g.ll&&g.ll!==g.loc&&g.unit==null&&G.C[g.ll]&&G.C[g.loc]&&g.prisoner==null){const A=G.C[g.ll],B=G.C[g.loc];const d=Math.hypot(A.x-B.x,A.y-B.y);
   if(d>24){const p=G.findPath(g.ll,g.loc,g.clan,'any')||[g.ll,g.loc];let L=0;for(let i=0;i<p.length-1;i++){const a=G.C[p[i]],b=G.C[p[i+1]];const line=G.edgeGeo(p[i],p[i+1]);L+=line.slice(1).reduce((n,v,j)=>n+Math.hypot(v[0]-line[j][0],v[1]-line[j][1]),0);}g.tr={p,t0:S.t,t1:S.t+Math.max(2,Math.round(L/50))};}}
  else if(g.tr&&S.t>=g.tr.t1)g.tr=null;
  g.ll=g.loc;g.lu=g.unit!=null;}}
G.inTransit=g=>!!(g&&g.tr&&S.t<g.tr.t1);
G.day=function(){
 if(S.over)return;
 fixGens();trackMoves();
 const unitsAtDayStart=new Set(S.units);
 S.t++;G.branchDay();
 if(S.t%5===0)histWars();
 const d=G.date();
 // 史実イベント
 G.hist();G.jokaku();G.events&&G.events();
 // 記録された長期の包囲・行軍を一律160日で消さない。未解消の古い表示だけを整理する。
 dropUnits(u=>u.mission==='show'&&u.days>160&&!(u.releaseAt>=S.t)&&!TK.HIST.some(e=>e.title===u.until&&evT(e)>=S.t));
 // 行軍
 for(const u of S.units.slice()){
  if(!S.units.includes(u)||!unitsAtDayStart.has(u))continue; // この日に生成された軍には、まだ一日分の経過がない。
  u.days++;if(u.state==='march')u.marchDays=(u.marchDays||0)+1;
  {const a=u.path[u.seg],b=u.path[Math.min(u.seg+1,u.path.length-1)],e=G.EDGES[ekey(a,b)];u.food-=u.troops*.012*(e&&G.yoshoEffects?G.yoshoEffects(u,a,b,e).food:1);}
  if(u.food<0){u.food=0;u.morale-=3;}
  if(G.scheduleHistorical&&G.scheduleHistorical(u))continue;
  if(u.state==='march'){
   const a=u.path[u.seg],b=u.path[u.seg+1];
   if(b===undefined){arrive(u);continue;}
   const e=G.EDGES[ekey(a,b)];
   const snowSlow=G.marchFactors?G.marchFactors(u,a,b).speed:(d.m===12||d.m<=2)&&(G.C[a].snow||G.C[b].snow)?.45:1;
   u.pos+=snowSlow/e.days*(u.spd||1);
   if(u.mission==='show'&&u.seg>=u.path.length-2&&u.pos>=(u.stopAt||.6)){u.pos=u.stopAt||.6;u.state='camp';continue;}
   if(u.seg===u.path.length-2&&u.pos>=.86&&u.pos<1){const o=S.castles[b].owner;if(o!==u.clan&&!G.allied(o,u.clan))u.pos=1;}
   if(u.pos>=1){u.rivX=!!e.river;u.pos=0;u.seg++;
    if(u.seg>=u.path.length-1){arrive(u);continue;}
    const mid=u.path[u.seg],mo=S.castles[mid].owner;
    if(!u.hist&&mo!==u.clan&&!G.allied(mo,u.clan)){u.path=u.path.slice(0,u.seg+1);u.seg=u.path.length-1;arrive(u);continue;}
   }
  }
 }
 // 野戦の発生（同じ道ですれ違う敵）
 for(const u of S.units){if(u.state!=='march')continue;const a=u.path[u.seg],b=u.path[u.seg+1];
  for(const v of S.units){if(v===u||v.state!=='march'||v.clan===u.clan||G.allied(u.clan,v.clan))continue;if((u.hist||v.hist)&&!S.div[u.clan]&&!S.div[v.clan])continue;
   const va=v.path[v.seg],vb=v.path[v.seg+1];
   if(va===b&&vb===a&&u.pos+v.pos>=1){startBattle(u,v);log(`${G.CNK(u.clan)}と${G.CNK(v.clan)}の軍勢が${G.cname(a)}と${G.cname(b)}の間で激突。`,'war',[u.clan,v.clan]);break;}}}
 // 野戦
 for(const u of S.units.slice()){
  if(u.state!=='battle'||!S.units.includes(u))continue;const v=S.units.find(x=>x.id===u.enemy);
  if(!v){u.state=u.path.length-1>u.seg?'march':'siege';if(u.state==='siege'&&S.castles[u.path[u.path.length-1]].owner===u.clan)arrive(u);continue;}
  if(u.id>v.id)continue;
  if(u.bq||v.bq)continue;
  const su=unitStats(u),sv=unitStats(v);
  const P=pw(u.troops,su.t,su.b,u.morale,u.train)*armMul(u),Q=pw(v.troops,sv.t,sv.b,v.morale,v.train)*armMul(v);
  const lu=Q*.04*(.85+rnd()*.3)*(v.kishu>0?2.6:1),lv=P*.04*(.85+rnd()*.3)*(u.kishu>0?2.6:1);
  if(u.kishu>0)u.kishu--;if(v.kishu>0)v.kishu--;
  u.troops-=lu;v.troops-=lv;u.morale-=lu/Math.max(1,u.troops)*70;v.morale-=lv/Math.max(1,v.troops)*70;
  const ru=u.troops<u.troops0*.3||u.morale<15,rv=v.troops<v.troops0*.3||v.morale<15;
  if(ru||rv){
   const win=ru?v:u,lose=ru?u:v;
   log(`野戦で${G.CNK(win.clan)}が勝利（${G.CNK(lose.clan)}の${gen(lose.gens[0])?.n||''}隊が敗走）。`,'war',[u.clan,v.clan]);
   win.enemy=null;lose.enemy=null;deathCheck(lose,win);
   win.state=(win.seg<win.path.length-1)?'march':'siege';
   if(win.state==='siege'){const at=win.path[win.path.length-1];if(S.castles[at].owner===win.clan)arrive(win);}
   if(lose.gens.length)retreat(lose);else disband(lose);
  }
 }
 // 攻城
 for(const u of S.units.slice()){
  if(u.state!=='siege'||!S.units.includes(u))continue;
  const at=u.path[u.path.length-1],c=S.castles[at];
  if(c.owner===u.clan){arrive(u);continue;}
  if(G.allied(c.owner,u.clan)&&!u.hist){retreat(u);continue;}
  if(u.hist&&!S.div[c.owner]){u.sd=(u.sd||0)+1;c.dur=Math.max(0,c.dur-c.durMax/4);if(u.sd>=3)capture(u,at);continue;}
  const ds=defStats(at),su=unitStats(u);
  const tac=u.tac||'chikara';
  const r=siegeDay({tr:u.troops,t:su.t,b:su.b,mor:u.morale,train:u.train},{tr:c.troops,t:ds.t,b:ds.b,mor:c.morale,train:c.train},c.dur>0,tac);
  {const tm=G.ctype(at).def*G.branchDef(at)*(u.rivX?1.1:1);r.dDur/=tm;r.dLoss/=tm;r.aLoss*=tm;}
  c.dur=Math.max(0,c.dur-r.dDur);c.troops=Math.max(0,c.troops-r.dLoss);u.troops-=r.aLoss;u.morale-=r.aMor;c.morale=Math.max(0,c.morale-r.dMor);
  u.sday=(u.sday||0)+1;
  if(tac==='hyoro'&&u.sday%15===0&&rnd()<choryakuRoll(u,at)*.5){log(`包囲された${G.cname(at)}の城内で内応が起き、${G.CNK(u.clan)}に開城した。`,'big',[u.clan,c.owner]);c.troops=Math.round(c.troops*.6);const keep=c.troops;capture(u,at);S.castles[at].troops+=keep;continue;}
  if(c.troops<=0||c.morale<=8){capture(u,at);continue;}
  if(u.troops<u.troops0*.3||u.morale<15){log(`${G.CNK(u.clan)}の${G.cname(at)}攻めは失敗に終わった。`,'war',[u.clan,c.owner]);retreat(u);}
 }
 if(d.d===1)G.month();
 if(d.d===16)for(const k of G.alive())if(S.div[k]&&(k!==S.player||S.auto))aiMilitary(k,.45);
};
function runEvent(ev){
 const k=ev.clan;if(!S.clans[k]||!S.clans[k].alive||S.castles[ev.from].owner!==k)return;
 const showOnly=k===S.player;if(showOnly){S.castles[ev.from].troops+=Math.round(ev.troops*.6);}
 if(!showOnly&&S.castles[ev.to].owner!==k){
  const gids=ev.gens.map(n=>genByName(n)).filter(g=>g&&g.clan===k&&g.unit===null&&g.prisoner===null).map(g=>{g.loc=ev.from;return g.id;});
  if(gids.length){S.castles[ev.from].troops+=ev.troops;S.clans[k].food+=ev.troops*.012*70;G.launch(k,ev.from,ev.to,gids,ev.troops,ev.troops*.012*70,'attack');}
 }
 G.onEvent&&G.onEvent(ev,showOnly);
}

/* ===== 月の処理 ===== */
// 天下人の総攻め：臣従を拒んだ家とその味方へ、数か月おきに幾手もの大軍を差し向ける（従う諸大名も兵を出す）
G.declareHunt=function(by,targets,o){o=o||{};if(!S.clans[by]||!S.clans[by].alive)return;S.hunts=S.hunts||[];if(S.hunts.some(h=>h.by===by&&h.tg.some(x=>targets.includes(x))))return;
 S.hunts.push({by,tg:targets.slice(),t1:S.t+(o.years||8)*360,next:S.t+(o.first||45),wave:0,name:o.name||'征伐',base:o.troops||30000});
 for(const k of targets){S.war=S.war||{};S.war[ekey(by,k)]=S.t;S.rel[ekey(by,k)]=Math.min(S.rel[ekey(by,k)]??45,5);delete S.ally[ekey(by,k)];}};
function huntTick(){if(!S.hunts||!S.hunts.length)return;
 S.hunts=S.hunts.filter(h=>{const by=S.clans[h.by];if(!by||!by.alive||S.t>h.t1)return false;
  // 狙う家：はじめの相手と、いまその味方の家
  const tg=new Set(h.tg.filter(k=>S.clans[k]&&S.clans[k].alive&&!G.allied(h.by,k)));const bord=(a,b)=>clanCastles(a).some(id=>G.ADJ[id].some(n=>S.castles[n].owner===b));for(const k of [...tg])for(const j of G.alive())if(j!==h.by&&!G.FOREIGN.includes(j)&&!tg.has(j)&&(S.ally[ekey(j,k)]||0)>0&&!G.allied(j,h.by)&&bord(j,k))tg.add(j);
  if(!tg.size)return false;if(S.t<h.next)return true;if(h.by===S.player&&!S.auto)return true; // 天下人が自分なら、攻めるかどうかは自分で決める
  h.wave++;h.next=S.t+120+Math.floor(rnd()*60);
  const helpers=G.alive().filter(j=>j!==h.by&&!tg.has(j)&&j!==S.player&&(G.allied(j,h.by)||(S.vassal&&S.vassal[j]===h.by)||(S.hegemon===h.by)));
  const fronts=[];for(const id in S.castles){const c=S.castles[id];if(!tg.has(c.owner))continue;for(const n of G.ADJ[id]){const o=S.castles[n].owner;if(o===h.by||helpers.includes(o))fronts.push({to:id,from:n,k:o,v:G.C[id].koku+(S.clans[c.owner].cap===id?20:0)+(c.owner===S.player?6:0)+rnd()*8});}}
  fronts.sort((a,b)=>b.v-a.v);const usedT={},usedF={};let n=0,tot=0;const maxM=2+Math.min(2,h.wave);
  for(const f of fronts){if(n>=maxM||tot>=150000)break;if(usedT[f.to]||usedF[f.from])continue;const main=f.k===h.by;if(!main&&n>=1&&rnd()<.4)continue;
   const tr=Math.round((main?h.base*(1+.12*Math.min(4,h.wave-1)):Math.max(6000,G.clanTroops(f.k)*.3))/1000)*1000;
   let L=G.bestFor(f.from,'t');if(!L){L=S.gens.filter(g=>g.clan===f.k&&!g.dead&&g.unit===null&&g.prisoner===null&&!G.isLeader(g)&&g.loc&&G.ADJ[g.loc]&&(g.loc===f.from||G.ADJ[g.loc].includes(f.from))).sort((a,b)=>b.t-a.t)[0];if(L)L.loc=f.from;}
   if(!L)continue;S.castles[f.from].troops+=tr;S.clans[f.k].food+=tr*1.2;
   G.diverge(f.k);const u=G.launch(f.k,f.from,f.to,[L.id],tr,tr*1.1,'attack',S.castles[f.to].dur>1500?'hyoro':'chikara');if(!u){S.castles[f.from].troops-=tr;continue;}
   usedT[f.to]=usedF[f.from]=1;n++;tot+=tr;}
  if(n){const ts=[...tg];const L=gen(by.leader);G.chron({title:`${G.CN(h.by)}の${h.name}（第${h.wave}陣）`,alt:1,big:h.wave===1||ts.includes(S.player),text:`${L?L.n:G.CNK(h.by)}は、従わぬ${ts.map(k=>G.CN(k)).join('・')}を討つため、${n}手 ${Math.round(tot/1000)/10}万の軍勢を差し向けた。`,who:L&&L.n,d:[G.date().y,G.date().m,G.date().d]},true);}
  return true;});}
G.huntTick=()=>huntTick();
G.month=function(){
 const d=G.date();huntTick();
 if(S.war)for(const r in S.war){if(S.t-S.war[r]<300&&S.rel[r]>5)S.rel[r]=Math.max(5,S.rel[r]-2);}
 if(d.m===1)aging();
 for(const id in (S.cst||{})){const o=S.cst[id];if(!o.burnt)continue;const c=S.castles[id];if(G.unitAt(id).length)continue;o.bm=(o.bm||0)+1;c.dur=Math.min(c.durMax,c.dur+c.durMax*.05);
  if(o.bm>=18&&c.dur>=c.durMax*.8){o.burnt=false;o.bm=0;log(`${G.cname(id)}の再建が終わった。`,c.owner===S.player?'big':'',[c.owner]);if(c.owner===S.player)G.chron({title:G.cname(id)+'の再建',text:'戦火で焼けた城の普請が終わり、城は元の姿を取り戻した。'},true);}}
 for(const id in S.castles){const c=S.castles[id],o=c.owner;if(!S.clans[o]||S.clans[o].cap===id||!S.div[o])continue;if(G.unitAt(id).length)continue;const lim=o===S.player?16:22;const tera=(G.YOSHO_AT[id]||[]).some(y=>y.kind==='寺'&&G.yActive(y));if(c.loyal<lim&&rnd()<(o===S.player?.012:.025)*(tera?.4:1)){const m=G.negaeriForce(id);if(m)log('一揆と離反：'+m,'big',[o]);}}
 for(const k of G.alive()){
  const cl=S.clans[k],inc=G.monthIncome(k);
  cl.gold+=inc.gold;cl.food-=inc.food;
  if(d.m===9){let h=0;for(const id of clanCastles(k)){const c=S.castles[id];h+=c.koku*1150*(.5+c.loyal/200);}cl.food+=Math.round(h);if(k===S.player)log(`秋の収穫。兵糧 ${fmt(h)} を得た。`,'eco',[k]);}
  if(cl.food<0){for(const id of clanCastles(k))S.castles[id].troops*=.94;cl.food=0;if(k===S.player)log('兵糧が尽き、兵が逃げ出している。','bad',[k]);}
 }
 for(const id in S.castles){const c=S.castles[id],C=G.C[id];
  c.pool=Math.min(C.koku*220,c.pool+C.koku*32);
  if(c.loyal<70)c.loyal+=1;
  for(const y of (G.YOSHO_AT[id]||[])){if(!G.yActive(y))continue;if(y.kind==='寺'&&c.loyal<90)c.loyal=Math.min(90,c.loyal+2);if((y.kind==='鉄'||y.kind==='馬')&&c.train<90)c.train=Math.min(90,c.train+(y.kind==='鉄'?2:1));}
  c.morale+=((45+c.loyal*.45)-c.morale)*.25;
  const cap=G.capOf(id);if(c.troops>cap)c.troops-=(c.troops-cap)*.05;
  if(c.dur<c.durMax&&!G.unitAt(id).length)c.dur=Math.min(c.durMax,c.dur+c.durMax*.03);
  c.troops=Math.round(c.troops);
 }
 for(const g of S.gens)g.busy=0;
 for(const key in S.ally){if(TK.HISTORY_ONLY)continue;S.ally[key]-=30;if(S.ally[key]<=0){delete S.ally[key];const [a,b]=key.split('|');log(`${G.CNK(a)}と${G.CNK(b)}の同盟が期限を迎えた。`,'dip',[a,b]);}}
 for(const key in S.rel){const v=S.rel[key];if(!S.ally[key]&&v>50)S.rel[key]=v-1;}
 for(const id in S.castles)policyTick(id);
 if(S.div[S.player])for(const g of S.gens)if(g.clan===S.player&&!g.dead&&!G.isLeader(g)&&g.loyal>40)g.loyal-=.6;
 for(const k of G.alive()){aiDomestic(k,clanCastles(k),k===S.player);if(S.div[k]&&(k!==S.player||S.auto)){G.branchAI(k);aiMilitary(k,1);if(k!==S.player&&rnd()<.35)aiDiplomacy(k);}if(k!==S.player&&!TK.HISTORY_ONLY)aiRonin(k);}
 G.onMonth&&G.onMonth();
};
G.lastRef=function(){if(G._lr)return G._lr;const R={};const add=(n,t)=>{if(!n)return;n=String(n).split('|')[0].split('@')[0];const c=canonName(n);if(!(R[c]>=t))R[c]=t;};
 for(const ev of TK.HIST){const t=evT(ev);[ev.n,ev.to,ev.who,ev.leader].forEach(n=>add(n,t));for(const k of [].concat(ev.kill||[],ev.gens||[],ev.join||[]))add(k,t);for(const a of [].concat(ev.appear||[]))add(a,t);if(ev.g)add(ev.g,t);if(ev.move&&ev.move.n)add(ev.move.n,t);}
 for(const f of (TK.FORKS||[]))add(f.who,evT(f));return G._lr=R;};
function aging(){
 const y=G.date().y;
 // 史実の筋書きどおりに動く家の人も、寿命で世を去る（後の史実に出てくる人は、その出来事の後まで生きる）
 const ref=G.lastRef();const DY=TK.DEATH_Y||{};
 for(const g of S.gens){if(g.dead||g.clan&&S.div[g.clan])continue;const c=canonName(g.n);const age=y-g.born;const lr=ref[c]||-1;if(lr>S.t)continue;
  const isL=S.clans[g.clan]&&S.clans[g.clan].leader===g.id;let die=false;
  if(DY[c]!=null)die=y>=DY[c];else if(!TK.HISTORY_ONLY&&age>=(isL?72:66))die=rnd()<(age-(isL?70:64))*.045;
  if(!die)continue;killGen(g);if(isL)succession(g.clan,g);else log(`${g.clan?G.CNK(g.clan)+'の':''}${g.n}が世を去った（享年${age}）。`,'',g.clan?[g.clan]:[]);}
 for(const g of S.gens){if(TK.HISTORY_ONLY||g.dead)continue;if(g.clan&&!S.div[g.clan])continue;const age=y-g.born;if(age<52)continue;
  if(rnd()<(age-50)*.013){g.dead=true;g.unit&&S.units.forEach(u=>{u.gens=u.gens.filter(x=>x!==g.id);});
   if(g.clan&&S.clans[g.clan]&&S.clans[g.clan].leader===g.id){succession(g.clan,g);}else if(g.clan)log(`${G.CNK(g.clan)}の${g.n}が死去した（享年${age}）。`,'',[g.clan]);}}
 for(const u of S.units.slice())if(!u.gens.length&&!u.hist)disband(u);
}
function succession(k,old){
 const cand=clanGens(k).sort((a,b)=>(b.t+b.c+b.s)-(a.t+a.c+a.s));
 let nx=cand[0];
 if(!nx){nx={id:S.uid++,n:G.CNK(k)+'一門',t:45,b:45,c:45,s:45,born:G.date().y-30,clan:k,loc:S.clans[k].cap,unit:null,busy:0,loyal:100,ronin:false,prisoner:null,dead:false};S.gens.push(nx);}
 S.clans[k].leader=nx.id;nx.loyal=100;
 log(`${G.CNK(k)}当主・${old.n}が死去。${nx.n}が家督を継いだ。`,'big',[k]);
 G.onSuccession&&G.onSuccession(k,old,nx);
}

/* ===== 史実の進行 ===== */
function evT(ev){return S.clockVersion===TKCalendar.version?TKCalendar.toJD(...ev.d)-TKCalendar.toJD(S.y0,S.m0,1):(ev.d[0]-S.y0)*360+(ev.d[1]-S.m0)*30+(ev.d[2]-1);}
G.evT=evT;
G.diverge=function(k,why){if(!k||S.div[k]||!S.clans[k])return;S.div[k]=1;G.chron({alt:true,title:G.CNK(k)+'、史実の筋書きを離れる',text:({diplo:'外交',build:'築城',branch:'支城の攻略',battle:'合戦',neg:'寝返りの働きかけ'})[why]||'歴史への介入',d:G.date()},true);if(k===S.player){log('ここから先は、あなたの采配で歴史が変わっていく。','big',[k]);G.onDiverge&&G.onDiverge(why);}};
const okC=k=>S.clans[k]&&S.clans[k].alive&&!S.div[k];
function mkGen(str,k,at){let [n,rest]=str.split('@');const [nm,t,b,c,s2,born]=n.split('|');let g=genByName(nm);if(g){if(!g.ronin&&g.clan&&g.clan!==k)return g;g.clan=k;g.ronin=false;g.prisoner=null;g.loc=rest||at;return g;}
 g={id:S.uid++,n:nm,t:+t,b:+b,c:+c,s:+s2,born:+born,clan:k,loc:rest||at,unit:null,busy:0,loyal:90,ronin:false,prisoner:null,dead:false};S.gens.push(g);return g;}
G.mkGen=(str,k,at)=>mkGen(str,k,at);G.gen=G.gen||(id=>gen(id));
function killGen(g){if(!g||g.dead)return;g.dead=true;for(const u of S.units)u.gens=u.gens.filter(x=>x!==g.id);for(const u of S.units.slice())if(!u.gens.length&&u.hist!==true)disband(u);}
function setLeader(k,g){if(!g||!S.clans[k])return;S.clans[k].leader=g.id;g.clan=k;g.loyal=100;g.ronin=false;}
function chron(ev,ok){if(!ev.title&&!ev.text)return;if(ev.quiet&&ok)return;
 if(ev.title&&!ev.alt&&!ev.dyn){if(ok)S.hOk=(S.hOk||0)+1;else{S.hNg=(S.hNg||0)+1;S.hFail=S.hFail||[];if(!S.hFail.some(x=>x.title===ev.title)){S.hFail.unshift({s:G.dstr(),title:ev.title,text:ev.text||''});if(S.hFail.length>40)S.hFail.length=40;}}}
 if(ok&&ev.site){const at=ev.at||(ev.castles&&ev.castles[0]);if(at&&S.castles[at]){S.sites=(S.sites||[]).filter(x=>S.t-x.t<540);const sp=TK.SITE_POS&&TK.SITE_POS[ev.site];const P=sp?G.PJ(sp[0],sp[1]):[G.C[at].x+14,G.C[at].y+12];S.sites.push({at,n:ev.site,t:S.t,y:ev.d[0],x:P[0],y2:P[1]});}}const e={t:S.t,s:G.dstr(),title:ev.title||'',text:ev.text||'',who:ev.who||ev.n||ev.leader||ev.to||'',big:!!ev.big&&ok,ok,alt:!!ev.alt};S.chron.unshift(e);if(ok&&TK.BATTLES&&TK.BATTLES[ev.title]){const b=TK.BATTLES[ev.title];if((!b.eventDate||evT({d:b.eventDate})<=S.t)&&(!G.canReplayBattle||G.canReplayBattle(ev,b))){S.sceneQ=S.sceneQ||[];S.sceneQ.push({title:ev.title,t:S.t});}}if(S.chron.length>80)S.chron.length=80;G.onChron&&G.onChron(e);
 log((ev.title?ev.title+'：':'')+(ev.text||''),ok?'big':'',[]);}
function histMarch(k,from,to,troops,ev){
 let src=from&&S.castles[from]&&S.castles[from].owner===k?from:null;
 if(!src){let best=null,bd=1e9;for(const id of clanCastles(k)){const d=Math.hypot(G.C[id].x-G.C[to].x,G.C[id].y-G.C[to].y);if(d<bd){bd=d;best=id;}}src=best;}
 if(!src)return null;
 let path=G.findPath(src,to,k,'any');if(!path)return null;
 let days=0;for(let i=0;i<path.length-1;i++)days+=G.EDGES[ekey(path[i],path[i+1])].days;
 // 当主は、その出来事の主役でない限り自ら出陣しない（朝鮮へ秀吉が渡る、などを防ぐ）
 const L=gen(S.clans[k].leader);let lead=G.castleGens(src).filter(g=>g.id!==S.clans[k].leader).sort((a,b)=>b.t-a.t)[0]||null;
 // 名のある大将（出来事の主役）は自ら軍を率いて動く
 const who=ev&&ev.who?genByName(ev.who):null;if(who&&who.clan===k&&who.unit===null&&!who.dead&&!S.units.some(x=>x.gens.includes(who.id))){lead=who;
  if(who.loc!==src&&S.castles[who.loc]&&S.castles[who.loc].owner===k&&!(who.tr&&S.t<who.tr.t1)){const p2=G.findPath(who.loc,to,k,'any');if(p2&&p2.length>1){src=who.loc;path=p2;days=0;for(let i=0;i<path.length-1;i++)days+=G.EDGES[ekey(path[i],path[i+1])].days;}}if(who.id===S.clans[k].leader){S.pendMoves=S.pendMoves||[];S.pendMoves.push({n:who.n,home:1,after:S.t+75,until:S.t+400});}}
 S.war=S.war||{};{const r=ekey(k,S.castles[to].owner);S.rel[r]=Math.min(S.rel[r]??45,12);S.war[r]=S.t;}
 const u={id:S.uid++,clan:k,gens:lead?[lead.id]:[],troops,troops0:troops,morale:85,train:70,food:troops,path,seg:0,pos:0,state:'march',mission:'attack',enemy:null,origin:src,days:0,hist:true,spd:Math.min(1.3,Math.max(1,days/30))};
 if(path.length<2){u.state='siege';}
 if(lead)lead.unit=u.id;
 S.units.push(u);return u;}
function adminTransfer(id,k){const c=S.castles[id],old=c.owner;c.owner=k;
 for(const g of S.gens)if(g.loc===id&&g.clan===old&&!g.dead&&g.unit==null){const r=nearestOwn(old,id);if(r)g.loc=r;}
 if(S.clans[old]&&S.clans[old].cap===id){const r=clanCastles(old);if(r.length)S.clans[old].cap=r[0];}
 if(S.clans[old]&&!clanCastles(old).length){
  const grant=TK.HIST.slice(S.hi).some(e=>evT(e)===S.t&&!e.alt&&!arcBlocked(e)&&!S.cancel?.[e.title]&&((e.k==='take'&&e.admin&&e.clan===old&&e.castles?.length)||(e.take?.admin&&e.take.clan===old&&e.take.castles?.length)));
  if(grant&&!S.div[old]){S.pendingAdminExtinction=S.pendingAdminExtinction||{};S.pendingAdminExtinction[old]=k;}else destroy(old,k);
 }}
function histTake(ev,clan,castles){
 let any=false;
 for(const id of castles){const c=S.castles[id];if(!c)continue;const o=c.owner;if(o===clan)continue;
  if((ev.admin||(ev.peace&&ev.peace.includes(id)))&&!S.div[o]){adminTransfer(id,clan);any=true;continue;} // 国替え・減封、城主が寝返った・降った城などは軍勢を出さずに移す
  if(S.units.some(u=>u.hist&&u.clan===clan&&u.path[u.path.length-1]===id))continue;
  const tr=ev.troops||G.battleTroops(ev,clan)||Math.max(6000,Math.round(c.troops*2.4/100)*100);
  if(S.div[o]){ // 手が加えられた相手には、本当に攻め込む（ただし同盟中や、国力で大きく劣る時は攻めない）
   if(G.allied(clan,o)||G.power(clan)<G.power(o)*.5||(S.vassal&&(S.vassal[clan]===o||S.vassal[o]===clan)))continue;
   const src=ev.from&&S.castles[ev.from]&&S.castles[ev.from].owner===clan?ev.from:clanCastles(clan).find(x=>G.ADJ[x].includes(id));
   if(!src)continue;S.castles[src].troops+=tr;S.clans[clan].food+=tr;let L=G.bestFor(src,'t')||gen(S.clans[clan].leader);if(!L||!freeGen(L))continue;
   if(L.loc!==src)L.loc=src;L.busy=0;G.launch(clan,src,id,[L.id],tr,tr*.9,'attack');any=true;continue;}
  if(histMarch(clan,ev.from,id,tr,ev))any=true;}
 return any;}
// 歴史の分かれ道で外れた流れ（その先の史実は、前提が崩れたので起こらない）
function arcBlocked(ev){if(!S.arcs||!S.arcs.length)return false;const t=evT(ev);
 for(const a of S.arcs){if(t<a.t0||t>a.t1)continue;if(a.titles&&ev.title&&a.titles.includes(ev.title))return true;
  if(ev.k==='rename'){if(a.names&&a.names.includes(ev.to))return true;continue;}
  if(a.castles&&a.castles.length){const cs2=[ev.at,ev.to,ev.from,...(ev.castles||[])];if(cs2.some(c=>c&&a.castles.includes(c)))return true;}
  if((ev.k==='death'&&!ev.site&&!ev.kill)||ev.k==='appear')continue;
  const cs=[ev.clan,ev.a,ev.b,ev.clanAlt];const who=ev.who||ev.n;if(who){const g=genByName(who);if(g)cs.push(g.clan);}
  // 合戦に加わる人（並んで動く将・討たれる将）と、取られる城の持ち主も当事者とみる
  if(ev.k!=='move'&&ev.k!=='leave'){for(const n of [].concat(ev.also||[],ev.kill||[],ev.gens||[])){const g=genByName(n);if(g&&g.clan)cs.push(g.clan);}
   if(ev.k==='take'&&!ev.admin)for(const c of (ev.castles||[]))if(S.castles[c])cs.push(S.castles[c].owner);
   if(ev.site&&ev.at&&S.castles[ev.at])cs.push(S.castles[ev.at].owner);}
  if(cs.some(k=>k&&a.clans.includes(k)))return true;}
 return false;}
G.arcBlocked=ev=>arcBlocked(ev);
G.arcOff=function(id,def){S.arcs=S.arcs||[];if(S.arcs.some(a=>a.id===id))return;S.arcs.push({id,t0:S.t,t1:S.t+def.years*360,clans:def.clans||[],titles:def.titles||[],names:def.names||[],castles:def.castles||[]});};
function applyEv(ev){
 const k=(ev.clan&&!S.clans[ev.clan]&&ev.clanAlt)?ev.clanAlt:ev.clan;
 const evKey=ev.title||ev._pk;
 // 中止・分岐の判定は軍勢を動かす前に行う。
 if(S.cancel&&(S.cancel[ev.title||'#']||S.cancel[ev.k+':'+(ev.b||ev.n||ev.clan||'')])){chron(ev,false);return;}
 if(!ev.alt&&arcBlocked(ev)){if(ev.title)chron(ev,false);return;}
 // 落城を記録する史実の日に、未分岐の支配・戦死・年表を一緒に確定する。
 if(G.resolveHistoricalTake&&G.resolveHistoricalTake(ev,k)){
  const targets=ev.castles||[];
  for(const id of targets)if(S.castles[id].owner!==k)adminTransfer(id,k);
  applyExtras(ev,true);
  relayUnits(evKey);
  for(const u of S.units.slice())if(u.hist&&(u.until===evKey||u.until==='#hold'&&u.clan===k&&targets.includes(u.path.at(-1)))){
   u.until=null;u.releaseAt=null;u.stopAt=null;
   if(u.gens.length&&S.clans[u.clan]?.alive){u.histRet=1;retreat(u);}else dropUnits(x=>x===u);
  }
  chron(ev,true);G.onTerr&&G.onTerr();return;
 }
 // 長い囲み（hold）で陣を張っている味方は、城を取る史実が来たらそのまま攻めかかる
 if(ev.k==='take')for(const u of S.units)if(u.until==='#hold'&&u.clan===k&&(ev.castles||[]).includes(u.path[u.path.length-1])&&S.castles[u.path[u.path.length-1]].owner!==u.clan){u.until=null;u.releaseAt=null;u.mission='attack';u.stopAt=null;if(u.state==='camp')u.state='march';}
 if(evKey&&S.units.some(u=>u.until===evKey)){
  // 城を取る史実なら、前もって出陣していた軍勢がそのまま攻めかかる
  if(ev.k==='take'){for(const u of S.units)if(u.until===evKey&&(ev.castles||[]).includes(u.path[u.path.length-1])&&S.castles[u.path[u.path.length-1]].owner!==u.clan){u.until=null;u.mission='attack';u.stopAt=null;if(u.state==='camp')u.state='march';}}
  // 長く続く戦（籠城・攻囲）は、hold 日のあいだ陣を張ったまま
  if(ev.hold){for(const u of S.units)if(u.until===evKey){u.historyTitle=evKey;u.until='#hold';u.releaseAt=S.clockVersion===TKCalendar.version&&ev.holdUntil?evT({d:ev.holdUntil}):S.t+ev.hold;}}
  else{relayUnits(evKey);for(const u of S.units.slice())if(u.until===evKey&&u.gens.length&&S.clans[u.clan]&&S.clans[u.clan].alive){u.until=null;u.histRet=1;u.stopAt=null;retreat(u);}dropUnits(u=>u.until===evKey);}}
 switch(ev.k){
  case 'take':{if(!okC(k)&&!(ev.force&&S.clans[k]&&S.clans[k].alive)){chron(ev,false);return;}const changed=(ev.castles||[]).some(id=>S.div[S.castles[id]?.owner]);const ok=histTake(ev,k,ev.castles)||(ev.castles||[]).every(id=>S.castles[id]&&(S.castles[id].owner===k||S.units.some(u=>u.hist&&u.clan===k&&u.path[u.path.length-1]===id)));applyExtras(ev,ok&&!changed);chron(ev,ok&&!changed);return;}
  case 'newclan':{
   if(S.retainer&&S.retainer.k===k&&S.retainer.stay){applyExtras(ev,true);chron(Object.assign({},ev,{title:'',text:ev.text}),true);return;} // 主家に留まると決めた
   const cs=ev.castles.filter(id=>S.castles[id]&&!S.div[S.castles[id].owner]);
   if(S.clans[k]&&S.clans[k].alive){if(S.pre&&S.pre[k]){const pa=S.pre[k];if(S.vassal&&S.vassal[k]===pa)delete S.vassal[k];delete S.ally[ekey(k,pa)];delete S.pre[k];}if(!S.div[k])histTake({...ev,admin:1},k,cs);for(const str of [].concat(ev.appear||[]))mkGen(str,k,cs[0]||S.clans[k].cap);if(ev.leader){const L=genByName(ev.leader);if(L&&!L.dead){setLeader(k,L);if(cs.length)S.clans[k].cap=cs[0];}}if(ev.vassalOf)applyExtras({clan:k,vassalOf:ev.vassalOf},true);for(const n of (ev.gens||[])){const g=genByName(n);if(g&&!g.dead&&g.clan!==k&&!G.isLeader(g)&&!S.div[g.clan])transferClanGen(g,k,cs[0]||S.clans[k].cap);}chron(ev,true);G.onTerr&&G.onTerr();return;}
   if(!cs.length){chron(ev,false);return;}
   S.clans[k]={gold:400,food:20000,leader:null,cap:cs[0],alive:true};
   for(const id of cs){const c=S.castles[id],old=c.owner;c.owner=k;for(const g of S.gens)if(!g.dead&&g.loc===id&&g.clan===old&&g.unit==null&&!(S.clans[old]&&S.clans[old].leader===g.id)){const fam=g.n.startsWith(G.CN(old));const r=fam?nearestOwn(old,id):null;if(r)g.loc=r;else g.clan=k;}if(S.clans[old]&&S.clans[old].cap===id){const r=clanCastles(old);if(r.length)S.clans[old].cap=r[0];}if(!clanCastles(old).length&&S.clans[old].alive)destroy(old,k);}
   for(const a of G.alive())if(a!==k)S.rel[ekey(a,k)]=45;
   for(const n of (ev.gens||[])){const g=genByName(n);if(g&&!g.dead)transferClanGen(g,k,cs[0]);}
   for(const str of [].concat(ev.appear||[]))mkGen(str,k,cs[0]);
   const L=genByName(ev.leader);if(L)setLeader(k,L);else{const any=clanGens(k)[0];if(any)setLeader(k,any);else succession(k,{n:''});}
   applyExtras(ev,true);if(S.retainer&&S.retainer.k===k)S.retainer=null;chron(ev,true);G.onTerr&&G.onTerr();return;}
  case 'death':{
   const g=genByName(ev.n);if(!g){return;}
   const kk=g.clan;if(ev.clan&&S.div[ev.clan]){chron(ev,false);return;}
   const wasL=kk&&S.clans[kk]&&S.clans[kk].leader===g.id;let successor=null;killGen(g);
   if(wasL){let nx=ev.to?genByName(ev.to):null;if(!nx&&ev.appear)nx=mkGen(ev.appear,kk,g.loc);if(nx&&nx.clan!==kk&&nx.clan)nx=null;if(nx){setLeader(kk,nx);successor=nx;if(!nx.loc||S.castles[nx.loc].owner!==kk)nx.loc=S.clans[kk].cap;}else succession(kk,g);}
   else if(ev.appear&&kk)mkGen(ev.appear,kk,g.loc);
   // 自動選定は succession 側で通知済み。家臣の死去は継承として通知しない。
   applyExtras(ev,true);chron(ev,true);if(successor&&kk===S.player)G.onSuccession&&G.onSuccession(kk,g,successor);return;}
  case 'appear':{if(!S.clans[k]||!S.clans[k].alive){if(!S.clans[k]&&evT(ev)<evT({d:[1590,9,1]})){S.waitAp=S.waitAp||[];S.waitAp.push(Object.assign({},ev));}return;}const at=S.castles[ev.at]&&S.castles[ev.at].owner===k?ev.at:S.clans[k].cap;if(ev.heir&&S.div[k])return; // 歴史が分かれた家の当主は替えない
   if(ev.pull&&!ev.g.includes('|')){const g1=genByName(ev.g.split('@')[0]);if(!g1||g1.dead||G.isLeader(g1)||(g1.clan&&S.div[g1.clan]))return;}
   if(ev.pull){const nm0=ev.g.split('|')[0];const g0=genByName(nm0);if(g0&&!g0.dead&&g0.clan&&g0.clan!==k&&!G.isLeader(g0)&&!S.div[g0.clan]){g0.clan=k;g0.ronin=false;g0.unit=null;g0.loc=at;}}
   const g=mkGen(ev.g,k,at);if(ev.leader&&g.clan===k)setLeader(k,g);if(ev.capital&&S.castles[ev.capital]?.owner===k)S.clans[k].cap=ev.capital;chron(ev,true);return;}
  case 'leave':{for(const n of [].concat(ev.n)){const g=genByName(n);const ca=g&&g.clan&&S.clans[g.clan]&&S.clans[g.clan].alive;if(g&&!g.dead&&!(ca&&G.isLeader(g))&&!(g.clan&&S.div[g.clan])){if(g.unit!=null){const u=S.units.find(x=>x.id===g.unit);if(u)u.gens=u.gens.filter(x=>x!==g.id);g.unit=null;}g.clan=null;g.ronin=true;g.exile=S.t+(ev.years||8)*360;}}chron(ev,true);return;} // 主家を離れて牢人・流浪になる
  case 'rename':{const g=genByName(ev.n);if(g){g.n=ev.to;chron(ev,true);}return;}
  case 'cname':{if(S.clans[k]&&S.clans[k].alive)S.cnm[k]=ev.name;return;}
  case 'move':{applyMove(ev);chron(ev,true);return;}
  case 'ally':case 'submit':{const a=ev.a||k,b=ev.b;if(!okC(a)||!okC(b)){if(ev.title)chron(ev,false);return;}S.ally[ekey(a,b)]=1e9;S.rel[ekey(a,b)]=90;if(ev.k==='submit')S.vassal=Object.assign(S.vassal||{},{[b]:a});applyExtras(ev,true);chron(ev,true);return;}
  case 'absorb':{if(!okC(k)||!okC(ev.b)){chron(ev,false);return;}absorb(k,ev.b);chron(ev,true);return;}
  case 'premarch':return;
  case 'hegemon':{if(!okC(k)){chron(ev,false);return;}for(const j of G.alive())if(j!==k&&!S.div[j]&&!G.FOREIGN.includes(j)){S.ally[ekey(k,j)]=1e9;}S.hegemon=k;chron(ev,true);return;}
  case 'takeall':{if(!okC(k)||!S.clans[ev.b]||!S.clans[ev.b].alive){chron(ev,false);return;}for(const n of (ev.join||[])){const g=genByName(n);if(g&&!g.dead&&g.clan===ev.b&&!G.isLeader(g)&&g.unit==null){g.clan=k;if(!S.castles[g.loc]||S.castles[g.loc].owner!==k)g.loc=S.clans[k].cap;}}const keep=new Set(ev.keep||[]);const cs=clanCastles(ev.b).filter(id=>!keep.has(id));histTake(Object.assign({},ev,{admin:1}),k,cs);for(const g of S.gens){if(g.dead||g.clan!==k||g.unit!=null)continue;if(S.castles[g.loc]&&S.castles[g.loc].owner!==k)g.loc=S.clans[k].cap;}chron(ev,true);G.onTerr&&G.onTerr();return;}
  case 'unify':{if(!okC(k)){chron(ev,false);return;}for(const j of G.alive())if(j!==k&&!S.div[j]){S.ally[ekey(k,j)]=1e9;}S.unified=k;chron(ev,true);G.onUnify&&G.onUnify(k);return;}
  case 'note':{applyExtras(ev,true);chron(ev,true);return;}
 }
}
function applyMove(m){const g=genByName(m.n);if(!g||!g.clan||S.div[g.clan])return;const at=m.at;
 // 出陣中・城がまだ手に入っていない時は、戻ってから／手に入ってから移る
 if(!S.castles[at]||S.castles[at].owner!==g.clan||g.unit!==null){S.pendMoves=S.pendMoves||[];S.pendMoves.push({n:m.n,at,cap:m.cap?1:0,after:S.t,until:S.t+360});return;}g.loc=at;if(m.cap)S.clans[g.clan].cap=at;}
function applyExtras(ev,ok){
 if(ev.take&&okC(ev.take.clan))histTake(Object.assign({},ev,{admin:ev.take.admin||ev.admin}),ev.take.clan,ev.take.castles);
 if(!ok)return;
 if(ev.domains){S.domainRecords=S.domainRecords||[];S.domainRecords.push({date:ev.d,title:ev.title,source:ev.source,rows:ev.domains});}
 // 主従の付け外し：vassalOf は「この家（clan）を○○家の下に置く」、unvassal は従属を解く
 if(ev.vassalOf){const k=ev.clan,L=ev.vassalOf;if(S.clans[k]&&S.clans[k].alive&&S.clans[L]&&S.clans[L].alive&&!S.div[k]&&!S.div[L]){S.vassal=Object.assign(S.vassal||{},{[k]:L});S.ally[ekey(k,L)]=1e9;S.rel[ekey(k,L)]=90;}}
 for(const k of (ev.unvassal||[]))if(S.vassal&&S.vassal[k]&&!S.div[k]){const L=S.vassal[k];delete S.vassal[k];if(S.pre&&S.pre[k])delete S.pre[k];if(ev.keepAlly===false)delete S.ally[ekey(k,L)];}
 for(const n of (ev.kill||[]))killGen(genByName(n));
 if(ev.join&&ev.clan)for(const n of ev.join){const g=genByName(n);if(g&&!S.div[g.clan]&&g.clan!==ev.clan&&!G.isLeader(g)){g.clan=ev.clan;g.loc=(ev.castles&&ev.castles.includes(g.loc))?g.loc:(ev.castles?ev.castles[0]:S.clans[ev.clan].cap);g.ronin=false;}}
 if(ev.move){S.pendMoves=S.pendMoves||[];S.pendMoves.push(Object.assign({},ev.move,{until:S.t+60}));}
 if(ev.k==='take'&&ev.appear)for(const str of [].concat(ev.appear)){const at=str.split('@')[1];S.pendAppear=S.pendAppear||[];S.pendAppear.push({str,clan:ev.clan,at,until:S.t+60});}
}
// 史実の合戦の前に、軍勢を実際に動かしておく（その日に城へ着くように出陣させる）
// 史実の出来事が済んでも、同じ武将が間をおかず次の史実へ向かうなら、軍勢を解かずにそのまま次へ進ませる（陣を解いて城へ瞬時に戻るのを防ぐ）
function relayUnits(key){for(const u of S.units){if(u.until!==key||!u.gens.length)continue;const g=gen(u.gens[0]);if(!g)continue;
  for(let i=S.hi;i<TK.HIST.length;i++){const e=TK.HIST[i];const t=evT(e);if(t>S.t+75)break;const k2=e.title||e._pk;if(!k2||k2===key||e.admin)continue;
   if(!(e.k==='take'||e.k==='note'||e.k==='premarch'||e.k==='newclan'&&e.marchWho))continue;const w=e.who&&genByName(e.who);if(!w||w.id!==g.id)continue;
   if(S.cancel&&S.cancel[e.title])continue;if(arcBlocked(e))continue;
   const to=e.k==='take'?(e.castles||[])[0]:e.at;if(!to||!S.castles[to])continue;
   if(!rerouteHist(u,to,t,e.routeVia))continue;u.until=k2;S.pm[i]=1;break;}}}
function rerouteHist(u,to,t,routeVia){const k=u.clan;
   const n0=u.path[Math.min(u.seg+1,u.path.length-1)];
   const stops=[n0,...(routeVia||[])];if(stops.at(-1)!==to)stops.push(to);
   const p=[n0];
   for(let i=1;i<stops.length;i++){
    const from=stops[i-1],dest=stops[i];if(from===dest)continue;
    const owner=S.castles[dest].owner;
    const leg=bfsVia(from,dest,v=>{const o=S.castles[v].owner;return o===k||o===owner||G.allied(o,k);})||G.findPath(from,dest,k,'any');
    if(!leg)return false;p.push(...leg.slice(1));
   }
   let path;if(u.seg+1>=u.path.length){path=p;u.pos=0;}else if(p.length>1&&p[1]===u.path[u.seg]){path=p;u.pos=Math.max(0,1-u.pos);}else path=[u.path[u.seg]].concat(p);if(path.length<2)return false;
   let days=0;for(let j=0;j<path.length-1;j++){const E=G.EDGES[ekey(path[j],path[j+1])];days+=E?E.days:5;}
   u.path=path;u.seg=0;u.state='march';u.mission='show';u.enemy=null;u.stopAt=.8;u.spd=Math.min(1.6,Math.max(.6,days/Math.max(1,t-S.t)));return true;}
// 通ってよい城だけを通り、日数のいちばん短い道（城の数ではなく、街道の速さで選ぶ）
function bfsVia(from,to,ok){const dist={[from]:0},prev={[from]:null},done=new Set();
 for(;;){let u=null,bd=Infinity;for(const x in dist)if(!done.has(x)&&dist[x]<bd){bd=dist[x];u=x;}if(u===null||u===to)break;done.add(u);
  for(const v of G.ADJ[u]){if(done.has(v))continue;if(v!==to&&!ok(v))continue;const E=G.EDGES[ekey(u,v)];const nd=bd+(E?E.days:5);if(nd<(dist[v]??Infinity)){dist[v]=nd;prev[v]=u;}}}
 if(!(to in prev))return null;const p=[];for(let x=to;x!==null;x=prev[x])p.unshift(x);return p;}
function preMarch(){S.pm=S.pm||{};for(let i=S.hi;i<TK.HIST.length;i++){const ev=TK.HIST[i];const t=G.visualEventTime?G.visualEventTime(ev):evT(ev);if(t>S.t+90)break;if(S.pm[i])continue;
  if(ev.documentedMarch||ev.admin||!(ev.k==='take'||ev.k==='note'||ev.k==='premarch'||(ev.k==='newclan'&&ev.marchWho)||(ev.k==='death'&&ev.site)))continue;if(ev.k!=='take'&&!(ev.title&&(ev.site||ev.big)))continue;if(ev.k==='take'&&!(ev.title||ev.who))continue;const key=ev.title||(ev._pk=ev._pk||'#'+i);
  const who=(ev.marchWho||ev.who)&&genByName(ev.marchWho||ev.who);let k=ev.k==='take'?(ev.marchClan||((ev.clan&&!S.clans[ev.clan]&&ev.clanAlt)?ev.clanAlt:ev.clan)):(who&&who.clan);if(!k||!okC(k))continue;if(ev.marchStart&&S.t<G.evT({d:ev.marchStart}))continue;
  const to=ev.k==='take'?(ev.castles||[])[0]:ev.at;if(!to||!S.castles[to]||(ev.k==='take'&&S.castles[to].owner===k))continue;
  if(S.cancel&&S.cancel[ev.title])continue;if(arcBlocked(ev))continue;
  let src=null,bd=1e9;for(const id of clanCastles(k)){if(id===to)continue;const d=Math.hypot(G.C[id].x-G.C[to].x,G.C[id].y-G.C[to].y);if(d<bd){bd=d;src=id;}}
  if(who&&who.clan===k&&who.unit===null&&who.loc&&who.loc!==to&&S.castles[who.loc]&&S.castles[who.loc].owner===k)src=who.loc;
  if(who&&who.unit!=null){const wu=S.units.find(x=>x.id===who.unit);if(wu&&wu.hist&&wu.histRet&&!wu.until){wu.until=key;wu.histRet=1;wu.mission='show';if(rerouteHist(wu,to,t)){if(ev.routeVia){const via=[wu.path[0],...ev.routeVia],p=[];for(let j=1;j<via.length;j++){const leg=G.findPath(via[j-1],via[j],k,'any');if(leg)p.push(...(p.length?leg.slice(1):leg));}if(p.length>1){wu.path=p;wu.seg=0;wu.pos=0;}}S.pm[i]=1;}else wu.until=null;continue;}}
  if(!src)continue;if(who&&ev.k!=='take'){if(who.unit!=null){continue;}}else if(S.units.some(u=>u.clan===k&&u.path[u.path.length-1]===to)){S.pm[i]=1;continue;}const tgo=S.castles[to].owner;let path=G.findPath(src,to,k,'any');if(ev.routeVia){const stops=ev.routeVia;path=[stops[0]];for(let j=1;j<stops.length;j++){const p=G.findPath(stops[j-1],stops[j],k,'any');if(!p){path=null;break;}path.push(...p.slice(1));}}if(!path||path.length<2)continue;
  let days=0;for(let j=0;j<path.length-1;j++)days+=G.EDGES[ekey(path[j],path[j+1])].days;
  if(G.historicalMarchDays)days=Math.max(days,G.historicalMarchDays(ev,who,src,to));
  if(ev.marchStart&&S.t<G.evT({d:ev.marchStart}))continue;
  if(!ev.marchStart&&S.t<t-days-3-(ev.lead||0))continue;S.pm[i]=1;
  const g=who&&who.clan===k&&freeGen(who)?who:null;const tr=ev.troops||(who&&TK.TROOP_HINT&&TK.TROOP_HINT[who.n+'@'+(ev.title||'')])||(ev.sub&&who&&TK.TROOP_HINT&&TK.TROOP_HINT[who.n])||G.splitTroops(ev,k,who)||(ev.sub||ev.k!=='take'?Math.max(3000,Math.min(18000,Math.round(G.clanTroops(k)*.08/1000)*1000)):Math.max(5000,Math.min(40000,Math.round(G.clanTroops(k)*.12/1000)*1000)));
  const u={id:S.uid++,clan:k,gens:g?[g.id]:[],troops:tr,troops0:tr,morale:85,train:70,food:tr*2,path,seg:0,pos:0,state:'march',mission:'show',enemy:null,origin:src,days:0,hist:true,spd:Math.min(1.6,Math.max(.6,days/Math.max(1,t-S.t))),until:key,stopAt:1,routeNote:ev.arrivalNote};
  if(g)g.unit=u.id;S.units.push(u);G.onSortie&&G.onSortie(u,to);
  if(k===S.player&&!S.div[k]&&ev.title&&!ev.sub&&ev.k!=='death'&&!(ev.kill||[]).some(n=>{const g=genByName(n);return g&&g.clan===k;})&&!TK.FORKS.some(f=>f.clan===k&&Math.abs(evT(f)-t)<45)&&!(S.evQ||[]).some(q=>q.dyn==='shutsujin'&&q.title===ev.title)){S.evQ=S.evQ||[];S.evQ.push({dyn:'shutsujin',title:ev.title,uid:u.id,to,text:ev.text||''});}}}
G.hist=function(){
 if(S.waitAp&&S.waitAp.length&&S.t%15===0){const w=S.waitAp;S.waitAp=[];for(const ev of w){const k=ev.clan;if(S.clans[k]&&S.clans[k].alive){const at=S.castles[ev.at]&&S.castles[ev.at].owner===k?ev.at:S.clans[k].cap;mkGen(ev.g,k,at);}else if(!S.clans[k])S.waitAp.push(ev);}}
 if(S.t%3===0)preMarch();
 for(const u of S.units.slice())if(u.releaseAt!=null&&S.t>=u.releaseAt){u.releaseAt=null;u.until=null;if(u.gens.length&&S.clans[u.clan]&&S.clans[u.clan].alive){u.histRet=1;u.stopAt=null;retreat(u);}else S.units=S.units.filter(x=>x!==u);}
 {const R=G.retainer();if(R&&R.t!=null&&!R.asked&&S.t>=R.t-2){R.asked=1;S.evQ=S.evQ||[];S.evQ.push({dyn:'jiritsu_h'});}}
 // 史実どおりに動く家の当主は、出陣から戻れば本城へ帰る（遠征先の城に居続けないように）
 /* 帰還は明示された移動・帰陣で処理。月初に当主を本城へ瞬間移動させない。 */
 while(S.hi<TK.HIST.length&&evT(TK.HIST[S.hi])<=S.t){const ev=TK.HIST[S.hi++];try{applyEv(ev);}catch(e){console.error('hist',ev,e);}}
 // 同日の国替えでは、旧領の引渡しから新領受領まで家を滅亡させない。
 for(const [k,by]of Object.entries(S.pendingAdminExtinction||{})){const owned=clanCastles(k);if(!owned.length){if(S.clans[k]?.alive)destroy(k,by);}else{const cl=S.clans[k];if(!owned.includes(cl.cap))cl.cap=owned[0];for(const g of S.gens)if(g.clan===k&&!g.dead&&g.unit===null&&!owned.includes(g.loc)&&g.prisoner===null)g.loc=cl.cap;}}
 delete S.pendingAdminExtinction;
 if(S.pendMoves)S.pendMoves=S.pendMoves.filter(m=>{if(m.after&&S.t<m.after)return true;const g=genByName(m.n);if(!g)return false;if(m.after&&S.units.some(u=>u.gens.includes(g.id)))return true;if(m.home){m.at=S.clans[g.clan]&&S.clans[g.clan].cap;if(g.loc===m.at)return false;}if(S.castles[m.at]&&S.castles[m.at].owner===g.clan){if(g.unit===null)g.loc=m.at;if(m.cap)S.clans[g.clan].cap=m.at;return false;}return S.t<m.until;});
 if(S.pendAppear)S.pendAppear=S.pendAppear.filter(p=>{if(!S.clans[p.clan]||!S.clans[p.clan].alive)return false;if(S.castles[p.at]&&S.castles[p.at].owner===p.clan){mkGen(p.str,p.clan,p.at);return false;}return S.t<p.until;});
};
G.applyEv=ev=>applyEv(ev);G.chron=(ev,ok)=>chron(ev,ok);G.histTake=(ev,k,cs)=>histTake(ev,k,cs);
G.nextEvents=function(n){const r=[];const can=S.cancel||{};const seen=new Set();for(let i=S.hi;i<TK.HIST.length&&r.length<n;i++){const e=TK.HIST[i];if(e.k==='premarch'||!e.title||seen.has(e.title))continue;if(!can[e.title]&&!(e.clan&&S.div[e.clan]&&e.k==='take')&&!arcBlocked(e)){seen.add(e.title);r.push(e);}}
 for(const a of (S.altQ||[])){const ae=G.altResolve?G.altResolve(a):null;if(!ae||!ae.title)continue;const d=G.date(a.t);r.push(Object.assign({},ae,{alt:1,d:[d.y,d.m,d.d]}));}
 return r.sort((a,b)=>(a.d[0]-b.d[0])*400+(a.d[1]-b.d[1])*32+(a.d[2]-b.d[2])).slice(0,n);};


/* ===== 城の移り変わり（築城・廃城・焼失・計画） ===== */
TK.JOKAKU.forEach((e,i)=>e._i=i);
G.jokakuSig=()=>JSON.stringify(TK.JOKAKU.map(e=>[e._i,e.d,e.k,e.node,e.id,e.n]));
G.fixJokaku=function(){const sig=G.jokakuSig();if(S.jsig===sig)return false;
 // 旧形式の待機項目 i は、並替え前の _i と同じ。新形式は安定IDを保存する。
 S.jpend=(S.jpend||[]).map(p=>{const uid=p.uid??p.i,i=TK.JOKAKU.findIndex(e=>e._i===uid);return {...p,uid,i};}).filter(p=>p.i>=0);
 let i=0;while(i<TK.JOKAKU.length&&evT(TK.JOKAKU[i])<=S.t)i++;S.ji=i;S.jsig=sig;
 // 過去の領主・城名・能力は再適用しない。歴史訂正を最初から見るには新規開始する。
 return true;};
G.syncCastles=function(){if(!S)return;S.cst=S.cst||{};S.ruins=S.ruins||[];S.forts=S.forts||{};S.plans=S.plans||{};S.works=S.works||{};S.jpend=S.jpend||[];if(S.ji==null)S.ji=0;
 for(const C of G.CL){const o=S.cst[C.id];C.x=o&&o.x!=null?o.x:C.bx;C.y=o&&o.y!=null?o.y:C.by;}};
// 後期シナリオの既定名が一致しても、移転先の位置は別に適用する。
function placeCastle(id,p){const C=G.C[id],[x,y]=G.PJ(p.lon,p.lat),o=S.cst[id]=S.cst[id]||{};o.n=p.n;o.x=x;o.y=y;C.x=x;C.y=y;}
G.repairCastleEraPositions=function(s){
 if(!s||s!==S||s.castleEraPositionVersion===1||!TK.HISTORY_ONLY||s.sc!=='s1585'||![24,25].includes(s.movementGeometryVersion)||Object.values(s.div||{}).some(Boolean)||(s.arcs||[]).length||(s.altQ||[]).length||Object.keys(s.branches||{}).length)return;
 if(s.hsig!==G.histSig()||s.jsig!==G.jokakuSig())return;
 const latest=new Map();for(const e of TK.JOKAKU){if(evT(e)>s.t)break;if(e.node&&(e.k==='build'&&e.lon!=null||e.k==='burn'&&e.to))latest.set(e.node,e);}
 const changed=new Map(),near=(a,b)=>Array.isArray(a)&&Math.hypot(a[0]-b[0],a[1]-b[1])<1e-6;
 const sample=s.t+(Number.isFinite(s.visualFraction)?Math.max(0,Math.min(1,s.visualFraction)):0);
 const valid=(line,a,b)=>Array.isArray(line)&&line.length>1&&line.every(p=>Array.isArray(p)&&p.length>=2&&p.slice(0,2).every(Number.isFinite))&&Number.isFinite(a)&&Number.isFinite(b)&&sample>=a&&sample<b;
 let deferred=false;
 for(const [id,e]of latest){const C=G.C[id],o=s.cst[id];if(e.k!=='build'||!C||!s.castles[id]||s.jdone?.[e._i]||G.cname(id)!==e.n||o?.n&&o.n!==e.n)continue;
  const old=[C.bx,C.by],dest=G.PJ(e.lon,e.lat);if(near(old,dest)||!near([C.x,C.y],old))continue;
  // 別の位置が明示された保存は推定で上書きしない。
  if(o&&(o.x!=null||o.y!=null)&&!near([o.x,o.y],old))continue;
  const unknownArmy=s.units.some(u=>u.path?.at(-1)===id&&u.visualTravel&&(!valid(u.visualTravel.line,u.visualTravel.start,u.visualTravel.end)||near(u.visualTravel.line.at(-1),old)&&(!u.hist||u.record)));
  const unknownPerson=s.gens.some(g=>g.tr?.p?.at(-1)===id&&!valid(g.tr.line,g.tr.t0,g.tr.t1));
  if(unknownArmy||unknownPerson){deferred=true;continue;}
  changed.set(id,{old,dest});placeCastle(id,e);s.jdone=s.jdone||{};s.jdone[e._i]=1;
 }
 for(const u of s.units){const row=changed.get(u.path?.at(-1)),q=u.visualTravel;if(!row||!u.hist||u.record||!q||!valid(q.line,q.start,q.end)||!near(q.line.at(-1),row.old))continue;
  const A=G.visualPathPoint(q.line,(sample-q.start)/(q.end-q.start)).slice(0,2),B=G.battleArrivalPoint(u)||row.dest;
  u.visualTravel={...q,line:G.visualBetween(A,B),start:sample};if(u.visualRouteLine)u.visualRouteLine=u.visualTravel.line;
 }
 for(const g of s.gens)if(changed.has(g.loc)&&g.unit==null&&!g.tr)delete g._visualPoint;
 for(const g of s.gens){const row=changed.get(g.tr?.p?.at(-1)),q=g.tr;if(!row||!q||!valid(q.line,q.t0,q.t1)||!near(q.line.at(-1),row.old))continue;
  const A=G.visualPathPoint(q.line,(sample-q.t0)/(q.t1-q.t0)).slice(0,2);g.tr={...q,line:G.visualBetween(A,row.dest),t0:sample};
 }
 if(!deferred)s.castleEraPositionVersion=1;
};
const jClans=ev=>ev.clan==null?null:[].concat(ev.clan);
const jOwnerOk=(ev,id)=>{const o=S.castles[id].owner;if(S.div[o])return false;const cs=jClans(ev);return !cs||cs.includes(o);};
function addRuin(id,name){const C=G.C[id];if(!name)return;S.ruins=S.ruins.filter(r=>Math.hypot(r.x-C.x,r.y-C.y)>3);S.ruins.push({n:name,x:C.x,y:C.y,y0:G.date().y});if(S.ruins.length>40)S.ruins.shift();}
function doBuild(id,p,quiet){const C=G.C[id],c=S.castles[id],old=G.cname(id);
 if(p.prev&&p.lon!=null)addRuin(id,old);
 const o=S.cst[id]=S.cst[id]||{};o.n=p.n;o.burnt=false;if(p.lon!=null){const [x,y]=G.PJ(p.lon,p.lat);o.x=x;o.y=y;C.x=x;C.y=y;}
 S.ruins=S.ruins.filter(r=>Math.hypot(r.x-C.x,r.y-C.y)>3||r.n===old&&p.lon==null&&false);
 if(p.dur){c.durMax+=p.dur;c.dur=Math.min(c.durMax,c.dur+p.dur);}
 if(p.shogyo){c.shogyoMax+=p.shogyo;c.shogyo+=Math.round(p.shogyo*.5);}
 if(p.koku){c.kokuMax+=p.koku;}
 if(S.plans[id]&&S.plans[id].n===p.n)delete S.plans[id];
 if(!quiet)G.onTerr&&G.onTerr();}
G.buildNow=doBuild;
// The fire effect is timed separately from damage and stays at the place that burned.
const CASTLE_FIRE_DAYS=3;
G.castleFires=()=>S?.castleFires||[];

function jApply(ev,quiet){const id=ev.node;
 switch(ev.k){
  case 'build':{S.jdone=S.jdone||{};if(!S.castles[id]||S.jdone[ev._i])return true;
   if(G.cname(id)===ev.n&&ev.lon!=null){const p=G.PJ(ev.lon,ev.lat),C=G.C[id];if(Math.hypot(C.x-p[0],C.y-p[1])>1e-6){if(!quiet&&!jOwnerOk(ev,id))return false;placeCastle(id,ev);}S.jdone[ev._i]=1;return true;}
   if(!quiet&&!jOwnerOk(ev,id))return false;S.jdone[ev._i]=1;doBuild(id,ev,quiet);if(!quiet)chron(Object.assign({at:id},ev),true);return true;}
  case 'burn':{if(!S.castles[id])return true;if(ev.cond&&G.cname(id)!==ev.cond)return true;if(!quiet&&!jOwnerOk(ev,id))return false;
   const c=S.castles[id],C=G.C[id];
   if(!quiet){
    S.castleFires??=[];
    S.castleFires.push({x:C.x,y:C.y,start:S.t,until:S.t+CASTLE_FIRE_DAYS});
   }
   if(ev.to){addRuin(id,G.cname(id));const o=S.cst[id]=S.cst[id]||{};o.n=ev.to.n;o.x=null;o.y=null;o.burnt=false;C.x=C.bx;C.y=C.by;S.ruins=S.ruins.filter(r=>r.n!==ev.to.n);}
   else{const o=S.cst[id]=S.cst[id]||{};o.n=G.cname(id);o.burnt=true;o.bm=0;}
   c.dur=Math.round(c.dur*.35);c.durMax=Math.max(300,Math.round(c.durMax*.7));c.shogyo=Math.round(c.shogyo*.7);
   if(!quiet){chron(Object.assign({at:id},ev),true);G.onTerr&&G.onTerr();}return true;}
  case 'fort':{const cs=jClans(ev);if(!quiet&&cs&&!cs.some(k=>okC(k)))return true;if(!quiet&&ev.vs&&!okC(ev.vs))return true;
   const [x,y]=G.PJ(ev.lon,ev.lat);S.forts[ev.id]={n:ev.n,x,y,clan:cs?cs[0]:null,y0:ev.d[0]};if(!quiet)chron(ev,true);return true;}
  case 'unfort':{const f=S.forts[ev.id];if(!f)return true;const cs=jClans(ev);if(!quiet&&cs&&!cs.some(k=>okC(k)))return true;if(!quiet&&ev.vs&&!okC(ev.vs))return true;
   delete S.forts[ev.id];S.ruins.push({n:f.n,x:f.x,y:f.y,y0:G.date().y});if(!quiet&&(ev.text||ev.title))chron(ev,true);return true;}
  case 'plan':{if(!S.castles[id]||G.cname(id)===ev.n)return true;const cs=jClans(ev);if(!quiet&&cs&&!cs.some(k=>S.clans[k]&&S.clans[k].alive))return true;
   S.plans[id]=Object.assign({},ev,{until:ev.until?evT({d:ev.until}):null,from:G.CN(cs?cs[0]:S.castles[id].owner)});if(!quiet)chron(Object.assign({at:id},ev),true);return true;}
 }return true;}
G.jokaku=function(){
 if(S.castleFires?.length)S.castleFires=S.castleFires.filter(f=>S.t<f.until);
 while(S.ji<TK.JOKAKU.length&&evT(TK.JOKAKU[S.ji])<=S.t){const ev=TK.JOKAKU[S.ji++];try{if(!jApply(ev))S.jpend.push({i:S.ji-1,uid:ev._i,until:S.t+120});}catch(e){console.error('jokaku',ev,e);}}
 // 持ち主がまだ移っていない築城は少し待ち、それでも合わなければ「計画」として残す
 S.jpend=S.jpend.filter(p=>{const ev=p.uid==null?TK.JOKAKU[p.i]:TK.JOKAKU.find(e=>e._i===p.uid);if(!ev||jApply(ev))return false;if(S.t<p.until)return true;
  if(ev.k==='build'&&G.cname(ev.node)!==ev.n){const cs=jClans(ev);S.plans[ev.node]=Object.assign({},ev,{until:null,from:G.CN(cs?cs[0]:S.castles[ev.node].owner)});}return false;});
 for(const id in S.plans){const p=S.plans[id];if(p.until!=null&&S.t>p.until&&!S.works[id])delete S.plans[id];}
 for(const id in S.works){const w=S.works[id],c=S.castles[id];if(!c||c.owner!==w.clan){if(w.clan===S.player)log(`${G.cname(id)}を失い、${w.n}の普請は止まった。`,'bad',[w.clan]);delete S.works[id];continue;}
  if(S.t>=w.end){const p=S.plans[id]||w.p;doBuild(id,p);delete S.works[id];log(`${G.CNK(w.clan)}が${p.n}を築き上げた。`,w.clan===S.player?'big':'',[w.clan]);
   S.chron.unshift({t:S.t,s:G.dstr(),title:p.n+'の完成',text:`${G.CNK(w.clan)}の手で${p.n}が築かれた。${p.dur?'城の堅さが増し、':''}${p.shogyo?'城下が栄える。':''}`,who:S.clans[w.clan]?(gen(S.clans[w.clan].leader)||{}).n:'',ok:true});G.onChron&&G.onChron(S.chron[0]);}}
};
G.planCost=p=>({gold:Math.round((250+(p.dur||0)*.9+(p.shogyo||0)*1.5)/50)*50,days:Math.round(60+(p.dur||0)/7+(p.shogyo||0)/5)});
G.startWork=function(k,id){const p=S.plans[id];if(!p||S.castles[id].owner!==k||S.works[id])return {ok:false,msg:'築けません'};const c=G.planCost(p);if(S.clans[k].gold<c.gold)return {ok:false,msg:`金が足りません（${c.gold}）`};
 S.clans[k].gold-=c.gold;S.works[id]={clan:k,n:p.n,p,start:S.t,end:S.t+c.days};if(k===S.player)G.diverge(k,'build');return {ok:true,msg:`${p.n}の普請を始めた（約${Math.round(c.days/30)}か月）`};};
/* ===== 内政コマンド ===== */
const COST={kaikon:100,shogyo:100,fushin:150,hodokoshi:0,chohei:0,kunren:0,ryugen:150,hikinuki:400,hobi:100,shinzen:300};
G.COST=COST;
G.bestFor=function(id,stat,exclude){const gs=G.idleGens(id).filter(g=>!exclude||!exclude.includes(g.id));gs.sort((a,b)=>b[stat]-a[stat]);return gs[0]||null;};
G.choheiAmount=function(id,g){const c=S.castles[id],k=c.owner;return Math.max(0,Math.floor(Math.min(c.pool,600+g.t*22,S.clans[k].gold/0.2)/100)*100);};
G.cmd=function(type,id,g,arg){
 const c=S.castles[id],k=c.owner,cl=S.clans[k],C=G.C[id];
 if(!g||g.busy)return {ok:false,msg:'動ける武将がいません'};
 const pay=n=>{if(cl.gold<n)return false;cl.gold-=n;return true;};
 let msg='';
 switch(type){
  case 'kaikon':if(c.koku>=c.kokuMax)return {ok:false,msg:'これ以上開墾できません'};if(!pay(COST.kaikon))return {ok:false,msg:'金が足りません'};{const v=Math.round((.6+g.s/55)*10)/10;c.koku=Math.min(c.kokuMax,Math.round((c.koku+v)*10)/10);msg=`石高 +${v}万石`;}break;
  case 'shogyo':if(c.shogyo>=c.shogyoMax)return {ok:false,msg:'これ以上発展できません'};if(!pay(COST.shogyo))return {ok:false,msg:'金が足りません'};{const v=Math.round(12+g.s/3.5);c.shogyo=Math.min(c.shogyoMax,c.shogyo+v);msg=`商業 +${v}`;}break;
  case 'fushin':if(!pay(COST.fushin))return {ok:false,msg:'金が足りません'};{const v=Math.round(60+g.t*1.5);c.durMax+=Math.round(v*.5);c.dur=Math.min(c.durMax,c.dur+v*2);msg=`耐久 +${v*2}`;}break;
  case 'hodokoshi':{const f=Math.round(C.koku*120);if(cl.food<f)return {ok:false,msg:'兵糧が足りません'};cl.food-=f;const v=Math.round(7+g.s/10);c.loyal=Math.min(100,c.loyal+v);msg=`民忠 +${v}（兵糧 -${fmt(f)}）`;}break;
  case 'chohei':{const n=G.choheiAmount(id,g);if(n<100)return {ok:false,msg:'集められる兵がいません'};cl.gold-=Math.round(n*.2);c.pool-=n;c.troops+=n;c.loyal=Math.max(0,c.loyal-3);c.train=Math.max(20,Math.round((c.train*c.troops-n*20)/(c.troops)));msg=`兵 +${fmt(n)}`;}break;
  case 'kunren':{if(c.train>=100)return {ok:false,msg:'訓練は最大です'};const v=Math.round(6+g.t/9);c.train=Math.min(100,c.train+v);c.morale=Math.min(100,c.morale+3);msg=`訓練 +${v}`;}break;
  default:return {ok:false,msg:'?'};
 }
 g.busy=1;return {ok:true,msg};
};
G.moveGen=function(g,to){if(g.busy)return false;g.loc=to;g.busy=1;return true;};
G.ryugen=function(from,target,g){const k=S.castles[from].owner,cl=S.clans[k];if(cl.gold<COST.ryugen)return {ok:false,msg:'金が足りません'};cl.gold-=COST.ryugen;g.busy=1;
 const t=S.castles[target],dc=defStats(target).c,p=clamp(.35+(g.c-dc)/110,.08,.92);
 if(rnd()<p){t.loyal=Math.max(0,t.loyal-12);t.morale=Math.max(0,t.morale-14);return {ok:true,msg:`流言成功：${G.cname(target)}の民忠と士気が下がった`};}
 G.addRel(k,t.owner,-4);return {ok:false,msg:'流言は見破られた',spent:true};};
G.hikinuki=function(from,tg,g){const k=S.castles[from].owner,cl=S.clans[k];if(cl.gold<COST.hikinuki)return {ok:false,msg:'金が足りません'};cl.gold-=COST.hikinuki;g.busy=1;
 if(G.isLeader(tg))return {ok:false,msg:'当主は引き抜けない',spent:true};
 const dc=defStats(tg.loc).c,p=clamp(.12+(g.c-dc)/160+(65-tg.loyal)/90,.03,.85);
 if(rnd()<p){log(`${tg.n}が${G.CNK(tg.clan)}を離れ、${G.CNK(k)}に仕えた。`,'big',[k,tg.clan]);tg.clan=k;tg.loc=from;tg.loyal=60;tg.busy=1;return {ok:true,msg:`${tg.n}の引き抜きに成功`};}
 tg.loyal=Math.min(100,tg.loyal+5);return {ok:false,msg:`${tg.n}は誘いを断った`,spent:true};};
G.recruit=function(g,by,k){const p=g.prisoner?clamp(.35+by.s/250-(g.loyal-60)/120,.05,.9):clamp(.55+by.s/250,.1,.95);
 by.busy=1;if(rnd()<p){g.clan=k;g.ronin=false;g.prisoner=null;g.loyal=60+Math.floor(rnd()*20);g.busy=1;return true;}
 if(g.prisoner)g.loyal=Math.min(100,g.loyal+5);return false;};
G.hobi2=function(g){const cl=S.clans[g.clan];if(cl.gold<200)return false;cl.gold-=200;g.loyal=Math.min(100,g.loyal+15);return true;};
G.hobi=function(g){const cl=S.clans[g.clan];if(cl.gold<COST.hobi)return false;cl.gold-=COST.hobi;g.loyal=Math.min(100,g.loyal+15);return true;};

// 寝返り：城主その人を口説く。忠義の厚い者、一門、本城は動かない。金は城の大きさに応じ、同じ城へは半年おけない
G.negaeriLord=id=>{const c=S.castles[id];return G.castleGens(id).filter(g=>g.clan===c.owner&&!G.isLeader(g)).sort((a,b)=>(b.t+b.b)-(a.t+a.b))[0]||null;};
G.negaeriCost=id=>Math.round((300+G.C[id].koku*12)/50)*50;
G.negaeriWhy=function(k,id){const c=S.castles[id],o=c.owner;if(!S.clans[o])return '相手がいない';if(S.clans[o].cap===id)return '本城は寝返らない';
 const lord=G.negaeriLord(id);if(!lord)return '口説く城主がいない';if(lord.loyal>=78)return `${lord.n}は忠義に厚い`;
 const L=gen(S.clans[o].leader);if(L&&lord.n.slice(0,2)===L.n.slice(0,2))return `${lord.n}は${G.CNK(o)}の一門`;
 if(S.negT&&S.negT[id]&&S.t-S.negT[id]<180)return '調略の噂が残っている（半年おく）';return '';};
G.negaeriChance=function(k,id){if(G.negaeriWhy(k,id))return 0;const c=S.castles[id],o=c.owner;const L=gen(S.clans[k].leader);const lord=G.negaeriLord(id);
 const pr=clamp(G.power(k)/Math.max(1,G.power(o)),.3,3);
 const p=(72-lord.loyal)/120+((L?L.c:50)-lord.c)/400+(pr-1)*.05+(55-c.loyal)/400;return clamp(p,0,.35);};
G.killGen=g=>killGen(g);
G.negaeriForce=function(id){const c=S.castles[id],o=c.owner;let best=null,bp=-1;for(const n of G.ADJ[id]){const j=S.castles[n].owner;if(j===o||G.allied(j,o))continue;const p=G.power(j);if(p>bp){bp=p;best=j;}}
 if(!best)return null;c.owner=best;for(const g of S.gens)if(g.loc===id&&g.clan===o&&g.unit===null&&!G.isLeader(g)){g.clan=best;g.loyal=60;}
 const msg=`${G.cname(id)}が${G.CNK(o)}を離れ、${G.CNK(best)}に寝返った。`;log(msg,'big',[best,o]);if(!clanCastles(o).length)destroy(o,best);checkOver();G.onTerr&&G.onTerr();return msg;};
G.negaeri=function(k,id){const cl=S.clans[k];const why=G.negaeriWhy(k,id);if(why)return {ok:false,msg:why};const cost=G.negaeriCost(id);if(cl.gold<cost)return {ok:false,msg:`金が足りません（${cost}必要）`};
 cl.gold-=cost;const c=S.castles[id],o=c.owner,p=G.negaeriChance(k,id),lord=G.negaeriLord(id);S.negT=S.negT||{};S.negT[id]=S.t;
 if(rnd()<p){c.owner=k;c.troops=Math.round(c.troops*.55/100)*100;c.loyal=Math.min(c.loyal,50);
  for(const g of S.gens)if(g.loc===id&&g.clan===o&&g.unit===null&&!G.isLeader(g)){if(g===lord||rnd()<.5){g.clan=k;g.loyal=45;}else{g.loc=S.clans[o].cap||g.loc;}}
  G.addRel(k,o,-30);S.war=S.war||{};S.war[ekey(k,o)]=S.t;
  log(`${G.CNK(o)}の${lord.n}が${G.cname(id)}ごと${G.CNK(k)}に寝返った。兵の半ばは城を去った。`,'big',[k,o]);if(!clanCastles(o).length)destroy(o,k);checkOver();return {ok:true,msg:`${lord.n}が寝返った（兵は半ばが去った）`};}
 G.addRel(k,o,-12);lord.loyal=Math.min(100,lord.loyal+8);
 if(rnd()<.35){G.addRel(k,o,-15);return {ok:false,msg:`${lord.n}は誘いを主君に伝えた。${G.CNK(o)}の怒りを買った`};}
 return {ok:false,msg:`${lord.n}は誘いに乗らなかった`};};
G.truce=function(k,j){const p=clamp((G.rel(k,j)-20)/70+(G.power(k)/Math.max(1,G.power(j))-1)*.2,0,.9);if(rnd()<p){S.ally[ekey(k,j)]=Math.max(S.ally[ekey(k,j)]||0,180);G.addRel(k,j,6);log(`${G.CNK(k)}と${G.CNK(j)}が和睦した。`,'dip',[k,j]);return {ok:true,msg:`${G.CNK(j)}と和睦（半年）`};}G.addRel(k,j,-3);return {ok:false,msg:`${G.CNK(j)}は和睦を拒んだ`};};
G.truceChance=(k,j)=>clamp((G.rel(k,j)-20)/70+(G.power(k)/Math.max(1,G.power(j))-1)*.2,0,.9);

/* ===== 外交 ===== */
G.diploBest=function(k){const gs=clanGens(k).filter(g=>g.unit===null);gs.sort((a,b)=>b.s-a.s);return gs[0]||gen(S.clans[k].leader);};
G.shinzen=function(k,j){const cl=S.clans[k];if(cl.gold<COST.shinzen)return {ok:false,msg:'金が足りません'};cl.gold-=COST.shinzen;const g=G.diploBest(k);const v=Math.round(8+g.s/9+rnd()*5);G.addRel(k,j,v);return {ok:true,msg:`${G.CNK(j)}との友好 +${v}`};};
G.commonThreat=function(a,b){for(const t of G.alive()){if(t===a||t===b)continue;if(G.allied(t,a)||G.allied(t,b))continue;if(G.power(t)>Math.max(G.power(a),G.power(b))*1.2&&G.neighborClans(t).includes(a)&&G.neighborClans(t).includes(b))return t;}return null;};
G.neighborClans=function(k){const s=new Set();for(const id of clanCastles(k))for(const n of G.ADJ[id]){const o=S.castles[n].owner;if(o!==k)s.add(o);}return [...s];};
G.allyChance=function(k,j){const r=G.rel(k,j);if(r<55)return 0;let p=(r-50)/45;if(G.commonThreat(k,j))p+=.3;if(G.power(k)>G.power(j)*2)p+=.15;return clamp(p,0,.95);};
G.proposeAlly=function(k,j){const p=G.allyChance(k,j);if(rnd()<p){S.ally[ekey(k,j)]=720;G.addRel(k,j,10);log(`${G.CNK(k)}と${G.CNK(j)}が同盟を結んだ。`,'dip',[k,j]);return {ok:true,msg:`${G.CNK(j)}と同盟を結んだ（2年）`};}
 G.addRel(k,j,-5);return {ok:false,msg:`${G.CNK(j)}は同盟を断った`};};
G.submitTo=function(k,j){if(G.rel(k,j)<20)return {ok:false,msg:`${G.CNK(j)}は申し出を受けなかった`};S.ally[ekey(k,j)]=1e9;S.vassal=Object.assign(S.vassal||{},{[k]:j});G.addRel(k,j,20);log(`${G.CNK(k)}が${G.CNK(j)}に臣従した。`,'dip',[k,j]);return {ok:true,msg:`${G.CNK(j)}に臣従した`};};
G.breakAlly=function(k,j){if(S.vassal&&(S.vassal[k]===j||S.vassal[j]===k)){delete S.vassal[k];delete S.vassal[j];}delete S.ally[ekey(k,j)];S.rel[ekey(k,j)]=10;for(const o of G.alive())if(o!==k&&o!==j)G.addRel(o,k,-5);log(`${G.CNK(k)}が${G.CNK(j)}との同盟を破棄した。`,'dip',[k,j]);};
G.vassalChance=function(k,j){if(j===S.player&&k!==S.player)return 0;const ratio=G.power(j)/Math.max(1,G.power(k)),r=G.rel(k,j);if(ratio>.4||r<25)return 0;return clamp((.4-ratio)*1.6+(r-25)/160,0,.9);};
G.demandVassal=function(k,j){const p=G.vassalChance(k,j);if(rnd()<p){absorb(k,j);return {ok:true,msg:`${G.CNK(j)}が臣従した`};}G.addRel(k,j,-10);return {ok:false,msg:`${G.CNK(j)}は臣従を拒んだ`};};

/* ===== AI ===== */
function frontDist(k){const dist={},q=[];for(const id in S.castles){const o=S.castles[id].owner;if(o!==k&&!G.allied(o,k)){dist[id]=0;q.push(id);}}
 for(let h=0;h<q.length;h++){const u=q[h];for(const v of G.ADJ[u])if(dist[v]===undefined){dist[v]=dist[u]+1;q.push(v);}}return dist;}
G.frontDist=frontDist;
// 城の方針：城の持つ力（石高・商業・兵・堅さ）のどれに人手を注ぐか。四つは重ならない
G.POL={nou:{n:'農業',d:'開墾して石高を増やし、民をいたわる（兵糧・民忠）'},sho:{n:'商業',d:'市を開き、商いを伸ばす（金）'},hei:{n:'軍備',d:'兵を集めて鍛える（兵数・練度）'},jo:{n:'普請',d:'石垣と堀を整える（城の堅さ）'}};
G.polOf=id=>{const c=S.castles[id];const p=c.pol;if(G.POL[p])return p;if(p==='kai')return 'nou';if(p==='gun')return 'hei';if(p==='bou')return 'jo';return G.frontier(id)?'hei':'nou';};
function policyTick(id){const c=S.castles[id],C=G.C[id],p=G.polOf(id);const room=()=>Math.max(0,G.capOf(id)*(p==='hei'?1.15:1)-c.troops);
 if(c.troops>G.capOf(id)*1.25&&!G.unitAt(id).length)c.troops=Math.round(c.troops*.97);
 // どの方針でも、領内から少しずつ兵が集まる
 {const n=Math.min(c.pool,C.koku*6,room());c.pool-=n;c.troops+=n;}
 if(p==='nou'){c.koku=Math.min(c.kokuMax,Math.round((c.koku+.2)*10)/10);c.loyal=Math.min(100,c.loyal+1);}
 else if(p==='sho'){c.shogyo=Math.min(c.shogyoMax,c.shogyo+6);}
 else if(p==='hei'){const n=Math.min(c.pool,C.koku*24,room());c.pool-=n;c.troops+=n;c.train=Math.min(100,c.train+2);}
 else if(p==='jo'){c.durMax=Math.min(c.durMax+25,C.dur*3);c.dur=Math.min(c.durMax,c.dur+c.durMax*.05);}
}
function aiDomestic(k,ids,isPlayer){
 const cl=S.clans[k];
 if(!isPlayer&&S.div[k])for(const id of ids){const p=S.plans[id];if(p&&!S.works[id]&&cl.gold>G.planCost(p).gold*2&&rnd()<.08)G.startWork(k,id);}
 for(const id of ids){
  const c=S.castles[id];if(c.owner!==k)continue;
  const front=G.frontier(id);
  if(!isPlayer){c.pol=front?(c.dur<c.durMax*.6?'jo':'hei'):(c.koku<c.kokuMax*.9?'nou':'sho');}
  for(const g of G.idleGens(id)){
   const reserve=isPlayer?150:250;
   let did=false;const tryC=t=>{if(did)return;const r=G.cmd(t,id,g);if(r.ok)did=true;};
   const p=G.polOf(id);
   if(p==='nou'){if(cl.gold>reserve)tryC('kaikon');if(c.loyal<70)tryC('hodokoshi');}
   if(p==='sho'){if(cl.gold>reserve)tryC('shogyo');}
   if(p==='hei'){if(c.pool>=300&&cl.gold>reserve)tryC('chohei');tryC('kunren');}
   if(p==='jo'){if(cl.gold>reserve)tryC('fushin');}
   if(c.loyal<45&&cl.food>G.C[id].koku*500)tryC('hodokoshi');
   if(front){
    if(c.pool>=500&&c.troops<G.capOf(id)*.95&&cl.gold>reserve+120)tryC('chohei');
    if(c.train<85)tryC('kunren');
    if(c.dur<c.durMax*.85&&cl.gold>reserve+COST.fushin)tryC('fushin');
   }
   if(cl.gold>reserve+100){
    if(c.koku<c.kokuMax&&(g.s>=g.t||c.shogyo>=c.shogyoMax))tryC('kaikon');
    if(c.shogyo<c.shogyoMax)tryC('shogyo');
    if(c.koku<c.kokuMax)tryC('kaikon');
   }
   if(c.pool>=1500&&c.troops<G.capOf(id)*.8&&cl.gold>reserve+200)tryC('chohei');
   if(c.train<70)tryC('kunren');
  }
 }
}
function aiMilitary(k,factor){
 const cl=S.clans[k];if(!cl.alive)return;
 const fd=frontDist(k);const my=clanCastles(k);
 let active=S.units.filter(u=>u.clan===k&&u.mission==='attack').length;
 const maxA=Math.min(3,Math.max(1,Math.ceil(my.length/5)));
 const L=gen(cl.leader),aggr=(.28+(L?L.t:60)/400)*Math.min(1,10/Math.max(1,my.length));
 // 救援
 for(const id of my){const bes=G.unitAt(id).filter(u=>u.clan!==k);if(!bes.length)continue;const enemyT=bes.reduce((s,u)=>s+u.troops,0);
  for(const n of G.ADJ[id]){if(S.castles[n].owner!==k)continue;const nc=S.castles[n];const gg=G.bestFor(n,'t');if(!gg||nc.troops<2000)continue;const send=Math.floor(nc.troops*.65/100)*100;if(send+S.castles[id].troops>enemyT*.7){G.launch(k,n,id,[gg.id],send,send*.012*30,'move');break;}}}
 // 攻撃
 const cand=[];
 for(const id of my){const c=S.castles[id];if(c.troops<2500)continue;const gs=G.idleGens(id).sort((a,b)=>(b.t+b.b)-(a.t+a.b));if(!gs.length)continue;
  for(const t of G.ADJ[id]){const tc=S.castles[t],o=tc.owner;if(o===k||G.allied(k,o))continue;
   if(G.rel(k,o)>=70)continue;
   if(G.unitAt(t).some(u=>u.clan===k))continue;
   const send=Math.floor(c.troops*.78/100)*100;const lead=gs.slice(0,2);
   const ga={t:Math.max(...lead.map(g=>g.t)),b:Math.max(...lead.map(g=>g.b)),train:c.train,mor:c.morale*.6+40};
   let reinf=0;for(const n of G.ADJ[t])if(S.castles[n].owner===o)reinf+=S.castles[n].troops*.25;
   const est=G.simSiege(send,ga,t,reinf);
   if(!est.win||send<tc.troops*1.2)continue;
   const lossR=est.loss/send;
   const score=G.C[t].koku*1.6+(S.clans[o].cap===t?15:0)-est.days*.35-lossR*45+(o===S.player?4:0)+(tc.troops<1000?10:0);
   if(score>0&&lossR<.62)cand.push({id,t,send,lead,score});}}
 cand.sort((a,b)=>b.score-a.score);
 const usedFrom={};
 for(const x of cand){if(active>=maxA)break;if(usedFrom[x.id])continue;if(rnd()>aggr*factor)continue;
  if(S.clans[k].food<x.send*.012*60)continue;
  const tac=S.castles[x.t].dur>1500&&x.send<S.castles[x.t].troops*4?'hyoro':'chikara';
  if(G.launch(k,x.id,x.t,x.lead.map(g=>g.id),x.send,x.send*.012*90,'attack',tac)){active++;usedFrom[x.id]=1;
   // 隣の城からも兵を合わせる
   for(const n of G.ADJ[x.t]){if(n===x.id||usedFrom[n]||S.castles[n].owner!==k)continue;const nc=S.castles[n];if(nc.troops<4500)continue;const g=G.idleGens(n)[0];if(!g)continue;const send=Math.floor(nc.troops*.45/100)*100;if(G.launch(k,n,x.t,[g.id],send,send*.012*90,'attack',tac)){usedFrom[n]=1;break;}}}}
 // 後方から前線へ兵を送る
 if(factor<1)return;
 for(const id of my){if(usedFrom[id])continue;const c=S.castles[id];if(fd[id]<=1||c.troops<2200)continue;
  const nx=G.ADJ[id].filter(n=>S.castles[n].owner===k&&fd[n]<fd[id]).sort((a,b)=>fd[a]-fd[b])[0];
  const g=G.bestFor(id,'t');if(!nx||!g)continue;const send=Math.floor((c.troops-800)/100)*100;if(send<800)continue;
  G.launch(k,id,nx,[g.id],send,send*.012*15,'move');}
 // 武将の配置
 const empty=my.filter(id=>!G.castleGens(id).length);
 for(const id of empty){const src=my.filter(s=>G.idleGens(s).length>=2).sort((a,b)=>G.idleGens(b).length-G.idleGens(a).length)[0];if(!src)break;const g=G.idleGens(src).sort((a,b)=>a.t+a.b-b.t-b.b)[0];if(g&&!G.isLeader(g))G.moveGen(g,id);}
}
function aiDiplomacy(k){
 const cl=S.clans[k],me=G.power(k);
 if(S.div[k]&&cl.gold>1200&&rnd()<.1){const t=clanCastles(S.player).filter(id=>G.ADJ[id].some(n=>S.castles[n].owner===k)&&!G.allied(k,S.player)&&S.clans[S.player].cap!==id);
  const id=t.sort((a,b)=>G.negaeriChance(k,b)-G.negaeriChance(k,a))[0];if(id&&G.negaeriChance(k,id)>.15){const r=G.negaeri(k,id);if(r.ok&&G.onLost)G.onLost(id,k);return;}}
 const nbs=G.neighborClans(k).filter(j=>S.clans[j]&&S.clans[j].alive);
 // 臣従勧告
 for(const j of nbs){if(j===S.player||G.allied(k,j))continue;if(G.power(j)/me<.28&&rnd()<.12&&G.vassalChance(k,j)>0){G.demandVassal(k,j);return;}}
 const threats=nbs.filter(j=>!G.allied(k,j)&&G.power(j)>me*1.25);
 for(const t of threats){
  const pals=G.neighborClans(t).filter(j=>j!==k&&S.clans[j].alive&&!G.allied(j,t)&&!G.allied(j,k));
  for(const j of pals){
   if(G.rel(k,j)>=60){
    if(j===S.player){if(!S.propQ.find(p=>p.from===k))S.propQ.push({from:k,type:'ally'});}
    else G.proposeAlly(k,j);
    return;
   }
   if(cl.gold>700){cl.gold-=300;G.addRel(k,j,10+Math.round(rnd()*8));return;}
  }
  if(G.rel(k,t)<40&&cl.gold>900&&t!==S.player){cl.gold-=300;G.addRel(k,t,12);return;}
 }
}
function aiRonin(k){for(const id of clanCastles(k)){for(const g of G.ronins(id)){if(g.exile&&S.t<g.exile)continue;const by=G.bestFor(id,'s');if(by&&rnd()<.5)G.recruit(g,by,k);}}}
G.aiDomestic=aiDomestic;G.aiMilitary=aiMilitary;
})();
