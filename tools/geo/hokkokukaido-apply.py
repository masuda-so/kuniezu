"""Apply reviewed modern geometry to the northern comparison section; preserve southern input and endpoints."""
import pathlib,json,hashlib
from road_reference_review import distance,review_candidate
root=pathlib.Path(__file__).resolve().parents[2];src=root/'data/inputs/hokkokukaido-review';candidate=json.loads((src/'gsi-network-candidate.json').read_text());assert not candidate['review']['issues']
p=root/'kuniezu/static/kuniezu/modern-road-reference.js';text=p.read_text();marker='TK.MODERN_ROAD_REFERENCE=';a=text.index(marker)+len(marker);b=text.index(';',a);roads=json.loads(text[a:b]);old=roads['北国街道（近江）'];i=min(range(len(old)),key=lambda i:distance(old[i],candidate['points'][0]));assert i==176
assert distance(old[i],candidate['points'][0])<50 and distance(old[-1],candidate['points'][-1])<50
points=old[:i+1]+candidate['points'][1:]+[old[-1]];roads['北国街道（近江）']=points
p.write_text(text[:a]+json.dumps(roads,ensure_ascii=False,separators=(',',':'))+text[b:])
record={'name':'北国街道（近江）','status':'accepted-modern-comparison','points':points,'sources':['gsiExperimentalRoads','hokkokuNagahamaGuide'],'scope':'南部は既存OSM参考線を保持。木之本付近以北はGSI現代中心線。旧道の経由関係と区別し、16世紀中心線の確定とはしない。','splice':{'originalPrefixLastIndex':i,'startGapMetres':distance(old[i],candidate['points'][0]),'endGapMetres':distance(old[-1],candidate['points'][-1])},'candidateReview':candidate['review']};(src/'accepted-whole-reference.json').write_text(json.dumps(record,ensure_ascii=False,indent=2))
source={'id':'gsiExperimentalRoads','author':'国土地理院','title':'道路中心線ベクトルタイル提供実験','url':'https://github.com/gsi-cyberjapan/experimental_rdcl','year':'2015年提供開始・タイルの地物更新日は個別属性による','locator':'GeoJSON z16、北国街道北部の取得範囲・manifest参照','scope':'現代の道路形状。現在の通行規制とは別に扱う比較線。16世紀の存在・路幅・当日進路を確定しない。','accessed':'2026-11-01'}
q=root/'data/research/curated/sources/gsiExperimentalRoads.json';q.write_text(json.dumps(source,ensure_ascii=False,indent=2))
p=root/'kuniezu/static/kuniezu/road-evidence-update.js';s=p.read_text();tag='\n/* hokkokukaido-apply.py: comparison geometry */';s=s.split(tag)[0];s+=tag+'\n(function(){\n'
for id in record['sources']:
 meta=json.loads((root/'data/research/curated/sources'/f'{id}.json').read_text());meta.pop('id');s+='TK.RESEARCH_SOURCES['+json.dumps(id)+']='+json.dumps(meta,ensure_ascii=False)+';\n'
s+='TK.ROAD_EVIDENCE["北国街道（近江）"]='+json.dumps({'geometry':'modern-reference','level':'unverified','sources':record['sources']+['modernRoadReference'],'status':record['scope']},ensure_ascii=False)+';\n})();\n';p.write_text(s)
print('applied',len(points),'reference points; northern geometry',candidate['distanceMeters'],'metres; joins',record['splice'])
