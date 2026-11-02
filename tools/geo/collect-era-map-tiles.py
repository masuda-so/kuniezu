"""Collect public GSI era tiles with explicit bounds, checksums and missing-tile records."""
import concurrent.futures, hashlib, json, math, sys, urllib.request
from pathlib import Path
from datetime import datetime, timezone
from PIL import Image
out=Path(sys.argv[1]);out.mkdir(parents=True,exist_ok=True)
west,south,east,north=map(float,sys.argv[2:6]);z=int(sys.argv[6]);layers=sys.argv[7:]
assert set(layers)<= {'gazo1','std'},'Only explicitly dated layers are supported'
assert -180<=west<east<=180 and -85<south<north<85 and 0<=z<=18
def xy(lon,lat):return ((lon+180)/360*2**z,(1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*2**z)
x0,y0=map(math.floor,xy(west,north));x1,y1=map(math.floor,xy(east,south));assert (x1-x0+1)*(y1-y0+1)*len(layers)<=150
rows=[]
def fetch(task):
 layer,x,y=task;ext='png'if layer=='std'else'jpg';url=f'https://cyberjapandata.gsi.go.jp/xyz/{layer}/{z}/{x}/{y}.{ext}';file=out/f'{layer}-{z}-{x}-{y}.{ext}';row={'layer':layer,'tile':[z,x,y],'url':url,'file':file.name}
 try:
  if not file.exists():file.write_bytes(urllib.request.urlopen(url,timeout=20).read())
  with Image.open(file) as im:assert im.size==(256,256)
  row.update(status='saved',sha256=hashlib.sha256(file.read_bytes()).hexdigest())
 except Exception as e:row.update(status='missing',error=str(e))
 return row
with concurrent.futures.ThreadPoolExecutor(8) as pool:rows=list(pool.map(fetch,[(layer,x,y)for layer in layers for y in range(y0,y1+1)for x in range(x0,x1+1)]))
for layer in layers:
 im=Image.new('RGB',((x1-x0+1)*256,(y1-y0+1)*256),(210,210,210))
 for r in rows:
  if r['layer']==layer and r['status']=='saved':
   _,x,y=r['tile'];im.paste(Image.open(out/r['file']).convert('RGB'),((x-x0)*256,(y-y0)*256))
 im.save(out/f'{layer}-mosaic.jpg',quality=94)
(out/'manifest.json').write_text(json.dumps({'accessed':datetime.now(timezone.utc).date().isoformat(),'source':'国土地理院・地理院タイル','registry':'https://maps.gsi.go.jp/help/use.html','requestedBounds':[west,south,east,north],'zoom':z,'tileOrigin':[x0,y0],'tileEnd':[x1,y1],'layers':layers,'layerMetadata':{layer:({'period':[1974,1978],'kind':'aerial-photograph-era'} if layer=='gazo1' else {'period':'current-at-access','kind':'standard-map'}) for layer in layers},'pixelProjection':'Web Mercator tile pixels, 256px per tile','scope':'各レイヤの撮影時期を保持。近現代写真をゲーム年代の精密復元と同一視しない。','tiles':rows},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'tiles':len(rows),'saved':sum(r['status']=='saved'for r in rows),'missing':sum(r['status']!='saved'for r in rows)}))
