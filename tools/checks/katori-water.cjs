/* 正本由来の局所タイルで湖面・保護陸を検査し、全段の岸線が補正境界を横切らないことを確認。 */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const MD=require('../map/map-data.cjs'),decode=require('../geo/png-decode.cjs'),loadMasks=require('../map/shoreline-masks.cjs');
const root=MD.root,p=MD.readProjection(),man=JSON.parse(fs.readFileSync(path.join(root,'kuniezu/static/kuniezu/map/build/manifest.json'))),defs=MD.readDefinition();
const data=JSON.parse(fs.readFileSync(path.join(root,'data/research/katori-review/uchinasaka/south-connection/wide-lake-perimeter.geojson'))),feature=id=>data.features.find(f=>f.properties.id===id);
const grid=([lo,la])=>[((lo-p.LON0)*p.K*p.CX-p.origin[0])/p.stepUnits,((p.LAT0-la)*p.K-p.origin[1])/p.stepUnits];
const inside=(rs,x,y)=>{let on=false;for(const r of rs)for(let i=0,j=r.length-1;i<r.length;j=i++){const [ax,ay]=r[i],[bx,by]=r[j];if((ay>y)!==(by>y)&&x<ax+(bx-ax)*(y-ay)/(by-ay))on=!on;}return on;};
const cache=new Map();function at(x,y){const col=Math.floor(x/man.tile),row=Math.floor(y/man.tile),key=col+','+row;if(!cache.has(key)){const t=man.tiles.find(t=>t.col===col&&t.row===row);assert(t,'missing tile');cache.set(key,decode(fs.readFileSync(path.join(root,'kuniezu/static/kuniezu/map/build/provinces',t.file))));}const t=cache.get(key),o=((y%man.tile)*t.width+x%man.tile)*4;return defs.byRGB.get(Array.from(t.data.subarray(o,o+3)).join(','));}
function visit(f,check){const rings=f.geometry.coordinates.map(r=>r.map(grid)),xs=rings[0].map(q=>q[0]),ys=rings[0].map(q=>q[1]);let n=0;for(let y=Math.floor(Math.min(...ys));y<Math.ceil(Math.max(...ys));y++)for(let x=Math.floor(Math.min(...xs));x<Math.ceil(Math.max(...xs));x++)if(inside(rings,x+.5,y+.5)){check(at(x,y));n++;}return n;}
assert.equal(visit(feature('uchinasaka-combined-wide-water'),d=>assert.equal(d.key,'lake:140.55,36.05')),1719);
assert.equal(visit(feature('protected-southeast-land'),d=>assert.equal(d.kind,'land')),70);
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'kuniezu-shore-check-'));let tested=0;
try{const mask=JSON.parse(fs.readFileSync(path.join(root,'kuniezu/static/kuniezu/map/physical/shoreline_masks.geojson')));assert.equal(mask.features.length,5);for(const f of mask.features)f.properties.bufferMetres=25;const file=path.join(temp,'masks.json');fs.writeFileSync(file,JSON.stringify(mask));const nearCut=loadMasks(file,p),index=JSON.parse(fs.readFileSync(path.join(root,'kuniezu/static/kuniezu/map/build/edges.json')));
const refs=index.levels.flatMap(l=>l.tiles.map(t=>path.join(root,'kuniezu/static/kuniezu/map/build',l.dir,t.file))).concat(index.versions.map(t=>path.join(root,'kuniezu/static/kuniezu/map/build','edges-'+t.factor,t.file)));
for(const file of refs)for(const item of JSON.parse(fs.readFileSync(file))){if(!['coast','lake'].includes(item.kind))continue;for(const line of item.lines)for(let i=2;i<line.length;i+=2){assert(!nearCut(line[i-2],line[i-1],line[i],line[i+1]),'架空の岸線: '+file);tested++;}}
}finally{fs.rmSync(temp,{recursive:true,force:true});}
console.log(`PASS: 1719 water cells, 70 protected land cells, 5 non-shore cuts; ${tested} coast/lake segments across all levels and epochs`);
