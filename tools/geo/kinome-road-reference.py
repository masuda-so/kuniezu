"""Replace the Kinome section without erasing the separate Tochinoki route."""
import hashlib
import json
import math
from pathlib import Path

from shapely.geometry import LineString

root=Path(__file__).resolve().parents[2];inputs=root/'data/inputs/hokurikudo-review'
game=root/'game/modern-road-reference.js';head,body=game.read_text().split('TK.MODERN_ROAD_REFERENCE=')
references=json.loads(body.strip().removesuffix(';'));backup=inputs/'before-modern-reference.json'
if not backup.exists():backup.write_text(json.dumps({'name':'北陸道','points':references['北陸道'],'gameFileSha256':hashlib.sha256(game.read_bytes()).hexdigest()},ensure_ascii=False))
old=json.loads(backup.read_text())['points'];anchors=json.loads((inputs/'reference-anchors.json').read_text())
south=json.loads((inputs/'south-gsi-candidate.json').read_text());mapped=json.loads((inputs/'kinome-map-route.json').read_text());north=json.loads((inputs/'map-outer-foot-candidate.json').read_text())
assert not south['review']['issues'];assert not next(a for a in north['audit']if a['name']=='湯尾図北側比較')['review']['issues']
s=south['points'];h=mapped['points'];n=north['roads']['湯尾図北側比較']
def metres(a,b):return math.hypot((a[0]-b[0])*math.cos(math.radians((a[1]+b[1])/2)),a[1]-b[1])*111320
first=min(range(len(old)),key=lambda i:metres(old[i],anchors['start']))
last=min(range(first+1,len(old)),key=lambda i:(metres(old[i],anchors['end']),-i))
joins=[metres(old[first],s[0]),metres(s[-1],h[0]),metres(h[-1],n[0]),metres(n[-1],old[last])]
assert max(joins)<25, 'Do not insert a missing long road'
parts=[('retained-south',old[:first+1],0),('modern-GSI-south',s,.00002),('published-map-corridor',h,.00001),('modern-north',n,.00006),('retained-north',old[last:],0)]
points=[];sections=[]
for name,line,tolerance in parts:
    line=list(LineString(line).simplify(tolerance).coords)if tolerance else line
    line=[[round(x,6),round(y,6)]for x,y in line]
    sections.append({'kind':name,'first':len(points),'last':len(points)+len(line)-1});points+=line
assert points[0]==old[0] and points[-1]==old[-1]
shared=anchors['imaJoSharedPoint'];shared_distance=min(metres(shared,p)for p in h);assert shared_distance<100
record={'name':'北陸道','status':'accepted-modern-comparison','geometry':'mixed-source','points':points,'sections':sections,'joinMetres':joins,'mappedCorridorKm':mapped['lengthKm'],'imaJoSharedPoint':shared,'imaJoMapDistanceMetres':shared_distance,'checked':'2026-11-02','scope':'木ノ芽峠―二ツ屋―今庄―湯尾を公式図から取り込み、南北を近現代道路比較へ接続。栃ノ木系は北国街道（近江）として残す。戦国期全線の精密中心線ではない。'}
(inputs/'accepted-whole-reference.json').write_text(json.dumps(record,ensure_ascii=False,indent=2));references['北陸道']=points
head=head.replace('日向道一部は文化庁選定地図の線（加工）','日向道・北陸道の一部は文化庁選定地図の線（加工）')
game.write_text(head+'TK.MODERN_ROAD_REFERENCE='+json.dumps(references,ensure_ascii=False,separators=(',',':'))+';\n')
print({'points':len(points),'joins':joins,'imaJoMapDistanceMetres':shared_distance})
