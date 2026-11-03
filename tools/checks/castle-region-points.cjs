'use strict';
const {G, TKGEO} = require('./history-focus.cjs').model();

function inRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
    const [ax, ay, bx, by] = [ring[j], ring[j + 1], ring[i], ring[i + 1]];
    if ((ay > y) !== (by > y) && x < ax + (bx - ax) * (y - ay) / (by - ay)) inside = !inside;
  }
  return inside;
}

function inPolygons(x, y, polygons) {
  return polygons.some(rings => rings.reduce((inside, ring) => inside !== inRing(x, y, ring), false));
}

const regions = Object.entries(TKGEO.terr);
const issues = [];
for (const {id, x, y} of G.CL) {
  const matching = regions.filter(([, polygons]) => inPolygons(x, y, polygons)).map(([key]) => key);
  const water = !inPolygons(x, y, TKGEO.land) ? 'sea' :
    inPolygons(x, y, TKGEO.lakes) ? 'lake' : null;
  if (!water && matching.length === 1 && matching[0] === id) continue;
  issues.push({
    id,
    longitude: TKGEO.LON0 + x / TKGEO.K / TKGEO.CX,
    latitude: TKGEO.LAT0 - y / TKGEO.K,
    reason: water || (matching.length === 0 ? 'unassigned' :
      matching.length > 1 ? 'overlap' : 'other-castle'),
    regions: matching,
  });
}
console.log(JSON.stringify({checked: G.CL.length, issues}, null, 2));
if (process.argv.includes('--strict') && issues.length) process.exitCode = 1;
