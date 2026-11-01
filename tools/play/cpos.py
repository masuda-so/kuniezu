import json
r=pg.evaluate("""JSON.stringify(G.CL.map(C=>{const lon=C.bx/(200*Math.cos(36*Math.PI/180))+129.2,lat=41.75-C.by/200;return [C.id,C.n1,+lon.toFixed(3),+lat.toFixed(3)]}))""")
json.dump(json.loads(r),open('/home/claude/play/cpos.json','w'),ensure_ascii=False)
