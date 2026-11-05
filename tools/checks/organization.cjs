/* 配置変更後の参照、依存順、分担の競合防止、完了証拠の保存を検査する。 */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm'),assert=require('node:assert/strict'),cp=require('node:child_process');
const root=path.resolve(__dirname,'../..'),migration=require('../../docs/architecture/path-migration.json');
for(const m of migration.moves){assert.ok(fs.existsSync(path.join(root,m.to)),m.to);assert.ok(!fs.existsSync(path.join(root,m.from)),m.from+' obsolete');}
const html=fs.readFileSync(path.join(root,'kuniezu/templates/index.html'),'utf8'),scripts=[...html.matchAll(/<script src="([^"?]+)(?:\?v=[0-9a-f]+)?"/g)].map(m=>m[1]);assert.equal(new Set(scripts).size,scripts.length);
for(const f of scripts){const p=path.join(root,'kuniezu/static/kuniezu',f);assert.ok(fs.existsSync(p),f);new vm.Script(fs.readFileSync(p,'utf8'),{filename:f});}
const modules=require('../../docs/architecture/modules.json').modules;assert.deepEqual(modules.map(r=>r.file),scripts.map(f=>'kuniezu/static/kuniezu/'+f));
for(const dir of ['tools','docs']){function walk(p){for(const n of fs.readdirSync(p)){const f=path.join(p,n);if(fs.statSync(f).isDirectory()){if(n!=='history'&&n!=='state'&&n!=='claims')walk(f);continue;}if(!/\.(md|cjs|js|py|html)$/.test(n))continue;const s=fs.readFileSync(f,'utf8');for(const m of migration.moves.filter(m=>m.from.startsWith('data/')))assert.ok(!s.includes(m.from),path.relative(root,f)+' obsolete '+m.from);}}walk(path.join(root,dir));}
const catalog=fs.readFileSync(path.join(root,'docs/work/catalog.jsonl'),'utf8').trim().split('\n').map(JSON.parse);assert.equal(new Set(catalog.map(r=>r.id)).size,catalog.length);assert.ok(catalog.every(r=>r.acceptance?.length&&r.requestIds?.length));
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'kuniezu-work-check-')),tool=path.join(root,'tools/work/tasks.cjs'),env={...process.env,KUNIEZU_WORK_STATE:temp};
const run=(args,ok=true)=>{const r=cp.spawnSync(process.execPath,[tool,...args],{cwd:root,env,encoding:'utf8'});if(ok)assert.equal(r.status,0,r.stderr);else assert.notEqual(r.status,0);return r;};
try{
 const a=catalog[0].id,b=catalog[1].id;run(['claim',a,'--owner','a','--files','kuniezu/static/kuniezu/ui.js']);run(['claim',b,'--owner','b','--files','kuniezu/static/kuniezu/ui.js'],false);run(['release',a,'--owner','b'],false);run(['complete',a,'--owner','a','--evidence','README.md'],false);assert.ok(fs.existsSync(path.join(temp,'claims',a+'.json')),'failed completion retains claim');
 run(['complete',a,'--owner','a','--evidence','README.md','--checks','temporary test proof']);const done=JSON.parse(fs.readFileSync(path.join(temp,'state',a+'.json')));assert.equal(done.evidence[0].sha256.length,64);assert.equal(done.status,'complete');assert.ok(!fs.existsSync(path.join(temp,'claims',a+'.json')));
 run(['claim',a,'--owner','b','--files','kuniezu/static/kuniezu/ui.js'],false);run(['claim',b,'--owner','b','--files','../outside'],false);run(['claim',b,'--owner','b','--files','kuniezu/static/kuniezu/ui.js']);run(['release',b,'--owner','b']);
}finally{fs.rmSync(temp,{recursive:true,force:true});}
console.log('PASS: '+migration.moves.length+' relocated files, '+scripts.length+' script dependencies, '+catalog.length+' unique tasks; file collision, owner protection, evidence and release');
