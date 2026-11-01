exec(open('/home/claude/play/lib.py').read())
r=pg.evaluate("""(()=>{G.newGame('s1600','tokugawa');let worst=0,w=null,moved=0;for(const k in G.EDGES){const e=G.EDGES[k];for(const [a,b] of [[e.a,e.b],[e.b,e.a]]){const p=G.edgePoint(a,b,1);const C=G.C[b];const d=Math.hypot(p[0]-C.x,p[1]-C.y);if(d>worst){worst=d;w=G.cname(b);}}}
 for(const C of G.CL)if(Math.hypot(C.x-C.bx,C.y-C.by)>2)moved++;return 'moved castles '+moved+' worst endpoint gap '+worst.toFixed(2)+' '+w;})()""")
print(r)
