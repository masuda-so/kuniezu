"""旧データで一つの湖として抜かれた陸域を、隣接する既存ゲーム領域へ連続させる。
史実の領界の復元ではない。既存の近似領域を使い、実在湖は別レイヤーで保つ。
"""
import json,pathlib
from shapely.geometry import Polygon,MultiPoint
from shapely.ops import unary_union,nearest_points
from shapely import voronoi_polygons,make_valid
root=pathlib.Path(__file__).resolve().parents[2]
s=(root/'game/geo.js').read_text();g=json.loads(s.split('=',1)[1].rstrip().rstrip(';'))
def shape(poly):return make_valid(Polygon(list(zip(poly[0][::2],poly[0][1::2])),[list(zip(r[::2],r[1::2])) for r in poly[1:]]))
def polys(geom):
 if geom.is_empty:return []
 if geom.geom_type=='Polygon':return [[[round(v,5) for xy in list(r.coords)[:-1] for v in xy] for r in [geom.exterior,*geom.interiors]]]
 return [p for a in geom.geoms for p in polys(a)]
masks=[]
for p in g['lakes']:
 xs=[x/g['K']/g['CX']+g['LON0'] for x in p[0][::2]];ys=[g['LAT0']-y/g['K'] for y in p[0][1::2]]
 if min(xs)>139 and max(xs)<141 and max(ys)<36.5 and max(xs)-min(xs)>1:masks.append(shape(p))
mask=unary_union(masks)
terr={k:unary_union([shape(p) for p in v]) for k,v in g['terr'].items()}
gap=mask.difference(unary_union(list(terr.values())))
adj={k:v for k,v in terr.items() if v.distance(gap)<.5}
points=[];owners=[]
for k,v in adj.items():
 for p in polys(v):
  r=p[0]
  for x,y in zip(r[::2],r[1::2]):
   if mask.distance(__import__('shapely').Point(x,y))<3:points.append((x,y));owners.append(k)
mp=MultiPoint(points);add={k:[] for k in adj}
for cell in voronoi_polygons(mp,extend_to=mask.envelope).geoms:
 point=nearest_points(cell.representative_point(),mp)[1];idx=points.index((point.x,point.y));piece=cell.intersection(gap)
 if not piece.is_empty:add[owners[idx]].append(piece)
filled={k:unary_union(v) for k,v in add.items() if v}
assert gap.difference(unary_union(list(filled.values()))).area<1e-5
out={k:polys(unary_union([terr[k],v])) for k,v in filled.items()}
edges=[]
keys=list(filled)
for i,a in enumerate(keys):
 for b in keys[i+1:]:
  shared=filled[a].boundary.intersection(filled[b].boundary)
  ls=[shared] if shared.geom_type=='LineString' else list(shared.geoms) if hasattr(shared,'geoms') else []
  lines=[[round(v,5) for p in l.coords for v in p] for l in ls if l.geom_type=='LineString' and l.length>.01]
  if lines:edges.append([a,b,lines])
js='"use strict";\n/* 旧仮想湖を除いた陸域の欠損補修。既存ゲーム領域の隣接を継続。史実領界ではない。 */\nObject.assign(TKGEO.terr,'+json.dumps(out,separators=(',',':'))+');\nTKGEO.edges.push(...'+json.dumps(edges,separators=(',',':'))+');\n'
(root/'game/kanto-repair.js').write_text(js)
print('filled world-area',round(gap.area,2),'territories',keys,'borders',len(edges))
