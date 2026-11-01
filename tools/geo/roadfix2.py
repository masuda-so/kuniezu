import json,math
from shapely.geometry import Polygon,Point,LineString
from shapely.ops import unary_union,substring,nearest_points
from shapely.prepared import prep
s=open('/home/claude/game/geo.js').read();G=json.loads(s[len('window.TKGEO='):].rstrip().rstrip(';'))
U=unary_union([Polygon(list(zip(r[0::2],r[1::2]))).buffer(0) for p in G['land'] for r in p if len(r)>=6]);P=prep(U)
inner=U.buffer(-0.7);comps=list(inner.geoms) if inner.geom_type=='MultiPolygon' else [inner]
R=json.load(open('/home/claude/play/roads.json'))
orig={n:len(p) for n,p in R}
FERRY={('西海道',17),('山陽道',225)}
def arc(a,b):
  pa,pb=Point(a),Point(b);c=min(comps,key=lambda g:g.distance(pa)+g.distance(pb))
  ring=c.exterior;L=ring.length;sa,sb=ring.project(pa),ring.project(pb);lo,hi=min(sa,sb),max(sa,sb)
  f=substring(ring,lo,hi);g=LineString(list(substring(ring,hi,L).coords)+list(substring(ring,0,lo).coords)[1:])
  path=list(f.coords) if f.length<=g.length else list(g.coords)[::-1]
  if min(f.length,g.length)>45:return None
  if sa>sb:path=path[::-1]
  ls=LineString(path);n=max(2,int(ls.length/0.8))
  return [[round(ls.interpolate(k/n,normalized=True).x,2),round(ls.interpolate(k/n,normalized=True).y,2)] for k in range(n+1)]
def bad(seg):return (not P.contains(seg)) and seg.difference(U).length>0.1
out={}
# 1) 海に出る区間を岸沿いへ
for name,pts in R:
  o=[pts[0]];i=0
  while i<len(pts)-1:
    if bad(LineString([pts[i],pts[i+1]])) and (name,i) not in FERRY:
      j=i+1
      while j<len(pts)-1 and bad(LineString([pts[j],pts[j+1]])) and j-i<15:j+=1
      ar=arc(pts[i],pts[j])
      if ar:o+=ar[1:-1];o.append(pts[j]);i=j;continue
    o.append(pts[i+1]);i+=1
  out[name]=o
# 2) 並んで走る道は、前の（主な）道の線に寄せて一本にする
done=[]
merged=set()
for name,_ in R:
  pts=out[name]
  if done:
    others=[LineString(out[n]) for n in done]
    near=[]
    for p in pts:
      P0=Point(p);best=None;bd=1e9
      for L in others:
        d=L.distance(P0)
        if d<bd:bd=d;best=L
      near.append((bd,best))
    # 連続して 0.3〜7 の距離にある区間（長さ6点以上）を寄せる
    i=0;new=[q[:] for q in pts]
    while i<len(pts):
      if 0.3<near[i][0]<7:
        j=i
        while j<len(pts) and near[j][0]<7:j+=1
        seglen=LineString(pts[i:j+1] if j-i>=1 else [pts[i],pts[i]]).length if j-i>=1 else 0
        if seglen>8:
          for k in range(i,j):
            q=nearest_points(near[k][1],Point(pts[k]))[0];new[k]=[round(q.x,2),round(q.y,2)]
          merged.add(name)
        i=max(j,i+1)
      else:i+=1
    # 寄せた結果、同じ所に重なった点を間引く
    ded=[new[0]]
    for q in new[1:]:
      if math.hypot(q[0]-ded[-1][0],q[1]-ded[-1][1])>0.25:ded.append(q)
    out[name]=ded
  done.append(name)
fix={n:[orig[n],'full',out[n]] for n,_ in R if out[n]!=[list(map(float,x)) for x in dict(R)[n]]}
print('fixed roads',len(fix),'merged',sorted(merged))
d=open('/home/claude/game/data.js').read()
open('/home/claude/game/data.js','w').write(d+"TK.ROADFIX="+json.dumps(fix,ensure_ascii=False,separators=(',',':'))+";\n")
