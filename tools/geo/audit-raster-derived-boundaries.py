"""Inspect long axis-aligned polygon edges against their source raster.

This finds review candidates, not historic shores or automatic geometry corrections.
Usage: python audit-raster-derived-boundaries.py GEOMETRY CACHE OUTPUT
CACHE contains heights.npy and Web Mercator bounds.json (z,x0,y0).
"""
import hashlib,json,math,pathlib,sys
import numpy as np
geometry,cache,out=map(pathlib.Path,sys.argv[1:4])
geo=json.loads(geometry.read_text());bounds=json.loads((cache/'bounds.json').read_text())
a=np.load(cache/'heights.npy');n=2**bounds['z'];rows=[]
def pixel(lon,lat):
    return [(lon+180)/360*n*256-bounds['x0']*256,
            (1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*n*256-bounds['y0']*256]
def rings(g):
    if g['type']=='Polygon':return g['coordinates']
    if g['type']=='MultiPolygon':return [ring for polygon in g['coordinates'] for ring in polygon]
    return []
for fi,f in enumerate(geo['features']):
    for ri,ring in enumerate(rings(f['geometry'])):
        for start,end in zip(ring,ring[1:]):
            length=math.hypot((end[0]-start[0])*111320*math.cos(math.radians((end[1]+start[1])/2)),(end[1]-start[1])*111320)
            if length<500 or min(abs(end[0]-start[0]),abs(end[1]-start[1]))>1e-8:continue
            mid=[(x+y)/2 for x,y in zip(start,end)];p=pixel(*mid);x,y=map(round,p)
            if not(3<=x<a.shape[1]-3 and 3<=y<a.shape[0]-3):continue
            patch=a[y-3:y+4,x-3:x+4]
            clean=[[round(float(v),3)if np.isfinite(v)else None for v in line]for line in patch]
            horizontal=abs(end[1]-start[1])<1e-8
            rows.append({'feature':fi,'ring':ri,'start':start,'end':end,'lengthMetres':round(length,2),
                         'axis':'east-west'if horizontal else'north-south','midpointRasterPixel':p,
                         'onTileEdge':abs((p[1]if horizontal else p[0])%256)<1e-6,
                         'modernElevationPatch7x7':clean,'finitePatchPixels':int(np.isfinite(patch).sum()),
                         'decision':'requires-era-and-landform-review'})
result={'geometry':str(geometry),'geometrySha256':hashlib.sha256(geometry.read_bytes()).hexdigest(),
        'rasterSha256':hashlib.sha256((cache/'heights.npy').read_bytes()).hexdigest(),'rasterBounds':bounds,
        'validRasterFraction':float(np.isfinite(a).mean()),'rasterSource':'https://maps.gsi.go.jp/development/demtile.html',
        'reviewCandidates':rows,'runtimeChanged':False,
        'scope':'500m以上の東西/南北方向の辺と現代標高の比較。タイル境界・欠測・平坦な標高値を区別する。候補を古い岸や誤りと自動判定せず、治水・干拓・自然堤防と年代照合する。'}
out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'reviewCandidates':len(rows),'onTileEdges':sum(r['onTileEdge']for r in rows),'fullyFinitePatches':sum(r['finitePatchPixels']==49 for r in rows)},ensure_ascii=False))
