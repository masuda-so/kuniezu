/* 格子ベクター化の面積・穴・対角接触・キーを、逆変換したセル中心で検証。 */
'use strict';
const assert=require('node:assert/strict'),{vectorize}=require('../geo/mask-vector.cjs');
const projection={origin:[0,0],stepUnits:1,K:1,CX:1,LON0:0,LAT0:0,stepMetres:100};
const signed=ring=>{let sum=0;for(let i=0;i<ring.length-1;i++)sum+=ring[i][0]*ring[i+1][1]-ring[i+1][0]*ring[i][1];return sum/2;};
const inside=(ring,[x,y])=>{let yes=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [ax,ay]=ring[i],[bx,by]=ring[j];if((ay>y)!==(by>y)&&x<ax+(bx-ax)*(y-ay)/(by-ay))yes=!yes;}return yes;};
function check(rows){
 const height=rows.length,width=rows[0].length,values=rows.flat(),keys=['castle:a','castle:b'];
 const result=vectorize({width,height,values},projection,[0,0,width,height],keys);
 for(const feature of result.features){
  let area=0;for(const polygon of feature.geometry.coordinates){assert.ok(signed(polygon[0])>0,'counterclockwise exterior');polygon.slice(1).forEach(r=>assert.ok(signed(r)<0,'clockwise holes'));polygon.forEach(r=>{assert.deepEqual(r[0],r.at(-1));assert.equal(new Set(r.slice(0,-1).map(p=>p.join(','))).size,r.length-1,'simple ring without repeated internal vertices');area+=signed(r);});}
  assert.equal(area,feature.properties.cells,'exact adopted pixel area');
 }
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const hits=result.features.filter(f=>f.geometry.coordinates.some(p=>inside(p[0],[x+.5,-y-.5])&&!p.slice(1).some(h=>inside(h,[x+.5,-y-.5]))));
  assert.equal(hits.length,values[y*width+x]?1:0);if(hits.length)assert.equal(hits[0].properties.maskValue,values[y*width+x]);
 }
 return result;
}
check([[0]]);check([[1]]);check([[1,1],[1,1]]);
assert.equal(check([[1,0],[0,1]]).features[0].geometry.coordinates.length,2,'diagonal cells stay separate');
const donut=check([[1,1,1],[1,0,1],[1,1,1]]);assert.equal(donut.features[0].geometry.coordinates[0].length,2,'hole retained');
check([[1,2,0],[2,1,2],[0,2,1]]);check([[1,1,1,1,1],[1,0,0,0,1],[1,0,1,0,1],[1,0,0,0,1],[1,1,1,1,1]]);
check([[1,1,1],[1,0,1],[1,1,0]]);
// Exhaust all 3x3 binary masks, including narrow corners and touching holes.
for(let mask=0;mask<512;mask++)check(Array.from({length:3},(_,y)=>Array.from({length:3},(_,x)=>(mask>>(y*3+x))&1)));
assert.throws(()=>vectorize({width:1,height:1,values:[3]},projection,[0,0,1,1],['a']),/outside keys/);
assert.throws(()=>vectorize({width:1,height:1,values:[1]},projection,[0,0,2,1],['a']),/window/);
console.log('PASS: exact grid areas, inverse cell classification, winding, holes, diagonal cells and all 512 binary 3x3 masks');
