exec(open('/home/claude/play/lib.py').read())
import json,os
r=pg.evaluate("""(([sid,y0,y1])=>{G.newGame(sid,'__none');const S=G.S();S.player='__none';const out=[];let prev={};for(const id in S.castles)prev[id]=S.castles[id].owner;
 const end=G.evT({d:[y1,12,30]});const st=G.evT({d:[y0,1,1]});
 while(S.t<end){G.day();S.evQ=[];S.sceneQ=[];if(S.battleQ)S.battleQ.length=0;S.propQ=[];
  for(const id in S.castles){const o=S.castles[id].owner;if(o!==prev[id]){if(S.t>=st)out.push(G.dstrW()+' '+G.cname(id)+': '+G.CN(prev[id])+' → '+G.CN(o));prev[id]=o;}}}
 return JSON.stringify(out);})""",[os.environ['SID'],int(os.environ['Y0']),int(os.environ['Y1'])])
for x in json.loads(r): print(x)
