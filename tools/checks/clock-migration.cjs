const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const c=vm.createContext({});c.window=c;
for(const file of ['calendar.js','clock-migration.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../../kuniezu/static/kuniezu',file),'utf8'),c);
const plan=c.TKClockMigration.plan;
const s={y0:1561,m0:2,t:29,visualFraction:.375,hi:42,pm:{43:1},hsig:123,
 units:[{troops:12000,food:6000,days:9,marchDays:8,seg:1,pos:.4,releaseAt:32,schedule:{start:20,end:35},visualTravel:{line:[[0,0],[10,0]],start:20,end:35}}],
 gens:[{tr:{line:[[0,0],[10,0]],t0:20,t1:35},exile:50}],
 works:{a:{start:25,end:32}},improvements:{projects:[{start:25,end:32}]},
 log:[{t:29,s:'旧保存の表示文字列',msg:'記録'}],chron:[],ally:{a_b:1e9},clans:{a:{gold:100,food:200}},castles:{a:{owner:'a',troops:1000}},
 personLocationDisplay:{version:1,bridges:{a:{line:[[0,0],[10,0]],start:20,end:35}}}};
const before=JSON.stringify(s);
assert.throws(()=>plan(s),e=>e.code==='clock-date-selection');
assert.equal(JSON.stringify(s),before);
for(const day of [{y:1561,m:2,d:28},{y:1561,m:3,d:1}]){
 const p=plan(s,day),n=p.state;
 assert.equal(JSON.stringify(s),before,'source remains unchanged');
 assert.equal(n.clockVersion,1);assert.equal(n.visualFraction,.375);
 assert.equal(n.works.a.end-n.t,3);assert.equal(n.t-n.works.a.start,4);
 assert.equal(n.improvements.projects[0].end-n.t,3);
 assert.equal(n.units[0].releaseAt-n.t,3);assert.equal(n.gens[0].exile-n.t,21);
 for(const key of ['clans','castles','ally','hi','pm','hsig'])assert.equal(JSON.stringify(n[key]),JSON.stringify(s[key]),key);
 for(const key of ['troops','food','days','marchDays','seg','pos'])assert.equal(n.units[0][key],s.units[0][key],key);
 assert.equal(n.log[0].s,s.log[0].s);assert.ok(p.invalidTimestamps.some(r=>r.date.d===30));
 for(const [old,row,a,b] of [[s.units[0].visualTravel,n.units[0].visualTravel,'start','end'],[s.gens[0].tr,n.gens[0].tr,'t0','t1'],[s.personLocationDisplay.bridges.a,n.personLocationDisplay.bridges.a,'start','end']]){
  assert.ok(Math.abs((p.oldSampleTime-old[a])/(old[b]-old[a])-(p.newSampleTime-row[a])/(row[b]-row[a]))<1e-12,'same point on the display line');
 }
}
assert.throws(()=>plan(s,{y:1561,m:2,d:27}),/実在日/);
assert.throws(()=>plan({...s,clockVersion:99}),/対応/);
const valid={...s,t:30},p=plan(valid);
assert.equal(p.dates.requiresSelection,false);
assert.equal(p.newNow,c.TKCalendar.toJD(1561,3,1)-c.TKCalendar.toJD(1561,2,1));
const twice=plan(p.state);assert.equal(twice.changed,false);assert.equal(JSON.stringify(twice.state),JSON.stringify(p.state));
console.log('PASS: nonmutating clock plan, date choice, deadlines, resources, counters and idempotence');

const army={...s,units:[{id:1,hist:true,mission:'show',until:'arrival',depart:[1561,2,21],arrive:[1561,3,6],schedule:{start:20,end:35},visualTravel:{line:[[0,0],[10,0]],start:20,end:35}}]};
const historical=plan(army,{y:1561,m:2,d:28},{events:[{title:'arrival',k:'take',d:[1561,3,6]}]});
assert.equal(historical.state.units[0].schedule.end,c.TKCalendar.toJD(1561,3,6)-c.TKCalendar.toJD(1561,2,1));
assert.equal(historical.state.units[0].visualTravel.end,historical.state.units[0].schedule.end);
console.log('PASS: source arrival remains canonical while display progress remains continuous');
const returning={...army,units:[{...army.units[0],state:'return',mission:'return',until:null,schedule:{start:0,end:10}}]};
const ret=plan(returning,{y:1561,m:2,d:28},{events:[{title:'arrival',k:'take',d:[1561,3,6]}]});
assert.equal(ret.state.units[0].visualTravel.end-ret.newNow,35-s.t,'return is not pinned to the stale outward schedule');
const samples=[{id:'documented:test',nextDate:[1561,3,6],line:[[3,0],[5,0],[5,5]]}];
const withBridge=plan(s,{y:1561,m:2,d:28},{documentedSamples:samples});
const bridge=withBridge.state.clockMigrationDisplay.documentedBridges['documented:test'];
assert.equal(bridge.start,withBridge.newSampleTime);
assert.equal(bridge.end,c.TKCalendar.toJD(1561,3,6)-c.TKCalendar.toJD(1561,2,1));
assert.equal(bridge.historicalObservation,false,'save continuity is not a historical observation');
assert.equal(JSON.stringify(bridge.line),JSON.stringify(samples[0].line));
const overdue=plan(s,{y:1561,m:3,d:1},{documentedSamples:[{...samples[0],nextDate:[1561,3,1]}]});
assert.ok(overdue.overdueMotion.includes('documented:test'),'conflicting arrival cannot silently become a delayed march');
console.log('PASS: documented display bridge, source endpoint and overdue conflict detection');
const storage=require('../../kuniezu/static/kuniezu/storage.js'),map=new Map();
const memory={getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value)};
const text=' {"name":"日本語", "t":29} \n';
const backup=storage.backupClock(memory,text);assert.equal(backup.ok,true);assert.equal(map.get(backup.key),text);
assert.equal(storage.backupClock(memory,text).reused,true);assert.equal(map.size,1);
map.set(backup.key,'preserved other contents');
const collision=storage.backupClock(memory,text);assert.equal(collision.ok,true);assert.notEqual(collision.key,backup.key);
assert.equal(map.get(backup.key),'preserved other contents');assert.equal(map.get(collision.key),text);
assert.equal(storage.backupClock({getItem:()=>null,setItem(){throw Error('quota');}},text).ok,false);
assert.equal(storage.backupClock({getItem:()=>null,setItem(){}},text).ok,false);
console.log('PASS: original-text backup, reuse, collisions, quota and read-back failure');
