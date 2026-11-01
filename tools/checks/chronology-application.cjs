/* 全開始シナリオから1615年末まで、史実観察の不適用を検査する。史実内容そのものの正しさとは別。 */
const fs=require('node:fs'),assert=require('node:assert/strict'),{G,TK}=require('./history-focus.cjs').model();
const scenarios=[],failures=[];
for(const id of Object.keys(TK.SCEN)){
 G.onChron=null;G.newGame(id,'oda');const rows=[];let events=0;G.onChron=e=>{events++;if(!e.ok&&!e.alt)rows.push({...e});};const from=G.S().t,end=G.evT({d:[1615,12,30]});
 while(G.S().t<end){G.day();for(const q of ['evQ','sceneQ','battleQ','observerQ'])G.S()[q]=[];}
 scenarios.push({id,days:end-from,events,failures:rows.length});failures.push(...rows.map(e=>({scenario:id,...e})));console.log(id,'days',end-from,'unapplied',rows.length);
}
fs.writeFileSync('data/audits/chronology-application-review.json',JSON.stringify({scope:'全7開始シナリオから1615年末までの非分岐観察。登録イベントの実行検査であり史料考証の完成証明ではない。',scenarios,failures},null,2));assert.equal(failures.length,0,'historical observation must not silently reject registered chronology');console.log('PASS: all scenario chronologies apply through 1615');
