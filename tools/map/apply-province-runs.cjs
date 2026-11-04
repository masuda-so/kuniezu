/* 局所の画素差分を全域正本の候補へ適用。元色・投影・重複を検査し、画像は行単位で処理する。 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const MD=require('./map-data.cjs'),PNG=require('./png-big.cjs');
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
async function apply({md=MD,input,output}){
 output=path.resolve(output);if(fs.existsSync(output))throw Error('既存出力は上書きしない');
 const inputHash=sha(input),bundleBefore=md.sourceSha256();
 const recipe=JSON.parse(fs.readFileSync(input));if(recipe.schema!=='province-pixel-reconstruction-v1'||!Array.isArray(recipe.operations)||!recipe.operations.length)throw Error('画素差分の形式が不正');
 const p=md.readProjection(),W=p.width,H=p.height;
 for(const key of ['K','CX','LON0','LAT0','origin','stepUnits','width','height'])assert.deepEqual(recipe.projection?.[key],p[key],'投影が不一致: '+key);
 const defs=md.readDefinition(),rows=new Map(),counts=[];
 for(const op of recipe.operations){
  const from=defs.byKey.get(op.fromKey),to=defs.byKey.get(op.toKey);if(!from||!to||from.key===to.key||!Number.isInteger(op.expectedPixels)||op.expectedPixels<=0||!Array.isArray(op.runs))throw Error('変更前後の区画・期待画素数が不正');
  let n=0;for(const run of op.runs){if(!Array.isArray(run)||run.length!==3||!run.every(Number.isInteger))throw Error('行差分の形式が不正');const [y,a,b]=run;if(y<0||y>=H||a<0||a>=b||b>W)throw Error('行差分が画像範囲外');if(!rows.has(y))rows.set(y,[]);rows.get(y).push({a,b,from,to});n+=b-a;}
  if(n!==op.expectedPixels)throw Error('期待画素数が不一致');counts.push({fromKey:from.key,toKey:to.key,pixels:n});
 }
 for(const runs of rows.values()){runs.sort((a,b)=>a.a-b.a);for(let i=1;i<runs.length;i++)if(runs[i-1].b>runs[i].a)throw Error('画素差分が重複');}
 const before=sha(md.files.provinces),temp=fs.mkdtempSync(path.join(path.dirname(output),'.kuniezu-province-edit-')),raw=path.join(temp,'rows.rgb');let fd,rd;
 try{
  let failure=null;fd=fs.openSync(raw,'wx');const size=await PNG.readRGB(md.files.provinces,(y,row)=>{if(failure)return;try{if(row.length!==W*3)throw Error('元画像と投影の幅が不一致');for(const run of rows.get(y)||[])for(let x=run.a;x<run.b;x++){const o=x*3;for(let k=0;k<3;k++)if(row[o+k]!==run.from.rgb[k])throw Error(`変更前の色が不一致: ${x},${y}`);for(let k=0;k<3;k++)row[o+k]=run.to.rgb[k];}fs.writeSync(fd,row);}catch(e){failure=e;}});if(failure)throw failure;
  fs.closeSync(fd);fd=null;if(size.width!==W||size.height!==H)throw Error('元画像と投影の大きさが不一致');
  rd=fs.openSync(raw,'r');const row=Buffer.alloc(W*3),made=path.join(temp,'candidate.png');
  await PNG.writeRGB(made,W,H,y=>{if(fs.readSync(rd,row,0,row.length,y*row.length)!==row.length)throw Error('画像の行が不足');return row;});
  if(sha(md.files.provinces)!==before||md.sourceSha256()!==bundleBefore)throw Error('生成中に正本が変更された');
  if(sha(input)!==inputHash)throw Error('生成中に差分入力が変更された');
  fs.linkSync(made,output);
  return {sourceSha256:before,outputSha256:sha(output),inputSha256:inputHash,sourceBundleSha256:bundleBefore,changedPixels:counts.reduce((n,r)=>n+r.pixels,0),counts};
 }finally{if(fd!=null)fs.closeSync(fd);if(rd!=null)fs.closeSync(rd);fs.rmSync(temp,{recursive:true,force:true});}
}
module.exports={apply};
if(require.main===module){const {values}=require('node:util').parseArgs({options:{input:{type:'string'},output:{type:'string'},'map-data':{type:'string'}}});if(!values.input||!values.output)throw Error('--input と --output が必要');apply({md:values['map-data']?MD.at(path.resolve(values['map-data'])):MD,input:values.input,output:values.output}).then(r=>console.log(JSON.stringify(r))).catch(e=>{console.error(e.message);process.exitCode=1;});}
