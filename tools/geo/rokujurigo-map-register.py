"""Provisional map registration; never writes game data."""
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

root = Path('data/inputs/rokujurigo-review')
search = json.loads((root / 'gsi-controls-search.json').read_text())
coordinates = {}
for row in search:
    for f in row['result']:
        p = f['geometry']['coordinates']
        if f['properties']['title'] == row['query'] and 139 < p[0] < 141:
            coordinates[row['query']] = p

# The centres of station symbols on the source, not municipality name labels.
controls = {'天童駅': [554, 859], '寒河江駅': [380, 815],
            '村山駅': [582, 594], '東根駅': [575, 652]}


def local(p):
    lon, lat = p
    return [(lon - 140.3) * 111320 * math.cos(math.radians(38.4)),
            (38.4 - lat) * 111320, 1]


a = np.array([local(coordinates[n]) for n in controls])
b = np.array(list(controls.values()))
matrix = np.linalg.lstsq(a, b, rcond=None)[0]
residuals = np.linalg.norm(a @ matrix - b, axis=1)
im = Image.open(root / 'sakata-inland-map.jpg').convert('RGB')
d = ImageDraw.Draw(im)
rows = []
for (name, pixel), residual in zip(controls.items(), residuals):
    x, y = pixel
    d.ellipse((x-5, y-5, x+5, y+5), outline='red', width=1)
    rows.append({'name': name, 'point': coordinates[name], 'pixel': pixel,
                 'selectionUncertaintyPixels': 5, 'fitResidualPixels': float(residual)})
im.save(root / 'inland-control-review.png')
traces = json.loads((root / 'old-road-pixel-traces.json').read_text())
inland = next(s for s in traces['sheets'] if s['sheet'] == 'inland')
inverse = np.linalg.inv(matrix[:2])
runs = []
for run in inland['runs']:
    xy = (np.array(run) - matrix[2]) @ inverse
    runs.append([[float(x / (111320 * math.cos(math.radians(38.4))) + 140.3),
                  float(38.4 - y / 111320)] for x, y in xy])
independent_search = json.loads((root / 'gsi-independent-search.json').read_text())
independent = []
for row in independent_search:
    if row['query'] != '羽前長崎駅':
        continue
    exact = [f for f in row['result'] if f['properties']['title'] == row['query']]
    assert len(exact) == 1
    point = exact[0]['geometry']['coordinates']
    # Station and label on the source, separately read from the four fit points.
    pixel = [352, 904]
    predicted = np.array(local(point)) @ matrix
    delta = predicted - pixel
    residual = float(np.linalg.norm(delta))
    metres = float(np.linalg.norm(delta @ inverse))
    independent.append({'name': row['query'], 'point': point, 'sourcePixel': pixel,
                        'searchUrl': row['url'], 'usedForFit': False,
                        'predictedPixel': predicted.tolist(),
                        'residualPixels': residual, 'approximateResidualMetres': metres,
                        'readTolerancePixels': 8, 'accepted': residual <= 8})
    d.ellipse((pixel[0]-8, pixel[1]-8, pixel[0]+8, pixel[1]+8), outline='blue', width=1)
    d.ellipse((predicted[0]-5, predicted[1]-5, predicted[0]+5, predicted[1]+5), outline='red', width=1)
im.save(root / 'inland-control-review.png')
accepted = bool(independent) and all(c['accepted'] for c in independent)
(root / 'registration-candidate.json').write_text(json.dumps({
    'status': 'candidate-not-adopted' if accepted else 'rejected-independent-control',
    'scope': '内陸図の駅記号4点でアフィン近似。残差は当てはめの整合性であり独立精度ではない。旧駅位置の変更と独立基準点を照合するまでゲームへ反映しない。庄内図との接合も未適用。',
    'origin': [140.3, 38.4], 'matrixLocalMetresToPixels': matrix.tolist(),
    'controls': rows, 'rmsPixels': float(np.sqrt(np.mean(residuals ** 2))),
    'independentValidation': accepted, 'independentControls': independent,
    'inlandCandidateRuns': runs,
}, ensure_ascii=False, indent=2))
print('Candidate fit RMS pixels:', float(np.sqrt(np.mean(residuals ** 2))))
print('Independent control:', [(c['name'], round(c['residualPixels'], 2), c['accepted']) for c in independent])
