"use strict";
/* 地形と部隊の史料は独立。位置の根拠のない人物を、画面上の空き場所へ配置しない。 */
window.TKBattleAtlas=(function(){
 const cache=new Map(),decoded=new Map(),backgrounds=new Map(),COL={a:'#ad514d',b:'#3c7094',unknown:'#736d61'};
 const placeLabels=new WeakMap();
 const overlaps=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
 const FONT='"Shippori Mincho B1","Hiragino Mincho ProN","Yu Mincho",serif';
 const RELIEF_LOW=[226,231,220],RELIEF_HIGH=[145,162,146];
 function load(meta){let p=cache.get(meta.file);if(!p){p=fetch('atlas/'+meta.file).then(r=>{if(!r.ok)throw Error('地形データを読めません');return r.json();}).then(d=>{const raw=atob(d.heights),a=new Int16Array(d.width*d.height);for(let i=0;i<a.length;i++)a[i]=(raw.charCodeAt(i*2)+raw.charCodeAt(i*2+1)*256)-32768;d.values=a;decoded.set(meta.file,d);if(decoded.size>12)decoded.delete(decoded.keys().next().value);return d;});cache.set(meta.file,p);if(cache.size>12)cache.delete(cache.keys().next().value);}return p;}
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const reliefPixels=new WeakMap();
 const reliefContourCache=new Map();
 function reliefContours(data,maxLevels=24){
  const {width:nx,height:ny,values:a}=data;
  if(!Number.isInteger(nx)||!Number.isInteger(ny)||nx<2||ny<2||a?.length!==nx*ny||!Number.isInteger(maxLevels)||maxLevels<1||maxLevels>64)throw Error('Invalid contour grid');
  let lo=Infinity,hi=-Infinity;for(const v of a){if(!Number.isFinite(v)||v===(data.noData??-32768))throw Error('NoData contour sample');lo=Math.min(lo,v);hi=Math.max(hi,v);}
  let step=10;for(const factor of [1,2,5,10,20,50,100,200,500,1000,2000,5000]){step=10*factor;if(Math.floor(hi/step)-Math.floor(lo/step)<=maxLevels)break;}
  const levels=[];for(let value=(Math.floor(lo/step)+1)*step;value<hi;value+=step)levels.push(value);
  const segments=[],seen=new Set();
  const first=levels[0],last=levels.at(-1);
  for(let y=0;levels.length&&y<ny-1;y++)for(let x=0;x<nx-1;x++){
   const v0=a[y*nx+x],v1=a[y*nx+x+1],v2=a[(y+1)*nx+x+1],v3=a[(y+1)*nx+x],min=Math.min(v0,v1,v2,v3),max=Math.max(v0,v1,v2,v3);
   if(min===max)continue;
   const from=Math.max(first,Math.ceil(min/step)*step),until=Math.min(last,Math.floor(max/step)*step);if(from>until)continue;
   const p=[[x,y,v0],[x+1,y,v1],[x+1,y+1,v2],[x,y+1,v3]],triangles=[[p[0],p[1],p[2]],[p[0],p[2],p[3]]];
   for(let value=from;value<=until;value+=step)for(const tri of triangles){
    if(value<Math.min(tri[0][2],tri[1][2],tri[2][2])||value>Math.max(tri[0][2],tri[1][2],tri[2][2]))continue;
    const hits=[];for(let i=0;i<3;i++){const v=tri[i],q=tri[(i+1)%3];if((v[2]>=value)===(q[2]>=value))continue;const t=(value-v[2])/(q[2]-v[2]);hits.push([v[0]+t*(q[0]-v[0]),v[1]+t*(q[1]-v[1])]);}
    if(hits.length!==2||hits[0][0]===hits[1][0]&&hits[0][1]===hits[1][1])continue;
    // Duplicate segments can only coincide with a full shared triangle edge.
    if(hits.every(p=>p.every(Number.isInteger))){const ends=hits.map(p=>p.join(',')).sort(),key=value+':'+ends.join('|');if(seen.has(key))continue;seen.add(key);}
    segments.push({level:value,a:hits[0],b:hits[1]});
   }
  }
  return {step,levels,segments};
 }
 function reliefContourPath(data){let path=reliefContourCache.get(data);if(path)return path;const lines=reliefContours(data);path=new Path2D();for(const line of lines.segments){path.moveTo(...line.a);path.lineTo(...line.b);}reliefContourCache.set(data,path);if(reliefContourCache.size>12)reliefContourCache.delete(reliefContourCache.keys().next().value);return path;}

 // 同じ標高格子から表示色と北西光の陰影を作り、標高そのものは更新しない。
 // 格子点は範囲の境界を含む。画像の画素中心を元の標本位置へ合わせる。
 function reliefRasterRect(nx,ny,width,height){return [-width/(2*(nx-1)),-height/(2*(ny-1)),width*nx/(nx-1),height*ny/(ny-1)];}
 function shadeRelief(data){
  const {width:nx,height:ny,values:a}=data,b=data.bounds;
  if(nx<2||ny<2||!b||a.length!==nx*ny)throw Error('Invalid relief grid');
  const lat=(b[1]+b[3])/2*Math.PI/180,dx=(b[2]-b[0])*111320*Math.cos(lat)/(nx-1),dy=(b[1]-b[3])*111320/(ny-1);
  if(!(dx>0&&dy>0))throw Error('Invalid relief spacing');
  const sorted=Array.from(a).filter(v=>Number.isFinite(v)&&v>0).sort((x,y)=>x-y),lo=sorted[Math.floor(sorted.length*.05)]||0,hi=Math.max(lo+1,sorted[Math.floor(sorted.length*.96)]||100),pixels=new Uint8ClampedArray(nx*ny*4),L=[-.5,.5,Math.SQRT1_2];
  for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
   const l=Math.max(0,x-1),r=Math.min(nx-1,x+1),t=Math.max(0,y-1),b=Math.min(ny-1,y+1),east=(a[y*nx+r]-a[y*nx+l])/((r-l)*dx),north=-(a[t*nx+x]-a[b*nx+x])/((t-b)*dy),len=Math.hypot(east,north,1),lit=(-east*L[0]-north*L[1]+L[2])/len;
   const f=clamp((a[y*nx+x]-lo)/(hi-lo),0,1),shade=1+.22*(lit-Math.SQRT1_2),i=(y*nx+x)*4;
   for(let k=0;k<3;k++)pixels[i+k]=Math.round((RELIEF_LOW[k]+(RELIEF_HIGH[k]-RELIEF_LOW[k])*f)*shade);pixels[i+3]=255;
  }
  return {pixels,width:nx,height:ny,dx,dy,lo,hi};
 }
 // 全国の陸地・河川・湖・街道の外接矩形を一度だけ求め、合戦図の範囲外の線は投影せずに飛ばす（背景作成が重かった）。
 const BB=new WeakMap();
 const bbFlat=a=>{let b=BB.get(a);if(!b){let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;for(let i=0;i+1<a.length;i+=2){const x=a[i],y=a[i+1];if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}b=[x0,y0,x1,y1];BB.set(a,b);}return b;};
 const bbPairs=a=>{let b=BB.get(a);if(!b){let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;for(const p of a){const x=p[0],y=p[1];if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}b=[x0,y0,x1,y1];BB.set(a,b);}return b;};
 // 元の標高格子を、表示する経緯度の枠へ投影する。格子自体は作り直さない。
 function reliefTransform(source,frame,W,H){return {translate:[(source[0]-frame[0])/(frame[2]-frame[0])*W,(frame[1]-source[1])/(frame[1]-frame[3])*H],scale:[(source[2]-source[0])/(frame[2]-frame[0]),(source[1]-source[3])/(frame[1]-frame[3])]};}
 // 表示用の束。元pointが厳密一致し、現在も1px以内の隊だけ。同じ場所へ再配置しない。
 function labelBuckets(items){const out=[];for(const item of items){const b=Array.isArray(item.point)&&out.find(b=>Array.isArray(b.point)&&b.point[0]===item.point[0]&&b.point[1]===item.point[1]&&b.items.every(q=>Math.hypot(q.pin[0]-item.pin[0],q.pin[1]-item.pin[1])<1));if(b)b.items.push(item);else out.push({point:item.point,items:[item]});}return out;}
 function labelPlacement(item,layout){const {W,H,small,named,anchors,previous}=layout,[x,y]=item.pin,w=item.w,h=item.h,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));if(w>W-4||h>H-4)return null;
  const gap=item.ornaments?(small?30:42):(small?18:24),top=item.ornaments?(small?50:60):24;
  const cands=[{x:x+gap,y:y-h/2},{x:x-w/2,y:y+24},{x:x-w-gap,y:y-h/2},{x:x-w/2,y:y-h-top},{x:x+gap,y:y+20},{x:x-w-gap,y:y+20},{x:x+gap,y:y-h-20},{x:x-w-gap,y:y-h-20}],order=[...new Set([previous,0,1,2,3,4,5,6,7].filter(i=>Number.isInteger(i)&&i>=0&&i<cands.length))];
  for(const slot of order){const p=cands[slot],box={x:clamp(p.x,2,W-w-2),y:clamp(p.y,2,H-h-2),w,h};if(named.some(b=>overlaps(b,box))||anchors.some(b=>overlaps(b,box)))continue;const distance=Math.hypot(clamp(x,box.x,box.x+w)-x,clamp(y,box.y,box.y+h)-y);if(distance>(small?32:44))continue;return {box,slot};}
  return null;
 }

 function landmarkView(spec,scene,meta,W,H){
  if(!spec)return null;
  if(!(W>0&&H>0)||!meta.bounds?.every(Number.isFinite)||meta.bounds[2]<=meta.bounds[0]||meta.bounds[1]<=meta.bounds[3])throw Error('Invalid declared viewport');
  if(spec.maxScale!=null&&!(Number.isFinite(spec.maxScale)&&spec.maxScale>=1))throw Error('Invalid maximum scale');
  if(!spec.id||!spec.name||!Array.isArray(spec.landmarks)||spec.landmarks.length<1)throw Error('Invalid declared view');
  if(spec.landmarks.length===1&&!(spec.minWidthKm>0))throw Error('Single landmark needs explicit display width');
  const available=[...(scene.atlasLandmarks||[]).map(m=>({name:m.name,point:m.point,from:'atlasLandmarks'})),...(meta.points||[]).map(m=>({name:m.name,point:[m.lon,m.lat],from:'atlasPoints'}))],b=meta.bounds;
  const points=spec.landmarks.map(ref=>{const r=typeof ref==='string'?{name:ref}:ref,found=available.filter(m=>m.name===r.name&&(!r.from||m.from===r.from));if(!found.length)throw Error('Missing landmark '+r.name);const unique=[...new Map(found.map(m=>[JSON.stringify(m.point),m.point])).values()];if(unique.length!==1)throw Error('Ambiguous landmark '+r.name);const p=unique[0];if(!p?.every(Number.isFinite))throw Error('Invalid landmark '+r.name);return [(p[0]-b[0])/(b[2]-b[0]),(b[1]-p[1])/(b[1]-b[3])];});
  const pad=spec.paddingFraction??.12;if(!(pad>=0&&pad<.45))throw Error('Invalid view padding');
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);if(x0<0||x1>1||y0<0||y1>1)throw Error('Landmark outside source extent');
  let s=Math.min((1-2*pad)/Math.max(1e-9,x1-x0),(1-2*pad)/Math.max(1e-9,y1-y0));
  const sourceWidthKm=(b[2]-b[0])*111.32*Math.cos((b[1]+b[3])/2*Math.PI/180);
  if(spec.minWidthKm!=null){if(!(spec.minWidthKm>0))throw Error('Invalid minimum width');s=Math.min(s,sourceWidthKm/spec.minWidthKm);}
  s=Math.max(1,Math.min(spec.maxScale??3.5,s));
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));return {id:spec.id,name:spec.name,s,x:clamp((x0+x1)/2*s*W-W/2,0,W*s-W),y:clamp((y0+y1)/2*s*H-H/2,0,H*s-H),declared:true,resolvedLandmarks:spec.landmarks,visibleWidthKm:sourceWidthKm/s};
 }

 function make(cv,sc,opt){
  const title=opt.title,meta=TK.BATTLE_ATLAS[title],ctx=cv.getContext('2d');let W=0,H=0,D=1,bg=null,data=decoded.get(meta.file)||null,dead=false,selected=null,error='',lastKey='',frame;
  let t=0,pendingPlay=false,fxRaf=0,fxLast=0,lastSnap=true;const fx=TKBattleEffects.create({seed:(meta.file||'').length*131+sc.units.length});const groups=(sc.atlasGroups||[]).flatMap(g=>g.members.map((id,i)=>({...g,id:g.id+'-'+i,label:sc.units.find(u=>u.id===id)?.g||g.label,members:[id],parentId:g.id,point:g.point}))),units=sc.atlasUnits||[],notes=sc.atlasNotes||[],aspect=sc.atlasSchematic?.9:sc.atlasPlan?1100/1050:meta.aspect||.7;
  const unitById=new Map(sc.units.map(u=>[u.id,u])),groupOf=new Map(),moveByName=new Map((TK.BATTLE_MOVEMENTS[sc.title]||[]).map(m=>[m.name,m]));
  if(sc.atlasSchematic)cv.setAttribute('aria-label',sc.title+'の攻撃順序を示す模式図');
  // 位置の記録がない隊は、推定の配置（TKBattleMotion）が置けるときだけ別枠で描く。groups（記録の群）には混ぜない。
  const recordedIds=new Set(groups.filter(g=>g.point).flatMap(g=>g.members)),estGroups=sc.atlasPlan?[]:sc.units.filter(u=>!recordedIds.has(u.id)).map(u=>({id:'est-'+u.id,label:u.g||u.n,members:[u.id],side:u.side,point:null,estimated:true}));
  // 推定経路は一定の基準平面で一度だけ計算し、表示幅・地区拡大は投影だけを変える。
  const motionW=1000,motionH=1000*(meta.aspect||.7);
  const motionProject=(lo,la)=>[(lo-meta.bounds[0])/(meta.bounds[2]-meta.bounds[0])*motionW,(meta.bounds[1]-la)/(meta.bounds[1]-meta.bounds[3])*motionH];
  let motion=null;
  function motionPlan(){if(motion)return motion;const base=new Map();for(const g of groups)if(g.point)base.set(g.members[0],motionProject(...g.point));const sourced=new Set(sc.units.filter(u=>moveByName.has(u.g||u.n)).map(u=>u.id));motion=window.TKBattleMotion&&!sc.atlasPlan?TKBattleMotion.plan(sc,base,motionW,motionH,side=>{const p=opponentHomePoint(side);return p&&motionProject(...p);},sourced):{pos:()=>null,estimated:new Set(),placed:new Set(),basis:'none'};return motion;}
  const estAt=(g,tt)=>{const p=motionPlan().pos(g.members[0],tt);return p?[p[0]/motionW*W*VS-VX,p[1]/motionH*H*VS-VY]:null;};
  // 表示範囲（全体か、選んだ地区の拡大）。VS は倍率、VX・VY は拡大後の左上のずれ（画面の画素）。
  let VS=1,VX=0,VY=0,viewIndex=0,views=[],viewInitialized=false;
  // 視点の移動は描画だけを補間する（移動の途中で次の行き先が決まったら、いま描いている位置から続ける）。VS・VX・VY は切替の時点で行き先の値になるので、位置の計算や検査が読む値は変わらない。
  // 動きを減らす設定の端末と、アニメーションの無い検査の土台では補間も自動の追従もしない。
  const animate=typeof matchMedia==='function'&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
  let glide=null,follow=animate,followKey='';
  function setView(s,x,y,ms){const view=[VS,VX,VY],was=glide?.now||view,old=bg;[VS,VX,VY]=[s,x,y];motion=null;backdrop();glide=animate&&ms&&old&&(Math.abs(was[0]-s)>1e-3||Math.abs(was[1]-x)>.5||Math.abs(was[2]-y)>.5)?{from:was,bg:old,view,start:performance.now(),ms,e:0}:null;frameDraw();if(glide)wake();}
  // 補間中だけ VS・VX・VY を途中の値に置き換え、描き終えたら行き先へ戻す。中心と倍率を別々に補間して、寄りながら滑るように見せる。
  function glideStep(now){if(!glide)return null;const k=clamp((now-glide.start)/glide.ms,0,1);if(k>=1){glide=null;return null;}const e=k*k*(3-2*k),to=[VS,VX,VY],[s0,x0,y0]=glide.from,s=s0*Math.pow(to[0]/s0,e),cx=(x0+W/2)/s0+((to[1]+W/2)/to[0]-(x0+W/2)/s0)*e,cy=(y0+H/2)/s0+((to[2]+H/2)/to[0]-(y0+H/2)/s0)*e;glide.e=e;VS=s;VX=clamp(cx*s-W/2,0,W*s-W);VY=clamp(cy*s-H/2,0,H*s-H);glide.now=[VS,VX,VY];return to;}
  function ground(to){if(!to){ctx.drawImage(bg,0,0,W,H);return;}const lay=(image,v,alpha)=>{const q=VS/v[0];ctx.save();ctx.globalAlpha=alpha;ctx.translate(v[1]*q-VX,v[2]*q-VY);ctx.scale(q,q);ctx.drawImage(image,0,0,W,H);ctx.restore();};ctx.fillStyle='rgb('+RELIEF_LOW.join(',')+')';ctx.fillRect(0,0,W,H);lay(glide.bg,glide.view,1);lay(bg,to,glide.e);}
  // 再生中は、いまの経過（beats）で交戦している隊が収まる範囲へ視点を寄せる。交戦の組が無い経過では、選んである表示範囲へ戻る。
  function followBeat(){const beats=sc.beats||[];let i=-1;for(let j=0;j<beats.length;j++)if(beats[j][0]<=t)i=j;const key=i+'|'+W+'|'+viewIndex;if(key===followKey)return;followKey=key;
   const home=views[viewIndex]||{s:1,x:0,y:0},pts=[];for(const id of (i>=0&&beats[i][2])||[]){const u=unitById.get(id),g=u&&visible(u)&&selectionGroup(id),p=g&&pinFor(g);if(p)pts.push([(p[0]+VX)/VS,(p[1]+VY)/VS]);}
   if(!pts.length){setView(home.s,home.x,home.y,1100);return;}
   const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),pad=Math.min(W,H)*.34,z=clamp(Math.min(W/(Math.max(...xs)-Math.min(...xs)+pad),H/(Math.max(...ys)-Math.min(...ys)+pad)),1,3.6),cx=(Math.max(...xs)+Math.min(...xs))/2,cy=(Math.max(...ys)+Math.min(...ys))/2;
   setView(z,clamp(cx*z-W/2,0,W*z-W),clamp(cy*z-H/2,0,H*z-H),1100);}
  function followButton(){const row=cv.closest('.battle-stage')?.querySelector('.bctl');if(!animate||!row||sc.atlasPlan||sc.atlasSchematic||!groups.length)return;let b=row.querySelector('.atlas-follow');if(!b){b=document.createElement('button');b.type='button';b.className='mini atlas-follow';b.textContent='動きを追う';b.title='再生中、交戦している隊へ視点を寄せます。表示範囲を自分で選ぶと止まります。';b.onclick=()=>{follow=!follow;followKey='';followButton();if(!follow){const v=views[viewIndex]||{s:1,x:0,y:0};setView(v.s,v.x,v.y,520);}else wake();};row.append(b);}b.setAttribute('aria-pressed',String(follow));}
  const pj=(lo,la)=>[(lo-meta.bounds[0])/(meta.bounds[2]-meta.bounds[0])*W*VS-VX,(meta.bounds[1]-la)/(meta.bounds[1]-meta.bounds[3])*H*VS-VY];
  const unproject=p=>[meta.bounds[0]+(p[0]+VX)/(W*VS)*(meta.bounds[2]-meta.bounds[0]),meta.bounds[1]-(p[1]+VY)/(H*VS)*(meta.bounds[1]-meta.bounds[3])];
  const wp=(x,y)=>pj(TKGEO.LON0+x/TKGEO.K/TKGEO.CX,TKGEO.LAT0-y/TKGEO.K);
  const inside=(x,y)=>x>=0&&x<=W&&y>=0&&y<=H;
  const onView=(b,proj)=>{const p=proj(b[0],b[1]),q=proj(b[2],b[3]);return Math.max(p[0],q[0])>-60&&Math.min(p[0],q[0])<W+60&&Math.max(p[1],q[1])>-60&&Math.min(p[1],q[1])<H+60;};
  function text(c,txt,x,y,size=12,color='#254532',align='center',reserved=null,recordOnly=false){
   c.font=`600 ${size}px ${FONT}`;const width=Math.min(c.measureText(txt).width,W-8),left=align==='left'?0:align==='right'?width:width/2,right=width-left;
   x=clamp(x,4+left,W-4-right);y=clamp(y,4+size/2,H-4-size/2);
   if(reserved){
    const bounds={x:x-left-2,y:y-size/2-2,w:width+4,h:size+4};
    if(!recordOnly&&reserved.some(b=>overlaps(bounds,b)))return;
    reserved.push(bounds);
   }
   c.textAlign=align;c.textBaseline='middle';c.lineJoin='round';c.lineWidth=3;c.strokeStyle='rgba(251,250,233,.96)';c.strokeText(txt,x,y,width);c.fillStyle=color;c.fillText(txt,x,y,width);return true;
  }
  function path(c,pts,world=false,close=false){c.beginPath();for(let i=0;i<pts.length;i++){const p=world?wp(...pts[i]):[pts[i][0]*W,pts[i][1]*H];i?c.lineTo(...p):c.moveTo(...p);}if(close)c.closePath();}
  const riverPath=(c,pts)=>TK.riverPath(c,pts);
  function flatPath(c,pts,close){path(c,Array.from({length:pts.length/2},(_,i)=>[pts[i*2],pts[i*2+1]]),true,close);}
  // 陰影は元格子の大きさで一度だけ作り、表示範囲の合成結果は背景キャッシュへ保持する。
  function relief(c){
   c.fillStyle='rgb('+RELIEF_LOW.join(',')+')';c.fillRect(0,0,W,H);if(!data)return;
   let image=reliefPixels.get(data);if(!image){
    const shaded=shadeRelief({...data,bounds:data.bounds||meta.bounds}),cv=document.createElement('canvas');cv.width=shaded.width;cv.height=shaded.height;const x=cv.getContext('2d'),pixels=x.createImageData(shaded.width,shaded.height);pixels.data.set(shaded.pixels);x.putImageData(pixels,0,0);image=cv;reliefPixels.set(data,image);
   }
   const transform=reliefTransform(data.bounds||meta.bounds,meta.bounds,W,H);c.save();c.translate(...transform.translate);c.scale(...transform.scale);c.beginPath();c.rect(0,0,W,H);c.clip();c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.drawImage(image,...reliefRasterRect(data.width,data.height,W,H));
   // 等高線は同じ格子の等値線。地区を拡大しても線幅を約0.5画素に保つ。
   const sx=W/(data.width-1),sy=H/(data.height-1);c.scale(sx,sy);c.strokeStyle='rgba(73,87,69,.22)';c.lineWidth=.5/(VS*Math.max(sx*transform.scale[0],sy*transform.scale[1]));c.stroke(reliefContourPath(data));c.restore();
  }
  function backdrop(){if(!W||!data&&!sc.atlasPlan&&!error)return;const cacheKey=meta.file+'|'+title+'|'+meta.bounds.join(',')+'|'+W+'|'+H+'|'+D+'|'+G.date().y+'|'+!!data+'|'+VS.toFixed(3)+'|'+Math.round(VX)+'|'+Math.round(VY);if(!error&&backgrounds.has(cacheKey)){bg=backgrounds.get(cacheKey);return;}bg=document.createElement('canvas');bg.width=W*D;bg.height=H*D;const c=bg.getContext('2d');c.scale(D,D);if(sc.atlasSchematic){const reserved=[];placeLabels.set(bg,reserved);c.fillStyle='#f3eedb';c.fillRect(0,0,W,H);text(c,sc.atlasSchematic.title,W/2,22,W<560?13:16,'#493c28','center',reserved,true);text(c,'攻撃を命じられた部隊',W*.22,H*.16,W<560?10:12,'#9a3435','center',reserved,true);text(c,'豊臣方の河口砦',W*.77,H*.16,W<560?10:12,'#216d9f','center',reserved,true);text(c,sc.atlasSchematic.caption,W/2,H-17,W<560?8:11,'#665b49','center',reserved,true);backgrounds.set(cacheKey,bg);if(backgrounds.size>4)backgrounds.delete(backgrounds.keys().next().value);return;}c.save();c.translate(-VX,-VY);c.scale(VS,VS);relief(c);c.restore();
   // 現代の水域は比較用。旧河道・埋立前の海岸の復元として扱わない。
   c.save();c.beginPath();c.rect(0,0,W,H);c.clip();
   const land=new Path2D();for(const poly of TKGEO.land)for(const ring of poly){if(!onView(bbFlat(ring),wp))continue;for(let i=0;i<ring.length;i+=2){const p=wp(ring[i],ring[i+1]);i?land.lineTo(...p):land.moveTo(...p);}land.closePath();}
   const mask=new Path2D();mask.rect(-2,-2,W+4,H+4);mask.addPath(land);c.fillStyle='#c5d9dc';c.fill(mask,'evenodd');
   // 河川は陸域の内側だけに描く。比較河川の線が粗い海岸線の外（海上）へはみ出して見えないようにする。
   c.save();c.clip(land);
   if(data?.comparisonRivers){for(const r of data.comparisonRivers){const pts=r.points.map(p=>pj(...p));if(!TK.waterLineVisible(pts,(x,y)=>[x,y]))continue;riverPath(c,pts);c.strokeStyle=r.kind==='stream'?'#8da1a5':'#718d97';c.lineWidth=r.kind==='stream'?.85:1.3;c.stroke();}}
   else{
   for(const r of TKGEO.rivers){if(!onView(bbFlat(r),wp))continue;if(TK.KOREAN_RIVERS_DETAIL?.length&&r.every((v,i)=>i%2?TKGEO.LAT0-v/TKGEO.K>34.8:v/TKGEO.K/TKGEO.CX+TKGEO.LON0>124&&v/TKGEO.K/TKGEO.CX+TKGEO.LON0<131))continue;const pts=Array.from({length:r.length/2},(_,i)=>wp(r[i*2],r[i*2+1]));if(!TK.waterLineVisible(pts,(x,y)=>[x,y]))continue;riverPath(c,pts);c.strokeStyle='#718d97';c.lineWidth=1.3;c.stroke();}
   for(const river of (TK.REGIONAL_RIVERS||[]).filter(r=>!TK.KOREAN_RIVERS_DETAIL?.length||!['漢江','南漢江','洛東江'].includes(r.name)))for(const line of river.lines){if(!onView(bbPairs(line),pj))continue;const pts=line.map(p=>pj(...p));if(!TK.waterLineVisible(pts,(x,y)=>[x,y]))continue;riverPath(c,pts);c.strokeStyle='#718d97';c.lineWidth=1.3;c.stroke();}
   for(const river of TK.KOREAN_RIVERS_DETAIL||[]){if(river.bounds&&(river.bounds[0]>meta.bounds[2]||river.bounds[2]<meta.bounds[0]||river.bounds[1]>meta.bounds[1]||river.bounds[3]<meta.bounds[3]))continue;const pts=river.points.map(p=>pj(...p));if(!TK.waterLineVisible(pts,(x,y)=>[x,y]))continue;riverPath(c,pts);c.strokeStyle='#718d97';c.lineWidth=1.3;c.stroke();}
   }
   c.restore();
   for(const poly of TKGEO.lakes){if(!poly.some(ring=>ring.map&&onView(bbFlat(ring),wp)))continue;c.beginPath();for(const ring of poly){const pts=ring.map?ring:[];for(let i=0;i<pts.length;i+=2){const p=wp(pts[i],pts[i+1]);i?c.lineTo(...p):c.moveTo(...p);}c.closePath();}c.fillStyle='#a7d1df';c.fill('evenodd');}
   for(const w of TK.periodWaters?.((sc.eventDate||[1560])[0])||[]){c.beginPath();for(const ring of w.rings){ring.forEach((v,i)=>{const p=pj(...v);i?c.lineTo(...p):c.moveTo(...p);});c.closePath();}c.fillStyle='rgba(105,160,173,.62)';c.fill('evenodd');c.setLineDash([2,3]);c.strokeStyle='#66999d';c.lineWidth=.7;c.stroke();c.setLineDash([]);}
   for(const h of TK.HISTORIC_WATERS||[]){if(!h.poly)continue;flatPath(c,h.poly[0],true);c.fillStyle=h.kind==='marsh'?'rgba(112,151,138,.28)':'rgba(118,166,186,.4)';c.fill();c.setLineDash([1,3]);c.strokeStyle='#668a83';c.lineWidth=1;c.stroke();c.setLineDash([]);const p=pj(...h.at);if(inside(...p))text(c,h.label,...p,10,'#315766');}
   for(const l of TK.waterComparisonOverlay?TK.MODERN_LAKES||[]:[]){c.beginPath();for(const ring of l.rings){ring.forEach((v,i)=>{const p=pj(...v);i?c.lineTo(...p):c.moveTo(...p);});c.closePath();}c.fillStyle='rgba(118,166,186,.6)';c.fill('evenodd');c.setLineDash([3,3]);c.strokeStyle='#426f80';c.lineWidth=.8;c.stroke();c.setLineDash([]);const p=pj(...l.rings[0][0]);if(inside(...p))text(c,l.name+'（比較湖岸）',...p,9,'#315766');}
   for(const r of G.ROADS){const raw=TK.roadDisplay(r).pts;if(!onView(bbPairs(raw),wp))continue;const pts=raw.map(p=>wp(...p));if(!pts.some(p=>inside(...p)))continue;c.beginPath();pts.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.setLineDash([]);c.strokeStyle='#ada998';c.lineWidth=1.9;c.stroke();c.strokeStyle='#f6f3e9';c.lineWidth=1.1;c.stroke();}c.setLineDash([]);
   c.restore();
   // 史料を読図した城郭平面図は独立した概略図として、現代標高と混ぜない。
   if(sc.atlasPlan){const reserved=[];placeLabels.set(bg,reserved);c.fillStyle='#e9ebcf';c.fillRect(0,0,W,H);for(const f of sc.feats||[]){
    if(!f.pts)continue;path(c,f.pts,false,!['road','dryMoat'].includes(f.k));
    if(f.k==='landform'){c.fillStyle='#a4c58f';c.fill();}
    if(['water','sea','lake'].includes(f.k)){c.fillStyle='#acd5e2';c.fill();c.strokeStyle='#5e9cae';c.lineWidth=1;c.stroke();}
    if(f.k==='town'){c.fillStyle='#ddd6b7';c.fill();}
    if(f.k==='bailey'){c.fillStyle='#f2edce';c.fill();c.strokeStyle='#746b4e';c.lineWidth=1.4;c.stroke();}
    if(f.k==='dryMoat'){c.strokeStyle='#768864';c.lineWidth=4;c.stroke();c.strokeStyle='#edf0d7';c.lineWidth=1.4;c.stroke();}
    if(f.k==='road'){c.strokeStyle='#897b61';c.lineWidth=1.2;c.stroke();}
   }for(const f of sc.feats||[])if(f.n&&f.x!=null&&!['caption','keep'].includes(f.k))text(c,f.n,f.x*W,f.y*H,W>650?12:10,'#254532','center',reserved,true);}
   else {
    const reserved=[];
    if(reserved)placeLabels.set(bg,reserved);
    const landmarks=sc.atlasLandmarks||[],shownLandmarks=new Set();
    for(const l of landmarks){
     const [x,y]=pj(...l.point);
     if(inside(x,y)&&text(c,l.name,clamp(x,35,W-35),clamp(y-53,14,H-14),W>650?14:11,'#536546','center',reserved))shownLandmarks.add(l.name);
    }
    const seen=[];
    for(const p of meta.points||[]){
     const [x,y]=pj(p.lon,p.lat);
     if(!inside(x,y)||seen.some(q=>Math.hypot(q[0]-x,q[1]-y)<40))continue;
     seen.push([x,y]);c.fillStyle='#435940';c.fillRect(x-3,y-3,6,6);
     if(!reserved||!shownLandmarks.has(p.name))text(c,p.name,x,y+12,W>650?11:9,undefined,'center',reserved);
    }
    if(!meta.points.length&&!units.length){
     const [x,y]=pj(meta.geo[0],meta.geo[1]);
     text(c,meta.label,x,y-10,W>650?13:11,undefined,'center',reserved);
     text(c,'地域の位置・戦場の境界ではありません',x,y+12,10,'#617057','center',reserved);
    }
   }
   if(error)text(c,error,W/2,H/2,12,'#8a3633');else if(!data&&!sc.atlasPlan)text(c,'地形を読み込んでいます',W/2,30,11);if(!error){backgrounds.set(cacheKey,bg);if(backgrounds.size>4)backgrounds.delete(backgrounds.keys().next().value);}
  }
  const boxes=[];
  const schematicAt=(g,tt)=>{const p=window.TKBattleMotion?.at(sc.atlasSchematic?.paths?.[g.members[0]],tt);return p?[p[0]*W,p[1]*H]:null;};
  const mapped=g=>!!(g.point||sc.atlasSchematic?.paths?.[g.members[0]]);
  const pinFor=g=>{if(sc.atlasSchematic?.paths?.[g.members[0]])return schematicAt(g,t);if(g.estimated)return estAt(g,t);if(!g.point)return null;if(sc.atlasPlan)return [W*.56,H*.48];const u=unitById.get(g.members[0]);if(u&&!moveByName.has(u.g||u.n)){const e=estAt(g,t);if(e)return e;}const p=G.battlePhasePoint(sc,u?.g||u?.n,t,g.point);return pj(...p);};
  const isEst=g=>g.estimated||motionPlan().estimated.has(g.members[0]);
  const selectionGroup=id=>groups.find(g=>g.id===id&&(g.point||sc.atlasPlan||sc.atlasSchematic))||estGroups.find(g=>g.id===id)||groups.find(g=>g.members.includes(id)&&(g.point||sc.atlasPlan||sc.atlasSchematic))||estGroups.find(g=>g.members.includes(id))||groups.find(g=>g.id===id||g.members.includes(id));
  const labelSlots=new Map();
  const selectionPortraits=[];
  function selectionPanel(ids){const el=cv.closest('.battle-stage')?.querySelector('.atlas-selection');if(!el)return;selectionPortraits.length=0;el.replaceChildren();el.hidden=!ids.length;if(!ids.length)return;
   const header=document.createElement('div');header.className='atlas-selection-header';const head=document.createElement('strong');head.textContent=ids.length>1?'部隊を選ぶ':'部隊の記録';header.append(head);el.append(header);
   if(!sc.atlasPlan&&!sc.atlasSchematic&&ids.length){const focus=document.createElement('button');focus.type='button';focus.className='mini';focus.textContent='この周辺を見る';focus.onclick=()=>focusSelection(selected||ids[0]);header.append(focus);}
   const close=document.createElement('button');close.type='button';close.textContent='閉じる';close.setAttribute('aria-label','部隊の記録を閉じる');close.className='mini';close.onclick=()=>{selected=null;selectionPortraits.length=0;el.hidden=true;frameDraw();};header.append(close);const list=document.createElement('div');list.className='atlas-selection-choices';el.append(list);
   for(const id of ids){const g=selectionGroup(id);if(!g)continue;const u=unitById.get(g.members[0]);if(!u)continue;const button=document.createElement('button');button.type='button';button.className='atlas-unit-choice';button.dataset.unitId=u.id;const face=opt.face?.(u.g,14,COL[sideOf(u)]);if(face){const im=document.createElement('img');im.src=face.toDataURL();im.width=28;im.height=28;im.alt='';button.append(im);selectionPortraits.push({u,im,side:sideOf(u)});}const name=document.createElement('span');name.textContent=u.g||u.n;button.append(name);button.setAttribute('aria-pressed',String(selected===g.id||selected===g.parentId||g.members.includes(selected)));button.onclick=()=>{selected=g.id;for(const b of list.children)if(b.dataset?.unitId)b.setAttribute('aria-pressed',String(b===button));frameDraw();};list.append(button);}
  }
  const homeCache={};function opponentHomePoint(side){if(side in homeCache)return homeCache[side];const st=G.S?.(),clan=sc.sides?.[side]?.clan,cap=st?.clans?.[clan]?.cap,C=cap&&G.C[cap];return homeCache[side]=C?[TKGEO.LON0+C.x/TKGEO.K/TKGEO.CX,TKGEO.LAT0-C.y/TKGEO.K]:null;}
  const opponentHome=side=>{const p=opponentHomePoint(side);return p&&pj(...p);};
  // 参陣前・退去後の将を同じ陣地に残さない。
  const visibleFrom=u=>G.battleUnitWindow(sc,u).from;
  const visible=u=>G.battleUnitVisible(sc,u,t);
  const sideOf=u=>u.turn&&t>=u.turn[0]?(u.turn[1]||'a'):u.side;
  function refreshSelectionPortraits(){for(const item of selectionPortraits){const side=sideOf(item.u);if(side===item.side)continue;item.side=side;const face=opt.face?.(item.u.g,14,COL[side]);if(face)item.im.src=face.toDataURL();}}
  const isDead=u=>u.die!=null&&t>=u.die,isRouted=u=>u.rout!=null&&t>u.rout;
  // 段階移動の通過点。典拠点を結んだ線のうち、現在位置までを返す。
  function traversed(move,P){const line=G.battlePhaseGeometry(move).map(p=>wp(...p)),f=clamp((t-move.from)/(move.to-move.from),0,1);let total=0;const cum=[0];for(let i=1;i<line.length;i++){total+=Math.hypot(line[i][0]-line[i-1][0],line[i][1]-line[i-1][1]);cum.push(total);}const d=f*total,out=[line[0]];for(let i=1;i<line.length&&cum[i]<=d;i++)out.push(line[i]);out.push(P);return out;}
  const locatedGroups=()=>[...groups.filter(mapped),...estGroups.filter(g=>motionPlan().placed.has(g.members[0]))].filter(g=>visible(unitById.get(g.members[0])||{}));
  function groupDraw(dt,now,playing){const located=locatedGroups(),pins=located.map(pinFor),named=[...(placeLabels.get(bg)||[])];
   groupOf.clear();located.forEach((g,i)=>groupOf.set(g.members[0],{g,pin:pins[i]}));
   const kb=clamp(W/760,.62,1.1),small=W<560;
   // 駒は投影地点に固定する。同地点の隊も別の地理位置へ押し離さず、名札だけを分ける。
   const disp=pins,foreground=[];
   const nearby=pins.map((p,i)=>Math.min(Infinity,...pins.filter((q,j)=>i!==j&&inside(...q)).map(q=>Math.hypot(q[0]-p[0],q[1]-p[1]))));
   // 交戦の組（beats の第3要素）。開城・撤退へ進んだら以前の交戦を止める。
   const stage=(sc.beats||[]).filter(b=>b[0]<=t).at(-1),beat=stage?.[2]?.length?stage:null,active=new Set(beat?beat[2]:[]),clashK=beat?Math.max(.35,1-(t-beat[0])/16):0;
   // 局地図の全体はそのまま名前を読む。広域の全体だけ選択時に名前を絞る。
   const frameWidthKm=(meta.bounds[2]-meta.bounds[0])*111.32*Math.cos((meta.bounds[1]+meta.bounds[3])*Math.PI/360),overview=views.length>1&&viewIndex===0&&VS===1&&frameWidthKm>6;
   const labelItems=located.map((g,index)=>({g,index,point:g.point,pin:pins[index],selected:selected===g.id||selected===g.parentId||g.members.includes(selected)})).filter(q=>inside(...q.pin)),buckets=labelBuckets(labelItems);
   const decorationById=new Map(labelItems.map(q=>[q.g.id,q.selected&&nearby[q.index]>=(small?38:58)]));
   const rows=[],anchorRects=labelItems.map(q=>{const full=decorationById.get(q.g.id);return {id:q.g.id,x:q.pin[0]-(full?(small?23:34):(small?12:17)),y:q.pin[1]-(full?(small?27:45):(small?12:17)),w:full?(small?48:75):(small?24:34),h:full?(small?42:64):(small?24:34)};});
   const livePin=id=>{const r=groupOf.get(id);if(!r)return null;const u=unitById.get(id);return u&&!isDead(u)?r.pin:null;};
   if(beat)for(let i=0;i+1<beat[2].length;i+=2){const a=livePin(beat[2][i]),b=livePin(beat[2][i+1]);if(!a||!b)continue;const d=Math.hypot(a[0]-b[0],a[1]-b[1]);
    if(d<Math.max(150,W*.28)){const mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2;fx.clash(ctx,mx,my,now,clashK,kb);if(playing&&fx.rnd()<dt*40*clashK)fx.spawn(mx+(fx.rnd()-.5)*16,my+(fx.rnd()-.5)*10,'spark');if(playing&&fx.rnd()<dt*14*clashK)fx.spawn(mx,my,'dust');}
    else for(const p of [a,b]){fx.ring(ctx,p[0],p[1],now,clashK,small?18:22);if(playing&&fx.rnd()<dt*8*clashK)fx.spawn(p[0],p[1],'dust');}}
   // 段階移動の足跡は駒より下に描く。
   const arrowHead=(pts,col,est)=>{const b=pts.at(-1);let a=null;for(let k=pts.length-2;k>=0;k--)if(Math.hypot(b[0]-pts[k][0],b[1]-pts[k][1])>3){a=pts[k];break;}if(!a)return;const ang=Math.atan2(b[1]-a[1],b[0]-a[0]),r=(est?6:8)*kb;ctx.save();ctx.translate(b[0],b[1]);ctx.rotate(ang);ctx.beginPath();ctx.moveTo(r*1.5,0);ctx.lineTo(-r*.5,r*.8);ctx.lineTo(-r*.5,-r*.8);ctx.closePath();ctx.fillStyle=col;ctx.globalAlpha*=est?.6:.85;ctx.fill();ctx.strokeStyle='rgba(255,252,240,.8)';ctx.lineWidth=1;ctx.stroke();ctx.restore();};
   for(const [index,g]of located.entries()){const u=unitById.get(g.members[0]);const move=u&&moveByName.get(u.g||u.n),sel=selected===g.id||selected===g.parentId||g.members.includes(selected),fade=move?clamp(1-(t-move.to)/8,0,1):0;if(!sel&&!(animate&&u&&!isDead(u)&&(move?t>move.from&&fade>0:active.has(u.id))))continue;const col=COL[sideOf(u)]||COL.unknown;ctx.save();if(!sel&&move)ctx.globalAlpha=fade;if(move&&t>move.from){const pts=traversed(move,pins[index]);fx.trail(ctx,pts,col,kb);if(!sel||t<move.to)arrowHead(pts,col,false);}else if(u&&isEst(g)&&t>0){const from=visibleFrom(u),pts=[];for(let k=0;k<=24;k++){const tt=from+(t-from)*k/24,p=estAt(g,tt);if(p)pts.push(p);}let len=0;for(let k=1;k<pts.length;k++)len+=Math.hypot(pts[k][0]-pts[k-1][0],pts[k][1]-pts[k-1][1]);if(len>6){fx.trail(ctx,pts,col,kb,true);if(!sel)arrowHead(pts,col,true);}}ctx.restore();}
   for(const [index,g]of located.entries()){const u=unitById.get(g.members[0]);if(!u)continue;const [x,y]=disp[index],[px0,py0]=pins[index],sel=selected===g.id||selected===g.parentId||g.members.includes(selected),side=sideOf(u),dead=isDead(u),routed=isRouted(u),col=dead?'#8a8174':u.turn&&t>=u.turn[0]?'#b47712':COL[side]||COL.unknown;
    if(!inside(x,y))continue;
    ctx.save();const from=visibleFrom(u);let alpha=from&&from<100?clamp((t-from)/2,0,1):1;if(dead)alpha*=clamp(1-(t-u.die)/10,.32,1);else if(routed)alpha*=clamp(1-(t-u.rout)/14,.45,1);ctx.globalAlpha=alpha;
    const move=moveByName.get(u.g||u.n),moving=move&&t>move.from&&t<move.to;let aim=null;
    if(move&&t>move.from){const f=G.battlePhasePoint(sc,u.g||u.n,Math.min(move.to,t+.05),g.point),p=G.battlePhasePoint(sc,u.g||u.n,Math.max(move.from,Math.min(move.to,t)-.05),g.point),A=pj(...p),B=pj(...f);if(Math.hypot(B[0]-A[0],B[1]-A[1])>1e-6)aim=[B[0]-A[0],B[1]-A[1]];}
    const est=isEst(g);if(!aim&&est&&!isDead(u)){const a=estAt(g,Math.max(0,t-.8)),b=estAt(g,Math.min(100,t+.8));if(a&&b&&Math.hypot(b[0]-a[0],b[1]-a[1])>1.2)aim=[b[0]-a[0],b[1]-a[1]];}
    if(!aim){let best=Infinity;for(const [j,q] of located.entries()){const v=unitById.get(q.members[0]),op=sideOf(v);if(op===side||isDead(v))continue;const a=pins[j],d=Math.hypot(a[0]-px0,a[1]-py0);if(d>1&&d<best){best=d;aim=[a[0]-px0,a[1]-py0];}}}
    // 相手側の位置が記録にない（攻め口不詳の攻城など）場合、全隊が上を向いたまま始まるのを避け、相手の本拠の方角（来た方角）へ向ける。
    if(!aim&&sc.atlasSchematic)aim=[side==='a'?1:-1,0];
    if(!aim){const op=side==='a'?'b':'a',home=opponentHome(op);if(home){const d=[home[0]-px0,home[1]-py0];if(Math.hypot(...d)>1)aim=d;}}
    const target=aim?Math.atan2(aim[1],aim[0])+Math.PI/2:undefined,ang=fx.heading(g.id,target,dt,!playing||lastSnap);
    const estMoving=est&&!isDead(u)&&(()=>{const a=estAt(g,Math.max(0,t-.5)),b=estAt(g,Math.min(100,t+.5));return a&&b&&Math.hypot(b[0]-a[0],b[1]-a[1])>.8;})();
    if((moving||estMoving)&&playing&&fx.rnd()<dt*10)fx.spawn(x,y,'dust');
    const counterScale=Math.max(small?14/16:16/22,Math.min(1,nearby[index]/((small?16:22)*1.25+2)));
    const decorate=decorationById.get(g.id);
    const paintCounter=()=>{ctx.save();ctx.globalAlpha=alpha;
    ctx.save();ctx.translate(x,y);if(Number.isFinite(ang))ctx.rotate(ang);const cw=(small?16:22)*counterScale,ch=(small?11:15)*counterScale;TKCounter.path(ctx,cw,ch);ctx.fillStyle=col;ctx.fill();TKCounter.path(ctx,cw,ch);ctx.strokeStyle=sel?'#e5ad3f':'#2a1d10';ctx.lineWidth=sel?2:active.has(u.id)?1.5:1.1;ctx.lineJoin='round';ctx.setLineDash(g.estimated?[3,2]:[]);ctx.stroke();ctx.restore();
    if(decorate){
    const crestKey=G.armyCrestKey({clan:u.clan,gens:[],commanders:[u.g||u.n],until:sc.title}),crest=G.kamonImage(crestKey,11),family=crestKey&&TK.CLANS[crestKey]?G.CN(crestKey):u.clan&&TK.CLANS[u.clan]?G.CN(u.clan):'';const flagK=Math.max(small?.55:.7,(small?.55:1)*counterScale),flagX=clamp(x+(small?11:19),4,W-19*flagK-3),flagY=clamp(y,42*flagK+3,H-10*flagK-3);fx.flag(ctx,flagX,flagY,flagK,col,crest,now,playing&&!dead,family?family.replace(/家$/,'').slice(0,1):'');
    }if(dead)fx.cross(ctx,x,y);if(decorate){
}ctx.restore();};
    if(sel)foreground.push(paintCounter);else paintCounter();
    // 鉄砲：記録の射撃区間（fire）か、鉄砲隊が交戦中の間、相手へ向けて発砲の閃光と煙を出す。射線は引かない。
    const firing=!dead&&!routed&&(u.fire?t>=u.fire[0]&&t<=u.fire[1]:u.arm==='teppo'&&active.has(u.id));
    if(firing){let tp=u.fireTarget?livePin(u.fireTarget):null;if(!tp){let best=Infinity;for(const [j,q] of located.entries()){const v=unitById.get(q.members[0]);if(sideOf(v)===side||isDead(v))continue;const d=Math.hypot(pins[j][0]-x,pins[j][1]-y);if(d>1&&d<best){best=d;tp=pins[j];}}}
     if(tp){const dir=Math.atan2(tp[1]-y,tp[0]-x),fxp=[x+Math.cos(dir)*16*kb,y+Math.sin(dir)*16*kb];if(playing&&fx.rnd()<dt*16){fx.spawn(fxp[0]+(fx.rnd()-.5)*12,fxp[1]+(fx.rnd()-.5)*12,'flash',dir);fx.spawn(fxp[0],fxp[1],'smoke',dir);}}}
    const status=dead?'討死':routed?'退却':'';rows.push({g,u,pin:[x,y],sel,col,alpha,status,decorate});
    boxes.push(small?{x:x-20,y:y-20,w:40,h:40,id:g.id}:{x:x-22,y:y-22,w:44,h:44,id:g.id});ctx.restore();
   }
   for(const paint of foreground)paint();
   // 選択した名札を先に予約。地理点ではなく、顔・名前を収める表示カードだけを配置する。
   const rowById=new Map(rows.map(r=>[r.g.id,r])),labelPlans=buckets.map(b=>{const rs=b.items.map(q=>rowById.get(q.g.id)).filter(Boolean),chosen=rs.find(r=>r.sel);return {items:overview?(chosen?[chosen]:[]):rs,chosen,anchorIds:b.items.map(q=>q.g.id),key:b.items.map(q=>q.g.id).join('|')};}).filter(b=>b.items.length).sort((a,b)=>Number(!!b.chosen)-Number(!!a.chosen));
   const liveKeys=new Set(labelPlans.map(b=>b.key));for(const key of labelSlots.keys())if(!liveKeys.has(key))labelSlots.delete(key);
   for(const plan of labelPlans){let rs=plan.items;if(rs.length>5){if(!plan.chosen)continue;rs=[plan.chosen];}const size=small?11:12,rowHeight=small?18:20;ctx.font=`500 ${size}px ${FONT}`;const w=Math.ceil(Math.max(...rs.map(r=>ctx.measureText((r.u.g||r.u.n)+(r.status?'・'+r.status:'')).width+(r.sel?24:8)))),h=rs.length*rowHeight,pin=(plan.chosen||rs[0]).pin;
    const placed=labelPlacement({pin,w,h,ornaments:false,ids:plan.anchorIds},{W,H,small,named,anchors:anchorRects,previous:labelSlots.get(plan.key)});if(!placed)continue;labelSlots.set(plan.key,placed.slot);const b=placed.box;
    for(const [i,r] of rs.entries()){const row={x:b.x,y:b.y+i*rowHeight,w:b.w,h:rowHeight,id:r.g.id,label:true};ctx.save();ctx.globalAlpha=r.alpha;
     if(r.sel){ctx.fillStyle='rgba(253,250,239,.84)';ctx.fillRect(row.x,row.y,row.w,row.h);const face=opt.face?.(r.u.g||r.u.n,8,r.col);if(face)ctx.drawImage(face,row.x+2,row.y+(rowHeight-16)/2,16,16);}
     const label=(r.u.g||r.u.n)+(r.status?'・'+r.status:''),tx=row.x+(r.sel?22:4),ty=row.y+row.h/2+.5;ctx.font=`${r.sel?650:500} ${size}px ${FONT}`;ctx.textAlign='left';ctx.textBaseline='middle';ctx.strokeStyle='rgba(250,248,237,.94)';ctx.lineWidth=2.5;ctx.lineJoin='round';ctx.strokeText(label,tx,ty);ctx.fillStyle=r.status?'#71362d':'#30372f';ctx.fillText(label,tx,ty);ctx.restore();boxes.push(row);}
    named.push(b);
   }
   const estCount=located.filter(isEst).length;
   cv.dataset.estimatedGroups=String(estCount);cv.dataset.estimatedPlaced=String(located.filter(g=>g.estimated).length);cv.dataset.motionBasis=sc.atlasSchematic?'documented-sequence-schematic':motionPlan().basis;cv.dataset.schematicGroups=String(located.filter(g=>sc.atlasSchematic?.paths?.[g.members[0]]).length);
   lastSnap=!playing;
   cv.dataset.mapGroups=String(groups.length);cv.dataset.mapParticipants=String(groups.reduce((n,g)=>n+g.members.length,0));cv.dataset.locatedGroups=String(located.length);
  }
  function frameDraw(dt=0,now=performance.now()){if(dead)return;if(follow&&dt>0&&controller?.playing&&groups.length&&!sc.atlasPlan&&!sc.atlasSchematic&&bg)followBeat();const to=glideStep(now);try{frameBody(dt,now,to);}finally{if(to)[VS,VX,VY]=to;}}
  function frameBody(dt,now,to){refreshSelectionPortraits();cv.style.visibility=data||sc.atlasPlan||error?'visible':'hidden';cv.parentElement.classList.toggle('atlas-loading',!data&&!sc.atlasPlan&&!error);if(!bg)return;ctx.setTransform(D,0,0,D,0,0);ctx.clearRect(0,0,W,H);ground(to);cv.dataset.viewScale=VS.toFixed(3);cv.dataset.viewFollow=String(follow);boxes.length=0;const playing=controller?.playing&&dt>0;
   if(groups.length){groupDraw(dt,now,playing);fx.step(dt);ctx.save();fx.draw(ctx);ctx.restore();fx.weather(ctx,W,H,sc,t,now);cv.dataset.fxParts=String(fx.count);cv.dataset.mapReady=data||sc.atlasPlan?'true':'false';cv.dataset.mapUnits=String(groups.length);return;}
   const pins=units.map(u=>u.point?pj(...u.point):[u.x*W,u.y*H]);
   for(const [index,u] of units.entries()){const [x,y]=pins[index],col=COL[u.side]||COL.unknown,sel=selected===u.id,r=W>650?10:7;
    ctx.save();ctx.translate(x,y);ctx.rotate(u.angle||0);ctx.beginPath();ctx.moveTo(-r,-r*.25);ctx.lineTo(-r*.36,-r*.25);ctx.lineTo(-r*.36,-r);ctx.lineTo(r*.36,-r);ctx.lineTo(r*.36,-r*.25);ctx.lineTo(r,-r*.25);ctx.lineTo(r,r*.65);ctx.lineTo(-r,r*.65);ctx.closePath();ctx.fillStyle=col;ctx.fill();ctx.lineWidth=sel?3:1.4;ctx.strokeStyle=sel?'#e4ac28':'#fffdf0';ctx.stroke();ctx.restore();
    // 文字だけをずらし、部隊の位置は保持。引出線は付けない。
    const txt=u.label||u.name||u.g,size=W>650?12:10;ctx.font=`600 ${size}px sans-serif`;const tw=ctx.measureText(txt).width+8,bh=size+7,candidates=[];
    for(let row=-6;row<=6;row++)for(let col=-3;col<=3;col++){const bx=clamp(x-tw/2+col*(tw/2+8),4,W-tw-4),by=clamp(y+14+row*(bh+3),4,H-bh-42);candidates.push({bx,by,d:Math.hypot(bx+tw/2-x,by+bh/2-y)});}
    candidates.sort((a,b)=>a.d-b.d);
    const free=p=>!boxes.some(b=>p.bx<b.x+b.w+2&&p.bx+tw+2>b.x&&p.by<b.y+b.h+2&&p.by+bh+2>b.y)&&!pins.some(q=>p.bx<q[0]+10&&p.bx+tw>q[0]-10&&p.by<q[1]+10&&p.by+bh>q[1]-10);
    const place=candidates.find(free)||candidates[0];const {bx,by}=place;
    boxes.push({x:bx,y:by,w:tw,h:bh,id:u.id});text(ctx,txt,bx+tw/2,by+bh/2,size,col);
    if(sel){const im=opt.face?.(u.g||u.name,19,col);if(im)ctx.drawImage(im,clamp(x-20,0,W-40),clamp(y-56,0,H-40),40,40);}
   }
   cv.dataset.mapReady=data||sc.atlasPlan?'true':'false';cv.dataset.mapUnits=String(units.length);
  }
  // 範囲の広い合戦は、隊の位置のまとまり（地区）ごとに拡大して見られるようにする。
  function focusSelection(id,minScale=VS,draw=true){const g=selectionGroup(id),p=g&&pinFor(g);if(!p)return;const base=[(p[0]+VX)/VS,(p[1]+VY)/VS],near=locatedGroups().filter(q=>q.id!==g.id).map(q=>pinFor(q)).filter(Boolean).map(q=>Math.hypot(q[0]-p[0],q[1]-p[1])/VS).filter(d=>d>1e-6),nearest=Math.min(Infinity,...near),scale=clamp(Number.isFinite(nearest)?64/nearest:VS*2,Math.max(minScale,2),6);
   if(!views.length)views=[{name:'全体',s:1,x:0,y:0}];views=views.filter(v=>!v.selectionFocus);views.push({name:'選択部隊の周辺',selectionFocus:true,selectionId:g.id,s:scale,x:clamp(base[0]*scale-W/2,0,W*scale-W),y:clamp(base[1]*scale-H/2,0,H*scale-H)});viewIndex=views.length-1;const v=views[viewIndex];if(draw){follow=false;renderViews();setView(v.s,v.x,v.y,520);}else{[VS,VX,VY]=[v.s,v.x,v.y];motion=null;renderViews();}}
  function refreshViews(){const previous=views[viewIndex],previousName=previous?.name;VS=1;VX=0;VY=0;const pts=groups.filter(g=>g.point).map(g=>({g,p:pj(...g.point)}));const th=Math.min(W,H)*.2,cl=[];
   for(const q of pts){const hit=cl.filter(c=>c.some(o=>Math.hypot(o.p[0]-q.p[0],o.p[1]-q.p[1])<th));if(!hit.length)cl.push([q]);else{const m=hit.flat();for(const h of hit)cl.splice(cl.indexOf(h),1);cl.push([...m,q]);}}
   const xs=pts.map(q=>q.p[0]),ys=pts.map(q=>q.p[1]),spread=pts.length?Math.max(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys)):0;
   views=[];if(pts.length>=8&&cl.length>=2&&spread>Math.min(W,H)*.5&&!sc.atlasPlan&&!sc.atlasSchematic){views.push({name:'全体',s:1,x:0,y:0});
    for(const c of cl.sort((a,b)=>b.length-a.length).slice(0,4)){const cx=c.reduce((n,q)=>n+q.p[0],0)/c.length,cy=c.reduce((n,q)=>n+q.p[1],0)/c.length;
     const marks=[...(sc.atlasLandmarks||[]).map(m=>({name:m.name,lon:m.point[0],lat:m.point[1]})),...(meta.points||[])],named=marks.map(pt=>({n:pt.name,d:Math.hypot(...pj(pt.lon,pt.lat).map((v,i)=>v-[cx,cy][i]))})).filter(m=>!views.some(v=>v.name===m.n+'付近')).sort((a,b)=>a.d-b.d)[0];
     const person=unitById.get(c[0].g.members[0]),personName=person?.g||person?.n||c[0].g.label,name=named&&named.d<Math.min(W,H)*.3?named.n+'付近':(personName?personName+'の周辺':null);if(!name||views.some(v=>v.name===name))continue;
     const bw=Math.max(...c.map(q=>q.p[0]))-Math.min(...c.map(q=>q.p[0]))+Math.min(W,H)*.3,bh=Math.max(...c.map(q=>q.p[1]))-Math.min(...c.map(q=>q.p[1]))+Math.min(W,H)*.3,z=clamp(Math.min(W/bw,H/bh),1.4,3.5);
     views.push({name,s:z,x:clamp(cx*z-W/2,0,W*z-W),y:clamp(cy*z-H/2,0,H*z-H)});}}
   if(views.length<3)views=[];
   views=views.map((v,i)=>({...v,id:i?'automatic:'+v.name:'overview'}));
   const presentation=!sc.atlasPlan&&!sc.atlasSchematic?meta.viewPresentation:null;
   if(presentation){
    if(!Array.isArray(presentation.views))throw Error('Invalid declared views');
    const declared=presentation.views.map(spec=>landmarkView(spec,sc,meta,W,H)),ids=declared.map(v=>v.id);
    if(new Set(ids).size!==ids.length||ids.some(id=>id==='overview'||id.startsWith('automatic:')))throw Error('Duplicate/reserved declared view ID');
    if(presentation.initialView&&!ids.includes(presentation.initialView)&&presentation.initialView!=='overview')throw Error('Missing initial declared view');
    if(declared.length)views=[{id:'overview',name:'全体',s:1,x:0,y:0},...declared];
   }
   const key=previous?.id,initial=!viewInitialized?presentation?.initialView:null;
   viewIndex=Math.max(0,views.findIndex(v=>initial?v.id===initial:key?v.id===key:v.name===previousName));viewInitialized=true;
   const v=views[viewIndex];[VS,VX,VY]=v?[v.s,v.x,v.y]:[1,0,0];motion=null;
   if(previous?.selectionFocus){focusSelection(previous.selectionId,previous.s,false);return;}renderViews();}
  function renderViews(){followButton();const stage=cv.closest('.battle-stage');if(!stage)return;let bar=stage.querySelector('.atlas-views');if(!views.length){bar?.remove();return;}
   if(!bar){bar=document.createElement('div');bar.className='atlas-views';bar.setAttribute('role','group');bar.setAttribute('aria-label','全体と地区を切り替える');bar.title='全体では駒を選んで名前を確認できます。地区では近くの部隊名を表示します。';stage.insertBefore(bar,stage.firstChild);}
   bar.style.display='flex';bar.style.flexWrap=W<560?'nowrap':'';
   if(W<560){
    const choose=i=>{const keepFocus=document.activeElement===select?'select':document.activeElement===all?'button':null;viewIndex=i;const v=views[i];follow=false;renderViews();if(keepFocus)bar.querySelector(keepFocus)?.focus({preventScroll:true});setView(v.s,v.x,v.y,520);};
    const all=document.createElement('button');all.type='button';all.className='mini';all.textContent='全体';all.setAttribute('aria-pressed',String(viewIndex===0));all.onclick=()=>choose(0);
    const select=document.createElement('select');select.className='mini';select.setAttribute('aria-label','詳しく見る地区');select.style.minWidth='0';select.style.flex='1';
    const prompt=document.createElement('option');prompt.value='';prompt.textContent='地区を選ぶ';select.append(prompt);
    for(let i=1;i<views.length;i++){const option=document.createElement('option');option.value=String(i);option.textContent=views[i].name;select.append(option);}
    select.value=viewIndex?String(viewIndex):'';select.onchange=()=>choose(select.value?Number(select.value):0);bar.replaceChildren(all,select);cv.dataset.atlasViews=String(views.length);return;
   }
   bar.replaceChildren(...views.map((v,i)=>{const b=document.createElement('button');b.type='button';b.className='mini';b.textContent=v.name;b.setAttribute('aria-pressed',String(i===viewIndex));b.onclick=()=>{viewIndex=i;follow=false;renderViews();setView(v.s,v.x,v.y,520);};return b;}));cv.dataset.atlasViews=String(views.length);}
  // 全経過文の最大高を幅ごとに予約し、再生する文が変わっても図を伸縮させない。
  let dockWidth=-1;
  function reserveDock(dock){
   if(!dock?.cloneNode)return;
   const width=Math.round(dock.getBoundingClientRect().width);if(!width||width===dockWidth)return;dockWidth=width;
   const probe=dock.cloneNode(true),now=probe.querySelector('#bNow'),clock=probe.querySelector('#bClock');
   for(const el of probe.querySelectorAll('[id]'))el.removeAttribute('id');
   probe.setAttribute('aria-hidden','true');Object.assign(probe.style,{position:'fixed',visibility:'hidden',pointerEvents:'none',width:width+'px',minHeight:'0',height:'auto',left:'0',top:'0',bottom:'auto'});
   dock.parentElement.append(probe);
   try{
    if(clock){let max=0,text='';for(const mark of [[0,'経過を読む'],...(sc.calendar||[[0,'布陣'],[20,'交戦'],[80,'終盤'],[100,'終了']])]){clock.textContent=mark[1];const h=clock.getBoundingClientRect().height;if(h>max){max=h;text=mark[1];}}clock.textContent=text;}
    let height=probe.getBoundingClientRect().height;for(const beat of sc.beats||[]){if(now)now.textContent=beat[1]||'　';height=Math.max(height,probe.getBoundingClientRect().height);}dock.style.minHeight=Math.ceil(height)+'px';
   }finally{probe.remove();}
  }
  function size(){const dockEl=cv.closest('.battle-stage')?.querySelector('.battle-dock');reserveDock(dockEl);const r=cv.parentElement.getBoundingClientRect(),dock=cv.closest('.battle-stage')?.querySelector('.battle-dock')?.getBoundingClientRect().height||110,top=r.top+(cv.closest('.mbox')?.scrollTop||0),selectionRoom=cv.closest('.battle-stage')?.querySelector('.atlas-selection')?(r.width<560?144:104):0,room=Math.max(240,(innerHeight-Math.max(0,top)-dock-selectionRoom-28)/aspect),next=Math.max(240,Math.round(Math.min(r.width,room))),d=Math.min(2,devicePixelRatio||1);if(next===W&&d===D&&bg)return;W=next;H=Math.round(W*aspect);D=d;cv.style.width=W+'px';cv.style.height=H+'px';cv.style.margin='0 auto';cv.width=W*D;cv.height=H*D;glide=null;followKey='';refreshViews();backdrop();frameDraw();}
  // 再生中・粉が残る間・停止直後の静止描画を、一つの描画ループで行う。停止後は粉が消えると止まる（雨・霧は静止画で描く）。
  function loop(now){if(dead){fxRaf=0;return;}const dt=fxLast?Math.min(.1,(now-fxLast)/1000):0;fxLast=now;const live=controller.playing||fx.count>0||!!glide;frameDraw(live?dt:0,now);if(!live){fxRaf=0;fxLast=0;return;}fxRaf=requestAnimationFrame(loop);}
  function wake(){if(!fxRaf){fxLast=0;fxRaf=requestAnimationFrame(loop);}}
  let controller=null;controller=TKBattlePresentation.record(cv,sc,{...opt,onProgress(v){t=v;opt.onProgress?.(v);wake();if(!controller?.playing){const key=Math.floor(t*20)+'|'+selected+'|'+sc.units.filter(u=>u.turn&&t>=u.turn[0]).map(u=>u.id).join(',');if(key!==lastKey){lastKey=key;frameDraw();}}}});
  const onClick=e=>{const r=cv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top,hit=boxes.filter(b=>x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h);if(hit.length){
   const centerHit=locatedGroups().find(q=>{const p=pinFor(q);return p&&inside(...p)&&Math.hypot(p[0]-x,p[1]-y)<6;}),label=centerHit?null:hit.findLast(b=>b.label);selected=centerHit?.id||(label||hit[0]).id;
   const g=selectionGroup(selected);
   if(label)selectionPanel([selected]);
   else if(g){const p=pinFor(g),ids=locatedGroups().filter(q=>{const pin=pinFor(q);return p&&pin&&inside(...pin)&&Math.hypot(pin[0]-p[0],pin[1]-p[1])<20;}).map(q=>q.id);selectionPanel(ids);}
   frameDraw();
  }};

  cv.addEventListener('click',onClick);const ro=new ResizeObserver(size);size();ro.observe(cv.parentElement);const dock=cv.closest('.battle-stage')?.querySelector('.battle-dock');if(dock)ro.observe(dock);document.fonts?.ready.then(()=>{if(!dead){dockWidth=-1;size();}});
  if(!sc.atlasSchematic)load(meta).then(d=>{if(dead)return;data=d;backdrop();frameDraw();if(pendingPlay){pendingPlay=false;controller.play();}}).catch(()=>{if(dead)return;error='地形を読み込めません。ページを再読み込みしてください。';backdrop();frameDraw();});
  return {...controller,play(){if(!data&&!sc.atlasPlan){pendingPlay=true;return;}controller.play();wake();},pause(){pendingPlay=false;controller.pause();},seek(v){controller.seek(v);fx.clear();lastSnap=true;followKey='';frameDraw();},get playing(){return pendingPlay||controller.playing;},get t(){return controller.t;},get ended(){return controller.ended;},get speed(){return controller.speed;},select(id){const u=unitById.get(id);if(u){const {from,until}=G.battleUnitWindow(sc,u);if(!visible(u)){controller.seek(t<from?Math.min(from+2,(from+until)/2,100):Math.max(from,until-1));fx.clear();lastSnap=true;}}selected=id;selectionPanel([id]);frameDraw();},unitStates(){return groups.map(g=>{const u=unitById.get(g.members[0]),move=moveByName.get(u.g||u.n),side=sideOf(u),status=t>=G.battleUnitWindow(sc,u).until?(sc.mapExitLabels?.[u.id]||'退去'):t<(sc.mapVisibleFrom?.[u.id]||0)?'参陣前':t<(u.from||0)?'着陣前':u.die!=null&&t>=u.die?'討死':u.rout!=null&&t>u.rout?'退却':move&&t>move.from&&t<move.to?'移動中':G.battleActiveUnits(sc,t).includes(u.id)?'交戦':t>=100?'戦闘終了':sc.atlasSchematic?(u.side==='b'?'守備':u.id===sc.atlasSchematic.lead&&t>=sc.atlasSchematic.capturedAt?'攻略':'攻撃命令'):'布陣';const schematic=!!(sc.atlasSchematic||sc.atlasPlan),drawGroup=g.point||schematic?g:estGroups.find(e=>e.members[0]===u.id)||g,screenPoint=pinFor(drawGroup);return {id:u.id,side,status,visible:visible(u),point:g.point?G.battlePhasePoint(sc,u.g||u.n,t,g.point):null,screenPoint,renderedPoint:!schematic&&screenPoint?unproject(screenPoint):null,positionBasis:schematic?'schematic':!screenPoint?'unplaced':!g.point?'estimated-placement':isEst(g)?'estimated-motion':'recorded'};});},destroy(){dead=true;cv.closest('.battle-stage')?.querySelector('.atlas-views')?.remove();cv.closest('.battle-stage')?.querySelector('.atlas-follow')?.remove();if(fxRaf)cancelAnimationFrame(fxRaf);fxRaf=0;controller.destroy();ro.disconnect();cv.removeEventListener('click',onClick);}};
 }
 return {make,landmarkView,reliefContours,reliefTransform,shadeRelief,reliefRasterRect,labelBuckets,labelPlacement,preload(title){const m=TK.BATTLE_ATLAS[title];return m&&!TK.BATTLES[title]?.atlasSchematic?load(m):Promise.resolve(null);}};
})();
