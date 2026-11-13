/* 支配の記録の入力の検査を、固定の入力（架空の値）で確かめる。通信なし、ゲームを読み込まない。
   コミット済みの記録（data/research/curated/control/）は、書き出し（tools/research/export-evidence.cjs）が
   実際の出典・家・城の一覧と照らして検査する。 */
const assert=require('node:assert/strict');
const {loadControl,span,fileNameFor}=require('../research/control-store.cjs');
const cases=require('./fixtures/control-cases.cjs');
const run=records=>loadControl({records,...cases.context});
let n=0;
for(const c of cases.spans){const s=span(c.time);assert.equal(s.earliest,c.earliest,c.name+' earliest');assert.equal(s.latest,c.latest,c.name+' latest');n++;}
for(const c of cases.accepts){const r=run(c.records);assert.equal(r.records.length,c.records.length,c.name);if(c.warnings!==undefined)assert.equal(r.warnings.length,c.warnings,c.name);
 for(const row of r.records)assert.ok(Number.isInteger(row.span.earliest)&&row.span.earliest<=row.span.latest,c.name+' span');n++;}
for(const c of cases.warns){const r=run(c.records);assert.ok(r.warnings.some(w=>w.includes(c.warns)),c.name+': '+JSON.stringify(r.warnings));n++;}
for(const c of cases.rejects){assert.throws(()=>run(c.records),e=>{assert.ok(e.message.includes(c.rejects),`${c.name}: 「${c.rejects}」を含まない: ${e.message}`);return true;},c.name);n++;}
// 並び順は城、最早日、id の順で、入力の順に依らない。
const accepted=cases.accepts[0].records,a=run(accepted).records.map(r=>r.id),b=run([...accepted].reverse()).records.map(r=>r.id);assert.deepEqual(a,b);
assert.equal(fileNameFor('control:yosho:架空城:135.1:35.1-1565-1'),'yosho_架空城_135.1_35.1-1565-1.json');
console.log(`PASS: control ledger validation (${n} fixed cases, ${cases.rejects.length} rejections)`);
