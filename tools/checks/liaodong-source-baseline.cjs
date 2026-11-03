/* 遼東正本の受入：変更前後の全RGB、保護対象、範囲外、児島湾の各年代タイルを検査。
 * node tools/checks/liaodong-source-baseline.cjs --before-root /path/to/kojima-baseline --output /tmp/result.json
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const MD=require('../map/map-data.cjs'),{decodePngRows}=require('./province-source-image.cjs');
const args=process.argv.slice(2),value=k=>args[args.indexOf(k)+1];assert.ok(args.includes('--before-root'));const previous=path.resolve(value('--before-root')),read=f=>JSON.parse(fs.readFileSync(f));
const report=read(path.join(MD.root,'data/verification/liaodong-source-baseline/migration.json'));
const date=d=>d[0]*10000+d[1]*100+d[2];
function effective(root,ymd){const dir=path.join(root,'game/map'),m=read(path.join(dir,'manifest.json')),v=read(path.join(dir,'versions.json'));assert.equal(v.baseProvincesSha256,m.source.sha256);const active=v.versions.filter(v=>date(v.period[0])<=ymd&&ymd<date(v.period[1]));assert.ok(active.length<=1);const map=new Map();for(const L of [{factor:1,dir:'provinces',tiles:m.tiles},...m.levels])for(const t of L.tiles)map.set([L.factor,t.col,t.row].join('/'),{...t,file:path.join(dir,L.dir,t.file)});for(const t of active[0]?.tiles||[])map.set([t.factor,t.col,t.row].join('/'),{...t,file:path.join(dir,t.file)});return {version:active[0]?.id||null,map};}
async function main(){
 const old=MD.at(path.join(previous,'game/map_data')),P=MD.readProjection(),def=MD.readDefinition();assert.equal(old.sourceSha256(),report.sourceSha256Before);assert.equal(MD.sourceSha256(),report.sourceSha256After);
 for(const key of ['definition','projection','defaultMap'])assert.equal(MD.sha(MD.files[key]),MD.sha(old.files[key]));
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'liaodong-check-')),fd=fs.openSync(path.join(temp,'previous.rgb'),'w+'),counts={changed:0,toMing:0,toUnassigned:0,outsideChanged:0,protectedChanged:0};
 const controls=read(path.join(MD.root,'data/research/liaodong-reference/registration.json')).controlPoints.map(p=>{const [lon,lat]=p.approxWgs84LonLat;return {name:p.name,point:p.approxWgs84LonLat,pixel:[Math.floor(((lon-P.LON0)*P.K*P.CX-P.origin[0])/P.stepUnits),Math.floor(((P.LAT0-lat)*P.K-P.origin[1])/P.stepUnits)]};});
 const region=(row,x)=>{const i=x*3;return def.byRGB.get(row[i]+','+row[i+1]+','+row[i+2]);};
 try{
  await decodePngRows(old.files.provinces,{onRow:async(row,y)=>{fs.writeSync(fd,row,0,row.length,y*P.width*3);}});
  const previousRow=Buffer.alloc(P.width*3);await decodePngRows(MD.files.provinces,{onRow:async(row,y)=>{
   assert.equal(fs.readSync(fd,previousRow,0,previousRow.length,y*P.width*3),previousRow.length);
   for(const c of controls)if(y===c.pixel[1]){c.before=region(previousRow,c.pixel[0]).key;c.after=region(row,c.pixel[0]).key;}
   if(row.equals(previousRow))return;
   for(let x=0;x<P.width;x++){const o=x*3;if(row[o]===previousRow[o]&&row[o+1]===previousRow[o+1]&&row[o+2]===previousRow[o+2])continue;counts.changed++;
    const [l,t,r,b]=report.bounds;if(x<l||x>r||y<t||y>b)counts.outsideChanged++;
    const a=region(previousRow,x),n=region(row,x);if(!['neutral:明','unassigned'].includes(a.key)||!['neutral:明','unassigned'].includes(n.key))counts.protectedChanged++;
    if(n.key==='neutral:明')counts.toMing++;else if(n.key==='unassigned')counts.toUnassigned++;
   }
  }});
 }finally{fs.closeSync(fd);fs.rmSync(temp,{recursive:true,force:true});}
 assert.equal(counts.outsideChanged,0);assert.equal(counts.protectedChanged,0);assert.equal(counts.toMing,report.counts.toMing);assert.equal(counts.toUnassigned,report.counts.toUnassigned);assert.equal(counts.changed,counts.toMing+counts.toUnassigned);
 for(const c of controls)assert.equal(c.after,c.name==='義州'?'castle:uiju':'neutral:明',c.name);
 const v=read(path.join(MD.root,'game/map/versions.json'));assert.deepEqual(v.versions.map(v=>v.id),['15730101-15840101','15840101-16060101','16060101-16160101']);assert.deepEqual(v.staleVersions,[]);
 const tides=[];for(const year of [1560,1573,1583,1584,1600,1606,1615]){const a=effective(previous,year*10000+101),b=effective(MD.root,year*10000+101);for(const key of ['1/9/12','1/10/12','4/2/3','8/1/1']){const x=a.map.get(key),y=b.map.get(key);assert.ok(x&&y);assert.equal(MD.sha(x.file),x.sha256);assert.equal(MD.sha(y.file),y.sha256);assert.equal(x.sha256,y.sha256,'Kojima '+year+' '+key);}tides.push({year,oldVersion:a.version,newVersion:b.version,kojimaTilesIdentical:4});}
 for(const vv of v.versions){const m=read(path.join(MD.root,'game/map/edits/compiled',vv.id,'manifest.json'));assert.equal(m.baseProvincesSha256,MD.sourceSha256());if(vv.period[0][0]<1606)assert.equal(m.editPixels['ming-kuandian-1573-1605-reference'],report.counts.periodPixels);if(vv.period[0][0]>=1584)assert.equal(m.editPixels['kojima-bay-ukita-land-from-1584'],366);}
 const uf='game/map/edits/kojima-bay-ukita-land-from-1584.json';assert.deepEqual(read(path.join(previous,uf)).payload,read(path.join(MD.root,uf)).payload);
 const before=MD.sourceSha256(),guard=spawnSync(process.execPath,['tools/map/bake-liaodong-baseline.cjs'],{cwd:MD.root,encoding:'utf8'});assert.notEqual(guard.status,0);assert.match(guard.stderr,/重複適用不可/);assert.equal(MD.sourceSha256(),before);
 const result={ok:true,sourceSha256:before,comparedPixels:P.width*P.height,counts,controls,periodReferencePixels:report.counts.periodPixels,tides,reapplyGuard:{status:guard.status,sourceUnchanged:true}};if(args.includes('--output'))fs.writeFileSync(value('--output'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
