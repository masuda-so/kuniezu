"""Build local battle relief from Mapzen Terrarium, not invented terrain.
Usage: python battle-atlas.py --poi /path/nrct-poi.csv --catalog /path/catalog.json
Requires Pillow. Never starts the game server.
"""
import argparse, base64, concurrent.futures, csv, io, json, math, pathlib, struct, urllib.request
from PIL import Image
ROOT = pathlib.Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser()
parser.add_argument('--poi', required=True)
parser.add_argument('--catalog', required=True, help='JSON containing battles keyed by title and their features')
parser.add_argument('--cache', default='/tmp/kuniezu-dem')
args = parser.parse_args()
frames = json.loads((ROOT/'data/audits/battle-atlas-frames.json').read_text())
old = json.loads(pathlib.Path(args.catalog).read_text())
pois = list(csv.DictReader(open(args.poi)))
cache = pathlib.Path(args.cache); cache.mkdir(exist_ok=True)
out = ROOT/'game/atlas'; out.mkdir(exist_ok=True)
N, M = 160, 112
def xy(lon, lat, z):
    return (lon+180)/360*2**z, (1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*2**z
def bounds(f):
    lon, lat, km = f[:3]; dx = km/111.32/math.cos(math.radians(lat))/2; dy = km*.7/111.32/2
    return [lon-dx, lat+dy, lon+dx, lat-dy]
tiles = set(); specs = []
for title, f in frames.items():
    b = bounds(f); z = max(8,min(13,round(math.log2(40075*math.cos(math.radians(f[1]))/f[2]))))
    x0,y0=xy(b[0],b[1],z);x1,y1=xy(b[2],b[3],z)
    keys=[(z,x,y) for y in range(math.floor(y0),math.floor(y1)+1) for x in range(math.floor(x0),math.floor(x1)+1)]
    tiles.update(keys);specs.append((title,f,b,z,keys))
def fetch(key):
    z,x,y=key;p=cache/f'{z}-{x}-{y}.png'
    if not p.exists():
        url=f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
        for attempt in range(3):
            try:
                data=urllib.request.urlopen(url,timeout=30).read();Image.open(io.BytesIO(data)).verify();p.write_bytes(data);break
            except Exception:
                if attempt==2:raise
    return key
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    for i,_ in enumerate(pool.map(fetch,sorted(tiles))):
        if (i+1)%25==0:print('terrain',i+1,'/',len(tiles),flush=True)
meta={}
def clean(n):
    for sep in ['（','・','／']: n=n.split(sep)[0]
    return n.replace('跡','').replace('址','')
for ix,(title,f,b,z,keys) in enumerate(specs):
    ims={k:Image.open(cache/f'{k[0]}-{k[1]}-{k[2]}.png').convert('RGB') for k in keys}
    heights=[]
    for y in range(M):
        lat=b[1]+(b[3]-b[1])*y/(M-1)
        for x in range(N):
            lon=b[0]+(b[2]-b[0])*x/(N-1);tx,ty=xy(lon,lat,z);xx,yy=math.floor(tx),math.floor(ty)
            r,g,bl=ims[z,xx,yy].getpixel((min(255,int((tx-xx)*256)),min(255,int((ty-yy)*256))))
            heights.append(max(0,min(65535,round(r*256+g+bl/256))))
    # Candidate landmarks must share both name and region; a name alone is not a match.
    wanted=[f[3]]+[a.get('n','') for a in old['battles'][title].get('feats',[]) if a.get('n') and a.get('k') in ['castle','fort','hill','village']]
    points=[]
    for name in wanted:
        norm=clean(name)
        if len(norm)<2:continue
        # The current Teramachi temple is a relocated site, not the 1582 battlefield.
        if title=='本能寺の変' and norm=='本能寺':continue
        matches=[p for p in pois if norm in [clean(s) for s in p['名称'].split('・')] and b[0]<=float(p['経度'])<=b[2] and b[3]<=float(p['緯度'])<=b[1]]
        if len(matches)==1:
            p=matches[0]
            if not any(q.get('ref')==p['id'] for q in points):points.append({'name':name,'lon':float(p['経度']),'lat':float(p['緯度']),'ref':p['id'],'basis':'historical-gazetteer'})
    if title=='本能寺の変':
        points.append({'name':'本能寺旧地（寺域の概略位置）','lon':135.752,'lat':35.007,'source':'honnojiOldSite','basis':'approximate-old-temple-area'})
    file=f'{ix:02d}.json'
    payload={'title':title,'bounds':b,'width':N,'height':M,'encoding':'uint16le-plus32768','heights':base64.b64encode(struct.pack('<'+'H'*len(heights),*heights)).decode(),'points':points,'zoom':z}
    (out/file).write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':'))+'\n')
    meta[title]={'file':file,'geo':f[:3],'bounds':b,'label':f[3],'points':points,'scope':'現代の標高と地名の代表点。編集した表示範囲であり戦場の境界ではない。'}
(ROOT/'game/battle-atlas-data.js').write_text('"use strict";\nTK.BATTLE_ATLAS='+json.dumps(meta,ensure_ascii=False,separators=(',',':'))+';\n')
(ROOT/'data/audits/battle-atlas-audit.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
print('BUILT',len(meta),'battle maps;',len(tiles),'DEM tiles',flush=True)
