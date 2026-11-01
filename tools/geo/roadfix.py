import json,re
from shapely.geometry import Polygon,Point,LineString
from shapely.ops import unary_union,substring
from shapely.prepared import prep
s=open('/home/claude/game/geo.js').read();G=json.loads(s[len('window.TKGEO='):].rstrip().rstrip(';'))
U=unary_union([Polygon(list(zip(r[0::2],r[1::2]))).buffer(0) for p in G['land'] for r in p if len(r)>=6]);P=prep(U)
inner=U.buffer(-0.7);comps=list(inner.geoms) if inner.geom_type=='MultiPolygon' else [inner]
R=json.load(open('/home/claude/play/roads.json'))
FERRY={('西海道',17),('山陽道',225)}
def arc(a,b):
  pa,pb=Point(a),Point(b)
  c=min(comps,key=lambda g:g.distance(pa)+g.distance(pb))
  ring=c.exterior;L=ring.length;sa,sb=ring.project(pa),ring.project(pb)
  lo,hi=min(sa,sb),max(sa,sb)
  f=substring(ring,lo,hi);g=LineString(list(substring(ring,hi,L).coords)+list(substring(ring,0,lo).coords)[1:])
  path=list(f.coords) if f.length<=g.length else list(g.coords)[::-1]
  if min(f.length,g.length)>45:return None
  if sa>sb:path=path[::-1]
  ls=LineString(path);n=max(2,int(ls.length/0.8))
  return [[round(ls.interpolate(k/n,normalized=True).x,2),round(ls.interpolate(k/n,normalized=True).y,2)] for k in range(n+1)]
def bad(seg):return (not P.contains(seg)) and seg.difference(U).length>0.1
fix={}
for name,pts in R:
  out=[pts[0]];ch=False;i=0
  while i<len(pts)-1:
    if bad(LineString([pts[i],pts[i+1]])) and (name,i) not in FERRY:
      j=i+1
      while j<len(pts)-1 and bad(LineString([pts[j],pts[j+1]])) and j-i<15:j+=1
      ar=arc(pts[i],pts[j])
      if ar:out+=ar[1:-1];out.append(pts[j]);i=j;ch=True;continue
    out.append(pts[i+1]);i+=1
  if ch:fix[name]=[len(pts),'full',out]
left=[(n,i,round(LineString([o[i],o[i+1]]).difference(U).length,2)) for n,(_,_,o) in fix.items() for i in range(len(o)-1) if bad(LineString([o[i],o[i+1]]))]
print({k:len(v[2]) for k,v in fix.items()});print('left',left)
d=open('/home/claude/game/data.js').read()
open('/home/claude/game/data.js','w').write(d+"TK.ROADFIX="+json.dumps(fix,ensure_ascii=False,separators=(',',':'))+";\n")
