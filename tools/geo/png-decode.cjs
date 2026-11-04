/* 依存なしの PNG 読込（8bit の RGB / RGBA、非インターレース）。地理院・Mapzen の標高 PNG 用。 */
const zlib=require('node:zlib');
module.exports=function decodePNG(buf){
 if(buf.readUInt32BE(0)!==0x89504e47)throw Error('not PNG');let o=8,w,h,bd,ct,idat=[];
 while(o<buf.length){const len=buf.readUInt32BE(o),type=buf.toString('ascii',o+4,o+8),data=buf.subarray(o+8,o+8+len);
  if(type==='IHDR'){w=data.readUInt32BE(0);h=data.readUInt32BE(4);bd=data[8];ct=data[9];if(data[12])throw Error('interlaced');}
  else if(type==='IDAT')idat.push(data);else if(type==='IEND')break;o+=12+len;}
 if(bd!==8||![2,6].includes(ct))throw Error('unsupported '+bd+'/'+ct);const bpp=ct===6?4:3,stride=w*bpp,raw=zlib.inflateSync(Buffer.concat(idat)),out=Buffer.alloc(w*h*4);
 let prev=Buffer.alloc(stride);
 for(let y=0;y<h;y++){const f=raw[y*(stride+1)],line=Buffer.from(raw.subarray(y*(stride+1)+1,(y+1)*(stride+1)));
  for(let x=0;x<stride;x++){const a=x>=bpp?line[x-bpp]:0,b=prev[x],c=x>=bpp?prev[x-bpp]:0;let v=line[x];
   if(f===1)v+=a;else if(f===2)v+=b;else if(f===3)v+=(a+b)>>1;else if(f===4){const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);v+=pa<=pb&&pa<=pc?a:pb<=pc?b:c;}
   line[x]=v&255;}
  for(let x=0;x<w;x++){out[(y*w+x)*4]=line[x*bpp];out[(y*w+x)*4+1]=line[x*bpp+1];out[(y*w+x)*4+2]=line[x*bpp+2];out[(y*w+x)*4+3]=bpp===4?line[x*bpp+3]:255;}
  prev=line;}
 return {width:w,height:h,data:out};
};
