const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict'),{loadEvidence}=require('../research/evidence-store.cjs');
const root=path.resolve(__dirname,'../..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'kuniezu-evidence-')),claimDir=path.join(dir,'claims'),sourceDir=path.join(dir,'sources');fs.mkdirSync(claimDir);fs.mkdirSync(sourceDir);
const r=JSON.parse(fs.readFileSync(path.join(root,'data/research/curated/claims',fs.readdirSync(path.join(root,'data/research/curated/claims'))[0]))),baseSources={[r.source]:{url:r.sourceUrl}},put=(name,row)=>fs.writeFileSync(path.join(claimDir,name),JSON.stringify(row));
try{put('a.json',r);assert.equal(loadEvidence({claimDir,sourceDir,baseSources}).facts.length,1);put('b.json',{...r,id:'second-author'});assert.equal(loadEvidence({claimDir,sourceDir,baseSources}).facts.length,2);const before=fs.readFileSync(path.join(claimDir,'b.json'),'utf8');loadEvidence({claimDir,sourceDir,baseSources});assert.equal(fs.readFileSync(path.join(claimDir,'b.json'),'utf8'),before);
 put('b.json',{...r,id:'duplicate'});put('a.json',{...r,id:'duplicate'});assert.throws(()=>loadEvidence({claimDir,sourceDir,baseSources}),/重複/);put('a.json',r);
 for(const change of [{status:'unverified'},{source:'absent'},{validYears:[1600,1590]},{sourceUrl:'https://example.invalid'},{gameBindings:[]}]){put('b.json',{...r,id:'invalid',...change});assert.throws(()=>loadEvidence({claimDir,sourceDir,baseSources}));}
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

for(const person of people){
 const evidence=person.authorityEvidence;
 if(!evidence?.snapshot)continue;
 const snapshot=JSON.parse(fs.readFileSync(path.join(root,evidence.snapshot),'utf8'));
 const matches=snapshot.records.filter(row=>person.authorityIds.includes('wikidata:'+row.wikidataId));
 assert.equal(matches.length,1,person.id+' authority snapshot identity');
 const row=matches[0];
 assert.equal(row.wikidataRevision,evidence.wikidataRevision);
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
