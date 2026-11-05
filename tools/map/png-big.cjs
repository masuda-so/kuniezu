/* 全域1枚の大きな PNG（provinces.png・gun.png など、20,782×24,288 画素）を、全体を一度に持たずに行ごとに読み書きする。依存なし。
   書き：writeRGB(ファイル, 幅, 高さ, y => 幅×3 バイトの Buffer) … フィルタ0、zlib を流しながら IDAT を 1MiB ずつ書く。
   読み：readRGB(ファイル, (y, 行の RGB Buffer) => void) … 8bit の RGB/RGBA、非インターレース。フィルタ0〜4に対応。 */
const fs=require('node:fs'),zlib=require('node:zlib');
const crcT=new Int32Array(256).map((_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c;});
const crc=(b,c=-1)=>{for(let i=0;i<b.length;i++)c=crcT[(c^b[i])&255]^(c>>>8);return c;};
const chunk=(t,d)=>{const l=Buffer.alloc(4);l.writeUInt32BE(d.length);const tb=Buffer.from(t),c=Buffer.alloc(4);c.writeUInt32BE((crc(d,crc(tb))^-1)>>>0);return Buffer.concat([l,tb,d,c]);};

async function writeRGB(file,W,H,rowAt,level=9){
 const fd=fs.openSync(file+'.part','w');const ih=Buffer.alloc(13);ih.writeUInt32BE(W,0);ih.writeUInt32BE(H,4);ih[8]=8;ih[9]=2;
 fs.writeSync(fd,Buffer.from([137,80,78,71,13,10,26,10]));fs.writeSync(fd,chunk('IHDR',ih));
 const def=zlib.createDeflate({level,memLevel:9});let pend=[],size=0;
 const flush=()=>{if(!size)return;fs.writeSync(fd,chunk('IDAT',Buffer.concat(pend,size)));pend=[];size=0;};
 def.on('data',d=>{pend.push(d);size+=d.length;if(size>=1<<20)flush();});
 const done=new Promise((ok,ng)=>{def.on('end',ok);def.on('error',ng);});
 const line=Buffer.alloc(W*3+1);
 for(let y=0;y<H;y++){const row=rowAt(y);if(row.length!==W*3)throw Error('行の長さが違う '+y);line[0]=0;row.copy(line,1);
  if(!def.write(Buffer.from(line)))await new Promise(r=>def.once('drain',r));}
 def.end();await done;flush();fs.writeSync(fd,chunk('IEND',Buffer.alloc(0)));fs.closeSync(fd);fs.renameSync(file+'.part',file);}

async function readRGB(file,onRow){
 const fd=fs.openSync(file,'r'),head=Buffer.alloc(8);fs.readSync(fd,head,0,8,0);if(head.readUInt32BE(0)!==0x89504e47)throw Error('PNG ではない: '+file);
 let pos=8,W=0,H=0,bpp=3;const inf=zlib.createInflate();let stride=0,buf=Buffer.alloc(0),y=0,prev=null;
 const rows=new Promise((ok,ng)=>{inf.on('data',d=>{buf=buf.length?Buffer.concat([buf,d]):d;
  while(buf.length>=stride+1&&y<H){const f=buf[0],cur=Buffer.from(buf.subarray(1,stride+1));buf=buf.subarray(stride+1);
   for(let x=0;x<stride;x++){const a=x>=bpp?cur[x-bpp]:0,b=prev?prev[x]:0,c=x>=bpp&&prev?prev[x-bpp]:0;let v=cur[x];
    if(f===1)v+=a;else if(f===2)v+=b;else if(f===3)v+=(a+b)>>1;else if(f===4){const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);v+=pa<=pb&&pa<=pc?a:pb<=pc?b:c;}cur[x]=v;}
   prev=cur;let rgb=cur;if(bpp===4){rgb=Buffer.alloc(W*3);for(let x=0;x<W;x++){rgb[x*3]=cur[x*4];rgb[x*3+1]=cur[x*4+1];rgb[x*3+2]=cur[x*4+2];}}onRow(y++,rgb);}});
  inf.on('end',ok);inf.on('error',ng);});
 const hdr=Buffer.alloc(8);
 for(;;){fs.readSync(fd,hdr,0,8,pos);const len=hdr.readUInt32BE(0),type=hdr.toString('ascii',4,8);
  if(type==='IHDR'){const d=Buffer.alloc(13);fs.readSync(fd,d,0,13,pos+8);W=d.readUInt32BE(0);H=d.readUInt32BE(4);if(d[8]!==8||![2,6].includes(d[9])||d[12])throw Error('8bit の RGB/RGBA 非インターレースのみ');bpp=d[9]===6?4:3;stride=W*bpp;}
  else if(type==='IDAT'){const d=Buffer.alloc(len);fs.readSync(fd,d,0,len,pos+8);if(!inf.write(d))await new Promise(r=>inf.once('drain',r));}
  else if(type==='IEND')break;pos+=12+len;}
 inf.end();await rows;fs.closeSync(fd);if(y!==H)throw Error(`行が足りない ${y}/${H}`);return {width:W,height:H};}

// 16bit 灰色（標高の正本 heightmap.png）を行ごとに読む。onRow(y, Uint16Array) … 非インターレース、フィルタ0〜4。
async function readGray16(file,onRow){
 const fd=fs.openSync(file,'r');let pos=8,W=0,H=0,stride=0,buf=Buffer.alloc(0),y=0,prev=null;const bpp=2,inf=zlib.createInflate();
 const rows=new Promise((ok,ng)=>{inf.on('data',d=>{buf=buf.length?Buffer.concat([buf,d]):d;
  while(buf.length>=stride+1&&y<H){const f=buf[0],cur=Buffer.from(buf.subarray(1,stride+1));buf=buf.subarray(stride+1);
   for(let x=0;x<stride;x++){const a=x>=bpp?cur[x-bpp]:0,b=prev?prev[x]:0,c=x>=bpp&&prev?prev[x-bpp]:0;let v=cur[x];
    if(f===1)v+=a;else if(f===2)v+=b;else if(f===3)v+=(a+b)>>1;else if(f===4){const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);v+=pa<=pb&&pa<=pc?a:pb<=pc?b:c;}cur[x]=v;}
   prev=cur;const out=new Uint16Array(W);for(let x=0;x<W;x++)out[x]=cur[x*2]<<8|cur[x*2+1];onRow(y++,out);}});
  inf.on('end',ok);inf.on('error',ng);});
 const hdr=Buffer.alloc(8);
 for(;;){fs.readSync(fd,hdr,0,8,pos);const len=hdr.readUInt32BE(0),type=hdr.toString('ascii',4,8);
  if(type==='IHDR'){const d=Buffer.alloc(13);fs.readSync(fd,d,0,13,pos+8);W=d.readUInt32BE(0);H=d.readUInt32BE(4);if(d[8]!==16||d[9]!==0||d[12])throw Error('16bit 灰色 非インターレースのみ');stride=W*bpp;}
  else if(type==='IDAT'){const d=Buffer.alloc(len);fs.readSync(fd,d,0,len,pos+8);if(!inf.write(d))await new Promise(r=>inf.once('drain',r));}
  else if(type==='IEND')break;pos+=12+len;}
 inf.end();await rows;fs.closeSync(fd);if(y!==H)throw Error(`行が足りない ${y}/${H}`);return {width:W,height:H};}
module.exports={writeRGB,readRGB,readGray16};
