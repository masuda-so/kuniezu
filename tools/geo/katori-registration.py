"""古絵図の座標比較と、低地に限定した推定湿地。戦国期の汀線測量ではない。
/tmp/kuniezu-geo-env/bin/python tools/geo/katori-registration.py
DEM入力はGSI標高PNG(z12)をデコードしたheights.npyとbounds.json。
"""
import pathlib,json,math,hashlib
import numpy as np,cv2
from PIL import Image,ImageDraw
from shapely.geometry import Polygon,Point,mapping
from shapely.ops import unary_union
ROOT=pathlib.Path(__file__).resolve().parents[2];CACHE=pathlib.Path('/tmp/kuniezu-katori-dem');OUT=ROOT/'data/verification/katori';OUT.mkdir(parents=True,exist_ok=True)
rows=[('土浦城',[720,2528],[140.2008,36.0825]),('高浜入江',[835,2440],[140.286,36.189]),('鹿島神宮',[1570,2610],[140.631517,35.968807]),('利根川河口',[2118,3240],[140.855,35.748])]
A=np.array([[*r[1],1]for r in rows]);B=np.array([r[2]for r in rows]);M=np.linalg.lstsq(A,B,rcond=None)[0]
err=(A@M-B)*[90000,111000]
report={'source':{'url':'https://digitalcollection.lib.ibaraki.ac.jp/nakane/001000500097/','title':'常陸國絵図','holder':'茨城大学図書館','license':'CC BY','date':'目録に年代記載なし。1560年の測量図と扱わない'},'method':'北上に回転後、4対応点の最小二乗アフィン。入江・河口は変動しうる。独立検証点ではない。','pixelToLonLat':M.tolist(),'controls':[{'name':r[0],'pixel':r[1],'lonlat':r[2],'fitErrorMetres':round(float(np.linalg.norm(e)))}for r,e in zip(rows,err)],'rmsMetres':round(float(np.sqrt(np.mean(np.sum(err**2,axis=1))))),'conclusion':'数kmの不一致があり、この登録図を精密な戦国期湖岸として採用しない。対岸や入江の形状比較用。'}
(OUT/'registration.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
# 現代の等高線だけで旧湖岸を断定しない。従来の史料上の概略域にある低地に限り浅瀬・葦原として表す。
a=np.load(CACHE/'heights.npy');b=json.loads((CACHE/'bounds.json').read_text());N=2**b['z']
def ll(x,y):
 return ((b['x0']*256+x)/256/N*360-180,math.degrees(math.atan(math.sinh(math.pi*(1-2*(b['y0']*256+y)/256/N)))))
envelopes=[[(140.405,35.967),(140.438,35.958),(140.474,35.951),(140.505,35.958),(140.536,35.958),(140.565,35.944),(140.591,35.936),(140.614,35.919),(140.628,35.898),(140.651,35.880),(140.682,35.865),(140.710,35.854),(140.722,35.838),(140.687,35.831),(140.653,35.842),(140.623,35.854),(140.593,35.867),(140.565,35.878),(140.533,35.882),(140.499,35.886),(140.468,35.902),(140.441,35.918),(140.416,35.931)],[(140.251,35.889),(140.280,35.903),(140.317,35.921),(140.348,35.938),(140.379,35.954),(140.412,35.956),(140.420,35.945),(140.385,35.934),(140.353,35.922),(140.322,35.905),(140.286,35.891),(140.259,35.880)]]
features=[]
for name,env in zip(['香取の海沿岸の低地','谷原の旧入江沿岸の低地'],envelopes):
 domain=Polygon(env)
 # 概略域を直線で切ると、地形にない斜めの岸が生じる。域の外縁は1kmで漸減し、標高と交差する等値線として抽出する。
 def pixel(lo,la):return ((lo+180)/360*N*256-b['x0']*256,(1-math.asinh(math.tan(math.radians(la)))/math.pi)/2*N*256-b['y0']*256)
 seed=Image.new('L',(a.shape[1],a.shape[0]));ImageDraw.Draw(seed).polygon([pixel(*v)for v in env],fill=255)
 metres=40075016.686*math.cos(math.radians(35.9))/(N*256)
 weight=cv2.GaussianBlur(np.asarray(seed,dtype=np.float32)/255,(0,0),1000/metres)
 mask=(np.isfinite(a)&(a<=3*weight)&(weight>.015)).astype('uint8')
 # 1画素の孤立点だけを除去し、山地を横切る平滑化はしない。
 contours,hierarchy=cv2.findContours(mask,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_SIMPLE)
 parts=[]
 for i,c in enumerate(contours):
  if hierarchy[0][i][3]!=-1 or len(c)<3:continue
  shell=[ll(*q[0])for q in c];holes=[];child=hierarchy[0][i][2]
  while child!=-1:
   if len(contours[child])>=3:holes.append([ll(*q[0])for q in contours[child]])
   child=hierarchy[0][child][0]
  p=Polygon(shell,holes).buffer(0)
  if not p.is_empty:parts.append(p)
 g=unary_union(parts);ps=list(g.geoms)if hasattr(g,'geoms')else[g]
 ps=[p.simplify(.00013,preserve_topology=True)for p in ps if p.area>.000004]
 for p in ps:features.append({'type':'Feature','properties':{'name':name,'kind':'estimated-marsh','notShoreline':True},'geometry':mapping(p)})
geo={'type':'FeatureCollection','properties':{'method':'香取市の中世内海・干拓年代の概略域を、現代GSI標高と照合。概略域の外縁1kmで閾値を漸減し、人工的な直線切断を除去。3mは表示用低地閾値で旧水位ではない。人工堤防・耕地改変・旧地形の埋没を復元していない。1590年に一括縮小しない。','source':'https://maps.gsi.go.jp/development/demtile.html','thresholdMetres':3,'validFraction':float(np.isfinite(a).mean())},'features':features}
(OUT/'estimated-marsh.geojson').write_text(json.dumps(geo,ensure_ascii=False,separators=(',',':')))
waters=[]
for f in features:
 waters.append({'name':f['properties']['name'],'type':'tidal-marsh','source':'katoriTerrain','rings':[[[round(x,6),round(y,6)]for x,y in r]for r in f['geometry']['coordinates']],'note':geo['properties']['method']})
(ROOT/'kuniezu/static/kuniezu/katori-lowlands.js').write_text('"use strict";\n/* 自動生成。tools/geo/katori-registration.py。精密な旧汀線ではなく低地制約付き推定湿地。 */\nTK.KATORI_LOWLANDS='+json.dumps(waters,ensure_ascii=False,separators=(',',':'))+';\n')
# 同一座標・縮尺の比較。古絵図を再投影し、ゲームの現代比較湖岸を青で重ねる。
img=Image.open('/tmp/kuniezu-hitachi-north-large.png').convert('RGB');w,h=1400,850;lo0,lo1,la0,la1=140.12,140.9,35.72,36.25
T=np.array([[(lo1-lo0)/w,0],[0,-(la1-la0)/h],[lo0,la1]])
# destination pixel -> lonlat -> source pixel
H=np.vstack((M.T,[0,0,1]));D=np.array([[T[0,0],0,lo0],[0,T[1,1],la1],[0,0,1]])
P=np.linalg.inv(H)@D
im=img.transform((w,h),Image.Transform.AFFINE,tuple(P[:2].flat),Image.Resampling.BILINEAR,fillcolor='#e8e1d0');dr=ImageDraw.Draw(im)
def xy(p):return ((p[0]-lo0)/(lo1-lo0)*w,(la1-p[1])/(la1-la0)*h)
# read plain JSON array in generated baseline
text=(ROOT/'kuniezu/static/kuniezu/lake-baselines.js').read_text();start=text.index('[');end=text.rfind(']');lakes=json.loads(text[start:end+1])
for l in lakes:
 for ring in l['rings']:
  if any(lo0<x<lo1 and la0<y<la1 for x,y in ring):dr.line([xy(p)for p in ring],fill='#075bde',width=2)
for r in rows:
 x,y=xy(r[2]);dr.ellipse((x-5,y-5,x+5,y+5),outline='#dd1133',width=2)
im.save(OUT/'registered-comparison.jpg',quality=92)
print(json.dumps({'features':len(features),'vertices':sum(len(r)for w in waters for r in w['rings']),'registrationRmsMetres':report['rmsMetres']},ensure_ascii=False))
