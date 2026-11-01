exec(open('/home/claude/play/lib.py').read())
import json,os
r=pg.evaluate("""((a)=>{G.newGame('s1582','__none');const S=G.S();S.player='__none';const out=[];let prev={};for(const id in S.castles)prev[id]=S.castles[id].owner;
 const end=G.evT({d:[1585,3,1]});const seen=new Set();
 while(S.t<end){G.day();S.evQ=[];S.sceneQ=[];if(S.battleQ)S.battleQ.length=0;S.propQ=[];
  for(const u of S.units){if(seen.has(u.id))continue;seen.add(u.id);const tg=u.path[u.path.length-1];const o=S.castles[tg].owner;if(u.mission==='attack'||(u.hist&&o!==u.clan))out.push(G.dstrW()+' 出陣 '+G.CN(u.clan)+' → '+G.cname(tg)+'('+G.CN(o)+') '+(u.until||'')+' '+u.gens.map(g=>(G.gen(g)||{}).n).join('/'));}
  for(const id in S.castles){const o=S.castles[id].owner;if(o!==prev[id]){out.push(G.dstrW()+' 城 '+G.cname(id)+': '+G.CN(prev[id])+' → '+G.CN(o));prev[id]=o;}}}
 return JSON.stringify(out);})""",0)
for x in json.loads(r): print(x)
