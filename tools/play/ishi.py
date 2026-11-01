exec(open('/home/claude/play/lib.py').read())
import json
r=pg.evaluate("""(()=>{G.newGame('s1600','ishida');const S=G.S();const out=[];let prev='';
 for(let i=0;i<200;i++){G.day();while(S.evQ&&S.evQ.length){const v=G.eventView();if(!v){S.evQ.shift();continue;}const h=v.opts.findIndex(o=>o.hist);G.chooseEvent(h>=0?h:0);}if(S.battleQ)S.battleQ.length=0;S.sceneQ=[];S.propQ=[];
  const cs=G.clanCastles('ishida').map(G.cname).join(',');if(cs!==prev){out.push(G.dstrW()+' ishida: '+cs);prev=cs;}}
 const units=S.units.map(u=>u.clan+':'+u.gens.map(g=>(G.gen(g)||{}).n).join('/')+':'+u.path.map(G.cname).join('>'));
 return JSON.stringify({out,units});})()""")
d=json.loads(r);print('\n'.join(d['out']));print('\n'.join(d['units']))
