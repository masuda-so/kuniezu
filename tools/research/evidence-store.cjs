/* 審査済み命題は独立ファイルで保持。出力の再生成で別担当の入力を消さない。 */
const fs=require('node:fs'),path=require('node:path');
function records(dir){if(!fs.existsSync(dir))return [];return fs.readdirSync(dir).filter(n=>n.endsWith('.json')).sort().map(n=>{const r=JSON.parse(fs.readFileSync(path.join(dir,n),'utf8'));return {r,file:path.join(dir,n)};});}
function loadEvidence({claimDir,sourceDir,baseSources={}}){
 const sources={...baseSources};for(const {r,file}of records(sourceDir)){if(!r.id||!r.author||!r.title||!r.url||!r.locator||!r.scope)throw Error('出典の項目不足: '+file);if(sources[r.id]&&JSON.stringify(sources[r.id])!==JSON.stringify(Object.fromEntries(Object.entries(r).filter(([k])=>k!=='id'))))throw Error('出典IDが競合: '+r.id);const {id,...meta}=r;sources[id]=meta;}
 const facts=[],ids=new Set();for(const {r,file}of records(claimDir)){
  if(!r.id||ids.has(r.id))throw Error('命題IDが欠落または重複: '+file);ids.add(r.id);
  if(r.status!=='verified-in-specified-scope'||r.recordType!=='verified-historical-claim')throw Error('審査済み命題だけをcurated/claimsへ置く: '+file);
  if(!r.entity||!r.predicate||r.value==null||!r.source||!sources[r.source]||!r.locator||!/^\d{4}-\d{2}-\d{2}$/.test(r.checked||'')||!r.gameBindings?.length)throw Error('命題の根拠・実装先が不足: '+file);
  if(!Array.isArray(r.validYears)||r.validYears.length!==2||!r.validYears.every(Number.isInteger)||r.validYears[0]>r.validYears[1])throw Error('適用年代が不正: '+file);
  if(r.sourceUrl!==sources[r.source].url)throw Error('命題と出典URLが不一致: '+file);
  facts.push(r);
 }
 return {facts,sources};
}
module.exports={loadEvidence};
