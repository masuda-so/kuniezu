/* Reviewed Markdown is the reading path; raw snapshots are optional evidence. */
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{assertSourceSafe}=require('./source-privacy.cjs');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),rel=(from,to)=>path.relative(from,to).split(path.sep).join('/');
const categories={'aizu-ieyasu-review':'家康の行程・関ヶ原','aki-castle-review':'土佐の城跡','historical-map-candidates':'歴史地図・利用条件','hokurikudo-review':'北陸の交通史','kashiwagi-review':'柏木城跡','kojima-coast-review':'児島湾・備前国図','okitanawate-review':'沖田畷の戦い'};
function renderSourceNotes(root){
 const dir=path.join(root,'data/research/source-notes'),catalog=JSON.parse(fs.readFileSync(path.join(dir,'catalog.json'),'utf8')),organized=catalog.sources.map(r=>r.organized).sort().at(-1),rows=[];
 // Check all inputs before any output is written, so rejection cannot leave a new raw archive.
 const inputs=catalog.sources.map(r=>{
  assertSourceSafe(Buffer.from(JSON.stringify(r)),r.id+' metadata');
  const original=path.join(root,r.originalFile),note=original.replace(/\.html?$/i,'.md'),archive=path.join(root,'data/source-archives/html',path.relative(path.join(root,'data/inputs'),original)+'.gz');
  assert(original.startsWith(path.join(root,'data/inputs')+path.sep));assert(note!==original);assert(archive.startsWith(path.join(root,'data/source-archives/html')+path.sep));
  if(r.archiveWithheld){const retained=path.join(root,r.retainedTextFile||'');assert(retained.startsWith(path.join(root,'data/inputs')+path.sep));const text=fs.readFileSync(retained);assertSourceSafe(text,r.id);return {r,original,note,archive,retained,text};}
  const raw=fs.existsSync(original)?fs.readFileSync(original):zlib.gunzipSync(fs.readFileSync(archive));assert.equal(sha(raw),r.originalSha256,`original changed: ${r.id}`);assertSourceSafe(raw,r.id);return {r,original,note,archive,raw};
 });
 for(const {r,original,note,archive,raw,retained,text:retainedText} of inputs){
  let evidence,meta;
  if(r.archiveWithheld){
   // These are our archive/original paths only. Withheld content must not be recreated.
   for(const file of [archive,original])if(fs.existsSync(file))fs.unlinkSync(file);
   evidence=`- 原HTML：保存対象外。${r.archiveWithheld}\n- [照合用の抽出本文](${rel(path.dirname(note),retained)})\n- 抽出本文SHA-256：\`${sha(retainedText)}\`\n`;
   meta={archive:null,archiveWithheld:r.archiveWithheld,retainedTextFile:rel(root,retained),retainedTextSha256:sha(retainedText)};
  }else{
   fs.mkdirSync(path.dirname(archive),{recursive:true});if(!fs.existsSync(archive))fs.writeFileSync(archive,zlib.gzipSync(raw));assert.deepEqual(zlib.gunzipSync(fs.readFileSync(archive)),raw);
   evidence=`- [照合用の原HTML（gzip）](${rel(path.dirname(note),archive)})\n- 原取得時の文字コード：${r.encoding}\n- 展開後SHA-256：\`${r.originalSha256}\`\n`;
   meta={archive:rel(root,archive),archiveSha256:sha(fs.readFileSync(archive))};
  }
  const text=`# ${r.title}\n\n- 作成・提供：${r.author}\n- 原ページ：[${r.title}](${r.url})\n- 確認箇所：${r.locator}\n- 整理日：${r.organized}\n- 記録区分：${r.kind==='image-access-record'?'画像への接続記録':'読書用の要約（原文の全文転載ではない）'}\n\n## 確認内容\n\n${r.summary.map(s=>'- '+s).join('\n')}\n\n## 資料の適用範囲\n\n${r.limits.map(s=>'- '+s).join('\n')}\n\n## 原取得記録\n\n画面のメニュー・装飾・実行用スクリプトは省き、内容を要約して整理した。要約の作成だけで史実の検証済み命題を増やさない。個別の史実判定は出典の該当箇所と確認済み命題台帳へ戻って確認する。\n\n${evidence}`;
  fs.writeFileSync(note,text);if(fs.existsSync(original))fs.unlinkSync(original);rows.push({id:r.id,title:r.title,note:rel(root,note),originalSha256:r.originalSha256,noteSha256:sha(Buffer.from(text)),...meta});
 }
 fs.writeFileSync(path.join(dir,'README.md'),'# 資料ノート索引\n\nHTMLで取得した資料を、書誌・確認箇所・要約・適用範囲が読めるMarkdownへ整理した索引。史実の根拠となる命題は `curated/claims`、照合用の原取得物は `data/source-archives/html` に分ける。キー等を含む原HTMLは保存せず、抽出本文だけを保持する。\n\n| 分野 | 資料 | 区分 |\n| --- | --- | --- |\n'+rows.map(r=>`| ${categories[r.id.split('/')[0]]||r.id.split('/')[0]} | [${r.title}](${rel(dir,path.join(root,r.note))}) | ${catalog.sources.find(s=>s.id===r.id).kind==='image-access-record'?'画像接続記録':'要約'} |`).join('\n')+'\n');
 fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify({organized,sources:rows},null,2)+'\n');return {notes:rows.length,rawArchives:rows.filter(r=>r.archive).length,withheld:rows.filter(r=>r.archiveWithheld).length};
}
if(require.main===module)console.log(JSON.stringify(renderSourceNotes(path.resolve(__dirname,'../..'))));
module.exports={renderSourceNotes};
