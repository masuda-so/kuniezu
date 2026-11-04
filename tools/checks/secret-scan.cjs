/* 公開リポジトリに秘密情報が入っていないかを、git が管理する全ファイル（.gz は展開して）で調べる。
   第三者のページを保存した資料に、そのサイトの埋め込み API キーが混じった例がある（2026-11-02、島原市ページ）。
   値は表示せず、種類・件数・場所だけを出す。検出の決まりは tools/research/source-privacy.cjs と共通。 */
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),{execFileSync}=require('node:child_process');
const {sensitiveMarkers}=require('../research/source-privacy.cjs');
const root=path.resolve(__dirname,'../..');
const extra=[['anthropic-key',/\bsk-ant-[A-Za-z0-9_-]{20,}/g],['openai-key',/\bsk-(?:proj-)?[A-Za-z0-9]{40,}\b/g]];
const files=execFileSync('git',['ls-files','-z'],{cwd:root}).toString().split('\0').filter(Boolean);
const hits=[];let scanned=0;
for(const f of files){const p=path.join(root,f);let b;try{b=fs.readFileSync(p);}catch{continue;}
 if(f.endsWith('.gz')){try{b=zlib.gunzipSync(b);}catch{}}
 scanned++;if(!['AIza','PRIVATE KEY','AKIA','ASIA','ghp_','gho_','ghu_','ghs_','ghr_','github_pat_','xox','sk-'].some(m=>b.includes(m)))continue;const found=sensitiveMarkers(b),text=b.toString('utf8');
 for(const [kind,re] of extra){re.lastIndex=0;let n=0;while(re.exec(text))n++;if(n)found.push({kind,count:n});}
 if(found.length)hits.push(f+' ('+found.map(h=>h.kind+':'+h.count).join(', ')+')');}
if(hits.length){console.error('FAIL: 秘密情報らしき文字列\n'+hits.join('\n'));process.exit(1);}
console.log('PASS: no secrets in',scanned,'tracked files (gzip expanded)');
