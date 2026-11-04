"""Check the read-only cube API/CLI against the existing schema and a small fixture."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import sqlite3
import subprocess
import sys
import tempfile
from unittest.mock import patch

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]


def fixture(database, schema):
    with sqlite3.connect(database) as db:
        db.executescript(schema.read_text())
        db.execute('INSERT INTO source VALUES (?,?,?,?)', ('s', 'https://example.org/source', 'Fixture', '{}'))
        for name, lon, lat in [('a', 135, 35), ('b', 135.01, 35.01), ('c', 135.3, 35.3)]:
            entity = 'place:' + name
            db.execute('INSERT INTO entity VALUES (?,?,?,?)', (entity, 'place', name, 1))
            db.execute('INSERT INTO place VALUES (?,?,?,?,?)', (entity, lon, lat, 'site-representative', '{}'))

        def add(name, kind, calendar, year, places=('a',), duplicate=False, scope='claim-applicability'):
            precision = 'day' if calendar == 'Japanese-lunisolar' else 'period' if year is None else 'year'
            record = db.execute('INSERT INTO record(record_id,kind,source_id,from_year,until_exclusive,scope,relation,payload_json) VALUES (?,?,?,?,?,?,?,?)',
                                (name, kind, 's', year or 1598, year + 1 if year else 1603, scope, 'fixture', '{}')).lastrowid
            for place in places:
                db.execute('INSERT INTO spatial_reference(record_id,place_id) VALUES (?,?)', (record, 'place:' + place))
            for component in range(2 if duplicate else 1):
                db.execute('INSERT INTO event_date VALUES (?,?,?,?,?,?,?,?,?)',
                           (record, component, calendar, precision, year, 7 if precision == 'day' else None,
                            5 if precision == 'day' else None, 0 if precision == 'day' else None,
                            json.dumps(['place:' + p for p in places])))

        # One record may have several places/components in the same bin. Count it once.
        add('ce-a', 'claim', 'CE-year', 1600, ('a', 'b'), duplicate=True)
        add('ce-b', 'claim', 'CE-year', 1600)
        add('before', 'claim', 'CE-year', 1599, ('c',))
        add('after', 'claim', 'CE-year', 1601)
        add('lunar-location', 'location', 'Japanese-lunisolar', 1600, scope='recorded-change')
        add('ce-location', 'location', 'CE-year', 1600, scope='recorded-change')
        add('lunar-claim', 'claim', 'Japanese-lunisolar', 1600)
        add('period', 'claim', 'Japanese-era-description', None, scope='described-period-candidate')
        add('interval', 'location', 'CE-year', None, scope='attested-interval')
        assert db.execute('PRAGMA foreign_key_check').fetchall() == []


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--tool-root', type=Path, default=ROOT)
    parser.add_argument('--reference-root', type=Path, default=ROOT)
    parser.add_argument('--report', type=Path)
    args = parser.parse_args()
    tool = args.tool_root / 'tools/research/history_sqlite.py'
    spec = importlib.util.spec_from_file_location('history_cube_target', tool)
    store = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(store)
    with tempfile.TemporaryDirectory(prefix='kuniezu-cube-check-') as temporary:
        directory = Path(temporary)
        database = directory / 'fixture.sqlite3'
        fixture(database, args.reference_root / 'tools/research/sql/history.sql')
        snapshot = lambda: (hashlib.sha256(database.read_bytes()).hexdigest(), database.stat().st_mtime_ns,
                            sorted(p.name for p in directory.iterdir()))
        before = snapshot()
        writes, connections = [], []
        original_connect = sqlite3.connect
        write_actions = {sqlite3.SQLITE_INSERT, sqlite3.SQLITE_UPDATE, sqlite3.SQLITE_DELETE,
                         sqlite3.SQLITE_CREATE_TABLE, sqlite3.SQLITE_DROP_TABLE,
                         sqlite3.SQLITE_CREATE_VIEW, sqlite3.SQLITE_DROP_VIEW,
                         sqlite3.SQLITE_ALTER_TABLE, sqlite3.SQLITE_ATTACH, sqlite3.SQLITE_DETACH}

        def read_only_connect(database_uri, **kwargs):
            assert kwargs.get('uri') is True and database_uri.endswith('?mode=ro'), 'connection must be read-only'
            connections.append(database_uri)
            db = original_connect(database_uri, **kwargs)
            def authorize(action, a, b, name, trigger):
                if action in write_actions:
                    writes.append((action, a, b))
                    return sqlite3.SQLITE_DENY
                return sqlite3.SQLITE_OK
            db.set_authorizer(authorize)
            return db

        cases = [({}, 6), ({'first': 1600, 'last': 1600}, 4), ({'first': 1601}, 1),
                 ({'last': 1599}, 1), ({'calendar': 'CE-year'}, 4),
                 ({'calendar': 'Japanese-lunisolar'}, 2),
                 ({'first': 1600, 'last': 1600, 'calendar': 'CE-year'}, 2),
                 ({'first': 1599, 'last': 1601}, 6), ({'first': 1615}, 0),
                 ({'calendar': 'Japanese-era-description'}, 0), ({'calendar': 'unknown'}, 0),
                 ({'calendar': ''}, 0), ({'calendar': "' OR 1=1 --"}, 0)]
        with patch.object(store.sqlite3, 'connect', read_only_connect):
            all_rows = store.cube(database)
            order = lambda r: tuple(r[k] for k in ('calendar', 'year', 'longitude_bin', 'latitude_bin', 'precision', 'kind', 'scope'))
            assert all_rows == sorted(all_rows, key=order)
            assert store.cube(database) == all_rows
            assert [r['record_count'] for r in all_rows if r['calendar'] == 'CE-year' and r['year'] == 1600 and r['kind'] == 'claim'] == [2]
            assert all(r['year'] is not None for r in all_rows), 'do not expand uncertain dates or intervals'
            expected = []
            for options, count in cases:
                rows = store.cube(database, **options)
                assert len(rows) == count, options
                assert rows == [r for r in all_rows
                                if (options.get('first') is None or r['year'] >= options['first'])
                                and (options.get('last') is None or r['year'] <= options['last'])
                                and (options.get('calendar') is None or r['calendar'] == options['calendar'])]
                expected.append(rows)
            count = len(connections)
            try:
                store.cube(database, 1601, 1600)
            except ValueError:
                pass
            else:
                raise AssertionError('reversed years accepted')
            assert len(connections) == count, 'reject reversed years before opening DB'
        assert writes == []
        for (options, _), rows in zip(cases, expected):
            command = [sys.executable, str(tool), 'cube', '--db', str(database)]
            for option, flag in [('first', '--from-year'), ('last', '--to-year'), ('calendar', '--calendar')]:
                if option in options:
                    command += [flag, str(options[option])]
            result = subprocess.run(command, capture_output=True, text=True)
            assert result.returncode == 0, result.stderr
            assert json.loads(result.stdout) == rows, options
        invalid = subprocess.run([sys.executable, str(tool), 'cube', '--db', str(database),
                                  '--from-year', '1601', '--to-year', '1600'], capture_output=True, text=True)
        assert invalid.returncode != 0 and '開始年は終了年以前にする' in invalid.stderr
        assert invalid.stdout == ''
        missing = directory / 'missing.sqlite3'
        result = subprocess.run([sys.executable, str(tool), 'cube', '--db', str(missing)], capture_output=True, text=True)
        assert result.returncode != 0 and not missing.exists()
        # Existing query remains available and still returns source URLs.
        result = subprocess.run([sys.executable, str(tool), 'query', '--db', str(database)], capture_output=True, text=True)
        rows = json.loads(result.stdout)
        assert result.returncode == 0 and len(rows) == 9 and all(r['source_url'] == 'https://example.org/source' for r in rows)
        assert snapshot() == before, 'DB bytes, mtime or adjacent files changed'
        report = {'status': 'pass', 'apiFilterCases': len(cases), 'cliFilterCases': len(cases),
                  'cubeRows': 6, 'sourceRecords': 9, 'duplicatesCountedOnce': True,
                  'nullYearsNotExpanded': True, 'calendarInjectionReturnsEmpty': True,
                  'stableOrder': True, 'reverseYearsRejectedBeforeConnect': True,
                  'unknownCalendarReturnsEmpty': True, 'dbWriteActions': len(writes),
                  'dbBytesAndMtimeUnchanged': True, 'noSidecarFiles': True,
                  'missingDbNotCreated': True, 'existingQueryPreserved': True}
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(f"PASS: cube API/CLI {len(cases)} filters each, native-calendar counts, read-only DB and stable ordering")


if __name__ == '__main__':
    main()
