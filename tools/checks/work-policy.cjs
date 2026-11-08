/* 方針の更新で既存対象や担当・証拠を作り直さない。 */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {syncRequests}=require('../work/build-catalog.cjs');
const work=path.resolve(__dirname,'../../docs/work');
const catalog=fs.readFileSync(path.join(work,'catalog.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
const requests=JSON.parse(fs.readFileSync(path.join(work,'requests.json'),'utf8')).requests;
const before=structuredClone(catalog),changed=structuredClone(requests);changed[0].acceptance=['updated policy'];
const result=syncRequests(catalog,changed);
assert.deepEqual(catalog,before,'input snapshot remains unchanged');
assert.deepEqual(result.map(r=>r.id),before.map(r=>r.id),'all task IDs stay stable');
assert.deepEqual(result.filter(r=>r.kind!=='request'),before.filter(r=>r.kind!=='request'),'all entity tasks remain unchanged');
assert.deepEqual(result.find(r=>r.requestIds?.[0]===changed[0].id&&r.kind==='request').acceptance,['updated policy']);
assert.throws(()=>syncRequests(catalog,requests.slice(1)),/missing/);
assert.throws(()=>syncRequests(catalog,[...requests,requests[0]]),/duplicate/);
const extra=structuredClone(requests);extra.push({...extra[0],id:'new-request'});assert.throws(()=>syncRequests(catalog,extra),/inventory/);
assert.deepEqual(syncRequests(catalog,requests),catalog,'current policy is synchronized');
console.log('PASS: policy updates preserve all task IDs and entity rows; missing, duplicate and unregistered requests rejected');

// Exercise the documented full regeneration, then its CI policy check, in an
// isolated tree so existing task IDs, state and evidence are never overwritten.
const os=require('node:os'),{execFileSync}=require('node:child_process'),crypto=require('node:crypto');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'kuniezu-work-policy-')),root=path.resolve(work,'../..');
try{
 for(const name of ['tools/work/build-catalog.cjs','docs/work/requests.json','data/audits/coverage-review.json','data/audits/deployment-audit.json','data/audits/battle-atlas-audit.json','data/audits/territory-transfer-review.json','kuniezu/static/kuniezu/lake-baselines.js']){const to=path.join(temp,name);fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(path.join(root,name),to);}
 const generator=path.join(temp,'tools/work/build-catalog.cjs');
 execFileSync(process.execPath,[generator],{cwd:temp,stdio:'pipe'});
 const manifest=JSON.parse(fs.readFileSync(path.join(temp,'docs/work/catalog-manifest.json'),'utf8'));
 assert.equal(manifest.requestPolicySha256,crypto.createHash('sha256').update(fs.readFileSync(path.join(temp,'docs/work/requests.json'))).digest('hex'));
 assert.ok(Number.isFinite(Date.parse(manifest.requestPolicyUpdatedAt)),'full generation records policy update time');
 const generated=fs.readFileSync(path.join(temp,'docs/work/catalog.jsonl'));
 execFileSync(process.execPath,[generator,'--requests-only','--check'],{cwd:temp,stdio:'pipe'});
 assert.deepEqual(fs.readFileSync(path.join(temp,'docs/work/catalog.jsonl')),generated,'check never modifies generated catalog');
 assert.deepEqual(fs.readFileSync(path.join(work,'catalog.jsonl'),'utf8').trim().split('\n').map(JSON.parse),before,'real task catalog stays unchanged');
 console.log('PASS: normal catalog regeneration includes policy metadata and passes the CI synchronization check');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
