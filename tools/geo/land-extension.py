"""GSHHG 2.3.7 full L1 SHP から、既存の陸地（geo.js の TKGEO.land）の切り出し範囲の外側の帯だけを抽出し、game/land-extension.js に書く。
python3 tools/geo/land-extension.py /path/to/GSHHS_f_L1.shp
既存の陸地は東経121.5度・東経143.4146度（地図平面 x=2300）・北緯43度の直線で切られている。その外側を、
新しい表示範囲（東経119.5〜146度、北緯30〜45.6度）まで同じ元データから切り出し、同じ直線で切ることで継ぎ目をそろえる。
戦国期の海岸復元ではなく、現在用いられる世界海岸データの範囲抽出（朝鮮の比較海岸 korea-coast.py と同じ扱い）。
"""
import struct,json,sys,pathlib,math
W,E,N,S=121.5,146.0,45.7,24.2   # 表示範囲（与那国島〜納沙布岬、与那国島の緯度〜宗谷岬）より少し広く
OE=129.2+2300/(200*math.cos(math.radians(36)))  # 既存の日本側の陸地の東の切り口（地図平面 x=2300）
# 足す帯（経度0,経度1,緯度0,緯度1）。既に描かれている範囲と重ならないよう、次の切り口に合わせる：
#  朝鮮の比較海岸 korea-coast.js＝東経121.5〜131.3度・北緯33〜43度（water-evidence.js が旧陸地をこの範囲で差し替える）
#  日本側の旧陸地＝東経143.41度まで、北海道は北緯42.95度まで、南は北緯30.8度まで
STRIPS=[(W,121.5,S,N),            # 西：遼東の西・渤海側
 (121.5,131.3,43.0,N),            # 北（朝鮮の北）：満州
 (131.3,139.5,42.95,N),           # 北（日本海側）：沿海州
 (131.3,139.3,40.0,42.95),        # 沿海州の南岸（奥尻島を避ける）
 (139.5,OE,42.95,N),              # 北海道の北
 (OE,E,S,N),                      # 東：北海道の東・千島
 (121.5,128.0,30.0,33.0),         # 南西：朝鮮の比較海岸の南（中国の沿岸）
 (121.5,128.0,S,30.0),            # 南西のさらに南：先島・沖縄・台湾北端
 (128.0,OE,S,30.8)]               # 南：種子島・屋久島・奄美・沖縄・大東
b=open(sys.argv[1],'rb').read();off=100
def clip(p,axis,edge,above):
 res=[]
 for a,c in zip(p,p[1:]+p[:1]):
  va=(a[axis]-edge)*(1 if above else -1);vc=(c[axis]-edge)*(1 if above else -1)
  if va>=0:res.append(a)
  if (va>=0)!=(vc>=0):
   t=va/(va-vc);res.append([a[0]+(c[0]-a[0])*t,a[1]+(c[1]-a[1])*t])
 return res
def simplify(p,tol):
 if len(p)<4:return p
 keep=[False]*len(p);keep[0]=keep[-1]=True;st=[(0,len(p)-1)]
 while st:
  a,c=st.pop();best=-1;bi=-1;ax,ay=p[a];cx,cy=p[c];dx,dy=cx-ax,cy-ay;L=dx*dx+dy*dy
  for i in range(a+1,c):
   px,py=p[i];t=0 if L==0 else max(0,min(1,((px-ax)*dx+(py-ay)*dy)/L));d=math.hypot(px-ax-t*dx,py-ay-t*dy)
   if d>best:best,bi=d,i
  if best>tol:keep[bi]=True;st+=[(a,bi),(bi,c)]
 return [q for q,k in zip(p,keep) if k]
cx=200*math.cos(math.radians(36))
proj=lambda lon,lat:[round((lon-129.2)*cx,2),round((41.75-lat)*200,2)]
out=[];verts=0
while off<len(b):
 no,n=struct.unpack_from('>2i',b,off);off+=8;end=off+n*2
 if struct.unpack_from('<i',b,off)[0]==5:
  x0,y0,x1,y1=struct.unpack_from('<4d',b,off+4)
  if x0<E and x1>W and y0<N and y1>S:
   np_,npt=struct.unpack_from('<2i',b,off+36);parts=list(struct.unpack_from('<'+str(np_)+'i',b,off+44))+[npt];start=off+44+np_*4
   for i in range(np_):
    ring=[list(struct.unpack_from('<2d',b,start+j*16)) for j in range(parts[i],parts[i+1])]
    for (a0,a1,b0,b1) in STRIPS:
     if a0>=a1 or b0>=b1:continue
     p=ring
     for axis,edge,above in [(0,a0,True),(0,a1,False),(1,b0,True),(1,b1,False)]:
      if p:p=clip(p,axis,edge,above)
     if len(p)>2:
      # 帯の境の上にある点は必ず残し、その間だけを間引く（境に沿う辺が斜めの弦にならないように）。
      on=lambda q:any(abs(q[0]-e)<1e-9 for e in (a0,a1)) or any(abs(q[1]-e)<1e-9 for e in (b0,b1))
      keep=[i for i,q in enumerate(p) if on(q)]
      if keep:
       k0=keep[0];rot=p[k0:]+p[:k0];marks=[i for i,q in enumerate(rot) if on(q)]+[len(rot)];np2=[]
       for a,c in zip(marks,marks[1:]):
        seg=rot[a:c+1] if c<len(rot) else rot[a:]+[rot[0]]
        sseg=simplify(seg,0.0005) if len(seg)>3 else seg
        np2+=sseg[:-1]
       p=np2
      else:
       p=simplify(p,0.0005)  # 約50m
      if len(p)>2:
       # 長い辺（帯の境に沿う直線など）に約0.02度ごとの点を足す。ui.js が輪郭の角を丸める（chaikin）ため、点の少ない大きな角が三角形に削られる。
       dense=[]
       for q,r2 in zip(p,p[1:]+p[:1]):
        dense.append(q);n=int(math.hypot(r2[0]-q[0],r2[1]-q[1])/0.02)
        for k in range(1,n):dense.append([q[0]+(r2[0]-q[0])*k/n,q[1]+(r2[1]-q[1])*k/n])
       p=dense
       flat=[v for q in p for v in proj(*q)];out.append([flat]);verts+=len(p)
 off=end
# データの切り口（本来の海岸ではない直線）。ui.js は海岸の縁取りでこの線上の辺を引かない。
lons=sorted({e for st in STRIPS for e in st[:2]}|{121.5,131.3,OE});lats=sorted({e for st in STRIPS for e in st[2:]}|{43.0,42.95,33.0,30.8})
cuts={'x':[round((l-129.2)*cx,2) for l in lons],'y':[round((41.75-l)*200,2) for l in lats]}
root=pathlib.Path(__file__).resolve().parents[2]
js=root/'game/land-extension.js'
js.write_text('"use strict";\n/* GSHHG 2.3.7 full L1 (Wessel / Smith / NOAA, LGPL 3.0)。tools/geo/land-extension.py が生成。既存の陸地と朝鮮の比較海岸の外側（東経119.5〜146度、北緯30〜45.6度まで）。water-evidence.js の後に読み込む。歴史上の海岸の復元ではない。 */\n'
 +'(function(){const ext='+json.dumps(out,separators=(',',':'))+';const jl=TKGEO.japanLand,isJp=p=>Math.min(...p[0].filter((_,i)=>i%2===0))>=(128-129.2)*'+str(round(cx,6))+';if(jl){/* ui.js は japanLand が land の先頭部分と同じ並びである前提で描く。日本側は日本の部分の直後へ差し込む。 */const jp=ext.filter(isJp);TKGEO.land.splice(jl.length,0,...jp);jl.push(...jp);TKGEO.land.push(...ext.filter(p=>!isJp(p)));}else TKGEO.land.push(...ext);TKGEO.landExtension={source:"GSHHG 2.3.7 full L1",bounds:['+','.join(map(str,[W,E,N,S]))+'],polygons:ext.length};TKGEO.landCuts='+json.dumps(cuts)+';})();\n')
print(len(out),'polygons',verts,'vertices',js.stat().st_size,'bytes')
