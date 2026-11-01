import json
for sc in ['s1560','s1570','s1582','s1585']:
  print(sc,pg.evaluate(f"(()=>{{G.newGame('{sc}','__none');return JSON.stringify(G.preList().map(x=>x.k+':'+x.leader+'@'+x.castles.map(G.cname).join(',')+'<'+x.parent+' '+x.d[0]))}})()"))
