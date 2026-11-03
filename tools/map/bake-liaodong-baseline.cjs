/* 遼東の軍政域参考図を画像の正本へ移す一回限りの移行。海・湖・城領は保持し、neutral:明 / unassigned だけを扱う。
 * 1560基幹域と1573〜1605年の寛甸参考域を分離。後者は年精度の仮定で、1603〜1605年の撤収過程を含む。
 * 正本全域RGBは一時ファイルへ流し、行と寛甸の局所型紙だけをメモリに置く。
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const MD=require('./map-data.cjs'),{readRGB,writeRGB}=require('./png-big.cjs');
const EXPECTED='46ac04975ed4291bd7f1ead55f985818b5daf91f0f84430c8064e909b09bd7a4',REVISION='liaodong-1560-source-v1';
const hash=()=>crypto.createHash('sha256');
async function main(){
 assert.equal(MD.sourceSha256(),EXPECTED,'対象は児島湾補正を正本化済みの基準だけ。重複適用不可。');
 const inputs=path.join(MD.root,'data/inputs/liaodong-frontier-review'),source=path.join(MD.root,'data/research/liaodong-reference/liaodong-1560.geojson'),geo=JSON.parse(fs.readFileSync(source));
 const core=geo.features.find(f=>f.id==='ming-liaodong-1560-mask'),period=geo.features.find(f=>f.id==='ming-kuandian-1573-1605-mask');assert.ok(core&&period);
 const P=MD.readProjection(),W=P.width,H=P.height,defs=MD.readDefinition(),ming=defs.byKey.get('neutral:明'),unknown=defs.byKey.get('unassigned');
 const grid=feature=>feature.geometry.coordinates.map(r=>r.map(([lon,lat])=>[((lon-P.LON0)*P.K*P.CX-P.origin[0])/P.stepUnits,((P.LAT0-lat)*P.K-P.origin[1])/P.stepUnits]));
 const cr=grid(core),pr=grid(period),bbox=r=>{const p=r.flat();return [Math.floor(Math.min(...p.map(p=>p[0]))),Math.floor(Math.min(...p.map(p=>p[1]))),Math.ceil(Math.max(...p.map(p=>p[0]))),Math.ceil(Math.max(...p.map(p=>p[1])))];};
 const cb=bbox(cr),pb=bbox(pr),oldMingBounds=[1113,6269,2249,7186];
 const bounds=[Math.max(0,Math.min(cb[0],pb[0],oldMingBounds[0])),Math.max(0,Math.min(cb[1],pb[1],oldMingBounds[1])),Math.min(W-1,Math.max(cb[2],pb[2],oldMingBounds[2])),Math.min(H-1,Math.max(cb[3],pb[3],oldMingBounds[3]))];
 const window=[pb[0],pb[1],pb[2]-pb[0]+1,pb[3]-pb[1]+1],mask=Buffer.alloc(window[2]*window[3]*3);
 const rowSpans=(rings,y)=>{const sy=y+.5,xs=[];for(const r of rings)for(let i=0,j=r.length-1;i<r.length;j=i++){const [ax,ay]=r[j],[bx,by]=r[i];if((ay>sy)!==(by>sy))xs.push(ax+(bx-ax)*(sy-ay)/(by-ay));}xs.sort((a,b)=>a-b);const spans=[];for(let i=0;i+1<xs.length;i+=2)spans.push([Math.ceil(xs[i]-.5),Math.ceil(xs[i+1]-.5)-1]);return spans;};
 const has=(spans,x)=>spans.some(([a,b])=>x>=a&&x<=b),match=(row,o,d)=>row[o]===d.rgb[0]&&row[o+1]===d.rgb[1]&&row[o+2]===d.rgb[2];
 const before=Object.fromEntries(Object.entries(MD.files).map(([k,f])=>[k,MD.sha(f)])),edits=path.join(MD.root,'game/map/edits'),ledger=JSON.parse(fs.readFileSync(path.join(edits,'baseline-ledger.json')));assert.equal(ledger.sourceSha256,EXPECTED);
 const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'kuniezu-liaodong-')),fd=fs.openSync(path.join(temporary,'image.rgb'),'w+'),outsideBefore=hash(),outsideAfter=hash();
 const counts={toMing:0,toUnassigned:0,oldMingInsideCore:0,oldMingInPeriodOnly:0,oldMingOutsideBoth:0,periodPixels:0,protectedInsideCore:0,protectedInsidePeriod:0};
 const sampleStride=8,pw=Math.ceil((bounds[2]-bounds[0]+1)/sampleStride),ph=Math.ceil((bounds[3]-bounds[1]+1)/sampleStride),previews=[Buffer.alloc(pw*ph*3),Buffer.alloc(pw*ph*3)];
 const sample=(row,y,which)=>{if(y<bounds[1]||y>bounds[3]||(y-bounds[1])%sampleStride!==0)return;const py=Math.floor((y-bounds[1])/sampleStride);for(let x=0;x<pw;x++){const sx=Math.min(bounds[2],bounds[0]+x*sampleStride),o=sx*3;const d=defs.byRGB.get(row[o]+','+row[o+1]+','+row[o+2]),c=d.key===ming.key?[174,77,48]:d.key===unknown.key?[209,204,187]:d.kind==='sea'?[109,161,188]:d.kind==='lake'?[145,186,205]:[114,142,91];previews[which].set(c,(py*pw+x)*3);}};
 const outside=(h,row,y)=>{if(y<bounds[1]||y>bounds[3])h.update(row);else{h.update(row.subarray(0,bounds[0]*3));h.update(row.subarray((bounds[2]+1)*3));}};
 try{
  await readRGB(MD.files.provinces,(y,row)=>{
   outside(outsideBefore,row,y);sample(row,y,0);
   if(y>=bounds[1]&&y<=bounds[3]){const cs=rowSpans(cr,y),ps=rowSpans(pr,y);
    for(let x=bounds[0];x<=bounds[2];x++){const o=x*3,wasMing=match(row,o,ming),wasUnknown=match(row,o,unknown),inside=has(cs,x),inPeriod=has(ps,x);
     if(!wasMing&&!wasUnknown){if(inside)counts.protectedInsideCore++;if(inPeriod)counts.protectedInsidePeriod++;continue;}
     if(wasMing){if(inside)counts.oldMingInsideCore++;else if(inPeriod)counts.oldMingInPeriodOnly++;else counts.oldMingOutsideBoth++;}
     if(inside&&wasUnknown){row.set(ming.rgb,o);counts.toMing++;}else if(!inside&&wasMing){row.set(unknown.rgb,o);counts.toUnassigned++;}
     if(inPeriod&&!inside){assert.ok(match(row,o,unknown));const mo=((y-window[1])*window[2]+x-window[0])*3;assert.ok(mo>=0&&mo+2<mask.length);mask[mo+2]=1;counts.periodPixels++;}
    }
   }
   outside(outsideAfter,row,y);sample(row,y,1);fs.writeSync(fd,row,0,row.length,y*W*3);
  });
  assert.equal(counts.oldMingInsideCore+counts.oldMingInPeriodOnly+counts.oldMingOutsideBoth,490115,'旧明の全画素を範囲内で扱う');assert.ok(counts.periodPixels>0);
  assert.equal(outsideBefore.digest('hex'),outsideAfter.digest('hex'),'変更範囲外は全RGB一致');
  const row=Buffer.alloc(W*3),next=MD.files.provinces+'.liaodong';await writeRGB(next,W,H,y=>{assert.equal(fs.readSync(fd,row,0,row.length,y*W*3),row.length);return row;});fs.renameSync(next,MD.files.provinces);
 }finally{fs.closeSync(fd);fs.rmSync(temporary,{recursive:true,force:true});}
 const maskName='kuandian-1573-1605-mask.png';await writeRGB(path.join(inputs,maskName),window[2],window[3],y=>mask.subarray(y*window[2]*3,(y+1)*window[2]*3));
 const after=Object.fromEntries(Object.entries(MD.files).map(([k,f])=>[k,MD.sha(f)])),sourceSha256=MD.sourceSha256();for(const k of ['definition','defaultMap','projection'])assert.equal(after[k],before[k]);
 const report={tool:'tools/map/bake-liaodong-baseline.cjs',source:'data/research/liaodong-reference/liaodong-1560.geojson',sourceGeojsonSha256:MD.sha(source),sourceSha256Before:EXPECTED,sourceSha256After:sourceSha256,sourceFilesBefore:before,sourceFilesAfter:after,bounds,counts,preview:{sampleStride,width:pw,height:ph,colours:{ming:'#ae4d30',unassigned:'#d1ccbb',castleOrOtherLand:'#728e5b',sea:'#6da1bc'}},historicalAccuracy:core.properties.doNotClaim,periodPrecision:period.properties.certaintyNote};
 const baseApplied={id:'liaodong-1560-reference',layer:'provinces',baseRevision:ledger.baselineCommit,sourceSha256Before:EXPECTED,sourceSha256After:sourceSha256,source:report.source,sourceGeojsonSha256:report.sourceGeojsonSha256,feature:core.id,policy:'正本のunassigned/neutral:明のみ。基幹域外の旧明は未割当に戻す。海・湖・城領を保持。軍政域参考で外交/軍/行軍の所有権には転用しない。',bounds,counts};
 fs.writeFileSync(path.join(edits,'applied/liaodong-1560-reference.json'),JSON.stringify(baseApplied,null,2)+'\n');
 ledger.applied.push({id:baseApplied.id,layer:'provinces',input:['applied/liaodong-1560-reference.json'],sourceSha256,pixels:counts.toMing+counts.toUnassigned});
 ledger.previousBaselines=[...(ledger.previousBaselines||[]),ledger.previousBaseline,{baselineCommit:ledger.baselineCommit,sourceSha256:ledger.sourceSha256}].filter(Boolean);delete ledger.previousBaseline;
 ledger.migrations=[...(ledger.migrations||[]),ledger.migration].filter(Boolean);ledger.migration=report;ledger.baselineCommit=REVISION;ledger.sourceSha256=sourceSha256;ledger.sourceFiles=after;ledger.provincesSha256=after.provinces;
 ledger.note='1560年正本。児島湾補正を保持し、遼東の軍政域参考図を未割当/旧明だけへ適用。1573〜1605寛甸と1584年以後宇喜多堤は年代差分。軍政域参考線を精密国境・実効支配・軍の所属には転用しない。';fs.writeFileSync(path.join(edits,'baseline-ledger.json'),JSON.stringify(ledger,null,2)+'\n');
 const uf=path.join(edits,'kojima-bay-ukita-land-from-1584.json'),ukita=JSON.parse(fs.readFileSync(uf));ukita.baseRevision=REVISION;fs.writeFileSync(uf,JSON.stringify(ukita,null,2)+'\n');
 const e={id:'ming-kuandian-1573-1605-reference',layer:'provinces',baseRevision:REVISION,validFrom:period.properties.interval.fromInclusive,validUntil:period.properties.interval.untilExclusive,payload:{mask:'../../../data/inputs/liaodong-frontier-review/'+maskName,maskSha256:MD.sha(path.join(inputs,maskName)),window,from:'key:unassigned',keys:['neutral:明']},sourceIds:period.properties.sourceIds,basis:'史料図の寛甸外郭と基幹域の差を、正本の未割当陸だけに限定した年精度の軍政域参考。',review:period.properties.certaintyNote,displayPolicy:period.properties.displayPolicy,uncertaintyKm:period.properties.uncertaintyKm};fs.writeFileSync(path.join(edits,e.id+'.json'),JSON.stringify(e,null,2)+'\n');
 const verification=path.join(MD.root,'data/verification/liaodong-source-baseline');fs.mkdirSync(verification,{recursive:true});fs.writeFileSync(path.join(verification,'migration.json'),JSON.stringify(report,null,2)+'\n');
 for(const [i,n] of ['before','after'].entries())await writeRGB(path.join(verification,n+'-regions.png'),pw,ph,y=>previews[i].subarray(y*pw*3,(y+1)*pw*3));console.log(JSON.stringify(report,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
