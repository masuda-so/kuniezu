import json
for sc,k,opt in [('s1560','tokugawa',0),('s1582','hashiba',1),('s1585','ishida',0)]:
  r=pg.evaluate("""([sc,k,opt])=>{G.newGame(sc,k);const S=G.S();const R=G.retainer();const log=[JSON.stringify(R&&{p:R.parent,t:R.t,title:R.title}),'castles:'+G.clanCastles(k).length];
   for(let d=0;d<1500;d++){G.day();while(S.evQ&&S.evQ.length){const v=G.eventView();if(!v){S.evQ.shift();continue;}let i;if(v.title==='自立の時'){i=opt;log.push(G.dstr()+' 自立の時→'+v.opts[i].t);}else{const h=v.opts.findIndex(o=>o.hist);i=h>=0?h:0;}G.chooseEvent(i);}
    if(S.battleQ)S.battleQ.length=0;if(S.sceneQ)S.sceneQ.length=0;if(S.propQ)S.propQ.length=0;if(!G.retainer()&&log.length<4){log.push(G.dstr()+' 自立 castles='+G.clanCastles(k).map(G.cname).join(','));}if(S.over)break;}
   log.push('end '+G.dstr()+' retainer='+!!G.retainer()+' castles='+G.clanCastles(k).length+' extinct='+S.extinct);return log.join(' | ');}""",[sc,k,opt])
  print(sc,k,r)
r=pg.evaluate("""(()=>{G.newGame('s1570','hashiba');const S=G.S();S.evQ=[{dyn:'jiritsu_try'}];const v=G.eventView();const m=G.chooseEvent(1);return v.title+' / '+m+' / '+G.clanCastles('hashiba').map(G.cname)+' war:'+G.atWar('hashiba','oda');})()""")
print(r)
