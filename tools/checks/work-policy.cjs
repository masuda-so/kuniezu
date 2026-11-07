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
