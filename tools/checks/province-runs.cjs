const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const MD=require('../map/map-data.cjs'),PNG=require('../map/png-big.cjs'),decode=require('../geo/png-decode.cjs'),{apply}=require('../map/apply-province-runs.cjs');
(async()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'kuniezu-runs-check-'));try{
 const md=MD.at(dir),p={K:1,CX:1,LON0:0,LAT0:4,origin:[0,0],stepUnits:1,width:4,height:4};
 md.writeDefinition([{id:1,rgb:[1,2,3],key:'sea',kind:'sea'},{id:2,rgb:[20,30,40],key:'castle:test',kind:'land'},{id:3,rgb:[9,10,11],key:'lake:test',kind:'lake'}]);
 fs.writeFileSync(md.files.projection,JSON.stringify(p));
 await PNG.writeRGB(md.files.provinces,4,4,y=>{const b=Buffer.from(Array(4).fill([20,30,40]).flat());if(y===0)b.set([1,2,3],0);if(y===1)b.set([9,10,11],3);return b;});
 const before=fs.readFileSync(md.files.provinces),input=path.join(dir,'input.json');
 const recipe={schema:'province-pixel-reconstruction-v1',projection:p,operations:[{fromKey:'castle:test',toKey:'lake:test',expectedPixels:2,runs:[[0,1,3]]},{fromKey:'lake:test',toKey:'castle:test',expectedPixels:1,runs:[[1,1,2]]}]};
 const put=r=>fs.writeFileSync(input,JSON.stringify(r)),clone=()=>JSON.parse(JSON.stringify(recipe));put(recipe);
 const output=path.join(dir,'good.png'),result=await apply({md,input,output});assert.equal(result.changedPixels,3);
 const good=decode(fs.readFileSync(output));const color=(x,y)=>Array.from(good.data.subarray((y*4+x)*4,(y*4+x)*4+3));assert.deepEqual(color(0,0),[1,2,3]);assert.deepEqual(color(1,0),[9,10,11]);assert.deepEqual(color(2,0),[9,10,11]);assert.deepEqual(color(1,1),[20,30,40]);assert.deepEqual(color(3,3),[20,30,40]);
 await assert.rejects(()=>apply({md,input,output}),/既存出力/);
 const changes=[r=>r.projection.width=5,r=>r.operations[0].runs.push([0,2,3]),r=>r.operations[0].runs=[[0,0,2]],r=>r.operations[0].runs=[[4,1,3]],r=>r.operations[0].expectedPixels=3];
 for(let i=0;i<changes.length;i++){const r=clone();changes[i](r);if(i===1)r.operations[0].expectedPixels=3;put(r);const output=path.join(dir,'bad-'+i+'.png');await assert.rejects(()=>apply({md,input,output}));assert(!fs.existsSync(output));assert.deepEqual(fs.readFileSync(md.files.provinces),before);}
 put(recipe);const race=path.join(dir,'race.png'),pending=apply({md,input,output:race});fs.writeFileSync(race,'concurrent file');await assert.rejects(()=>pending);assert.equal(fs.readFileSync(race,'utf8'),'concurrent file');
 assert(!fs.readdirSync(dir).some(n=>n.startsWith('.kuniezu-province-edit-')));
 console.log('PASS: exact local edits and protected sea; projection, overlap, source colour, bounds, counts, existing output and concurrent publication guards; cleanup');
}finally{fs.rmSync(dir,{recursive:true,force:true});}})().catch(e=>{console.error(e);process.exitCode=1;});
