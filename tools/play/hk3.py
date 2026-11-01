import json
d=json.loads(pg.evaluate("JSON.stringify(TKGEO.land[6])"))
json.dump(d,open('/tmp/claude-0/hk.json','w'))
print([len(r) for r in d])
