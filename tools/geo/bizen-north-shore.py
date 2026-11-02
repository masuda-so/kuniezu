"""Register the local T1-5 shore; preserve input readings and fill only the added land.
Modern address points are controls, not measured Keicho village centres.
"""
import json,subprocess,pathlib,numpy as np,hashlib
from shapely.geometry import Polygon,MultiPolygon,LineString,mapping
from shapely.validation import make_valid
from PIL import Image,ImageDraw
root=pathlib.Path(__file__).resolve().parents[2];folder=root/'data/inputs/kojima-coast-review'
r=json.loads((folder/'north-shore-pixel-candidate.json').read_text())
assert hashlib.sha256((folder/'bizen-keicho-map.jpg').read_bytes()).hexdigest()==r['sourceSha256']
js="""const {TKGEO}=require('./tools/checks/history-focus.cjs').model({skip:['bizen-north-shore.js']});const hash=x=>{let h=2166136261;for(const c of JSON.stringify(x)){h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;}return h;};process.stdout.write(JSON.stringify({constants:{K:TKGEO.K,CX:TKGEO.CX,LON0:TKGEO.LON0,LAT0:TKGEO.LAT0},land:TKGEO.land[0][0],terr:TKGEO.terr.tenjin,neighbor:TKGEO.terr.bmatsuyama,territoryHash:hash(TKGEO.terr.tenjin)}));"""
b=json.loads(subprocess.run(['node','-e',js],cwd=root,check=True,capture_output=True,text=True).stdout);cs=b['constants']
fit=[c for c in r['controlReadings']if c['role']=='fit'];M=np.linalg.solve(np.array([c['pixel']+[1]for c in fit]),np.array([c['modernPoint']for c in fit]))
coords=np.c_[r['pixelReadings'],np.ones(len(r['pixelReadings']))]@M
proj=lambda xy:np.array([[(x-cs['LON0'])*cs['K']*cs['CX'],(cs['LAT0']-y)*cs['K']]for x,y in xy])
line=proj(coords);ring=np.array(b['land']).reshape(-1,2);start,stop=8172,8174
# The coarse local shore in the preserved base; do not silently patch a different coast.
assert len(ring)==9226 and abs(ring[start,0]-(133.92796001393668-cs['LON0'])*cs['K']*cs['CX'])<1e-6
added=Polygon(np.r_[ring[start-1:stop+1],line]);assert added.is_valid and added.area>0
old=MultiPolygon([Polygon(np.array(p[0]).reshape(-1,2),[np.array(h).reshape(-1,2)for h in p[1:]])for p in b['terr']]);assert old.is_valid
neighbor=MultiPolygon([Polygon(np.array(p[0]).reshape(-1,2),[np.array(h).reshape(-1,2)for h in p[1:]])for p in b['neighbor']])
# Close only the pre-existing land/territory clipping seam along the replaced shore.
# Clip to old land and exclude the adjacent region; do not move its political boundary.
seam=LineString(ring[start-1:stop+1]).buffer(.8,cap_style=2).intersection(make_valid(Polygon(ring))).difference(neighbor)
territory=old.union(added).union(seam);assert territory.is_valid
polys=[territory]if territory.geom_type=='Polygon'else list(territory.geoms)
flat=lambda p:[[float(v)for xy in list(p.exterior.coords)[:-1]for v in xy],*[[float(v)for xy in list(h.coords)[:-1]for v in xy]for h in p.interiors]]
hold=[]
for c in r['controlReadings']:
 if c['role']!='holdout':continue
 predicted=np.array(c['pixel']+[1])@M;diff=(predicted-c['modernPoint'])*np.array([np.cos(np.deg2rad(c['modernPoint'][1])),1])*111320
 hold.append({'name':c['name'],'predicted':predicted.tolist(),'modernAddressPoint':c['modernPoint'],'differenceMetres':float(np.linalg.norm(diff))})
patch={'sourceSha256':r['sourceSha256'],'expectedLength':len(b['land']),'start':start*2,'deleteCount':(stop-start)*2,'beforeAnchor':ring[start-1].tolist(),'afterAnchor':ring[stop].tolist(),'territoryHash':b['territoryHash'],'curve':line[::-1].reshape(-1).tolist(),'territory':[flat(p)for p in polys],'sourcePoints':coords.tolist(),'validation':{'sourceVertices':len(line),'holdout':hold,'addedLandKm2':added.area*(111.32/cs['K'])**2,'filledTerritoryKm2':(territory.area-old.area)*(111.32/cs['K'])**2,'scope':'住所代表点との独立差であり、古い村中心や汀線の外部精度を示さない。接続端は従来の概略岸を保持。'}}
(folder/'north-shore-registration.json').write_text(json.dumps({'matrixPixelToLonLat':M.tolist(),**patch},ensure_ascii=False,indent=2)+'\n')
(folder/'north-shore-added-land.geojson').write_text(json.dumps({'type':'Feature','properties':{'status':'reference-reconstruction','period':'T1-5 estimated 1596-1615','scope':'local outline; not a measured coast for every game year'},'geometry':mapping(Polygon([(x/cs['K']/cs['CX']+cs['LON0'],cs['LAT0']-y/cs['K'])for x,y in added.exterior.coords]))},ensure_ascii=False)+'\n')
code='''"use strict";
/* tools/geo/bizen-north-shore.py の出力。慶長期推定T1-5の北岸を住所代表点へ局所登録。
 * 年代別の実測汀線ではない。領主・領土移転の日付や資源を変更しない。
 * 原図：岡山大学池田家文庫／岡山県デジタルアーカイブ。位置比較：国土地理院住所検索。 */
(function(){
 const p=PATCH;
 const hash=x=>{let h=2166136261;for(const c of JSON.stringify(x))h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h;};
 const ring=TKGEO.land[0]?.[0],near=(a,b)=>a?.length===b.length&&a.every((v,i)=>Math.abs(v-b[i])<1e-6);
 if(!ring||ring.length!==p.expectedLength||!near(ring.slice(p.start-2,p.start),p.beforeAnchor)||!near(ring.slice(p.start+p.deleteCount,p.start+p.deleteCount+2),p.afterAnchor)||hash(TKGEO.terr.tenjin)!==p.territoryHash){console.warn('備前北岸：元の地形が変わったため再登録が必要です');return;}
 ring.splice(p.start,p.deleteCount,...p.curve);
 TKGEO.terr.tenjin=p.territory;
 TK.BIZEN_NORTH_SHORE=p;
 TK.RESEARCH_SOURCES.bizenKeichoNorthShore={author:'岡山大学附属図書館・岡山シティミュージアム',title:'備前国図（T1-5）・児島湾北岸',url:'https://www.city.okayama.jp/okayama-city-museum/0000079739.html',locator:'第1章1、今保から十日市の岸・慶長1596〜1615年推定',scope:'原図の岸179点を現代住所代表点で局所登録。村中心と住所代表点の差を含み、1560〜1615年の毎年の実測岸を確定しない。',accessed:'2026-11-03'};
})();
'''.replace('PATCH',json.dumps(patch,ensure_ascii=False,separators=(',',':')))
(root/'game/bizen-north-shore.js').write_text(code)
im=Image.open(folder/'bizen-keicho-map.jpg').convert('RGB');crop=im.crop((100,4800,2200,5850));d=ImageDraw.Draw(crop);d.line([(x-100,y-4800)for x,y in r['pixelReadings']],fill='lime',width=5)
for c in r['controlReadings']:
 x,y=c['pixel'];d.ellipse((x-110,y-4810,x-90,y-4790),outline='blue'if c['role']=='fit'else 'magenta',width=4)
crop.resize((1600,800)).save(folder/'north-shore-source-overlay.jpg',quality=94)
print(json.dumps(patch['validation'],ensure_ascii=False))
