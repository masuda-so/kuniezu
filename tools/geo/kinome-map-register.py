"""Register the published map by river geometry, then check unused station symbols."""
import hashlib
import json
import math
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from pypdf import PdfReader
from gsi_controls import exact_point
from road_reference_review import distance

root=Path('data/inputs/hokurikudo-review')
pdf=root/'kinome-selected.pdf'
assert hashlib.sha256(pdf.read_bytes()).hexdigest()==json.loads((root/'kinome-selected-source.json').read_text())['sha256']
native={image.name.split('.')[0]:image.image.convert('RGB')for image in PdfReader(pdf).pages[0].images}
for idx,name in [(0,'Image13'),(2,'Image15')]:
    image=native[name];file=root/f'kinome-map-image-{idx}.png'
    if file.exists():assert hashlib.sha256(Image.open(file).convert('RGB').tobytes()).digest()==hashlib.sha256(image.tobytes()).digest()
    else:image.save(file)
manifest=json.loads((root/'gsi-map-z13/manifest.json').read_text())
x0,y0=manifest['originTile'];x1,y1=manifest['endTile'];z=manifest['z']
reference=Image.new('RGB',((x1-x0+1)*256,(y1-y0+1)*256),'white')
for tile in manifest['tiles']:
    f=root/'gsi-map-z13'/tile['file'];assert hashlib.sha256(f.read_bytes()).hexdigest()==tile['sha256']
    reference.paste(Image.open(f),((tile['x']-x0)*256,(tile['y']-y0)*256))
reference=np.array(reference)
source=Image.new('RGB',(1684,2382),'white')
for idx,left,bottom,w,h in [(0,153.53,74.468,524.58,516.53),(2,153.72,588.66,524.4,529.51)]:
    image=Image.open(root/f'kinome-map-image-{idx}.png').convert('RGB').resize((round(w*2),round(h*2)))
    source.paste(image,(round(left*2),round((1190.4-bottom-h)*2)))
source=np.array(source)
def map_pixel(point):
    lon,lat=point
    return np.array([(lon+180)/360*2**z*256-x0*256,(1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*2**z*256-y0*256])
def geographic(pixel):
    x,y=pixel
    return [(x+x0*256)/(2**z*256)*360-180,math.degrees(math.atan(math.sinh(math.pi*(1-2*(y+y0*256)/(2**z*256)))))]
initial_pdf=[[231,380],[539,822]]
controls=np.float32([[x*2,(1190.4-y)*2]for x,y in initial_pdf])
target=np.float32([map_pixel([136.140150898186,35.71709061195]),map_pixel([136.197031997041,35.7872796172135])])
u=controls[1]-controls[0];v=target[1]-target[0];a=np.dot(u,v)/np.dot(u,u);b=(u[0]*v[1]-u[1]*v[0])/np.dot(u,u)
A=np.array([[a,-b],[b,a]]);initial=np.column_stack([A,target[0]-A@controls[0]])
def blue(image):return cv2.inRange(cv2.cvtColor(image,cv2.COLOR_RGB2HSV),np.array([90,25,80]),np.array([125,255,255])).astype(np.float32)/255
warped=cv2.warpAffine(blue(source),initial,(reference.shape[1],reference.shape[0]))
valid=cv2.warpAffine(np.uint8(np.any(source<245,axis=2))*255,initial,(reference.shape[1],reference.shape[0]))
valid=cv2.erode(valid,np.ones((9,9),np.uint8))
cc,W=cv2.findTransformECC(cv2.GaussianBlur(blue(reference),(9,9),2),cv2.GaussianBlur(warped,(9,9),2),np.eye(2,3,dtype=np.float32),cv2.MOTION_AFFINE,(cv2.TERM_CRITERIA_COUNT|cv2.TERM_CRITERIA_EPS,150,1e-6),valid,5)
matrix=(np.linalg.inv(np.vstack([W,[0,0,1]]))@np.vstack([initial,[0,0,1]]))[:2]
assert cc>.5 and .85<np.linalg.det(matrix[:,:2])/np.linalg.det(initial[:,:2])<1.15
search=json.loads((root/'route-controls-search.json').read_text())+json.loads((root/'map-controls-search.json').read_text())
checks=[]
# Approximate centres of the printed station/platform symbols; not place-name text.
# The printed symbol and representative GSI point have about 100m combined tolerance.
for name,pixel in [('今庄駅',[1091,1048]),('湯尾駅',[1018,503]),('南今庄駅',[889,1339])]:
    row=next(r for r in search if r['query']==name);point=exact_point(row['result'],name,[135,35,137,36])
    pdf=[153.72+pixel[0]/1456*524.4,1118.17-pixel[1]/1470*529.51]
    mapped=matrix@np.array([pdf[0]*2,(1190.4-pdf[1])*2,1]);observed=geographic(mapped)
    residual=distance(point,observed);assert residual<100
    checks.append({'name':name,'sourceNorthImagePixel':pixel,'sourcePixelUncertainty':10,'gsiPoint':point,'registeredPoint':observed,'residualMetres':residual,'toleranceMetres':100,'usedForFit':False})
overlay=reference.copy();mapped_water=cv2.warpAffine(blue(source),matrix,(reference.shape[1],reference.shape[0]));overlay[mapped_water>.3]=[240,20,160]
Image.fromarray(overlay).save(root/'river-registration-reviewed.png')
record={'status':'verified-with-map-symbol-tolerance','matrixSourceCanvasToReference':matrix.tolist(),'sourceCanvasScale':2,'sourcePageHeight':1190.4,'referenceZoom':z,'referenceOriginTile':[x0,y0],'riverCorrelation':cc,'initialReadPdfPoints':initial_pdf,'independentStationChecks':checks,'scope':'地形記号の時代差でSIFT照合が不足したため候補を棄却し、水系の重なりで位置合わせ。独立した駅記号3点を100mの記号・代表点の読取幅で検査。精密測量値や戦国期の全線確定ではない。'}
(root/'kinome-registration.json').write_text(json.dumps(record,ensure_ascii=False,indent=2))
print({'riverCorrelation':cc,'independentStationMetres':[(c['name'],c['residualMetres'])for c in checks]})
