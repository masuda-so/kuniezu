#!/usr/bin/env node
'use strict';
/* Independent RGB verification: one source scanline + one horizontal tile band.
 * No map generator or shared PNG decoder is imported.
 * PNG filters/chunks: https://www.w3.org/TR/png-3/ sections 5, 9 and 11.
 * Usage: node tools/checks/province-source-image.cjs --source .../provinces.png
 *   --map-dir .../game/map/build --definition .../definition.csv
 *   --default-map .../default.map --output /tmp/province-source-check.json
 * Or: --self-test (temporary fixtures only; does not read/write game data).
 */
const fs=require('node:fs');
const fsp=fs.promises;
const path=require('node:path');
const os=require('node:os');
const crypto=require('node:crypto');
const zlib=require('node:zlib');
const {Readable}=require('node:stream');
const {pipeline}=require('node:stream/promises');
const assert=require('node:assert/strict');
const SIGNATURE=Buffer.from([137,80,78,71,13,10,26,10]);
const CHUNK_READ=64*1024;
const crcTable=new Uint32Array(256);
for(let n=0;n<256;n++){
 let c=n;for(let b=0;b<8;b++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;
 crcTable[n]=c>>>0;
}
const crcUpdate=(crc,data)=>{for(let i=0;i<data.length;i++)crc=crcTable[(crc^data[i])&255]^(crc>>>8);return crc>>>0;};
class VerificationError extends Error{
 constructor(code,message,details={}){super(message);this.code=code;this.details=details;}
}
function fail(code,message,details){throw new VerificationError(code,message,details);}
function positive(value,label){if(!Number.isSafeInteger(value)||value<=0)fail('DIMENSION',label+' must be a positive integer',{value});return value;}
const rgbNumber=rgb=>(rgb[0]<<16)|(rgb[1]<<8)|rgb[2];
const rgbAt=(buffer,i)=>[buffer[i],buffer[i+1],buffer[i+2]];
const sha256=data=>crypto.createHash('sha256').update(data).digest('hex');
const fileStamp=stat=>Object.fromEntries(['dev','ino','size','mtimeMs','ctimeMs'].map(k=>[k,stat[k]]));
const sameStamp=(a,b)=>Object.keys(a).every(k=>a[k]===b[k]);

// Yield only compressed IDAT data. Every file byte, including ancillary chunks,
// participates in SHA and CRC checks; large IDAT chunks are never buffered whole.
async function* pngData(file,meta,onHeader,expected){
 const fd=await fsp.open(file,'r'),hash=crypto.createHash('sha256');let offset=0;
 try{
  const start=await fd.stat();
  async function read(n){
   const b=Buffer.allocUnsafe(n);let done=0;
   while(done<n){const r=await fd.read(b,done,n-done,offset);if(!r.bytesRead)fail('TRUNCATED','PNG ended inside a chunk',{file,offset,missing:n-done});done+=r.bytesRead;offset+=r.bytesRead;}
   hash.update(b);return b;
  }
  if(!(await read(8)).equals(SIGNATURE))fail('SIGNATURE','Invalid PNG signature',{file});
  let header=false,ended=false,idatState=0,plte=false;
  while(!ended){
   const head=await read(8),length=head.readUInt32BE(0),type=head.toString('ascii',4,8),chunkOffset=offset-8;
   if(length>0x7fffffff||offset+length+4>start.size)fail('TRUNCATED','Invalid PNG chunk length',{file,type,chunkOffset,length});
   if(!/^[A-Za-z]{4}$/.test(type)||!(head[6]>=65&&head[6]<=90))fail('CHUNK','Invalid PNG chunk type',{file,type});
   if(!header&&type!=='IHDR')fail('CHUNK','IHDR must be first',{file,type});
   if(type==='IHDR'&&(header||length!==13))fail('CHUNK','Invalid or duplicate IHDR',{file});
   if(type==='IEND'&&length!==0)fail('CHUNK','IEND must be empty',{file});
   if(type==='IDAT'){
    if(idatState===2)fail('CHUNK','IDAT chunks must be consecutive',{file});idatState=1;
   }else if(idatState===1)idatState=2;
   if(type==='PLTE'){
    if(plte||idatState!==0||length===0||length%3||length>768)fail('CHUNK','Invalid PLTE',{file});plte=true;
   }else if(!['IHDR','IDAT','IEND'].includes(type)&&head[4]>=65&&head[4]<=90)fail('CHUNK','Unsupported critical PNG chunk',{file,type});
   if(['tRNS','acTL','fcTL','fdAT'].includes(type))fail('FORMAT','Province image must be static, opaque RGB',{file,type});
   let crc=crcUpdate(0xffffffff,head.subarray(4)),ihdr=null;
   for(let remaining=length;remaining>0;){
    const data=await read(Math.min(CHUNK_READ,remaining));remaining-=data.length;crc=crcUpdate(crc,data);
    if(type==='IHDR')ihdr=data;
    if(type==='IDAT'){meta.compressedBytes+=data.length;yield data;}
   }
   const stored=(await read(4)).readUInt32BE(0);
   if(((crc^0xffffffff)>>>0)!==stored)fail('CRC','PNG chunk CRC mismatch',{file,type,chunkOffset});
   if(type==='IHDR'){
    const width=ihdr.readUInt32BE(0),height=ihdr.readUInt32BE(4);positive(width,'PNG width');positive(height,'PNG height');
    if(ihdr[8]!==8||ihdr[9]!==2||ihdr[10]!==0||ihdr[11]!==0||ihdr[12]!==0)
     fail('FORMAT','Only non-interlaced RGB 8-bit PNG is supported',{file,depth:ihdr[8],colourType:ihdr[9],compression:ihdr[10],filter:ihdr[11],interlace:ihdr[12]});
    if(expected&&(width!==expected.width||height!==expected.height))fail('DIMENSION','PNG dimensions do not match the manifest',{file,width,height,expected});
    if(width*3>64*1024*1024)fail('DIMENSION','PNG scanline exceeds 64 MiB limit',{file,width});
    Object.assign(meta,{width,height});header=true;await onHeader(meta);
   }
   if(type==='IEND'){
    if(idatState===0)fail('CHUNK','PNG has no IDAT',{file});ended=true;
   }
  }
  if(offset!==start.size)fail('TRAILING','Bytes remain after IEND',{file,offset,size:start.size});
  const original=fileStamp(start),end=fileStamp(await fd.stat()),atPath=fileStamp(await fsp.stat(file));
  if(!sameStamp(original,end)||!sameStamp(original,atPath))fail('CHANGED','PNG changed or was replaced during verification',{file});
  meta.sha256=hash.digest('hex');meta.fileBytes=offset;meta.fileStamp=original;
 }finally{await fd.close();}
}

async function decodePngRows(file,{width,height,onHeader=()=>{},onRow=()=>{}}={}){
 const meta={compressedBytes:0,filters:[0,0,0,0,0]},inflate=zlib.createInflate({chunkSize:CHUNK_READ});
 let encoded,previous,current,stride,used=0,y=0;
 const header=async m=>{stride=m.width*3;encoded=Buffer.allocUnsafe(stride+1);previous=Buffer.alloc(stride);current=Buffer.allocUnsafe(stride);await onHeader(m);};
 try{
  await pipeline(Readable.from(pngData(file,meta,header,width==null?null:{width,height})),inflate,async chunks=>{
   for await(const chunk of chunks){
    let pos=0;
    while(pos<chunk.length){
     if(y>=meta.height)fail('RASTER_LENGTH','More decoded rows than IHDR declares',{file,y});
     const n=Math.min(encoded.length-used,chunk.length-pos);chunk.copy(encoded,used,pos,pos+n);pos+=n;used+=n;
     if(used!==encoded.length)continue;
     const filter=encoded[0];if(filter>4)fail('FILTER','Unknown PNG row filter',{file,y,filter});meta.filters[filter]++;
     if(filter===0)encoded.copy(current,0,1);
     else for(let x=0;x<stride;x++){
      const left=x>=3?current[x-3]:0,up=previous[x],upperLeft=x>=3?previous[x-3]:0;
      let predictor;
      if(filter===1)predictor=left;
      else if(filter===2)predictor=up;
      else if(filter===3)predictor=(left+up)>>>1;
      else{const p=left+up-upperLeft,a=Math.abs(p-left),b=Math.abs(p-up),c=Math.abs(p-upperLeft);predictor=a<=b&&a<=c?left:b<=c?up:upperLeft;}
      current[x]=(encoded[x+1]+predictor)&255;
     }
     await onRow(current,y,meta);[current,previous]=[previous,current];used=0;y++;
    }
   }
  });
 }catch(error){if(error instanceof VerificationError)throw error;fail('PNG_DECODE',error.message,{file});}
 if(used||y!==meta.height)fail('RASTER_LENGTH','Decoded image is shorter than IHDR declares',{file,rows:y,partialBytes:used,height:meta.height});
 if(inflate.bytesWritten!==meta.compressedBytes)fail('ZLIB_TRAILING','Unused bytes in the IDAT zlib stream',{file,consumed:inflate.bytesWritten,provided:meta.compressedBytes});
 if(!sameStamp(meta.fileStamp,fileStamp(await fsp.stat(file))))fail('CHANGED','PNG changed while decoded rows were being consumed',{file});
 return {...meta,rows:y};
}

function readDefinitions(file,defaultMap,snapshots={}){
 const text=(snapshots.definition||fs.readFileSync(file)).toString('utf8').replace(/^\uFEFF/,''),lines=text.split(/\r?\n/).map(s=>s.trim()).filter(s=>s&&!s.startsWith('#'));
 const header=lines[0]?.split(';').map(s=>s.trim());const legacy=header?.slice(0,4).join(';')==='id;r;g;b';
 const kindIndex=legacy?header.indexOf('kind'):-1,byId=new Map(),byRgb=new Map(),allowed=new Uint8Array(1<<21);
 for(const [index,line]of lines.slice(legacy?1:0).entries()){
  const parts=line.split(';'),nums=parts.slice(0,4).map(s=>/^\d+$/.test(s.trim())?Number(s):NaN),[id,r,g,b]=nums;
  if(parts.length<5||!Number.isSafeInteger(id)||id<0||[r,g,b].some(v=>!Number.isInteger(v)||v<0||v>255))fail('DEFINITION','Invalid definition row',{file,line:index+(legacy?2:1)});
  const rgb=[r,g,b],colour=rgbNumber(rgb),reserved=!legacy&&id===0&&parts[4]==='x';
  if(byId.has(id)||byRgb.has(colour))fail('DEFINITION','Duplicate definition id or RGB',{file,id,rgb});
  const record={id,rgb,colour,name:parts[4],kind:kindIndex>=0?parts[kindIndex]:null,reserved};byId.set(id,record);byRgb.set(colour,record);
  if(!reserved)allowed[colour>>>3]|=1<<(colour&7);
 }
 if(!byId.size)fail('DEFINITION','No colours in definition.csv',{file});
 let seaIds=[];
 if(defaultMap){
  const config=(snapshots.defaultMap||fs.readFileSync(defaultMap)).toString('utf8').replace(/#[^\r\n]*/g,'');
  const lists=[...config.matchAll(/\b(sea_zones|sea_starts)\s*=\s*(?:LIST\s*)?\{([^}]*)\}/g)];
  for(const match of lists){
   const values=match[2].trim().split(/\s+/).filter(Boolean);if(values.some(v=>!/^\d+$/.test(v)))fail('DEFINITION','Invalid sea ID list',{file:defaultMap});
   seaIds.push(...values.map(Number));
  }
  if(!lists.length)fail('DEFINITION','default.map has no supported sea_zones/sea_starts LIST',{file:defaultMap});
 }else seaIds=[...byId.values()].filter(r=>r.kind==='sea'||(!legacy&&r.name==='sea')).map(r=>r.id);
 seaIds=[...new Set(seaIds)];
 for(const id of seaIds)if(!byId.has(id)||byId.get(id).reserved)fail('DEFINITION','Sea id has no usable colour',{file,id});
 return {byId,byRgb,allowed,seaIds,format:legacy?'header-csv':'paradox-csv'};
}

async function verify(options){
 const started=Date.now(),source=path.resolve(options.source),mapDir=path.resolve(options.mapDir),manifestPath=path.join(mapDir,'manifest.json');
 const manifestBytes=await fsp.readFile(manifestPath),manifest=JSON.parse(manifestBytes),width=positive(manifest.width,'manifest width'),height=positive(manifest.height,'manifest height'),tile=positive(manifest.tile,'manifest tile');
 const snapshots=new Map([[manifestPath,manifestBytes]]);
 const capture=async file=>{if(!snapshots.has(file))snapshots.set(file,await fsp.readFile(file));return snapshots.get(file);};
 if(width*Math.min(tile,height)*3>512*1024*1024)fail('DIMENSION','One tile band exceeds 512 MiB limit',{width,height,tile});
 // 正本の区画の表は生成物の置き場（game/map/build）の隣の game/map/control。旧来の並び（map と map_data、層に分ける前の game/map）も読む。
 const modern=[path.join(mapDir,'../control'),path.join(mapDir,'..'),path.join(mapDir,'../map_data')].find(d=>fs.existsSync(path.join(d,'definition.csv'))),definition=path.resolve(options.definition||(modern?path.join(modern,'definition.csv'):path.join(mapDir,'definition.csv')));
 const adjacentDefault=path.join(path.dirname(definition),'default.map');
 const defaultMap=options.defaultMap?path.resolve(options.defaultMap):fs.existsSync(adjacentDefault)?adjacentDefault:null;
 const definitions=readDefinitions(definition,defaultMap,{definition:await capture(definition),defaultMap:defaultMap?await capture(defaultMap):null});
 // Public map-data.cjs contract: SHA-256 of four lowercase hexadecimal file
 // digests joined by LF, in provinces/definition/defaultMap/projection order,
 // with no final LF. Do not import its implementation or compare this compound
 // fingerprint to the PNG's own hash. An override CSV can be used for RGB
 // validation; the manifest provenance still refers to the declared originals.
 const sourceMeta=manifest.source,componentPaths={provinces:source};
 let fingerprintReason=null;
 if(!sourceMeta?.sha256)fingerprintReason='Manifest has no source fingerprint';
 // 各ファイルは source.dir からの相対パス（層に分けた配置では control/provinces.png・projection.json など。旧い配置ではファイル名だけ）。
 // 上の階層へ出るパスと絶対パスは認めない。正本の置き場は、検査する画像のパスから declared の provinces を取り除いて求める。
 else if(manifest.generated!=='tools/map/build-map-tiles.cjs'||['provinces','definition','defaultMap','projection'].some(k=>typeof sourceMeta[k]!=='string'||path.isAbsolute(sourceMeta[k])||sourceMeta[k].split('/').some(p=>p===''||p==='.'||p==='..')))
  fingerprintReason='Source fingerprint algorithm is not identified by the supported map-data contract';
 else{
  const declared=sourceMeta.provinces.split('/'),parts=path.resolve(source).split(path.sep),tail=parts.slice(-declared.length);
  const sourceRoot=tail.join('/')===sourceMeta.provinces?parts.slice(0,-declared.length).join(path.sep)||path.sep:path.dirname(source);
  for(const key of ['definition','defaultMap','projection']){
   const file=path.resolve(sourceRoot,...sourceMeta[key].split('/'));componentPaths[key]=file;
   try{await capture(file);}catch(error){if(error.code!=='ENOENT')throw error;fingerprintReason='Declared source component is unavailable: '+file;break;}
  }
 }
 let seaRgb=options.seaRgb;
 if(!seaRgb){if(definitions.seaIds.length!==1)fail('SEA_COLOUR','Omitted tiles require exactly one sea colour or --sea-rgb',{seaIds:definitions.seaIds});seaRgb=definitions.byId.get(definitions.seaIds[0]).rgb;}
 if(seaRgb.length!==3||seaRgb.some(v=>!Number.isInteger(v)||v<0||v>255))fail('SEA_COLOUR','Invalid sea RGB',{seaRgb});
 const seaRecord=definitions.byRgb.get(rgbNumber(seaRgb));
 if(!seaRecord||!definitions.seaIds.includes(seaRecord.id))fail('SEA_COLOUR','Omitted-tile colour is not a defined sea zone',{seaRgb});
 const cols=Math.ceil(width/tile),bands=Math.ceil(height/tile),listed=new Map(),filenames=new Set();
 if(!Array.isArray(manifest.tiles))fail('MANIFEST','manifest.tiles must be an array');
 for(const entry of manifest.tiles){
  const {col,row,file}=entry;
  if(!Number.isInteger(col)||!Number.isInteger(row)||col<0||col>=cols||row<0||row>=bands||typeof file!=='string'||path.basename(file)!==file||!file.endsWith('.png'))fail('MANIFEST','Invalid tile record',{entry});
  const w=Math.min(tile,width-col*tile),h=Math.min(tile,height-row*tile),key=col+':'+row;
  if(entry.width!==w||entry.height!==h)fail('DIMENSION','Tile dimensions disagree with grid',{entry,expected:{width:w,height:h}});
  if(listed.has(key)||filenames.has(file))fail('MANIFEST','Duplicate tile position or filename',{entry});listed.set(key,entry);filenames.add(file);
 }
 const tileDir=path.join(mapDir,'provinces');
 const disk=await fsp.readdir(tileDir);
 for(const file of disk)if(file.endsWith('.png')&&!filenames.has(file))fail('MANIFEST','Unlisted province tile on disk',{file});
 let currentBand=-1,loaded=[],bandBytes=0,peakBandBytes=0,peakRss=process.memoryUsage().rss,compared=0,decodedTilePixels=0;
 const tileReports=[],seaRow=Buffer.alloc(width*3);for(let x=0;x<width;x++){seaRow[x*3]=seaRgb[0];seaRow[x*3+1]=seaRgb[1];seaRow[x*3+2]=seaRgb[2];}
 function known(row,file,y,globalX=0,globalY=0){
  let previous=-1;
  for(let i=0;i<row.length;i+=3){const colour=(row[i]<<16)|(row[i+1]<<8)|row[i+2];if(colour===previous)continue;previous=colour;
   if(!(definitions.allowed[colour>>>3]&(1<<(colour&7))))fail('UNDEFINED_COLOUR','Pixel uses an undefined or reserved province colour',{file,x:globalX+i/3,y:globalY+y,rgb:rgbAt(row,i)});
  }
 }
 async function loadBand(index){
  // Release the previous band before allocating the next; only tile buffers in
  // this band are retained. Source rows are consumed with stream backpressure.
  loaded=[];bandBytes=0;currentBand=index;
  for(let col=0;col<cols;col++){
   const entry=listed.get(col+':'+index);if(!entry){loaded.push(null);continue;}
   const file=path.join(tileDir,entry.file),rgb=Buffer.allocUnsafe(entry.width*entry.height*3);
   const info=await decodePngRows(file,{width:entry.width,height:entry.height,onRow:(row,y)=>{known(row,file,y,col*tile,index*tile);row.copy(rgb,y*entry.width*3);}});
   if(entry.sha256&&entry.sha256!==info.sha256)fail('TILE_HASH','Tile SHA does not match manifest',{file,expected:entry.sha256,actual:info.sha256});
   loaded.push({rgb,width:entry.width});bandBytes+=rgb.length;decodedTilePixels+=entry.width*entry.height;
   tileReports.push({file:entry.file,sha256:info.sha256,filters:info.filters});
  }
  peakBandBytes=Math.max(peakBandBytes,bandBytes);peakRss=Math.max(peakRss,process.memoryUsage().rss);
 }
 const info=await decodePngRows(source,{width,height,onRow:async(row,y)=>{
  const band=Math.floor(y/tile);if(currentBand!==band)await loadBand(band);
  const localY=y%tile;
  for(let col=0;col<cols;col++){
   const x=col*tile,w=Math.min(tile,width-x),item=loaded[col],actual=row.subarray(x*3,(x+w)*3);
   const expected=item?item.rgb.subarray(localY*item.width*3,(localY+1)*item.width*3):seaRow.subarray(0,w*3);
   if(!actual.equals(expected)){
    known(actual,source,y,x,0);
    let i=0;while(actual[i]===expected[i])i++;i-=i%3;
    fail('PIXEL_MISMATCH','Source RGB differs from tile baseline',{x:x+i/3,y,sourceRGB:rgbAt(actual,i),tileRGB:rgbAt(expected,i),tile:listed.get(col+':'+band)?.file||null,omittedTile:!item});
   }
  }
  compared+=width;
  if((y+1)%tile===0||y+1===height){peakRss=Math.max(peakRss,process.memoryUsage().rss);if(!options.quiet)process.stderr.write('Checked rows '+(y+1)+'/'+height+'\n');}
 }});
 if(compared!==width*height)fail('PIXEL_COUNT','Not all source pixels were compared',{compared,width,height});
 for(const [file,bytes]of snapshots)if(!(await fsp.readFile(file)).equals(bytes))fail('CHANGED','Source metadata changed during verification',{file});
 if(!sameStamp(info.fileStamp,fileStamp(await fsp.stat(source))))fail('CHANGED','Source PNG changed after its scan',{file:source});
 let fingerprint=null,fingerprintMatches=null,componentHashes=null;
 if(!fingerprintReason){
  componentHashes={provinces:info.sha256};for(const key of ['definition','defaultMap','projection'])componentHashes[key]=sha256(snapshots.get(componentPaths[key]));
  fingerprint=sha256(['provinces','definition','defaultMap','projection'].map(k=>componentHashes[k]).join('\n'));
  fingerprintMatches=fingerprint===sourceMeta.sha256;
  if(!fingerprintMatches)fail('SOURCE_FINGERPRINT','Source composite fingerprint does not match manifest',{expected:sourceMeta.sha256,actual:fingerprint,componentPaths,componentHashes});
 }
 return {ok:true,source,mapDir,definition,defaultMap,definitionFormat:definitions.format,width,height,tile,comparedPixels:compared,mismatches:0,undefinedColours:0,
  sourceSha256:info.sha256,sourceFileBytes:info.fileBytes,sourceFilters:info.filters,manifestSourceSha256:manifest.source?.sha256||null,
  manifestSourceSha256Matches:fingerprintMatches,sourceCompositeFingerprint:{algorithm:fingerprintReason?null:'sha256(LF-joined file SHA256: provinces, definition, defaultMap, projection; no trailing LF)',actual:fingerprint,reason:fingerprintReason,componentPaths:fingerprintReason?null:componentPaths,componentHashes},
  sourceAndMetadataStable:true,metadataSha256:Object.fromEntries([...snapshots].map(([file,bytes])=>[file,sha256(bytes)])),
  manifestSha256:crypto.createHash('sha256').update(manifestBytes).digest('hex'),tileCount:tileReports.length,omittedSeaTiles:cols*bands-tileReports.length,omittedSeaRGB:seaRgb,
  checkedTilePixels:decodedTilePixels,peakTileBandBytes:peakBandBytes,peakRssBytes:peakRss,elapsedSeconds:(Date.now()-started)/1000,tiles:tileReports,
  scope:'Every source RGB pixel equals the declared tile baseline. Listed tiles are decoded and checked against definition colours; omitted tiles are the explicit sea colour. No history or map projection accuracy is inferred.'};
}

// Test encoder only. It does not import the production map writer. Its Paeth
// predictor uses distance ordering, separately from the decoder's branch logic.
function fixtureChunk(type,data){
 const head=Buffer.alloc(8),tail=Buffer.alloc(4);head.writeUInt32BE(data.length);head.write(type,4);tail.writeUInt32BE((crcUpdate(crcUpdate(0xffffffff,Buffer.from(type)),data)^0xffffffff)>>>0);return Buffer.concat([head,data,tail]);
}
function fixturePng(w,h,pixels,{filters=[0,1,2,3,4],extra=Buffer.alloc(0),badFilter=false}={}){
 const stride=w*3,raw=Buffer.alloc((stride+1)*h);
 for(let y=0;y<h;y++){
  const f=filters[y%filters.length];raw[y*(stride+1)]=badFilter&&y===0?5:f;
  for(let x=0;x<stride;x++){
   const index=y*stride+x,a=x>=3?pixels[index-3]:0,b=y?pixels[index-stride]:0,c=y&&x>=3?pixels[index-stride-3]:0;
   const p=a+b-c,paeth=[a,b,c].map((value,order)=>({value,distance:Math.abs(p-value),order})).sort((q,r)=>q.distance-r.distance||q.order-r.order)[0].value;
   const prediction=[0,a,b,Math.floor((a+b)/2),paeth][f];raw[y*(stride+1)+x+1]=(pixels[index]-prediction+256)%256;
  }
 }
 const ih=Buffer.alloc(13);ih.writeUInt32BE(w);ih.writeUInt32BE(h,4);ih[8]=8;ih[9]=2;
 const compressed=zlib.deflateSync(Buffer.concat([raw,extra])),split=Math.max(1,Math.floor(compressed.length/2));
 return Buffer.concat([SIGNATURE,fixtureChunk('IHDR',ih),fixtureChunk('IDAT',compressed.subarray(0,split)),fixtureChunk('IDAT',compressed.subarray(split)),fixtureChunk('IEND',Buffer.alloc(0))]);
}
async function selfTest(){
 assert.equal((crcUpdate(0xffffffff,Buffer.from('123456789'))^0xffffffff)>>>0,0xcbf43926,'standard CRC-32 check value');
 const dir=await fsp.mkdtemp(path.join(os.tmpdir(),'province-source-check-')),mapDir=path.join(dir,'map'),source=path.join(dir,'provinces.png');
 try{
  await fsp.mkdir(path.join(mapDir,'provinces'),{recursive:true});const w=7,h=7,tile=3,colours=[[8,24,48],[55,123,140],[110,244,23]],pixels=Buffer.alloc(w*h*3);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const c=x>=6||y>=6||x<3&&y<3?colours[0]:colours[1+(x+y)%2];pixels.set(c,(y*w+x)*3);}
  pixels.set(colours[1],(4*w+6)*3);pixels.set(colours[2],(6*w+4)*3);
  const tiles=[];
  for(let ty=0;ty<3;ty++)for(let tx=0;tx<3;tx++){
   const bw=Math.min(tile,w-tx*tile),bh=Math.min(tile,h-ty*tile),rgb=Buffer.alloc(bw*bh*3);let land=false;
   for(let y=0;y<bh;y++)for(let x=0;x<bw;x++){const p=((ty*tile+y)*w+tx*tile+x)*3;pixels.copy(rgb,(y*bw+x)*3,p,p+3);if(pixels[p]!==colours[0][0])land=true;}
   if(!land)continue;const file=tx+'-'+ty+'.png',png=fixturePng(bw,bh,rgb);await fsp.writeFile(path.join(mapDir,'provinces',file),png);tiles.push({file,col:tx,row:ty,width:bw,height:bh,sha256:crypto.createHash('sha256').update(png).digest('hex')});
  }
  await fsp.writeFile(path.join(mapDir,'manifest.json'),JSON.stringify({width:w,height:h,tile,tiles}));
  const definition=path.join(mapDir,'definition.csv');await fsp.writeFile(definition,'id;r;g;b;key;name;kind;pixels\n0;8;24;48;sea;海;sea;0\n1;55;123;140;a;A;land;0\n2;110;244;23;b;B;land;0\n');
  const valid=fixturePng(w,h,pixels);await fsp.writeFile(source,valid);
  const options={source,mapDir,definition,quiet:true},pass=await verify(options);assert.equal(pass.comparedPixels,w*h);assert.equal(pass.omittedSeaTiles,4);assert.ok(pass.sourceFilters.every(n=>n>0));
  assert.ok(tiles.some(t=>t.width===1));assert.ok(tiles.some(t=>t.height===1));
  const tested=['RGB filters 0..4, split IDAT, sea omission and partial edge tiles'];
  async function bad(name,buffer,code){await fsp.writeFile(source,buffer);await assert.rejects(()=>verify(options),e=>e.code===code,name);tested.push(name);}
  const changed=Buffer.from(pixels);changed.set(colours[2],(4*w+4)*3);await bad('defined colour mismatch',fixturePng(w,h,changed),'PIXEL_MISMATCH');
  const unknown=Buffer.from(pixels);unknown.set([9,10,11],(4*w+4)*3);await bad('undefined source colour',fixturePng(w,h,unknown),'UNDEFINED_COLOUR');
  await bad('wrong source dimensions',fixturePng(w-1,h,Buffer.alloc((w-1)*h*3)),'DIMENSION');
  const crc=Buffer.from(valid);crc[crc.length-1]^=1;await bad('CRC mismatch',crc,'CRC');
  await bad('truncated PNG',valid.subarray(0,valid.length-9),'TRUNCATED');
  await bad('trailing file bytes',Buffer.concat([valid,Buffer.from([0])]),'TRAILING');
  await bad('extra decoded scanline',fixturePng(w,h,pixels,{extra:Buffer.alloc(w*3+1)}),'RASTER_LENGTH');
  await bad('invalid scanline filter',fixturePng(w,h,pixels,{badFilter:true}),'FILTER');
  const idat=[];for(let offset=8;offset<valid.length;){const n=valid.readUInt32BE(offset),type=valid.toString('ascii',offset+4,offset+8);if(type==='IDAT')idat.push(valid.subarray(offset+8,offset+8+n));offset+=n+12;}
  const joined=Buffer.concat(idat),rgbHeader=valid.subarray(8,33);
  const compressedVariant=bytes=>Buffer.concat([SIGNATURE,rgbHeader,fixtureChunk('IDAT',bytes),fixtureChunk('IEND',Buffer.alloc(0))]);
  await bad('truncated zlib stream with valid chunk CRC',compressedVariant(joined.subarray(0,joined.length-4)),'PNG_DECODE');
  await bad('unused IDAT bytes',compressedVariant(Buffer.concat([joined,Buffer.from([1,2,3])])),'ZLIB_TRAILING');
  const ih=Buffer.alloc(13);ih.writeUInt32BE(w);ih.writeUInt32BE(h,4);ih[8]=8;ih[9]=6;
  const rgba=Buffer.concat([SIGNATURE,fixtureChunk('IHDR',ih),fixtureChunk('IDAT',zlib.deflateSync(Buffer.alloc((w*4+1)*h))),fixtureChunk('IEND',Buffer.alloc(0))]);
  await bad('RGBA rejected instead of silently discarding alpha',rgba,'FORMAT');
  const tilePath=path.join(mapDir,'provinces',tiles[0].file),originalTile=await fsp.readFile(tilePath),unknownTile=Buffer.alloc(tiles[0].width*tiles[0].height*3,9);
  await fsp.writeFile(source,valid);await fsp.writeFile(tilePath,fixturePng(tiles[0].width,tiles[0].height,unknownTile));
  await assert.rejects(()=>verify(options),e=>e.code==='UNDEFINED_COLOUR');tested.push('undefined tile colour');await fsp.writeFile(tilePath,originalTile);
  await fsp.writeFile(tilePath,fixturePng(1,1,Buffer.from(colours[0])));
  await assert.rejects(()=>verify(options),e=>e.code==='DIMENSION');tested.push('wrong tile dimensions');await fsp.writeFile(tilePath,originalTile);
  // The same RGBs with different IDs are equivalent. Reserved black remains invalid.
  const modern=path.join(dir,'definition.csv'),defaultMap=path.join(dir,'default.map');
  await fsp.writeFile(modern,'0;0;0;0;x;x;\n17;8;24;48;sea;x;\n71;55;123;140;a;x;\n72;110;244;23;b;x;\n');await fsp.writeFile(defaultMap,'sea_zones = LIST { 17 }\nlakes = LIST { }\n');await fsp.writeFile(source,valid);
  const renumbered=await verify({...options,definition:modern,defaultMap});assert.equal(renumbered.comparedPixels,w*h);tested.push('Paradox IDs differ while RGB stays identical');
  const reserved=Buffer.from(pixels);reserved.set([0,0,0],(4*w+4)*3);await fsp.writeFile(source,fixturePng(w,h,reserved));await assert.rejects(()=>verify({...options,definition:modern,defaultMap}),e=>e.code==='UNDEFINED_COLOUR');tested.push('reserved ID 0 colour');
  // Verify the published compound contract independently of the PNG hash and
  // of an explicitly selected legacy CSV used only for colour validation.
  await fsp.writeFile(source,valid);
  const projection=path.join(dir,'projection.json'),projectionBytes=Buffer.from('{"width":7,"height":7}\n');await fsp.writeFile(projection,projectionBytes);
  const parts=[valid,await fsp.readFile(modern),await fsp.readFile(defaultMap),projectionBytes];
  const compound=sha256(parts.map(sha256).join('\n'));
  const manifestPath=path.join(mapDir,'manifest.json'),baseManifest={width:w,height:h,tile,tiles},declared={...baseManifest,generated:'tools/map/build-map-tiles.cjs',source:{dir:'game/map',provinces:'provinces.png',definition:'definition.csv',defaultMap:'default.map',projection:'projection.json',sha256:compound}};
  await fsp.writeFile(manifestPath,JSON.stringify(declared));
  const fingerprintPass=await verify(options);
  assert.equal(fingerprintPass.manifestSourceSha256Matches,true);assert.equal(fingerprintPass.sourceCompositeFingerprint.actual,compound);
  assert.notEqual(fingerprintPass.sourceSha256,compound);assert.equal(fingerprintPass.sourceCompositeFingerprint.componentPaths.definition,modern);
  assert.notEqual(fingerprintPass.metadataSha256[definition],fingerprintPass.sourceCompositeFingerprint.componentHashes.definition);
  assert.equal(fingerprintPass.sourceAndMetadataStable,true);tested.push('compound source fingerprint uses declared originals despite legacy CSV override');
  await fsp.writeFile(projection,'{"width":7,"height":8}\n');
  await assert.rejects(()=>verify(options),e=>e.code==='SOURCE_FINGERPRINT');tested.push('changed fingerprint component');await fsp.writeFile(projection,projectionBytes);
  await fsp.writeFile(manifestPath,JSON.stringify({...declared,generated:'unknown-generator.cjs'}));
  const unknownContract=await verify(options);assert.equal(unknownContract.manifestSourceSha256Matches,null);assert.ok(unknownContract.sourceCompositeFingerprint.reason);tested.push('unknown fingerprint contract returns null with explanation');
  await fsp.writeFile(manifestPath,JSON.stringify({...declared,source:{...declared.source,projection:'missing-projection.json'}}));
  const missingComponent=await verify(options);assert.equal(missingComponent.manifestSourceSha256Matches,null);assert.match(missingComponent.sourceCompositeFingerprint.reason,/unavailable/);tested.push('missing declared fingerprint component returns null with explanation');
  // 層に分けた配置（game/map/control/provinces.png と共有の game/map/projection.json）でも、正本4点の複合確認値を照合する。
  const layered=path.join(dir,'layered'),control=path.join(layered,'control');await fsp.mkdir(control,{recursive:true});
  const layeredSource=path.join(control,'provinces.png'),layeredDef=path.join(control,'definition.csv'),layeredMap=path.join(control,'default.map');
  await fsp.writeFile(layeredSource,valid);await fsp.copyFile(modern,layeredDef);await fsp.copyFile(defaultMap,layeredMap);await fsp.writeFile(path.join(layered,'projection.json'),projectionBytes);
  const layeredDeclared={...declared,source:{dir:'game/map',provinces:'control/provinces.png',definition:'control/definition.csv',defaultMap:'control/default.map',projection:'projection.json',sha256:compound}};
  await fsp.writeFile(manifestPath,JSON.stringify(layeredDeclared));
  const layeredPass=await verify({...options,source:layeredSource,definition:layeredDef,defaultMap:layeredMap});
  assert.equal(layeredPass.manifestSourceSha256Matches,true);assert.equal(layeredPass.sourceCompositeFingerprint.componentPaths.projection,path.join(layered,'projection.json'));tested.push('layered source folders resolve the shared projection');
  await fsp.writeFile(manifestPath,JSON.stringify({...layeredDeclared,source:{...layeredDeclared.source,projection:'../projection.json'}}));
  const escaping=await verify({...options,source:layeredSource,definition:layeredDef,defaultMap:layeredMap});assert.equal(escaping.manifestSourceSha256Matches,null);tested.push('component path escaping the source folder is not accepted');
  await fsp.writeFile(manifestPath,JSON.stringify(declared));
  await assert.rejects(()=>decodePngRows(source,{onRow:async(row,y)=>{if(y===0){const replacement=source+'.replacement';await fsp.writeFile(replacement,valid);await fsp.rename(replacement,source);}}}),e=>e.code==='CHANGED');tested.push('atomic replacement of source during row consumption');
  return {ok:true,selfTest:true,cases:tested.length,tests:tested};
 }finally{await fsp.rm(dir,{recursive:true,force:true});}
}

async function main(argv){
 const options={};const args={source:'source','map-dir':'mapDir',definition:'definition','default-map':'defaultMap',output:'output','sea-rgb':'seaRgb'};
 for(let i=0;i<argv.length;i++){
  const a=argv[i];if(a==='--self-test')options.selfTest=true;else if(a==='--quiet')options.quiet=true;
  else if(a==='--help'){console.log('Usage: node tools/checks/province-source-image.cjs --source provinces.png --map-dir game/map/build [--definition definition.csv] [--default-map default.map] [--sea-rgb R,G,B] [--output result.json] [--quiet]\n       node tools/checks/province-source-image.cjs --self-test [--output result.json]');return;}
  else{const key=args[a.replace(/^--/,'')];if(!a.startsWith('--')||!key||!argv[i+1]||argv[i+1].startsWith('--'))fail('ARGUMENT','Invalid or incomplete option',{option:a});options[key]=argv[++i];}
 }
 if(options.output){
  const target=path.resolve(options.output),realTarget=await fsp.realpath(target).catch(e=>{if(e.code==='ENOENT')return target;throw e;});
  const inside=(file,dir)=>{const r=path.relative(dir,file);return r===''||r!=='..'&&!r.startsWith('..'+path.sep)&&!path.isAbsolute(r);};
  if(path.extname(target)!=='.json')fail('OUTPUT','Verification output must be a .json report',{target});
  for(const key of ['source','definition','defaultMap'])if(options[key]){
   const input=path.resolve(options[key]),realInput=await fsp.realpath(input).catch(()=>input);
   if(target===input||realTarget===realInput)fail('OUTPUT','Output must not overwrite an input',{target,input});
  }
  if(options.mapDir){
   const mapDir=path.resolve(options.mapDir),realMap=await fsp.realpath(mapDir).catch(()=>mapDir);
   for(const dir of [mapDir,realMap,path.resolve(mapDir,'..'),path.resolve(realMap,'..'),path.resolve(mapDir,'../map_data'),path.resolve(realMap,'../map_data')])
    if(inside(target,dir)||inside(realTarget,dir))fail('OUTPUT','Map data is read-only; choose a report outside map/map_data',{target});
  }
 }
 let result;
 try{
  if(options.seaRgb)options.seaRgb=options.seaRgb.split(',').map(Number);
  if(options.selfTest)result=await selfTest();else{if(!options.source||!options.mapDir)fail('ARGUMENT','--source and --map-dir are required');result=await verify(options);}
 }catch(error){result={ok:false,error:{code:error.code||'ERROR',message:error.message,...error.details}};process.exitCode=1;}
 if(options.output){await fsp.mkdir(path.dirname(path.resolve(options.output)),{recursive:true});await fsp.writeFile(options.output,JSON.stringify(result,null,2)+'\n');}
 if(result.ok)console.log(result.selfTest?'PASS: '+result.cases+' province source verifier self-tests':'PASS: '+result.comparedPixels+' RGB pixels; '+result.tileCount+' tiles; peak tile band '+result.peakTileBandBytes+' bytes');
 else process.stderr.write(JSON.stringify(result)+'\n');
}
module.exports={verify,decodePngRows,readDefinitions,selfTest};
if(require.main===module)main(process.argv.slice(2)).catch(error=>{console.error(error);process.exitCode=1;});
