const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict'),{loadEvidence}=require('../research/evidence-store.cjs');
const root=path.resolve(__dirname,'../..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'kuniezu-evidence-')),claimDir=path.join(dir,'claims'),sourceDir=path.join(dir,'sources');fs.mkdirSync(claimDir);fs.mkdirSync(sourceDir);
const r=JSON.parse(fs.readFileSync(path.join(root,'data/research/curated/claims',fs.readdirSync(path.join(root,'data/research/curated/claims'))[0]))),baseSources={[r.source]:{url:r.sourceUrl}},put=(name,row)=>fs.writeFileSync(path.join(claimDir,name),JSON.stringify(row));
try{put('a.json',r);assert.equal(loadEvidence({claimDir,sourceDir,baseSources}).facts.length,1);put('b.json',{...r,id:'second-author'});assert.equal(loadEvidence({claimDir,sourceDir,baseSources}).facts.length,2);const before=fs.readFileSync(path.join(claimDir,'b.json'),'utf8');loadEvidence({claimDir,sourceDir,baseSources});assert.equal(fs.readFileSync(path.join(claimDir,'b.json'),'utf8'),before);
 put('b.json',{...r,id:'duplicate'});put('a.json',{...r,id:'duplicate'});assert.throws(()=>loadEvidence({claimDir,sourceDir,baseSources}),/重複/);put('a.json',r);
 for(const change of [{status:'unverified'},{source:'absent'},{validYears:[1600,1590]},{sourceUrl:'https://example.invalid'},{gameBindings:[]}]){put('b.json',{...r,id:'invalid',...change});assert.throws(()=>loadEvidence({claimDir,sourceDir,baseSources}));}
 fs.rmSync(path.join(claimDir,'b.json'));
 const alone={...r,id:'subject-only-event',entity:'water:lagoon',predicate:'reclamation-stage',value:'工事の年は記録され、地点は特定されていない。',datePrecision:'year',validYears:[1728,1728],linkedEntities:[],eventRelation:'drainage-work-stage',eventScope:'地点を推定しない年の記録',eventTime:{kind:'year-window',calendar:'CE-year',precision:'year',year:1728}};
 put('a.json',alone);assert.equal(loadEvidence({claimDir,sourceDir,baseSources}).facts.length,1,'known year does not require invented related places');
 put('a.json',{...alone,datePrecision:'day',validYears:[1600,1600],eventTime:{kind:'dated-event',calendar:'Japanese-lunisolar',precision:'day',date:[1600,9,15],leapMonth:false}});assert.equal(loadEvidence({claimDir,sourceDir,baseSources}).facts.length,1,'known day can have only its primary subject');
 for(const change of [{linkedEntities:undefined},{linkedEntities:['water:unsupported']},{linkedEntities:['place:x','place:x']},{eventRelation:undefined},{eventScope:undefined},{eventTime:{kind:'dated-components',calendar:'CE-year',precision:'year',components:[{year:1728,entities:['place:x']}]}},{eventTime:{kind:'described-period',calendar:'Japanese-era-description',precision:'period',label:'時期を限定できない',indexYears:[1728,1728],boundsAreHistoricalStartEnd:false}}]){put('a.json',{...alone,...change});assert.throws(()=>loadEvidence({claimDir,sourceDir,baseSources}),/年代・対象/);}
 console.log('PASS: explicit subject-only year/day events accepted; missing, duplicate and invalid links and unsupported empty components rejected');
 console.log('PASS: independent author inputs preserved; duplicates, unreviewed claims, missing sources, reversed years and wrong URLs rejected');
}finally{fs.rmSync(dir,{recursive:true,force:true});}

const research=path.join(root,'data/research');
const people=fs.readFileSync(path.join(research,'people.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
const claims=new Map(fs.readFileSync(path.join(research,'claims.jsonl'),'utf8').trim().split('\n').map(JSON.parse).map(r=>[r.id,r]));
const places=fs.readFileSync(path.join(research,'places.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
for(const person of [...people,...places]){
 const basis=person.identityBasis;
 if(!basis)continue;
 assert.ok(Array.isArray(basis.claimIds)&&basis.claimIds.length,person.id+' identity claims');
 for(const id of basis.claimIds){
  const claim=claims.get(id);
  assert.ok(claim,person.id+' missing claim '+id);
  assert.ok([claim.entity,...(claim.linkedEntities||[])].includes(person.id),person.id+' claim belongs to a different entity');
 }
}
console.log('PASS: registered person and place identity bases refer to existing claims for the same entity');

function verifyNdlAlternativeName(person,row,raw,wikidata){
 const match=row.ndlNameMatch,names=[person.name,...person.gameNames,...(person.aliases??[])];
 assert.equal(raw.ndlId,row.ndlId,'NDL ID differs from retained response');
 assert.equal(raw.data.uri,'http://id.ndl.go.jp/auth/ndlna/'+row.ndlId);
 assert.deepEqual(raw.data.primaryTopic,row.ndlIdentity,'NDL primary person differs');
 const entities=wikidata.records.filter(item=>item.id===row.wikidataId);
 assert.equal(entities.length,1);assert.equal(entities[0].revision,row.wikidataRevision);
 assert.ok(entities[0].identityClaims.P349.some(item=>item.mainsnak?.datavalue?.value===row.ndlId),'Wikidata does not link this NDL identity');
 assert.equal(match.collection,'altLabel');
 assert.ok(Number.isInteger(match.index)&&match.index>=0);
 assert.ok(['literalForm','transcription'].includes(match.field));
 assert.equal(match.rawPointer,`/data/altLabel/${match.index}/${match.field}`);
 assert.equal(raw.data.altLabel?.[match.index]?.[match.field],match.value,'NDL alternate name differs from retained response');
 assert.ok(names.includes(match.value),'NDL alternate name does not identify this person');
}

// Preserve both existing QID-keyed snapshots and unmodified Special:EntityData JSON.
function verifyRawAuthority(row,snapshot,bytes){
 const expectedSha=row.rawSha256??snapshot.rawSha256;
 assert.match(expectedSha,/^[a-f0-9]{64}$/,'raw SHA is required');
 assert.equal(require('node:crypto').createHash('sha256').update(bytes).digest('hex'),expectedSha,'raw SHA differs');
 const raw=JSON.parse(bytes),item=(raw.entities??raw)[row.wikidataId];
 assert.ok(item,'missing entity '+row.wikidataId);
 assert.equal(item.id,row.wikidataId);
 assert.equal(item.lastrevid,row.wikidataRevision,'revision differs');
 assert.equal(item.labels?.ja?.value??null,row.wikidataJapaneseLabel);
 assert.ok(item.claims.P31.some(c=>c.mainsnak?.datavalue?.value?.id==='Q5'));
 return item;
}
const authoritySources=new Map(fs.readFileSync(path.join(research,'sources.jsonl'),'utf8').trim().split('\n').map(JSON.parse).map(row=>[row.id,row]));

// NDL-only identities retain their own original response; no invented Wikidata row.
function verifyNdlSnapshot(person,snapshot,bytes){
 const n=snapshot.ndl,raw=JSON.parse(bytes),names=[person.name,...person.gameNames,...(person.aliases??[])];
 const norm=value=>value.replace(/[\s,、]/g,'');
 assert.equal(require('node:crypto').createHash('sha256').update(bytes).digest('hex'),n.rawSha256,'NDL raw SHA');
 assert(person.authorityIds.includes('ndlna:'+n.id),'NDL authority ID');
 assert.equal(raw.uri,'http://id.ndl.go.jp/auth/ndlna/'+n.id,'NDL response ID');
 assert.equal(raw.primaryTopic.uri,'http://id.ndl.go.jp/auth/entity/'+n.id,'NDL entity ID');
 assert.equal(raw.primaryTopic.type.uri,'http://xmlns.com/foaf/0.1/Person','NDL person type');
 assert.equal(norm(raw.primaryTopic.name),n.primaryName,'NDL primary name');
 assert(names.includes(n.primaryName),'NDL local primary name');
 const alternatives=(raw.altLabel??[]).map(row=>norm(row.literalForm));
 assert(n.alternateNames.length,'NDL alternative required');
 for(const name of n.alternateNames){assert(alternatives.includes(name),'NDL alternate name');assert(names.includes(name),'NDL local alias');}
 assert(/^\d{4}-\d{2}-\d{2}$/.test(n.checked),'NDL checked date');
}
for(const person of people){
 const evidence=person.authorityEvidence;
 if(evidence?.ndlSnapshot){
  const snapshot=JSON.parse(fs.readFileSync(path.join(root,evidence.ndlSnapshot),'utf8'));
  const bytes=fs.readFileSync(path.join(root,snapshot.ndl.rawSnapshot));
  verifyNdlSnapshot(person,snapshot,bytes);
  assert.throws(()=>verifyNdlSnapshot(person,{...snapshot,ndl:{...snapshot.ndl,id:'00269409'}},bytes),/NDL authority ID/);
  assert.throws(()=>verifyNdlSnapshot(person,{...snapshot,ndl:{...snapshot.ndl,alternateNames:['別人']}},bytes),/NDL alternate name/);
  assert.throws(()=>verifyNdlSnapshot(person,{...snapshot,ndl:{...snapshot.ndl,rawSha256:'0'.repeat(64)}},bytes),/NDL raw SHA/);
 }

 if(!evidence?.snapshot)continue;
 const snapshot=JSON.parse(fs.readFileSync(path.join(root,evidence.snapshot),'utf8'));
 const matches=snapshot.records.filter(row=>person.authorityIds.includes('wikidata:'+row.wikidataId));
 assert.equal(matches.length,1,person.id+' authority snapshot identity');
 const row=matches[0];
 assert.equal(row.wikidataRevision,evidence.wikidataRevision);
 if(evidence.sourceIds){
  assert.ok(evidence.sourceIds.length,'authority source IDs are required');
  assert.deepEqual(evidence.sourceIds,row.identitySourceIds);
  for(const id of evidence.sourceIds)assert.ok(authoritySources.has(id),'missing authority source '+id);
  assert.ok(evidence.sourceIds.some(id=>authoritySources.get(id).url===row.identitySourceUrl),'authority source URL differs');
 }
 assert.ok([person.name,...person.gameNames].includes(row.japaneseLabel??row.label??row.name));
 if(person.authorityIds.some(id=>id.startsWith('ndlna:'))){
  assert.ok(person.authorityIds.includes('ndlna:'+row.ndlId));
  if(![person.name,...person.gameNames].includes(row.ndlIdentity.name)){
   assert.ok(row.ndlNameMatch?.snapshot&&row.rawIdentitySnapshot,'NDL alternate-name evidence missing');
   const raw=JSON.parse(fs.readFileSync(path.join(root,row.ndlNameMatch.snapshot),'utf8'));
   const wikidata=JSON.parse(fs.readFileSync(path.join(root,row.rawIdentitySnapshot),'utf8'));
   verifyNdlAlternativeName(person,row,raw,wikidata);
   const otherPerson={...raw,ndlId:'00269409',data:{...raw.data,uri:'http://id.ndl.go.jp/auth/ndlna/00269409',primaryTopic:{name:'蒲生氏郷'}}};
   assert.throws(()=>verifyNdlAlternativeName(person,row,otherPerson,wikidata),/NDL ID differs/);
   assert.throws(()=>verifyNdlAlternativeName(person,{...row,ndlNameMatch:{...row.ndlNameMatch,value:row.ndlIdentity.name}},raw,wikidata),/NDL alternate name/);
  }
 }else if(row.rawEntityDataSnapshot){
  const bytes=fs.readFileSync(path.join(root,row.rawEntityDataSnapshot));
  verifyRawAuthority(row,snapshot,bytes);
  if(row.rawSha256){
   assert.throws(()=>verifyRawAuthority({...row,rawSha256:'0'.repeat(64)},snapshot,bytes),/raw SHA/);
   assert.throws(()=>verifyRawAuthority({...row,wikidataRevision:row.wikidataRevision+1},snapshot,bytes),/revision/);
   assert.throws(()=>verifyRawAuthority({...row,wikidataId:'Q1'},snapshot,bytes),/missing entity/);
  }
  assert.equal(evidence.scope,'person-identity');
  assert.ok(new Set(row.identityChecks).size>=2,'two identity checks required');
  assert.match(row.identitySourceUrl,/^https:\/\//);
  assert.equal(row.revisionUrl,`https://www.wikidata.org/w/index.php?title=${row.wikidataId}&oldid=${row.wikidataRevision}`);
 }else{
  assert.ok(row.instanceOf.includes('Q5'));
  assert.deepEqual(row.existingClaimIds,person.identityBasis.claimIds);
 }
}
console.log('PASS: adopted authorities match retained identity snapshots');

const {validateEventTime}=require('../research/evidence-store.cjs');
const order=JSON.parse(fs.readFileSync(path.join(research,'curated/claims/agata-receipt-order.json')));
validateEventTime(order);
for(const eventTime of [{...order.eventTime,date:[1614,12,15]},{...order.eventTime,date:[1613,13,1]},{...order.eventTime,calendar:'CE-year'},{kind:'unsupported'}])assert.throws(()=>validateEventTime({...order,eventTime}));
for(const r of claims.values())validateEventTime(r);
const forts=claims.get('takatenjin-six-forts-preparation-years');
assert.throws(()=>validateEventTime({...forts,eventTime:{...forts.eventTime,components:[{year:1579,entities:['place:not-linked']}]}}));
const period=claims.get('tonokori-sadowara-outer-castle');
assert.throws(()=>validateEventTime({...period,eventTime:{...period.eventTime,boundsAreHistoricalStartEnd:true}}));
console.log('PASS: event dates preserve calendar, applicability bounds, component targets and uncertain-period semantics');

// Public numeric inputs are reproducible; private source originals are checked locally.
const retainedSources=fs.readFileSync(path.join(research,'sources.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
const sha=bytes=>require('node:crypto').createHash('sha256').update(bytes).digest('hex');
const retainedBytes=ref=>{const file=path.resolve(root,ref.path);assert.ok(file.startsWith(root+path.sep),'retained input outside repository');const bytes=fs.readFileSync(file);assert.equal(sha(bytes),ref.sha256,ref.path);if(ref.bytes!=null)assert.equal(bytes.length,ref.bytes,ref.path);return bytes;};
for(const source of retainedSources){
 const ref=source.retainedInput?.manifest;if(!ref)continue;
 const manifest=JSON.parse(retainedBytes(ref));assert.equal(manifest.sourceId,source.id);
 for(const input of manifest.repositoryNumericInputs){assert.equal(input.includedInGit,true);assert.ok(!/\.(pdf|png|jpe?g|webp)$/i.test(input.path));retainedBytes(input);}
 const archives=new Map(manifest.localArchiveEntries.map(item=>[item.archiveKey,item]));
 assert.equal(archives.get(source.retainedInput.archiveKey)?.sha256,source.retainedInput.sha256);
 for(const item of archives.values()){assert.equal(item.archiveKey,'sha256:'+item.sha256);assert.equal(item.includedInGit,false);assert.ok(!path.isAbsolute(item.archiveRelativePath)&&!item.archiveRelativePath.split(/[\\/]/).includes('..'));}
}
console.log('PASS: retained numeric inputs and source manifests match SHA; local originals remain separate');
