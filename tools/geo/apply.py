import json,re
src=open('/home/claude/game/geo.js').read()
pre='window.TKGEO=';assert src.startswith(pre)
g=json.loads(src[len(pre):].rstrip().rstrip(';'))
k=json.load(open('/home/claude/geo/korea_out.json'))
KIDS=set(k['terr'])
# 1) 朝鮮の城の領域・境・道境を差し替え
for i,v in k['terr'].items(): g['terr'][i]=v
g['edges']=[e for e in g['edges'] if not (e[0] in KIDS and e[1] in KIDS)]+[e for e in k['edges'] if e[2]]
def mean(l): xs=l[0::2]; ys=l[1::2]; return sum(xs)/len(xs), sum(ys)/len(ys)
before=len(g['pborders'])
g['pborders']=[l for l in g['pborders'] if not (mean(l)[0]<-5 and mean(l)[1]<1600)]+k['pborders']
print('pborders',before,'->',len(g['pborders']))
# 2) 陸地の穴（霞ヶ浦＝香取海、越後の潟）を湖として描く：陸からは穴を外し、湖に加える
moved=[]
for p in g['land']:
    keep=[p[0]]
    for r in p[1:]:
        xs=r[0::2]
        if min(xs)>1500: moved.append(r)
        else: keep.append(r)
    p[:]=keep
from shapely.geometry import Polygon
for r in moved:
    pl=Polygon([(r[i],r[i+1]) for i in range(0,len(r),2)]).buffer(1.6,join_style=1).simplify(.3)
    g['lakes'].append([[round(v,1) for xy in list(pl.exterior.coords)[:-1] for v in xy]])
print('moved holes to lakes',len(moved))
# 湖の向きをそろえる（重なった湖が打ち消し合って抜けないように）
def area(r):
    a=0
    for i in range(0,len(r),2):
        j=(i+2)%len(r); a+=r[i]*r[j+1]-r[j]*r[i+1]
    return a/2
def rev(r): return [v for i in range(len(r)-2,-1,-2) for v in (r[i],r[i+1])]
for p in g['lakes']:
    for n,r in enumerate(p):
        want=(area(r)>0) if n==0 else (area(r)<0)
        if not want: p[n]=rev(r)
# 3) 地図の外へ陸を伸ばす（朝鮮の北・満洲・蝦夷）：切れ目を霞で隠すため
from shapely.geometry import shape, Polygon as SP, box
from shapely.ops import unary_union
LON0,LAT0,K,CX=g['LON0'],g['LAT0'],g['K'],g['CX']
import shapely
def proj(geom): return shapely.transform(geom, lambda a: __import__('numpy').column_stack(((a[:,0]-LON0)*K*CX,(LAT0-a[:,1])*K)))
NE=json.load(open('/home/claude/geo/ne_admin1.geojson'))['features']
want=lambda p:p.get('adm0_a3')=='PRK' or (p.get('name') in ('Liaoning','Jilin',"Primor'ye",'Hokkaidō'))
ext=unary_union([proj(shape(f['geometry']).buffer(0)) for f in NE if want(f['properties'])])
def toPoly(p): 
    rings=[[(p[k][j],p[k][j+1]) for j in range(0,len(p[k]),2)] for k in range(len(p))]
    return SP(rings[0],rings[1:]).buffer(0)
def fromPoly(pl):
    pl=pl.simplify(.4)
    if pl.geom_type!='Polygon': pl=max(pl.geoms,key=lambda q:q.area)
    return [[round(v,1) for xy in list(pl.exterior.coords)[:-1] for v in xy]]+[[round(v,1) for xy in list(h.coords)[:-1] for v in xy] for h in pl.interiors]
A=unary_union([box(-1150,-240,330,250),box(-1150,250,-830,820)])
B=box(1500,-240,2300,-20)
for idx,bx in ((173,A),(6,B)):
    old=toPoly(g['land'][idx]);add=ext.intersection(bx)
    new=unary_union([old,add]).buffer(.05).buffer(-.05)
    g['land'][idx]=fromPoly(new); print('land',idx,'extended',round(old.area),'->',round(new.area))
open('/home/claude/game/geo.js','w').write(pre+json.dumps(g,ensure_ascii=False,separators=(',',':'))+';')
