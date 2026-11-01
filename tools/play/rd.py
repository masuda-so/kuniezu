exec(open('/home/claude/play/lib.py').read())
import json
r=pg.evaluate("""(()=>{const out=[];for(const C of G.CL){let bd=1e9,bn='';for(const r of G.ROADS)for(const p of r.pts){const d=Math.hypot(p[0]-C.x,p[1]-C.y);if(d<bd){bd=d;bn=r.name;}}if(bd>2.5&&bd<25)out.push([C.n1,bn,Math.round(bd*10)/10]);}return JSON.stringify(out.sort((a,b)=>b[2]-a[2]));})()""")
L=json.loads(r);print(len(L));print(' '.join(f"{a}/{b}:{c}" for a,b,c in L))
