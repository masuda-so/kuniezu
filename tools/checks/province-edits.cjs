/* 年代差分の実コンパイラを一時正本へ向ける回帰検査。配信中の画像は読み書きしない。
   node tools/checks/province-edits.cjs [生成器があるリポジトリのルート]
   Python 版の検査を引き継ぎ、PNG 型紙と失敗時の全出力保持を追加する。 */
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(process.argv[2]||path.join(__dirname,'../..'));
const compilerFile=path.join(root,'tools/map/build-province-edits.cjs');
// 旧版は require だけで実データへ出力するため、公開 API のある版だけ読み込む。
assert.match(fs.readFileSync(compilerFile,'utf8'),/if\s*\(require\.main\s*===\s*module\)/,'一時出力先を指定できる公開 API が必要');
const {build}=require(compilerFile),MD=require(path.join(root,'tools/map/map-data.cjs'));
const {writeRGB}=require(path.join(root,'tools/map/png-big.cjs')),decodePNG=require(path.join(root,'tools/geo/png-decode.cjs'));
assert.equal(typeof build,'function');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const write=(p,v)=>fs.writeFileSync(p,typeof v==='string'?v:JSON.stringify(v));
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const snapshot=dir=>{const rows=[];const walk=(p,prefix='')=>{for(const name of fs.readdirSync(p).sort()){const abs=path.join(p,name),rel=prefix+name;if(fs.statSync(abs).isDirectory())walk(abs,rel+'/');else rows.push([rel,sha(fs.readFileSync(abs))]);}};if(fs.existsSync(dir))walk(dir);return rows;};

(async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'province-edits-'));
 try{
  const dataDir=path.join(tmp,'map_data'),mapDir=path.join(tmp,'map'),editsDir=path.join(mapDir,'edits'),compiledDir=path.join(editsDir,'compiled');
  for(const dir of [dataDir,mapDir,editsDir])fs.mkdirSync(dir,{recursive:true});
  const md=MD.at(dataDir),sea=[8,24,48],land=[1,2,3],other=[4,5,6];
  md.writeDefinition([{id:1,rgb:sea,key:'sea',kind:'sea'},{id:2,rgb:land,key:'castle:a',kind:'land'},{id:3,rgb:other,key:'castle:b',kind:'land'}]);
  await writeRGB(md.files.provinces,2,2,()=>Buffer.from([...sea,...sea]));
  const projection={origin:[0,0],stepUnits:1,K:1,CX:1,LON0:0,LAT0:0};
  write(md.files.projection,{...projection,width:2,height:2});
  const manifest={source:{sha256:md.sourceSha256()},projection,width:2,height:2,tile:1,tiles:[],levels:[4,8].map(f=>({factor:f,dir:'provinces-'+f,width:1,height:1,tiles:[]}))};
  const mf=path.join(mapDir,'manifest.json'),lf=path.join(editsDir,'baseline-ledger.json');
  const ledger={baselineCommit:'fixture',sourceSha256:md.sourceSha256(),applied:[{id:'baked'}]};
  write(mf,manifest);write(lf,ledger);
  // ベクター参照の別契約を直下の領域差分として解釈しない。
  fs.mkdirSync(path.join(editsDir,'vector'));
  fs.copyFileSync(path.join(root,'kuniezu/map/edits/vector/manifest.json'),path.join(editsDir,'vector/manifest.json'));
  const polygon=(name,x,y)=>write(path.join(tmp,name+'.geojson'),{features:[{geometry:{type:'Polygon',coordinates:[[[x,-y],[x+1,-y],[x+1,-y-1],[x,-y-1],[x,-y]]]}}]});
  polygon('one',0,0);polygon('corner',1,1);
  const edit={id:'one',baseRevision:'fixture',layer:'provinces',validFrom:[1560,1,1],validUntil:[1616,1,1],payload:{file:'../../one.geojson',feature:0,fromKey:'sea',toKey:'castle:a'}};
  const A=path.join(editsDir,'a.json'),B=path.join(editsDir,'b.json');
  const run=()=>build({mapDir,md,editsDir,compiledDir});
  const pixel=f=>{const png=decodePNG(fs.readFileSync(f));assert.equal(png.width,1);assert.equal(png.height,1);return Array.from(png.data.subarray(0,3));};
  const version=id=>read(path.join(compiledDir,id,'manifest.json'));
  const checkTiles=(id,expected)=>{const v=version(id);assert.equal(v.baseProvincesSha256,md.sourceSha256());for(const tile of v.tiles){const f=path.join(compiledDir,id,tile.file);assert.equal(sha(fs.readFileSync(f)),tile.sha256);assert.deepEqual(tile.period,v.versions[0].period);assert.deepEqual(pixel(f),expected);}return v;};
  const rejected=(phrase)=>{const before=snapshot(compiledDir);assert.throws(run,e=>e.message.includes(phrase),phrase);assert.deepEqual(snapshot(compiledDir),before,'失敗で配信中の内容を変えない: '+phrase);assert.ok(!fs.existsSync(compiledDir+'.staging'));assert.ok(!fs.existsSync(compiledDir+'.old'));};

  write(A,edit);
  assert.deepEqual(run().map(v=>[v.id,v.edits]),[['15600101-16160101',{one:1}]]);
  const first=checkTiles('15600101-16160101',land);
  assert.deepEqual(first.tiles.map(t=>t.factor),[1],'粗い段の代表点以外の変更を粗い段へ広げない');
  const transition={...edit,validFrom:[1600,9,15],validUntil:[1600,9,17],payload:{...edit.payload,file:'../../corner.geojson'}};
  write(A,transition);run();
  assert.ok(!fs.existsSync(path.join(compiledDir,'15600101-16160101')),'使わなくなった版を残さない');
  const corner=checkTiles('16000915-16000917',land);
  assert.deepEqual(corner.tiles.map(t=>t.factor),[1,4,8],'端の粗い画素は (1,1) を採る');
  assert.deepEqual(corner.versions[0].period,[[1600,9,15],[1600,9,17]]);
  write(B,{...transition,id:'two',validFrom:[1600,9,17],validUntil:[1601,1,1],payload:{...transition.payload,toKey:'castle:b'}});
  assert.deepEqual(run().map(v=>v.id),['16000915-16000917','16000917-16010101']);
  checkTiles('16000915-16000917',land);checkTiles('16000917-16010101',other);
  assert.deepEqual(version('16000917-16010101').versions[0].edits,['two'],'同一画素でも隣接する半開期間は重複しない');

  write(A,edit);write(B,{...edit,id:'two'});rejected('差分が重なる');
  write(B,{...edit,validFrom:[1616,1,1],validUntil:[1620,1,1]});rejected('重複か適用済み');
  write(B,{...edit,id:'baked'});rejected('重複か適用済み');
  write(B,{...edit,id:'two',validFrom:[1600,1,1],validUntil:[1600,1,1]});rejected('期間が逆');
  fs.rmSync(B);
  write(A,{...edit,layer:'relief'});rejected('対象外の層か基準版');
  write(A,{...edit,baseRevision:'another'});rejected('対象外の層か基準版');
  write(A,{...edit,payload:{...edit.payload,fromKey:'castle:a'}});rejected('元の値が違う');
  write(A,transition);write(B,{...edit,id:'late-invalid',validFrom:[1600,9,17],payload:{...edit.payload,fromKey:'castle:a'}});rejected('元の値が違う');
  fs.rmSync(B);write(A,edit);
  for(const name of ['provinces','definition','defaultMap','projection']){const p=md.files[name],before=fs.readFileSync(p);fs.appendFileSync(p,' ');rejected('正本 kuniezu/map が台帳と違う');fs.writeFileSync(p,before);}
  write(mf,{...manifest,source:{sha256:'another'}});rejected('配信タイルが正本と合わない');write(mf,manifest);

  // 正本と配信タイルの一致も実 PNG で検査する。
  const baseDir=path.join(mapDir,'provinces');fs.mkdirSync(baseDir);
  const baseFile=path.join(baseDir,'0-0.png');await writeRGB(baseFile,1,1,()=>Buffer.from(sea));
  manifest.tiles=[{file:'0-0.png',col:0,row:0,width:1,height:1,sha256:sha(fs.readFileSync(baseFile))}];write(mf,manifest);
  run();checkTiles('15600101-16160101',land);
  const originalTile=fs.readFileSync(baseFile);fs.appendFileSync(baseFile,'changed');rejected('基準タイルが manifest と違う');fs.writeFileSync(baseFile,originalTile);

  // 型紙の 0 は変更なし、G/B の値 1/2 はキー一覧に対応する。
  const maskFile=path.join(editsDir,'mask.png');
  await writeRGB(maskFile,2,2,y=>Buffer.from(y===0?[0,0,1,0,0,0]:[0,0,0,0,0,2]));
  const mask={...edit,id:'mask',payload:{mask:'mask.png',maskSha256:sha(fs.readFileSync(maskFile)),window:[0,0,2,2],keys:['castle:a','castle:b'],from:'sea'}};
  write(A,mask);assert.deepEqual(run()[0].edits,{mask:2});
  const mv=version('15600101-16160101');assert.equal(mv.tiles.length,4);
  for(const tile of mv.tiles){const f=path.join(compiledDir,'15600101-16160101',tile.file);assert.equal(sha(fs.readFileSync(f)),tile.sha256);assert.deepEqual(pixel(f),tile.factor===1&&tile.col===0?land:other);}
  write(A,{...mask,payload:{...mask.payload,window:[0,0,1,2]}});rejected('型紙の大きさが窓と違う');
  write(A,{...mask,payload:{...mask.payload,maskSha256:'wrong'}});rejected('型紙のハッシュが違う');
  write(A,{...mask,payload:{...mask.payload,keys:['castle:a']}});rejected('型紙の値が keys の外');
  write(A,{...mask,payload:{...mask.payload,keys:['castle:missing','castle:b']}});rejected('未定義の区画');
  write(A,{...mask,payload:{...mask.payload,from:'land'}});rejected('元の値が違う');
  await writeRGB(maskFile,2,2,()=>Buffer.alloc(6));write(A,{...mask,payload:{...mask.payload,maskSha256:sha(fs.readFileSync(maskFile))}});rejected('この縮尺で画素がない');

  fs.rmSync(A);assert.deepEqual(run(),[]);assert.deepEqual(fs.readdirSync(compiledDir),[],'差分なしでは以前の配信版も残さない');
  console.log('PASS: province edits: real PNGs, half-open periods, coarse edges, duplicate/baked IDs, overlap, baseline/tile guards, masks, atomic failure preservation');
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
