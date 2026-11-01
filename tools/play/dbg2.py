exec(open('/home/claude/play/lib.py').read())
import json
r=pg.evaluate("""(()=>{const out=[];for(const [sid,k] of [['s1570','tsugaru'],['s1575','ukita'],['s1582','sanada']]){G.newGame(sid,'oda');const S=G.S();
 const e=TK.HIST.find(h=>h.k==='newclan'&&h.clan===k);const g=G.genByName(e.leader);out.push([sid,k,e.leader,e.castles.join(','),g?[g.n,g.clan,g.loc,g.ronin,g.dead]:null, e.castles.map(id=>S.castles[id]&&S.castles[id].owner).join(',')]);}
 return JSON.stringify(out);})()""")
for x in json.loads(r): print(x)
