const assert=require('node:assert/strict');
const {TK,G}=require('./history-focus.cjs').model();
const epsilon=1e-8,same=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])<=epsilon;
const before=JSON.stringify(G.ROADS);let references=0,retained=0,unalteredCorridors=0;
for(const r of G.ROADS){
 const d=TK.roadDisplay(r);assert.equal(TK.roadDisplay(r),d,'stable drawing geometry');assert.ok(d.pts.length>=2);assert.ok(d.pts.every(p=>p.length===2&&p.every(Number.isFinite)));
 if(d.modernReference){references++;assert.equal(d.evidence.label,r.name);}else retained++;
 const changed=d.pts.length!==r.pts.length||r.pts.some((p,i)=>!same(p,d.pts[i]));
 if(r.evidence?.level==='corridor'&&r.name!=='東海道'){
  if(d.modernReference)assert.equal(d.evidence.drawReference,true,r.name);
  else if(changed){assert.ok(d.modernAligned,r.name);let index=0;for(const p of r.pts){while(index<d.pts.length&&!same(p,d.pts[index]))index++;assert.ok(index<d.pts.length,'historic corridor anchors retained in order: '+r.name);index++;}}
  else unalteredCorridors++;
 }
 if(r.name==='東海道')assert.ok(d.pts.some(p=>same(p,G.PJ(139.059505,35.233487))||Math.hypot(...p.map((v,i)=>v-G.PJ(139.059505,35.233487)[i]))<.02),'Hakone medieval ridge retained');
}
assert.equal(JSON.stringify(G.ROADS),before,'drawing must not change historical marching paths');assert.ok(references>50);assert.ok(retained>=4);assert.ok(unalteredCorridors>0,'unmodified corridors are valid projected copies');assert.ok(TK.MODERN_LAKES.some(l=>l.name==='諏訪湖'));assert.ok(TK.MODERN_LAKES.some(l=>l.name==='河北潟'));
console.log('PASS: canonical road display, epsilon-based ordered corridor anchors and raw immutability',{references,retained,unalteredCorridors});
