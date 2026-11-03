/* 一回限りの移行：旧基準に対する1560年の5補正を正本へ焼き込み、宇喜多期だけを年代差分に残す。
 * 対象の確認値が一致しない正本には実行しない。全域RGBは一時ファイルへ流し、行と2タイルだけをメモリへ置く。
 * 実行後は build-map-tiles → build-province-edits → build-edges の順で派生物を作り直す。
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const MD=require('./map-data.cjs'),{readRGB,writeRGB}=require('./png-big.cjs'),decode=require('../geo/png-decode.cjs');
const EXPECTED='9b949f63027df04ce0f12ce36294dd1ac338e057693952b752eff9627680b42f';
const VERSION='15600101-15840101',REVISION='kojima-1560-source-v1';
const IDS=['kojima-bay-reclaimed-sea','kojima-bay-restored-land','mizushima-east-post-period-fill','mizushima-post-period-fill','mizushima-south-post-period-fill'];
async function main(){
 assert.equal(MD.sourceSha256(),EXPECTED,'移行元の正本が違うか、この移行は既に適用済み');
 const dir=path.join(MD.root,'game/map/edits'),ledger=JSON.parse(fs.readFileSync(path.join(dir,'baseline-ledger.json')));
 const versionDir=path.join(dir,'compiled',VERSION),vm=JSON.parse(fs.readFileSync(path.join(versionDir,'manifest.json')));
 assert.equal(ledger.sourceSha256,EXPECTED);assert.equal(vm.baseProvincesSha256,EXPECTED);
 assert.deepEqual(vm.versions[0].edits,IDS);assert.ok(IDS.every(id=>!ledger.applied.some(a=>a.id===id)));
 const before=Object.fromEntries(Object.entries(MD.files).map(([k,f])=>[k,MD.sha(f)]));
 const inputs=IDS.map(id=>{const file=path.join(dir,id+'.json'),edit=JSON.parse(fs.readFileSync(file));return {id,file,edit,sha256:MD.sha(file)};});
 const repl=vm.tiles.filter(t=>t.factor===1).map(t=>{const file=path.join(versionDir,t.file);assert.equal(MD.sha(file),t.sha256);const image=decode(fs.readFileSync(file));assert.equal(image.width,t.width);assert.equal(image.height,t.height);return {...t,image};});
 assert.equal(repl.length,2);
 const P=MD.readProjection(),W=P.width,H=P.height,defs=MD.readDefinition(),window=[9734,12823,630,390],crops=[Buffer.alloc(window[2]*window[3]*3),Buffer.alloc(window[2]*window[3]*3)];
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'kuniezu-kojima-bake-')),raw=path.join(tmp,'province.rgb'),fd=fs.openSync(raw,'w+');
 let changed=0;const deltas={};
 try{
  const info=await readRGB(MD.files.provinces,(y,row)=>{
   if(y>=window[1]&&y<window[1]+window[3])row.copy(crops[0],(y-window[1])*window[2]*3,window[0]*3,(window[0]+window[2])*3);
   for(const t of repl){const localY=y-t.row*1024;if(localY<0||localY>=t.height)continue;
    for(let x=0;x<t.width;x++){const o=(t.col*1024+x)*3,s=(localY*t.width+x)*4,c=t.image.data;
     if(row[o]===c[s]&&row[o+1]===c[s+1]&&row[o+2]===c[s+2])continue;
     const a=defs.byRGB.get(row[o]+','+row[o+1]+','+row[o+2]),b=defs.byRGB.get(c[s]+','+c[s+1]+','+c[s+2]);assert.ok(a&&b,'未定義の色');
     deltas[a.key]=(deltas[a.key]||0)-1;deltas[b.key]=(deltas[b.key]||0)+1;changed++;row[o]=c[s];row[o+1]=c[s+1];row[o+2]=c[s+2];
    }
   }
   if(y>=window[1]&&y<window[1]+window[3])row.copy(crops[1],(y-window[1])*window[2]*3,window[0]*3,(window[0]+window[2])*3);
   fs.writeSync(fd,row,0,row.length,y*W*3);
  });
  assert.equal(info.width,W);assert.equal(info.height,H);assert.equal(changed,Object.values(vm.editPixels).reduce((a,b)=>a+b,0));
  const row=Buffer.alloc(W*3),next=MD.files.provinces+'.baked';
  await writeRGB(next,W,H,y=>{assert.equal(fs.readSync(fd,row,0,row.length,y*W*3),row.length);return row;});
  fs.renameSync(next,MD.files.provinces);
 }finally{fs.closeSync(fd);fs.rmSync(tmp,{recursive:true,force:true});}
 const after=Object.fromEntries(Object.entries(MD.files).map(([k,f])=>[k,MD.sha(f)])),sourceSha256=MD.sourceSha256();
 for(const k of ['definition','defaultMap','projection'])assert.equal(before[k],after[k]);
 const appliedDir=path.join(dir,'applied');fs.mkdirSync(appliedDir,{recursive:true});
 for(const input of inputs){const e=input.edit;for(const k of ['mask','file'])if(e.payload[k])e.payload[k]=path.relative(appliedDir,path.resolve(dir,e.payload[k])).split(path.sep).join('/');
  e.appliedToSourceSha256=sourceSha256;fs.writeFileSync(path.join(appliedDir,input.id+'.json'),JSON.stringify(e,null,2)+'\n');fs.unlinkSync(input.file);
  ledger.applied.push({id:input.id,layer:'provinces',input:['applied/'+input.id+'.json'],pixels:vm.editPixels[input.id],inputSha256:input.sha256,sourceSha256});
 }
 // baselineCommit は旧スキーマの名前。以後はコミット推測値でなく基準版の固定IDを入れ、4入力のSHAで正本を特定する。
 ledger.previousBaseline={baselineCommit:ledger.baselineCommit,sourceSha256:ledger.sourceSha256,baseProvincesSha256:ledger.baseProvincesSha256};
 ledger.baselineCommit=REVISION;ledger.sourceSha256=sourceSha256;delete ledger.baseProvincesSha256;
 ledger.provincesSha256=after.provinces;ledger.sourceFiles=after;ledger.baselineDate=[1560,1,1];
 ledger.note='1560年から全期間に有効な児島湾・水島の5補正を全域1枚の正本へ適用。1560～1583年とタイトル画面はこの正本を使い、1584年以後の宇喜多堤だけを年代差分にする。汀線・築堤月日の精密確定を意味しない。';
 ledger.migration={tool:'tools/map/bake-kojima-baseline.cjs',fromVersion:VERSION,fromSourceSha256:EXPECTED,sourceFilesBefore:before,pixels:changed,deltas};
 fs.writeFileSync(path.join(dir,'baseline-ledger.json'),JSON.stringify(ledger,null,2)+'\n');
 const ukitaFile=path.join(dir,'kojima-bay-ukita-land-from-1584.json'),ukita=JSON.parse(fs.readFileSync(ukitaFile));
 ukita.baseRevision=REVISION;ukita.basis='干拓進展図の「16世紀末」（宇喜多期）の区画のうち、1560年正本で海の所。宇喜多堤（天正12年・1584）の後は陸とする。';
 fs.writeFileSync(ukitaFile,JSON.stringify(ukita,null,2)+'\n');
 const output=path.join(MD.root,'data/verification/kojima-source-baseline');fs.mkdirSync(output,{recursive:true});
 for(const [i,name] of ['before','after'].entries()){
  await writeRGB(path.join(output,name+'-source-rgb.png'),window[2],window[3],y=>crops[i].subarray(y*window[2]*3,(y+1)*window[2]*3));
  const palette={sea:[123,174,195],land:[219,202,160],lake:[139,187,204]};
  await writeRGB(path.join(output,name+'-land-sea.png'),window[2],window[3],y=>{const row=Buffer.alloc(window[2]*3);for(let x=0;x<window[2];x++){const n=(y*window[2]+x)*3,k=defs.byRGB.get(crops[i][n]+','+crops[i][n+1]+','+crops[i][n+2]).kind;row.set(palette[k],x*3);}return row;});
 }
 const report={tool:'tools/map/bake-kojima-baseline.cjs',sourceVersion:VERSION,sourceVersionManifestSha256:MD.sha(path.join(versionDir,'manifest.json')),sourceFilesBefore:before,sourceFilesAfter:after,sourceSha256Before:EXPECTED,sourceSha256After:sourceSha256,changedPixels:changed,deltas,edits:vm.editPixels,sourceTiles:repl.map(({image,...t})=>t),crop:{window,basis:'正本PNGの画素を同じ窓で切り出し。land-sea はdefinition/default.mapの分類色、source-rgb は元RGBを変更せず保存。'}};
 fs.writeFileSync(path.join(output,'migration.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({changed,sourceSha256,after},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
