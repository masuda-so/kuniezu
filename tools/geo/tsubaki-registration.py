"""国土地理院『土地条件調査報告書（銚子・鹿島地区）』図16の水際を比較座標へ登録。
古図の縮尺歪みと現代村名代表点の誤差を残す。精密な1560年測量線とはしない。
"""
import json,pathlib,math,numpy as np
from PIL import Image,ImageDraw
ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/'data/verification/tsubaki';OUT.mkdir(parents=True,exist_ok=True)
raw=json.loads((ROOT/'data/research/tsubaki-trace-input.json').read_text());rows=raw['controls'];A=np.array([[*r[1],1]for r in rows]);B=np.array([r[2]for r in rows]);M=np.linalg.lstsq(A,B,rcond=None)[0];errors=np.linalg.norm((A@M-B)*[90000,111000],axis=1)
ring=(np.array([[*p,1]for p in raw['trace']])@M).tolist();ring.append(ring[0]);rms=float(np.sqrt(np.mean(errors**2)))
report={'source':'https://www1.gsi.go.jp/geowww/landcondition/report/d2031.pdf','title':'土地条件調査報告書（銚子・鹿島地区）','publisher':'建設省国土地理院','year':1979,'locator':'本文47頁・図16 椿海疏洑始成図（PDF54頁）。図17は干拓直後の比較に使用。','sourceDate':'17世紀の干拓時図を1958年の大利根用水事業史経由で転載。1560年の実測図ではない。図16の年号換算にも寛文12と1670の不一致があり、特定日の岸とはしない。','method':'図16の内側の水際を読図、5村名代表点でアフィン登録。検索結果の地名が一致しない上代・太田は採用しない。','controls':[{'name':r[0],'pixel':r[1],'lonlat':r[2],'fitErrorMetres':round(float(e))}for r,e in zip(rows,errors)],'pixelToLonLat':M.tolist(),'rmsMetres':round(rms),'vertices':len(ring),'status':'source-traced-approximate-lake','uncertainty':'対応点は村の代表位置で独立検証点ではない。数百m以上の誤差・絵図の内部歪みを含む。細かな汀線・水位の確定には使用しない。','rejected':'現代DEMを水位だけで閾値化する案は、干拓後の地形改変を復元できないため湖岸として採用しない。'}
(OUT/'registration.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));(OUT/'lake.geojson').write_text(json.dumps({'type':'Feature','properties':report,'geometry':{'type':'Polygon','coordinates':[ring]}},ensure_ascii=False))
(ROOT/'kuniezu/static/kuniezu/tsubaki-lake.js').write_text('"use strict";\n/* 自動生成。tools/geo/tsubaki-registration.py。史料読図による概略岸、精密な16世紀測量ではない。 */\nTK.TSUBAKI_LAKE='+json.dumps({'rings':[[[round(x,6),round(y,6)]for x,y in ring]],'source':'tsubakiGsi','registrationRmsMetres':round(rms)},ensure_ascii=False,separators=(',',':'))+';\n')
# 地図とゲームの同一座標上で確認できる図。元図は研究用PDFから生成した一時画像。
p=pathlib.Path('/tmp/kuniezu-tsubaki-054.png')
if p.exists():
 img=Image.open(p).convert('RGB');w,h=1500,1000;lo0,lo1,la0,la1=140.53,140.73,35.69,35.82;H=np.vstack((M.T,[0,0,1]));D=np.array([[(lo1-lo0)/w,0,lo0],[0,-(la1-la0)/h,la1],[0,0,1]]);P=np.linalg.inv(H)@D
 im=img.transform((w,h),Image.Transform.AFFINE,tuple(P[:2].flat),Image.Resampling.BILINEAR,fillcolor='#efe8d8');d=ImageDraw.Draw(im)
 def xy(p):return ((p[0]-lo0)/(lo1-lo0)*w,(la1-p[1])/(la1-la0)*h)
 d.line([xy(p)for p in ring],fill='#116ab5',width=3)
 for r in rows:
  x,y=xy(r[2]);d.ellipse((x-5,y-5,x+5,y+5),outline='#be1838',width=3)
 im.save(OUT/'registered-comparison.jpg',quality=92)
print('Tsubaki source trace',len(ring),'vertices; registration RMS',round(rms),'m')
