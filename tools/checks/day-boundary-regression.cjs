/* 合戦後の人物移動へ切り替える同一瞬間の位置を検証。 */
const assert=require('node:assert/strict'),{G}=require('./history-focus.cjs').model();
G.newGame('s1560','oda');G.S().player='__none';G.auditVisualMoves=true;
const end=G.evT({d:[1560,11,15]});while(G.S().t<end-1){G.day();for(const q of ['evQ','sceneQ','battleQ','propQ','prisonQ','observerQ'])G.S()[q]=[];}
const g=G.genByName('松永久秀');G._visualSampleTime=end;const before=G.personPoint(g);delete G._visualSampleTime;G.day();const after=G.personPoint(g);
assert.ok(Math.hypot(before[0]-after[0],before[1]-after[1])<1e-6);
assert.equal(G.visualPathLength(G.visualBetween([1000,1300],[1000,1300])),0);
assert.equal(G._continuousDayAdvance,false);console.log('PASS: daily tracking does not overwrite the sampled end-of-day position; no same-place detour');
// 日程指定のない軍：兵糧消費・疲労更新・spdを含む実際の日次更新と比較。
for(const spd of [.4,1.6]){G.newGame('s1560','oda');G.S().player='__none';G.auditVisualMoves=true;const e=Object.values(G.EDGES).find(e=>!e.sea&&e.days>2),u={id:99999,clan:'oda',gens:[],troops:5000,troops0:5000,days:10,marchDays:10,food:20,morale:85,train:70,path:[e.a,e.b],seg:0,pos:.05,state:'march',mission:'attack',hist:true,spd};G.S().units.push(u);
 G._visualSampleTime=G.S().t+1;const prediction=G.historyPoint(u);delete G._visualSampleTime;G.day();const actual=G.historyPoint(u);assert.ok(actual,'native unit still marching');assert.ok(Math.hypot(prediction[0]-actual[0],prediction[1]-actual[1])<1e-6,'native prediction must match engine, including spd '+spd);assert.ok(Number.isFinite(actual[2]));}
console.log('PASS: unscheduled native armies share the engine day-end position for different speeds and depleted food');
// 同じ保存内で城の位置が変わった場合も、道路接続の端点を更新する。
{const e=Object.values(G.EDGES).find(e=>!e.sea),c=G.C[e.a],oldX=c.x;G.visualEdgeGeo(e.a,e.b);try{c.x+=2;const line=G.visualEdgeGeo(e.a,e.b);assert.ok(Math.hypot(line[0][0]-c.x,line[0][1]-c.y)<1e-8);}finally{c.x=oldX;}}
console.log('PASS: road geometry cache follows relocated castle endpoints');
