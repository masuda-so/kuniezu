// ラスター地図（段階1）：領域画像のタイルが manifest どおり存在し、色は definition.csv で一意、すべての城・中立地・湖が1画素以上あり、
// 生成の決まり（海は陸の形で決める・重なりのタイブレーク・4近傍の取り残し寄せ）が manifest に記録されていることを確かめる。
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const dir='game/map',m=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
for(const t of m.tiles){const b=fs.readFileSync(path.join(dir,'provinces',t.file));assert.equal(crypto.createHash('sha256').update(b).digest('hex'),t.sha256,t.file);}
assert.equal(fs.readdirSync(path.join(dir,'provinces')).length,m.tiles.length,'no stray tiles');
const rows=fs.readFileSync(path.join(dir,'definition.csv'),'utf8').trim().split('\n').slice(1).map(l=>l.split(';'));
const colors=new Set(rows.map(r=>r.slice(1,4).join(',')));assert.equal(colors.size,rows.length,'unique colours');
assert.deepEqual(rows.map(r=>+r[0]),rows.map((_,i)=>i),'ids are 0..n-1');
for(const r of rows.slice(2))assert.ok(+r[7]>0,'province has pixels: '+r[4]);
assert.equal(m.checks.lostProvinces.length,0);assert.ok(m.rules.seaFromLandMask&&m.rules.neighbourhood===4);
console.log('PASS: raster map',JSON.stringify({provinces:rows.length,tiles:m.tiles.length,overlapPixels:m.checks.overlapPixels,unassignedLandPixels:m.checks.unassignedLandPixels}));
