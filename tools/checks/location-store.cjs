const assert=require('node:assert/strict'),{G,TK}=require('./history-focus.cjs').model(),{loadLocations,validateLocations,queryLocations}=require('../research/location-store.cjs');G.newGame('s1560','oda');const {facts,sources}=require('../research/evidence-store.cjs').loadEvidence({claimDir:'data/research/curated/claims',sourceDir:'data/research/curated/sources',baseSources:TK.RESEARCH_SOURCES});const data=loadLocations({root:'data/research/curated',sources});assert.ok(data.locations.length>=7);
assert.equal(queryLocations(data,{person:'武田勝頼',year:1573}).matches[0].placeName,'躑躅ヶ崎館');const coarse=queryLocations(data,{person:'武田勝頼',lunarDate:[1573,6,1]});assert.ok(coarse.matches.length);assert.equal(coarse.exactPresenceConfirmed,false);
assert.equal(queryLocations(data,{person:'毛利輝元',year:1591}).matches.filter(r=>r.relation==='principal-base').length,0,'exclusive end must not leak into relocation year');assert.equal(queryLocations(data,{person:'家忠',lunarDate:[1592,2,19]}).matches.length,1);assert.equal(queryLocations(data,{person:'家忠',lunarDate:[1592,2,20]}).matches.length,0);assert.equal(queryLocations(data,{person:'家忠',lunarDate:[1592,2,19],leapMonth:true}).matches.length,0);assert.equal(queryLocations(data,{person:'家忠',year:1593}).matches.length,0,'do not fill undocumented years');assert.equal(queryLocations(data,{person:'家忠',year:1594}).continuousPresenceAssumed,false);
const reject=mutate=>{const d=JSON.parse(JSON.stringify(data));mutate(d);assert.throws(()=>validateLocations({...d,sources}));};reject(d=>d.locations.push({...d.locations[0]}));reject(d=>d.locations[0].source='nonexistent');reject(d=>d.locations[0].sourceUrl='https://invalid.example');reject(d=>d.locations[0].person='person:unknown');reject(d=>d.locations[0].status='unchecked');reject(d=>d.locations.find(r=>r.time.kind==='year-interval').time.untilExclusive=1500);reject(d=>d.locations.find(r=>r.time.kind==='dated-event').time.date[2]=31);reject(d=>d.places[0].geometry=[138,35]);reject(d=>d.locations[0].estimated=true);reject(d=>d.locations[0].runId='branch-1');assert.throws(()=>queryLocations(data,{year:1590,lunarDate:[1592,2,19]}));
const yoshihiro=queryLocations(data,{person:'島津忠平',lunarDate:[1572,5,4]});assert.deepEqual(yoshihiro.matches.map(r=>r.placeName).sort(),['木崎原','飯野城'].sort(),'same day can include origin and battlefield');assert.equal(yoshihiro.exactPresenceConfirmed,true);assert.equal(yoshihiro.continuousPresenceAssumed,false);assert.equal(queryLocations(data,{person:'島津義弘',lunarDate:[1572,5,3]}).matches.length,0,'do not invent departure on the preceding day');assert.equal(queryLocations(data,{person:'島津義弘',year:1565}).matches.length,0,'a transfer year is not a daily residence interval');reject(d=>d.locations[0].corroboratingSources=['missing']);reject(d=>d.locations[0].corroboratingSources='kizakiSite');
const fushimi={place:'place:fushimi',lunarDate:[1600,7,5]};
const nagamasa=queryLocations(data,{...fushimi,person:'黒田長政'});
assert.equal(nagamasa.matches.length,1);
assert.equal(nagamasa.exactPresenceConfirmed,true);
for(const person of ['wikidata:Q950496','ndlna:01150199']){
 assert.deepEqual(queryLocations(data,{...fushimi,person}),nagamasa);
}
assert.equal(queryLocations(data,{place:'place:fushimi',fromYear:1601}).matches.length,0);
assert.throws(()=>queryLocations(data,{fromYear:1601,toYear:1600}));
reject(d=>{d.people[0].authorityIds=['wikidata:Q0'];});
reject(d=>{const [owner,other]=d.people.filter(p=>p.authorityIds?.length);other.authorityIds=[...owner.authorityIds];});
const registeredUnknown=queryLocations(data,{person:'織田信長',year:1561});
assert.deepEqual(registeredUnknown.matchedPeople,[{id:'person:oda-nobunaga',name:'織田信長'}]);
assert.equal(registeredUnknown.answerable,false);
assert.deepEqual(queryLocations(data,{person:'__unregistered_person__'}).matchedPeople,[]);
const representative=data.places.find(p=>p.id==='place:安芸城');
assert.equal(representative.geometryStatus,'site-representative');
assert.deepEqual(representative.geometry.coordinates,[133.91259,33.519865]);
reject(d=>{d.places.find(p=>p.id===representative.id).geometry.coordinates=[181,34];});
reject(d=>{delete d.places.find(p=>p.id===representative.id).geometryEvidence;});
reject(d=>{d.places.find(p=>p.id===representative.id).geometryStatus='not-asserted';});
console.log('PASS: dated/year/base distinctions, leap month, half-open intervals, unknown years retained, invalid sources and records rejected');

for(const aliases of ["別名",[""],[null],["同名","同名"]])reject(d=>{d.people[0].aliases=aliases;});

const nurhaci=queryLocations(data,{person:'奴児哈赤',year:1607});
assert.deepEqual(nurhaci.matchedPeople,[{id:'person:ヌルハチ',name:'ヌルハチ'}]);
assert.equal(nurhaci.answerable,false);assert.equal(nurhaci.exactPresenceConfirmed,false);
assert.equal(queryLocations(data,{person:'太祖',year:1607}).matchedPeople.length,0);

const {createHistoryIndex,queryHistory}=require('../research/history-index.cjs');
const history=createHistoryIndex({claims:facts,...data});
for(const entity of ['person:ヴァシーリー・ポヤルコフ','ヴァシリー・ポヤルコフ','wikidata:Q982229']){
 assert.equal(queryHistory(history,{entity,fromYear:1560,toYear:1615}).length,0);
 assert.deepEqual(queryHistory(history,{entity,fromYear:1643,toYear:1646}).map(r=>r.id),['claim:poyarkov-amur-expedition-1643-1646']);
}
console.log('PASS: source-backed aliases retain registered/unknown distinction; post-period expedition is not moved into game years');
