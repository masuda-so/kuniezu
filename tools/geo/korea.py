import json, math, subprocess
from shapely.geometry import shape, Polygon, MultiPolygon, LineString, MultiLineString, Point, box
from shapely.ops import unary_union, linemerge, voronoi_diagram, transform
from shapely import segmentize

G=json.loads(subprocess.check_output(['node','-e',"""
global.window=global;eval(require('fs').readFileSync('/home/claude/game/geo.js','utf8'));const g=window.TKGEO;
process.stdout.write(JSON.stringify({LON0:g.LON0,LAT0:g.LAT0,K:g.K,CX:g.CX,cpos:g.cpos,land:g.land,edges:g.edges,pborders:g.pborders}));"""]))
LON0,LAT0,K,CX=G['LON0'],G['LAT0'],G['K'],G['CX']
def P(lon,lat,z=None): return ((lon-LON0)*K*CX,(LAT0-lat)*K)
def proj(geom): return transform(lambda x,y,z=None:(tuple((xx-LON0)*K*CX for xx in x) if hasattr(x,'__iter__') else (x-LON0)*K*CX, tuple((LAT0-yy)*K for yy in y) if hasattr(y,'__iter__') else (LAT0-y)*K), geom)

fc=json.load(open('/home/claude/geo/korea_admin1.geojson'))['features']
F={f['properties']['name']:proj(shape(f['geometry']).buffer(0)) for f in fc}
grp={
 '京畿':['Gyeonggi','Seoul','Incheon'],
 '忠清N':['North Chungcheong'],'忠清S':['South Chungcheong','Daejeon','Sejong'],
 '全羅N':['North Jeolla'],'全羅S':['South Jeolla','Gwangju','Jeju'],
 '慶尚N':['North Gyeongsang','Daegu'],'慶尚S':['South Gyeongsang','Busan','Ulsan'],
 '江原':['Gangwon','Kangwŏn-do'],
 '黄海':['Hwanghae-bukto','Hwanghae-namdo'],
 '平安N':["P'yŏngan-bukto",'Chagang-do'],'平安S':["P'yŏngan-namdo","P'yŏngyang"],
 '咸鏡':['Hamgyŏng-bukto','Hamgyŏng-namdo','Ryanggang','Rasŏn'],
}
R={k:unary_union([F[n] for n in v]).buffer(0.01).buffer(-0.01) for k,v in grp.items()}
# 開城一帯（臨津江の北）は朝鮮の京畿道：黄海から京畿へ移す
def noise(x,y,s):
    return (math.sin(x*.071+y*.053+s)*.6+math.sin(x*.173-y*.131+2*s)*.3+math.sin(x*.37+y*.29+3*s)*.15)
def warp_line_coords(coords,amp):
    out=[]
    for (x,y) in coords:
        out.append((x+amp*noise(x,y,1.3),y+amp*noise(y,x,4.1)))
    return out
carve=Polygon([P(126.20,37.68),P(126.62,37.72),P(126.95,37.88),P(127.08,38.05),P(126.80,38.18),P(126.35,38.10),P(126.15,37.90)])
carve=Polygon(warp_line_coords(list(segmentize(carve,3).exterior.coords),3))
mv=R['黄海'].intersection(carve)
R['黄海']=R['黄海'].difference(carve).buffer(0)
R['京畿']=unary_union([R['京畿'],mv]).buffer(0.01).buffer(-0.01)

DO={'京畿':['京畿'],'忠清':['忠清N','忠清S'],'全羅':['全羅N','全羅S'],'慶尚':['慶尚N','慶尚S'],'江原':['江原'],'黄海':['黄海'],'平安':['平安N','平安S'],'咸鏡':['咸鏡']}
DOP={k:unary_union([R[s] for s in v]).buffer(0.01).buffer(-0.01) for k,v in DO.items()}
# 城ごとの割り当て（小区分→城）
sub={'京畿':['hanseong','gaeseong'],'忠清N':['chungju'],'忠清S':['gongju'],'全羅N':['jeonju','namwon'],'全羅S':['suncheon'],
 '慶尚N':['sangju','daegu'],'慶尚S':['jinju','busan','ulsan'],'江原':['wonju'],'黄海':['haeju'],'平安N':['uiju'],'平安S':['pyongyang'],'咸鏡':['hamhung']}
cpos=G['cpos']
terr={}
for s,ids in sub.items():
    poly=R[s]
    if len(ids)==1: terr[ids[0]]=poly; continue
    pts=MultiPolygon if False else None
    from shapely.geometry import MultiPoint
    mp=MultiPoint([Point(*cpos[i]) for i in ids])
    vd=voronoi_diagram(mp,envelope=poly.envelope.buffer(200))
    cells={}
    for cell in vd.geoms:
        for i in ids:
            if cell.contains(Point(*cpos[i])): cells[i]=cell
    # 境の線を少し揺らして自然な形に（小区分の外周には触れない）
    bd=poly.boundary
    def wcell(c):
        c=segmentize(c,2.5)
        def f(x,y):
            d=bd.distance(Point(x,y)); w=min(1,d/10)
            return (x+6*w*noise(x,y,0.7), y+6*w*noise(y,x,2.9))
        ring=[f(x,y) for x,y in c.exterior.coords]
        return Polygon(ring).buffer(0)
    wc={i:wcell(c) for i,c in cells.items()}
    # 揺らした後の重なり・隙間をなくす：順に引き算し、最後の城が残りを取る
    rest=poly
    for n,i in enumerate(ids):
        if n<len(ids)-1:
            t=poly.intersection(wc[i]).intersection(rest)
            terr[i]=t; rest=rest.difference(t)
        else: terr[i]=rest
for i in terr: terr[i]=terr[i].buffer(0)

# 遊戯の陸地（朝鮮側）
land=[]
for p in G['land']:
    rings=[[(p[k][j],p[k][j+1]) for j in range(0,len(p[k]),2)] for k in range(len(p))]
    try: land.append(Polygon(rings[0],rings[1:]).buffer(0))
    except Exception: pass
LAND=unary_union([l for l in land if l.bounds[0]<80 and l.bounds[1]<1700])
LANDb=LAND.buffer(1.0)

def ringsOf(g,tol=.35):
    g=g.simplify(tol,preserve_topology=True)
    out=[]
    for pl in (g.geoms if hasattr(g,'geoms') else [g]):
        if pl.is_empty or pl.area<4: continue
        r=[round(v,1) for xy in list(pl.exterior.coords)[:-1] for v in xy]
        holes=[[round(v,1) for xy in list(h.coords)[:-1] for v in xy] for h in pl.interiors if Polygon(h).area>4]
        out.append([r]+holes)
    out.sort(key=lambda p:-len(p[0]))
    return out
def linesOf(g,tol=.35):
    g=g.intersection(LANDb)
    if g.is_empty: return []
    parts=[]
    def walk(x):
        if x.geom_type=='LineString': parts.append(x)
        elif hasattr(x,'geoms'):
            for y in x.geoms: walk(y)
    walk(g)
    m=linemerge(MultiLineString(parts)) if len(parts)>1 else (parts[0] if parts else None)
    if m is None: return []
    out=[]
    for l in (m.geoms if hasattr(m,'geoms') else [m]):
        l=l.simplify(tol)
        if l.length<2: continue
        out.append([round(v,1) for xy in l.coords for v in xy])
    return out

KIDS=set(sub_id for v in sub.values() for sub_id in v)
newT={i:ringsOf(terr[i]) for i in KIDS}
# 城と城の境（共有する線）
newE=[]
ids=sorted(KIDS)
for a in range(len(ids)):
    for b in range(a+1,len(ids)):
        A,B=terr[ids[a]],terr[ids[b]]
        if A.distance(B)>0.5: continue
        sh=A.boundary.intersection(B.buffer(0.3))
        ls=linesOf(sh)
        if ls: newE.append([ids[a],ids[b],ls])
old=[(e[0],e[1]) for e in G['edges'] if e[0] in KIDS and e[1] in KIDS]
newpairs={tuple(sorted((e[0],e[1]))) for e in newE}
for a,b in old:
    if tuple(sorted((a,b))) not in newpairs: newE.append([a,b,[]]); print('keep old adjacency',a,b)
for p in sorted(newpairs-{tuple(sorted(x)) for x in old}): print('new adjacency',p)
# 道の境と、明との境
pb=[]
dk=list(DOP)
for a in range(len(dk)):
    for b in range(a+1,len(dk)):
        A,B=DOP[dk[a]],DOP[dk[b]]
        if A.distance(B)>0.5: continue
        pb+=linesOf(A.boundary.intersection(B.buffer(0.3)))
KU=unary_union(list(DOP.values()))
for n in ('Liaoning','Jilin'):
    pb+=linesOf(KU.boundary.intersection(F[n].buffer(0.6)))
json.dump({'terr':newT,'edges':newE,'pborders':pb,'do':{k:ringsOf(v,.6) for k,v in DOP.items()}},open('/home/claude/geo/korea_out.json','w'))
print('terr pts',{i:sum(len(r)//2 for p in newT[i] for r in p) for i in newT})
print('edges',len(newE),'pborders',len(pb))
