// ラスター地図：正本 kuniezu/map（control/ の provinces.png 全域1枚・definition.csv・default.map と projection.json）が CK3 の書式どおりで、
// Web 配信用のタイル kuniezu/static/kuniezu/map/build/provinces{,-4,-8}/ と manifest.json がその正本から作り直したものと一致し、すべての城・中立地が1画素以上あることを確かめる。
// 旧来の置き場（game/map_data、data/map、生成物を kuniezu/map の直下に置く形）が残っていないことも確かめる。タイルの作り直しの照合に1分ほどかかる。
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const MD=require('../map/map-data.cjs'),root=MD.root,dir=MD.out,sha=b=>crypto.createHash('sha256').update(b).digest('hex');
// 正本の書式
for(const f of Object.values(MD.files))assert.ok(fs.existsSync(f),'正本がない: '+path.relative(root,f));
const lines=fs.readFileSync(MD.files.definition,'utf8').split(/\r?\n/).filter(Boolean);
assert.equal(lines[0],'0;0;0;0;x;x;','definition.csv の1行目は予約行');
lines.slice(1).forEach((l,i)=>{assert.match(l,/^\d+;\d+;\d+;\d+;[^;]+;x;$/,'definition.csv の行: '+l);assert.equal(+l.split(';')[0],i+1,'id は1から連番');});
const def=MD.readDefinition(),rows=def.rows.filter(Boolean);
assert.equal(def.defaultMap.definitions,'definition.csv');assert.equal(def.defaultMap.provinces,'provinces.png');
assert.deepEqual(def.defaultMap.sea_zones,[def.byKey.get('sea').id],'海は sea_zones');for(const id of def.defaultMap.lakes)assert.ok(def.rows[id]?.key.startsWith('lake:'),'lakes は湖の区画');
const proj=MD.readProjection();for(const k of ['K','CX','LON0','LAT0','origin','stepUnits','width','height'])assert.ok(proj[k]!=null,'projection.json の '+k);
const ihdr=Buffer.alloc(24);const fd=fs.openSync(MD.files.provinces,'r');fs.readSync(fd,ihdr,0,24,0);fs.closeSync(fd);
assert.equal(ihdr.readUInt32BE(16),proj.width);assert.equal(ihdr.readUInt32BE(20),proj.height);
// 旧来の置き場は廃止
for(const f of ['game/map_data','data/map']){const d=path.join(root,f);assert.ok(!fs.existsSync(d)||!fs.readdirSync(d).length,'旧来の置き場が残る: '+f);}
for(const f of ['manifest.json','provinces','edges.json','versions.json','rivers-lines.json','relief.json'])assert.ok(!fs.existsSync(path.join(root,'kuniezu/map',f)),'生成物は kuniezu/static/kuniezu/map/build に置く: kuniezu/map/'+f);
// 配信タイル：manifest の確認値どおりで余分がなく、正本から作り直したものと一致
// 実行時に読む区画の表は、正本の写し
for(const k of ['definition','defaultMap'])assert.ok(fs.readFileSync(path.join(dir,path.basename(MD.files[k]))).equals(fs.readFileSync(MD.files[k])),'配信物の '+path.basename(MD.files[k])+' が正本と同じ');
const m=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));assert.equal(m.source?.sha256,MD.sourceSha256(),'配信タイルの元が今の正本');
for(const L of [{dir:'provinces',tiles:m.tiles},...m.levels]){for(const t of L.tiles)assert.equal(sha(fs.readFileSync(path.join(dir,L.dir,t.file))),t.sha256,L.dir+'/'+t.file);
 assert.equal(fs.readdirSync(path.join(dir,L.dir)).length,L.tiles.length,'余分なタイルがない: '+L.dir);}
execFileSync(process.execPath,['--max-old-space-size=4000',path.join(root,'tools/map/build-map-tiles.cjs'),'--check'],{stdio:'inherit'});
// 区画ごとの画素数（build-map-tiles.cjs の集計）。湖は水域の見直しで外されることがある（例：塩津潟の旧輪郭）ので0画素を許す。
const px=JSON.parse(fs.readFileSync(path.join(root,'data/audits/raster-province-pixels.json'),'utf8'));assert.equal(px.source,MD.sourceSha256(),'画素数の集計が今の正本から');
for(const p of px.provinces)if(p.key.startsWith('castle:')||p.key.startsWith('neutral:'))assert.ok(p.pixels>0,'province has pixels: '+p.key);
// 郡：郡画像（kuniezu/map/admin/gun.png、全域1枚）と郡と城の対応（kuniezu/map/control/gun-assignment.csv）の確認値、全郡に割り当ての根拠、castle-point と same-province の郡は城の領域
const gd=MD.layers.admin,gj=JSON.parse(fs.readFileSync(path.join(gd,'gun.json'),'utf8'));assert.equal(sha(fs.readFileSync(path.join(gd,'gun.png'))),gj.gunPngSha256,'gun.png');
const ga=fs.readFileSync(path.join(MD.layers.control,'gun-assignment.csv'),'utf8').trim().split('\n').slice(1).map(l=>l.split(';'));assert.equal(ga.length,gj.guns,'every district assigned');
const bases=new Set(['castle-point','split','same-province','majority-other-province','unassigned','excluded','override']);for(const r of ga)assert.ok(bases.has(r[4]),'basis '+r[4]);
for(const r of ga)if(r[4]==='castle-point'||r[4]==='same-province')assert.ok(r[5].startsWith('castle:'),'district region '+r[2]);
console.log('PASS: districts',JSON.stringify(Object.fromEntries([...bases].map(b=>[b,ga.filter(r=>r[4]===b).length]))));
console.log('PASS: raster map',JSON.stringify({provinces:rows.length,tiles:m.tiles.length,unassignedLandPixels:px.provinces.find(p=>p.key==='unassigned')?.pixels}));
