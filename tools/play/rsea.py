import json
json.dump(json.loads(pg.evaluate("JSON.stringify(G.ROADS.map(r=>[r.name,r.pts]))")),open('/home/claude/play/roads.json','w'),ensure_ascii=False)
