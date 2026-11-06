/* File export must persist the live sub-day clock, even when the menu pauses it. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),source=fs.readFileSync(path.join(root,'kuniezu/static/kuniezu/ui.js'),'utf8');
const model=require('./history-focus.cjs').model(),{G,TK,TKStorage}=model;
const block=(first,next)=>{const start=source.indexOf(first),end=source.indexOf(next,start);assert.ok(start>=0&&end>start);return source.slice(start,end);};
const exportCode=block('function exportSave()','function importSave()');
const cleanCode=block('function cleanSave(o)','function doLoad(n)');
const slotCode=block('function doSave(n)','function exportSave()');
const autoCode=block('function autosave()','setInterval(');
const helper=source.includes('function saveFraction()')?block('function saveFraction()','function doSave('):'';
(async()=>{
 for(const fraction of [.63,0,.37,.97,1]){
  G.newGame('s1560','oda');const S=G.S();S.hsig=G.histSig();S.visualFraction=0;
  const U=model.TKUI={mode:'game',speed:1,modal:'menu',acc:fraction};
  const army=S.units.find(unit=>unit.clan==='imagawa');assert.ok(army);
  const before=Array.from(G.historyPoint(army)),date=G.dstr(),troops=army.troops,deadline=army.schedule.end;
  let blob;const slots=new Map();
  const context=vm.createContext({S,U,G,TK,TKStorage,Blob,SAVE_KEY2:'test-',
   localStorage:{setItem(key,value){slots.set(key,value);}},
   URL:{createObjectURL(value){blob=value;return 'blob:test';},revokeObjectURL(){}},
   document:{createElement(){return {click(){}};}},setTimeout(){},toast(){},
  });
  vm.runInContext(helper+slotCode+exportCode+cleanCode+autoCode,context);
  vm.runInContext('exportSave()',context);assert.ok(blob,'real exportSave creates a file');
  const saved=TKStorage.decode(await blob.text());
  assert.equal(saved.visualFraction,fraction,'file must contain the live menu clock');
  context.input=saved;const next=vm.runInContext('cleanSave(input)',context);assert.ok(next);
  G.setS(next);G.fixHist();U.acc=Math.max(0,Math.min(1,next.visualFraction||0));
  const restored=G.S().units.find(unit=>unit.id===army.id),after=Array.from(G.historyPoint(restored));
  assert.ok(Math.hypot(before[0]-after[0],before[1]-after[1])<1e-8,'file import preserves march position');
  assert.equal(G.dstr(),date);assert.equal(restored.troops,troops);assert.equal(restored.schedule.end,deadline);
  context.S=G.S();assert.equal(vm.runInContext('doSave(1)',context),true);
  assert.equal(JSON.parse(slots.get('test-1')).visualFraction,fraction);
  assert.equal(vm.runInContext('autosave()',context),true);
  assert.equal(JSON.parse(slots.get('test-auto')).visualFraction,fraction);
 }
 console.log('PASS: real file, slot and autosave preserve five sub-day clocks, march position, date, troops and arrival deadline');
})().catch(error=>{console.error(error);process.exitCode=1;});
