"""Compare SQL queries with existing JS reference index, preserving record precision."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import sqlite3
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('history_sqlite', ROOT/'tools/research/history_sqlite.py')
store = importlib.util.module_from_spec(spec); spec.loader.exec_module(store)
p = argparse.ArgumentParser(); p.add_argument('--reference-root', type=Path, default=ROOT); args = p.parse_args()
reference = args.reference_root; research = reference/'data/research'
with tempfile.TemporaryDirectory(prefix='kuniezu-sql-check-') as temp:
    output = Path(temp)/'history.sqlite3'
    count = store.build(research, output)
    queries = [{}] + [{'fromYear': y, 'toYear': y} for y in range(1560,1617)]
    # 比較史料の年も、全年度へ展開せず記録の変化点だけを検査する。
    claims = [json.loads(s) for s in (research/'claims.jsonl').read_text().splitlines()]
    outside_years = {y for row in claims for y in row['validYears']} - set(range(1560, 1617))
    queries += [{'fromYear': y, 'toYear': y} for y in sorted(outside_years)]
    people = [json.loads(s) for s in (research/'people.jsonl').read_text().splitlines()]
    places = [json.loads(s) for s in (research/'places.jsonl').read_text().splitlines()]
    queries += [{'entity': r['id']} for r in people+places]
    queries += [{'entity': entity} for entity in sorted({row['entity'] for row in claims})]
    queries += [{'entity': name} for r in people for n in r.get('gameNames', []) for name in [n,'person:'+n]]
    queries += [{'entity': name} for r in people+places for name in r.get('aliases', [])]
    queries += [{'entity': '県城', 'fromYear':1613,'toYear':1614}, {'entity':'都於郡城','fromYear':1610,'toYear':1610}, {'entity':'wikidata:Q171977'}, {'entity':'塩津街道'}, {'entity':'ヌルハチ'}]
    for coords in ([133.9,33.5,134,33.6],[0,0,1,1],[133.91259,33.519865,133.91259,33.519865],[133.91259001,33.51986501,133.91259002,33.51986502]):
        queries.append({'bbox':coords,'fromYear':1600,'toYear':1615})
    js = """const fs=require('fs'),path=require('path'),root=process.argv[1],{createHistoryIndex,queryHistory}=require(path.join(root,'tools/research/history-index.cjs'));const read=n=>fs.readFileSync(path.join(root,'data/research',n+'.jsonl'),'utf8').trim().split('\\n').map(JSON.parse);const index=createHistoryIndex({claims:read('claims'),people:read('people'),places:read('places'),locations:read('location-observations')});console.log(JSON.stringify(JSON.parse(fs.readFileSync(0)).map(q=>queryHistory(index,q).map(r=>r.id).sort())));"""
    expected = json.loads(subprocess.check_output(['node','-e',js,str(reference)], input=json.dumps(queries).encode()))
    for query, ids in zip(queries, expected):
        result = store.query(output,query.get('entity'),query.get('fromYear'),query.get('toYear'),query.get('bbox'))
        assert sorted(r['record_id'] for r in result) == ids, query
    with sqlite3.connect(output) as db:
        assert db.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
        assert not db.execute('PRAGMA foreign_key_check').fetchall()
        assert db.execute("SELECT rtreecheck('spacetime')").fetchone()[0] == 'ok'
        assert db.execute('SELECT count(*) FROM record').fetchone()[0] == count
        order = db.execute("SELECT event_time_json FROM record WHERE record_id='claim:agata-receipt-order'").fetchone()[0]
        assert json.loads(order)['date'] == [1613,12,15]
        assert json.loads(order)['calendar'] == 'Japanese-lunisolar'
        assert db.execute("SELECT scope FROM record WHERE record_id='claim:tonokori-sadowara-outer-castle'").fetchone()[0] == 'described-period-candidate'
        # Archaeological period labels must not become dated events or continuous presence.
        tomori = db.execute("SELECT id,scope,payload_json FROM record WHERE record_id='claim:tomori-area6-momoyama-building1'").fetchone()
        assert tomori[1] == 'described-period-candidate'
        assert json.loads(tomori[2])['value']['constraint']['approved100mRasterCellChanges'] == 0
        assert db.execute('SELECT year,month,day FROM event_date WHERE record_id=?', (tomori[0],)).fetchall() == [(None,None,None)]
        assert not db.execute("SELECT 1 FROM history_without_period_candidates WHERE record_id='claim:tomori-area6-momoyama-building1'").fetchall()
        point = db.execute("SELECT longitude,latitude,evidence_json FROM place WHERE entity_id='place:tomori-area6'").fetchone()
        assert abs(point[0] - (135 + 43/60 + 55/3600)) < 1e-12 and abs(point[1] - (34 + 55/60 + 3/3600)) < 1e-12
        assert json.loads(point[2])['sourceDatum'] is None
        assert json.loads(point[2])['datumTransformationToWGS84Performed'] is False
        assert db.execute('SELECT count(*) FROM space_time_cube').fetchone()[0] >= 2
        assert db.execute('SELECT count(*) FROM map_region').fetchone()[0] > 100
        assert db.execute('SELECT count(*) FROM map_edit').fetchone()[0] >= 1
        db.execute('PRAGMA foreign_keys=ON')
        try: db.execute("UPDATE place SET longitude=NULL WHERE entity_id='place:安芸城'")
        except sqlite3.IntegrityError: pass
        else: raise AssertionError('partial NULL point accepted')
        try: db.execute("INSERT INTO authority VALUES ('wikidata:Q1','person:missing')")
        except sqlite3.IntegrityError: pass
        else: raise AssertionError('missing entity accepted')
    before = hashlib.sha256(output.read_bytes()).hexdigest()
    try: store.build(research, output)
    except ValueError: pass
    else: raise AssertionError('existing DB overwritten')
    assert hashlib.sha256(output.read_bytes()).hexdigest() == before
    print(f'PASS: SQLite {count} records, {len(queries)} JS/SQL query equivalence cases; raw lunar date, uncertain bounds, R-tree rounding exclusion, FK and exclusive output')
