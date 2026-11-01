import json
r=pg.evaluate("""(()=>{G.newGame('s1575','oda');const out=[];for(const k in G.EDGES){const e=G.EDGES[k];if(e.sea)continue;const [a,b]=k.split('|').length>1?k.split('|'):[e.a,e.b];
 let prev=null,mx=0,at=0;const L=e.len||30;for(let i=0;i<=200;i++){const f=i/200;const p=G.edgePoint(e.a,e.b,f);if(prev){const d=Math.hypot(p[0]-prev[0],p[1]-prev[1]);if(d>mx){mx=d;at=f;}}prev=p;}
 const tot=e.cum?e.cum[e.cum.length-1]:L;if(mx>Math.max(1.5,tot/200*6))out.push([G.cname(e.a),G.cname(e.b),+mx.toFixed(1),at,+tot.toFixed(0)]);}
 return JSON.stringify(out.sort((x,y)=>y[2]-x[2]).slice(0,30));})()""")
for x in json.loads(r):print(x)
