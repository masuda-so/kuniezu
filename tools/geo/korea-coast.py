"""GSHHG 2.3.7 full L1 SHPから朝鮮周辺の比較海岸を抽出（標準ライブラリのみ）。
python3 tools/geo/korea-coast.py /path/to/GSHHS_f_L1.shp
戦国期の海岸復元ではなく、現在用いられる世界海岸データの範囲抽出。
"""
import struct,json,sys,pathlib
b=open(sys.argv[1],'rb').read();off=100;out=[]
def clip(p,axis,edge,above):
 res=[]
 for a,c in zip(p,p[1:]+p[:1]):
  va=(a[axis]-edge)*(1 if above else -1);vc=(c[axis]-edge)*(1 if above else -1)
  if va>=0:res.append(a)
  if (va>=0)!=(vc>=0):
   t=va/(va-vc);res.append([a[0]+(c[0]-a[0])*t,a[1]+(c[1]-a[1])*t])
 return res
while off<len(b):
 no,n=struct.unpack_from('>2i',b,off);off+=8;end=off+n*2
 if struct.unpack_from('<i',b,off)[0]==5:
  x0,y0,x1,y1=struct.unpack_from('<4d',b,off+4)
  if x0<131.3 and x1>121.5 and y0<43 and y1>33 and (no==1 or (x1<129.1 and y0>34.6) or x1<127.8):
   np,npt=struct.unpack_from('<2i',b,off+36);parts=list(struct.unpack_from('<'+str(np)+'i',b,off+44))+[npt];start=off+44+np*4
   for i in range(np):
    p=[list(struct.unpack_from('<2d',b,start+j*16)) for j in range(parts[i],parts[i+1])]
    for axis,edge,above in [(0,121.5,True),(0,131.3,False),(1,33,True),(1,43,False)]:
     if p:p=clip(p,axis,edge,above)
    if len(p)>2:out.append([[round(v,6) for v in pt] for pt in p])
 off=end
p=pathlib.Path(__file__).resolve().parents[2]/'game/korea-coast.js'
p.write_text('"use strict";\n/* GSHHG 2.3.7 full L1 (Wessel / Smith / NOAA), regional extract. Historical shoreline not reconstructed. */\nTK.KOREA_COAST='+json.dumps(out,separators=(',',':'))+';\n')
print(len(out),'polygons',sum(map(len,out)),'vertices',p.stat().st_size,'bytes')
