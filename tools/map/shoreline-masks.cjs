/* 補正範囲を閉じる水上の辺を、物理的な岸線として描かないための生成時入力。 */
const fs=require('node:fs');
module.exports=function loadMasks(file,p){
 if(!fs.existsSync(file))return ()=>false;
 const data=JSON.parse(fs.readFileSync(file)),segments=[];
 if(data.type!=='FeatureCollection')throw Error('岸線マスクはFeatureCollection');
 const project=([lon,lat])=>[(lon-p.LON0)*p.K*p.CX,(p.LAT0-lat)*p.K];
 for(const f of data.features){
  const meta=f.properties;
  if(meta.role!=='water-mask-boundary'||meta.drawCoastline!==false||!Number.isFinite(meta.bufferMetres)||meta.bufferMetres<0||f.geometry.type!=='LineString')throw Error('岸線マスクの形式が不正');
  if(f.geometry.coordinates.length<2||f.geometry.coordinates.some(q=>q.length!==2||!q.every(Number.isFinite)||Math.abs(q[0])>180||Math.abs(q[1])>90))throw Error('岸線マスクの経緯度が不正');
  const line=f.geometry.coordinates.map(project),radius=meta.bufferMetres*p.K/111320;
  for(let i=1;i<line.length;i++)segments.push({a:line[i-1],b:line[i],radius});
 }
 const pointDistance=(p,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy,t=length?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/length)):0;return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);};
 const cross=(a,b)=>a[0]*b[1]-a[1]*b[0];
 return (x0,y0,x1,y1,padding=0)=>{
  const a=[x0,y0],b=[x1,y1];
  for(const s of segments){const c=s.a,d=s.b,r=s.radius+padding;
   if(Math.max(x0,x1)<Math.min(c[0],d[0])-r||Math.min(x0,x1)>Math.max(c[0],d[0])+r||Math.max(y0,y1)<Math.min(c[1],d[1])-r||Math.min(y0,y1)>Math.max(c[1],d[1])+r)continue;
   const u=[b[0]-a[0],b[1]-a[1]],v=[d[0]-c[0],d[1]-c[1]],w=[c[0]-a[0],c[1]-a[1]],den=cross(u,v);
   if(den){const t=cross(w,v)/den,q=cross(w,u)/den;if(t>=0&&t<=1&&q>=0&&q<=1)return true;}
   if(Math.min(pointDistance(a,c,d),pointDistance(b,c,d),pointDistance(c,a,b),pointDistance(d,a,b))<=r)return true;
  }return false;
 };
};
