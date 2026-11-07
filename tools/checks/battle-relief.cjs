'use strict';
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');const c={window:{}};vm.createContext(c);vm.runInContext(fs.readFileSync(require('node:path').resolve(__dirname,'../../kuniezu/static/kuniezu/battle-atlas.js'),'utf8'),c);const shade=c.window.TKBattleAtlas.shadeRelief;
function plane(east,south,n=5){const bounds=[136.5,35.01,136.51,35],dx=.01*111320*Math.cos(35.005*Math.PI/180)/(n-1),dy=.01*111320/(n-1);return{width:n,height:n,bounds,values:Float64Array.from({length:n*n},(_,i)=>500+east*(i%n)*dx+south*Math.floor(i/n)*dy)};}
const flat=plane(0,0),before=Array.from(flat.values),p=shade(flat);assert(p.pixels.every((v,i)=>i%4===3?v===255:v===p.pixels[i%4]));assert.deepEqual(Array.from(flat.values),before);
const nw=shade(plane(.1,.1)),se=shade(plane(-.1,-.1));const center=(2*5+2)*4;assert(nw.pixels[center]>se.pixels[center],'NW-facing slope is lighter at equal relative elevation');
for(const n of [3,5,9]){const s=shade(plane(.1,.1,n));assert(s.dx>0&&s.dy>0);assert.equal(s.pixels.length,n*n*4);assert(s.pixels.every(Number.isFinite));}
assert.throws(()=>shade({width:1,height:1,values:[1],bounds:[0,1,1,0]}));console.log('PASS: flat uniform, NW direction, physical spacing/edge derivatives, sample size, original heights unchanged');

const rect=c.window.TKBattleAtlas.reliefRasterRect;
for(const [nx,ny,W,H]of [[160,160,940,658],[192,192,335,235],[5,3,700,400]]){
 const [x,y,w,h]=rect(nx,ny,W,H);
 for(let i=0;i<nx;i++)assert(Math.abs(x+(i+.5)*w/nx-i*W/(nx-1))<1e-10,'DEM column centers retain source position');
 for(let j=0;j<ny;j++)assert(Math.abs(y+(j+.5)*h/ny-j*H/(ny-1))<1e-10,'DEM row centers retain source position');
}
console.log('PASS: native DEM sample centers align at every row/column, including edges');
