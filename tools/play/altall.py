import json,sys
forks=json.loads(pg.evaluate("JSON.stringify(TK.FORKS.filter(f=>f.opts.some(o=>o.hist)).map(f=>[f.id,f.clan,f.d||null,f.title,f.opts.map(o=>!!o.hist)]))"))
scs=json.loads(pg.evaluate("JSON.stringify(Object.values(TK.SCEN).map(s=>[s.id,s.base?s.start:[s.year,s.month,1]]))"))
out=[]
for fid,clan,d,title,hs in forks:
  if not d:continue
  cand=[s for s in scs if (s[1][0],s[1][1])<=(d[0],d[1])]
  sc=max(cand,key=lambda s:(s[1][0],s[1][1]))[0] if cand else None
  if not sc:continue
  for oi,h in enumerate(hs):
    if h:continue
    r=pg.evaluate("""([sc,clan,fid,oi])=>{G.newGame(sc,clan);const S=G.S();if(!S.clans[clan]||!S.clans[clan].alive)return JSON.stringify({skip:'not alive'});let t0=null;
      for(let d=0;d<4000;d++){G.day();while(S.evQ&&S.evQ.length){const v=G.eventView();if(!v){S.evQ.shift();continue;}let i;if(v.id===fid){i=oi;t0=S.t;}else{const h=v.opts.findIndex(o=>o.hist);i=h>=0?h:0;}G.chooseEvent(i);}
       if(S.battleQ)S.battleQ.length=0;if(S.sceneQ)S.sceneQ.length=0;if(S.propQ)S.propQ.length=0;if(S.over)break;if(t0!=null&&S.t>t0+720)break;}
      if(t0==null)return JSON.stringify({skip:'no fork'});
      const after=S.chron.filter(e=>e.t>t0&&e.ok&&e.title&&!e.alt).map(e=>e.title);
      const evs=TK.HIST.filter(e=>after.includes(e.title));
      const inv=[...new Set(evs.filter(e=>{const ks=[e.clan,e.a,e.b];const w=e.who&&G.genByName(e.who);if(w)ks.push(w.clan);return ks.includes(clan);}).map(e=>e.title))];
      return JSON.stringify({inv,div:!!S.div[clan]});}""",[sc,clan,fid,oi])
    o=json.loads(r);out.append([fid,oi,sc,o]);print(fid,oi,sc,o,flush=True)
json.dump(out,open('/home/claude/play/altall.json','w'),ensure_ascii=False)
