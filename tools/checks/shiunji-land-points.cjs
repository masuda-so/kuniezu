'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const [geometry = path.join(root, 'game/geo.js'), lakeIndex = '0'] = process.argv.slice(2);
const context = {window: {}};
vm.runInNewContext(fs.readFileSync(geometry, 'utf8'), context);
const {K, CX, LON0, LAT0, lakes} = context.window.TKGEO;
const lake = lakes[Number(lakeIndex)];
if (!lake) throw new Error(`Unknown lake index: ${lakeIndex}`);

const {points} = require('../../data/verification/shiunji/land-points.json');
const results = points.map(({id, longitude, latitude, period, source}) => {
  const x = (longitude - LON0) * K * CX;
  const y = (LAT0 - latitude) * K;
  let inside = false;
  let distance = Infinity;

  for (const ring of lake) {
    for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
      const ax = ring[j], ay = ring[j + 1];
      const dx = ring[i] - ax, dy = ring[i + 1] - ay;
      if ((ay > y) !== (ring[i + 1] > y) && x < ax + dx * (y - ay) / dy) inside = !inside;
      const lengthSquared = dx * dx + dy * dy;
      const t = lengthSquared ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / lengthSquared)) : 0;
      distance = Math.min(distance, Math.hypot(x - ax - t * dx, y - ay - t * dy));
    }
  }
  return {id, period, source, inside, projectedDistanceToShoreMetres: Math.round(distance * 111320 / K)};
});
console.log(JSON.stringify(results, null, 2));
