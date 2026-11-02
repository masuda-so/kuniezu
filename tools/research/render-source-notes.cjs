/* Render reviewed source notes; keep byte-identical HTML snapshots outside the reading path. */
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),catalog=JSON.parse(fs.readFileSync(path.join(root,'data/research/source-notes/catalog.json'),'utf8'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),rel=(from,to)=>path.relative(from,to).split(path.sep).join('/');
const rows=[],organized=catalog.sources.map(r=>r.organized).sort().at(-1);
const categories={'aizu-ieyasu-review':'家康の行程・関ヶ原','aki-castle-review':'土佐の城跡','historical-map-candidates':'歴史地図・利用条件','hokurikudo-review':'北陸の交通史','kashiwagi-review':'柏木城跡','kojima-coast-review':'児島湾・備前国図','okitanawate-review':'沖田畷の戦い'};
for(const r of catalog.sources){
 const original=path.join(root,r.originalFile),note=original.replace(/\.html?$/i,'.md'),folder=path.dirname(original),archive=path.join(root,'data/source-archives/html',path.relative(path.join(root,'data/inputs'),original)+'.gz');
 assert(original.startsWith(path.join(root,'data/inputs')+path.sep));assert(note!==original);
 let raw;
 if(fs.existsSync(original))raw=fs.readFileSync(original);
 else raw=zlib.gunzipSync(fs.readFileSync(archive));
 assert.equal(sha(raw),r.originalSha256,`original changed: ${r.id}`);
 fs.mkdirSync(path.dirname(archive),{recursive:true});
 if(!fs.existsSync(archive))fs.writeFileSync(archive,zlib.gzipSync(raw));
 assert.deepEqual(zlib.gunzipSync(fs.readFileSync(archive)),raw);
 const text=`# ${r.title}\n\n- 作成・提供：${r.author}\n- 原ページ：[${r.title}](${r.url})\n- 確認箇所：${r.locator}\n- 整理日：${r.organized}\n- 記録区分：${r.kind==='image-access-record'?'画像への接続記録':'読書用の要約（原文の全文転載ではない）'}\n\n## 確認内容\n\n${r.summary.map(s=>'- '+s).join('\n')}\n\n## 資料の適用範囲\n\n${r.limits.map(s=>'- '+s).join('\n')}\n\n## 原取得記録\n\n画面のメニュー・装飾・実行用スクリプトは省き、内容を要約して整理した。要約の作成だけで史実の検証済み命題を増やさない。個別の史実判定は出典の該当箇所と確認済み命題台帳へ戻って確認する。\n\n- [照合用の原HTML（gzip）](${rel(folder,archive)})\n- 原取得時の文字コード：${r.encoding}\n- 展開後SHA-256：\`${r.originalSha256}\`\n`;
 fs.writeFileSync(note,text);if(fs.existsSync(original))fs.unlinkSync(original);
 rows.push({id:r.id,title:r.title,note:rel(root,note),archive:rel(root,archive),originalSha256:r.originalSha256,noteSha256:sha(Buffer.from(text)),archiveSha256:sha(fs.readFileSync(archive))});
}
const index=path.join(root,'data/research/source-notes/README.md'),dir=path.dirname(index);
fs.writeFileSync(index,'# 資料ノート索引\n\nHTMLで取得した資料を、書誌・確認箇所・要約・適用範囲が読めるMarkdownへ整理した索引。史実の根拠となる命題は `curated/claims`、照合用の原取得物は `data/source-archives/html` に分ける。\n\n| 分野 | 資料 | 区分 |\n| --- | --- | --- |\n'+rows.map(r=>`| ${categories[r.id.split('/')[0]]||r.id.split('/')[0]} | [${r.title}](${rel(dir,path.join(root,r.note))}) | ${catalog.sources.find(s=>s.id===r.id).kind==='image-access-record'?'画像接続記録':'要約'} |`).join('\n')+'\n');
fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify({organized,sources:rows},null,2)+'\n');
console.log(`PASS: ${rows.length} Markdown notes; original bytes preserved in gzip archives`);
