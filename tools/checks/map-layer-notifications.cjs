/* 読込の遅い地図層も、停止した画面の下地を更新して描画を起こす。 */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(process.argv[2]||path.join(__dirname,'../../kuniezu/static/kuniezu/ui.js'),'utf8');
const from=source.indexOf('window.TKRaster?.onChange('),to=source.indexOf('// 陸だけの描画層',from);
assert.ok(from>=0&&to>from,'map notification registration block exists');
const layers=['TKRaster','TKRelief','TKEdges','TKRivers'];
function check(available){
 const callbacks=new Map();let syncs=0,wakes=0;
 const U={baseDirty:false,wakeLoop(){wakes++;}};
 const window=Object.fromEntries(available.map(name=>[name,{onChange(fn){callbacks.set(name,fn);}}]));
 vm.runInNewContext(source.slice(from,to),{window,U,syncContToSource(){syncs++;}});
 assert.deepEqual([...callbacks.keys()],available,'all available layers register independently of comments');
 assert.equal(syncs,1,'initial source bounds sync');
 for(const name of available){
  U.baseDirty=false;const beforeSync=syncs,beforeWake=wakes;
  callbacks.get(name)();
  assert.equal(U.baseDirty,true,name+' invalidates the base after a delayed load');
  assert.equal(wakes,beforeWake+1,name+' wakes the stopped render loop');
  assert.equal(syncs,beforeSync+(name==='TKRaster'?1:0),name+' bounds synchronization');
 }
}
check(layers);check(['TKRaster']);check([]);
console.log('PASS: all four map layers notify redraw after late loads; optional layers and initial bounds sync retained');
