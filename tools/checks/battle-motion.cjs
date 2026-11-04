// 合戦図の推定の動き：全合戦で、史料の動きがある隊を推定で上書きしない・記録位置のある隊を「推定の配置」にしない・
// 同じ時刻なら同じ位置（再生位置を動かしても一致）を確かめる。画角外の点を内側へ動かす要求はしない。
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{TK}=require('./history-focus.cjs').model();
const ctx={window:{},Math};vm.runInNewContext(fs.readFileSync('game/battle-motion.js','utf8'),ctx);const M=ctx.window.TKBattleMotion;
const W=900,H=630,rows=[];
for(const [title,sc] of Object.entries(TK.BATTLES)){if(sc.atlasPlan)continue;const meta=TK.BATTLE_ATLAS[title];if(!meta)continue;
 const pj=(lo,la)=>[(lo-meta.bounds[0])/(meta.bounds[2]-meta.bounds[0])*W,(meta.bounds[1]-la)/(meta.bounds[1]-meta.bounds[3])*H];
 const base=new Map();for(const g of sc.atlasGroups||[])if(g.point)for(const m of g.members)base.set(m,pj(...g.point));
 const sourced=new Set(sc.units.filter(u=>(TK.BATTLE_MOVEMENTS[title]||[]).some(m=>m.name===(u.g||u.n))).map(u=>u.id));
 const p=M.plan(sc,base,W,H,()=>null,sourced);
 for(const id of sourced)assert.ok(!p.estimated.has(id),title+' sourced overwritten '+id);
 for(const id of p.placed)assert.ok(!base.has(id),title+' recorded unit marked as estimated placement '+id);
 for(const id of p.estimated)for(const t of [0,13,37,50,64,88,100]){const a=p.pos(id,t),b=p.pos(id,t);assert.ok(a&&a.every(Number.isFinite),title+' '+id+' t'+t);assert.deepEqual(a,b);}
 rows.push({title,basis:p.basis,estimated:p.estimated.size,placed:p.placed.size});}
const summary={battles:rows.length,withMotion:rows.filter(r=>r.estimated).length,withPlaced:rows.filter(r=>r.placed).length};
// 枠際の記録点へ、顔や名札の画素余白を混ぜない。両側の記録がある汎用経過・旧模式経過の両方を検査。
for(const legacy of [false,true]){
 const scene={units:[{id:'a',side:'a'},{id:'b',side:'b'}],beats:[[30,'',['a','b']]]};
 if(legacy){scene.units[0].path=[[0,.1,.1],[100,.2,.2]];scene.units[1].path=[[0,.9,.9],[100,.8,.8]];}
 const edgeBase=new Map([['a',[1,1]],['b',[W-1,H-1]]]),edge=M.plan(scene,edgeBase,W,H,()=>null);
 for(const id of ['a','b'])assert.deepEqual(Array.from(edge.pos(id,0)),edgeBase.get(id),'viewport margin changes recorded anchor '+id);
}
fs.writeFileSync('data/audits/battle-motion-review.json',JSON.stringify({scope:'推定の動き（模式の経過と汎用の動き）。史料の記録ではなく、画面では点線・破線で区別する。城の平面図を使う伏見城は対象外。',summary,rows},null,2));
console.log('PASS: battle motion',JSON.stringify(summary));
