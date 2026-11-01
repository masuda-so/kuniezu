exec(open('/home/claude/play/lib.py').read())
import json
r=pg.evaluate("""(()=>{const out={};for(const sid of Object.keys(TK.SCEN)){G.newGame(sid,'oda');const S=G.S();
 out[sid]=G.alive().map(k=>{const L=G.gen(S.clans[k].leader);return [k,G.CN(k),L?L.n:'(なし)',G.clanCastles(k).length];});}
 return JSON.stringify(out);})()""")
d=json.loads(r)
for sid,v in d.items():
  print(sid, ' '.join(f"{c}:{l}({n})" for k,c,l,n in v))
