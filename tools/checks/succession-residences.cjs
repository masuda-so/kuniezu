/* 家督継承の居所を棚卸しする。構造照合は史実確認済みの意味ではない。 */
const fs=require('node:fs'),{G,TK}=require('./history-focus.cjs').model();G.newGame('s1560','oda');G.S().player='__none';
const events=TK.HIST.filter(e=>e.k==='death'&&(e.to||e.appear)),rows=[];
for(const e of events){const t=G.evT(e);while(G.S().t<t-1){G.day();for(const q of ['evQ','sceneQ','battleQ','propQ','prisonQ','observerQ'])G.S()[q]=[];}
 const old=G.genByName(e.n),prior=e.to&&G.genByName(e.to),clan=old?.clan,capital=G.S().clans[clan]?.cap,before={predecessorLocation:old?.loc,capital,successorExisted:!!prior,successorLocation:prior?.loc,wasLeader:G.S().clans[clan]?.leader===old?.id};if(G.S().t<t)G.day();const heir=e.to&&G.genByName(e.to);rows.push({name:e.n,successor:e.to,date:e.d,appear:e.appear,...before,afterLocation:heir?.loc,afterUnit:heir?.unit,source:e.successorSource||e.source||null,locationAssessment:e.successorSource?'居所指定に個別出典あり':before.successorExisted?'既存人物の居所を継続（個別史実は別途照合）':'新規生成時の居所（個別史実は別途照合）'});
}
fs.writeFileSync('data/audits/succession-residences-review.json',JSON.stringify({scope:'登録された死亡・後継イベント17件の生成処理と居所。年単位の居所と精密入城日は別。全家督継承史の網羅ではない。',rows},null,2));console.log(rows.map(r=>[r.name,r.successor,r.predecessorLocation,r.capital,r.successorExisted,r.afterLocation].join(' | ')).join('\n'));
