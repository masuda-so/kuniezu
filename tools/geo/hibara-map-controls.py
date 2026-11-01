"""Compare held-out landmark positions without re-fitting the map."""
import pathlib,json,math,numpy as np
root=pathlib.Path('data/inputs/hibara-map-review');r=json.loads((root/'registration-candidate.json').read_text());controls=json.loads((root/'independent-controls.json').read_text());rows=[]
for c in controls['controls']:
 assert not c['usedForFit'];lon,lat=c['point'];xy=np.array([(lon-140.05)*111320*math.cos(math.radians(37.72)),(37.72-lat)*111320]);pixel=xy@np.array(r['rotation'])*r['pixelScalePerMetre']+r['translation'];d=float(np.linalg.norm(pixel-c['pixel']));rows.append({**c,'predictedPixel':pixel.tolist(),'residualPixels':d,'residualMetres':d/r['pixelScalePerMetre'],'withinSymbolWidth':d<c['symbolWidthPixels']})
(root/'independent-control-review.json').write_text(json.dumps({'scope':controls['scope'],'rows':rows},ensure_ascii=False,indent=2));assert all(r['withinSymbolWidth']for r in rows);print('Held-out landmark:',[(r['name'],round(r['residualMetres'],1))for r in rows])
