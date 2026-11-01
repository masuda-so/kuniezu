exec(open('/home/claude/play/lib.py').read())
import json,os
sid=os.environ['SID'];days=int(os.environ.get('DAYS','720'))
r=pg.evaluate("""(([sid,days])=>{G.newGame(sid,'oda');const ks=Object.keys(G.S().clans).filter(k=>G.S().clans[k].alive);const out=[];
 for(const k of ks){G.newGame(sid,k);const S=G.S();const t0=S.t;let end=null;
  for(let i=0;i<days;i++){G.day();
   while(S.evQ&&S.evQ.length){const v=G.eventView();if(!v){S.evQ.shift();continue;}const h=v.opts.findIndex(o=>o.hist);const nd=v.opts.findIndex(o=>!/歴史が分かれる/.test(o.d||''));G.chooseEvent(h>=0?h:(nd>=0?nd:0));}
   if(S.battleQ)S.battleQ.length=0;if(S.sceneQ)S.sceneQ.length=0;if(S.propQ)S.propQ.length=0;if(S.prisonQ)S.prisonQ.length=0;
   if(S.over||S.extinct||!S.clans[k]||!S.clans[k].alive){end=i;break;}}
  if(end!==null)out.push([k,G.CN(k),end,S.over||'',S.extinct||'',G.clanCastles(k).length]);}
 return JSON.stringify({n:ks.length,dead:out});})""", [sid,days])
d=json.loads(r);print(sid,'clans',d['n'])
for x in sorted(d['dead'],key=lambda x:x[2]): print('  ',x)
