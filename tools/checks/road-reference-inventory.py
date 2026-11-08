"""Audit archived pre-cleanup comparison inputs; never rebuild the canonical GeoJSON."""
import json,pathlib,subprocess,sys
root=pathlib.Path(__file__).resolve().parents[2];sys.path.insert(0,str(root/'tools/geo'))
from road_reference_review import review_candidate,distance
script="const {legacyRoads}=require('./tools/checks/fixtures/road-inputs.cjs');console.log(JSON.stringify(Object.entries(legacyRoads()).map(([name,points])=>({name,points}))))"
roads=json.loads(subprocess.check_output(['node','-e',script],cwd=root));seeds=dict(json.loads((root/'data/inputs/road-reference-seeds.json').read_text()));metadata={r['name']:r for r in json.loads((root/'data/audits/modern-road-reference-audit.json').read_text())['audit']};rows=[]
for r in roads:
 pts=r['points'];known=metadata.get(r['name'],{}).get('maxSnapMeters');review=review_candidate(pts,seeds.get(r['name'],[]),[{'distance':known}]if known is not None else [],sum(distance(a,b)for a,b in zip(pts,pts[1:])));rows.append({'name':r['name'],'inputPoints':len(pts),'snapEvidenceAvailable':known is not None,'review':review})
counts={}
for r in rows:
 for issue in r['review']['issues']:counts[issue]=counts.get(issue,0)+1
report={'scope':'移行時に保持したina/maritime適用後・旧cleanup前の比較入力の点検。現在の編集GeoJSONや配信形状の診断とは別。出力から正本を再生成・自動採用しない。','roads':len(rows),'issues':counts,'rows':rows};(root/'data/audits/road-reference-inventory.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print({'roads':len(rows),'issues':counts})
