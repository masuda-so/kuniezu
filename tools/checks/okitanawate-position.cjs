/* 森岳の代表点・市報告書・旧海上点を独立して照合する。 */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {TK,TKGEO}=require('./history-focus.cjs').model();
const world=([lon,lat])=>[(lon-TKGEO.LON0)*TKGEO.K*TKGEO.CX,(TKGEO.LAT0-lat)*TKGEO.K];
function ringContains(r,p){let on=false;for(let i=0,j=r.length-2;i<r.length;j=i,i+=2)if((r[i+1]>p[1])!==(r[j+1]>p[1])&&p[0]<(r[j]-r[i])*(p[1]-r[i+1])/(r[j+1]-r[i+1])+r[i])on=!on;return on;}
const onLand=point=>TKGEO.land.some(poly=>poly.reduce((on,r)=>on!==ringContains(r,world(point)),false));
const sc=TK.BATTLES['沖田畷の戦い'],arima=sc.atlasGroups.find(g=>g.members.includes('arima'));
assert.ok(!onLand([130.373,32.798]),'old Arima point was in the water mask');assert.ok(onLand(arima.point),'Moritake representative point must be land');
assert.ok(sc.sources.includes('moritakeExcavation'));assert.match(TK.RESEARCH_SOURCES.moritakeExcavation.scope,/位置不明/);
assert.match(arima.label,/森岳/);assert.match(arima.precision,/不詳/);
const offshore=[];for(const [title,b]of Object.entries(TK.BATTLES))for(const g of b.atlasGroups)if(g.point&&!onLand(g.point))offshore.push({title,label:g.label,members:g.members,point:g.point,kind:b.atlasKind||b.kind||null});
fs.writeFileSync(path.join(__dirname,'../../data/audits/battle-coast-points.json'),JSON.stringify({scope:'現行の比較海岸マスク外の点を棚卸し。海戦・海上部隊・時代差を含むため自動的な誤配置判定ではない。',offshore},null,2)+'\n');
console.log('PASS: Arima uses the source-supported Moritake area; old offshore point rejected; other offshore candidates recorded:',offshore.length);
