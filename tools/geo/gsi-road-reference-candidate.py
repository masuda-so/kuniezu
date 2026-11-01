"""Build a modern comparison candidate from archived GSI tiles. No runtime mutation."""
import sys,pathlib,json,hashlib
from road_geometry_network import reference_route
from road_reference_review import review_candidate
src=pathlib.Path(sys.argv[1]);waypoints=json.loads(pathlib.Path(sys.argv[2]).read_text())[0][1];out=pathlib.Path(sys.argv[3]);manifest=json.loads((src/'manifest.json').read_text());lines=[];excluded=0
allow_modern_tunnels='--allow-modern-tunnels' in sys.argv[4:]
for row in manifest['tiles']:
 if row.get('error'):
  if row['error']=='HTTP Error 404: Not Found':continue
  raise ValueError(row['error'])
 p=src/row['file'];raw=p.read_bytes();assert hashlib.sha256(raw).hexdigest()==row['sha256']
 for f in json.loads(raw)['features']:
  props=f['properties'];g=f['geometry']
  if ('トンネル'in props.get('state','')and not allow_modern_tunnels)or props.get('motorway')==1:excluded+=1;continue
  if g['type']=='LineString':lines.append(g['coordinates'])
  elif g['type']=='MultiLineString':lines.extend(g['coordinates'])
try:
 r=reference_route(lines,waypoints);r['review']=review_candidate(r['points'],waypoints,r['snappedPoints'],r['distanceMeters']);r['status']='candidate-not-adopted';r['excludedFeatures']=excluded
except ValueError as e:r={'status':'rejected-disconnected-or-distant','reason':str(e),'lines':len(lines),'excludedFeatures':excluded,'coverage':getattr(e,'diagnostics',None)}
r['scope']='Modern GSI physical geometry, not a dated historic route. No artificial component bridging.';r['allowModernTunnels']=allow_modern_tunnels;out.write_text(json.dumps(r,ensure_ascii=False,indent=2));print({k:v for k,v in r.items()if k not in ['points','snappedPoints']})
