const assert=require('node:assert/strict'),fs=require('node:fs'),{G,TK}=require('./history-focus.cjs').model();G.newGame('s1560','oda');const s=G.S(),b=G.YOSHO.find(y=>y.n==='奉先寺'),h=G.YOSHO.find(y=>y.n==='海印寺（蔵経施設）');assert.ok(b&&h);assert.equal(b.kind,'寺');assert.equal(h.kind,'寺');assert.ok(['hanseong','gaeseong','wonju'].includes(b.at));assert.ok(['daegu','sangju','jinju'].includes(h.at));const rows=[];
for(const [year,on]of [[1560,true],[1591,true],[1592,false],[1593,true],[1615,true]]){s.t=G.evT({d:[year,6,1]});assert.equal(G.yActive(b),on,year+' Bongseonsa');assert.equal(G.yActive(h),true);rows.push({year,bongseonsa:G.yActive(b),haeinsa:G.yActive(h),presentation:G.sitePresentation(b)});}
const owner=G.yOwner(b),income=G.monthIncome(owner).gold,periods=TK.SITE_ACTIVITY[b.n];TK.SITE_ACTIVITY[b.n]=[];assert.equal(income-G.monthIncome(owner).gold,G.YINC['寺'],'same active-facility income rule as other temples');TK.SITE_ACTIVITY[b.n]=periods;
const synthetic={id:'fixture:reopened-site',n:'同じ仕組みを使う施設',y0:1500,y1:null};TK.SITE_ACTIVITY[synthetic.id]=[{fromYear:1500,toYear:1580},{fromYear:1600,toYear:null}];s.t=G.evT({d:[1590,1,1]});assert.equal(G.yActive(synthetic),false);s.t=G.evT({d:[1600,1,1]});assert.equal(G.yActive(synthetic),true);
for(const y of [b,h])assert.ok(G.castleEvidence(y).source.startsWith('https://encykorea.aks.ac.kr/'));
const bongeunsa=G.YOSHO.find(y=>y.n==='奉恩寺（修道山）');
assert.ok(bongeunsa);
assert.equal(bongeunsa.at,'hanseong');
assert.match(G.castleEvidence(bongeunsa).source,/E0023980$/);
for(const [year,active] of [[1561,false],[1562,true],[1591,true],[1592,false],[1615,false]]){
 s.t=G.evT({d:[year,6,1]});
 assert.equal(G.yActive(bongeunsa),active,year+' Bongeunsa at Sudosan');
}
fs.writeFileSync('data/audits/korean-facilities-review.json',JSON.stringify({scope:'3寺院の代表点・年単位活動区間・共通判定。朝鮮施設全件の網羅を意味しない。',facilities:[b,h,bongeunsa],rows},null,2));console.log('PASS: three sourced temple sites, correct regions, period boundaries and generic reopening intervals');
