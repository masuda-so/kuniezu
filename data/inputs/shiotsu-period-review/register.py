"""Read a source PDF vector and register it without changing the game map.
Run with the bundled Python (pypdf, numpy and Pillow).
"""
from pathlib import Path
import json,math,hashlib
import numpy as np
from PIL import Image,ImageDraw
from pypdf import PdfReader
from pypdf.generic import ContentStream
P=Path(__file__).resolve().parent
pdf=PdfReader(P/'shibata58-excerpt.pdf');page=pdf.pages[2]
ops=ContentStream(page.get_contents(),pdf).operations
start=next(i for i,(a,o) in enumerate(ops) if o==b'scn' and list(map(float,a))==[.936,.937,.938])
path=[];current=np.array([0.,0.]);translation=np.array([0.,0.]);height=float(page.mediabox.height)
for args,op in ops[start+1:]:
 a=list(map(float,args)) if op in (b'cm',b'm',b'l',b'c',b'v',b'y') else []
 if op==b'cm':
  assert a[:4]==[1,0,0,1];translation=np.array(a[4:])
 elif op in (b'm',b'l'):
  current=np.array(a);path.append(current+translation)
 elif op in (b'c',b'v',b'y'):
  if op==b'c':c1,c2,end=np.array(a[:2]),np.array(a[2:4]),np.array(a[4:])
  elif op==b'v':c1,c2,end=current,np.array(a[:2]),np.array(a[2:])
  else:c1,c2,end=np.array(a[:2]),np.array(a[2:]),np.array(a[2:])
  n=max(2,math.ceil((np.linalg.norm(c1-current)+np.linalg.norm(c2-c1)+np.linalg.norm(end-c2))*4/3))
  for t in np.linspace(0,1,n+1)[1:]:path.append((1-t)**3*current+3*(1-t)**2*t*c1+3*(1-t)*t*t*c2+t**3*end+translation)
  current=end
 elif op in (b'f',b'f*'):break
points=np.array([[x*4,(height-y)*4] for x,y in path]);points=np.vstack([points,points[0]])
controls=[{'id':'shibata-castle','name':'新発田城跡','pixel':[803,2840],'lonlat':[139.326015,37.954781],'source':'https://geoshape.ex.nii.ac.jp/nrct-poi/resource/15/150000493200.html'}, {'id':'egami','name':'江上館跡','pixel':[2043,721],'lonlat':[139.400047,38.058177],'source':'https://geoshape.ex.nii.ac.jp/nrct-poi/resource/15/150000481100.html'}]
checks=[{'id':'sunayama','name':'砂山中道下遺跡','pixel':[1446,1749],'lonlat':[139.36166666666665,38.00972222222222],'source':'https://sitereports.nabunken.go.jp/ja/24225'}, {'id':'sumiyoshi','name':'住吉遺跡','pixel':[1052,1925],'lonlat':[139.3397222222222,38.0008333333333],'source':'shibata58.pdf PDF308頁 抄録'}]
checks.append({'id':'aota','name':'青田遺跡','pixel':[1339,1446],'lonlat':[139.357222,38.022777],'source':'https://heritagemap.nabunken.go.jp/statistic/47131-%E9%9D%92%E7%94%B0%E9%81%BA%E8%B7%A1.html'})
kx=111320*math.cos(math.radians(38));ky=111320
px=lambda row:complex(row['pixel'][0],-row['pixel'][1])
world=lambda row:complex(row['lonlat'][0]*kx,row['lonlat'][1]*ky)
a=(world(controls[1])-world(controls[0]))/(px(controls[1])-px(controls[0]));b=world(controls[0])-a*px(controls[0])
def transform(x,y):
 q=a*complex(x,-y)+b;return [q.real/kx,q.imag/ky]
coords=[transform(x,y) for x,y in points]
for row in checks:
 predicted=transform(*row['pixel']);row['registeredLonLat']=predicted;row['residualMetres']=abs(a*px(row)+b-world(row))
q=np.array(coords)*[kx,ky];area=abs(np.sum(q[:-1,0]*q[1:,1]-q[1:,0]*q[:-1,1]))/2/1e6
report={'sourceFile':'shibata58.pdf','pdfPage':10,'printedPage':2,'figure':1,'sourcePublicationYear':2019,'sourcePeriod':'干拓以前の旧塩津潟、図単独で対象年の汀線を確定しない','operation':'Extract PDF filled vector (RGB .936 .937 .938); cubic sampling at <=3 display pixels; two-point similarity registration','controls':controls,'independentChecks':checks,'pixelMetres':abs(a),'rotationDegrees':math.degrees(math.atan2(a.imag,a.real)),'scaleBarMetresPerPixel':2000/(2061-1686),'points':len(coords),'areaKm2':area,'adoption':'comparison-only','reason':'未使用地点差36〜307m。1645/1721/1733干拓前の範囲比較には使うが、1560〜1615の確定汀線として直接適用しない。','recommendedNext':'戦国期水域は中心低地の存在・中世自然堤防の除外を保ち、図の西南岸・東南岸を地質記録と局所登録する。'}
(P/'registration.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
(P/'source-boundary.geojson').write_text(json.dumps({'type':'FeatureCollection','features':[{'type':'Feature','properties':{'id':'shiotsu-shibata58-figure1','adoption':'comparison-only','registrationErrorMetres':max(x['residualMetres'] for x in checks),'source':'https://sitereports.nabunken.go.jp/69863','sourceYear':2019,'historicPeriod':'pre-reclamation, exact year unspecified'},'geometry':{'type':'Polygon','coordinates':[coords]}}]},ensure_ascii=False,separators=(',',':'))+'\n')
(P/'source-pixels.json').write_text(json.dumps(points.round(3).tolist(),separators=(',',':'))+'\n')
im=Image.open(P/'shibata58-map.png').convert('RGB');d=ImageDraw.Draw(im);d.line([tuple(v) for v in points],fill='#c83838',width=4)
for i,c in enumerate(controls+checks):
 x,y=c['pixel'];d.ellipse((x-16,y-16,x+16,y+16),outline='#086ccc',width=5);d.text((x+18,y),c['id'],fill='#0055bb')
im.thumbnail((1050,1600));im.save(P/'source-boundary-overlay.png')
rows=json.loads((P/'gsi-tiles.json').read_text());minx=min(r['x'] for r in rows);miny=min(r['y'] for r in rows);maxx=max(r['x'] for r in rows);maxy=max(r['y'] for r in rows)
m=Image.new('RGB',((maxx-minx+1)*256,(maxy-miny+1)*256),'white')
for r in rows:m.paste(Image.open(P/r['file']),((r['x']-minx)*256,(r['y']-miny)*256))
def wp(lon,lat):return ((lon+180)/360*8192*256-minx*256,(1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*8192*256-miny*256)
d=ImageDraw.Draw(m);d.line([wp(*v) for v in coords],fill='#bf2541',width=3)
for c in controls+checks:
 x,y=wp(*c['lonlat']);d.ellipse((x-5,y-5,x+5,y+5),fill='#0065b0');d.text((x+6,y),c['id'],fill='#003355')
d.text((10,10),'GSI std: modern comparison. Red: pre-reclamation reference, not 1560 shoreline.',fill='#000000');m.save(P/'gsi-comparison.png')
print(json.dumps({'points':len(coords),'areaKm2':area,'checkErrors':[x['residualMetres'] for x in checks]},ensure_ascii=False))
