"""Trace labelled old-road colour on the retained leaflet. Candidate only; no runtime mutation."""
import cv2,numpy as np,json,heapq,math
from pathlib import Path
root=Path('data/inputs/hibara-map-review');im=cv2.imread(str(root/'leaflet-page-2.png'));small=cv2.resize(im,None,fx=.5,fy=.5);hsv=cv2.cvtColor(small,cv2.COLOR_BGR2HSV);mask=cv2.inRange(hsv,np.array([14,135,155]),np.array([33,255,255]));dist=cv2.distanceTransform(255-mask,cv2.DIST_L2,3)
anchors=[[45,1400],[300,1230],[500,1260],[800,1100],[1200,900],[1350,850],[1450,770],[1565,450],[1650,320],[1870,170],[1902,47]]
ys,xs=np.where(mask>0);pixels=np.column_stack((xs,ys));snapped=[pixels[np.argmin(((pixels-np.array(p)/2)**2).sum(1))].tolist()for p in anchors];H,W=dist.shape
line=[]
for start,end in zip(snapped,snapped[1:]):
 start=tuple(start);end=tuple(end);q=[(0,0,start)];cost={start:0};prev={}
 while q:
  _,c,u=heapq.heappop(q)
  if c!=cost[u]:continue
  if u==end:break
  x,y=u
  for dx,dy in [(1,0),(-1,0),(0,1),(0,-1),(1,1),(-1,-1),(1,-1),(-1,1)]:
   v=(x+dx,y+dy)
   if not(0<=v[0]<W and 0<=v[1]<H):continue
   d=float(dist[v[1],v[0]])
   if d>10:continue
   n=c+math.hypot(dx,dy)*(1+d*d*3)
   if n<cost.get(v,float('inf')):cost[v]=n;prev[v]=u;heapq.heappush(q,(n+math.hypot(v[0]-end[0],v[1]-end[1]),n,v))
 if end not in cost:raise ValueError(('colour line disconnected',start,end))
 segment=[end]
 while segment[-1]!=start:segment.append(prev[segment[-1]])
 segment.reverse();line.extend(segment if not line else segment[1:])
r=json.loads((root/'registration-candidate.json').read_text());R=np.array(r['rotation']);t=np.array(r['translation']);s=r['pixelScalePerMetre'];xy=(np.array(line)*2-t)@R.T/s;points=np.column_stack((140.05+xy[:,0]/(111320*math.cos(math.radians(37.72))),37.72-xy[:,1]/111320))
maxgap=float(max(dist[y,x]for x,y in line))*2
(root/'road-trace-candidate.json').write_text(json.dumps({'scope':'Unadopted leaflet trace with shore-fitted registration; independent controls needed.','points':points.tolist(),'anchorPixels':anchors,'snappedPixels':(np.array(snapped)*2).tolist(),'maxDistanceFromRoadColourPixels':maxgap},indent=2));print(len(points),'points; maximum colour gap',maxgap)
