exec(open('/home/claude/play/lib.py').read())
import json
r=pg.evaluate("""(()=>{G.newGame('s1600','__none');const S=G.S();S.player='__none';const end=G.evT({d:[1600,12,25]});let out=[];
 while(S.t<end){G.day();S.evQ=[];S.sceneQ=[];if(S.battleQ)S.battleQ.length=0;S.propQ=[];
  if(S.t>=G.evT({d:[1600,11,19]})){const c=S.castles.tachibana;const gs=S.gens.filter(g=>g.loc==='tachibana'&&!g.dead).map(g=>g.n+'/'+g.clan+(g.unit!=null?'/u':''));
   const us=S.units.filter(u=>u.path[u.path.length-1]==='tachibana'||u.path.includes('tachibana')).map(u=>u.clan+':'+u.mission+':'+u.state+':'+u.path.map(G.cname).join('>')+(u.hist?':hist':'')+(u.until?':'+u.until:''));
   out.push(G.dstrW()+' owner='+c.owner+' gens='+gs.join(',')+' units='+us.join(' ; '));}}
 out.push(S.log.slice(0,40).map(l=>l.t||l.s||JSON.stringify(l).slice(0,120)).join('\\n'));
 return JSON.stringify(out.filter((x,i,a)=>i===0||x.split(' ').slice(1).join(' ')!==a[i-1].split(' ').slice(1).join(' ')));})()""")
for x in json.loads(r): print(x[:600])
