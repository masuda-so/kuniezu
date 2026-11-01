/* 今回の史実訂正で壊れやすい入城・家督・旧保存の再開を検査する。HTTP不要。 */
const assert=require('node:assert/strict');
const {G,TK}=require('./history-focus.cjs').model();
const advance=d=>{const t=G.evT({d});while(G.S().t<t){G.day();G.S().sceneQ=[];}};
G.newGame('s1560','oda');G.S().player='__none';
advance(TK.lunarDate(1560,5,21));
const g=G.genByName('松平元康'),uid=g.unit;
assert.ok(uid);assert.equal(G.documentedArmies().filter(u=>u.commanders.includes(g.n)).length,1);
assert.ok(!G.visibleNativeArmies().some(u=>u.gens.includes(g.id)));
// 入城処理単独で、隊から城へ兵が一度だけ移ることを確認。
const ev=TK.HIST.find(e=>e.title==='松平元康、岡崎に入る');
const troops=()=>Object.values(G.S().castles).reduce((n,c)=>n+c.troops,0)+G.S().units.reduce((n,u)=>n+u.troops,0);
const before=troops();G.applyEv(ev);assert.equal(troops(),before);
assert.ok(!G.S().units.some(u=>u.id===uid));assert.equal(g.loc,'okazaki');assert.equal(g.unit,null);assert.equal(g.clan,'tokugawa');
assert.notEqual(G.relationKind('oda','tokugawa').key,'ally');assert.equal(G.relationKind('tokugawa','imagawa').key,'lord');
G.applyEv(ev);assert.equal(troops(),before);
console.log('PASS: Motoyasu single display, entering Okazaki removes the old unit without duplicating/loss of troops; lord is distinct from ally');
G.newGame('s1560','oda');G.S().player='__none';
advance([1569,12,1]);assert.ok(G.S().clans.kitabatake.alive);assert.equal(G.S().vassal.kitabatake,'oda');
advance([1575,8,1]);assert.equal(G.cname('kiriyama'),'田丸城');assert.equal(G.genByName('織田信雄').clan,'kitabatake');assert.equal(G.gen(G.S().clans.kitabatake.leader).n,'織田信雄');
advance([1576,12,20]);assert.ok(!G.S().clans.kitabatake.alive);assert.equal(G.genByName('織田信雄').clan,'oda');
advance([1580,3,1]);assert.equal(G.cname('kiriyama'),'松ヶ島城');
console.log('PASS: Kitabatake peace, later succession, destruction and Tamaru/Matsugashima are separate changes');
// 並べ替え前の待機 index を持つ旧保存。城の現状は再適用せず、将来の読み位置だけ直す。
const s=G.S(),oldEvent=TK.JOKAKU.find(e=>e.n==='浜松城');
const cst=JSON.stringify(s.cst),casts=JSON.stringify(s.castles);
delete s.jsig;s.ji=0;s.hsig=G.histSig();s.jpend=[{i:oldEvent._i,until:s.t+5}];
assert.equal(G.fixHist(),true);assert.equal(s.jpend[0].uid,oldEvent._i);assert.equal(TK.JOKAKU[s.jpend[0].i],oldEvent);
assert.ok(G.evT(TK.JOKAKU[s.ji])>s.t);assert.ok(G.evT(TK.JOKAKU[s.ji-1])<=s.t);
assert.equal(JSON.stringify(s.cst),cst);assert.equal(JSON.stringify(s.castles),casts);assert.equal(G.fixHist(),false);
const inserted={d:[1559,1,1],k:'note',_i:9999};TK.JOKAKU.unshift(inserted);
G.fixHist();assert.equal(TK.JOKAKU[s.jpend[0].i],oldEvent);assert.equal(JSON.stringify(s.castles),casts);
console.log('PASS: legacy and current save event cursors survive additions/reordering without replaying castle changes');
const statuses={};for(const b of Object.values(TK.BATTLES))statuses[b.layoutStatus]=(statuses[b.layoutStatus]||0)+1;
console.log('BATTLE_AUDIT',statuses);
