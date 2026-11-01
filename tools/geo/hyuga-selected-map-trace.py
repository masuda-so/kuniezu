"""Trace the official selected route using its printed geographic frame and held-out minute ticks."""
import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from pypdf import PdfReader
from pypdf.generic import ContentStream

root = Path('data/inputs/hyuga-road-review')
page_number=int(sys.argv[1])if len(sys.argv)>1 else 1
assert page_number in [1,2]
im = Image.open(root/f'selected-page-{page_number}-0.png').convert('RGB')
reader=PdfReader(root/'92088301_s112_01.pdf')
operations=ContentStream(reader.pages[page_number-1]['/Contents'],reader).operations
matrix=np.eye(3);colour=None;stack=[];path=[];runs=[];current=None

def transformed(p):
    q=matrix@np.array([*p,1.]);return np.array([q[0]*1755/842,(1191-q[1])*2481/1191])

for operands,op in operations:
    a=[float(x) for x in operands] if op in [b'cm',b'RG',b'm',b'l',b'c',b'v',b'y'] else operands
    if op==b'q':stack.append((matrix.copy(),colour))
    elif op==b'Q':matrix,colour=stack.pop()
    elif op==b'cm':
        aa,bb,cc,dd,ee,ff=a;matrix=matrix@np.array([[aa,cc,ee],[bb,dd,ff],[0,0,1]])
    elif op==b'RG':colour=a
    elif colour and colour[0]>.8 and colour[1]<.1 and colour[2]<.2:
        if op==b'm':
            if path:runs.append(path)
            current=np.array(a);path=[transformed(current).tolist()]
        elif op in [b'c',b'v',b'y']:
            if op==b'c':c1,c2,end=np.array(a[:2]),np.array(a[2:4]),np.array(a[4:])
            elif op==b'v':c1,c2,end=current,np.array(a[:2]),np.array(a[2:])
            else:c1,end=np.array(a[:2]),np.array(a[2:]);c2=end
            length=sum(np.linalg.norm(transformed(v)-transformed(u))for u,v in zip([current,c1,c2],[c1,c2,end]))
            count=max(1,math.ceil(length/2))
            for i in range(1,count+1):
                t=i/count;p=(1-t)**3*current+3*(1-t)**2*t*c1+3*(1-t)*t*t*c2+t**3*end
                path.append(transformed(p).tolist())
            current=end
        elif op==b'l':current=np.array(a);path.append(transformed(current).tolist())
if path:runs.append(path)
runs=[[p for p in run if 108<=p[0]<=1646 and 265<=p[1]<=2245]for run in runs]
runs=[run for run in runs if len(run)>1]
first=min(range(len(runs)),key=lambda i:min(runs[i][0][1],runs[i][-1][1]));path=runs.pop(first)
if path[0][1]>path[-1][1]:path.reverse()
joins=[]
while runs:
    _,i,reverse=min((math.dist(path[-1],run[-1]if reverse else run[0]),i,reverse)for i,run in enumerate(runs)for reverse in [False,True])
    run=runs.pop(i)
    if reverse:run.reverse()
    gap=math.dist(path[-1],run[0]);assert gap<3, 'Disconnected PDF strokes must not be silently linked'
    joins.append(gap);path.extend(run)
assert len(path)>500 and path[-1][1]>1800
dms=lambda d,m,s:d+m/60+s/3600
ul=[dms(131,33,29.10),dms(32,59,12.51)]
ur=[dms(131,37,39.38),dms(32,59,12.50)]
ll=[dms(131,33,29.21),dms(32,54,40.73)]
lr=[dms(131,37,39.27),dms(32,54,40.74)]
if page_number==2:
    ul=[dms(131,34,29.22),dms(32,55,15.27)]
    ur=[dms(131,38,39.30),dms(32,55,15.28)]
    ll=[dms(131,34,29.32),dms(32,50,43.49)]
    lr=[dms(131,38,39.20),dms(32,50,43.50)]
frame=[108.5,265,1645,2245]


def geo(p):
    x,y=p;u=(x-frame[0])/(frame[2]-frame[0]);v=(y-frame[1])/(frame[3]-frame[1])
    return [float((1-v)*((1-u)*ul[k]+u*ur[k])+v*((1-u)*ll[k]+u*lr[k])) for k in range(2)]


# Minute ticks are read separately and were not used for the four-corner transform.
checks=[]
for minute,pixel in ([(59,357),(58,794),(55,2104)]if page_number==1 else[(55,377),(54,814)]):
    expected=frame[1]+(ul[1]-dms(32,minute,0))/(ul[1]-ll[1])*(frame[3]-frame[1])
    checks.append({'axis':'latitude-left','minute':minute,'pixel':pixel,'predictedPixel':expected,'residualPixels':abs(expected-pixel),'usedForFit':False})
for minute,pixel in ([(34,299),(35,667),(36,1035),(37,1403)]if page_number==1 else[(35,298),(36,666),(37,1035),(38,1404)]):
    expected=frame[0]+(dms(131,minute,0)-ul[0])/(ur[0]-ul[0])*(frame[2]-frame[0])
    checks.append({'axis':'longitude-top','minute':minute,'pixel':pixel,'predictedPixel':expected,'residualPixels':abs(expected-pixel),'usedForFit':False})
assert max(c['residualPixels']for c in checks)<1.5
points=[geo(p)for p in path]
km=lambda a,b:math.hypot((a[0]-b[0])*math.cos(math.radians((a[1]+b[1])/2)),a[1]-b[1])*111.32
length=sum(km(a,b)for a,b in zip(points,points[1:]))
out=im.copy();ImageDraw.Draw(out).line([tuple(p)for p in path],fill=(0,170,255),width=2);out.save(root/('selected-route-overlay.png'if page_number==1 else'selected-route-overlay-2.png'))
record={'status':'registered-source-segment','source':'https://www.bunka.go.jp/seisaku/bunkazai/shokai/kinenbutsu/rekishinomichi/pdf/92088301_s112_01.pdf','page':page_number,'frame':frame,'cornerCoordinates':[ul,ur,ll,lr],'strokeJoinPixels':joins,'extraction':'PDF red vector strokes, cubic Bezier sampled at <=2 source pixels; no raster colour fitting','pixelPoints':path,'points':points,'lengthKm':length,'independentMinuteTicks':checks,'maxTickResidualPixels':max(c['residualPixels']for c in checks),'scope':'文化庁の選定地図の赤ベクトル線を枠の緯経度で読み取る。旧街道の選定区間であり1560〜1615年の全線中心線と断定しない。青い継続線と区別し、図外を推測で延伸しない。ゲームでの採否はaccepted-whole-reference.jsonの別記録。'}
(root/('selected-route-segment.json'if page_number==1 else'selected-route-segment-2.json')).write_text(json.dumps(record,ensure_ascii=False,indent=2))
print({'points':len(points),'lengthKm':length,'maxIndependentTickResidualPixels':record['maxTickResidualPixels']})
