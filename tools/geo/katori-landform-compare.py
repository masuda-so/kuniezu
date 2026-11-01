"""Modern GSI landforms versus estimated marsh; not an ancient shoreline reconstruction."""
import pathlib,json,math,hashlib
from shapely.geometry import shape,box,mapping
from shapely.validation import make_valid
from shapely.ops import unary_union,transform
from PIL import Image,ImageDraw
ROOT=pathlib.Path(__file__).resolve().parents[2]
SRC=ROOT/'data/inputs/katori-landforms';OUT=ROOT/'data/verification/katori-landforms';OUT.mkdir(parents=True,exist_ok=True)
manifest=json.loads((SRC/'manifest.json').read_text());features=[]
for r in manifest['tiles']:
 p=SRC/r['path'];assert hashlib.sha256(p.read_bytes()).hexdigest()==r['sha256'];features.extend(json.loads(p.read_text())['features'])
invalid=sum(not shape(f['geometry']).is_valid for f in features)
levee=unary_union([make_valid(shape(f['geometry'])) for f in features if str(f['properties'].get('code')) in ['10503','3040101']])
marsh=unary_union([shape(f['geometry']) for f in json.loads((ROOT/'data/verification/katori/estimated-marsh.geojson').read_text())['features']])
# Nine tiles' combined footprints, not an arbitrary confidence buffer.
def lon(x):return x/2**14*360-180
def lat(y):return math.degrees(math.atan(math.sinh(math.pi*(1-2*y/2**14))))
domain=box(lon(14586),lat(6441),lon(14589),lat(6438));marsh=marsh.intersection(domain);levee=levee.intersection(domain);overlap=marsh.intersection(levee)
metres=lambda g:transform(lambda x,y:((x-140.53)*111320*math.cos(math.radians(35.9)),(y-35.9)*111320),g).area
report={'scope':'現代自然地形と既存推定湿地の矛盾候補。成立年代を確定せず、全域を戦国期の陸地として自動採用しない。','source':manifest,'naturalLeveeAreaM2':round(metres(levee)),'estimatedMarshAreaM2':round(metres(marsh)),'overlapM2':round(metres(overlap)),'invalidInputFeaturesRepaired':invalid,'runtimeChanged':False}
(OUT/'comparison.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
(OUT/'conflicts.geojson').write_text(json.dumps({'type':'FeatureCollection','features':[{'type':'Feature','properties':{'status':'requires-period-evidence','kind':'modern-levee-in-estimated-marsh'},'geometry':mapping(overlap)}]},ensure_ascii=False))
W,H=1400,1100;image=Image.new('RGB',(W,H),'#f3efdf');draw=ImageDraw.Draw(image);xmin,ymin,xmax,ymax=domain.bounds
xy=lambda p:(40+(p[0]-xmin)/(xmax-xmin)*(W-80),80+(ymax-p[1])/(ymax-ymin)*(H-130))
def paint(g,color):
 if g.is_empty:return
 if g.geom_type=='Polygon':
  draw.polygon([xy(p)for p in g.exterior.coords],fill=color)
  for ring in g.interiors:draw.polygon([xy(p)for p in ring.coords],fill='#f3efdf')
 elif hasattr(g,'geoms'):
  for part in g.geoms:paint(part,color)
paint(marsh,'#80bed3');paint(levee,'#8daa60');paint(overlap,'#d46c50')
draw.text((40,16),'KATORI: modern natural levees (green), estimated marsh (blue), conflict (red)',fill='black');draw.text((40,36),'No automatic 16th-century coastline adoption. GSI landform classification / existing estimated marsh.',fill='black')
image.save(OUT/'landform-overlap.png');print(json.dumps({k:v for k,v in report.items()if k!='source'},ensure_ascii=False))
