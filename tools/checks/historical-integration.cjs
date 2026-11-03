const assert=require('node:assert/strict'),fs=require('node:fs');
const {G,TK}=require('./history-focus.cjs').model();
const rows=[];
const advance=date=>{const end=G.evT({d:date});while(G.S().t<end){G.day();for(const k of ['evQ','sceneQ','battleQ','propQ','observerQ'])G.S()[k]=[];}};
G.newGame('s1585','tokugawa');G.S().player='__none';
for(const [lunar,id,owner] of [
 [[1587,4,1],'kosho','akizuki'],[[1587,4,2],'kosho','hashiba'],
 [[1587,5,30],'hitoyoshi','sagara'],[[1587,6,1],'kumamoto','shimazu'],
 [[1587,6,2],'kumamoto','hashiba'],[[1587,6,24],'tachibana','otomo'],
 [[1587,6,25],'tachibana','hashiba'],[[1587,6,25],'yanagawa','hashiba'],
 [[1587,6,25],'kawara','hashiba'],[[1587,7,3],'tonokori','shimazu']]){
 advance(TK.lunarDate(...lunar));assert.equal(G.S().castles[id].owner,owner,id);
 rows.push({lunarDate:lunar,castle:id,owner});
}
assert.equal(G.S().clans.sagara.alive,true);
assert.ok(!TK.HIST.some(e=>e.k==='move'&&e.d[0]===1587&&e.at==='kawara'&&['黒田孝高','黒田長政'].includes(e.n)));
assert.equal(TK.YOSHO.find(x=>x[0]==='中津城')[5],1588);
assert.equal(TK.YOSHO.find(x=>x[0]==='横須賀城')[5],1578);
G.newGame('s1600','tokugawa');G.S().player='__none';
const castleState=id=>({name:G.cname(id),lon:G.C[id].lon,lat:G.C[id].lat});
assert.equal(G.cname('agata'),'松尾城');
advance([1601,1,2]);assert.equal(G.cname('funai'),'荷揚城');
advance([1603,1,2]);assert.equal(G.cname('agata'),'縣城');
advance([1605,1,2]);assert.equal(G.cname('funai'),'府内城');
const r=TK.DOCUMENTED_MARCHES.find(x=>x.id==='shigisan-nobutada');assert.ok(r?.roadStops&&r.siege);
assert.deepEqual([...r.stops.at(-1).slice(1)],[136.782034,35.433927]);
assert.ok(TK.CAMPAIGN_CORRIDORS.some(x=>x.id==='hasedo-naoe-1600'));
assert.deepEqual([...TK.HIST.find(x=>x.title==='長谷堂城の戦い').routeVia],['yonezawa','yamagata']);
fs.writeFileSync('data/audits/historical-integration.json',JSON.stringify({rows,seats:'1600 Matsuo; 1601 Niage; 1603 Agata; 1605 Funai',sagaraSurvives:true,shigisanRoadStops:true,hasedoCorridor:true},null,2)+'\n');
console.log('PASS: Kyushu owner changes, Sagara survival, dated castle seats, road-aware Shigisan and Hasedo prerequisites');
