"""Select named OSM rivers without converting modern channels into historic evidence.

Usage: python select-reference-rivers.py FOLDER OUTPUT --names 天竜川 大井川
The output retains OSM ids and dataset date; no regional display policy is implied.
"""
import argparse, hashlib, json, pathlib, datetime
import shapefile
from shapely.geometry import LineString

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('folder', type=pathlib.Path)
parser.add_argument('output', type=pathlib.Path)
parser.add_argument('--names', nargs='+', required=True)
parser.add_argument('--date', default='2026-10-31')
parser.add_argument('--source-url', required=True)
parser.add_argument('--download-url', required=True)
parser.add_argument('--bounds', nargs=4, type=float, required=True, metavar=('WEST','SOUTH','EAST','NORTH'))
args = parser.parse_args()
source = args.folder / 'gis_osm_waterways_free_1.shp'
reader = shapefile.Reader(str(source))
rows, seen = [], set()
for item in reader.iterShapeRecords():
    record = item.record.as_dict()
    if record['fclass'] != 'river':
        continue
    tokens = set(record['name'].replace(';', ' ').split())
    names = [name for name in args.names if name in tokens]
    west, south, east, north = args.bounds
    x0, y0, x1, y1 = item.shape.bbox
    if x1 < west or x0 > east or y1 < south or y0 > north:
        continue
    if not names or record['osm_id'] in seen:
        continue
    seen.add(record['osm_id'])
    parts = list(item.shape.parts) + [len(item.shape.points)]
    for part, (start, end) in enumerate(zip(parts, parts[1:])):
        original = LineString(item.shape.points[start:end])
        points = [[round(x, 6), round(y, 6)] for x, y in original.simplify(.0001).coords]
        if len(points) < 2:
            continue
        rows.append({'id': record['osm_id'], 'part': part, 'name': names[0],
                     'sourceName': record['name'], 'bounds': list(original.bounds),
                     'points': points})
counts = {name: sum(row['name'] == name for row in rows) for name in args.names}
if any(count == 0 for count in counts.values()):
    raise SystemExit('Missing requested river: ' + repr(counts))
result = {'basis': 'modern-reference', 'datasetDate': args.date,
          'source': args.source_url, 'downloadUrl': args.download_url,
          'retrievedAt': datetime.date.today().isoformat(),
          'sourceFileHashes': {p.name: hashlib.sha256(p.read_bytes()).hexdigest()
                               for p in sorted(args.folder.glob('gis_osm_waterways_free_1.*'))},
          'attribution': '© OpenStreetMap contributors / ODbL 1.0',
          'license': 'https://opendatacommons.org/licenses/odbl/1-0/',
          'selectionBounds': args.bounds,
          'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
          'simplificationDegrees': .0001, 'counts': counts,
          'limits': '現代の河川中心線。戦国期の河道や川幅を確定する資料ではない。',
          'rivers': rows}
args.output.parent.mkdir(parents=True, exist_ok=True)
args.output.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')) + '\n')
print(json.dumps({'counts': counts, 'vertices': sum(len(row['points']) for row in rows)}, ensure_ascii=False))
