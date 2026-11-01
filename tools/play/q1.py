import json
for sc,k in [('s1560','tokugawa'),('s1582','oda'),('s1560','oda'),('s1575','tokugawa')]:
  r=pg.evaluate("""([sc,k])=>{G.newGame(sc,k);const S=G.S();const seen=[];
   for(let d=0;d<1200;d++){G.day();while(S.evQ&&S.evQ.length){const v=G.eventView();if(!v){S.evQ.shift();continue;}seen.push(G.date().y+' '+v.title+' ['+v.opts.length+']');const h=v.opts.findIndex(o=>o.hist);G.chooseEvent(h>=0?h:0);}
    if(S.battleQ)S.battleQ.length=0;if(S.sceneQ)S.sceneQ.length=0;if(S.propQ)S.propQ.length=0;if(S.over)break;}
   return JSON.stringify({seen:seen.slice(0,30),date:G.dstr(),vas:S.vassal&&S.vassal[k],c:G.clanCastles(k).length});}""",[sc,k])
  print(sc,k,r)
