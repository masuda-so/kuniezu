/* 同倍率の長距離パンでタイルが無制限に残らないかを、ネット接続なしで検査。 */
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const jobs=[];
const ctx={drawImage(){},getImageData(){return {data:new Uint8ClampedArray(256*256*4)};},createImageData(){return {data:new Uint8ClampedArray(256*256*4)};},putImageData(){},save(){},restore(){},clip(){}};
class Image{set src(v){jobs.push(()=>this.onload());}}
const c=vm.createContext({Image,console,document:{createElement(){return {getContext(){return ctx;}};}},TKGEO:{K:200,CX:Math.cos(Math.PI/5),LON0:129.2,LAT0:41.75}});c.window=c;
vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../../kuniezu/static/kuniezu/terrain-tiles.js'),'utf8'),c);
const pj=(lon,lat)=>[(lon-129.2)*200*Math.cos(Math.PI/5),(41.75-lat)*200];
for(let i=0;i<80;i++){
 const [x,y]=pj(125+i*.2,35),view=[x-40,y-35,x+40,y+35];
 c.TKTerrain.draw(ctx,view,8,1);while(jobs.length)jobs.shift()();c.TKTerrain.draw(ctx,view,8,1);
 assert.ok(c.TKTerrain.stats().cached<=256,'retains too many same-zoom tiles');
}
assert.equal(c.TKTerrain.stats().failed,0);assert.ok(c.TKTerrain.stats().loaded>256);
console.log('PASS: same-zoom pan cache bounded; modern terrain shading stays synchronous per completed tile',c.TKTerrain.stats());
