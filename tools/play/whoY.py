import json,os
sc=os.environ.get('SC','s1570')
r=pg.evaluate("""(sc)=>{G.newGame(sc,'__none');const S=G.S();return JSON.stringify(G.CL.filter(C=>S.castles[C.id].owner!=='joseon').map(C=>G.cname(C.id)+'['+G.CN(S.castles[C.id].owner)+']:'+G.castleGens(C.id).map(g=>g.n).join('/')));}""",sc)
print(sc,'  '.join(json.loads(r)))
