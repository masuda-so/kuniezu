import json
r=pg.evaluate("""(()=>{G.newGame('s1560','__none');const S=G.S();S.player='__none';const seen=new Set(),out=[];const end=G.evT({d:[1616,1,1]});
 while(S.t<end){G.day();S.evQ=[];if(S.battleQ)S.battleQ.length=0;if(S.sceneQ)S.sceneQ.length=0;for(const u of S.units){if(seen.has(u.id))continue;seen.add(u.id);if(u.hist)out.push(G.date().y+' '+(u.until||'')+' '+G.CN(u.clan)+' '+(u.gens.map(g=>(G.gen(g)||{}).n).join('/'))+' '+u.troops);}}
 return JSON.stringify(out);})()""")
for x in json.loads(r)[45:200]:print(x)
