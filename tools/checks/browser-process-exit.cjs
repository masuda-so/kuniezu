'use strict';
// Chrome本体は起動せず、起動失敗と早期終了で待機・一時profileが残らないことを確認。
const {spawnSync}=require('node:child_process');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'kuniezu-process-check-'));
const profiles=()=>new Set(fs.readdirSync(temporary).filter(f=>f.startsWith('kuniezu-check-')));
const results=[];
try{
 const fixture=path.join(temporary,'fake-chrome');
 fs.writeFileSync(fixture,'#!/usr/bin/env node\n'+
  "const fs=require('node:fs');let b='';const r=fs.createReadStream(null,{fd:3}),w=fs.createWriteStream(null,{fd:4});r.on('data',x=>{b+=x;let i;while((i=b.indexOf('\\0'))>=0){const m=JSON.parse(b.slice(0,i));b=b.slice(i+1);if(m.method!=='Browser.close')w.write(JSON.stringify({id:m.id,error:{message:'fixture-target-error'}})+'\\0')}});\n",{mode:0o700});
 for(const [name,executable] of [['missing-executable',path.join(temporary,'missing-chrome')],['early-exit',process.execPath],['unresponsive-close',fixture]]){
  const before=profiles(),start=performance.now();
  const result=spawnSync(process.execPath,[path.join(__dirname,'history-origin-browser.cjs')],{
   env:{...process.env,TMPDIR:temporary,TMP:temporary,TEMP:temporary,CHROME_PATH:executable,GAME_TEST_OUTPUT:path.join(temporary,name),GAME_OVERRIDE_ROOT:''},
   encoding:'utf8',timeout:10000,
  });
  assert.ifError(result.error);assert.equal(result.status,1,name);
  assert.doesNotMatch(result.stderr,/Unhandled 'error' event/,name);
  assert.match(result.stderr,/ENOENT|EPIPE|Chrome exited|Chrome is closed|fixture-target-error/,name);
  const left=[...profiles()].filter(f=>!before.has(f));assert.deepEqual(left,[],name+' profile cleanup');
  results.push({name,status:result.status,elapsedMs:Math.round(performance.now()-start),profilesLeft:left.length});
 }
 if(process.env.GAME_TEST_OUTPUT){fs.mkdirSync(process.env.GAME_TEST_OUTPUT,{recursive:true});fs.writeFileSync(path.join(process.env.GAME_TEST_OUTPUT,'browser-process-exit.json'),JSON.stringify({actualChromeStarted:false,results},null,2)+'\n');}
 console.log('PASS: no Chrome launched; missing executable and early exit terminate with profile cleanup',results);
}finally{fs.rmSync(temporary,{recursive:true,force:true});}
