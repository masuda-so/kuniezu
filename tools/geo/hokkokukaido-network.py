"""GSI modern geometry comparison along documented towns/passes. Output is not a dated historic route."""
import pathlib,json,hashlib
from road_geometry_network import reference_route
from road_reference_review import review_candidate,distance
root=pathlib.Path(__file__).resolve().parents[2];src=root/'data/inputs/hokkokukaido-review';manifest=json.loads((src/'gsi-roads/manifest.json').read_text());lines=[];excluded=0
assert all('error'not in r or r['error']=='HTTP Error 404: Not Found' for r in manifest['tiles'])
for row in manifest['tiles']:
 if row.get('error')=='HTTP Error 404: Not Found':continue
 p=src/'gsi-roads'/row['file'];assert hashlib.sha256(p.read_bytes()).hexdigest()==row['sha256']
 for f in json.loads(p.read_text())['features']:
  prop=f['properties'];g=f['geometry']
  if 'トンネル'in prop.get('state','') or prop.get('motorway')==1:excluded+=1;continue
  if g['type']=='LineString':lines.append(g['coordinates'])
  elif g['type']=='MultiLineString':lines.extend(g['coordinates'])
anchors=json.loads((src/'north-corridor.json').read_text())[0][1]
precise=[[136.223528,35.507383],anchors[2],anchors[4],[136.200321,35.770328]]
r=reference_route(lines,precise);r['review']=review_candidate(r['points'],precise,r['snappedPoints'],r['distanceMeters']);r['placeContext']=[{'name':name,'representativePoint':anchors[i],'nearestRoadMetres':min(distance(p,anchors[i])for p in r['points']),'role':'area representative, not a forced road-centre waypoint'}for i,name in [(1,'柳ヶ瀬'),(3,'中河内')]];r['excludedTunnelOrMotorwayFeatures']=excluded;r['scope']='GSI現代形状の比較線。現代の通行規制を適用しないが、16世紀の中心線を復元したものではない。';(src/'gsi-network-candidate.json').write_text(json.dumps(r,ensure_ascii=False,indent=2));print({k:r[k]for k in ['distanceMeters','nodes','connectedNodes','excludedTunnelOrMotorwayFeatures','review']})
