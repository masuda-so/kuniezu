/* 史実 DB の没年（history/deaths.js）がゲームの没年 TK.DEATH_Y を変えることを確かめる。
   既定（TK.DEATH_YEARS=null）では hist.js の没年のまま。固定の書き出し（fixtures/deaths-trial.js、
   2026-11-14 の史実 DB から manage.py export_game_data で作ったもの）では、DB の確認済みの没年が手書きの年より優先され、
   DB に無い人は手書きの年のまま、年表の死去の出来事は変わらない。 */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {model}=require('./history-focus.cjs');
const trial=fs.readFileSync(path.join(__dirname,'fixtures/deaths-trial.js'),'utf8');
const people=JSON.parse(trial.split('TK.DEATH_YEARS=')[1].trim().replace(/;$/,'')).people;

const base=model(),{TK:T0}=base;
assert.equal(T0.DEATH_YEARS,null);assert.equal(T0.DEATH_Y_REPLACED,undefined);
const handwritten={...T0.DEATH_Y};

const {TK,G}=model({sourceOverrides:{'history/deaths.js':trial}});
// DB の年が優先される（手書きの年と食い違う人、手書きに無い人、ゲームの名で引く人）。
assert.equal(handwritten['岩城重隆'],1570);assert.equal(TK.DEATH_Y['岩城重隆'],1569);
assert.equal(handwritten['市川経好'],1578);assert.equal(TK.DEATH_Y['市川経好'],1585);
assert.equal(handwritten['徳川信康'],undefined);assert.equal(TK.DEATH_Y['徳川信康'],1579);
assert.equal(TK.DEATH_Y['木下秀吉'],1598);
for(const [name,row] of Object.entries(people))assert.equal(TK.DEATH_Y[name],row.y,name);
// DB に無い人は手書きの年のまま。
const kept=Object.keys(handwritten).filter(n=>!Object.hasOwn(people,n));
assert.ok(kept.length>0);for(const n of kept)assert.equal(TK.DEATH_Y[n],handwritten[n],n);
// 置き換えの記録は、元の年と食い違ったものだけ。
for(const [n,old] of Object.entries(TK.DEATH_Y_REPLACED)){assert.notEqual(old,people[n].y);assert.equal(old,Object.hasOwn(handwritten,n)?handwritten[n]:null);}
// 年表は変えない（保存の照合に使う署名も同じ）。
assert.equal(G.histSig(),base.G.histSig());
const changed=Object.entries(TK.DEATH_Y_REPLACED).filter(([,o])=>o!=null).length,added=Object.values(TK.DEATH_Y_REPLACED).filter(o=>o==null).length;
console.log(`PASS: death years: none by default; the trial export sets ${Object.keys(people).length} names (changes ${changed} hand-written years, adds ${added}), keeps ${kept.length} others and leaves the timeline as it is`);
