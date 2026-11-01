import json
r=pg.evaluate("""(()=>{G.newGame('s1585','__none');const S=G.S();S.player='__none';const out=[];const show=()=>out.push(G.dstrW()+' oda:'+G.clanCastles('oda').map(G.cname).join(',')+' alive='+(S.clans.oda&&S.clans.oda.alive)+' L='+(S.clans.oda&&G.gen(S.clans.oda.leader)||{}).n+' | gifu:'+G.CN(S.castles.gifu.owner)+' '+G.castleGens('gifu').map(g=>g.n).join('/'));show();
 const ts=[[1587,1,1],[1590,7,1],[1590,9,1],[1592,12,1],[1600,9,1],[1600,10,20]];for(const d of ts){const e=G.evT({d});while(S.t<e){G.day();S.evQ=[];S.sceneQ=[];if(S.battleQ)S.battleQ.length=0;S.propQ=[];}show();}
 return JSON.stringify(out);})()""")
for x in json.loads(r): print(x)
