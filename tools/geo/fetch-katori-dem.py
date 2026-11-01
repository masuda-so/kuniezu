"""国土地理院の公開DEM標高PNG 40枚を一時キャッシュへ取得。ゲームサーバーは操作しない。"""
import math,pathlib,subprocess,concurrent.futures,json
from PIL import Image
import numpy as np,cv2
from shapely.geometry import Polygon,Point,mapping
from shapely.ops import unary_union
Z=12;N=2**Z;out=pathlib.Path('/tmp/kuniezu-katori-dem');out.mkdir(exist_ok=True)
def tile(lo,la):return int((lo+180)/360*N),int((1-math.asinh(math.tan(math.radians(la)))/math.pi)/2*N)
x0,y1=tile(140.17,35.77);x1,y0=tile(140.79,36.05)
def get(q):
 x,y=q;p=out/f'{x}-{y}.png'
 if not p.exists():subprocess.run(['curl','-sfL','--retry','1','--max-time','25','https://cyberjapandata.gsi.go.jp/xyz/dem_png/'+str(Z)+'/'+str(x)+'/'+str(y)+'.png','-o',str(p)],capture_output=True)
 try:
  rgb=np.asarray(Image.open(p).convert('RGBA'));v=rgb[:,:,0].astype('int32')*65536+rgb[:,:,1].astype('int32')*256+rgb[:,:,2];h=np.where(v<8388608,v,v-16777216)*.01;h[(v==8388608)|(rgb[:,:,3]==0)]=np.nan;return x,y,h
 except:return x,y,np.full((256,256),np.nan)
qs=[(x,y) for y in range(y0,y1+1) for x in range(x0,x1+1)];a=np.full(((y1-y0+1)*256,(x1-x0+1)*256),np.nan)
with concurrent.futures.ThreadPoolExecutor(max_workers=6)as ex:
 for x,y,h in ex.map(get,qs):a[(y-y0)*256:(y-y0+1)*256,(x-x0)*256:(x-x0+1)*256]=h
print('tiles',len(qs),'valid',float(np.isfinite(a).mean()),'elevation',float(np.nanmin(a)),float(np.nanmax(a)),flush=True)
np.save(out/'heights.npy',a);(out/'bounds.json').write_text(json.dumps({'z':Z,'x0':x0,'y0':y0,'x1':x1,'y1':y1}))
