import json
r=pg.evaluate("""(()=>{G.newGame('s1600','__none');const S=G.S();return JSON.stringify(G.CL.filter(C=>S.castles[C.id].owner!=='joseon').map(C=>G.cname(C.id)+'('+C.prov+')['+G.CN(S.castles[C.id].owner)+']:'+G.castleGens(C.id).map(g=>g.n).join('/')));})()""")
for x in json.loads(r): print(x)
