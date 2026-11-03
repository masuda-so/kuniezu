'use strict';
// The map tables are the source of district geometry IDs and provisional game assignments.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function table(file) {
  const [header, ...lines] = fs.readFileSync(file, 'utf8').trim().split(/\r?\n/);
  const fields = header.split(';');
  return lines.map(line => {
    const values = line.split(';');
    assert.equal(values.length, fields.length, `Malformed row in ${file}`);
    return Object.fromEntries(fields.map((key, i) => [key, values[i]]));
  });
}

function districts(mapDir) {
  const geometry = table(path.join(mapDir, 'gun.csv'));
  const assignments = table(path.join(mapDir, 'gun-assignment.csv'));
  const byId = new Map(assignments.map(row => [row.codh_id, row]));
  assert.equal(byId.size, assignments.length, 'Duplicate assignment ID');
  assert.equal(new Set(geometry.map(row => row.codh_id)).size, geometry.length, 'Duplicate district ID');
  assert.equal(geometry.length, byId.size, 'District and assignment totals differ');
  return geometry.map(row => {
    const assignment = byId.get(row.codh_id);
    assert(assignment, `Missing district assignment: ${row.codh_id}`);
    for (const field of ['n', 'name', 'kuni']) {
      assert.equal(row[field], assignment[field], `District mismatch: ${row.codh_id} ${field}`);
    }
    return {
      id: `district:codh:${row.codh_id}`,
      name: row.name,
      province: row.kuni,
      geometry: {pixelId: Number(row.n), pixels: Number(row.pixels), period: '江戸末期'},
      gameAssignment: {
        method: assignment.basis,
        regions: assignment.region ? assignment.region.split('|') : [],
        share: assignment.share ? Number(assignment.share) : null,
      },
    };
  });
}

if (require.main === module) {
  const [mapDir, query] = process.argv.slice(2);
  if (!mapDir) {
    console.error('Usage: node tools/research/query-district.cjs <game/map> [CODH ID or district name]');
    process.exitCode = 1;
  } else {
    const rows = districts(mapDir);
    console.log(JSON.stringify(query ? rows.filter(row => row.id.endsWith(`:${query}`) || row.name === query) : rows, null, 2));
  }
}
module.exports = {districts};
