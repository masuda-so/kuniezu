/* 攻城再生の冒頭・終端・巻き戻しを実際の record 消費で検査する。 */
const assert=require('node:assert/strict');
const {model}=require('./history-focus.cjs');
const c=model(),scenes=c.TK.BATTLES;
let count=0;
function textAt(sc,values){
 const node={textContent:''},out=[];
 const r=c.TKBattlePresentation.record(null,sc,{onBeat:b=>{node.textContent=b?b.txt:'　';}});
 for(const t of values){r.seek(t);out.push(node.textContent);}
 r.destroy();return out;
}
for(const title of ['箕輪城落城','掛川城開城','岐阜城の開城','小田原開城']){
 const sc=scenes[title];assert.ok(sc,title);
 const out=textAt(sc,[0,5,49,100,0]),summary=sc.beats.at(-1)[1];
 assert.ok(summary,title+' result');assert.equal(out[3],summary,title+' endpoint');
 for(const i of [0,1,2,4]){assert.notEqual(out[i],summary,title+' premature result');assert.ok(out[i].trim(),title+' existing opening');}
 assert.equal(out[0],out[4],title+' rewind');count++;
}
const taka=scenes['高天神城の戦い'];assert.ok(taka);
const a=textAt(taka,[0,5,49,59,60,99,100,0]);
assert.equal(a[0],taka.beats[0][1]);assert.equal(a[2],a[0]);assert.equal(a[3],a[0]);
assert.equal(a[4],taka.beats[1][1]);assert.equal(a[5],a[4]);assert.equal(a[6],taka.beats[2][1]);assert.equal(a[7],a[0]);count++;
const n=scenes['韮山城の戦い'],b=textAt(n,[0,5,49,50,99,100,0]);
assert.equal(b[0],n.beats[0][1]);assert.equal(b[2],b[0]);assert.equal(b[3],n.beats[1][1]);assert.equal(b[4],b[3]);assert.equal(b[5],n.beats.at(-1)[1]);assert.equal(b[6],b[0]);count++;
assert.deepEqual(textAt({beats:[[100,'結果']]},[0,5,49,100,0]),['　','　','　','結果','　']);
// 全場面で未来の本文を先読みせず、現在の既存本文か見出しだけを渡す。
for(const [title,sc] of Object.entries(scenes)){
 for(const t of [0,5,49,100,0]){
  const eligible=(sc.beats||[]).filter(x=>x[0]<=t).at(-1),mark=(sc.calendar||[]).filter(x=>x[0]<=t).at(-1);
  const expected=(eligible?.[1]?eligible:mark)?.[1]||'　';
  assert.equal(textAt(sc,[t])[0],expected,title+' '+t);
 }
}
console.log('PASS: '+count+' siege cases and '+Object.keys(scenes).length+' actual record consumers; endpoint and rewind');
