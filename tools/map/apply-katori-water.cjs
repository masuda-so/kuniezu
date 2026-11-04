/* 局所読図の推定湖面を正本の候補へ適用。入力を直接上書きせず、全域画像は行単位で処理する。
   node tools/map/apply-katori-water.cjs --output /tmp/katori-provinces.png
   生成後に画素差分と原図を検査し、採用する場合だけ正本と台帳を更新する。 */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const MD=require('./map-data.cjs'),PNG=require('./png-big.cjs');
const args=process.argv.slice(2),i=args.indexOf('--output');if(i<0||!args[i+1])throw Error('--output が必要');
const output=path.resolve(args[i+1]);if(fs.existsSync(output)||fs.existsSync(output+'.part'))throw Error('既存出力を上書きしない');
const source=MD.files.provinces,sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const before=sha(source),P=MD.readProjection(),W=P.width,H=P.height;
const shapePath=path.join(MD.root,'data/research/katori-review/uchinasaka/south-connection/wide-lake-perimeter.geojson');
const features=JSON.parse(fs.readFileSync(shapePath)).features,find=id=>features.find(f=>f.properties.id===id);
const water=find('uchinasaka-combined-wide-water'),land=find('protected-southeast-land');
if(!water||!land)throw Error('採用湖面・保護陸の形状が必要');
const grid=([lo,la])=>[((lo-P.LON0)*P.K*P.CX-P.origin[0])/P.stepUnits,((P.LAT0-la)*P.K-P.origin[1])/P.stepUnits];
const rings=f=>f.geometry.coordinates.map(r=>r.map(grid)),wr=rings(water),lr=rings(land);
const inside=(rs,x,y)=>{let on=false;for(const r of rs)for(let i=0,j=r.length-1;i<r.length;j=i++){const [ax,ay]=r[i],[bx,by]=r[j];if((ay>y)!==(by>y)&&x<ax+(bx-ax)*(y-ay)/(by-ay))on=!on;}return on;};
const xs=wr[0].map(p=>p[0]),ys=wr[0].map(p=>p[1]),cells=new Map();let count=0;
for(let y=Math.floor(Math.min(...ys));y<Math.ceil(Math.max(...ys));y++)for(let x=Math.floor(Math.min(...xs));x<Math.ceil(Math.max(...xs));x++){
 if(inside(wr,x+.5,y+.5)&&!inside(lr,x+.5,y+.5)){if(x<0||y<0||x>=W||y>=H)throw Error('地図範囲外');if(!cells.has(y))cells.set(y,[]);cells.get(y).push(x);count++;}}
if(count!==1719)throw Error('候補の格子セル数が変化: '+count);
const defs=MD.readDefinition(),target=defs.byKey.get('lake:140.55,36.05'),counts={};if(target?.kind!=='lake')throw Error('接続先湖区画が必要');
const byColor=new Map(defs.rows.filter(Boolean).map(d=>[d.rgb.join(','),d.key]));
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'kuniezu-katori-paint-')),raw=path.join(temp,'rows.rgb');
(async()=>{let write,read;try{
 write=fs.openSync(raw,'wx');await PNG.readRGB(source,(y,row)=>{for(const x of cells.get(y)||[]){const o=x*3,key=byColor.get(row.subarray(o,o+3).join(','));if(!['castle:odajo','castle:sakura',target.key].includes(key))throw Error('想定外の変更前区画: '+key);counts[key]=(counts[key]||0)+1;for(let k=0;k<3;k++)row[o+k]=target.rgb[k];}fs.writeSync(write,row);});
 fs.closeSync(write);write=null;
 if(counts['castle:odajo']!==1604||counts['castle:sakura']!==33||counts[target.key]!==82)throw Error('変更前の画素数が照合結果と不一致: '+JSON.stringify(counts));
 if(sha(source)!==before)throw Error('生成中に正本が変更された');
 read=fs.openSync(raw,'r');const row=Buffer.alloc(W*3);const made=path.join(temp,'candidate.png');await PNG.writeRGB(made,W,H,y=>{if(fs.readSync(read,row,0,row.length,y*row.length)!==row.length)throw Error('行読込不足');return row;});
 if(sha(source)!==before)throw Error('公開前に正本が変更された');fs.linkSync(made,output);
 console.log(JSON.stringify({sourceSha256:before,outputSha256:sha(output),shapeSha256:sha(shapePath),projectionSha256:sha(MD.files.projection),waterCells:count,changedCells:1637,preservedExistingWater:82,counts,exactHistoricalShoreline:false}));
 }finally{if(write!=null)fs.closeSync(write);if(read!=null)fs.closeSync(read);fs.rmSync(temp,{recursive:true,force:true});}})().catch(e=>{console.error(e);process.exitCode=1;});
