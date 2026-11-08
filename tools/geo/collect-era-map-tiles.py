"""Collect dated reference tiles in a shared Mercator frame with provenance."""
import concurrent.futures, hashlib, json, math, sys, urllib.request
from pathlib import Path
from datetime import datetime, timezone
from PIL import Image
out=Path(sys.argv[1]);out.mkdir(parents=True,exist_ok=True)
west,south,east,north=map(float,sys.argv[2:6]);z=int(sys.argv[6]);layers=sys.argv[7:]
assert set(layers)<= {'gazo1','std','rapid1880','ort_old10'},'Only registered source layers are supported'
assert -180<=west<east<=180 and -85<south<north<85 and 0<=z<=18
def xy(lon,lat):return ((lon+180)/360*2**z,(1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*2**z)
x0,y0=map(math.floor,xy(west,north));x1,y1=map(math.floor,xy(east,south));assert (x1-x0+1)*(y1-y0+1)*len(layers)<=150
rows=[]
def fetch(task):
 layer,x,y=task;ext='jpg'if layer=='gazo1'else'png'
 if layer=='rapid1880':
  # GDAL2Tiles/TMS numbers rows from the south; our mosaic uses XYZ from the north.
  source_y=2**z-1-y;url=f'https://habs.rad.naro.go.jp/rapid16/{z}/{x}/{source_y}.png'
 else:source_y=y;url=f'https://cyberjapandata.gsi.go.jp/xyz/{layer}/{z}/{x}/{y}.{ext}'
 file=out/f'{layer}-{z}-{x}-{y}.{ext}';row={'layer':layer,'tile':[z,x,y],'sourceRow':source_y,'url':url,'file':file.name}
 try:
  if not file.exists():file.write_bytes(urllib.request.urlopen(url,timeout=20).read())
  with Image.open(file) as im:
   assert im.size==(256,256)
   alpha=im.convert('RGBA').getchannel('A');row['transparentPixelCount']=sum(count for value,count in enumerate(alpha.histogram())if value==0)
  row.update(status='saved',sha256=hashlib.sha256(file.read_bytes()).hexdigest())
 except Exception as e:row.update(status='missing',error=str(e))
 return row
with concurrent.futures.ThreadPoolExecutor(8) as pool:rows=list(pool.map(fetch,[(layer,x,y)for layer in layers for y in range(y0,y1+1)for x in range(x0,x1+1)]))
for layer in layers:
 im=Image.new('RGB',((x1-x0+1)*256,(y1-y0+1)*256),(210,210,210))
 for r in rows:
  if r['layer']==layer and r['status']=='saved':
   _,x,y=r['tile'];tile=Image.open(out/r['file']).convert('RGBA');im.paste(tile,((x-x0)*256,(y-y0)*256),tile)
 im.save(out/f'{layer}-mosaic.jpg',quality=94)
(out/'manifest.json').write_text(json.dumps({'accessed':datetime.now(timezone.utc).date().isoformat(),'source':'国土地理院・地理院タイル / 農研機構・迅速測図'if 'rapid1880'in layers else'国土地理院・地理院タイル','registry':'https://maps.gsi.go.jp/help/use.html','requestedBounds':[west,south,east,north],'zoom':z,'tileOrigin':[x0,y0],'tileEnd':[x1,y1],'layers':layers,'layerMetadata':{layer:({'period':([1961,1969] if layer=='ort_old10' else [1974,1978]),'kind':'aerial-photograph-era'} if layer in {'gazo1','ort_old10'} else ({'period':[1880,1886],'kind':'georeferenced-historical-map','source':'農研機構農業環境研究部門','license':'CC BY 2.1 JP','registry':'https://habs.rad.naro.go.jp/habs_faq.html','sourceAddressing':'TMS, south-origin rows','positionLimit':'提供元FAQは大きな所で約100mの誤差。各図幅の測量年は個別照合。'}if layer=='rapid1880'else{'period':'current-at-access','kind':'standard-map'})) for layer in layers},'pixelProjection':'Web Mercator tile pixels, 256px per tile','scope':'各レイヤの撮影・測量年代と透明画素を保持。近現代の地図や写真をゲーム年代の精密復元と同一視しない。','tiles':rows},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'tiles':len(rows),'saved':sum(r['status']=='saved'for r in rows),'missing':sum(r['status']!='saved'for r in rows)}))
