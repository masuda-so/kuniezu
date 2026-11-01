import json
r=pg.evaluate("""JSON.stringify(TKGEO.land.map((p,i)=>{let xs=[],ys=[];const R=Array.isArray(p[0])?p[0]:p;for(let j=0;j<R.length;j+=2){xs.push(R[j]);ys.push(R[j+1]);}return [i,R.length/2,Math.min(...xs)|0,Math.max(...xs)|0,Math.min(...ys)|0,Math.max(...ys)|0]}).filter(a=>a[4]<60&&a[3]>1300))""")
print(r)
print(pg.evaluate("JSON.stringify([typeof TKGEO.land[6][0], TKGEO.land[6].length])"))
