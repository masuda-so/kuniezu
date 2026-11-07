"""三州街道の審査済み比較線だけを再生成。他街道・史実の日程は変更しない。"""
import argparse
import gzip
import hashlib
import json
import pathlib
import tarfile
from generated_js_block import replace_generated_block
from road_geometry_network import reference_route
from road_reference_review import distance, review_candidate

ROOT = pathlib.Path(__file__).resolve().parents[2]
INPUT = ROOT / 'data/inputs/sanshu-road-review'
NAME = '三州街道'
SOURCE_IDS = ['sanshuShiojiri', 'sanshuCodhPosts', 'sanshuModernMountain', 'sanshuModernFoot']
MARKER = '/* sanshu-reference.py generated correction */'
END = '/* end sanshu-reference.py generated correction */'


def canonical(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'))


def simplify(points, tolerance=3):
    """RDP、距離はm。端点を保持し、接続していない区間を生成しない。"""
    import math
    keep = {0, len(points)-1}
    pending = [(0, len(points)-1)]
    while pending:
        a, b = pending.pop()
        scale = math.cos(math.radians((points[a][1]+points[b][1])/2))
        A = [points[a][0]*scale*111320, points[a][1]*111320]
        B = [points[b][0]*scale*111320, points[b][1]*111320]
        dx, dy = B[0]-A[0], B[1]-A[1]
        length = dx*dx+dy*dy
        best, at = 0, None
        for i in range(a+1, b):
            px, py = points[i][0]*scale*111320-A[0], points[i][1]*111320-A[1]
            f = max(0, min(1, (px*dx+py*dy)/length)) if length else 0
            error = math.hypot(px-f*dx, py-f*dy)
            if error > best:
                best, at = error, i
        if best > tolerance:
            keep.add(at)
            pending.extend([(a, at), (at, b)])
    return [[round(v, 6) for v in points[i]] for i in sorted(keep)]



def point_line_distance(point, line):
    import math
    scale = math.cos(math.radians(point[1]))
    best = float('inf')
    for a, b in zip(line, line[1:]):
        ax, ay = (a[0]-point[0])*scale*111320, (a[1]-point[1])*111320
        dx, dy = (b[0]-a[0])*scale*111320, (b[1]-a[1])*111320
        length = dx*dx+dy*dy
        f = max(0, min(1, -(ax*dx+ay*dy)/length)) if length else 0
        best = min(best, math.hypot(ax+f*dx, ay+f*dy))
    return best


def join(a, b, control):
    aa = [i for i, p in enumerate(a) if distance(p, control) < 500]
    bb = [i for i, p in enumerate(b) if distance(p, control) < 500]
    gap, i, j = min((distance(a[i], b[j]), i, j) for i in aa for j in bb)
    if gap >= 10:
        raise ValueError('同じ道路の比較線の接続誤差が10m以上')
    return a[:i+1]+b[j:], gap


def build():
    controls = json.loads((INPUT/'controls.json').read_text())['places']
    points = [r['point'] for r in controls]
    raw = json.loads(gzip.decompress((INPUT/'osrm-foot.json.gz').read_bytes()))
    foot = raw['rejected'][NAME]
    if foot['requestedPoints'] != points:
        raise ValueError('代表点と取得時の照会点が一致しない')
    lines = []
    with tarfile.open(INPUT/'gsi-road-tiles.tar.gz') as archive:
        manifest = json.loads(archive.extractfile('manifest.json').read())
        for row in manifest['tiles']:
            if 'error' in row:
                if row['error'] != 'HTTP Error 404: Not Found':
                    raise ValueError(row['error'])
                continue
            data = archive.extractfile(row['file']).read()
            if hashlib.sha256(data).hexdigest() != row['sha256']:
                raise ValueError('地理院入力のSHA不一致: '+row['file'])
            for feature in json.loads(data)['features']:
                if feature['properties'].get('motorway') == 1:
                    continue
                g = feature['geometry']
                if g['type'] == 'LineString':
                    lines.append(g['coordinates'])
                elif g['type'] == 'MultiLineString':
                    lines.extend(g['coordinates'])
    # 浪合〜稲武は、過大迂回を含むOSRMの辺を使わず、取得した物理形状を接続する。
    mountain = reference_route(lines, points[12:16])
    indices, previous = [], 0
    for row in foot['snappedPoints']:
        at = next(i for i in range(previous, len(foot['points']))
                  if distance(foot['points'][i], row['location']) < .5)
        indices.append(at)
        previous = at
    merged, gap1 = join(foot['points'][:indices[12]+1], mountain['points'], points[12])
    merged, gap2 = join(merged, foot['points'][indices[15]:], points[15])
    result = simplify(merged)
    metres = sum(distance(a, b) for a, b in zip(result, result[1:]))
    snaps = [{'distance': point_line_distance(p, result)} for p in points]
    review = review_candidate(result, points, snaps, metres)
    if review['issues']:
        raise ValueError('比較線の審査不合格: '+','.join(review['issues']))
    if max(row['distance'] for row in snaps) >= 60:
        raise ValueError('地名代表点から60m以上離れた経路')
    return result, {'review': review, 'joinMetres': [gap1, gap2],
                    'mountainMetres': mountain['distanceMeters'],
                    'scope': '現代の道路比較。戦国期中心線や到着日を確定しない。'}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--candidate', action='store_true')
    parser.add_argument('--input', type=pathlib.Path, default=INPUT/'adoption.json')
    args = parser.parse_args()
    adoption = json.loads(args.input.read_text()) if args.input.exists() else {}
    if not args.candidate and adoption.get('accepted') is not True:
        raise ValueError('Unreviewed or rejected route must not be applied')
    points, audit = build()
    digest = hashlib.sha256(canonical(points).encode()).hexdigest()
    if args.candidate:
        print(json.dumps({'pointSha256': digest, 'vertices': len(points), **audit}, ensure_ascii=False))
        return
    for file, sha in adoption['inputs'].items():
        if hashlib.sha256((INPUT/file).read_bytes()).hexdigest() != sha:
            raise ValueError('採用時の入力SHAと不一致: '+file)
    if digest != adoption['pointSha256']:
        raise ValueError('採用時の線形SHAと不一致')
    target = ROOT/'kuniezu/static/kuniezu/modern-road-reference.js'
    text = target.read_text()
    start = text.index('TK.MODERN_ROAD_REFERENCE=')+len('TK.MODERN_ROAD_REFERENCE=')
    end = text.index(';', start)
    roads = json.loads(text[start:end])
    if args.check:
        if roads[NAME] != points:
            raise ValueError('配信する比較線の再生成不一致')
        print('PASS: reviewed Sanshu comparison reproducible', digest)
        return
    roads[NAME] = points
    road_text = text[:start]+canonical(roads)+text[end:]
    record = {'status': 'accepted-modern-comparison', 'name': NAME, 'points': points,
              'scope': audit['scope'], 'sources': SOURCE_IDS, 'pointSha256': digest}
    source = ROOT/'kuniezu/static/kuniezu/road-evidence-update.js'
    text = source.read_text()
    block = '(function(){\n'
    for id in SOURCE_IDS:
        meta = json.loads((ROOT/'data/research/curated/sources'/f'{id}.json').read_text())
        del meta['id']
        block += 'TK.RESEARCH_SOURCES['+json.dumps(id)+']='+canonical(meta)+';\n'
    controls = json.loads((INPUT/'controls.json').read_text())['places']
    block += 'const r=TK.ROADS.find(r=>r[0]==="三州街道");if(r)r[1]='+canonical([r['point'] for r in controls])+';\n'
    block += 'delete TK.ROADFIX["三州街道"];\n'
    evidence = {'geometry': 'modern-reference', 'level': 'unverified', 'sources': SOURCE_IDS,
                'status': '塩尻から伊那谷・駒場・根羽・足助を経て岡崎へ至る道。表示線は現代道路の比較で、山間部には近代の隧道も含む。'}
    block += 'TK.ROAD_EVIDENCE["三州街道"]='+canonical(evidence)+';\n})();\n'
    # 入力・出典・置換境界を検証し終えてから、配信用データを書き出す。
    source_text = replace_generated_block(text, MARKER, END, block)
    target.write_text(road_text)
    (INPUT/'accepted-whole-reference.json').write_text(json.dumps(record, ensure_ascii=False, indent=2)+'\n')
    source.write_text(source_text)
    (ROOT/'data/audits/sanshu-route-review.json').write_text(json.dumps(
        {**audit, 'pointSha256': digest, 'displayVertices': len(points),
         'sourceIds': SOURCE_IDS, 'controls': controls}, ensure_ascii=False, indent=2)+'\n')
    print('updated reviewed Sanshu comparison', len(points), digest)


if __name__ == '__main__':
    main()
