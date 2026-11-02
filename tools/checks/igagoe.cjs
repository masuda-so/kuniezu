// 伊賀越え：出典の日付（旧暦6月2日発・6月4日岡崎着）の間だけ地図に出て、途中は経由の順に進み、家康を城に重ねて出さない。
const assert=require('node:assert/strict'),{G,TK}=require('./history-focus.cjs').model();
const r=TK.DOCUMENTED_MARCHES.find(r=>r.id==='igagoe');assert.ok(r);for(const id of r.source)assert.ok(TK.RESEARCH_SOURCES[id]?.url,id);
G.newGame('s1582','oda');const s=G.S(),go=d=>{const t=G.evT({d});while(s.t<t){G.day();s.sceneQ=[];}};
go(TK.lunarDate(1582,6,1));assert.ok(!G.documentedArmies().some(u=>u.record.id==='igagoe'),'not before 6/2');
const seen=[];for(const d of [[1582,6,2],[1582,6,3],[1582,6,4]]){go(TK.lunarDate(...d));const u=G.documentedArmies().find(u=>u.record.id==='igagoe');assert.ok(u,'present '+d);seen.push(G.historyPoint(u));assert.ok(G.documentedPerson('徳川家康'));}
assert.ok(seen[1][0]>seen[0][0]&&seen[2][0]>seen[1][0],'moves east');
go(TK.lunarDate(1582,6,7));assert.ok(!G.documentedArmies().some(u=>u.record.id==='igagoe'),'gone after arrival');assert.ok(!G.documentedPerson('徳川家康'));
assert.ok(TK.HIST.some(e=>e.title==='伊賀越え'&&e.documentedMarch));
console.log('PASS: Iga-goe documented march 6/2–6/4, eastward, person not duplicated');
