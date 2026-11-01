exec(open('/home/claude/play/lib.py').read())
import json
r=pg.evaluate("""(()=>{const seen={};for(const sid of Object.keys(TK.SCEN)){G.newGame(sid,'oda');const S=G.S();const end=S.t+360*3;const P=S;
  const take=()=>{for(const g of G.S().gens){if(g.dead)continue;const n=g.n;if(TK.faceOf(n)>=0)continue;const L=G.S().clans[g.clan]&&G.S().clans[g.clan].leader===g.id;const sc=(g.t||0)+(g.b||0)+(g.c||0)+(L?120:0);if(!seen[n]||seen[n]<sc)seen[n]=sc;}};take();}
 return JSON.stringify(Object.entries(seen).sort((a,b)=>b[1]-a[1]).slice(0,140));})()""")
L=json.loads(r);print(len(L));print(' '.join(f"{n}" for n,s in L))
