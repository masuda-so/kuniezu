const assert=require('node:assert/strict');
const {model}=require('./history-focus.cjs');
const before=model({skip:['hayashima-upland.js']}), after=model();
function inside(polygons,[x,y]){
 return polygons.some(poly=>poly.reduce((inPolygon,ring)=>{
  let inRing=false;
  for(let i=0,j=ring.length-2;i<ring.length;j=i,i+=2){
   if((ring[i+1]>y)!==(ring[j+1]>y)&&
      x<(ring[j]-ring[i])*(y-ring[i+1])/(ring[j+1]-ring[i+1])+ring[i])inRing=!inRing;
  }
  return inPolygon!==inRing;
 },false));
}
const shrine=after.G.PJ(133.818420,34.599915);
assert.ok(!inside(before.TKGEO.land,shrine));
assert.ok(inside(after.TKGEO.land,shrine));
assert.ok(inside(after.TKGEO.japanLand,shrine));
let added=0;
for(let lon=133.8164;lon<133.8209;lon+=.0001){
 for(let lat=34.5986;lat<34.6022;lat+=.0001){
  const point=after.G.PJ(lon,lat);
  if(!inside(after.TKGEO.land,point)||inside(before.TKGEO.land,point))continue;
  const owners=Object.entries(after.TKGEO.terr).filter(([,polys])=>inside(polys,point));
  assert.deepEqual(owners.map(([id])=>id),['bmatsuyama']);
  added++;
 }
}
assert.ok(added>0);
assert.ok(!inside(after.TKGEO.land,after.G.PJ(133.81842,34.592)));
console.log('PASS Hayashima upland, Japan terrain coverage, exclusive province, and adjacent lowland:',added);
