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
 for(const p of people)if(!p.name||!Array.isArray(p.gameNames))throw Error('人物の名称が必要');
 for(const p of places)if(!p.name||p.geometry!==null||p.geometryStatus!=='not-asserted')throw Error('未照合の座標を場所登録へ混ぜない');
 const relations=new Set(['held-castle-lordship','principal-base','residence-transfer','attested-presence']);
 for(const r of locations){if(r.estimated===true||r.runId)throw Error('推定・プレイ履歴を史実参照へ混ぜない');validateTime(r.time);if(!persons.has(r.person)||!sites.has(r.place))throw Error('人物・場所IDが未登録');
  if(!relations.has(r.relation)||r.recordType!=='sourced-location-observation'||r.status!=='verified-in-specified-scope')throw Error('関係・審査状態が不正');
  if(!sources[r.source]||r.sourceUrl!==sources[r.source].url||!r.locator||!r.uncertainty||!/^\d{4}-\d{2}-\d{2}$/.test(r.recordedAt||'')||!r.gameBindings?.length)throw Error('出典・範囲・記録日・実装対応が不足');
 }
 return {people,places,locations};
}
function loadLocations({root,sources}){return validateLocations({people:readRecords(path.join(root,'people')),places:readRecords(path.join(root,'places')),locations:readRecords(path.join(root,'locations')),sources});}
function queryLocations(data,{person='',year,lunarDate,leapMonth=false}={}){
 if(lunarDate){if(year!==undefined&&year!==lunarDate[0])throw Error('年と旧暦日の指定が不一致');validateTime({kind:'dated-event',calendar:'Japanese-lunisolar',precision:'day',date:lunarDate,leapMonth});year=lunarDate[0];}
 if(year!==undefined&&!Number.isInteger(year))throw Error('検索年が不正');
 const people=new Map(data.people.map(p=>[p.id,p])),places=new Map(data.places.map(p=>[p.id,p]));
 const matches=data.locations.filter(r=>{const p=people.get(r.person),t=r.time;if(person&&![p.id,p.name,...p.gameNames].some(s=>s.includes(person)))return false;
  if(year!==undefined){if(t.kind==='year-interval'){if(year<t.from||year>=t.untilExclusive)return false;}else if(year!==(t.year??t.date[0]))return false;}
  if(lunarDate&&t.kind==='dated-event'&&(t.date.some((v,i)=>v!==lunarDate[i])||t.leapMonth!==leapMonth))return false;return true;
 }).map(r=>({...r,personName:people.get(r.person).name,placeName:places.get(r.place).name,interpretation:r.relation==='principal-base'?'本拠の情報。現地滞在を保証しない':r.relation==='held-castle-lordship'?'城主就任・役職の情報。現地滞在を保証しない':r.time.kind==='year-window'?'この年の記録。指定日の滞在は確定しない':'日付のある出来事。前後の連続滞在は確定しない'}));
 return {matches,answerable:!!matches.length,exactPresenceConfirmed:!!lunarDate&&matches.some(r=>r.relation==='attested-presence'&&r.time.kind==='dated-event'),continuousPresenceAssumed:false};
}
module.exports={loadLocations,validateLocations,queryLocations};
