/* 史実参照用の所在台帳。役職・本拠と、その日の現地滞在を混同しない。 */
const fs=require('node:fs'),path=require('node:path');
function readRecords(dir){return fs.existsSync(dir)?fs.readdirSync(dir).filter(n=>n.endsWith('.json')).sort().map(n=>JSON.parse(fs.readFileSync(path.join(dir,n),'utf8'))):[];}
function unique(rows,prefix){const ids=new Set();for(const r of rows){if(!r.id?.startsWith(prefix)||ids.has(r.id))throw Error('安定IDの欠落・重複: '+r.id);ids.add(r.id);}return ids;}
function validateTime(t){if(!t)throw Error('年代が必要');
 if(t.kind==='year-window'){if(t.calendar!=='CE-year'||t.precision!=='year'||!Number.isInteger(t.year))throw Error('年精度の時点が不正');}
 else if(t.kind==='year-interval'){if(t.calendar!=='CE-year'||t.precision!=='year'||!Number.isInteger(t.from)||!Number.isInteger(t.untilExclusive)||t.from>=t.untilExclusive)throw Error('年代区間が不正');}
 else if(t.kind==='dated-event'){const d=t.date;if(t.calendar!=='Japanese-lunisolar'||t.precision!=='day'||typeof t.leapMonth!=='boolean'||!Array.isArray(d)||d.length!==3||!d.every(Number.isInteger)||d[1]<1||d[1]>12||d[2]<1||d[2]>30)throw Error('旧暦日付・閏月区分が不正');}
 else throw Error('未対応の年代形式');
}
function validateLocations({people,places,locations,sources}){
 const persons=unique(people,'person:'),sites=unique(places,'place:');unique(locations,'location:');
 const authorityOwners=new Set();
 for(const p of people){
  if(!p.name||!Array.isArray(p.gameNames))throw Error('人物の名称が必要');
  const ids=p.authorityIds??[];
  if(!Array.isArray(ids))throw Error('人物の典拠IDは配列で指定: '+p.id);
  for(const id of ids){
   if(typeof id!=='string'||!/^(?:wikidata:Q[1-9][0-9]*|ndlna:[0-9]{8,9})$/.test(id))throw Error('人物の典拠ID形式が不正: '+p.id);
   if(authorityOwners.has(id))throw Error('人物の典拠IDが重複: '+id);
   authorityOwners.add(id);
  }
 }
 for(const p of places){
  if(!p.name)throw Error('場所の名称が必要');
  if(p.geometryStatus==='not-asserted'){
   if(p.geometry!==null)throw Error('未照合の座標を場所登録へ混ぜない');
   continue;
  }
  const geometry=p.geometry,evidence=p.geometryEvidence;
  if(p.geometryStatus!=='site-representative'||geometry?.type!=='Point'||!Array.isArray(geometry.coordinates)||geometry.coordinates.length!==2)throw Error('場所の代表点形式が不正');
  const [lon,lat]=geometry.coordinates;
  if(![lon,lat].every(Number.isFinite)||Math.abs(lon)>180||Math.abs(lat)>90)throw Error('場所の経緯度が不正');
  if(!evidence?.sourceUrl?.startsWith('https://')||!evidence.locator||!evidence.scope||!/^\d{4}-\d{2}-\d{2}$/.test(evidence.checked||''))throw Error('代表点の照合根拠が不足');
 }
 const relations=new Set(['held-castle-lordship','principal-base','residence-transfer','attested-presence']);
 for(const r of locations){if(r.estimated===true||r.runId)throw Error('推定・プレイ履歴を史実参照へ混ぜない');validateTime(r.time);if(!persons.has(r.person)||!sites.has(r.place))throw Error('人物・場所IDが未登録');
  if(!relations.has(r.relation)||r.recordType!=='sourced-location-observation'||r.status!=='verified-in-specified-scope')throw Error('関係・審査状態が不正');
  if(r.corroboratingSources!==undefined&&(!Array.isArray(r.corroboratingSources)||r.corroboratingSources.some(id=>typeof id!=='string'||!sources[id])))throw Error('補助出典IDが不正');
  if(!sources[r.source]||r.sourceUrl!==sources[r.source].url||!r.locator||!r.uncertainty||!/^\d{4}-\d{2}-\d{2}$/.test(r.recordedAt||'')||!r.gameBindings?.length)throw Error('出典・範囲・記録日・実装対応が不足');
 }
 return {people,places,locations};
}
function loadLocations({root,sources}){return validateLocations({people:readRecords(path.join(root,'people')),places:readRecords(path.join(root,'places')),locations:readRecords(path.join(root,'locations')),sources});}
function queryLocations(data,{person='',place='',year,fromYear,toYear,lunarDate,leapMonth=false}={}){
 if(lunarDate){if(year!==undefined&&year!==lunarDate[0])throw Error('年と旧暦日の指定が不一致');validateTime({kind:'dated-event',calendar:'Japanese-lunisolar',precision:'day',date:lunarDate,leapMonth});year=lunarDate[0];}
 if([year,fromYear,toYear].some(value=>value!==undefined&&!Number.isInteger(value)))throw Error('検索年が不正');
 const lower=fromYear??-Infinity,upper=toYear??Infinity;
 if(lower>upper||year!==undefined&&(year<lower||year>upper))throw Error('検索年と期間の指定が不一致');
 const people=new Map(data.people.map(p=>[p.id,p])),places=new Map(data.places.map(p=>[p.id,p]));
 const selectedPeople=person?data.people.filter(p=>{
  if(/^(?:person|wikidata|ndlna):/.test(person))return [p.id,...(p.authorityIds??[])].includes(person);
  return [p.name,...p.gameNames].some(name=>name.includes(person));
 }):data.people;
 const selectedIds=new Set(selectedPeople.map(p=>p.id));
 const matches=data.locations.filter(r=>{
  const site=places.get(r.place),t=r.time;
  if(!selectedIds.has(r.person))return false;
  if(place&&!(place.startsWith('place:')?site.id===place:site.name.includes(place)))return false;
  const start=t.kind==='year-interval'?t.from:t.year??t.date[0];
  const end=t.kind==='year-interval'?t.untilExclusive-1:start;
  if(end<(year??lower)||start>(year??upper))return false;
  if(lunarDate&&t.kind==='dated-event'&&(t.date.some((v,i)=>v!==lunarDate[i])||t.leapMonth!==leapMonth))return false;return true;
 }).map(r=>({...r,personName:people.get(r.person).name,placeName:places.get(r.place).name,interpretation:r.relation==='principal-base'?'本拠の情報。現地滞在を保証しない':r.relation==='held-castle-lordship'?'城主就任・役職の情報。現地滞在を保証しない':r.time.kind==='year-window'?'この年の記録。指定日の滞在は確定しない':'日付のある出来事。前後の連続滞在は確定しない'}));
 return {matchedPeople:person?selectedPeople.map(p=>({id:p.id,name:p.name})):[],matches,answerable:!!matches.length,exactPresenceConfirmed:!!lunarDate&&matches.some(r=>r.relation==='attested-presence'&&r.time.kind==='dated-event'),continuousPresenceAssumed:false};
}
module.exports={loadLocations,validateLocations,queryLocations};
