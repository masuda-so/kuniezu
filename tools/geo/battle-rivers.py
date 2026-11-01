"""Geofabrik河川shapefileから全111合戦の現代比較水路を切出す。
先に fetch-japan-waterways.py。朝鮮は既存の同形式キャッシュを使用。
戦国期の河道・川幅の復元ではない。OSM contributors / ODbL 1.0。
"""
import json,pathlib,shapefile
from shapely.geometry import LineString,box
root=pathlib.Path(__file__).resolve().parents[2];meta=json.loads((root/'data/audits/battle-atlas-audit.json').read_text());ways={}
folders=list(pathlib.Path('/tmp/kuniezu-japan-waterways').glob('*'))+[pathlib.Path('/tmp/kuniezu-korea-waterways'),pathlib.Path('/tmp/kuniezu-north-waterways')]
for folder in folders:
 if not (folder/'gis_osm_waterways_free_1.shx').exists():continue
 r=shapefile.Reader(str(folder/'gis_osm_waterways_free_1.shp'))
 for item in r.iterShapeRecords():
  d=item.record.as_dict()
  if d['fclass']!='river' and not(d['fclass']=='stream' and d['name']):continue
  p=item.shape;parts=list(p.parts)+[len(p.points)]
  for i,(a,b) in enumerate(zip(parts,parts[1:])):
   pts=p.points[a:b]
   if len(pts)<2:continue
   ways[str(d['osm_id'])+':'+str(i)]={'id':d['osm_id'],'name':d['name'],'kind':d['fclass'],'geometry':LineString(pts),'bounds':p.bbox}
 print('READ',folder.name,len(ways),flush=True)
report=[]
for name,m in meta.items():
 w,n,e,s=m['bounds'];view=box(w,s,e,n);rivers=[]
 for way in ways.values():
  a,b,c,d=way['bounds']
  if a>e or c<w or b>n or d<s:continue
  if way['kind']=='stream' and m['geo'][2]>25:continue
  clip=way['geometry'].intersection(view);parts=list(clip.geoms)if hasattr(clip,'geoms')else[clip]
  for part in parts:
   if part.geom_type!='LineString' or part.length<max(.0001,(e-w)*.002):continue
   part=part.simplify(max(.00007,(e-w)/1800),preserve_topology=True);rivers.append({'id':way['id'],'name':way['name'],'kind':way['kind'],'points':[[round(x,6),round(y,6)]for x,y in part.coords]})
 path=root/'game/atlas'/m['file'];d=json.loads(path.read_text());d['comparisonRivers']=rivers;d['riverSource']={'dataset':'OpenStreetMap contributors / Geofabrik','license':'ODbL 1.0','url':'https://www.openstreetmap.org/copyright','accessed':'2026-11-01','scope':'現代河川中心線。16世紀の河道・幅・堤防ではない。広域では川だけ、25km以下では名前付き細流も表示。'};path.write_text(json.dumps(d,ensure_ascii=False,separators=(',',':'))+'\n');report.append({'title':name,'lines':len(rivers),'points':sum(len(r['points'])for r in rivers),'file':m['file']})
(root/'data/audits/battle-rivers-review.json').write_text(json.dumps({'source':'OpenStreetMap contributors / Geofabrik / ODbL 1.0','date':'2026-11-01','scope':'全111表示範囲の現代比較河川。史実河道の照合とは別。','battles':report},ensure_ascii=False,indent=2));print('DONE',len(report),'views',sum(r['lines']for r in report),'lines')
