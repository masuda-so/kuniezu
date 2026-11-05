const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const jobs=[],paint=[];let readSource;
class Image{set src(s){this.url=s;if(s){const done=()=>this.onload?.();done.url=s;done.image=this;jobs.push(done);}}}
const document={createElement(){const cv={};cv.getContext=()=>({drawImage(im){cv.source=im.source||im.url;},getImageData(){readSource=cv.source;return {data:new Uint8ClampedArray(256*256*4)};},createImageData(){cv.source=readSource;return {data:new Uint8ClampedArray(256*256*4)};},putImageData(){}});return cv;}};
const c=vm.createContext({Image,document,TKGEO:{K:200,CX:Math.cos(Math.PI/5),LON0:129.2,LAT0:41.75}});c.window=c;
vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../../kuniezu/static/kuniezu/terrain-tiles.js'),'utf8'),c);
const ctx={save(){},restore(){},clip(){},drawImage(im){paint.push(im);}},x=(136.7-129.2)*200*Math.cos(Math.PI/5),y=(41.75-35.3)*200,view=[x-35,y-35,x+35,y+35];
c.TKTerrain.draw(ctx,view,.05,1,null,{});while(jobs.length)jobs.shift()();paint.length=0;c.TKTerrain.draw(ctx,view,.05,1,null,{});assert.ok(paint.length>0);
const overview=new Set(paint);c.TKTerrain.draw(ctx,view,8,1,null,{});
// Finish only the intermediate layer. Fine requests deliberately remain pending.
for(let i;(i=jobs.findIndex(j=>j.url.includes('/terrarium/8/')))>=0;)jobs.splice(i,1)[0]();
paint.length=0;c.TKTerrain.draw(ctx,view,8,1,null,{});
assert.ok(paint.some(im=>im.source?.includes('/terrarium/8/')),'intermediate terrain appears before fine tiles');
const intermediate=new Set(paint),revision=c.TKTerrain.stats().revision;
const fine=jobs.findIndex(j=>j.url.includes('/terrarium/'+c.TKTerrain.stats().zoom+'/'));assert.ok(fine>=0);jobs.splice(fine,1)[0]();
assert.equal(c.TKTerrain.stats().revision,revision,'partial fine tiles must not invalidate unchanged background');paint.length=0;c.TKTerrain.draw(ctx,view,8,1,null,{});
assert.ok(paint.length>0);assert.ok(paint.every(src=>intermediate.has(src)),'partial fine tiles must not replace the intermediate layer');
while(jobs.length)jobs.shift()();paint.length=0;c.TKTerrain.draw(ctx,view,8,1,null,{});assert.ok(paint.length>0);assert.ok(paint.some(src=>!overview.has(src)),'once ready, show detail');assert.ok(paint.some(src=>overview.has(src)),'retain parent underneath failed or transparent detail');
console.log('PASS: partial detailed tiles retain the overview; complete layers switch together without mixed resolution rectangles');

c.TKTerrain.draw(ctx,view,16,1,null,{});c.TKTerrain.draw(ctx,view,.05,1,null,{});while(jobs.length)jobs.shift()();assert.equal(c.TKTerrain.stats().running,0);assert.equal(c.TKTerrain.stats().pending,0);console.log("PASS: zoom-out cancels obsolete detail requests without leaving dead queued tiles");

// Same-zoom regional pan must drop old queued/detail requests immediately.
c.TKTerrain.draw(ctx,view.map((v,i)=>v+(i%2?0:-300)),8,1,null,null);
const oldJobs=jobs.slice(),other=view.map((v,i)=>v+(i%2?0:-1200));
c.TKTerrain.draw(ctx,other,8,1,null,null);
assert.ok(oldJobs.some(j=>j.image.onload===null),'old view requests are cancelled');
while(jobs.length)jobs.shift()();
assert.equal(c.TKTerrain.stats().running,0);assert.equal(c.TKTerrain.stats().pending,0);
console.log('PASS: regional pan cancels obsolete in-flight requests without leaking queue slots');

// Coverage is data, not a region-specific rendering branch.
c.TKTerrain.setCoverage('gsi',[[[100000,100000,100010,100000,100010,100010,100000,100010]]]);
paint.length=0;c.TKTerrain.draw(ctx,view,8,1,null,{});
assert.ok(paint.length>0);assert.ok(paint.every(im=>!im.source?.includes('/dem_png/')),'provider outside coverage is not drawn');
assert.ok(jobs.every(j=>!j.url.includes('/dem_png/')),'provider outside coverage is not requested');
while(jobs.length)jobs.shift()();console.log('PASS: shared coverage filtering excludes nonintersecting provider requests and cached imagery');
