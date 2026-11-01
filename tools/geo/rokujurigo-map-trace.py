"""Extract only the explicitly coloured old-road lines; no geographic fit or gap filling."""
import hashlib
import heapq
import json
import math
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path('data/inputs/rokujurigo-review')
SHEETS = [
    ('shonai', (500, 325, 780, 680), (540, 344), (779, 642)),
    ('inland', (0, 600, 400, 810), (0, 643), (378, 797)),
]


def trace(mask, start, end):
    ys, xs = np.nonzero(mask)
    points = set(zip(xs.tolist(), ys.tolist()))
    a = min(points, key=lambda p: math.dist(p, start))
    b = min(points, key=lambda p: math.dist(p, end))
    q = [(0, a)]
    costs = {a: 0}
    prev = {}
    while q:
        cost, p = heapq.heappop(q)
        if cost != costs[p]:
            continue
        if p == b:
            break
        for dx, dy in [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]:
            n = (p[0] + dx, p[1] + dy)
            if n not in points:
                continue
            v = cost + math.hypot(dx, dy)
            if v < costs.get(n, float('inf')):
                costs[n] = v
                prev[n] = p
                heapq.heappush(q, (v, n))
    if b not in costs:
        raise RuntimeError('Old-road colour is disconnected; do not invent a connecting segment')
    path = [b]
    while path[-1] != a:
        path.append(prev[path[-1]])
    return path[::-1]


rows = []
for name, bounds, start, end in SHEETS:
    source = ROOT / f'sakata-{name}-map.jpg'
    im = Image.open(source).convert('RGB')
    rgb = np.asarray(im).astype(float)
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    mask = ((b > 55) & (b > r * 1.5) & (b > g * 1.3)).astype('uint8')
    roi = np.zeros_like(mask)
    x0, y0, x1, y1 = bounds
    roi[y0:y1, x0:x1] = 1
    mask *= roi
    # JPEG breaks of at most one pixel; never interpolate through text/photos.
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    count, labels, stats, _ = cv2.connectedComponentsWithStats(mask)
    runs = []
    for label in range(1, count):
        if stats[label, cv2.CC_STAT_AREA] < 12:
            continue
        yy, xx = np.nonzero(labels == label)
        pts = np.column_stack((xx, yy))
        distances = ((pts[:, None, :] - pts[None, :, :]) ** 2).sum(axis=2)
        i, j = np.unravel_index(distances.argmax(), distances.shape)
        a, b = pts[i].tolist(), pts[j].tolist()
        if math.dist(a, start) > math.dist(b, start):
            a, b = b, a
        path = trace((labels == label).astype('uint8'), a, b)
        runs.append(path)
    runs.sort(key=lambda p: math.dist(p[0], start))
    overlay = im.copy()
    for path in runs:
        ImageDraw.Draw(overlay).line(path, fill=(240, 30, 150), width=2)
    overlay.save(ROOT / f'{name}-old-road-trace.png')
    rows.append({'sheet': name, 'source': source.name,
                 'sourceUrl': f'https://www.thr.mlit.go.jp/sakata/road/60history/img/{"011" if name == "shonai" else "010"}.jpg',
                 'sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
                 'runs': runs, 'points': sum(map(len, runs)),
                 'unjoinedGapsPixels': [math.dist(a[-1], b[0]) for a, b in zip(runs, runs[1:])]})

(ROOT / 'old-road-pixel-traces.json').write_text(json.dumps({
    'scope': '国土交通省酒田河川国道事務所の青い旧道線の画素抽出。位置合わせ前の候補。緑・橙の国道、非着色区間、写真等で隠れた区間は含めない。地理座標や戦国期中心線ではない。',
    'method': 'blue colour mask, 3px closing, shortest connected 8-neighbour pixel path; no geographic interpolation',
    'sheets': rows}, ensure_ascii=False, indent=2))
print([(r['sheet'], r['points']) for r in rows])
