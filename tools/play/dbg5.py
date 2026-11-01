r=pg.evaluate("""(()=>{G.newGame('s1585','__none');const S=G.S();S.player='__none';const out=[];const end=G.evT({d:[1590,10,1]});let pv=null;while(S.t<end){G.day();S.evQ=[];if(S.battleQ)S.battleQ.length=0;if(S.sceneQ)S.sceneQ.length=0;const o=S.castles.odawara.owner;if(o!==pv){out.push(G.dstrW()+' '+o);pv=o;}}
 const c=S.chron.filter(e=>/小田原/.test(e.title||'')).map(e=>e.s+' '+e.title+' ok='+e.ok);return JSON.stringify({out,c,hojo:S.clans.hojo.alive,units:S.units.filter(u=>u.path[u.path.length-1]==='odawara').map(u=>[u.clan,u.until,u.state,u.releaseAt])});})()""")
print(r)
