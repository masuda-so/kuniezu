exec(open('/home/claude/play/lib.py').read())
import json
r=pg.evaluate("""(()=>{const out=[];
 for(const [sid,k] of [['s1560','tokugawa'],['s1570','tsugaru'],['s1575','ukita'],['s1582','hashiba'],['s1582','sanada'],['s1582','sassa'],['s1600','ishida']]){
  G.newGame(sid,'oda');const pl=G.preList().map(x=>x.k+':'+x.castles.join(',')+'<'+x.parent);
  G.newGame(sid,k);const S=G.S();const a=[sid,k,'pre='+pl.join(' '),'alive='+!!(S.clans[k]&&S.clans[k].alive),'cs='+G.clanCastles(k).map(G.cname).join(','),'L='+((G.gen((S.clans[k]||{}).leader)||{}).n),'vassal='+(S.vassal||{})[k]];
  for(let i=0;i<400;i++){G.day();while(S.evQ&&S.evQ.length){const v=G.eventView();if(!v){S.evQ.shift();continue;}const h=v.opts.findIndex(o=>o.hist);G.chooseEvent(h>=0?h:0);}if(S.battleQ)S.battleQ.length=0;S.sceneQ=[];S.propQ=[];}
  a.push('after: cs='+G.clanCastles(k).length+' vassal='+(S.vassal||{})[k]+' alive='+!!(S.clans[k]&&S.clans[k].alive)+' extinct='+(S.extinct||0)+' over='+S.over);out.push(a.join(' | '));}
 return JSON.stringify(out);})()""")
for x in json.loads(r): print(x)
