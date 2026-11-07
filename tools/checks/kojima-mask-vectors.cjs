/* 実際の630x390型紙を現行格子へ逆ラスタ化し、全セルを比較する。 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {prepare}=require('../geo/prepare-mask-vectors.cjs'),decode=require('../geo/png-decode.cjs');
const root=path.resolve(__dirname,'../..'),manifest='data/inputs/kojima-coast-review/mask-vector-bindings.json';
const contract=JSON.parse(fs.readFileSync(path.join(root,manifest))),grid=JSON.parse(fs.readFileSync(path.join(root,contract.grids.current.file)));
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'kojima-mask-vectors-'));
try{
 const output=path.join(temporary,'output'),result=prepare({output}),summaries=[];
 for(const layer of result.layers){
  const geojson=JSON.parse(fs.readFileSync(path.join(output,layer.file))),binding=contract.bindings.find(b=>b.id===layer.id);
  const definition=JSON.parse(fs.readFileSync(path.join(root,binding.edit))),png=decode(fs.readFileSync(path.resolve(root,path.dirname(binding.edit),definition.payload.mask)));
  const [col,row,width,height]=contract.reviewedCurrentWindow,predicted=new Uint16Array(width*height);
  const inverse=([lon,lat])=>[((lon-grid.LON0)*grid.K*grid.CX-grid.origin[0])/grid.stepUnits-col,((grid.LAT0-lat)*grid.K-grid.origin[1])/grid.stepUnits-row];
  for(const feature of geojson.features){
   const rings=feature.geometry.coordinates.flat().map(ring=>{assert.equal(new Set(ring.slice(0,-1).map(p=>p.join(','))).size,ring.length-1,'no self-touching LinearRing');return ring.map(inverse);});let count=0;
   for(let y=0;y<height;y++){
    const cy=y+.5,crossings=[];
    for(const ring of rings)for(let i=1;i<ring.length;i++){const [a,b]=[ring[i-1],ring[i]];if((a[1]>cy)!==(b[1]>cy))crossings.push(a[0]+(cy-a[1])*(b[0]-a[0])/(b[1]-a[1]));}
    crossings.sort((a,b)=>a-b);assert.equal(crossings.length%2,0,'closed scanline intervals');
    for(let i=0;i<crossings.length;i+=2){
     const start=Math.ceil(crossings[i]-.5),end=Math.ceil(crossings[i+1]-.5);
     assert.ok(start>=0&&end<=width,'mask remains in the reviewed current-grid window');
     for(let x=start;x<end;x++){assert.equal(predicted[y*width+x],0,'no category overlap');predicted[y*width+x]=feature.properties.maskValue;count++;}
    }
   }
   assert.equal(count,feature.properties.cells);
  }
  for(let i=0;i<predicted.length;i++)assert.equal(predicted[i],(png.data[i*4+1]<<8)|png.data[i*4+2],'source cell '+i+' '+layer.id);
  assert.deepEqual(geojson.adoption,definition,'period, source IDs and interpretation unchanged');
  summaries.push({id:layer.id,cells:layer.cells,categories:geojson.features.map(f=>f.properties.cells),comparedCells:predicted.length});
 }
 const before=fs.readFileSync(path.join(output,'manifest.json'));assert.throws(()=>prepare({output}),/EEXIST/);assert.deepEqual(fs.readFileSync(path.join(output,'manifest.json')),before);
 // Build a tiny isolated input tree to test a wrong grid association and SHA drift.
 const fixture=path.join(temporary,'fixture');fs.mkdirSync(fixture);
 const copy=file=>{const dest=path.join(fixture,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(root,file),dest);};
 copy(manifest);for(const item of Object.values(contract.grids))copy(item.file);
 for(const binding of contract.bindings){copy(binding.edit);const e=JSON.parse(fs.readFileSync(path.join(root,binding.edit)));copy(path.normalize(path.join(path.dirname(binding.edit),e.payload.mask)));}
 const bad=JSON.parse(JSON.stringify(contract));bad.bindings[0].grid='current';fs.writeFileSync(path.join(fixture,manifest),JSON.stringify(bad));
 assert.throws(()=>prepare({root:fixture,output:path.join(temporary,'wrong-grid')}),/grid version/);assert.ok(!fs.existsSync(path.join(temporary,'wrong-grid')));
 fs.writeFileSync(path.join(fixture,manifest),JSON.stringify(contract));fs.appendFileSync(path.join(fixture,contract.grids.current.file),' ');
 assert.throws(()=>prepare({root:fixture,output:path.join(temporary,'wrong-sha')}),/SHA mismatch/);assert.ok(!fs.existsSync(path.join(temporary,'wrong-sha')));
 console.log('PASS: all 737100 cells match after current-grid inverse rasterization; 12643/10663/366 cells, dates and sources preserved; wrong grid/SHA rejected, existing output kept');
 console.log(JSON.stringify(summaries));
}finally{fs.rmSync(temporary,{recursive:true,force:true});}
