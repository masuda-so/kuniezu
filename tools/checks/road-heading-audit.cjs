/* 実際の描画街道の拡縮別の向き。史実の中心線検証とは分ける。 */
const fs=require('node:fs'),assert=require('node:assert/strict'),{performance}=require('node:perf_hooks'),{G,TK}=require('./history-focus.cjs').model();
G.newGame('s1560','oda');
const variation=a=>a.slice(1).reduce((n,v,i)=>n+Math.abs(Math.atan2(Math.sin(v-a[i]),Math.cos(v-a[i]))),0);
const result=[];let samples=0;
for(const r of G.ROADS){const line=TK.roadDisplay(r).pts;if(line.length<2||G.visualPathLength(line)<1e-8)continue;
 const points=Array.from({length:161},(_,i)=>G.visualPathPoint(line,i/160)),before=JSON.stringify(points),raw=points.map(p=>p[2]);
 const start=performance.now(),far=points.map(p=>G.visualCounterHeading(line,p,.4)),near=points.map(p=>G.visualCounterHeading(line,p,8)),ms=performance.now()-start;
 assert.ok([...far,...near].every(Number.isFinite),r.name+' finite heading');assert.equal(JSON.stringify(points),before,r.name+' unchanged positions');
 result.push({name:r.name,points:line.length,rawVariation:variation(raw),distantVariation:variation(far),nearVariation:variation(near),coldAndWarmMs:ms});samples+=points.length;
}
const corner=[[0,0],[100,0],[100,100]];
assert.ok(Math.abs(G.visualCounterHeading(corner,[25,0,0],.4))<.03);
assert.ok(Math.abs(G.visualCounterHeading(corner,[100,75,Math.PI/2],.4)-Math.PI/2)<.03);
assert.ok(Math.abs(G.visualCounterHeading(corner,[100,0,Math.PI/4],.4)-Math.PI/4)<1e-8);
const output={scope:'全登録描画街道の向き・有限値・位置不変。史実検証や実機FPS測定ではない。',roads:result.length,samples,result};fs.writeFileSync('data/audits/road-heading-review.json',JSON.stringify(output,null,2));
console.log(JSON.stringify({pass:true,roads:result.length,samples,selected:result.filter(r=>['東海道','塩津街道'].includes(r.name))}));
