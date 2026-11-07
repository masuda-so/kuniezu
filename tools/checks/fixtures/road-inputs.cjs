'use strict';
/* legacy = ina/maritime適用後・旧cleanup前の比較入力。正本や配信を再生成しない。 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..'),legacyFile=process.env.GAME_LEGACY_ROADS||path.join(root,'data/inputs/road-vector-migration/legacy-comparison-lines.json'),canonicalFile=process.env.GAME_CANONICAL_ROADS||path.join(root,'kuniezu/map/physical/roads-reference.geojson');let legacy,canonical;
function legacyRoads(){if(!legacy){legacy=JSON.parse(fs.readFileSync(legacyFile,'utf8'));assert.ok(legacy&&typeof legacy==='object'&&!Array.isArray(legacy),'legacy comparison dictionary');for(const line of Object.values(legacy))assert.ok(Array.isArray(line)&&line.length>=2&&line.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)),'legacy comparison coordinates');}return legacy;}
function legacyRoad(name){const line=legacyRoads()[name];assert.ok(line,'missing legacy comparison: '+name);return line;}
function canonicalRoad(name){if(!canonical){const data=JSON.parse(fs.readFileSync(canonicalFile,'utf8'));assert.equal(data.type,'FeatureCollection');canonical=new Map(data.features.map(f=>[f.properties.name,f]));assert.equal(canonical.size,data.features.length,'canonical road names unique');}const f=canonical.get(name);assert.ok(f&&f.geometry.type==='LineString','missing canonical road: '+name);return f;}
function sameCoordinates(a,b,epsilon=1e-10){assert.equal(a.length,b.length,'coordinate counts');for(let i=0;i<a.length;i++)assert.ok(Math.hypot(a[i][0]-b[i][0],a[i][1]-b[i][1])<=epsilon,'coordinate mismatch '+i);}
function canonicalView(name,view,project){const f=canonicalRoad(name);sameCoordinates(view.pts,f.geometry.coordinates.map(p=>project(...p)),1e-9);return f;}
function hasProjectedPoint(points,p,epsilon=1e-8){return points.some(q=>Math.hypot(q[0]-p[0],q[1]-p[1])<=epsilon);}
module.exports={legacyRoads,legacyRoad,canonicalRoad,canonicalView,sameCoordinates,hasProjectedPoint,canonicalFile,legacyFile};
