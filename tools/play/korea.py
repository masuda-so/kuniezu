exec(open('/home/claude/play/lib.py').read())
import json
r=pg.evaluate("""(()=>{G.newGame('s1592','__none');const S=G.S();S.player='__none';const end=G.evT({d:[1598,12,30]});const seen=new Set();const out=[];
 while(S.t<end){G.day();S.evQ=[];S.sceneQ=[];if(S.battleQ)S.battleQ.length=0;
  for(const u of S.units){const L=S.clans[u.clan]&&S.clans[u.clan].leader;const lead=u.gens.includes(L);const key=u.id;if(seen.has(key))continue;seen.add(key);
   out.push(G.dstrW()+' '+G.CN(u.clan)+' '+u.mission+' '+u.gens.map(g=>(G.gen(g)||{}).n).join('/')+(lead?' ★当主':'')+' '+u.path.map(G.cname).join('>'));}}
 const h=S.gens.find(g=>g.n==='豊臣秀吉'||g.n==='木下秀吉');out.push('秀吉の居場所 '+(h&&G.cname(h.loc)));return JSON.stringify(out);})()""")
for x in json.loads(r): print(x[:200])
