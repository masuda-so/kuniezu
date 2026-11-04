/* 正本（旧来の格子）の局所で湖面・保護陸を検査し、全段の岸線（円錐図法の平面）が補正境界を横切らないことを確認。 */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const MD=require('../map/map-data.cjs'),{readRGBWindow}=require('../map/png-big.cjs'),loadMasks=require('../map/shoreline-masks.cjs'),TKP=require('../../game/map-projection.js');
const root=MD.root,p=MD.readProjection(),man=JSON.parse(fs.readFileSync(path.join(root,'game/map/build/manifest.json'))),defs=MD.readDefinition();
const data=JSON.parse(fs.readFileSync(path.join(root,'data/research/katori-review/uchinasaka/south-connection/wide-lake-perimeter.geojson'))),feature=id=>data.features.find(f=>f.properties.id===id);
const grid=([lo,la])=>[((lo-p.LON0)*p.K*p.CX-p.origin[0])/p.stepUnits,((p.LAT0-la)*p.K-p.origin[1])/p.stepUnits];
const inside=(rs,x,y)=>{let on=false;for(const r of rs)for(let i=0,j=r.length-1;i<r.length;j=i++){const [ax,ay]=r[i],[bx,by]=r[j];if((ay>y)!==(by>y)&&x<ax+(bx-ax)*(y-ay)/(by-ay))on=!on;}return on;};
(async()=>{
// 検査する地物の外接長方形だけ正本から読む
const feats=['uchinasaka-combined-wide-water','protected-southeast-land'].map(feature),pts=feats.flatMap(f=>f.geometry.coordinates.flat().map(grid));
const win=await readRGBWindow(MD.files.provinces,Math.floor(Math.min(...pts.map(q=>q[0])))-1,Math.floor(Math.min(...pts.map(q=>q[1])))-1,Math.ceil(Math.max(...pts.map(q=>q[0])))+1,Math.ceil(Math.max(...pts.map(q=>q[1])))+1);
function at(x,y){const c=win.at(x,y);assert.ok(c,`窓の外 ${x},${y}`);return defs.byRGB.get(c.join(','));}
function visit(f,check){const rings=f.geometry.coordinates.map(r=>r.map(grid)),xs=rings[0].map(q=>q[0]),ys=rings[0].map(q=>q[1]);let n=0;for(let y=Math.floor(Math.min(...ys));y<Math.ceil(Math.max(...ys));y++)for(let x=Math.floor(Math.min(...xs));x<Math.ceil(Math.max(...xs));x++)if(inside(rings,x+.5,y+.5)){check(at(x,y));n++;}return n;}
assert.equal(visit(feature('uchinasaka-combined-wide-water'),d=>assert.equal(d.key,'lake:140.55,36.05')),1719);
assert.equal(visit(feature('protected-southeast-land'),d=>assert.equal(d.kind,'land')),70);
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'kuniezu-shore-check-'));let tested=0;
try{const mask=JSON.parse(fs.readFileSync(path.join(root,'game/map/physical/shoreline_masks.geojson')));assert.equal(mask.features.length,5);for(const f of mask.features)f.properties.bufferMetres=25;const file=path.join(temp,'masks.json');fs.writeFileSync(file,JSON.stringify(mask));const nearCut=loadMasks(file,TKP.plane),index=JSON.parse(fs.readFileSync(path.join(root,'game/map/build/edges.json')));
const refs=index.levels.flatMap(l=>l.tiles.map(t=>path.join(root,'game/map/build',l.dir,t.file))).concat(index.versions.map(t=>path.join(root,'game/map/build','edges-'+t.factor,t.file)));
for(const file of refs)for(const item of JSON.parse(fs.readFileSync(file))){if(!['coast','lake'].includes(item.kind))continue;for(const line of item.lines)for(let i=2;i<line.length;i+=2){assert(!nearCut(line[i-2],line[i-1],line[i],line[i+1]),'架空の岸線: '+file);tested++;}}
}finally{fs.rmSync(temp,{recursive:true,force:true});}
console.log(`PASS: 1719 water cells, 70 protected land cells, 5 non-shore cuts; ${tested} coast/lake segments across all levels and epochs`);
})().catch(e=>{console.error(e);process.exit(1);});
