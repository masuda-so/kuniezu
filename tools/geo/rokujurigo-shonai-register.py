"""Register the MLIT survey sheet using unambiguous peak symbols."""
import json, math
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
root=Path(__file__).resolve().parents[2];folder=root/'data/inputs/rokujurigo-review'
search=json.loads((folder/'shonai-peaks-search.json').read_text())
def point(name):
 # 自然地名の山頂と、同名の施設・登山口の検索結果を混ぜない。
 rows=[f['geometry']['coordinates'] for row in search if row['query']==name for f in row['result'] if f['properties']['title']==name and f['properties'].get('dataSource')=='4' and 139.9<f['geometry']['coordinates'][0]<140.1 and 38.5<f['geometry']['coordinates'][1]<38.75]
 assert len(rows)==1,(name,rows)
 return rows[0]
def local(p):return [(p[0]-140)*111320*math.cos(math.radians(38.6)),(38.6-p[1])*111320,1]
controls=[{'name':n,'point':point(n),'pixel':px} for n,px in [('羽黒山',[684,109]),('品倉山',[674,438]),('月山',[772,427]),('三足一分山',[578,517])]]
m=np.linalg.lstsq(np.array([local(c['point']) for c in controls]),np.array([c['pixel']for c in controls]),rcond=None)[0];inv=np.linalg.inv(m[:2])
for c in controls:c['fitResidualPixels']=float(np.linalg.norm(np.array(local(c['point']))@m-c['pixel']))
assert max(c['fitResidualPixels']for c in controls)<8
independent={'name':'湯殿山','point':point('湯殿山'),'pixel':[695,477],'tolerancePixels':8}
pred=np.array(local(independent['point']))@m;independent.update(predictedPixel=pred.tolist(),residualPixels=float(np.linalg.norm(pred-independent['pixel'])))
assert independent['residualPixels']<8,independent
traces=json.loads((folder/'old-road-pixel-traces.json').read_text());runs=next(s['runs']for s in traces['sheets']if s['sheet']=='shonai');geo=[]
for run in runs:
 q=(np.array(run)-m[2])@inv;geo.append([[float(140+x/111320/math.cos(math.radians(38.6))),float(38.6-y/111320)]for x,y in q])
km=lambda a,b:math.hypot((a[0]-b[0])*math.cos(math.radians((a[1]+b[1])/2)),a[1]-b[1])*111.32
gaps=[{'from':a[-1],'to':b[0],'metres':km(a[-1],b[0])*1000,'basis':'原図の国道色・文字に隠れた青線の間。直線接続は表示用推定。'} for a,b in zip(geo,geo[1:])]
assert max(g['metres'] for g in gaps)<1000
result={'status':'accepted-shonai-sheet','source':'https://www.thr.mlit.go.jp/sakata/road/60history/011.html','origin':[140,38.6],'matrixLocalMetresToPixels':m.tolist(),'controls':controls,'independent':independent,'runs':geo,'gaps':gaps,'precision':'1:200000の近現代旧道調査図。読取幅8pxは約400m。戦国期の測量復元ではない。','vertices':sum(map(len,geo))}
(folder/'shonai-registration-accepted.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
im=Image.open(folder/'sakata-shonai-map.jpg').convert('RGB');d=ImageDraw.Draw(im)
for c in controls+[independent]:
 x,y=c['pixel'];d.ellipse((x-8,y-8,x+8,y+8),outline='red' if c in controls else 'blue',width=2)
for run in runs:d.line([tuple(p)for p in run],fill='cyan',width=2)
im.save(folder/'shonai-registration-review.png');print(json.dumps({'vertices':result['vertices'],'independentPixels':independent['residualPixels'],'maxGapMetres':max(g['metres']for g in gaps)}))
