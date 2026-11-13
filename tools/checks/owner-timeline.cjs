/* 城の持ち主の区間（history/owners.js）がゲームを変えることを確かめる。
   既定（TK.OWNER_TIMELINE=null）では年表を変えず、固定の書き出し（fixtures/owners-trial.js、東海の試行の 10 記録から
   manage.py export_game_data で作ったもの）では、記録の城だけが記録の日に持ち主を替えることを見る。
   引数 --years=N で並べて流す年数（既定 5。吉田城の記録の日 1564-7-28 を含む）。手元で長く流すときは --years=40 など。 */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {model}=require('./history-focus.cjs');
const years=Number((process.argv.find(a=>a.startsWith('--years='))||'--years=5').split('=')[1]);
const trial=fs.readFileSync(path.join(__dirname,'fixtures/owners-trial.js'),'utf8');
const clear=G=>{const s=G.S();s.evQ=[];s.sceneQ=[];s.battleQ=[];s.propQ=[];};
const until=(G,d)=>{const end=G.evT({d});while(G.S().t<end){G.day();clear(G);}};

// 1. 既定では何もしない。
{const {G,TK}=model();assert.equal(TK.OWNER_TIMELINE,null);const before=G.histSig();G.newGame('s1560','oda');
 assert.equal(TK.HIST_BEFORE_OWNER_TIMELINE,undefined);assert.equal(G.histSig(),before);assert.equal(G.ownerInterval,undefined);}

// 2. 年表より遅い記録：年表の早い受け渡しから城を抜き、記録の日に渡す（架空の区間。年表では 1560-9-20 に浅井が佐和山を取る）。
{const late='window.TK=window.TK||{};TK.OWNER_TIMELINE={version:1,inputsSha256:"test",castles:{sawayama:[{from:[1560,10,20],fromJD:0,to:null,toJD:null,clan:"azai",status:"confirmed",sources:["control:test"]}]}};';
 const {G,TK}=model({sourceOverrides:{'history/owners.js':late}});G.newGame('s1560','oda');G.S().player='__none';
 const e=TK.HIST.find(e=>e.k==='take'&&e.clan==='azai'&&e.d.join('-')==='1560-9-20');assert.ok(!e.castles.includes('sawayama'),'the earlier transfer no longer takes sawayama');assert.equal(e.ownerTimelineMoved,'sawayama');
 until(G,[1560,10,1]);assert.notEqual(G.S().castles.sawayama.owner,'azai');
 until(G,[1560,10,21]);assert.equal(G.S().castles.sawayama.owner,'azai');}

// 2c. 入れ子の take（例：「岐阜の池田領への再配分」1583-5-28）より遅い記録も、その take から城を抜く（架空の区間）。
//     同じ家の区間が続いても、その間に年表が城を別の家に渡していれば、後の区間で戻す（架空の区間）。
{const rows='{gifu:[{from:[1583,6,1],fromJD:0,to:null,toJD:null,clan:"ikeda",status:"confirmed",sources:["control:test-a"]}],kiyosu:[{from:[1560,7,1],fromJD:0,to:[1561,1,1],toJD:0,clan:"oda",status:"confirmed",sources:["control:test-b"]},{from:[1600,1,1],fromJD:0,to:null,toJD:null,clan:"oda",status:"carried",sources:["control:test-c"]}]}';
 const src='window.TK=window.TK||{};TK.OWNER_TIMELINE={version:1,inputsSha256:"test",castles:'+rows+'};';
 const {G,TK}=model({sourceOverrides:{'history/owners.js':src}});G.newGame('s1560','oda');
 const nested=TK.HIST.find(e=>e.take&&e.d.join('-')==='1583-5-28'&&e.take.clan==='ikeda');assert.ok(nested,'nested take exists');assert.ok(!nested.take.castles.includes('gifu'),'nested take no longer moves gifu');
 const before=TK.HIST_BEFORE_OWNER_TIMELINE.some(e=>e.k==='take'&&(e.castles||[]).includes('kiyosu')&&e.clan!=='oda'&&e.d[0]<1600);
 const back=TK.HIST.find(e=>e.ownerTimeline&&e.castles[0]==='kiyosu'&&e.d[0]===1600);
 assert.equal(!!back,before,'a later same-clan record restores kiyosu only when the timeline moved it away in between');}

// 2d. 範囲の中の同じ受け渡しは全部抜く（箕輪城を北条へ：年表は 7-20 と 8-3）。後から読む補正より区間が先（諏訪原城）。
{const minowa=model().TK.HIST.filter(e=>e.d[0]===1582&&e.k==='take'&&e.clan==='hojo'&&(e.castles||[]).includes('minowa')).map(e=>e.d.join('-'));
 const src='window.TK=window.TK||{};TK.OWNER_TIMELINE={version:1,inputsSha256:"test",castles:{minowa:[{from:[1582,8,10],fromJD:0,to:null,toJD:null,clan:"hojo",status:"confirmed",sources:["control:test-d"]}],"yosho:諏訪原城:138.12:34.82":[{from:[1576,6,1],fromJD:0,to:null,toJD:null,clan:"takeda",status:"confirmed",sources:["control:test-e"]}]}};';
 const {G,TK}=model({sourceOverrides:{'history/owners.js':src}});G.newGame('s1575','oda');
 assert.ok(!TK.HIST.some(e=>e.d[0]===1582&&e.d[1]<8&&e.k==='take'&&e.clan==='hojo'&&(e.castles||[]).includes('minowa'))&&!TK.HIST.some(e=>e.d.join('-')==='1582-8-3'&&e.k==='take'&&e.clan==='hojo'&&(e.castles||[]).includes('minowa')),'every earlier hojo transfer of minowa is removed ('+minowa.join(',')+')');
 const y=G.YOSHO.find(y=>y.n==='諏訪原城');
 if(y){{const S=G.S();S.t=G.evT({d:[1576,6,2]});if(S.clans.takeda?.alive)assert.equal(G.yOwner(y),'takeda','the interval wins over later per-castle corrections');}}}

// 2e. newclan の受け渡しで区間が終わる（姫路城：1582-7-2「山崎の戦い」で羽柴へ）。同じ日の受け渡しがあっても早い受け渡しは抜く。
//     開始時に持ち主を替えると、元の家の本拠と在城の武将も動く（清洲城を今川へ）。
{const src='window.TK=window.TK||{};TK.OWNER_TIMELINE={version:1,inputsSha256:"test",castles:{himeji:[{from:[1580,1,1],fromJD:0,to:null,toJD:null,clan:"oda",status:"confirmed",sources:["control:test-f"]}],minowa:[{from:[1582,8,3],fromJD:0,to:null,toJD:null,clan:"hojo",status:"confirmed",sources:["control:test-g"]}]}};';
 const {G,TK}=model({sourceOverrides:{'history/owners.js':src}});G.newGame('s1585','oda');
 assert.equal(G.ownerInterval('himeji'),null,'the newclan transfer ends the interval');
 assert.ok(!TK.HIST.some(e=>e.d.join('-')==='1582-7-20'&&e.k==='take'&&e.clan==='hojo'&&(e.castles||[]).includes('minowa')),'the earlier transfer is removed even with a same-day one');
 const cap='window.TK=window.TK||{};TK.OWNER_TIMELINE={version:1,inputsSha256:"test",castles:{kiyosu:[{from:[1560,1,1],fromJD:0,to:null,toJD:null,clan:"imagawa",status:"confirmed",sources:["control:test-h"]}]}};';
 const m=model({sourceOverrides:{'history/owners.js':cap}});m.G.newGame('s1560','oda');const S=m.G.S();
 if(S.castles.kiyosu.owner==='imagawa'&&S.clans.oda?.alive){assert.notEqual(S.clans.oda.cap,'kiyosu','the old owner moves its seat');assert.ok(!S.gens.some(g=>g.clan==='oda'&&!g.dead&&g.loc==='kiyosu'&&g.unit==null),'its generals leave the castle');}}

// 2f. 開始より前からの区間で城を交換しても、途中で家が滅びない（清洲を斎藤、岐阜を織田）。
{const swap='window.TK=window.TK||{};TK.OWNER_TIMELINE={version:1,inputsSha256:"test",castles:{kiyosu:[{from:[1560,1,1],fromJD:0,to:null,toJD:null,clan:"saito",status:"confirmed",sources:["control:test-i"]}],gifu:[{from:[1560,1,1],fromJD:0,to:null,toJD:null,clan:"oda",status:"confirmed",sources:["control:test-j"]}]}};';
 const {G}=model({sourceOverrides:{'history/owners.js':swap}});G.newGame('s1560','oda');const S=G.S();
 assert.equal(S.clans.oda.alive,true,'oda survives the swap');assert.equal(S.castles.kiyosu.owner,'saito');assert.equal(S.castles.gifu.owner,'oda');
 assert.equal(S.castles[S.clans.oda.cap].owner,'oda');assert.equal(S.castles[S.clans.saito.cap].owner,'saito');}

// 3. 固定の書き出し（東海の試行）と既定を、同じ乱数の種で並べて流す。
//    最初の記録の日までは差が無い。吉田城は記録の日（1564-7-28）に徳川へ渡る（年表では 1565-4-10）。
//    区間の中の行軍拠点の城は、家が生きていればその家のもの。
const seeded='(()=>{let x=20260613;Math.random=()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};})();\n';
const data=fs.readFileSync(path.join(__dirname,'../../kuniezu/static/kuniezu/data.js'),'utf8');
const base=model({sourceOverrides:{'data.js':seeded+data}}),withTimeline=model({sourceOverrides:{'data.js':seeded+data,'history/owners.js':trial}});
for(const m of [base,withTimeline]){m.G.newGame('s1560','oda');m.G.S().player='__none';}
const {G,TK}=withTimeline,recorded=TK.OWNER_TIMELINE.castles;
assert.ok(TK.HIST.find(e=>e.title==='三河平定'&&e.k==='take').castles.includes('yoshida'),'the later transfer stays and does nothing');
assert.deepEqual(Array.from(TK.HIST.filter(e=>e.ownerTimeline),e=>e.castles[0]),['yoshida'],'only yoshida needs a new transfer');
const absolute=m=>{const S=m.G.S();return S.t+m.TKCalendar.toJD(S.y0,S.m0,1);};
const first=Math.min(...Object.values(recorded).flat().map(r=>withTimeline.TKCalendar.toJD(...r.from)));
const stops=[[1564,7,27],[1564,7,29],...Array.from({length:years},(_,i)=>[1561+i,1,1])].sort((a,b)=>a[0]-b[0]||a[1]-b[1]||a[2]-b[2]);
const diffs=[];
for(const d of stops){
 for(const m of [base,withTimeline])until(m.G,d);
 const a=base.G.S().castles,b=G.S().castles,day=d.join('-');
 if(day==='1564-7-27')assert.notEqual(b.yoshida.owner,'tokugawa');
 if(day==='1564-7-29'){assert.equal(b.yoshida.owner,'tokugawa');assert.notEqual(a.yoshida.owner,'tokugawa');}
 for(const id of Object.keys(a))if(a[id].owner!==b[id].owner){diffs.push({day,castle:id,without:a[id].owner,with:b[id].owner});assert.ok(absolute(withTimeline)>=first,'difference before the first record: '+JSON.stringify(diffs.at(-1)));}
 for(const id of Object.keys(recorded)){if(!b[id])continue;const s=G.ownerInterval(id);if(s&&G.S().clans[s.clan]?.alive)assert.equal(b[id].owner,s.clan,day+' '+id);}
}

// 4. 区間の中で始まる新しいゲームは、初期の持ち主がその家（死んだ家なら替えない）。
{const {G,TK}=model({sourceOverrides:{'history/owners.js':trial}});
 for(const sc of ['s1570','s1575','s1582','s1600']){G.newGame(sc,'oda');const S=G.S();
  for(const id of Object.keys(TK.OWNER_TIMELINE.castles)){if(!S.castles[id])continue;const s=G.ownerInterval(id);if(s&&S.clans[s.clan]?.alive)assert.equal(S.castles[id].owner,s.clan,sc+' '+id);}}}

console.log(`PASS: owner timeline: none by default; the trial export changes owners from the record dates and holds recorded castles inside their intervals (${years} years; castles that differ from the run without it: ${[...new Set(diffs.map(d=>d.castle))].join(',')||'none'})`);
