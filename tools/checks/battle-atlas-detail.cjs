'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),generator=require('../geo/build-local-dem.cjs'),base=path.join(root,'data/inputs/battle-dem-detail'),frames=require('../../data/inputs/battle-atlas-frames.json'),ctx={TK:{}};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'kuniezu/static/kuniezu/battle-atlas-data.js'),'utf8'),ctx);
let checkedGrids=0;
for(const file of fs.readdirSync(path.join(root,'kuniezu/static/kuniezu/atlas')).filter(f=>f.endsWith('.json'))){
 const d=JSON.parse(fs.readFileSync(path.join(root,'kuniezu/static/kuniezu/atlas',file)));if(!d.heights)continue;checkedGrids++;const bytes=Buffer.from(d.heights,'base64');assert.equal(bytes.length,d.width*d.height*2,file+' grid length');for(let i=0;i<bytes.length;i+=2)assert.notEqual(bytes.readUInt16LE(i)-32768,d.noData??-32768,file+' has NoData; contour source must be reviewed before adoption');
}
assert(checkedGrids>0);console.log('PASS: '+checkedGrids+' published relief grids contain no NoData samples');
const model=require('./history-focus.cjs').model();
for(const title of ['関ヶ原の戦い','桶狭間の戦い','設楽原の戦い','長久手の戦い']){const sc=model.TK.BATTLES[title];assert(!sc.sources.includes('atlasRelief'),title+' cannot retain old Terrain Tiles credit');assert(sc.sources.some(id=>model.TK.RESEARCH_SOURCES[id]?.url==='https://maps.gsi.go.jp/development/demtile.html'),title+' has its actual GSI source');}
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'kuniezu-atlas-detail-'));
try{
 for(const id of ['00','02','03']){
  const manifest=path.join(base,id,'input-manifest.json'),m=JSON.parse(fs.readFileSync(manifest)),result=generator.generate(manifest,root),published=fs.readFileSync(path.join(root,'kuniezu/static/kuniezu/atlas',id+'.json'),'utf8');assert.equal(result.files.get(id+'.json'),published,'offline reproduction');assert.equal(result.files.get('generation-manifest.json'),fs.readFileSync(path.join(base,id,'generation-manifest.json'),'utf8'),'generation record');
  const old=JSON.parse(fs.readFileSync(path.join(base,id,'river-reference.json'))),next=JSON.parse(published);assert.deepEqual(next.bounds,old.bounds);assert.deepEqual(next.comparisonRivers,old.comparisonRivers);assert.deepEqual([next.width,next.height,next.zoom],[512,358,14]);assert.equal(result.report.noDataSamples,0);assert.equal(frames[m.title][4].elevationManifest,path.relative(root,manifest));const meta=ctx.TK.BATTLE_ATLAS[m.title];assert.equal(meta.file,m.outputFile);assert.equal(meta.terrainSource.scope,m.elevationSource.scope);assert.equal(meta.terrainSource.url,m.elevationSource.specification);assert.deepEqual(Array.from(meta.bounds),next.bounds);
 }
 const copy=rel=>{const dest=path.join(temp,rel);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(root,rel),dest);};
 for(const rel of ['tools/geo/battle-atlas.py','tools/geo/battle-rivers.py','data/audits/battle-atlas-audit.json','data/inputs/battle-atlas-frames.json','kuniezu/static/kuniezu/battle-atlas-data.js'])copy(rel);
 fs.mkdirSync(path.join(temp,'data/audits'),{recursive:true});for(const id of ['00','02','03'])for(const rel of ['data/inputs/battle-dem-detail/'+id+'/input-manifest.json','kuniezu/static/kuniezu/atlas/'+id+'.json'])copy(rel);
 const args=['tools/geo/battle-atlas.py','--titles','関ヶ原の戦い','桶狭間の戦い','長篠の戦い','--presentation-only','--offline','--cache',path.join(temp,'must-not-create-cache')],run=()=>spawnSync(process.env.PYTHON||'python3',args,{cwd:temp,encoding:'utf8'});
 const before=fs.readFileSync(path.join(temp,'kuniezu/static/kuniezu/atlas/03.json'));let r=run();assert.equal(r.status,0,r.stderr);assert(!fs.existsSync(path.join(temp,'must-not-create-cache')));assert.deepEqual(fs.readFileSync(path.join(temp,'kuniezu/static/kuniezu/atlas/03.json')),before);
 const riverRun=spawnSync(process.env.PYTHON||'python3',['tools/geo/battle-rivers.py','--titles','関ヶ原の戦い'],{cwd:temp,encoding:'utf8'});assert.notEqual(riverRun.status,0);assert.match(riverRun.stderr,/Managed DEM rivers/);assert.deepEqual(fs.readFileSync(path.join(temp,'kuniezu/static/kuniezu/atlas/03.json')),before);
 const m=path.join(temp,'data/inputs/battle-dem-detail/03/input-manifest.json'),bad=JSON.parse(fs.readFileSync(m));bad.expectedOutputSHA256='0'.repeat(64);fs.writeFileSync(m,JSON.stringify(bad));r=run();assert.notEqual(r.status,0);assert.match(r.stderr,/Managed DEM output differs/);assert.deepEqual(fs.readFileSync(path.join(temp,'kuniezu/static/kuniezu/atlas/03.json')),before);
 console.log('PASS: three pinned DEMs reproduce offline; exact bounds/rivers; metadata-only preserves terrain; altered output SHA fails closed');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
