exec(open('/home/claude/play/lib.py').read())
import json
r=pg.evaluate("""(()=>{const out=[];
 for(const sid of Object.keys(TK.SCEN)){const sc=TK.SCEN[sid];
  G.newGame(sid,'oda');let S=G.S();const alive=Object.keys(S.clans).filter(k=>S.clans[k].alive);
  const t0=G.evT({d:sc.start||[sc.year,sc.month,1]});
  // 始まりから3年以内に新しく立つ家
  const later=TK.HIST.filter(e=>e.k==='newclan'&&G.evT(e)>=S.t&&G.evT(e)<S.t+3*360&&!(S.clans[e.clan]&&S.clans[e.clan].alive)).map(e=>e.clan+'@'+e.d.join('-')+' '+e.title);
  out.push({sid,title:sc.title,n:alive.length,later});
 }
 return JSON.stringify(out);})()""")
for x in json.loads(r): print(x)
