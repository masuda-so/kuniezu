exec(open('/home/claude/play/lib.py').read())
import json
r=pg.evaluate("""(()=>{const out=[];for(const k in G.EDGES){const e=G.EDGES[k];if(!e.geo)continue;G.fitEdge(e);const g=e.g;
  const back=(P,Q,R)=>{const a=[Q[0]-P[0],Q[1]-P[1]],b=[R[0]-Q[0],R[1]-Q[1]];const la=Math.hypot(...a),lb=Math.hypot(...b);if(la<.5||lb<.5)return 0;return (a[0]*b[0]+a[1]*b[1])/(la*lb);};
  // 城から街道へ出る枝の長さと、折り返し（逆向き）の量
  const spurA=Math.hypot(g[1][0]-g[0][0],g[1][1]-g[0][1]),spurB=Math.hypot(g[g.length-1][0]-g[g.length-2][0],g[g.length-1][1]-g[g.length-2][1]);
  // 距離が縮まらずに増える区間（目的の城を通り過ぎてから戻る）
  const B=g[g.length-1],A=g[0];let minB=1e9,over=0;for(const p of g){const d=Math.hypot(p[0]-B[0],p[1]-B[1]);if(d<minB)minB=d;}
  let passB=0;for(let i=1;i<g.length-1;i++){const d=Math.hypot(g[i][0]-B[0],g[i][1]-B[1]);if(d<spurB-3)passB=Math.max(passB,spurB-d);}
  let passA=0;for(let i=1;i<g.length-1;i++){const d=Math.hypot(g[i][0]-A[0],g[i][1]-A[1]);if(d<spurA-3)passA=Math.max(passA,spurA-d);}
  const cb=back(g[g.length-3]||g[0],g[g.length-2],B),ca=back(A,g[1],g[2]||B);
  if(passA>4||passB>4||cb<-.5||ca<-.5)out.push([G.cname(e.a),G.cname(e.b),Math.round(spurA),Math.round(spurB),Math.round(passA),Math.round(passB),ca.toFixed(2),cb.toFixed(2)]);}
 return JSON.stringify({n:Object.keys(G.EDGES).length,bad:out});})()""")
d=json.loads(r);print('edges',d['n'],'suspicious',len(d['bad']))
for x in d['bad'][:60]: print(x)
