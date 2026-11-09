"""Build local battle relief from Mapzen Terrarium, not invented terrain.
Usage: python battle-atlas.py --poi /path/nrct-poi.csv --catalog /path/catalog.json
Use --titles TITLE --reuse-points --offline for a bounded refresh from cached DEM.
Run battle-rivers.py afterwards only for unmanaged maps. Pinned DEM maps retain
their reviewed rivers and are regenerated separately from their input manifest.
Requires Pillow. Never starts the game server.
"""
import argparse, base64, concurrent.futures, csv, hashlib, io, json, math, pathlib, struct, urllib.request
ROOT = pathlib.Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser()
parser.add_argument('--poi')
parser.add_argument('--catalog', help='JSON containing battles keyed by title and their features')
parser.add_argument('--titles', nargs='+', help='Refresh only these existing battle maps')
parser.add_argument('--reuse-points', action='store_true', help='Keep previously reviewed landmarks; requires --titles')
parser.add_argument('--presentation-only', action='store_true', help='Update metadata only; requires --titles, never regenerate terrain')
parser.add_argument('--offline', action='store_true', help='Fail on missing DEM tiles instead of downloading')
parser.add_argument('--cache', default='/tmp/kuniezu-dem')
args = parser.parse_args()
frames = json.loads((ROOT/'data/inputs/battle-atlas-frames.json').read_text())
if args.titles and any(title not in frames for title in args.titles):
    parser.error('Unknown battle title')
if args.presentation_only and not args.titles:
    parser.error('--presentation-only requires --titles')
if args.reuse_points and not args.titles:
    parser.error('--reuse-points requires --titles')
if not args.reuse_points and not args.presentation_only and (not args.poi or not args.catalog):
    parser.error('--poi and --catalog are required unless --reuse-points is used')
old = json.loads(pathlib.Path(args.catalog).read_text()) if args.catalog else {}
pois = list(csv.DictReader(open(args.poi))) if args.poi else []
meta_file = ROOT/'kuniezu/static/kuniezu/battle-atlas-data.js'
prior_text = meta_file.read_text() if meta_file.exists() else ''
prior = json.loads(prior_text.split('TK.BATTLE_ATLAS=', 1)[1].rsplit(';', 1)[0]) if prior_text else {}
cache = pathlib.Path(args.cache)
out = ROOT/'kuniezu/static/kuniezu/atlas'; out.mkdir(exist_ok=True)
N, M = 160, 112
def xy(lon, lat, z):
    return (lon+180)/360*2**z, (1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*2**z
def bounds(f):
    lon, lat, km = f[:3]; dx = km/111.32/math.cos(math.radians(lat))/2; dy = km*.7/111.32/2
    return [lon-dx, lat+dy, lon+dx, lat-dy]
def managed_frame(title, frame, options, prior_meta, root):
    """Protect explicitly managed relief; regenerate it separately from pinned inputs."""
    ref = pathlib.Path(options['elevationManifest'])
    if ref.is_absolute() or '..' in ref.parts:
        raise ValueError('Managed DEM manifest must be repository-relative: ' + title)
    manifest = json.loads((root/ref).read_text())
    entry = prior_meta.get(title)
    if not entry or manifest.get('title') != title or entry['file'] != manifest.get('outputFile'):
        raise ValueError('Managed DEM metadata does not match its manifest: ' + title)
    published = root/'kuniezu/static/kuniezu/atlas'/entry['file']
    raw = published.read_bytes()
    if hashlib.sha256(raw).hexdigest() != manifest.get('expectedOutputSHA256'):
        raise ValueError('Managed DEM output differs; regenerate/review separately: ' + title)
    payload = json.loads(raw)
    if payload['bounds'] != manifest['frame'] or payload['bounds'] != entry['bounds']:
        raise ValueError('Managed DEM bounds mismatch: ' + title)
    if any(abs(a-b) > 1e-10 for a, b in zip(bounds(frame), manifest['frame'])):
        raise ValueError('Managed DEM frame would change its bounds: ' + title)
    if payload['width'] != manifest['size'][0] or payload['height'] != manifest['size'][1] or payload['zoom'] != manifest['zoom']:
        raise ValueError('Managed DEM resolution mismatch: ' + title)
    kept = dict(entry)
    kept['terrainSource'] = {
        'author': '国土地理院', 'title': manifest['elevationSource']['dataset'],
        'year': '2013年公開開始・随時更新',
        'accessed': manifest['inputs'][0]['retrievedAt'][:10] + '（UTC）',
        'url': manifest['elevationSource']['specification'],
        'locator': 'DEM10B z' + str(manifest['zoom']) + '・' + str(len(manifest['inputs'])) + 'タイル。原本・SHAは ' + str(ref),
        'scope': manifest['elevationSource']['scope'],
    }
    if 'viewPresentation' in options:
        if not isinstance(options['viewPresentation'], dict):
            raise ValueError('viewPresentation must be an object: ' + title)
        kept['viewPresentation'] = options['viewPresentation']
    return kept

managed = {}
tiles = set(); specs = []
for ix, (title, f) in enumerate(frames.items()):
    if args.titles and title not in args.titles: continue
    options = f[4] if len(f) > 4 else {}
    if not isinstance(options, dict):
        raise ValueError('Optional frame configuration must be an object: ' + title)
    if options.get('elevationManifest'):
        managed[title] = managed_frame(title, f, options, prior, ROOT)
        continue
    if args.presentation_only:
        if title not in prior or not (out/prior[title]['file']).is_file():
            raise ValueError('Presentation-only requires an existing map: ' + title)
        managed[title] = dict(prior[title])
        if 'viewPresentation' in options:
            if not isinstance(options['viewPresentation'], dict):
                raise ValueError('viewPresentation must be an object: ' + title)
            managed[title]['viewPresentation'] = options['viewPresentation']
        continue
    b = bounds(f); z = max(8,min(13,round(math.log2(40075*math.cos(math.radians(f[1]))/f[2]))))
    x0,y0=xy(b[0],b[1],z);x1,y1=xy(b[2],b[3],z)
    keys=[(z,x,y) for y in range(math.floor(y0),math.floor(y1)+1) for x in range(math.floor(x0),math.floor(x1)+1)]
    tiles.update(keys);specs.append((ix,title,f,b,z,keys))
if specs:
    from PIL import Image
    cache.mkdir(exist_ok=True)
def fetch(key):
    z,x,y=key;p=cache/f'{z}-{x}-{y}.png'
    if not p.exists():
        if args.offline: raise FileNotFoundError('Missing cached DEM tile: ' + str(p))
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
meta=dict(prior)
meta.update(managed)
def clean(n):
    for sep in ['（','・','／']: n=n.split(sep)[0]
    return n.replace('跡','').replace('址','')
for ix,title,f,b,z,keys in specs:
    ims={k:Image.open(cache/f'{k[0]}-{k[1]}-{k[2]}.png').convert('RGB') for k in keys}
    heights=[]
    for y in range(M):
        lat=b[1]+(b[3]-b[1])*y/(M-1)
        for x in range(N):
            lon=b[0]+(b[2]-b[0])*x/(N-1);tx,ty=xy(lon,lat,z);xx,yy=math.floor(tx),math.floor(ty)
            r,g,bl=ims[z,xx,yy].getpixel((min(255,int((tx-xx)*256)),min(255,int((ty-yy)*256))))
            heights.append(max(0,min(65535,round(r*256+g+bl/256))))
    # Candidate landmarks must share both name and region; a name alone is not a match.
    wanted=[] if args.reuse_points else [f[3]]+[a.get('n','') for a in old['battles'][title].get('feats',[]) if a.get('n') and a.get('k') in ['castle','fort','hill','village']]
    points=list(prior[title]['points']) if args.reuse_points else []
    if any(not(b[0]<=p['lon']<=b[2] and b[3]<=p['lat']<=b[1]) for p in points):
        raise ValueError('Reviewed landmark would be clipped: ' + title)
    for name in wanted:
        norm=clean(name)
        if len(norm)<2:continue
        # The current Teramachi temple is a relocated site, not the 1582 battlefield.
        if title=='本能寺の変' and norm=='本能寺':continue
        matches=[p for p in pois if norm in [clean(s) for s in p['名称'].split('・')] and b[0]<=float(p['経度'])<=b[2] and b[3]<=float(p['緯度'])<=b[1]]
        if len(matches)==1:
            p=matches[0]
            if not any(q.get('ref')==p['id'] for q in points):points.append({'name':name,'lon':float(p['経度']),'lat':float(p['緯度']),'ref':p['id'],'basis':'historical-gazetteer'})
    if title=='本能寺の変' and not args.reuse_points:
        points.append({'name':'本能寺旧地（寺域の概略位置）','lon':135.752,'lat':35.007,'source':'honnojiOldSite','basis':'approximate-old-temple-area'})
    file=prior[title]['file'] if args.titles else f'{ix:02d}.json'
    payload={'title':title,'bounds':b,'width':N,'height':M,'encoding':'uint16le-plus32768','heights':base64.b64encode(struct.pack('<'+'H'*len(heights),*heights)).decode(),'points':points,'zoom':z,
             'elevationSource':{'dataset':'Mapzen Terrarium / AWS Open Data Terrain Tiles',
              'registry':'https://registry.opendata.aws/terrain-tiles/',
              'attribution':'https://github.com/tilezen/joerd/blob/master/docs/attribution.md',
              'urlTemplate':'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
              'scope':'現代比較標高。新しい経緯度範囲を元タイルから再標本化し、旧画像を引き伸ばさない。',
              'tiles':[{'key':list(k),'sha256':hashlib.sha256((cache/f'{k[0]}-{k[1]}-{k[2]}.png').read_bytes()).hexdigest()} for k in keys]}}
    (out/file).write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':'))+'\n')
    meta[title]={'file':file,'geo':f[:3],'bounds':b,'label':f[3],'points':points,'scope':'現代の標高と地名の代表点。編集した表示範囲であり戦場の境界ではない。'}
    if len(f) > 4 and 'viewPresentation' in f[4]:
        if not isinstance(f[4]['viewPresentation'], dict):
            raise ValueError('viewPresentation must be an object: ' + title)
        meta[title]['viewPresentation'] = f[4]['viewPresentation']
(ROOT/'kuniezu/static/kuniezu/battle-atlas-data.js').write_text('"use strict";\nTK.BATTLE_ATLAS='+json.dumps(meta,ensure_ascii=False,separators=(',',':'))+';\n')
(ROOT/'data/audits/battle-atlas-audit.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
print('BUILT',len(specs),'battle maps;',len(tiles),'DEM tiles; protected',len(managed),'managed maps',flush=True)
