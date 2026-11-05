'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const calendar = {window: {}};
calendar.TK = calendar.window.TK = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../../kuniezu/static/kuniezu/koyomi.js'), 'utf8'), calendar);
const months = calendar.TK.KOYOMI.m;
const monthIndex = new Map(months.map(([year, month, leap], i) => [[year, month, leap].join('/'), i]));

function day(value, label) {
  assert(Array.isArray(value) && (value.length === 3 || value.length === 4) &&
    value.every(Number.isInteger), `${label}: invalid date label`);
  const [year, month, date, leap = 0] = value;
  const i = monthIndex.get([year, month, leap].join('/'));
  assert(i !== undefined && months[i + 1] && date >= 1 &&
    date <= months[i + 1][3] - months[i][3], `${label}: invalid calendar day`);
  return months[i][3] + date - 1;
}

function audit(catalog, history, sourceIds) {
  assert.equal(catalog.schemaVersion, 1);
  assert.equal(history.schemaVersion, 1);
  assert(Array.isArray(catalog.parcels) && Array.isArray(history.relations));
  const parcels = new Set();
  const pixels = new Set();
  const ids = new Set();
  const groups = new Map();
  const isId = value => typeof value === 'string' && value.trim() === value && value.length > 0;
  function checkSources(values, label) {
    assert(Array.isArray(values) && values.length > 0 &&
      values.every(isId) && new Set(values).size === values.length, `${label}: invalid source list`);
    for (const id of values) assert(sourceIds.has(id), `${label}: unknown source ${id}`);
  }

  for (const parcel of catalog.parcels) {
    assert(isId(parcel.id) && !parcels.has(parcel.id), `Invalid or duplicate parcel ID: ${parcel.id}`);
    assert(Number.isSafeInteger(parcel.pixelId) && parcel.pixelId > 0 && !pixels.has(parcel.pixelId),
      `${parcel.id}: invalid or duplicate pixel ID`);
    assert(['historical', 'later-reference', 'approximate'].includes(parcel.boundaryBasis),
      `${parcel.id}: invalid boundary basis`);
    checkSources(parcel.sourceIds, parcel.id);
    parcels.add(parcel.id);
    pixels.add(parcel.pixelId);
  }

  for (const relation of history.relations) {
    const {id, parcelId, kind, targetId, from, until, datePrecision, sourceIds, certainty} = relation;
    assert(isId(id) && !ids.has(id), `Invalid or duplicate relation ID: ${id}`);
    assert(parcels.has(parcelId) && isId(targetId), `${id}: invalid reference`);
    assert(['administration', 'tenure', 'occupation', 'castle-jurisdiction'].includes(kind),
      `${id}: invalid kind`);
    assert(['year', 'month', 'day'].includes(datePrecision) &&
      ['documented', 'inferred', 'disputed'].includes(certainty),
      `${id}: missing evidence or precision`);
    checkSources(sourceIds, id);
    const start = day(from, `${id}.from`);
    const end = day(until, `${id}.until`);
    assert(start < end, `${id}: empty or reversed interval`);
    const key = JSON.stringify([parcelId, kind]);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({id, targetId, start, end});
    ids.add(id);
  }

  const conflicts = [];
  for (const group of groups.values()) {
    group.sort((a, b) => a.start - b.start);
    for (const [i, record] of group.entries()) {
      for (let j = i + 1; j < group.length && group[j].start < record.end; j++) {
        if (record.targetId !== group[j].targetId) conflicts.push([record.id, group[j].id]);
      }
    }
  }
  return {parcels: parcels.size, relations: ids.size, conflicts};
}

if (require.main === module) {
  const [catalog, history, ledger = path.join(__dirname, '../../data/research/sources.jsonl')] =
    process.argv.slice(2);
  assert(catalog && history, 'Usage: node tools/checks/territory-parcels.cjs parcels.json relations.json [sources.jsonl]');
  const load = file => JSON.parse(fs.readFileSync(file, 'utf8'));
  const records = fs.readFileSync(ledger, 'utf8').split(/\r?\n/).filter(line => line.trim());
  const sources = new Set(records.map(line => JSON.parse(line).id));
  assert.equal(sources.size, records.length, 'Duplicate IDs in source ledger');
  assert([...sources].every(id => typeof id === 'string' && id.trim()),
    'Missing IDs in source ledger');
  console.log(JSON.stringify(audit(load(catalog), load(history), sources), null, 2));
}
module.exports = {audit};
