"""三州街道の近現代比較線を差分更新。周辺道路を再取得・上書きしない。"""
import json,pathlib
from shapely.geometry import LineString
R=pathlib.Path(__file__).resolve().parents[2]
route=json.loads((R/'data/inputs/sanshu-route.json').read_text())[0]
raw=json.loads((R/'data/inputs/sanshu-modern.json').read_text());assert raw.get('accepted') is True, 'Unreviewed or rejected route must not be applied'
assert raw['audit'][0]['status']=='modern-reference'
pts=[[round(x,6),round(y,6)]for x,y in LineString(raw['roads'][route[0]]).simplify(.00006).coords]
p=R/'kuniezu/static/kuniezu/modern-road-reference.js';s=p.read_text();marker='TK.MODERN_ROAD_REFERENCE=';a=s.index(marker)+len(marker);b=s.index(';',a);roads=json.loads(s[a:b]);roads[route[0]]=pts;p.write_text(s[:a]+json.dumps(roads,ensure_ascii=False,separators=(',',':'))+s[b:])
p=R/'kuniezu/static/kuniezu/road-evidence-update.js';s=p.read_text();marker='\n/* sanshu-reference.py generated correction */';s=s.split(marker)[0]
source={'author':'塩尻市','title':'街道を学ぶ 三州街道','url':'https://www.city.shiojiri.lg.jp/soshiki/35/3943.html','locator':'三州街道（伊那街道）本文','accessed':'2026-11-01','scope':'塩尻・善知鳥峠・小野・辰野・伊那谷・駒場・根羽・岡崎の経由関係。全線の1560年の中心線は確定しない。'}
source2={'author':'豊田市','title':'重要伝統的建造物群保存地区 足助・歴史','url':'https://hakubutsukan.city.toyota.aichi.jp/bunka/12_asuke/rekisi.html','locator':'明治中期および1930年の付替え','accessed':'2026-11-01','scope':'近現代の飯田街道と旧道の違い。現代国道153号を戦国期へ無条件に遡らせない。'}
s+=marker+'\n(function(){\nTK.RESEARCH_SOURCES.sanshuShiojiri='+json.dumps(source,ensure_ascii=False)+';\nTK.RESEARCH_SOURCES.sanshuAsuke='+json.dumps(source2,ensure_ascii=False)+';\nconst r=TK.ROADS.find(r=>r[0]==="三州街道");if(r)r[1]='+json.dumps(route[1])+';\ndelete TK.ROADFIX["三州街道"];\nTK.ROAD_EVIDENCE["三州街道"]='+json.dumps({'geometry':'modern-reference','sources':['sanshuShiojiri','sanshuAsuke','modernRoadReference'],'level':'unverified','status':'高遠方面の経由設定を除去し、善知鳥峠・辰野・伊那谷を経由。細部は近現代道路参考。','precision':'概略経由地の訂正。戦国期の道路中心線の確定ではない。'},ensure_ascii=False)+';\n})();\n';p.write_text(s)
(R/'data/audits/sanshu-route-review.json').write_text(json.dumps({'sourceIds':['sanshuShiojiri','sanshuAsuke'],'audit':raw['audit'],'displayVertices':len(pts),'anchors':route[1],'scope':'高遠への不適切な経由設定の訂正。新線は近現代比較であり全線史実確定ではない。'},ensure_ascii=False,indent=2))
print('updated',len(pts),'points')
