/* 読込の機構を孤立した状態で検査。人工イベントを史実の根拠には使わない。 */
const assert=require('node:assert/strict');
const {G,TK,TKClockMigration:M}=require('./history-focus.cjs').model();
const clone=x=>JSON.parse(JSON.stringify(x)),distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
G.newGame('s1560','oda');G.fixHist();G.setS(G.S());
const current=G.S(),originalEvents=TK.HIST;
function legacy(){const s=clone(current);delete s.clockVersion;s.units=[];for(const g of s.gens){g.unit=null;g.tr=null;}return s;}

// 表示キャッシュがない軍。31日を含む区間で補間率の違いを再現する。
try{
 const s=legacy(),u=clone(current.units[0]);u.gens=[];u.commanders=['時計検査軍'];u.until='時計検査の着陣';u.historyTitle=u.until;u.depart=[1560,5,20];u.arrive=[1560,6,20];u.hist=true;u.mission='show';
 u.schedule={...u.schedule,key:u.until,start:19,end:49};delete u.visualTravel;delete u.visualRouteLine;
 s.units=[u];s.y0=1560;s.m0=5;s.t=34;s.visualFraction=.375;s.movementGeometryVersion=27;
 TK.HIST=[...originalEvents,{d:u.arrive.slice(),k:'note',title:u.until,text:'検査専用'}].sort((a,b)=>a.d[0]-b.d[0]||a.d[1]-b.d[1]||a.d[2]-b.d[2]);
 G.setS(s);G._visualSampleTime=s.t+s.visualFraction;const before=G.historyPoint(s.units[0]);G._visualSampleTime=undefined;G.setS(current);
 const raw=JSON.stringify(s),live=JSON.stringify(current),cache={test:true};G._lr=cache;
 const p=M.prepare(G,TK,s);assert.equal(JSON.stringify(s),raw);assert.equal(G.S(),current);assert.equal(JSON.stringify(current),live);assert.equal(G._lr,cache);
 G.setS(p.state);G._visualSampleTime=p.newSampleTime;
 assert(distance(G.historyPoint(p.state.units[0]),before)<1e-7,'native without visualTravel stays at the same point');
 assert(p.state.clockMigrationDisplay.documentedBridges[u.id]);
 console.log('PASS: native without display cache, current-state isolation and lastRef cache');
}finally{G._visualSampleTime=undefined;TK.HIST=originalEvents;G.setS(current);}

// 日内の参考移動は翌日まで引き延ばさず、元の表示区間の終わりを使う。
try{
 const s=legacy();G.setS(s);s.t=G.evT({d:TK.lunarDate(1572,5,4)});s.visualFraction=0;
 let u=G.documentedArmies().find(u=>u.record?.id==='kizakibaru-local');assert(u);
 const interval=G.displayTravelInterval(u),duration=interval.end-interval.start;s.visualFraction=duration/2;
 G._visualSampleTime=s.t+s.visualFraction;const before=G.historyPoint(u);G._visualSampleTime=undefined;G.setS(current);
 const p=M.prepare(G,TK,s);G.setS(p.state);G._visualSampleTime=p.newSampleTime;
 u=G.documentedArmies().find(u=>u.record?.id==='kizakibaru-local');const b=p.state.clockMigrationDisplay.documentedBridges[u.id];
 assert(distance(G.historyPoint(u),before)<1e-7);
 assert(Math.abs(b.end-p.newNow-duration)<1e-9,'same intraday arrival');
 G._visualSampleTime=b.end;assert.equal(G.marchPhase(u).key,'camp');
 assert(distance(G.historyPoint(u),b.line.at(-1))<1e-7,'no jump when bridge ends');
 console.log('PASS: Kizakibaru intraday interval, position and endpoint');
}finally{G._visualSampleTime=undefined;G.setS(current);}

// 存在しなかった2月30日から3月1日を選んだ場合の、未処理イベント。
try{
 const s=legacy();s.y0=1561;s.m0=2;s.t=29;s.visualFraction=.375;s.hi=0;s.chron=[];s.log=[];
 TK.HIST=[{d:[1561,3,1],k:'note',title:'時計検査の3月1日',text:'検査専用'}];
 const p=M.prepare(G,TK,s,{y:1561,m:3,d:1});G.setS(p.state);
 assert.equal(G.S().hi,0);const t=G.S().t;M.catchUp(G,TK);
 assert.equal(G.S().t,t);assert.equal(G.S().hi,1);assert.equal(G.S().chron.length,1);assert.equal(G.S().chron[0].t,t);
 assert.deepEqual(clone(G.date()),{y:1561,m:3,d:1});M.catchUp(G,TK);assert.equal(G.S().chron.length,1);
 console.log('PASS: selected-day event applied on that day once, without advancing the clock');
}finally{TK.HIST=originalEvents;G.setS(current);}
