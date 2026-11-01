import pathlib,sys,json
root=pathlib.Path(__file__).resolve().parents[2];sys.path.insert(0,str(root/'tools/geo'))
from road_reference_review import review_candidate,review_anchors
line=[[136,35],[136.01,35],[136.02,35]]
assert not review_anchors(line)['issues']
misplaced=json.loads((root/'data/inputs/hokurikudo-review/kinome-foot-candidate.json').read_text())['rejected']['北陸道木ノ芽区間比較']['requestedPoints']
assert review_anchors(misplaced)['issues']==['anchor-detour-over-4x-endpoint-distance'], 'real distant control must be rejected before network routing'
assert not review_candidate(line,[line[0],line[-1]],[{'distance':10}],1825)['issues']
assert 'waypoint-snap-over-250m' in review_candidate(line,[line[0],line[-1]],[{'distance':600}],1825)['issues']
loop=[[136,35],[136.02,35],[136.02,35.02],[136,35],[136.03,35]]
r=review_candidate(loop,[loop[0],loop[-1]],[],10000);assert 'closed-excursion-over-2km' in r['issues'];assert r['largestClosedExcursion']['first']==0
candidate=json.loads((root/'data/inputs/hokkokukaido-review/modern-diagnostics.json').read_text())['rejected']['北国街道（近江）'];r=review_candidate(candidate['points'],candidate['requestedPoints'],candidate['snappedPoints'],candidate['distanceMeters']);assert set(r['issues'])=={'waypoint-snap-over-250m','route-over-3x-waypoint-distance','closed-excursion-over-2km'}
(root/'data/audits/road-reference-input-review.json').write_text(json.dumps(r,ensure_ascii=False,indent=2));print('PASS: direct road retained; distant snaps and large return loops require review; rejected real candidate retained')
