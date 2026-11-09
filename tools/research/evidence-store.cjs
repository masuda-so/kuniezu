/* 審査済み命題は独立ファイルで保持。出力の再生成で別担当の入力を消さない。 */
const fs=require('node:fs'),path=require('node:path');
const {validateTemporalFields}=require('./location-store.cjs');
// 関連の水域は、今の catalog の kind=water と完全に一致するキーだけを受ける。名前での推定や新しい水域の自動作成はしない。
function catalogWaterKeys(file){if(!fs.existsSync(file))return new Set();return new Set(fs.readFileSync(file,'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l)).filter(r=>r.kind==='water').map(r=>'water:'+r.subject));}
function validateEventTime(r,knownWaterKeys){
 if(r.eventTime===undefined)return;
 const t=r.eventTime,fail=()=>{throw Error('出来事の年代・対象参照が不正: '+r.id);};
 const allowed={'year-window':['year'],'dated-event':['date','leapMonth'],'dated-components':['components'],'described-period':['label','indexYears','boundsAreHistoricalStartEnd']};
 validateTemporalFields(t,['kind','calendar','precision',...(allowed[t?.kind]||[])],fail);
 const year=y=>Number.isInteger(y)&&r.validYears[0]<=y&&y<=r.validYears[1];
 // 主語と年・日が既知でも、関連地点・人物が不明な記録には空配列を明示する。
 if(!Array.isArray(r.linkedEntities)||!r.linkedEntities.length&&!['year-window','dated-event'].includes(t.kind)||!r.eventRelation||!r.eventScope)fail();
 if(r.linkedEntities.some(id=>typeof id!=='string'||!(/^(place|person):.+/.test(id)||id.startsWith('water:')&&knownWaterKeys instanceof Set&&knownWaterKeys.has(id)))||new Set(r.linkedEntities).size!==r.linkedEntities.length)fail();
 if(t.kind==='year-window'){
  if(t.calendar!=='CE-year'||t.precision!=='year'||!year(t.year))fail();
 }else if(t.kind==='dated-event'){
  const d=t.date;
  if(t.calendar!=='Japanese-lunisolar'||t.precision!=='day'||typeof t.leapMonth!=='boolean'||!Array.isArray(d)||d.length!==3||!d.every(Number.isInteger)||!year(d[0])||d[1]<1||d[1]>12||d[2]<1||d[2]>30)fail();
 }else if(t.kind==='dated-components'){
  if(t.calendar!=='CE-year'||t.precision!=='year'||!Array.isArray(t.components)||!t.components.length)fail();
  for(const c of t.components){
   validateTemporalFields(c,['year','entities'],fail);
   if(!year(c.year)||!Array.isArray(c.entities)||!c.entities.length||c.entities.some(id=>!r.linkedEntities.includes(id)))fail();
  }
 }else if(t.kind==='described-period'){
  if(!t.label||t.precision!=='period'||t.calendar!=='Japanese-era-description'||t.boundsAreHistoricalStartEnd!==false||!Array.isArray(t.indexYears)||t.indexYears.length!==2||t.indexYears.some((y,i)=>y!==r.validYears[i]))fail();
 }else fail();
}
function records(dir){if(!fs.existsSync(dir))return [];return fs.readdirSync(dir).filter(n=>n.endsWith('.json')).sort().map(n=>{const r=JSON.parse(fs.readFileSync(path.join(dir,n),'utf8'));return {r,file:path.join(dir,n)};});}
function loadEvidence({claimDir,sourceDir,baseSources={},knownWaterKeys}){
 const sources={...baseSources};for(const {r,file}of records(sourceDir)){if(!r.id||!r.author||!r.title||!r.url||!r.locator||!r.scope)throw Error('出典の項目不足: '+file);if(sources[r.id]&&JSON.stringify(sources[r.id])!==JSON.stringify(Object.fromEntries(Object.entries(r).filter(([k])=>k!=='id'))))throw Error('出典IDが競合: '+r.id);const {id,...meta}=r;sources[id]=meta;}
 const facts=[],ids=new Set();for(const {r,file}of records(claimDir)){
  if(!r.id||ids.has(r.id))throw Error('命題IDが欠落または重複: '+file);ids.add(r.id);
  if(r.status!=='verified-in-specified-scope'||r.recordType!=='verified-historical-claim')throw Error('審査済み命題だけをcurated/claimsへ置く: '+file);
  if(!r.entity||!r.predicate||r.value==null||!r.source||!sources[r.source]||!r.locator||!/^\d{4}-\d{2}-\d{2}$/.test(r.checked||'')||!r.gameBindings?.length)throw Error('命題の根拠・実装先が不足: '+file);
  if(!Array.isArray(r.validYears)||r.validYears.length!==2||!r.validYears.every(Number.isInteger)||r.validYears[0]>r.validYears[1])throw Error('適用年代が不正: '+file);
  if(r.sourceUrl!==sources[r.source].url)throw Error('命題と出典URLが不一致: '+file);
  validateEventTime(r,knownWaterKeys);
  facts.push(r);
 }
 return {facts,sources};
}
module.exports={loadEvidence,validateEventTime,catalogWaterKeys};
