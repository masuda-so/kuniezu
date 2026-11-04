/* 正本 game/map/control/provinces.png（全域1枚）から、Web 配信用のタイル game/map/build/provinces{,-4,-8}/ と game/map/build/manifest.json を作る。
   タイルは 1024 画素四方の可逆 PNG。海だけのタイルは出さない。400m・800m は f 画素ごとの中心の画素を採る（最近傍。区画の色を混ぜない）。
   タイルは正本から決まる生成物で、手で直さない。区画ごとの画素数は data/audits/raster-province-pixels.json に書く。
   実行：node --max-old-space-size=4000 tools/map/build-map-tiles.cjs   （--check：書かずに、今あるタイルと manifest が正本どおりか確かめる） */
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const MD=require('./map-data.cjs'),{readRGB}=require('./png-big.cjs');
const out=MD.out,CHECK=process.argv.includes('--check');
const TILE=1024,LEVELS=[1,4,8];
const crcT=new Int32Array(256).map((_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c;});
const crc=b=>{let c=-1;for(const x of b)c=crcT[(c^x)&255]^(c>>>8);return (c^-1)>>>0;};
const chunk=(t,d)=>{const l=Buffer.alloc(4);l.writeUInt32BE(d.length);const td=Buffer.concat([Buffer.from(t),d]),c=Buffer.alloc(4);c.writeUInt32BE(crc(td));return Buffer.concat([l,td,c]);};
const png=(w,h,rgb)=>{const raw=Buffer.alloc((w*3+1)*h);for(let y=0;y<h;y++)rgb.copy(raw,y*(w*3+1)+1,y*w*3,(y+1)*w*3);const ih=Buffer.alloc(13);ih.writeUInt32BE(w,0);ih.writeUInt32BE(h,4);ih[8]=8;ih[9]=2;return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ih),chunk('IDAT',zlib.deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 const proj=MD.readProjection(),def=MD.readDefinition(),W=proj.width,H=proj.height,sea=def.byKey.get('sea').rgb;
 const counts=new Map();const lv=LEVELS.map(f=>({f,dir:f===1?'provinces':'provinces-'+f,w:Math.ceil(W/f),h:Math.ceil(H/f),band:null,bandRow:-1,tiles:[],files:new Set()}));
 const emit=L=>{if(!L.band)return;const ty=L.bandRow,r0=ty*TILE,bh=Math.min(TILE,L.h-r0);
  for(let tx=0;tx*TILE<L.w;tx++){const c0=tx*TILE,bw=Math.min(TILE,L.w-c0),rgb=Buffer.alloc(bw*bh*3);let any=false;
   for(let y=0;y<bh;y++){L.band.copy(rgb,y*bw*3,(y*L.w+c0)*3,(y*L.w+c0+bw)*3);}
   for(let i=0;i<bw*bh&&!any;i++)if(rgb[i*3]!==sea[0]||rgb[i*3+1]!==sea[1]||rgb[i*3+2]!==sea[2])any=true;
   if(!any)continue;const file=`${tx}-${ty}.png`,buf=png(bw,bh,rgb),p=path.join(CHECK?out:stage,L.dir,file);L.files.add(file);
   if(CHECK){if(!fs.existsSync(p)||sha(fs.readFileSync(p))!==sha(buf))throw Error('タイルが正本と違う: '+L.dir+'/'+file);}else fs.writeFileSync(p,buf);
   L.tiles.push({file,col:tx,row:ty,width:bw,height:bh,sha256:sha(buf)});}};
 // 書き出しは一時置き場へ。正本の検査（大きさ・未知の色）が通ってから配信中のタイルと入れ替える（壊れた正本で配信物を失わない）。
 const stage=path.join(out,'.provinces-staging');if(!CHECK){fs.rmSync(stage,{recursive:true,force:true});for(const L of lv)fs.mkdirSync(path.join(stage,L.dir),{recursive:true});}
 const info=await readRGB(MD.files.provinces,(y,row)=>{
  for(let x=0;x<W;x++){const c=row[x*3]+','+row[x*3+1]+','+row[x*3+2];counts.set(c,(counts.get(c)||0)+1);}
  for(const L of lv){if(L.f>1&&y!==Math.min(H-1,Math.floor(y/L.f)*L.f+(L.f>>1)))continue;const ly=Math.floor(y/L.f),ty=Math.floor(ly/TILE);
   if(ty!==L.bandRow){emit(L);L.bandRow=ty;L.band=Buffer.alloc(L.w*Math.min(TILE,L.h-ty*TILE)*3);}
   const o=(ly%TILE)*L.w*3;if(L.f===1)row.copy(L.band,o);else for(let x=0;x<L.w;x++){const sx=Math.min(W-1,x*L.f+(L.f>>1));L.band[o+x*3]=row[sx*3];L.band[o+x*3+1]=row[sx*3+1];L.band[o+x*3+2]=row[sx*3+2];}}});
 for(const L of lv)emit(L);
 if(info.width!==W||info.height!==H)throw Error('provinces.png の大きさが projection.json と違う');
 for(const c of counts.keys())if(!def.byRGB.has(c))throw Error('definition.csv にない色 '+c);
 const {note,width,height,...projection}=proj;
 const manifest={generated:'tools/map/build-map-tiles.cjs',basis:'正本 game/map/control/provinces.png（全域1枚）から作った Web 配信用のタイル。手で直さない。',
  source:{dir:'game/map',provinces:'provinces.png',definition:'definition.csv',defaultMap:'default.map',projection:'projection.json',sha256:MD.sourceSha256()},
  projection,width:W,height:H,tile:TILE,tiles:lv[0].tiles,levels:lv.slice(1).map(L=>({factor:L.f,dir:L.dir,width:L.w,height:L.h,tiles:L.tiles}))};
 const mf=path.join(out,'manifest.json'),text=JSON.stringify(manifest,null,1);
 if(CHECK){if(fs.readFileSync(mf,'utf8')!==text)throw Error('manifest.json が正本と違う');for(const L of lv){const extra=fs.readdirSync(path.join(out,L.dir)).filter(f=>!L.files.has(f));if(extra.length)throw Error('正本に無いタイル: '+L.dir+'/'+extra[0]);}console.log('PASS: 配信タイルは正本どおり');}
 else{for(const L of lv){const old=path.join(out,L.dir+'.old');fs.rmSync(old,{recursive:true,force:true});if(fs.existsSync(path.join(out,L.dir)))fs.renameSync(path.join(out,L.dir),old);fs.renameSync(path.join(stage,L.dir),path.join(out,L.dir));fs.rmSync(old,{recursive:true,force:true});}
  fs.rmSync(stage,{recursive:true,force:true});fs.writeFileSync(mf,text);
  const px=def.rows.filter(Boolean).map(r=>({id:r.id,key:r.key,kind:r.kind,pixels:counts.get(r.rgb.join(','))||0}));
  fs.writeFileSync(path.join(MD.root,'data/audits/raster-province-pixels.json'),JSON.stringify({generated:'tools/map/build-map-tiles.cjs',source:manifest.source.sha256,provinces:px},null,1)+'\n');
  console.log(JSON.stringify({tiles:lv.map(L=>[L.dir,L.tiles.length])}));}
})().catch(e=>{fs.rmSync(path.join(out,'.provinces-staging'),{recursive:true,force:true});console.error(e.message);process.exit(1);});
