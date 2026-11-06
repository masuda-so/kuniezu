/* 編集済みGeoJSONを検査して配る。座標の変換・補正・平滑化はしない。 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'../..');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const inside=(parent,child)=>{const r=path.relative(parent,child);return r===''||(!r.startsWith('..'+path.sep)&&r!=='..'&&!path.isAbsolute(r));};
function realLocation(directory){const missing=[];let current=path.resolve(directory);while(!fs.existsSync(current)){missing.unshift(path.basename(current));current=path.dirname(current);}return path.join(fs.realpathSync(current),...missing);}
const depths={Point:0,MultiPoint:1,LineString:1,MultiLineString:2,Polygon:2,MultiPolygon:3};
function geometry(value){
  if(value===null)return;
  if(!value||typeof value!=='object')throw Error('Invalid geometry');
  if(value.type==='GeometryCollection'){if(!Array.isArray(value.geometries))throw Error('Invalid geometry collection');value.geometries.forEach(geometry);return;}
  if(!Object.hasOwn(depths,value.type))throw Error('Unsupported geometry');
  function positions(array,depth){
    if(!Array.isArray(array)||!array.length)throw Error('Empty coordinates');
    if(depth){array.forEach(child=>positions(child,depth-1));return;}
    if(array.length!==2||!array.every(Number.isFinite)||Math.abs(array[0])>180||Math.abs(array[1])>90)throw Error('Expected finite longitude/latitude');
  }
  positions(value.coordinates,depths[value.type]);
  const lines=value.type==='LineString'?[value.coordinates]:value.type==='MultiLineString'?value.coordinates:[];
  if(lines.some(line=>line.length<2))throw Error('Line needs two positions');
  const polygons=value.type==='Polygon'?[value.coordinates]:value.type==='MultiPolygon'?value.coordinates:[];
  for(const polygon of polygons)for(const ring of polygon)if(ring.length<4||ring[0][0]!==ring.at(-1)[0]||ring[0][1]!==ring.at(-1)[1])throw Error('Polygon ring must be closed');
}
function validate(bytes){
  const data=JSON.parse(bytes.toString('utf8'));
  if(data.type!=='FeatureCollection'||!Array.isArray(data.features)||data.crs)throw Error('Expected RFC 7946 FeatureCollection');
  if(data.coordinateReferenceSystem&&data.coordinateReferenceSystem!=='OGC:CRS84')throw Error('Canonical data must use OGC:CRS84');
  const ids=new Set();
  for(const feature of data.features){
    if(feature.type!=='Feature'||!feature.properties||typeof feature.properties!=='object'||Array.isArray(feature.properties))throw Error('Invalid feature');
    const id=feature.id??feature.properties.id;
    if(id!==undefined){if(!['string','number'].includes(typeof id)||(typeof id==='number'&&!Number.isFinite(id))||ids.has(id))throw Error('Invalid or duplicate feature ID');ids.add(id);}
    geometry(feature.geometry);
  }
  return {features:data.features.length};
}
function build({source=path.join(ROOT,'kuniezu/map'),output=path.join(ROOT,'kuniezu/static/kuniezu/map/build/vector'),check=false}={}){
  source=path.resolve(source);output=path.resolve(output);
  if(!fs.existsSync(source)||!fs.statSync(source).isDirectory())throw Error('Canonical source directory is missing');
  if(inside(source,output)||inside(output,source)||inside(realLocation(source),realLocation(output))||inside(realLocation(output),realLocation(source)))throw Error('Output and canonical source must not overlap');
  const rows=[];
  function walk(folder){if(!fs.existsSync(folder))return;if(fs.lstatSync(folder).isSymbolicLink())throw Error('Canonical vector symlink is not supported');for(const name of fs.readdirSync(folder).sort()){const file=path.join(folder,name),stat=fs.lstatSync(file);if(stat.isSymbolicLink())throw Error('Canonical vector symlink is not supported');if(stat.isDirectory())walk(file);else if(name.endsWith('.geojson')){const bytes=fs.readFileSync(file);rows.push({file:path.relative(source,file).split(path.sep).join('/'),sha256:sha(bytes),bytes:bytes.length,...validate(bytes),data:bytes});}}}
  for(const layer of ['physical','admin','control'])walk(path.join(source,layer));
  const manifest={generator:'kuniezu-vector-assets-v1',schemaVersion:1,coordinateReferenceSystem:'OGC:CRS84',files:rows.map(({data,...metadata})=>metadata)};
  if(check){
    if(JSON.stringify(JSON.parse(fs.readFileSync(path.join(output,'manifest.json'),'utf8')))!==JSON.stringify(manifest))throw Error('Published vector manifest differs from canonical source');
    for(const row of rows)if(!fs.readFileSync(path.join(output,row.file)).equals(row.data))throw Error('Published vector bytes differ from canonical source');
    return manifest;
  }
  if(fs.existsSync(output)){
    const previous=path.join(output,'manifest.json');
    if(!fs.existsSync(previous)||JSON.parse(fs.readFileSync(previous,'utf8')).generator!==manifest.generator)throw Error('Refusing to overwrite an unrelated output directory');
  }
  fs.mkdirSync(path.dirname(output),{recursive:true});const stage=fs.mkdtempSync(path.join(path.dirname(output),'.vector-stage-'));let backup;
  try{
    for(const row of rows){const file=path.join(stage,row.file);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,row.data);}
    fs.writeFileSync(path.join(stage,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
    if(fs.existsSync(output)){backup=fs.mkdtempSync(path.join(path.dirname(output),'.vector-backup-'));fs.rmdirSync(backup);fs.renameSync(output,backup);}
    try{fs.renameSync(stage,output);}catch(error){if(backup)fs.renameSync(backup,output);throw error;}
    if(backup)fs.rmSync(backup,{recursive:true,force:true});
  }finally{fs.rmSync(stage,{recursive:true,force:true});}
  return manifest;
}
if(require.main===module){const result=build({check:process.argv.includes('--check')});console.log('PASS: '+result.files.length+' edited GeoJSON files copied without changing coordinates');}
module.exports={build,validate};
