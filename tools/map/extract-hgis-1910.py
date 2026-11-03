"""国史編纂委員会「행정구역 GIS 데이터 (1910~1945년)」の GeoPackage から、1910年5月10日時点の府・郡（lv=2）を取り出し、
.cache/hgis-1910/counties-1910.json（経緯度の多角形）に書く。標準ライブラリだけで GeoPackage の幾何（WKB）を読む。
1914年の統合より前の区画で、朝鮮時代の府・牧・郡・県に最も近い（1592年との差は推定として扱う）。
出典：국사편찬위원회 역사지리정보「행정구역 GIS 데이터 (1910~1945년)」공공누리 제1유형（출처표시） https://hgis.history.go.kr
実行：python3 -I tools/map/extract-hgis-1910.py /path/to/hgis-1910-1945.gpkg
"""
import sqlite3,struct,json,sys,pathlib
DATE='19100510'
# 1896年の13道を朝鮮時代の八道へ戻す（漢城府は京畿）。
DO8={'경기도':'京畿','한성부':'京畿','충청남도':'忠清','충청북도':'忠清','전라남도':'全羅','전라북도':'全羅','경상남도':'慶尚','경상북도':'慶尚','강원도':'江原','황해도':'黄海','평안남도':'平安','평안북도':'平安','함경남도':'咸鏡','함경북도':'咸鏡'}
def wkb(b,o=0):
    le=b[o]==1;e='<' if le else '>';t=struct.unpack_from(e+'I',b,o+1)[0];o+=5;t&=0xff
    if t==3:
        nr=struct.unpack_from(e+'I',b,o)[0];o+=4;rings=[]
        for _ in range(nr):
            n=struct.unpack_from(e+'I',b,o)[0];o+=4;pts=struct.unpack_from(e+str(2*n)+'d',b,o);o+=16*n;rings.append([[round(pts[i],6),round(pts[i+1],6)] for i in range(0,2*n,2)])
        return [rings],o
    if t==6:
        n=struct.unpack_from(e+'I',b,o)[0];o+=4;polys=[]
        for _ in range(n):p,o=wkb(b,o);polys+=p
        return polys,o
    raise ValueError('geometry type %d'%t)
def gpkg_geom(b):
    flags=b[3];env=(flags>>1)&7;size={0:0,1:32,2:48,3:48,4:64}[env];return wkb(b,8+size)[0]
db=sqlite3.connect(sys.argv[1])
rows=db.execute("select key,name,name_cn,fullname,type,begin,end,geom from \"행정구역_GIS_폴리곤\" where lv=2 and begin<=? and end>=? order by key",(DATE,DATE)).fetchall()
out=[]
for key,name,cn,full,typ,b,e,g in rows:
    do=full.split('/')[0];out.append({'id':'KR'+key,'key':key,'name':cn,'name_ko':name,'type':typ,'do1910':do,'do8':DO8.get(do,do),'begin':b,'end':e,'polygons':gpkg_geom(g)})
p=pathlib.Path(sys.argv[1]).resolve().parent.parent/'counties-1910.json'
p.write_text(json.dumps({'source':'국사편찬위원회 역사지리정보「행정구역 GIS 데이터 (1910~1945년)」','license':'공공누리 제1유형（출처표시）','date':DATE,'counties':out},ensure_ascii=False))
print(len(out),'counties',sum(len(c['polygons']) for c in out),'polygons',p.stat().st_size,'bytes')
