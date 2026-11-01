exec(open('/home/claude/play/lib.py').read())
import json
r=pg.evaluate("""(()=>{const out=[];let n=0,nr=0;for(const k in G.EDGES){const e=G.EDGES[k];if(e.sea)continue;n++;if(!e.geo){nr++;out.push(G.cname(e.a)+'-'+G.cname(e.b)+' '+Math.round(e.len));}}return JSON.stringify({n,nr,out});})()""")
d=json.loads(r);print(d['n'],d['nr']);print('  '.join(d['out']))
