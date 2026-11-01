exec(open('/home/claude/play/lib.py').read())
import json,os
r=pg.evaluate("""((sid)=>{G.newGame(sid,'__none');const S=G.S();S.player='__none';const out=[];let prev={};for(const id in S.castles)prev[id]=S.castles[id].owner;
 const end=G.evT({d:[1615,7,1]});
 const ok=(id,po,no)=>TK.HIST.some(h=>{const t=G.evT(h);if(t>S.t||t<S.t-90)return false;
   if((h.k==='take'||h.k==='newclan')&&(h.castles||[]).includes(id))return true;
   if((h.k==='takeall'||h.k==='absorb')&&h.b===po)return true;if(h.k==='submit'&&h.b===po)return true;return false;});
 while(S.t<end){G.day();S.evQ=[];S.sceneQ=[];if(S.battleQ)S.battleQ.length=0;S.propQ=[];
  for(const id in S.castles){const o=S.castles[id].owner;if(o!==prev[id]){if(!ok(id,prev[id],o))out.push(G.dstrW()+' '+G.cname(id)+': '+G.CN(prev[id])+' → '+G.CN(o));prev[id]=o;}}}
 return JSON.stringify(out);})""",os.environ['SID'])
for x in json.loads(r): print(x)
