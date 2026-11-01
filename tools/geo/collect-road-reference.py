import urllib.request,urllib.parse,json,time,pathlib,math,subprocess
import sys
from road_reference_review import review_candidate,review_anchors
roads=json.loads(pathlib.Path(sys.argv[1]).read_text());out={};audit=[];rejected={}
profile=sys.argv[3] if len(sys.argv)>3 else 'routed-bike'
assert profile in ['routed-bike','routed-car','routed-foot']
for name,pts,*_ in roads:
 url='https://routing.openstreetmap.de/'+profile+'/route/v1/driving/'+';'.join(','.join(map(str,p)) for p in pts)+'?overview=full&geometries=geojson&steps=false&continue_straight=false'+('&exclude=motorway' if profile=='routed-car' else '')
 candidate=None
 try:
  anchors=review_anchors(pts)
  if anchors['issues']:raise ValueError(','.join(anchors['issues']))
  d=json.loads(subprocess.run(['curl','--fail','--silent','--max-time','12',url],check=True,capture_output=True).stdout);r=d['routes'][0];geo=r['geometry']['coordinates'];snap=max(w['distance'] for w in d['waypoints'])
  candidate={'points':geo,'distanceMeters':r['distance'],'profile':profile,'url':url,'requestedPoints':pts,'snappedPoints':d['waypoints'],'legs':[{'distanceMeters':leg['distance'],'durationSeconds':leg['duration']}for leg in r.get('legs',[])]}
  review=review_candidate(geo,pts,d['waypoints'],r['distance']);candidate['review']=review
  if review['issues']:raise ValueError(','.join(review['issues']))
  out[name]=geo;audit.append({'name':name,'status':'modern-reference','vertices':len(geo),'maxSnapMeters':snap,'profile':profile,'url':url,'review':review});print(name,len(geo),flush=True)
 except Exception as e:
  if candidate is not None:rejected[name]=candidate
  audit.append({'name':name,'status':'keep-existing','reason':str(e),'profile':profile,'url':url,'rejectedCandidateRetained':candidate is not None});print(name,str(e),flush=True)
 pathlib.Path(sys.argv[2]).write_text(json.dumps({'roads':out,'audit':audit,'rejected':rejected},ensure_ascii=False));time.sleep(1)
