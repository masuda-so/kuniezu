/* 家臣の死去を家督継承と通知せず、実際の継承は一度だけ知らせる。 */
const assert=require('node:assert/strict'),{G,TK}=require('./history-focus.cjs').model();
const notices=[];
G.onSuccession=(clan,old,next)=>notices.push({clan,old:old.id,next:next?.id});
const advance=(end,check)=>{while(G.S().t<end){G.day();for(const q of ['evQ','sceneQ','battleQ','propQ'])G.S()[q]=[];check?.();}};
const death=name=>TK.HIST.find(e=>e.k==='death'&&e.n===name);
assert.equal(TK.HISTORY_ONLY,true);

G.newGame('s1575','oda');notices.length=0;
const nobunaga=G.genByName('織田信長'),takenaka=G.genByName('竹中重治');
assert.equal(G.S().clans.oda.leader,nobunaga.id);
advance(G.evT({d:[1580,10,1]}),()=>assert.equal(G.S().clans.oda.leader,nobunaga.id));
assert.equal(G.gen(takenaka.id).dead,true);
assert.equal(G.gen(nobunaga.id).dead,false);
assert.equal(notices.filter(n=>n.clan==='oda').length,0,'家臣の死去で当主の継承を通知しない');

G.newGame('s1560','imagawa');notices.length=0;
const yoshimoto=G.genByName('今川義元');
advance(G.evT(death('今川義元')));
const ujizane=G.genByName('今川氏真');
assert.equal(G.S().clans.imagawa.leader,ujizane.id);
assert.equal(G.gen(yoshimoto.id).dead,true);
assert.deepEqual(notices.filter(n=>n.clan==='imagawa'),[{clan:'imagawa',old:yoshimoto.id,next:ujizane.id}]);

// 後継指定のない現行イベントを、本人が当主である初期状態へ直接適用する。
// 自動選定の通知を検査するためで、この適用順や後継者を史実と認定しない。
G.newGame('s1575','ashina');notices.length=0;
const morouji=G.genByName('蘆名盛氏'),fallback=death('蘆名盛氏');
assert.equal(G.S().clans.ashina.leader,morouji.id);
assert.equal(fallback.to,undefined);
G.applyEv(fallback);
const successor=G.gen(G.S().clans.ashina.leader);
assert.ok(successor&&!successor.dead&&successor.id!==morouji.id);
assert.equal(G.gen(morouji.id).dead,true);
assert.deepEqual(notices.filter(n=>n.clan==='ashina'&&n.old===morouji.id),[{clan:'ashina',old:morouji.id,next:successor.id}]);
console.log('PASS: retainer death preserves the lord without succession notice; explicit and automatic successions each notify once');
