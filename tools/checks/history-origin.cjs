/* 登録済みの起点と実状態の日付を一致させ、失敗した過去選択で現状を失わない。 */
'use strict';
const assert=require('node:assert/strict');
const {G,TK}=require('./history-focus.cjs').model();
const dateOf=s=>{const t=Math.floor(s.t),m=s.m0-1+Math.floor(t/30);return [s.y0+Math.floor(m/12),(m%12+12)%12+1,(t%30+30)%30+1];};
G.newGame('s1600','tokugawa');
const current=G.S(),before=JSON.stringify(current),expected=Array.from(TK.SCEN.s1560.openingDate);
assert.equal(G.historyOrigin().id,'s1560');assert.deepEqual(Array.from(G.historyOrigin().date),expected);
const copy=G.historyOrigin();copy.date[0]=0;assert.equal(G.historyOrigin().date[0],1560);
assert.throws(()=>G.pastStep([1560,5,1],1),/史実の再生/);assert.equal(G.S(),current);assert.equal(JSON.stringify(current),before);
assert.equal(G.pastStep(expected,1),true);assert.equal(G.S(),current);assert.equal(JSON.stringify(current),before);
const p=G._past.snaps[0];assert.deepEqual([p.y,p.m,p.d],expected);assert.deepEqual(dateOf(JSON.parse(p.s)),expected);assert.deepEqual(Array.from(G._past.done),expected);
for(const player of ['not-a-house','hashiba']){assert.equal(G.adoptPast(p.s,player),null);assert.equal(G.S(),current);assert.equal(JSON.stringify(current),before);}
assert.equal(G.adoptPast('null','tokugawa'),null);assert.equal(G.S(),current);assert.throws(()=>G.adoptPast('{','tokugawa'));assert.equal(G.S(),current);
// 配置を実装せずに、早いrootの登録を検出できることだけを構造用fixtureで検査。
TK.SCEN.fixture1534={id:'fixture1534',year:1534,month:6};TK.SCEN.fixtureChild={id:'fixtureChild',base:'s1560',start:[1533,1,1],year:1533,month:1};
assert.equal(G.historyOrigin().id,'fixture1534');assert.deepEqual(Array.from(G.historyOrigin().date),[1534,6,1]);
delete TK.SCEN.fixture1534;delete TK.SCEN.fixtureChild;
const old=G._past,opening=TK.SCEN.s1560.openingDate;TK.SCEN.s1560.openingDate=[1560,6,6];
assert.equal(G.pastStep([1560,6,6],1),true);assert.notEqual(G._past,old);assert.deepEqual(Array.from(G._past.done),[1560,6,6]);assert.equal(G.S(),current);assert.equal(JSON.stringify(current),before);
TK.SCEN.s1560.openingDate=opening;assert.equal(G.pastStep(expected,1),true);
const adopted=G.adoptPast(G._past.cur,'oda');assert.ok(adopted);assert.equal(G.S(),adopted);assert.deepEqual(dateOf(adopted),expected);assert.equal(adopted.player,'oda');
console.log('PASS: declared earliest root, actual snapshot date, immutable current state, rejected early/absent-house choices, cache origin change, valid adoption');
