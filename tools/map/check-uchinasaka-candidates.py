"""Evaluate 1885 comparison shapes on the recorded 100 m game grid."""
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'data/research/katori-review/uchinasaka'


def read(path):
    return json.loads((DATA / path).read_text())


def contains(ring, x, y):
    inside = False
    for (ax, ay), (bx, by) in zip(ring, ring[1:]):
        if (ay > y) != (by > y) and x < ax + (y - ay) * (bx - ax) / (by - ay):
            inside = not inside
    return inside


def main():
    samples = read('current-control-pixels.json')
    p = samples['projection']
    ox, oy = p['origin']
    step = p['stepUnits']

    def grid(lon, lat):
        return ((lon - p['LON0']) * p['K'] * p['CX'] - ox) / step, ((p['LAT0'] - lat) * p['K'] - oy) / step

    def cells(feature):
        exterior, *holes = [[grid(*point) for point in ring] for ring in feature['geometry']['coordinates']]
        xs, ys = zip(*exterior)
        return {(x, y) for y in range(math.floor(min(ys)), math.ceil(max(ys)))
                for x in range(math.floor(min(xs)), math.ceil(max(xs)))
                if contains(exterior, x + .5, y + .5)
                and not any(contains(hole, x + .5, y + .5) for hole in holes)}

    shapes = read('shape-candidates/uchinasaka-shape-candidates.geojson')['features']
    masks = {f['properties']['id']: cells(f) for f in shapes}
    inner = masks['uchinasaka-inner-lake']
    mouth = masks['uchinasaka-mouth-channel']
    land = masks['uchinasaka-southeast-tongue']
    outer = cells(read('outer-water-reference.geojson'))
    south = cells(read('outer-south-water-reference.geojson'))
    water = (inner | mouth | outer | south) - land
    controls = {row['control']: tuple(row['pixel']) for row in samples['rows']}
    stack = [controls['lake-core-west']]
    reached = set()
    while stack:
        x, y = point = stack.pop()
        if point in reached or point not in water:
            continue
        reached.add(point)
        stack.extend([(x-1, y), (x+1, y), (x, y-1), (x, y+1)])
    result = {
        'scope': '1885 comparison only; not a historical shoreline or approved map edit',
        'sourceManifestSha256': samples['sourceManifestSha256'],
        'cellsByShape': {name: len(mask) for name, mask in masks.items()},
        'waterCellsBeforeLandProtection': len(inner | mouth | outer | south),
        'landConflictCells': len((inner | mouth | outer | south) & land),
        'waterCellsAfterLandProtection': len(water),
        'connectedWaterCellsFromInnerCore': len(reached),
        'southReferenceCells': len(south),
        'southReferenceConnectedCells': len(south & reached),
        'outerReferenceCells': len(outer),
        'outerReferenceConnectedCells': len(outer & reached),
        'currentKitauraSampleReached': tuple(read('current-outer-water-gap.json')['nearestWater']['lake:140.55,36.05']['pixel']) in reached,
        'controls': {name: {'waterCandidate': pt in water, 'connectedToInnerCore': pt in reached}
                     for name, pt in controls.items()},
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
