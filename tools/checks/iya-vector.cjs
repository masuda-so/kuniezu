'use strict';
// 旧画像版の採用範囲の中心点が、現行ベクターでも水面かを検査する。
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),V=require('../../kuniezu/static/kuniezu/vector-map.js');
const recipe=require('../../data/research/iya-shoreline/pixel-reconstruction.json');
const load=name=>JSON.parse(fs.readFileSync(path.join(root,'kuniezu/map/physical',name+'.geojson')));
const land=V.create({project:(x,y)=>[x,y]});land.replace([load('land')]);
const collection=load('water'),lake=collection.features.find(f=>f.id==='water:codh-lake:511');assert.ok(lake);
// contains()はland用なので、同じ地形の点包含検査に限りroleだけ変える。
const water=V.create({project:(x,y)=>[x,y]});water.replace([{...collection,features:[{...lake,properties:{...lake.properties,drawRole:'land'}}]}]);
const coordinate=(column,row)=>{const p=recipe.projection,x=p.origin[0]+(column+.5)*p.stepUnits,y=p.origin[1]+(row+.5)*p.stepUnits;return [p.LON0+x/(p.K*p.CX),p.LAT0-y/p.K];};
const points=[];for(const [row,a,b] of recipe.operations[0].runs)for(let column=a;column<b;column++)points.push(coordinate(column,row));
assert.equal(points.length,319);assert.equal(points.length,recipe.operations[0].expectedPixels);
const cases=[];
for(const date of [[1560,1,1],[1585,1,1],[1615,6,10]]){
  let wet=0,dry=0;for(const [x,y] of points){wet+=Number(water.contains(x,y,date));dry+=Number(land.contains(x,y,date));}
  assert.equal(wet,319);assert.equal(dry,0);
  const controls=recipe.unchangedControls.map(({xy,key})=>{const [x,y]=coordinate(...xy),expectedLand=!key.startsWith('lake:');assert.equal(land.contains(x,y,date),expectedLand);if(!expectedLand)assert.ok(water.contains(x,y,date));return {xy,key,land:expectedLand};});
  cases.push({date,water:wet,land:dry,controls});
}
const result={basisCommit:'3885980568459d733987fc372388f27eaa7483e4',scope:'319 historical proposal cell centers and four controls; not complete cell area or exact Sengoku shoreline',sources:Object.fromEntries(['land','water'].map(name=>[name,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'kuniezu/map/physical',name+'.geojson'))).digest('hex')])),cases};
if(process.env.GAME_TEST_OUTPUT){fs.mkdirSync(process.env.GAME_TEST_OUTPUT,{recursive:true});fs.writeFileSync(path.join(process.env.GAME_TEST_OUTPUT,'iya-vector.json'),JSON.stringify(result,null,2)+'\n');}
console.log('PASS: Iya 319 former correction centers remain water/outside land, four controls, three dates');
