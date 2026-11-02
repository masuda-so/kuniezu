"""Plot lon/lat controls in exactly the same tile frame for every era layer."""
import json, math, sys
from pathlib import Path
from PIL import Image, ImageDraw
folder=Path(sys.argv[1]);controls=json.loads(Path(sys.argv[2]).read_text());meta=json.loads((folder/'manifest.json').read_text());z=meta['zoom'];origin=meta['tileOrigin'];results=[]
for c in controls['points']:
 lon,lat=c['point'];pixel=[((lon+180)/360*2**z-origin[0])*256,((1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*2**z-origin[1])*256];results.append({**c,'pixel':pixel})
for layer in meta['layers']:
 im=Image.open(folder/f'{layer}-mosaic.jpg').convert('RGB');d=ImageDraw.Draw(im)
 for c in results:
  x,y=c['pixel'];d.ellipse((x-9,y-9,x+9,y+9),outline='red',width=3);d.text((x+12,y),c['id'],fill='red')
 im.save(folder/f'{layer}-controls.jpg',quality=94)
(folder/'control-projection.json').write_text(json.dumps({'sourceControls':sys.argv[2],'zoom':z,'tileOrigin':origin,'controls':results,'scope':'同じ投影・縮尺での比較。写真年代と道路の存在年代は別に検証する。'},ensure_ascii=False,indent=2)+'\n')
