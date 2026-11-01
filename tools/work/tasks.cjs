/* 対象別の担当を排他的に取得する。別担当の変更や完了記録を上書きしない。 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),work=path.join(root,'docs/work'),store=process.env.KUNIEZU_WORK_STATE||work;
const args=process.argv.slice(2),command=args.shift()||'list',id=args[0]?.startsWith('--')?null:args.shift(),opts={};
for(let i=0;i<args.length;i+=2){if(!args[i].startsWith('--')||args[i+1]==null)throw Error('オプションは --名前 値');opts[args[i].slice(2)]=args[i+1];}
const rows=fs.readFileSync(path.join(work,'catalog.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
for(const d of ['claims','state'])fs.mkdirSync(path.join(store,d),{recursive:true});
const file=(dir,id)=>path.join(store,dir,id+'.json'),read=p=>fs.existsSync(p)?JSON.parse(fs.readFileSync(p,'utf8')):null;
const status=r=>read(file('state',r.id))?.status||(read(file('claims',r.id))?'active':'queued');
function atomic(p,r){const tmp=p+'.'+process.pid+'.tmp';fs.writeFileSync(tmp,JSON.stringify(r,null,2)+'\n',{flag:'wx'});fs.renameSync(tmp,p);}
function locked(fn){const lock=path.join(store,'.claim-lock');try{fs.mkdirSync(lock);}catch(e){throw Error('担当記録を更新中です。ロックを勝手に削除せず再実行してください。');}try{return fn();}finally{fs.rmdirSync(lock);}}
function repoFile(p){const a=path.resolve(root,p);if(!a.startsWith(root+path.sep))throw Error('対象はプロジェクト内のファイル: '+p);return path.relative(root,a).split(path.sep).join('/');}
function overlap(a,b){return a===b||a.startsWith(b+'/')||b.startsWith(a+'/');}
try{
 if(command==='list'){const list=rows.filter(r=>(!id||r.id===id||r.subject.includes(id))&&(!opts.area||r.area===opts.area)&&(!opts.request||r.requestIds.includes(opts.request))&&(!opts.status||status(r)===opts.status));console.log(JSON.stringify({total:list.length,tasks:list.slice(0,+opts.limit||20).map(r=>({...r,status:status(r),owner:read(file('claims',r.id))?.owner||null}))},null,2));}
 else{
  const row=rows.find(r=>r.id===id);if(!row)throw Error('対象IDがありません');if(!opts.owner)throw Error('--owner 担当名が必要');
  locked(()=>{const claim=read(file('claims',id)),done=read(file('state',id));
   if(command==='claim'){
    if(done?.status==='complete')throw Error('既に完了済みです');if(claim)throw Error('既に担当中: '+claim.owner);if(!opts.files)throw Error('--files 編集対象を指定してください');
    const files=opts.files.split(',').map(repoFile);for(const name of fs.readdirSync(path.join(store,'claims'))){const other=read(path.join(store,'claims',name));if(other.files.some(a=>files.some(b=>overlap(a,b))))throw Error('編集対象が競合: '+other.owner+' '+other.taskId);}
    fs.writeFileSync(file('claims',id),JSON.stringify({taskId:id,owner:opts.owner,files,claimedAt:new Date().toISOString()},null,2)+'\n',{flag:'wx'});console.log('担当取得: '+id);
   }else if(command==='release'||command==='complete'){
    if(!claim||claim.owner!==opts.owner)throw Error('担当者だけが更新できます');
    if(command==='complete'){
     if(!opts.evidence||!opts.checks)throw Error('--evidence 根拠ファイル と --checks 確認した完了条件 を指定してください');
     const evidence=opts.evidence.split(',').map(p=>{p=repoFile(p);const a=path.join(root,p);if(!fs.statSync(a).isFile())throw Error('根拠はファイルを指定: '+p);return {path:p,sha256:crypto.createHash('sha256').update(fs.readFileSync(a)).digest('hex')};});
     atomic(file('state',id),{taskId:id,status:'complete',owner:opts.owner,completedAt:new Date().toISOString(),evidence,checks:opts.checks,acceptance:row.acceptance});
    }
    fs.unlinkSync(file('claims',id));console.log((command==='complete'?'完了記録: ':'担当解放: ')+id);
   }else throw Error('コマンド: list / claim / release / complete');
  });
 }
}catch(e){console.error(e.message);process.exitCode=1;}
