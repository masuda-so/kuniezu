const assert=require('node:assert/strict'),{G,TK}=require('./history-focus.cjs').model();G.newGame('s1585','tokugawa');const grant=TK.HIST.find(e=>e.title==='池田輝政の吉田入封');while(G.S().t<G.evT(grant)+1){G.day();G.S().evQ=[];G.S().sceneQ=[];}const good=G.S();assert.equal(good.castles.yoshida.owner,'ikeda');assert.ok(good.clans.ikeda.alive);assert.equal(G.gen(good.clans.ikeda.leader).clan,'ikeda');assert.ok(good.chron.find(e=>e.title===grant.title).ok);
const legacy=JSON.parse(JSON.stringify(good));delete legacy.chronologyRepairVersion;legacy.castles.yoshida.owner='hashiba';legacy.clans.ikeda.alive=false;legacy.clans.ikeda.cap='gifu';const g=legacy.gens.find(g=>g.id===legacy.clans.ikeda.leader);g.clan=null;g.ronin=true;g.loc='gifu';legacy.hFail=[{title:grant.title}];legacy.chron.find(e=>e.title===grant.title).ok=false;const before={t:legacy.t,troops:legacy.units.map(u=>u.troops),gold:legacy.clans.ikeda.gold};G.setS(legacy);assert.equal(legacy.t,before.t);assert.deepEqual(legacy.units.map(u=>u.troops),before.troops);assert.equal(legacy.clans.ikeda.gold,before.gold);assert.equal(legacy.castles.yoshida.owner,'ikeda');assert.equal(g.clan,'ikeda');assert.equal(g.loc,'yoshida');assert.ok(legacy.clans.ikeda.alive);assert.equal(legacy.hFail.length,0);assert.ok(legacy.chron.find(e=>e.title===grant.title).ok);assert.ok(!legacy.chron.find(e=>e.title===grant.title).text.includes('誤表示'));console.log('PASS: relocation retains clan and leader; identified legacy observation repaired without changing date, troops or treasury');

const assault=TK.HIST.find(event=>event.title==='木津川口の戦い');
const winter=TK.HIST.find(event=>event.title==='大坂冬の陣');
const assaultDay=G.evT(assault), oldDay=G.evT(winter);
legacy.t=oldDay;
legacy.hsig=0;
legacy.chron=[
 {title:assault.title,t:oldDay,s:G.dstr(oldDay),who:'徳川家康',text:'旧記録',ok:true},
 {title:winter.title,t:oldDay,s:G.dstr(oldDay),who:'徳川家康',ok:true}
];
const previousCount=legacy.hOk;
assert.ok(G.fixHist());
assert.equal(legacy.t,oldDay);
assert.equal(legacy.hOk,previousCount);
assert.equal(legacy.chron.length,2);
assert.equal(legacy.chron[0].title,winter.title);
assert.equal(legacy.chron[1].t,assaultDay);
assert.equal(legacy.chron[1].s,G.dstr(assaultDay));
assert.equal(legacy.chron[1].who,'蜂須賀至鎮');
assert.equal(legacy.chron[1].text,assault.text);
assert.ok(!G.fixHist());
console.log('PASS: legacy Kizugawa chronology date and commander corrected without replaying the event');
