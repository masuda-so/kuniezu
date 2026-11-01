/* Verify the loaded model, not just raw data.js. No server or browser state changes. */
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { G, TK } = require('./history-focus.cjs').model();
const evidence = JSON.parse(fs.readFileSync('data/inputs/aki-castle-review/position-review.json', 'utf8'));
const inverse = p => [p[0] / (200 * Math.cos(36 * Math.PI / 180)) + 129.2, 41.75 - p[1] / 200];
const metres = (a, b) => Math.hypot((a[0] - b[0]) * 111320 * Math.cos((a[1] + b[1]) / 2 * Math.PI / 180), (a[1] - b[1]) * 111320);
const rows = [];
for (const row of evidence.rows) {
  let point;
  if (row.kind === 'facility') {
    const site = G.YOSHO.find(y => y.n === row.name);
    assert.ok(site, row.name + ' exists after all modules load');
    point = inverse([site.x, site.y]);
    assert.equal(site.id, 'yosho:安芸城:133.54:33.31', 'position correction preserves existing saved site identity');
  } else {
    const c = G.C[row.id];
    assert.ok(c, row.id);
    point = inverse([c.x, c.y]);
  }
  assert.ok(metres(point, row.proposedPoint) < 10, row.name + ' loaded representative point');
  assert.ok(metres(point, row.independentComparison.point) < 150, row.name + ' agrees with independent site representative');
  rows.push({ name: row.name, point, independentDifferenceMetres: metres(point, row.independentComparison.point) });
}
const aki = TK.YOSHO.find(y => y[0] === '安芸城');
assert.ok(aki[2] > 133.9 && aki[3] > 33.5, 'Aki is on the Aki plain rather than off Urado');
assert.ok(TK.SITE_POSITION_EVIDENCE['安芸城']?.url?.includes('400000033600'), 'specific source retained');
fs.writeFileSync('data/audits/aki-castle-position-review.json', JSON.stringify({ scope: evidence.scope, rows }, null, 2));
console.log('PASS: Aki moved from off Urado to Aki plain; saved identity retained; Motoyama/Oko current positions independently checked');
