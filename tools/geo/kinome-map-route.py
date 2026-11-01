"""Read the published red/blue strokes through the checked map registration."""
import json
import math
from pathlib import Path

import numpy as np
from pdf_stroke_paths import coloured_strokes

root=Path('data/inputs/hokurikudo-review')
registration=json.loads((root/'kinome-registration.json').read_text())
assert registration['status']=='verified-with-map-symbol-tolerance'
matrix=np.array(registration['matrixSourceCanvasToReference'])
z=registration['referenceZoom'];x0,y0=registration['referenceOriginTile']
runs=coloured_strokes(root/'kinome-selected.pdf',{'selected':[1,0,0],'connecting':[0,.439,.753]})
runs=[r for r in runs if len(r['points'])>5 and all(150<x<680 and 70<y<1120 for x,y in r['points'])]
assert len(runs)==6
(root/'kinome-source-strokes.json').write_text(json.dumps(runs,ensure_ascii=False))
i=min(range(len(runs)),key=lambda i:min(q[1]for q in runs[i]['points']))
run=runs.pop(i);points=run['points'];points=points if points[0][1]<points[-1][1]else list(reversed(points))
parts=[{'colour':run['colour'],'points':points}];gaps=[]
while runs:
    gap,i,reverse=min((math.dist(parts[-1]['points'][-1],r['points'][-1]if reverse else r['points'][0]),i,reverse)for i,r in enumerate(runs)for reverse in [False,True])
    assert gap<1, 'Separated annotation strokes must not be silently connected'
    run=runs.pop(i)
    if reverse:run['points'].reverse()
    parts.append(run);gaps.append(gap)
points=[];sections=[]
for part in parts:
    first=len(points)
    for x,y in part['points']:
        xx,yy=matrix@np.array([x*2,(1190.4-y)*2,1])
        points.append([(xx+x0*256)/(2**z*256)*360-180,math.degrees(math.atan(math.sinh(math.pi*(1-2*(yy+y0*256)/(2**z*256)))))])
    sections.append({'colour':part['colour'],'first':first,'last':len(points)-1})
km=lambda a,b:math.hypot((a[0]-b[0])*math.cos(math.radians((a[1]+b[1])/2)),a[1]-b[1])*111.32
record={'status':'registered-source-corridor','points':points,'sections':sections,'lengthKm':sum(km(a,b)for a,b in zip(points,points[1:])),
        'strokeJoinPdfPoints':gaps,'source':'https://www.bunka.go.jp/seisaku/bunkazai/shokai/kinenbutsu/rekishinomichi/pdf/92088301_s036_01.pdf',
        'scope':'公式図の赤い選定区間と青い接続区間。独立駅記号100m級の読取検査を経た地図線であり16世紀全線の実測値ではない。'}
(root/'kinome-map-route.json').write_text(json.dumps(record,ensure_ascii=False,indent=2))
print({'points':len(points),'lengthKm':record['lengthKm'],'maximumStrokeGapPdfPoints':max(gaps)})
