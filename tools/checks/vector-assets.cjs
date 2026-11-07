/* 編集済み正本を変えずに配信する検査。実出力は専用一時ディレクトリだけ。 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {build}=require('../map/build-vector-assets.cjs');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'kuniezu-vector-assets-'));
try{
 const source=path.join(tmp,'source'),output=path.join(tmp,'output');fs.mkdirSync(path.join(source,'physical'),{recursive:true});
 const file=path.join(source,'physical/lake.geojson'),feature={type:'Feature',id:'lake:test',properties:{name:'湖'},geometry:{type:'Polygon',coordinates:[[[130,35],[131,35],[131,36],[130,36],[130,35]]]}};
 const save=rows=>fs.writeFileSync(file,JSON.stringify({type:'FeatureCollection',features:rows},null,2)+'\n');
 save([feature]);const original=fs.readFileSync(file);build({source,output});build({source,output,check:true});
 assert.deepEqual(fs.readFileSync(file),original);assert.deepEqual(fs.readFileSync(path.join(output,'physical/lake.geojson')),original);
 const edited=structuredClone(feature);edited.geometry.coordinates[0][1][0]=131.25;save([edited]);const editBytes=fs.readFileSync(file);
 assert.throws(()=>build({source,output,check:true}),/differs/);build({source,output});assert.deepEqual(fs.readFileSync(file),editBytes);assert.deepEqual(fs.readFileSync(path.join(output,'physical/lake.geojson')),editBytes,'direct edits are published verbatim');
 const published=fs.readFileSync(path.join(output,'manifest.json'));save([feature,feature]);assert.throws(()=>build({source,output}),/duplicate/);assert.deepEqual(fs.readFileSync(path.join(output,'manifest.json')),published);
 save([feature]);const invalid=structuredClone(feature);invalid.geometry.coordinates[0].pop();save([invalid]);assert.throws(()=>build({source,output}),/closed/);assert.deepEqual(fs.readFileSync(path.join(output,'manifest.json')),published);
 save([feature]);assert.throws(()=>build({source,output:source}),/overlap/);assert.throws(()=>build({source,output:tmp}),/overlap/);assert.throws(()=>build({source,output:path.join(source,'compiled')}),/overlap/);
 const unrelated=path.join(tmp,'unrelated');fs.mkdirSync(unrelated);fs.writeFileSync(path.join(unrelated,'keep.txt'),'keep');assert.throws(()=>build({source,output:unrelated}),/unrelated/);assert.equal(fs.readFileSync(path.join(unrelated,'keep.txt'),'utf8'),'keep');
 const alias=path.join(tmp,'alias');fs.symlinkSync(source,alias,'dir');assert.throws(()=>build({source,output:path.join(alias,'generated')}),/overlap/);
 fs.symlinkSync(file,path.join(source,'physical/alias.geojson'));assert.throws(()=>build({source,output}),/symlink/);fs.unlinkSync(path.join(source,'physical/alias.geojson'));
 const extra=path.join(source,'physical/extra.geojson');fs.copyFileSync(file,extra);build({source,output});fs.unlinkSync(extra);build({source,output});assert.ok(!fs.existsSync(path.join(output,'physical/extra.geojson')),'removed source does not leave stale published data');
 const root=path.resolve(__dirname,'../..'),real=path.join(tmp,'real-output');const result=build({source:path.join(root,'kuniezu/map'),output:real});build({source:path.join(root,'kuniezu/map'),output:real,check:true});assert.ok(result.files.some(row=>row.file==='physical/lakes-reference.geojson'&&row.features>=5));
 const fixture=path.join(tmp,'project');fs.mkdirSync(path.join(fixture,'tools/map'),{recursive:true});fs.mkdirSync(path.join(fixture,'kuniezu/map/physical'),{recursive:true});
 for(const name of ['build-map.cjs','build-vector-assets.cjs'])fs.copyFileSync(path.join(root,'tools/map',name),path.join(fixture,'tools/map',name));fs.copyFileSync(file,path.join(fixture,'kuniezu/map/physical/lake.geojson'));
 const run=require('node:child_process').execFileSync;for(const args of [['--vectors-only'],['--vectors-only','--check']])run(process.execPath,[path.join(fixture,'tools/map/build-map.cjs'),...args],{stdio:'pipe'});
 console.log('PASS: edited GeoJSON copied byte-for-byte; direct edits kept; bad IDs/rings, source overlap, symlinks and unrelated output protected; real source matches');
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
