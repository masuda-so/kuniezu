"""Keep the official Mikuni-pass map segment intact between modern comparison approaches."""
import hashlib
import json
import math
from pathlib import Path

from shapely.geometry import LineString

root=Path(__file__).resolve().parents[2]
inputs=root/'data/inputs/hyuga-road-review'
game=root/'game/modern-road-reference.js'
head,body=game.read_text().split('TK.MODERN_ROAD_REFERENCE=')
existing=json.loads(body.strip().removesuffix(';'))
backup=inputs/'before-modern-reference.json'
if not backup.exists():
    backup.write_text(json.dumps({'name':'日向街道','points':existing['日向街道'],
        'gameFileSha256':hashlib.sha256(game.read_bytes()).hexdigest()},ensure_ascii=False))
old=json.loads(backup.read_text())['points']
north=json.loads((inputs/'outer-comparison-candidates.json').read_text())
south=json.loads((inputs/'onoichi-nobeoka-foot-candidate.json').read_text())
historic=json.loads((inputs/'selected-route-joined.json').read_text())
assert north['audit'][0]['review']['issues']==[] and south['audit'][0]['review']['issues']==[]
n=north['roads']['日向道北側比較'];s=south['roads']['小野市延岡比較'];h=historic['points']
def metres(a,b):
    return math.hypot((a[0]-b[0])*math.cos(math.radians((a[1]+b[1])/2)),a[1]-b[1])*111320
j=min(range(len(old)),key=lambda i:(metres(old[i],s[-1]),-i))
joins=[metres(n[-1],h[0]),metres(h[-1],s[0]),metres(s[-1],old[j])]
assert max(joins)<25, 'Do not add a distant straight connector'
parts=[('modern-north',n,.00006),('official-map-segment',h,.00001),('modern-south',s,.00006),('retained-south',old[j:],0)]
merged=[];segments=[]
for name,pts,tolerance in parts:
    points=list(LineString(pts).simplify(tolerance).coords)if tolerance else pts
    points=[[round(x,6),round(y,6)]for x,y in points]
    segments.append({'kind':name,'first':len(merged),'last':len(merged)+len(points)-1,
                     'source':('https://www.bunka.go.jp/seisaku/bunkazai/shokai/kinenbutsu/rekishinomichi/pdf/92088301_s112_01.pdf'if name=='official-map-segment'else'https://www.openstreetmap.org/copyright')})
    merged.extend(points)
assert merged[0]==old[0] and merged[-1]==old[-1]
record={'name':'日向街道','status':'accepted-modern-comparison','points':merged,'segments':segments,
        'historicMapLengthKm':historic['lengthKm'],'joinMetres':joins,'checked':'2026-11-02',
        'scope':'三国峠越の選定地図21.214kmと近現代道路比較を接続。市場・内山・三国峠・上津小野・小野市の区間を反映。北側・南側と延岡以南は戦国期の全線確定ではなく、梓峠の実通過も別途照合する。'}
(inputs/'accepted-whole-reference.json').write_text(json.dumps(record,ensure_ascii=False,indent=2))
existing['日向街道']=merged
if '日向道一部は文化庁選定地図の線（加工）'not in head:
    head=head.replace('現代の比較線。','日向道一部は文化庁選定地図の線（加工）。現代の比較線。')
game.write_text(head+'TK.MODERN_ROAD_REFERENCE='+json.dumps(existing,ensure_ascii=False,separators=(',',':'))+';\n')
print({'points':len(merged),'sourceSegments':segments,'joinMetres':joins})
