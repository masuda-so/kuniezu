r=pg.evaluate("""(()=>{G.newGame('s1592','oda');const S=G.S();const end=G.evT({d:[1598,1,1]});let last='';try{while(S.t<end){G.day();let n=0;while(S.evQ&&S.evQ.length){if(++n>50)return 'loop '+G.dstr()+' '+JSON.stringify(S.evQ[0]);const v=G.eventView();if(!v){S.evQ.shift();continue;}last=v.title;const h=v.opts.findIndex(o=>o.hist);G.chooseEvent(h>=0?h:0);}}}catch(e){return 'ERR '+G.dstr()+' '+last+' '+e.stack.slice(0,500);}
 return 'ok '+G.dstr()+' hojo:'+JSON.stringify(S.clans.hojo)+' oda:'+G.clanCastles('oda').map(G.cname);})()""")
print(r)
