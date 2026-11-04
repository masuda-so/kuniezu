"""Reproducible relational/time-space read model; curated JSON remains the editing source."""
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import sqlite3
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[2]

def text(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'))

def build(research, output):
    manifest = json.loads((research / 'manifest.json').read_text())
    hashes = {r['file']: r['sha256'] for r in manifest['files']}
    def read(name):
        content = (research / name).read_bytes()
        if hashlib.sha256(content).hexdigest() != hashes[name]:
            raise ValueError('manifest SHA mismatch: ' + name)
        return [json.loads(line) for line in content.splitlines() if line]
    sources, people, places, claims, locations = [read(n + '.jsonl') for n in
        ['sources', 'people', 'places', 'claims', 'location-observations']]
    # Reuse the reviewed-input validators; manifest hashes alone cannot validate content.
    validation = r"""const fs=require('fs'),os=require('os'),path=require('path'),root=process.argv[1],data=JSON.parse(fs.readFileSync(0));
const sources=Object.fromEntries(data.sources.map(s=>{const {id,sourceType,recordType,verifiedScope,retained,...meta}=s;return [id,meta];}));
require(path.join(root,'tools/research/location-store.cjs')).validateLocations({...data,sources});
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'kuniezu-sql-input-'));try{for(const [i,r] of data.claims.entries())fs.writeFileSync(path.join(temp,i+'.json'),JSON.stringify(r));require(path.join(root,'tools/research/evidence-store.cjs')).loadEvidence({claimDir:temp,sourceDir:path.join(temp,'none'),baseSources:sources});}finally{fs.rmSync(temp,{recursive:true,force:true});}"""
    subprocess.run(['node', '-e', validation, str(ROOT)], input=text(dict(sources=sources,people=people,places=places,claims=claims,locations=locations)), text=True, check=True)
    if output.exists():
        raise ValueError('既存DBは上書きしない: ' + str(output))
    output.parent.mkdir(parents=True, exist_ok=True)
    handle, temporary = tempfile.mkstemp(prefix=output.name + '.', dir=output.parent)
    os.close(handle)
    try:
        db = sqlite3.connect(temporary)
        try:
            db.executescript((ROOT / 'tools/research/sql/history.sql').read_text())
            db.execute('INSERT INTO metadata VALUES (?,?)', ('input_hashes', text(hashes)))
            db.execute('INSERT INTO metadata VALUES (?,?)', ('editing_source', 'curated JSON; regenerate JSONL and SQLite after review'))
            aliases = {}
            for p in people + places:
                db.execute('INSERT INTO entity VALUES (?,?,?,1)', (p['id'], p['id'].split(':')[0], p['name']))
                names = {p['id'], p['name'], p['id'].split(':')[0] + ':' + p['name'], *p.get('gameNames', []), *p.get('aliases', [])}
                if p['id'].startswith('person:'):
                    names.update('person:' + name for name in p.get('gameNames', []))
                for name in names:
                    aliases.setdefault(name, set()).add(p['id'])
                    db.execute('INSERT INTO alias VALUES (?,?)', (name, p['id']))
                for authority in p.get('authorityIds', []):
                    db.execute('INSERT INTO authority VALUES (?,?)', (authority, p['id']))
            for p in places:
                coords = p['geometry']['coordinates'] if p['geometryStatus'] == 'site-representative' else [None, None]
                db.execute('INSERT INTO place VALUES (?,?,?,?,?)', (p['id'], *coords, p['geometryStatus'], text(p.get('geometryEvidence', {}))))
            for s in sources:
                db.execute('INSERT INTO source VALUES (?,?,?,?)', (s['id'], s['url'], s.get('title'), text(s)))
            def canonical(entity):
                matches = aliases.get(entity, set())
                return next(iter(matches)) if len(matches) == 1 else entity
            for kind, rows in [('claim', claims), ('location', locations)]:
                for r in rows:
                    if r['status'] != 'verified-in-specified-scope' or r.get('runId') or r.get('estimated'):
                        raise ValueError('unreviewed record: ' + r['id'])
                    if kind == 'claim':
                        first, last = r['validYears']; until = last + 1
                        entities = [r['entity'], *r.get('linkedEntities', [])]
                        event = r.get('eventTime')
                        scope = 'described-period-candidate' if event and event.get('boundsAreHistoricalStartEnd') is False else 'claim-applicability'
                        record_id = 'claim:' + r['id']
                        relation = r.get('eventRelation', r['predicate'])
                    else:
                        event = r['time']; first = event.get('from', event.get('year', event.get('date', [None])[0]))
                        until = event.get('untilExclusive', first + 1)
                        entities = [r['person'], r['place']]
                        scope = 'attested-interval' if event['kind'] == 'year-interval' else 'recorded-change'
                        record_id = r['id']; relation = r['relation']
                    if not isinstance(first, int) or not isinstance(until, int):
                        raise ValueError('invalid interval')
                    cursor = db.execute('INSERT INTO record(record_id,kind,source_id,from_year,until_exclusive,scope,relation,event_time_json,payload_json) VALUES (?,?,?,?,?,?,?,?,?)',
                        (record_id, kind, r['source'], first, until, scope, relation, text(event) if event else None, text(r)))
                    row_id = cursor.lastrowid
                    if event:
                        # Extract only the fields validated for this temporal kind.
                        time_kind = event['kind']
                        components = event['components'] if time_kind == 'dated-components' else [event]
                        for i, component in enumerate(components):
                            date = (event['date'] if time_kind == 'dated-event' else
                                    [component['year'], None, None] if time_kind in ('year-window', 'dated-components') else
                                    [None, None, None])
                            leap_month = event['leapMonth'] if time_kind == 'dated-event' else None
                            date_entities = component['entities'] if time_kind == 'dated-components' else entities
                            db.execute('INSERT INTO event_date VALUES (?,?,?,?,?,?,?,?,?)',
                                (row_id, i, event['calendar'], event['precision'], *date, leap_month,
                                 text(sorted({canonical(e) for e in date_entities}))))
                    for entity in sorted({canonical(e) for e in entities}):
                        # Unregistered referenced IDs stay explicit, not invented historical identities.
                        db.execute('INSERT OR IGNORE INTO entity VALUES (?,?,?,0)', (entity, entity.split(':')[0], entity))
                        db.execute('INSERT INTO record_entity VALUES (?,?)', (row_id, entity))
                        for name in [entity, entity.split(':', 1)[-1]]:
                            db.execute('INSERT OR IGNORE INTO alias VALUES (?,?)', (name, entity))
                        point = db.execute('SELECT longitude,latitude FROM place WHERE entity_id=? AND longitude IS NOT NULL', (entity,)).fetchone()
                        if point:
                            ref = db.execute('INSERT INTO spatial_reference(record_id,place_id) VALUES (?,?)', (row_id, entity)).lastrowid
                            lon, lat = point
                            db.execute('INSERT INTO spacetime VALUES (?,?,?,?,?,?,?)', (ref, lon, lon, lat, lat, first, until))
            map_root = research.parent.parent / 'game'
            definition = map_root / 'map/control/definition.csv'
            if definition.exists():
                # Render IDs are a separate namespace, never historical ownership claims.
                from re import findall
                default = (map_root / 'map/control/default.map').read_text()
                groups = {key: {int(n) for n in findall(r'\d+', body)} for key, body in findall(r'(sea_zones|lakes)\s*=\s*LIST\s*\{([^}]*)\}', default)}
                for line in definition.read_text().splitlines():
                    fields = line.split(';')
                    if not fields or fields[0] == '0': continue
                    number, red, green, blue = map(int, fields[:4]); key = fields[4]
                    kind = 'sea' if number in groups.get('sea_zones', set()) else 'lake' if number in groups.get('lakes', set()) else 'land'
                    db.execute('INSERT INTO map_region VALUES (?,?,?,?,?,?)', (key, number, kind, red, green, blue))
                for row_id, payload in db.execute('SELECT id,payload_json FROM record').fetchall():
                    record = json.loads(payload)
                    keys = {binding for binding in record.get('gameBindings', []) if binding.startswith('node:')}
                    if record.get('entity', '').startswith('node:'): keys.add(record['entity'])
                    for key in keys:
                        region = 'castle:' + key[5:]
                        if db.execute('SELECT 1 FROM map_region WHERE region_key=?', (region,)).fetchone():
                            db.execute('INSERT INTO record_map_region VALUES (?,?,?)', (row_id, region, 'implementation-binding; not historical ownership'))
                for file in sorted((map_root / 'map/edits').glob('*.json')):
                    edit = json.loads(file.read_text())
                    if all(key in edit for key in ['id','validFrom','validUntil']):
                        db.execute('INSERT INTO map_edit VALUES (?,?,?,?)', (edit['id'], text(edit['validFrom']), text(edit['validUntil']), text(edit)))
                db.execute('INSERT INTO metadata VALUES (?,?)', ('map_definition_sha256', hashlib.sha256(definition.read_bytes()).hexdigest()))
            if db.execute('PRAGMA foreign_key_check').fetchall():
                raise ValueError('foreign key violation')
            if db.execute('PRAGMA integrity_check').fetchone()[0] != 'ok' or db.execute("SELECT rtreecheck('spacetime')").fetchone()[0] != 'ok':
                raise ValueError('integrity check failed')
            db.commit()
            count = db.execute('SELECT count(*) FROM record').fetchone()[0]
        finally:
            db.close()
        # Exclusive publication: refuse a destination created while building.
        os.link(temporary, output)
        return count
    finally:
        os.unlink(temporary)

def query(database, entity=None, first=None, last=None, bbox=None):
    if first is not None and last is not None and first > last:
        raise ValueError('開始年は終了年以前にする')
    connection = sqlite3.connect(database.resolve().as_uri() + '?mode=ro', uri=True)
    connection.row_factory = sqlite3.Row
    conditions, values = [], []
    if first is not None:
        conditions.append('r.until_exclusive > ?'); values.append(first)
    if last is not None:
        conditions.append('r.from_year <= ?'); values.append(last)
    if entity:
        conditions.append('EXISTS (SELECT 1 FROM record_entity re WHERE re.record_id=r.id AND (re.entity_id=? OR re.entity_id IN (SELECT entity_id FROM alias WHERE name=?) OR re.entity_id IN (SELECT entity_id FROM authority WHERE id=?)))')
        values.extend([entity] * 3)
    if bbox:
        west, south, east, north = bbox
        if not all(math.isfinite(v) for v in bbox) or not (-180 <= west <= east <= 180 and -90 <= south <= north <= 90):
            raise ValueError('経緯度範囲が不正。日付変更線を跨ぐ範囲は分ける')
        conditions.append('''EXISTS (SELECT 1 FROM spatial_reference sr JOIN spacetime st ON st.id=sr.id JOIN place p ON p.entity_id=sr.place_id
         WHERE sr.record_id=r.id AND st.west<=? AND st.east>=? AND st.south<=? AND st.north>=?
         AND st.first_year<=? AND st.until_exclusive>? AND p.longitude BETWEEN ? AND ? AND p.latitude BETWEEN ? AND ?)''')
        values.extend([east, west, north, south, last if last is not None else 1e9, first if first is not None else -1e9, west, east, south, north])
    try:
        rows = connection.execute('SELECT r.record_id,r.kind,r.from_year,r.until_exclusive,r.scope,r.relation,r.event_time_json,r.payload_json,s.url AS source_url FROM record r JOIN source s ON s.id=r.source_id' + (' WHERE ' + ' AND '.join(conditions) if conditions else '') + ' ORDER BY r.from_year,r.record_id', values)
        return [dict(row) for row in rows]
    finally:
        connection.close()

def cube(database, first=None, last=None, calendar=None):
    """Read the existing sparse cube; bounds select native-calendar years inclusively."""
    if first is not None and last is not None and first > last:
        raise ValueError('開始年は終了年以前にする')
    conditions, values = [], []
    if first is not None:
        conditions.append('year >= ?'); values.append(first)
    if last is not None:
        conditions.append('year <= ?'); values.append(last)
    if calendar is not None:
        conditions.append('calendar = ?'); values.append(calendar)
    connection = sqlite3.connect(database.resolve().as_uri() + '?mode=ro', uri=True)
    connection.row_factory = sqlite3.Row
    try:
        rows = connection.execute(
            'SELECT longitude_bin,latitude_bin,calendar,precision,year,kind,scope,record_count FROM space_time_cube'
            + (' WHERE ' + ' AND '.join(conditions) if conditions else '')
            + ' ORDER BY calendar,year,longitude_bin,latitude_bin,precision,kind,scope', values)
        return [dict(row) for row in rows]
    finally:
        connection.close()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    create = sub.add_parser('build'); create.add_argument('--research', type=Path, default=ROOT/'data/research'); create.add_argument('--output', type=Path, required=True)
    search = sub.add_parser('query'); search.add_argument('--db', type=Path, required=True); search.add_argument('--entity'); search.add_argument('--from-year', type=int); search.add_argument('--to-year', type=int); search.add_argument('--bbox', type=float, nargs=4)
    aggregate = sub.add_parser('cube', help='Read the sparse native-calendar space-time cube')
    aggregate.add_argument('--db', type=Path, required=True)
    aggregate.add_argument('--from-year', type=int); aggregate.add_argument('--to-year', type=int)
    aggregate.add_argument('--calendar', help='Exact stored calendar name; unknown names return an empty array')
    args = parser.parse_args()
    if args.command == 'build':
        print(text({'records': build(args.research, args.output), 'database': str(args.output)}))
    elif args.command == 'query':
        print(text(query(args.db, args.entity, args.from_year, args.to_year, args.bbox)))
    else:
        print(text(cube(args.db, args.from_year, args.to_year, args.calendar)))

if __name__ == '__main__':
    main()
