"""Geofabrik OSM waterway shapefiles to modern comparison river centerlines.
Derived data: © OpenStreetMap contributors / ODbL 1.0. Not historic banks.
Usage: python korean-rivers.py folder [folder ...]
"""
import shapefile,json,pathlib,sys
from shapely.geometry import LineString
out=[];seen=set()
for folder in sys.argv[1:]:
 r=shapefile.Reader(str(pathlib.Path(folder)/'gis_osm_waterways_free_1.shp'))
 for item in r.iterShapeRecords():
  d=item.record.as_dict()
  if d['fclass']!='river' or d['osm_id'] in seen:continue
  seen.add(d['osm_id']);p=item.shape;parts=list(p.parts)+[len(p.points)]
  for a,b in zip(parts,parts[1:]):
   line=LineString(p.points[a:b]);pts=list(line.simplify(.0001).coords)
   if len(pts)<2:continue
   out.append({'id':d['osm_id'],'name':d['name'],'bounds':list(line.bounds),'points':[[round(x,6),round(y,6)] for x,y in pts]})
root=pathlib.Path(__file__).resolve().parents[2]
(root/'game/korean-rivers-detail.js').write_text('"use strict";\n/* © OpenStreetMap contributors / ODbL 1.0. Modern river reference, not historic banks. */\nTK.KOREAN_RIVERS_DETAIL='+json.dumps(out,ensure_ascii=False,separators=(',',':'))+';\n')
print('river sections',len(out),'vertices',sum(len(x['points']) for x in out))
