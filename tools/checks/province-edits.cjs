// 年代別の領域差分の生成（tools/map/build-province-edits.cjs）を、2×2 画素の小さな正本で確かめる。
// 正しい差分の画素・400m/800m の中心画素・期間の切れ目（半開区間）と、重なり・ID の重複・適用済み ID・元の値の食い違い・正本の取り違えで止まり、
// 止まった時に配信中の版を書き換えないことを見る（旧 tools/checks/province-edits.py の負例を移したもの）。
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const MD=require('../map/map-data.cjs'),{build}=require('../map/build-province-edits.cjs'),decodePNG=require('../geo/png-decode.cjs');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'province-edits-'));
try{
 const dataDir=path.join(tmp,'map_data'),mapDir=path.join(tmp,'map'),edits=path.join(mapDir,'edits'),compiled=path.join(edits,'compiled');
 for(const d of [dataDir,mapDir,edits])fs.mkdirSync(d,{recursive:true});
 const md=MD.at(dataDir),write=(f,v)=>fs.writeFileSync(f,typeof v==='string'?v:JSON.stringify(v));
 md.writeDefinition([{id:1,rgb:[8,24,48],key:'sea',kind:'sea'},{id:2,rgb:[1,2,3],key:'castle:a',kind:'land'}]);
 write(md.files.provinces,'（この検査では画素を読まない。確認値だけに使う）');
 write(md.files.projection,{K:1,CX:1,LON0:0,LAT0:0,origin:[0,0],stepUnits:1,width:2,height:2});
 const manifest=()=>write(path.join(mapDir,'manifest.json'),{source:{sha256:md.sourceSha256()},projection:{origin:[0,0],stepUnits:1,K:1,CX:1,LON0:0,LAT0:0},width:2,height:2,tile:1,tiles:[],
  levels:[4,8].map(f=>({factor:f,dir:'provinces-'+f,width:1,height:1,tiles:[]}))});
 manifest();
 const ledger=()=>write(path.join(edits,'baseline-ledger.json'),{baselineCommit:'fixture',sourceSha256:md.sourceSha256(),applied:[{id:'baked'}]});ledger();
 const poly=(name,x0,y0)=>write(path.join(tmp,name+'.geojson'),{features:[{geometry:{type:'Polygon',coordinates:[[[x0,-y0],[x0+1,-y0],[x0+1,-y0-1],[x0,-y0-1],[x0,-y0]]]}}]});
 poly('one',0,0);poly('corner',1,1);
 const edit={id:'one',baseRevision:'fixture',layer:'provinces',validFrom:[1560,1,1],validUntil:[1616,1,1],payload:{file:'../../one.geojson',feature:0,fromKey:'sea',toKey:'castle:a'}};
 const A=path.join(edits,'a.json'),B=path.join(edits,'b.json'),run=()=>build({mapDir,md});
 const px=f=>{const p=decodePNG(fs.readFileSync(f));return [p.data[0],p.data[1],p.data[2]];};
 // 正しい差分：100m の (0,0) が城の色になる。版は半開区間の一つ
 write(A,edit);let r=run();assert.deepEqual(r.map(v=>[v.id,v.edits]),[['15600101-16160101',{one:1}]]);
 assert.deepEqual(px(path.join(compiled,'15600101-16160101/provinces/0-0@15600101-16160101.png')),[1,2,3]);
 // 粗い段は中心の画素（端は (1,1) に寄せる）を採る：(1,1) の差分は 400m・800m にも出る。期間の切れ目は日単位
 write(A,{...edit,validFrom:[1600,9,15],validUntil:[1600,9,17],payload:{...edit.payload,file:'../../corner.geojson'}});r=run();
 assert.deepEqual(r.map(v=>v.id),['16000915-16000917']);assert.ok(!fs.existsSync(path.join(compiled,'15600101-16160101')),'使わなくなった版は消える');
 const vm=JSON.parse(fs.readFileSync(path.join(compiled,'16000915-16000917/manifest.json'),'utf8'));
 assert.equal(vm.baseProvincesSha256,md.sourceSha256());assert.deepEqual(vm.tiles.map(t=>t.factor),[1,4,8]);assert.deepEqual(vm.versions[0].period,[[1600,9,15],[1600,9,17]]);
 for(const t of vm.tiles)assert.deepEqual(px(path.join(compiled,'16000915-16000917',t.file)),[1,2,3]);
 // 二つの期間が重ならずに続くと版が二つに分かれる
 write(B,{...edit,id:'two',validFrom:[1600,9,17],validUntil:[1601,1,1]});r=run();assert.deepEqual(r.map(v=>v.id),['16000915-16000917','16000917-16010101']);
 // 失敗の例。止まった時に配信中の版（直前の成功）が残ること
 const before=fs.readdirSync(compiled).sort().join();
 const rejected=(phrase)=>{assert.throws(run,e=>e.message.includes(phrase),phrase);assert.equal(fs.readdirSync(compiled).sort().join(),before,'失敗で版を書き換えない: '+phrase);assert.ok(!fs.existsSync(compiled+'.staging'));};
 write(A,edit);write(B,{...edit,id:'two'});rejected('差分が重なる');
 write(B,{...edit,validFrom:[1616,1,1],validUntil:[1620,1,1]});rejected('重複か適用済み');
 write(B,{...edit,id:'baked'});rejected('重複か適用済み');
 write(B,{...edit,id:'two',validFrom:[1600,1,1],validUntil:[1600,1,1]});rejected('期間が逆');
 fs.rmSync(B);write(A,{...edit,payload:{...edit.payload,fromKey:'castle:a'}});rejected('元の値が違う');
 write(A,edit);write(md.files.definition,fs.readFileSync(md.files.definition,'utf8').replace('1;2;3','1;2;4'));rejected('正本 game/map_data が台帳と違う');
 ledger();rejected('配信タイルが正本と合わない');
 manifest();r=run();assert.deepEqual(r.map(v=>v.id),['15600101-16160101']);
 console.log('PASS: province edits (pixels, coarse centre, half-open periods, overlap, duplicate/baked IDs, wrong value, baseline guards, no partial publish)');
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
