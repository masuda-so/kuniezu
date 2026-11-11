/* 連続する実日と旧時計の非実在日を区別する。ゲーム進行や保存を変更しない。 */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const c=vm.createContext({});c.window=c;
vm.runInContext(fs.readFileSync(path.join(__dirname,'../../kuniezu/static/kuniezu/calendar.js'),'utf8'),c);
const {toJD,fromJD,legacyDate}=c.TKCalendar;
const tuple=jd=>{const d=fromJD(jd);return [d.y,d.m,d.d];};
assert.equal(toJD(1582,10,15),2299161);
assert.equal(toJD(1582,10,4),2299160);
assert.deepEqual(tuple(toJD(1582,10,4)+1),[1582,10,15]);
assert.deepEqual(tuple(toJD(1561,1,31)+1),[1561,2,1]);
assert.deepEqual(tuple(toJD(1561,2,28)+1),[1561,3,1]);
assert.deepEqual(tuple(toJD(1560,2,28)+1),[1560,2,29]);
assert.equal(toJD(1561,6,23),2291387);
for(const d of [[1561,2,29],[1560,2,30],[1582,10,5],[1582,10,14],[1600,4,31],[1600,0,1],[1600,1,0]])assert.throws(()=>toJD(...d),/実在/);
const first=toJD(1532,1,1),last=toJD(1623,12,31);
for(let jd=first;jd<=last;jd++)assert.equal(toJD(...tuple(jd)),jd,'roundtrip '+jd);
const old=legacyDate({y0:1561,m0:2,t:29.75});
assert.deepEqual([old.y,old.m,old.d],[1561,2,30]);
assert.throws(()=>toJD(old.y,old.m,old.d),/実在/,'invalid legacy day must not be silently clamped');
for(const [date,choices] of [
 [[1561,2,30],[[1561,2,28],[1561,3,1]]],
 [[1560,2,30],[[1560,2,29],[1560,3,1]]],
 [[1582,10,10],[[1582,10,4],[1582,10,15]]]
]){
 const s={y0:date[0],m0:date[1],t:date[2]-1+.375},before=JSON.stringify(s);
 const plan=c.TKCalendar.legacyDateChoices(s);
 assert.equal(plan.requiresSelection,true);
 assert.deepEqual(Array.from(plan.choices,d=>[d.y,d.m,d.d]),choices);
 assert.equal(JSON.stringify(s),before,'choosing a date does not mutate a save');
}
assert.equal(c.TKCalendar.legacyDateChoices({y0:1561,m0:3,t:0}).requiresSelection,false);
console.log('PASS: '+(last-first+1)+' consecutive days, reform gap, leap days and invalid legacy dates');

const {G,TK}=require('./history-focus.cjs').model();
G.newGame('s1560','oda');
assert.equal(G.S().clockVersion,c.TKCalendar.version);
for(const [before,after] of [
 [[1561,1,31],[1561,2,1]],[[1561,2,28],[1561,3,1]],
 [[1560,2,28],[1560,2,29]],[[1582,10,4],[1582,10,15]]
]){
 const t=G.evT({d:before});
 assert.equal(G.evT({d:after}),t+1);
 const d=G.date(t+1);assert.deepEqual([d.y,d.m,d.d],after);
}
for(const e of TK.HIST)assert.doesNotThrow(()=>toJD(...e.d),e.title||e.k);
// 暦の版のない保存を、新時計の数値として誤読しない。
const s=G.S();delete s.clockVersion;s.y0=1561;s.m0=2;s.t=29;
const legacy=G.date();assert.deepEqual([legacy.y,legacy.m,legacy.d],[1561,2,30]);
assert.equal(G.evT({d:[1561,3,1]}),30);
console.log('PASS: new-game real clock, '+TK.HIST.length+' event dates, legacy clock discrimination');
