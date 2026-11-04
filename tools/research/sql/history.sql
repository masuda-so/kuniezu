PRAGMA foreign_keys = ON;
PRAGMA user_version = 1;
CREATE TABLE metadata(key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE entity(id TEXT PRIMARY KEY, kind TEXT NOT NULL, name TEXT NOT NULL, registered INTEGER NOT NULL CHECK(registered IN (0,1)));
CREATE TABLE alias(name TEXT NOT NULL, entity_id TEXT NOT NULL REFERENCES entity(id), PRIMARY KEY(name,entity_id));
CREATE INDEX alias_entity ON alias(entity_id);
CREATE TABLE authority(id TEXT PRIMARY KEY, entity_id TEXT NOT NULL REFERENCES entity(id));
CREATE TABLE place(entity_id TEXT PRIMARY KEY REFERENCES entity(id), longitude REAL, latitude REAL, geometry_status TEXT NOT NULL, evidence_json TEXT NOT NULL,
 CHECK((longitude IS NULL AND latitude IS NULL) OR (longitude IS NOT NULL AND latitude IS NOT NULL AND longitude BETWEEN -180 AND 180 AND latitude BETWEEN -90 AND 90)));
CREATE TABLE source(id TEXT PRIMARY KEY, url TEXT NOT NULL, title TEXT, payload_json TEXT NOT NULL);
CREATE TABLE record(id INTEGER PRIMARY KEY, record_id TEXT NOT NULL UNIQUE, kind TEXT NOT NULL CHECK(kind IN ('claim','location')),
 source_id TEXT NOT NULL REFERENCES source(id), from_year INTEGER NOT NULL, until_exclusive INTEGER NOT NULL,
 scope TEXT NOT NULL, relation TEXT, event_time_json TEXT, payload_json TEXT NOT NULL,
 CHECK(from_year < until_exclusive));
CREATE INDEX record_time ON record(from_year,until_exclusive);
CREATE TABLE record_entity(record_id INTEGER NOT NULL REFERENCES record(id),entity_id TEXT NOT NULL REFERENCES entity(id),PRIMARY KEY(record_id,entity_id));
CREATE INDEX record_entity_lookup ON record_entity(entity_id,record_id);
CREATE TABLE spatial_reference(id INTEGER PRIMARY KEY,record_id INTEGER NOT NULL REFERENCES record(id),place_id TEXT NOT NULL REFERENCES place(entity_id),UNIQUE(record_id,place_id));
-- longitude, latitude, year: original coordinates remain REAL in place;
-- R-tree floating-point bounds are candidate filters only.
CREATE VIRTUAL TABLE spacetime USING rtree(id,west,east,south,north,first_year,until_exclusive);
CREATE VIEW history AS SELECT r.record_id,r.kind,r.from_year,r.until_exclusive,r.scope,r.relation,r.source_id,s.url AS source_url,r.event_time_json
 FROM record r JOIN source s ON s.id=r.source_id;
CREATE VIEW history_without_period_candidates AS SELECT * FROM history WHERE scope <> 'described-period-candidate';
CREATE VIEW unregistered_entities AS SELECT id,kind,name FROM entity WHERE registered=0;
-- Native-calendar dates; no automatic conversion of lunar dates to Gregorian dates.
CREATE TABLE event_date(record_id INTEGER NOT NULL REFERENCES record(id), component INTEGER NOT NULL,
 calendar TEXT NOT NULL, precision TEXT NOT NULL, year INTEGER, month INTEGER, day INTEGER, leap_month INTEGER,
 entity_ids_json TEXT NOT NULL, PRIMARY KEY(record_id,component));
CREATE INDEX event_date_calendar ON event_date(calendar,year,month,leap_month,day);
CREATE TABLE map_region(region_key TEXT PRIMARY KEY, province_id INTEGER NOT NULL UNIQUE, kind TEXT NOT NULL, red INTEGER, green INTEGER, blue INTEGER);
CREATE TABLE record_map_region(record_id INTEGER NOT NULL REFERENCES record(id),region_key TEXT NOT NULL REFERENCES map_region(region_key),basis TEXT NOT NULL,PRIMARY KEY(record_id,region_key));
CREATE TABLE map_edit(id TEXT PRIMARY KEY, valid_from_json TEXT NOT NULL, valid_until_json TEXT NOT NULL, payload_json TEXT NOT NULL);
-- Sparse analytical cube: 0.25-degree cells, one native-calendar year.
-- Counts sourced records, not population, army strength, or continuous presence.
CREATE VIEW space_time_cube AS
 SELECT CAST((p.longitude+180)*4 AS INTEGER) AS longitude_bin,
 CAST((p.latitude+90)*4 AS INTEGER) AS latitude_bin,
 d.calendar,d.precision,d.year,r.kind,r.scope,COUNT(DISTINCT r.id) AS record_count
 FROM spatial_reference sr JOIN place p ON p.entity_id=sr.place_id
 JOIN record r ON r.id=sr.record_id JOIN event_date d ON d.record_id=r.id
 WHERE d.year IS NOT NULL AND EXISTS(SELECT 1 FROM json_each(d.entity_ids_json) j WHERE j.value=sr.place_id)
 GROUP BY longitude_bin,latitude_bin,d.calendar,d.precision,d.year,r.kind,r.scope;
