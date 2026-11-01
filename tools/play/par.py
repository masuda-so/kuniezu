exec(open('/home/claude/play/lib.py').read())
import json,os
r=pg.evaluate("""(([sid,a,b])=>{G.newGame(sid,'__none');const S=G.S();S.player='__none';const st=G.evT({d:a}),end=G.evT({d:b});const seen=new Set();const out=[];
 while(S.t<end){G.day();S.evQ=[];S.sceneQ=[];if(S.battleQ)S.battleQ.length=0;S.propQ=[];if(S.t<st)continue;
  for(const u of S.units){if(seen.has(u.id))continue;seen.add(u.id);out.push(G.dstrW()+' '+G.CN(u.clan)+' '+u.mission+' '+u.gens.map(g=>(G.gen(g)||{}).n).join('/')+' '+u.path.map(G.cname).join('>')+(u.until?' ['+u.until+']':''));}}
 return JSON.stringify(out);})""",[os.environ['SID'],json.loads(os.environ['A']),json.loads(os.environ['B'])])
for x in json.loads(r): print(x[:220])
