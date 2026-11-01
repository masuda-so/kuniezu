"""Join overlapping official sheets only after their geographic strokes agree."""
import json
import math
from pathlib import Path

root=Path('data/inputs/hyuga-road-review')
a=json.loads((root/'selected-route-segment.json').read_text())['points']
b=json.loads((root/'selected-route-segment-2.json').read_text())['points']
def metres(a,b):
    return math.hypot((a[0]-b[0])*math.cos(math.radians((a[1]+b[1])/2)),a[1]-b[1])*111320
j=min(range(len(b)),key=lambda i:metres(a[-1],b[i]))
gap=metres(a[-1],b[j]);assert gap<15, 'Do not bridge a mismatched geographic sheet'
points=a+b[j:]
record={'status':'registered-source-route','points':points,
        'lengthKm':sum(metres(x,y)for x,y in zip(points,points[1:]))/1000,
        'joinMetres':gap,'secondSheetOverlapEndIndex':j,
        'scope':'文化庁112選定地図2頁の赤ベクトル線を緯経度枠へ変換。重複を除き、地理座標の一致点で接続。ゲームでの採否はaccepted-whole-reference.jsonに保持。'}
(root/'selected-route-joined.json').write_text(json.dumps(record,ensure_ascii=False,indent=2))
print({k:v for k,v in record.items()if k!='points'})
