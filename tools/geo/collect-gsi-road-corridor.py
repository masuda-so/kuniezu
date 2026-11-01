"""Fetch limited GSI modern road geometry along reference waypoints; never a historical claim."""
import pathlib,json,math,urllib.request,hashlib,sys,concurrent.futures
request=json.loads(pathlib.Path(sys.argv[1]).read_text());root=pathlib.Path(sys.argv[2]);root.mkdir(parents=True,exist_ok=True);tiles=set();z=16
def tile(lon,lat):return int((lon+180)/360*2**z),int((1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*2**z)
if isinstance(request,dict):
 w,south,e,north=request['bounds'];x0,y0=tile(w,north);x1,y1=tile(e,south)
 for x in range(x0,x1+1):
  for y in range(y0,y1+1):tiles.add((x,y))
else:
 route=request[0][1]
 for a,b in zip(route,route[1:]):
  n=max(1,math.ceil(math.hypot((b[0]-a[0])*.81,b[1]-a[1])*111000/200))
  for i in range(n+1):
   f=i/n;x,y=tile(a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f)
   for dx in [-1,0,1]:
    for dy in [-1,0,1]:tiles.add((x+dx,y+dy))
assert len(tiles)<=250, 'Explicitly review a broader download scope first'
print('tiles',len(tiles),flush=True)
def fetch(tile):
 x,y=tile;p=root/f'{z}-{x}-{y}.geojson';url=f'https://cyberjapandata.gsi.go.jp/xyz/experimental_rdcl/{z}/{x}/{y}.geojson'
 try:
  if not p.exists():p.write_bytes(urllib.request.urlopen(url,timeout=20).read())
  json.loads(p.read_text());return {'file':p.name,'url':url,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
 except Exception as e:return {'file':p.name,'url':url,'error':str(e)}
with concurrent.futures.ThreadPoolExecutor(max_workers=3)as pool:rows=list(pool.map(fetch,sorted(tiles)))
old=json.loads((root/'manifest.json').read_text())if(root/'manifest.json').exists()else{'tiles':[]};combined={r['file']:r for r in old['tiles']};combined.update({r['file']:r for r in rows});rows=list(combined.values())
(root/'manifest.json').write_text(json.dumps({'date':'2026-11-01','source':'国土地理院 道路中心線ベクトルタイル提供実験','documentation':'https://github.com/gsi-cyberjapan/experimental_rdcl','scope':'現代の中心線。通行規制・歴史年代の判断とは分離。','tiles':rows},ensure_ascii=False,indent=2));print('complete',len(rows),'errors',sum('error'in r for r in rows),flush=True)
