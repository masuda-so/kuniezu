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
/* 支配の記録（curated/control/）。決まりは docs/designs/territory-control.md。
   照らす相手（出典・命題・場所・家の鍵・ノード）は引数で受け、ここではゲームを読まない。 */
const CONTROL_VOCAB={cause:['fall','surrender','handover','transfer','succession','construction','abandonment','allegiance'],dateKind:['event','order','entry','listing-only'],evidenceDepth:['kobun-heading','public-secondary-read','primary-text-read'],value:['held','contested','undetermined','not-applicable']};
const CONTROL_KEYS={change:['id','type','site','from','to','time','cause','dateKind','evidenceDepth','summary','source','locator','checked','checkedBy','alsoSources','claim','place','variantOf','uncertainty'],observation:['id','type','site','value','holder','claimants','time','boundsAsserted','searched','summary','checked','checkedBy','evidenceDepth','source','locator','alsoSources','place','variantOf','uncertainty']};
function validateControlTime(t,fail,inPeriod){
 if(!t||typeof t!=='object'||Array.isArray(t))fail('日付が無い');
 if(t.kind===undefined){
  if(inPeriod)fail('期間の端に期間は置けない');
  if(Object.keys(t).sort().join()!=='from,to')fail('期間の項目は from と to');
  for(const end of [t.from,t.to]){if(!['dated-event','year-window'].includes(end?.kind))fail('期間の端は dated-event か year-window');validateControlTime(end,fail,true);}
  return;
 }
 const allowed={'dated-event':['date','leapMonth'],'year-window':['year'],'described-period':['label','indexYears','boundsAreHistoricalStartEnd']};
 if(!allowed[t.kind])fail('受けない日付の形: '+t.kind);
 validateTemporalFields(t,['kind','calendar','precision',...allowed[t.kind]],()=>fail('日付の形と合わない項目'));
 if(Object.keys(t).some(k=>!['kind','calendar','precision',...allowed[t.kind]].includes(k)))fail('日付の形と合わない項目');
 if(t.kind==='dated-event'){
  if(t.calendar!=='Japanese-lunisolar'||t.precision!=='day'||typeof t.leapMonth!=='boolean'||!Array.isArray(t.date)||t.date.length!==3||!t.date.every(Number.isInteger))fail('dated-event の項目が不正');
 }else if(t.kind==='year-window'){
  if(t.calendar!=='Japanese-year'||t.precision!=='year'||!Number.isInteger(t.year))fail('year-window の項目が不正');
 }else{
  if(!t.label||t.calendar!=='Japanese-era-description'||t.precision!=='period'||t.boundsAreHistoricalStartEnd!==false||!Array.isArray(t.indexYears)||t.indexYears.length!==2||!t.indexYears.every(Number.isInteger))fail('described-period の項目が不正');
 }
}
const controlYears=t=>t.kind===undefined?[controlYears(t.from)[0],controlYears(t.to)[1]]:t.kind==='dated-event'?[t.date[0],t.date[0]]:t.kind==='year-window'?[t.year,t.year]:t.indexYears;
function loadControl({controlDir,sources,claimIds,placeIds,clanKeys,nodeIds}){
 const {span}=require('./control-derive.cjs');
 const records=[],warnings=[],seen=new Set(),text=v=>typeof v==='string'&&v.trim().length>0,date=v=>/^\d{4}-\d{2}-\d{2}$/.test(v||'');
 const files=fs.existsSync(controlDir)?fs.readdirSync(controlDir).filter(f=>f.endsWith('.json')).sort():[];
 for(const file of files){
  const r=JSON.parse(fs.readFileSync(path.join(controlDir,file),'utf8')),fail=why=>{throw Error('支配の記録が不正（'+why+'）: '+file);};
  if(!CONTROL_KEYS[r.type])fail('type は change か observation');
  for(const k of Object.keys(r))if(!CONTROL_KEYS[r.type].includes(k))fail('知らない項目 '+k);
  if(!nodeIds.has(r.site))fail('site が対象のノードでない');
  validateControlTime(r.time,fail);
  let s;try{s=span(r.time);}catch(e){fail(e.message);}
  const m=/^control:(.+)-(\d{4})-(\d+)$/.exec(r.id||'');
  if(!m||'node:'+m[1]!==r.site||Number(m[2])!==controlYears(r.time)[0]||file!==r.id.slice(8)+'.json')fail('id とファイル名は control:<ノード>-<最早日の年>-<連番>');
  if(seen.has(r.id))fail('id が重複');seen.add(r.id);
  const house=v=>typeof v==='string'&&v.startsWith('clan:')&&clanKeys.has(v.slice(5));
  if(!text(r.summary)||!date(r.checked)||!text(r.checkedBy))fail('summary・checked・checkedBy が要る');
  const sourced=()=>{if(!CONTROL_VOCAB.evidenceDepth.includes(r.evidenceDepth)||!sources.has(r.source)||!text(r.locator))fail('evidenceDepth・登録済みの source・locator が要る');};
  if(r.type==='change'){
   if(!(house(r.from)||r.from==='unknown'||r.from==='none')||!(house(r.to)||r.to==='none'))fail('from・to の家の鍵');
   if(!CONTROL_VOCAB.cause.includes(r.cause)||!CONTROL_VOCAB.dateKind.includes(r.dateKind))fail('cause・dateKind の語彙');
   sourced();
  }else{
   if(!CONTROL_VOCAB.value.includes(r.value))fail('value の語彙');
   const period=r.time.kind===undefined;
   if(period?typeof r.boundsAsserted!=='boolean':r.boundsAsserted!==undefined)fail('boundsAsserted は期間のときだけ必須');
   if(r.value==='held'?!house(r.holder):r.holder!==undefined)fail('holder は held のときだけ必須');
   if(r.value==='contested'?!(Array.isArray(r.claimants)&&r.claimants.length>=2&&r.claimants.every(house)&&new Set(r.claimants).size===r.claimants.length):r.claimants!==undefined)fail('claimants は contested のとき 2 つ以上');
   if(r.value==='undetermined'){
    if(!period||r.boundsAsserted!==true)fail('不明は期間で、boundsAsserted は true');
    if(!Array.isArray(r.searched)||!r.searched.length||r.searched.some(q=>!q||!sources.has(q.source)||!text(q.query)||!date(q.date)||!Array.isArray(q.years)||q.years.length!==2||!q.years.every(Number.isInteger)||q.years[0]>q.years[1]))fail('不明には探した範囲 searched が要る');
    const [y0,y1]=controlYears(r.time);
    for(let y=y0;y<=y1;y++)if(!r.searched.some(q=>q.years[0]<=y&&y<=q.years[1]))fail('不明の期間が探した範囲からはみ出す');
    if(r.source!==undefined||r.locator!==undefined)sourced();
   }else{
    if(r.searched!==undefined)fail('searched は不明のときだけ');
    sourced();
   }
  }
  if(r.alsoSources!==undefined&&(!Array.isArray(r.alsoSources)||!r.alsoSources.length||r.alsoSources.some(a=>!a||!sources.has(a.source)||!text(a.locator))))fail('alsoSources は登録済みの source と locator の組');
  if(r.claim!==undefined&&!claimIds.has(r.claim))fail('claim が既存の命題でない');
  if(r.place!==undefined&&!(typeof r.place==='string'&&r.place.startsWith('place:')&&(!placeIds||placeIds.has(r.place))))fail('place が登録済みの場所でない');
  if(r.variantOf!==undefined&&(!Array.isArray(r.variantOf)||!r.variantOf.length||r.variantOf.some(v=>typeof v!=='string'||v===r.id)))fail('variantOf は相手の id の一覧');
  if(r.uncertainty!==undefined&&!text(r.uncertainty))fail('uncertainty が空');
  records.push(Object.assign(r,{_span:s,_file:file}));
 }
 const byId=new Map(records.map(r=>[r.id,r]));
 for(const r of records)for(const v of r.variantOf||[]){const o=byId.get(v);if(!o||o.site!==r.site||!(o.variantOf||[]).includes(r.id))throw Error('支配の記録が不正（variantOf は同じノードの相手と相互に書く）: '+r._file);}
 // 束（variantOf でつながる全体）が同じ記録どうしは、食い違いを拒まない。
 const root=new Map(records.map(r=>[r.id,r.id])),find=id=>{while(root.get(id)!==id)id=root.get(id);return id;};
 for(const r of records)for(const v of r.variantOf||[])root.set(find(r.id),find(v));
 const wide=r=>r._span.latest>r._span.earliest,sure=r=>r.type==='observation'&&(!wide(r)||r.time.kind===undefined&&r.boundsAsserted===true);
 const overlap=(a,b)=>a._span.earliest<=b._span.latest&&b._span.earliest<=a._span.latest,state=r=>JSON.stringify([r.value,r.holder||null,[...(r.claimants||[])].sort()]);
 for(let i=0;i<records.length;i++)for(let j=i+1;j<records.length;j++){
  const a=records[i],b=records[j];
  if(a.site!==b.site||find(a.id)===find(b.id)||!overlap(a,b))continue;
  const und=r=>r.type==='observation'&&r.value==='undetermined',known=r=>r.type==='change'||sure(r)&&!und(r);
  if(sure(a)&&sure(b)&&!und(a)&&!und(b)&&state(a)!==state(b))throw Error('支配の記録が不正（同じ日について確かな観察が食い違う。直すか variantOf で結ぶ）: '+a._file+' と '+b._file);
  if(und(a)&&known(b)||und(b)&&known(a))throw Error('支配の記録が不正（不明の期間の中に、分かっている日がある。不明の期間を切る）: '+a._file+' と '+b._file);
  if(a.type==='change'&&b.type==='change'&&!wide(a)&&!wide(b)&&a.to!==b.from&&b.to!==a.from)warnings.push('同じ日のつながらない変化: '+a._file+' と '+b._file);
 }
 for(const r of records){delete r._span;delete r._file;}
 return {records,warnings};
}
module.exports={loadEvidence,validateEventTime,catalogWaterKeys,loadControl};
