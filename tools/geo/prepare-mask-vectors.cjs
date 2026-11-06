/* 旧型紙を明示的に結び付けた格子で経緯度ベクターへ変換。画像正本へ再適用しない。
   node tools/geo/prepare-mask-vectors.cjs --output <新規ディレクトリ> */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const decode=require('./png-decode.cjs'),{vectorize}=require('./mask-vector.cjs');
const ROOT=path.resolve(__dirname,'../..');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function prepare({root=ROOT,manifest='data/inputs/kojima-coast-review/mask-vector-bindings.json',output}={}){
  root=path.resolve(root);
  const within=file=>{const absolute=path.resolve(root,file),relative=path.relative(root,absolute);if(relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative))throw Error('Input outside repository');return absolute;};
  const checked=(file,hash)=>{const bytes=fs.readFileSync(within(file));if(sha(bytes)!==hash)throw Error('Input SHA mismatch: '+file);return bytes;};
  const contract=JSON.parse(fs.readFileSync(within(manifest),'utf8'));
  if(contract.schemaVersion!==1||contract.role!=='adopted-raster-extent-not-historical-shoreline')throw Error('Unsupported mask vector contract');
  const grids=Object.fromEntries(Object.entries(contract.grids).map(([id,row])=>[id,JSON.parse(checked(row.file,row.sha256))]));
  const before=grids.before,current=grids.current;
  if(!before||!current||!Number.isSafeInteger(contract.rowShift)||current.rowsDroppedFromV2!==contract.rowShift)throw Error('Missing grid version shift');
  for(const key of ['K','CX','LON0','LAT0','stepUnits'])if(before[key]!==current[key])throw Error('Projection changed beyond the reviewed row shift');
  if(before.origin[0]!==current.origin[0]||Math.abs(current.origin[1]-before.origin[1]-contract.rowShift*before.stepUnits)>1e-10)throw Error('Grid origins do not match row shift');
  const ids=new Set(),prepared=[];
  for(const binding of contract.bindings){
    if(!/^[a-z0-9-]+$/.test(binding.id)||ids.has(binding.id))throw Error('Invalid or duplicate binding identity');ids.add(binding.id);
    const raw=checked(binding.edit,binding.editSha256),edit=JSON.parse(raw),grid=grids[binding.grid];
    if(!grid||edit.id!==binding.id||!edit.payload?.mask)throw Error('Mask binding differs from source definition');
    const currentWindow=edit.payload.window.slice();if(binding.grid==='before')currentWindow[1]-=contract.rowShift;
    if(JSON.stringify(currentWindow)!==JSON.stringify(contract.reviewedCurrentWindow))throw Error('Mask window and grid version differ from reviewed extent');
    const maskFile=path.resolve(path.dirname(within(binding.edit)),edit.payload.mask),mask=checked(maskFile,edit.payload.maskSha256),png=decode(mask);
    const values=new Uint16Array(png.width*png.height);for(let i=0;i<values.length;i++)values[i]=(png.data[i*4+1]<<8)|png.data[i*4+2];
    const geojson=vectorize({width:png.width,height:png.height,values},grid,edit.payload.window,edit.payload.keys);
    const cells=geojson.features.reduce((n,f)=>n+f.properties.cells,0);if(cells!==binding.expectedCells)throw Error('Adopted cell count differs from reviewed mask');
    geojson.adoption=edit;
    geojson.provenance={edit:binding.edit,editSha256:binding.editSha256,maskSha256:edit.payload.maskSha256,grid:contract.grids[binding.grid],window:edit.payload.window,interpretation:contract.role};
    prepared.push({id:binding.id,cells,features:geojson.features.length,geojson});
  }
  const result={schemaVersion:1,role:contract.role,sourceManifest:manifest,sourceManifestSha256:sha(fs.readFileSync(within(manifest))),regridCommit:contract.regridCommit,layers:prepared.map(({geojson,...row})=>({...row,file:row.id+'.geojson',validFrom:geojson.adoption.validFrom,validUntil:geojson.adoption.validUntil}))};
  // All source and geometry checks finish before creating any output.
  if(output){fs.mkdirSync(output);for(const row of prepared)fs.writeFileSync(path.join(output,row.id+'.geojson'),JSON.stringify(row.geojson)+'\n',{flag:'wx'});fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});}
  return result;
}
if(require.main===module){const args=process.argv.slice(2),i=args.indexOf('--output');if(i<0||!args[i+1])throw Error('--output <new directory> is required');console.log(JSON.stringify(prepare({output:args[i+1]}),null,2));}
module.exports={prepare};
