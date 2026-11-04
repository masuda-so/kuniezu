"""Exercise the real SQLite compiler on invalid input and sparse-cube boundaries."""
import argparse
import copy
import hashlib
import json
from pathlib import Path
import sqlite3
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[2]


def dataset():
    return {
        'sources': [{'id': 's', 'url': 'https://example.org/source', 'title': 'Source'}],
        'people': [{'id': 'person:a', 'name': 'A', 'gameNames': ['A', 'Alias A'], 'authorityIds': []}],
        'places': [{
            'id': 'place:a', 'name': 'A Castle', 'geometryStatus': 'site-representative',
            'geometry': {'type': 'Point', 'coordinates': [135, 35]},
            'geometryEvidence': {
                'sourceUrl': 'https://example.org/point', 'locator': 'p1',
                'scope': 'site representative', 'checked': '2026-11-04',
            },
        }],
        'claims': [{
            'id': 'c', 'entity': 'place:a', 'predicate': 'residence', 'value': 'A Castle',
            'source': 's', 'sourceUrl': 'https://example.org/source', 'locator': 'p1',
            'status': 'verified-in-specified-scope', 'recordType': 'verified-historical-claim',
            'checked': '2026-11-04', 'gameBindings': ['test:castle'], 'validYears': [1600, 1600],
            'linkedEntities': ['place:a'],
            'eventTime': {'kind': 'year-window', 'calendar': 'CE-year', 'precision': 'year', 'year': 1600},
            'eventRelation': 'residence', 'eventScope': 'single year',
        }],
        'location-observations': [{
            'id': 'location:a', 'person': 'person:a', 'place': 'place:a',
            'relation': 'attested-presence', 'source': 's', 'sourceUrl': 'https://example.org/source',
            'locator': 'p1', 'uncertainty': 'single day', 'recordedAt': '2026-11-04',
            'gameBindings': ['test:person'], 'recordType': 'sourced-location-observation',
            'status': 'verified-in-specified-scope',
            'time': {
                'kind': 'dated-event', 'date': [1600, 7, 5], 'calendar': 'Japanese-lunisolar',
                'precision': 'day', 'leapMonth': False,
            },
        }],
    }


def compile_fixture(root, data, rejection=None):
    with tempfile.TemporaryDirectory(prefix='kuniezu-sql-input-check-') as temporary:
        directory = Path(temporary)
        research = directory / 'data/research'
        research.mkdir(parents=True)
        files = []
        for kind, rows in data.items():
            content = ('\n'.join(json.dumps(row, ensure_ascii=False) for row in rows) + '\n').encode()
            name = kind + '.jsonl'
            (research / name).write_bytes(content)
            files.append({'file': name, 'sha256': hashlib.sha256(content).hexdigest()})
        (research / 'manifest.json').write_text(json.dumps({'files': files}))
        output = directory / 'history.sqlite3'
        result = subprocess.run(
            [sys.executable, str(root / 'tools/research/history_sqlite.py'), 'build',
             '--research', str(research), '--output', str(output)],
            capture_output=True, text=True,
        )
        if rejection:
            assert result.returncode != 0, 'invalid fixture was accepted: ' + rejection
            assert rejection in result.stderr, result.stderr
            assert not output.exists(), 'invalid input published a database'
            assert not list(directory.glob(output.name + '.*')), 'temporary output was left behind'
            return {'rejected': True, 'published': False}
        assert result.returncode == 0, result.stderr
        with sqlite3.connect(output.resolve().as_uri() + '?mode=ro', uri=True) as db:
            db.row_factory = sqlite3.Row
            cube = [dict(row) for row in db.execute(
                'SELECT * FROM space_time_cube ORDER BY year,longitude_bin,latitude_bin,calendar')]
            raw = {row['record_id']: dict(row) for row in db.execute(
                'SELECT record_id,event_time_json,payload_json FROM record')}
            dates = [dict(row) for row in db.execute('SELECT * FROM event_date')]
            assert not db.execute('PRAGMA foreign_key_check').fetchall()
        return {'cube': cube, 'raw': raw, 'dates': dates}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--tool-root', type=Path, default=ROOT)
    parser.add_argument('--report', type=Path)
    args = parser.parse_args()
    root = args.tool_root.resolve()
    baseline = compile_fixture(root, dataset())
    assert len(baseline['raw']) == 2
    invalid = [
        ('wrong_record_type', lambda d: d['claims'][0].update(recordType='implementation-record'),
         '審査済み命題だけ'),
        ('source_url_mismatch', lambda d: d['claims'][0].update(sourceUrl='https://example.org/unrelated'),
         '命題と出典URLが不一致'),
        ('invalid_lunar_day', lambda d: d['location-observations'][0]['time'].update(date=[1600, 13, 40]),
         '旧暦日付・閏月区分が不正'),
        ('component_unlinked_entity', lambda d: d['claims'][0].update(eventTime={
            'kind': 'dated-components', 'calendar': 'CE-year', 'precision': 'year',
            'components': [{'year': 1600, 'entities': ['place:missing']}]}),
         '出来事の年代・対象参照が不正'),
        ('component_outside_year', lambda d: d['claims'][0].update(eventTime={
            'kind': 'dated-components', 'calendar': 'CE-year', 'precision': 'year',
            'components': [{'year': 1599, 'entities': ['place:a']}]}),
         '出来事の年代・対象参照が不正'),
        ('partial_null_coordinates', lambda d: d['places'][0]['geometry'].update(coordinates=[135, None]),
         '場所の経緯度が不正'),
        ('wrong_geometry_type', lambda d: d['places'][0]['geometry'].update(type='LineString'),
         '場所の代表点形式が不正'),
        ('year_claim_date_override', lambda d: d['claims'][0]['eventTime'].update(date=[1700, 12, 31]),
         '出来事の年代・対象参照が不正'),
        ('component_date_override', lambda d: d['claims'][0].update(eventTime={
            'kind': 'dated-components', 'calendar': 'CE-year', 'precision': 'year', 'components': [
                {'year': 1600, 'date': [1700, 12, 31], 'entities': ['place:a']}]}),
         '出来事の年代・対象参照が不正'),
        ('component_calendar_override', lambda d: d['claims'][0].update(eventTime={
            'kind': 'dated-components', 'calendar': 'CE-year', 'precision': 'year', 'components': [
                {'year': 1600, 'calendar': 'invented-calendar', 'entities': ['place:a']}]}),
         '出来事の年代・対象参照が不正'),
        ('component_precision_override', lambda d: d['claims'][0].update(eventTime={
            'kind': 'dated-components', 'calendar': 'CE-year', 'precision': 'year', 'components': [
                {'year': 1600, 'precision': 'minute', 'entities': ['place:a']}]}),
         '出来事の年代・対象参照が不正'),
        ('component_estimated_override', lambda d: d['claims'][0].update(eventTime={
            'kind': 'dated-components', 'calendar': 'CE-year', 'precision': 'year', 'components': [
                {'year': 1600, 'estimated': True, 'entities': ['place:a']}]}),
         '出来事の年代・対象参照が不正'),
        ('claim_entity_override', lambda d: d['claims'][0]['eventTime'].update(entities=['place:missing']),
         '出来事の年代・対象参照が不正'),
        ('location_year_date_override', lambda d: d['location-observations'][0].update(time={
            'kind': 'year-window', 'year': 1600, 'date': [1700, 12, 31],
            'calendar': 'CE-year', 'precision': 'year'}),
         '年代形式と矛盾する時間欄'),
        ('location_interval_year_override', lambda d: d['location-observations'][0].update(time={
            'kind': 'year-interval', 'from': 1589, 'untilExclusive': 1600, 'year': 1700,
            'calendar': 'CE-year', 'precision': 'year'}),
         '年代形式と矛盾する時間欄'),
        ('location_day_component_override', lambda d: d['location-observations'][0]['time'].update(
            components=[{'year': 1700, 'entities': ['place:a']}]),
         '年代形式と矛盾する時間欄'),
    ]
    rejections = []
    for name, mutate, message in invalid:
        data = dataset()
        mutate(data)
        rejections.append({'case': name, **compile_fixture(root, data, message)})

    cases = []
    data = dataset()
    data['location-observations'] = []
    second = copy.deepcopy(data['places'][0])
    second.update(id='place:b', name='B Castle')
    second['geometry']['coordinates'] = [136, 35]
    data['places'].append(second)
    data['claims'][0].update(validYears=[1579, 1580], linkedEntities=['place:a', 'place:b'], eventTime={
        'kind': 'dated-components', 'calendar': 'CE-year', 'precision': 'year', 'components': [
            {'year': 1579, 'entities': ['place:a']}, {'year': 1580, 'entities': ['place:b']},
        ],
    })
    rows = compile_fixture(root, data)['cube']
    assert [(r['longitude_bin'], r['year']) for r in rows] == [(1260, 1579), (1264, 1580)]
    assert all(r['record_count'] == 1 for r in rows)
    cases.append({'case': 'separate_component_places', 'rows': rows})

    data = dataset()
    data['location-observations'] = []
    data['claims'][0].update(entity='place:A Castle', linkedEntities=['place:A Castle'])
    result = compile_fixture(root, data)
    assert len(result['cube']) == 1 and result['cube'][0]['record_count'] == 1
    assert json.loads(result['raw']['claim:c']['payload_json']) == data['claims'][0]
    assert json.loads(result['raw']['claim:c']['event_time_json']) == data['claims'][0]['eventTime']
    assert set(json.loads(result['dates'][0]['entity_ids_json'])) == {'place:a'}
    cases.append({'case': 'canonical_place_alias_original_preserved', 'rows': result['cube']})

    data = dataset()
    data['claims'] = []
    data['location-observations'][0].update(relation='principal-base', time={
        'kind': 'year-interval', 'from': 1589, 'untilExclusive': 1600,
        'calendar': 'CE-year', 'precision': 'year',
    })
    rows = compile_fixture(root, data)['cube']
    assert rows == []
    cases.append({'case': 'interval_not_expanded', 'rows': rows})

    data = dataset()
    data['location-observations'] = []
    data['claims'][0].update(validYears=[1603, 1615], eventTime={
        'kind': 'described-period', 'label': 'early Edo', 'indexYears': [1603, 1615],
        'precision': 'period', 'calendar': 'Japanese-era-description',
        'boundsAreHistoricalStartEnd': False,
    })
    rows = compile_fixture(root, data)['cube']
    assert rows == []
    cases.append({'case': 'uncertain_period_not_expanded', 'rows': rows})

    rows = baseline['cube']
    assert len(rows) == 2
    assert {(r['calendar'], r['precision']) for r in rows} == {
        ('CE-year', 'year'), ('Japanese-lunisolar', 'day'),
    }
    cases.append({'case': 'native_calendar_dimension', 'rows': rows})
    report = {'status': 'pass', 'invalidInputs': rejections, 'cubeCases': cases}
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(f'PASS: actual SQLite compiler rejects {len(rejections)} invalid inputs; {len(cases)} cube cases preserve place, calendar and period semantics')


if __name__ == '__main__':
    main()
