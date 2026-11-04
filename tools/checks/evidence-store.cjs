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
  assert.ok([person.name,...person.gameNames].includes(row.ndlIdentity.name));
  assert.ok(person.authorityIds.includes('ndlna:'+row.ndlId));
 }else{
  assert.ok(row.instanceOf.includes('Q5'));
  assert.deepEqual(row.existingClaimIds,person.identityBasis.claimIds);
 }
}
console.log('PASS: adopted authorities match retained identity snapshots');
