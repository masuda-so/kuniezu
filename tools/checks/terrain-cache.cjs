/* 同倍率の長距離パンでタイルが無制限に残らないかを、ネット接続なしで検査。 */
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const jobs=[];
const ctx={drawImage(){},getImageData(){return {data:new Uint8ClampedArray(256*256*4)};},createImageData(){return {data:new Uint8ClampedArray(256*256*4)};},putImageData(){},save(){},restore(){},clip(){}};
class Image{set src(v){jobs.push(()=>this.onload());}}
const TKP=require('../../game/map-projection.js');// 地図平面は円錐図法。固定具にも同じ投影の API を渡す
const c=vm.createContext({Image,console,document:{createElement(){return {getContext(){return ctx;}};}},TKGEO:{K:TKP.legacy.K,CX:TKP.legacy.CX,LON0:TKP.legacy.LON0,LAT0:TKP.legacy.LAT0,project:TKP.project,unproject:TKP.unproject,plane:TKP.plane}});c.window=c;
vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../../game/terrain-tiles.js'),'utf8'),c);
const pj=(lon,lat)=>TKP.project(lon,lat);
for(let i=0;i<80;i++){
 const [x,y]=pj(125+i*.2,35),view=[x-40,y-35,x+40,y+35];
 c.TKTerrain.draw(ctx,view,8,1);while(jobs.length)jobs.shift()();c.TKTerrain.draw(ctx,view,8,1);
 assert.ok(c.TKTerrain.stats().cached<=256,'retains too many same-zoom tiles');
}
assert.equal(c.TKTerrain.stats().failed,0);assert.ok(c.TKTerrain.stats().loaded>256);
console.log('PASS: same-zoom pan cache bounded; modern terrain shading stays synchronous per completed tile',c.TKTerrain.stats());
