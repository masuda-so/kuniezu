/* 児島湾正本移行の受入検査。前後の配信タイルを全域・全段で比較し、正本PNGから直接採った局所画素を4近傍で検査する。
 * node tools/checks/kojima-source-baseline.cjs --before-root /path/to/pre-migration --output /tmp/result.json
 * 共有正本を変更しない。旧再生成・重複焼込みの拒否も、正本4入力SHA不変で確認する。
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const MD=require('../map/map-data.cjs'),{readRGB}=require('../map/png-big.cjs'),decode=require('../geo/png-decode.cjs');
const args=process.argv.slice(2),arg=k=>args[args.indexOf(k)+1];
assert.ok(args.includes('--before-root'),'--before-root is required');
const beforeRoot=path.resolve(arg('--before-root')),afterRoot=MD.root;
const read=f=>JSON.parse(fs.readFileSync(f)),date=d=>d[0]*10000+d[1]*100+d[2];
function effective(root,ymd){
 const dir=path.join(root,'game/map'),m=read(path.join(dir,'manifest.json')),v=read(path.join(dir,'versions.json'));
 assert.equal(v.baseProvincesSha256,m.source.sha256);const active=v.versions.filter(r=>date(r.period[0])<=ymd&&ymd<date(r.period[1]));assert.ok(active.length<=1);
 const tiles=new Map();for(const L of [{factor:1,dir:'provinces',tiles:m.tiles},...m.levels])for(const t of L.tiles)tiles.set([L.factor,t.col,t.row].join('/'),{...t,factor:L.factor,file:path.join(dir,L.dir,t.file)});
 for(const t of active[0]?.tiles||[])tiles.set([t.factor,t.col,t.row].join('/'),{...tiles.get([t.factor,t.col,t.row].join('/')),...t,file:path.join(dir,t.file)});
 return {manifest:m,version:active[0]?.id||null,tiles};
}
function compare(ymd){
 const a=effective(beforeRoot,ymd),b=effective(afterRoot,ymd);assert.deepEqual([...a.tiles.keys()].sort(),[...b.tiles.keys()].sort());let bytesEqual=0,decodedEqual=0,pixels=0;const levels={};
 for(const [k,x] of a.tiles){const y=b.tiles.get(k),ab=fs.readFileSync(x.file),bb=fs.readFileSync(y.file);assert.equal(MD.sha(x.file),x.sha256);assert.equal(MD.sha(y.file),y.sha256);assert.equal(x.width,y.width);assert.equal(x.height,y.height);
  if(ab.equals(bb))bytesEqual++;else{const ap=decode(ab),bp=decode(bb);assert.deepEqual(ap,bp,'different rendered pixels: '+k);decodedEqual++;}
  const n=x.width*x.height;pixels+=n;levels[x.factor]=(levels[x.factor]||0)+n;
 }
 const allPixels=[a.manifest,...a.manifest.levels].reduce((n,L)=>n+L.width*L.height,0);
 return {date:ymd,oldVersion:a.version,newVersion:b.version,tiles:a.tiles.size,bytesEqual,decodedEqual,publishedPixels:pixels,implicitSeaPixels:allPixels-pixels,allPixels,levels};
}
function compareEdges(ymd){
 function current(root){const dir=path.join(root,'game/map'),e=read(path.join(dir,'edges.json')),tiles=new Map();assert.equal(e.gridSha256,MD.sha(path.join(dir,'manifest.json')));
  for(const L of e.levels)for(const t of L.tiles)tiles.set([L.factor,t.col,t.row].join('/'),{...t,file:path.join(dir,L.dir,t.file)});
  for(const t of e.versions.filter(v=>date(v.period[0])<=ymd&&ymd<date(v.period[1])))tiles.set([t.factor,t.col,t.row].join('/'),{...t,file:path.join(dir,'edges-'+t.factor,t.file)});
  return tiles;
 }
 const a=current(beforeRoot),b=current(afterRoot),keys=new Set([...a.keys(),...b.keys()]);
 const payload=t=>{if(!t)return [];assert.equal(MD.sha(t.file),t.sha256);return read(t.file);};
 for(const k of keys)assert.deepEqual(payload(a.get(k)),payload(b.get(k)),'edge geometry '+ymd+' '+k);
 return {date:ymd,tilePositions:keys.size,geometryMatches:true};
}
async function sourceCoast(){
 const P=MD.readProjection(),defs=MD.readDefinition(),cell=(lon,lat)=>[Math.floor(((lon-P.LON0)*P.K*P.CX-P.origin[0])/P.stepUnits),Math.floor(((P.LAT0-lat)*P.K-P.origin[1])/P.stepUnits)];
 const [left,top]=cell(133.59,34.69),[right,bottom]=cell(134.09,34.35),w=right-left+1,h=bottom-top+1,rgb=Buffer.alloc(w*h*3);
 const baseline=MD.sourceSha256();await readRGB(MD.files.provinces,(y,row)=>{if(y>=top&&y<=bottom)row.copy(rgb,(y-top)*w*3,left*3,(right+1)*3);});assert.equal(MD.sourceSha256(),baseline);
 const key=(x,y)=>{assert.ok(x>=left&&x<=right&&y>=top&&y<=bottom);const o=((y-top)*w+x-left)*3;return defs.byRGB.get(rgb[o]+','+rgb[o+1]+','+rgb[o+2]);};
 const sea=(x,y)=>key(x,y).kind==='sea',land=(x,y)=>key(x,y).kind==='land';
 function reaches(start,end,allowed){if(!allowed(...start))return false;const seen=new Set([start.join(',')]),q=[start];for(let at=0;at<q.length;at++){const [x,y]=q[at];if(x===end[0]&&y===end[1])return true;for(const p of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]){const k=p.join(',');if(!seen.has(k)&&allowed(...p)){seen.add(k);q.push(p);}}}return false;}
 const [l,t]=cell(133.675,34.625),[r,b]=cell(133.925,34.530),[gate,gt]=cell(133.811,34.562),[,gb]=cell(133.811,34.556);
 const west=cell(133.6858034,34.5730514),east=cell(133.9000368,34.5722033),mainland=cell(133.771,34.645),kojima=cell(133.835,34.488);
 const water=(x,y)=>x>=l&&x<=r&&y>=t&&y<=b&&(x!==gate||y>=gt&&y<=gb)&&sea(x,y);
 const localLand=(x,y)=>x>=left&&x<=right&&y>=top&&y<=bottom&&land(x,y);
 const results={westEndpointIsSea:sea(...west),eastEndpointIsSea:sea(...east),fujitoPassageConnected:reaches(west,east,water),mainlandControlIsLand:land(...mainland),kojimaControlIsLand:land(...kojima),kojimaConnectedToMainland:reaches(kojima,mainland,localLand)};
 const controls=[['経ヶ島',133.8108903,34.5610021,'land'],['藤戸寺',133.8095872,34.5601554,'land'],['塩生',133.771388,34.476388,'land'],['浮洲岩跡',133.8052177,34.5598924,'land'],['水島',133.718,34.517,'sea'],['早島の丘',133.81842,34.599915,'land'],['北岸確認点',133.9,34.64,'land']].map(([name,lon,lat,expected])=>{const pixel=cell(lon,lat),d=key(...pixel);assert.equal(d.kind,expected,name);return {name,point:[lon,lat],pixel,key:d.key,kind:d.kind};});
 for(const [k,v] of Object.entries(results))assert.equal(v,k!=='kojimaConnectedToMainland',k);
 const ledger=read(path.join(MD.root,'game/map/edits/baseline-ledger.json'));for(const c of ledger.controlPixels)assert.equal(key(...c.pixel).key,c.key,'ledger control');
 return {source:'game/map_data/provinces.png',sourceSha256:baseline,window:[left,top,w,h],results,controls};
}
async function main(){
 const ledger=read(path.join(MD.root,'game/map/edits/baseline-ledger.json')),versions=read(path.join(MD.root,'game/map/versions.json'));
 assert.equal(ledger.sourceSha256,MD.sourceSha256());assert.deepEqual(versions.versions.map(v=>v.id),['15840101-16160101']);assert.deepEqual(versions.staleVersions,[]);
 const version=read(path.join(MD.root,'game/map/edits/compiled/15840101-16160101/manifest.json'));assert.deepEqual(version.editPixels,{'kojima-bay-ukita-land-from-1584':366});
 const dir=path.join(MD.root,'game/map/edits');assert.deepEqual(fs.readdirSync(dir).filter(f=>f.endsWith('.json')).sort(),['baseline-ledger.json','kojima-bay-ukita-land-from-1584.json']);
 for(const a of ledger.applied.filter(a=>a.sourceSha256===ledger.sourceSha256)){const f=path.join(dir,a.input[0]),e=read(f);for(const k of ['mask','file'])if(e.payload[k]){const file=path.resolve(path.dirname(f),e.payload[k]);assert.ok(fs.existsSync(file),e.id+' '+file);if(k==='mask')assert.equal(MD.sha(file),e.payload.maskSha256);}}
 const tiles=[compare(15600101),compare(16000101)],edges=[compareEdges(15600101),compareEdges(16000101)],source=await sourceCoast(),guards=[];
 for(const script of ['tools/map/build-provinces.cjs','tools/geo/kojima-bay-1600.cjs','tools/map/bake-kojima-baseline.cjs']){const sha=MD.sourceSha256(),p=spawnSync(process.execPath,[script],{cwd:MD.root,encoding:'utf8'});assert.notEqual(p.status,0);assert.match(p.stderr,/既存の provinces.png|移行記録用|既に適用済み/);assert.equal(MD.sourceSha256(),sha);guards.push({script,status:p.status,sourceUnchanged:true});}
 const result={ok:true,beforeRoot,sourceSha256:MD.sourceSha256(),tiles,edges,source,guards};if(args.includes('--output'))fs.writeFileSync(arg('--output'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
