"""同梱のMapzen z6現代標高から日朝共通の概観経路断面を生成。細峠の測量値ではない。"""
import json,pathlib,math
from PIL import Image
root=pathlib.Path(__file__).resolve().parents[2];routes=json.load(open('/tmp/kuniezu-route-terrain-input.json'));images={};profiles={}
def height(lo,la):
 x=(lo+180)/360*64;y=(1-math.asinh(math.tan(math.radians(la)))/math.pi)/2*64;tx,ty=int(x),int(y);key=(tx,ty)
 if key not in images:
  p=root/f'game/terrain/overview/6-{tx}-{ty}.png';images[key]=Image.open(p).convert('RGB')if p.exists()else None
 im=images[key]
 if not im:return None
 px,py=min(255,(x-tx)*256),min(255,(y-ty)*256);a,b=int(px),int(py);dx,dy=px-a,py-b
 def h(i,j):r,g,bl=im.getpixel((min(255,i),min(255,j)));return max(0,r*256+g+bl/256-32768)
 return (h(a,b)*(1-dx)+h(a+1,b)*dx)*(1-dy)+(h(a,b+1)*(1-dx)+h(a+1,b+1)*dx)*dy
for row in routes:
 pts=row['line'];samples=[];distance=0
 for i in range(1,len(pts)):
  a,b=pts[i-1],pts[i];d=math.hypot((a[0]-b[0])*math.cos(math.radians((a[1]+b[1])/2)),a[1]-b[1])*111.32;n=max(1,math.ceil(d/1.8))
  for j in range(n):
   t=j/n;samples.append((distance+d*t,height(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t)))
  distance+=d
 samples.append((distance,height(*pts[-1])));up=down=0
 for a,b in zip(samples,samples[1:]):
  if a[1]is None or b[1]is None:continue
  delta=b[1]-a[1];up+=max(0,delta);down+=max(0,-delta)
 profiles[row['id']]={'distanceKm':round(distance,2),'ascentM':round(up),'descentM':round(down),'coverage':round(sum(p[1]is not None for p in samples)/len(samples),3),'resolution':'modern-terrain-z6-overview'}
(root/'game/route-terrain-profiles.js').write_text('"use strict";\n/* Mapzen Terrarium / USGS / NOAA。現代標高の概観断面、細かな峠・堤防ではない。 */\nTK.ROUTE_TERRAIN='+json.dumps(profiles,separators=(',',':'))+';\n');(root/'data/audits/route-terrain-review.json').write_text(json.dumps(profiles,ensure_ascii=False,indent=2));print('profiles',len(profiles),'complete',sum(p['coverage']==1 for p in profiles.values()))
