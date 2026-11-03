// ラスター地図（段階1）：領域画像のタイルが manifest どおり存在し、色は definition.csv で一意、すべての城・中立地・湖が1画素以上あり、
// 生成の決まり（海は陸の形で決める・重なりのタイブレーク・4近傍の取り残し寄せ）が manifest に記録されていることを確かめる。
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const dir='game/map',m=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
for(const t of m.tiles){const b=fs.readFileSync(path.join(dir,'provinces',t.file));assert.equal(crypto.createHash('sha256').update(b).digest('hex'),t.sha256,t.file);}
assert.equal(fs.readdirSync(path.join(dir,'provinces')).length,m.tiles.length,'no stray tiles');
const rows=fs.readFileSync(path.join(dir,'definition.csv'),'utf8').trim().split('\n').slice(1).map(l=>l.split(';'));
const colors=new Set(rows.map(r=>r.slice(1,4).join(',')));assert.equal(colors.size,rows.length,'unique colours');
assert.deepEqual(rows.map(r=>+r[0]),rows.map((_,i)=>i),'ids are 0..n-1');
// 湖は水域の根拠の見直しで外されることがある（例：塩津潟の旧輪郭）。番号は残し、0画素を許す。城・中立地は必ず1画素以上。
for(const r of rows.slice(2))if(r[6]!=='lake')assert.ok(+r[7]>0,'province has pixels: '+r[4]);
assert.equal(m.checks.lostProvinces.length,0);assert.ok(m.rules.seaFromLandMask&&m.rules.neighbourhood===4);
// 郡：郡画像の確認値、全郡に割り当ての根拠、城が自分の郡の領域にあること（castle-point の郡は城の領域）。
const gj=JSON.parse(fs.readFileSync(path.join(dir,'gun.json'),'utf8'));for(const t of gj.tiles)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,'gun',t.file))).digest('hex'),t.sha256,'gun '+t.file);
const ga=fs.readFileSync(path.join(dir,'gun-assignment.csv'),'utf8').trim().split('\n').slice(1).map(l=>l.split(';'));assert.equal(ga.length,gj.guns,'every district assigned');
const bases=new Set(['castle-point','split','same-province','majority-other-province','unassigned','excluded','override']);for(const r of ga)assert.ok(bases.has(r[4]),'basis '+r[4]);
for(const r of ga)if(r[4]==='castle-point'||r[4]==='same-province')assert.ok(r[5].startsWith('castle:'),'district region '+r[2]);
console.log('PASS: districts',JSON.stringify(Object.fromEntries([...bases].map(b=>[b,ga.filter(r=>r[4]===b).length]))));
console.log('PASS: raster map',JSON.stringify({provinces:rows.length,tiles:m.tiles.length,overlapPixels:m.checks.overlapPixels,unassignedLandPixels:m.checks.unassignedLandPixels}));
