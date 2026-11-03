// ラスター地図：正本 game/map_data（provinces.png 全域1枚・definition.csv・default.map・projection.json）が CK3 の書式どおりで、
// Web 配信用のタイル game/map/provinces{,-4,-8}/ と manifest.json がその正本から作り直したものと一致し、すべての城・中立地が1画素以上あることを確かめる。
// 旧来の置き場（game/map/definition.csv、game/map/gun*）が残っていないことも確かめる。タイルの作り直しの照合に1分ほどかかる。
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const MD=require('../map/map-data.cjs'),root=MD.root,dir=path.join(root,'game/map'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
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
for(const f of ['definition.csv','gun','gun-4','gun-8','gun.json','gun.csv','gun-assignment.csv','gun-overrides.json'])assert.ok(!fs.existsSync(path.join(dir,f)),'旧来の置き場が残る: game/map/'+f);
// 配信タイル：manifest の確認値どおりで余分がなく、正本から作り直したものと一致
const m=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));assert.equal(m.source?.sha256,MD.sourceSha256(),'配信タイルの元が今の正本');
for(const L of [{dir:'provinces',tiles:m.tiles},...m.levels]){for(const t of L.tiles)assert.equal(sha(fs.readFileSync(path.join(dir,L.dir,t.file))),t.sha256,L.dir+'/'+t.file);
 assert.equal(fs.readdirSync(path.join(dir,L.dir)).length,L.tiles.length,'余分なタイルがない: '+L.dir);}
execFileSync(process.execPath,['--max-old-space-size=4000',path.join(root,'tools/map/build-map-tiles.cjs'),'--check'],{stdio:'inherit'});
// 区画ごとの画素数（build-map-tiles.cjs の集計）。湖は水域の見直しで外されることがある（例：塩津潟の旧輪郭）ので0画素を許す。
const px=JSON.parse(fs.readFileSync(path.join(root,'data/audits/raster-province-pixels.json'),'utf8'));assert.equal(px.source,MD.sourceSha256(),'画素数の集計が今の正本から');
for(const p of px.provinces)if(p.key.startsWith('castle:')||p.key.startsWith('neutral:'))assert.ok(p.pixels>0,'province has pixels: '+p.key);
const build=JSON.parse(fs.readFileSync(path.join(root,'data/audits/raster-provinces-build.json'),'utf8'));assert.equal(build.checks.lostProvinces.length,0);assert.ok(build.rules.seaFromLandMask&&build.rules.neighbourhood===4);
// 郡：郡画像（data/map/gun.png、全域1枚）の確認値、全郡に割り当ての根拠、castle-point と same-province の郡は城の領域
const gd=path.join(root,'data/map'),gj=JSON.parse(fs.readFileSync(path.join(gd,'gun.json'),'utf8'));assert.equal(sha(fs.readFileSync(path.join(gd,'gun.png'))),gj.gunPngSha256,'gun.png');
const ga=fs.readFileSync(path.join(gd,'gun-assignment.csv'),'utf8').trim().split('\n').slice(1).map(l=>l.split(';'));assert.equal(ga.length,gj.guns,'every district assigned');
const bases=new Set(['castle-point','split','same-province','majority-other-province','unassigned','excluded','override']);for(const r of ga)assert.ok(bases.has(r[4]),'basis '+r[4]);
for(const r of ga)if(r[4]==='castle-point'||r[4]==='same-province')assert.ok(r[5].startsWith('castle:'),'district region '+r[2]);
console.log('PASS: districts',JSON.stringify(Object.fromEntries([...bases].map(b=>[b,ga.filter(r=>r[4]===b).length]))));
console.log('PASS: raster map',JSON.stringify({provinces:rows.length,tiles:m.tiles.length,overlapPixels:build.checks.overlapPixels,unassignedLandPixels:build.checks.unassignedLandPixels}));
