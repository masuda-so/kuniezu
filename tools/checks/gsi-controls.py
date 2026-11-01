import json
import pathlib
import sys

root=pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0,str(root/'tools/geo'))
from gsi_controls import exact_point

search=json.loads((root/'data/inputs/hokurikudo-review/route-controls-search.json').read_text())
features=next(r['result']for r in search if r['query']=='木ノ芽峠')
assert features[0]['geometry']['coordinates'][0]>139, 'captured first result reproduces the incorrect distant hit'
point=exact_point(features,'木ノ芽峠',[135,35,137,36])
assert point==[136.140150898186,35.71709061195]
rows=json.loads((root/'data/inputs/rokujurigo-review/gsi-controls-search.json').read_text())
features=next(r['result']for r in rows if r['query']=='村山駅')
try:exact_point(features,'村山駅')
except ValueError:pass
else:raise AssertionError('same station name in Nagano and Yamagata must remain ambiguous')
assert exact_point(features,'村山駅',[140,38,141,39])==[140.386448583333,38.4772979444444]
try:exact_point(features,'存在しない点',[140,38,141,39])
except LookupError:pass
else:raise AssertionError('absent point must not silently fall back to a municipality')
print('PASS: real ambiguous/distant GSI hits are rejected; exact title and regional controls selected')
