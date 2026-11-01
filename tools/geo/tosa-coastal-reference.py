"""Replace the rejected coastal comparison only, keeping all other road sources."""
import hashlib
import json
import math
from pathlib import Path

from shapely.geometry import LineString

root = Path(__file__).resolve().parents[2]
inputs = root / 'data/inputs/tosa-road-review'
gsi = json.loads((inputs / 'gsi-middle-candidate.json').read_text())
assert gsi['review']['issues'] == [] and gsi['distanceMeters'] < 90000
raw = json.loads((inputs / 'coastal-corrected-bike-candidate.json').read_text())['rejected']['土佐東街道']
prefix_points = raw['points']


def distance(a, b):
    return math.hypot((a[0]-b[0])*math.cos(math.radians((a[1]+b[1])/2)), a[1]-b[1])*111320


start = raw['snappedPoints'][5]['location']
end = raw['snappedPoints'][11]['location']
first = min(range(len(prefix_points)), key=lambda i: distance(prefix_points[i], start))
last = min((i for i in range(first+1, len(prefix_points))),
           key=lambda i: (distance(prefix_points[i], end), -i))
assert distance(prefix_points[first], start) < 1
assert distance(prefix_points[last], end) < 1
joins = [distance(prefix_points[first], gsi['points'][0]),
         distance(gsi['points'][-1], prefix_points[last])]
assert max(joins) < 25, 'Do not invent a missing road between data sources'
merged = prefix_points[:first+1] + gsi['points'] + prefix_points[last:]
merged = [[round(x, 6), round(y, 6)] for x, y in LineString(merged).simplify(.00002).coords]
game = root / 'game/modern-road-reference.js'
text = game.read_text()
marker = 'TK.MODERN_ROAD_REFERENCE='
head, body = text.split(marker)
existing = json.loads(body.strip().removesuffix(';'))
assert merged[0] == existing['土佐東街道'][0] and merged[-1] == existing['土佐東街道'][-1]
accepted = inputs / 'accepted-whole-reference.json'
if not accepted.exists():
    (inputs / 'before-modern-reference.json').write_text(json.dumps({
        'name': '土佐東街道', 'points': existing['土佐東街道'],
        'gameFileSha256': hashlib.sha256(game.read_bytes()).hexdigest()}, ensure_ascii=False))
record = {'status': 'accepted-modern-comparison', 'name': '土佐東街道', 'points': merged,
          'scope': '沿岸の現代道路比較。野根山街道・中世の遍路道中心線を復元するものではない。近代トンネルを含みうる。',
          'middleDistanceMetres': gsi['distanceMeters'], 'joinMetres': joins,
          'sources': ['国土地理院 道路中心線ベクトルタイル提供実験', 'OpenStreetMap contributors / FOSSGIS OSRM'],
          'documentation': 'https://github.com/gsi-cyberjapan/experimental_rdcl',
          'checked': '2026-11-02'}
accepted.write_text(json.dumps(record, ensure_ascii=False, indent=2))
existing['土佐東街道'] = merged
head = head.replace('北国街道北部は', '北国街道北部・土佐東街道沿岸は')
game.write_text(head + marker + json.dumps(existing, ensure_ascii=False, separators=(',', ':')) + ';\n')
print({'vertices': len(merged), 'middleKm': gsi['distanceMeters']/1000, 'joinMetres': joins})
