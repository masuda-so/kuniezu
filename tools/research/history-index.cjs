/* A record is stored once; time and entity views contain references to it. */
const assert=require('node:assert/strict');
function createHistoryIndex({claims=[],locations=[],people=[],places=[]}){
 const records=new Map(),byEntity=new Map(),aliases=new Map(),labels=new Map();
 const alias=(name,id)=>{if(!aliases.has(name))aliases.set(name,new Set());aliases.get(name).add(id);};
 for(const p of [...people,...places]){labels.set(p.id,p.name);alias(p.id,p.id);alias(p.name,p.id);alias(p.id.split(':')[0]+':'+p.name,p.id);if(p.id.startsWith('person:'))for(const n of p.gameNames||[]){alias(n,p.id);alias('person:'+n,p.id);}}
 const canonical=id=>aliases.get(id)?.size===1?[...aliases.get(id)][0]:id;
 function add(id,row,entities,time,scope){
  assert(!records.has(id),'Duplicate history record '+id);
  const ids=[...new Set(entities.map(canonical))];
  const value={id,entities:ids,time,scope,record:row};records.set(id,value);
  for(const entity of ids){if(!byEntity.has(entity))byEntity.set(entity,[]);byEntity.get(entity).push(id);alias(entity,entity);alias(entity.slice(entity.indexOf(':')+1),entity);}
 }
 for(const r of claims){assert(r.recordType==='verified-historical-claim'&&r.status==='verified-in-specified-scope'&&!r.runId,'Only reviewed reference claims');const [from,last]=r.validYears;assert(Number.isInteger(from)&&Number.isInteger(last)&&from<=last,'Invalid claim interval');add('claim:'+r.id,r,[r.entity],{fromYear:from,untilExclusive:last+1},'claim-applicability');}
 for(const r of locations){assert(r.recordType==='sourced-location-observation'&&r.status==='verified-in-specified-scope'&&!r.runId&&!r.estimated,'Only reviewed location observations');const t=r.time;assert(['year-interval','year-window','dated-event'].includes(t.kind),'Unsupported time kind');let from,until;if(t.kind==='year-interval'){from=t.from;until=t.untilExclusive;}else{from=t.year??t.date?.[0];until=from+1;}assert(Number.isInteger(from)&&Number.isInteger(until)&&from<until,'Invalid location time');add(r.id,r,[r.person,r.place],{fromYear:from,untilExclusive:until},t.kind==='year-interval'?'attested-interval':'recorded-change');}
 const timeline=[...records.values()].map(r=>({id:r.id,...r.time})).sort((a,b)=>a.fromYear-b.fromYear||a.id.localeCompare(b.id));
 let max=-Infinity;for(const r of timeline){max=Math.max(max,r.untilExclusive);r.prefixMaxUntilExclusive=max;}
 return {records,byEntity,aliases,labels,timeline};
}
function queryHistory(index,{year,entity}={}){
 if(year!==undefined&&!Number.isInteger(year))throw Error('検索年は整数で指定する');
 let entityIds;
 if(entity){entityIds=index.aliases.get(entity)||new Set(index.byEntity.has(entity)?[entity]:[]);}
 let allowed;if(entityIds)allowed=new Set([...entityIds].flatMap(id=>index.byEntity.get(id)||[]));
 let refs;
 if(year===undefined)refs=index.timeline;
 else{
  // Find the final start <= year, then stop once every earlier interval has ended.
  let lo=0,hi=index.timeline.length;while(lo<hi){const mid=(lo+hi)>>1;if(index.timeline[mid].fromYear<=year)lo=mid+1;else hi=mid;}
  refs=[];for(let i=lo-1;i>=0&&index.timeline[i].prefixMaxUntilExclusive>year;i--){const r=index.timeline[i];if(year<r.untilExclusive)refs.push(r);}refs.reverse();
 }
 return refs.filter(r=>!allowed||allowed.has(r.id)).map(r=>index.records.get(r.id));
}
function indexSummary(index){return {records:index.records.size,entities:index.byEntity.size,temporalReferences:index.timeline.length,entityReferences:[...index.byEntity.values()].reduce((n,r)=>n+r.length,0),yearSnapshots:0};}
module.exports={createHistoryIndex,queryHistory,indexSummary};
