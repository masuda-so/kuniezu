"""Diagnostic similarity fit of modern shoreline to leaflet. Not sufficient for runtime adoption."""
import cv2,numpy as np,json,math
from shapely.geometry import shape
geo=shape(json.load(open('data/inputs/hibara-map-review/modern-lake.geojson')));polys=[geo]if geo.geom_type=='Polygon'else geo.geoms
ll=np.concatenate([np.array(p.exterior.simplify(.00004).coords)for p in polys]);ll=ll[ll[:,1]>37.695];xy=np.column_stack(((ll[:,0]-140.05)*111320*math.cos(math.radians(37.72)),(37.72-ll[:,1])*111320))
image=cv2.imread('data/inputs/hibara-map-review/leaflet-page-2.png');b,g,r=cv2.split(image.astype(np.int16));mask=((b>r+18)&(g>r+5)&(b>g+8)).astype('uint8')*255
mask[:730]=0;mask[:,:1100]=0;mask[:,1650:]=0
mask=cv2.morphologyEx(mask,cv2.MORPH_CLOSE,np.ones((9,9),np.uint8));mask=cv2.morphologyEx(mask,cv2.MORPH_OPEN,np.ones((7,7),np.uint8));n,labels,stats,centres=cv2.connectedComponentsWithStats(mask);component=1+np.argmax(stats[1:,4]);mask=(labels==component).astype('uint8')*255;cv2.imwrite('data/inputs/hibara-map-review/water-mask.png',mask)
contours,_=cv2.findContours(mask,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE);target=max(contours,key=cv2.contourArea).reshape(-1,2).astype(float)[::3];target=target[(target[:,1]<1420)&(target[:,0]>1110)&(target[:,0]<1640)]
def fit(A,B):
 ac,bc=A.mean(0),B.mean(0);a,b=A-ac,B-bc;u,s,v=np.linalg.svd(a.T@b);R=u@v
 if np.linalg.det(R)<0:u[:,-1]*=-1;R=u@v
 scale=np.sum((a@R)*b)/np.sum(a*a);return scale,R,bc-scale*ac@R
north=xy[np.argmin(xy[:,1])];west=xy[np.argmin(xy[:,0])];scale,R,t=fit(np.array([north,west]),np.array([[1460,770],[1170,820]]))
for step in range(60):
 q=scale*xy@R+t;D=((q[:,None,:]-target[None,:,:])**2).sum(2);ix=D.argmin(1);dist=np.sqrt(D.min(1));keep=(q[:,1]<1410)&(q[:,1]>745)&(dist<np.percentile(dist,85));scale,R,t=fit(xy[keep],target[ix[keep]])
q=scale*xy@R+t;D=((q[:,None,:]-target[None,:,:])**2).sum(2);dist=np.sqrt(D.min(1));keep=q[:,1]<1410
im=cv2.imread('data/inputs/hibara-map-review/leaflet-page-2.png')
for point in q.astype(int):cv2.circle(im,tuple(point),2,(0,0,255),-1)
cv2.imwrite('data/inputs/hibara-map-review/shore-overlay.png',im)
result={'scope':'Experimental modern shore registration, not validated control points. Do not apply to runtime.','pixelScalePerMetre':scale,'rotation':R.tolist(),'translation':t.tolist(),'medianResidualPixels':float(np.median(dist[keep])),'p90ResidualPixels':float(np.percentile(dist[keep],90)),'points':len(xy),'source':'W09-05 modern lake outline and Kitashiobara leaflet page 2'}
open('data/inputs/hibara-map-review/registration-candidate.json','w').write(json.dumps(result,indent=2));print(result)
