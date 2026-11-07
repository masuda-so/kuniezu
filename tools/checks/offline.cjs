/* UI・サーバーを起動せず、構文・保存と支城処理を検証する。 */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),game=path.join(root,'kuniezu/static/kuniezu');
for(const f of fs.readdirSync(game).filter(f=>f.endsWith('.js')))new vm.Script(fs.readFileSync(path.join(game,f),'utf8'),{filename:f});
for(const match of fs.readFileSync(path.join(root,'kuniezu/templates/index.html'),'utf8').matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(match[1],{filename:'index.html inline script'});
console.log('PASS: JavaScript syntax');
const storage=require(path.join(game,'storage.js'));
const map=new Map(),mem={setItem:(k,v)=>map.set(k,v)},state={x:'日本語',t:42};
assert.equal(storage.write(mem,'test',state,'meta').ok,true);assert.deepEqual(JSON.parse(map.get('test')),state);
assert.equal(storage.write({setItem(){throw new Error('quota')}},'test',state,'meta').ok,false);
assert.equal(storage.write({setItem(k,v){if(k.endsWith('-meta'))throw Error('quota');map.set(k,v)}},'partial',state,'meta').ok,true);
assert.deepEqual(storage.decode(storage.encode(state)),state);assert.deepEqual(storage.decode(JSON.stringify(state)),state);
assert.throws(()=>storage.decode('{'));assert.throws(()=>storage.decode('{"format":"kuniezu","version":99}'));
console.log('PASS: storage success, quota failure, metadata failure, import/export, invalid file');
const geo=require(path.join(game,'territory.js'));
const area=r=>Math.abs(r.reduce((v,_,i)=>i%2?v:v+r[i]*r[(i+3)%r.length]-r[(i+2)%r.length]*r[i+1],0))/2;
const square=[[[0,0,10,0,10,10,0,10]]];const cells=geo.split(square,[{x:2,y:5},{x:8,y:5}]);
assert.equal(cells.length,2);assert.equal(area(cells[0].polygons[0][0]),50);assert.equal(area(cells[1].polygons[0][0]),50);
const coincident=geo.split(square,[{x:5,y:5},{x:5,y:5}]);assert.equal(coincident[1].polygons.length,0);
const donut=geo.split([[[0,0,10,0,10,10,0,10],[4,4,4,6,6,6,6,4]]],[{x:2,y:5},{x:8,y:5}]);
assert.equal(donut.reduce((n,c)=>n+c.polygons.reduce((a,p)=>a+area(p[0])-p.slice(1).reduce((b,r)=>b+area(r),0),0),0),96);
console.log('PASS: clipped territories area, duplicate seeds, lake/hole preservation');
require('node:child_process').execFileSync(process.execPath,[path.join(__dirname,'history-focus.cjs')],{stdio:'inherit'});

require('./map-layer-notifications.cjs');
