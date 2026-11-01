"use strict";
/* 地形と部隊の史料は独立。位置の根拠のない人物を、画面上の空き場所へ配置しない。 */
window.TKBattleAtlas=(function(){
 const cache=new Map(),decoded=new Map(),backgrounds=new Map(),COL={a:'#c83339',b:'#216d9f',unknown:'#665b49'};
 const FONT='"Shippori Mincho B1","Hiragino Mincho ProN","Yu Mincho",serif';
 const palettes=['#dce9cd','#cce0b9','#b6d39f','#9dc48a','#82b373','#6c9e62','#5b8855','#4b744b'];
 function load(meta){let p=cache.get(meta.file);if(!p){p=fetch('atlas/'+meta.file).then(r=>{if(!r.ok)throw Error('地形データを読めません');return r.json();}).then(d=>{const raw=atob(d.heights),a=new Int16Array(d.width*d.height);for(let i=0;i<a.length;i++)a[i]=(raw.charCodeAt(i*2)+raw.charCodeAt(i*2+1)*256)-32768;d.values=a;decoded.set(meta.file,d);if(decoded.size>12)decoded.delete(decoded.keys().next().value);return d;});cache.set(meta.file,p);if(cache.size>12)cache.delete(cache.keys().next().value);}return p;}
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function make(cv,sc,opt){
  const title=opt.title,meta=TK.BATTLE_ATLAS[title],ctx=cv.getContext('2d');let W=0,H=0,D=1,bg=null,data=decoded.get(meta.file)||null,dead=false,selected=null,error='',lastKey='',frame;
  let t=0,pendingPlay=false;const groups=(sc.atlasGroups||[]).flatMap(g=>g.members.map((id,i)=>({...g,id:g.id+'-'+i,label:sc.units.find(u=>u.id===id)?.g||g.label,members:[id],parentId:g.id,point:g.point}))),units=sc.atlasUnits||[],notes=sc.atlasNotes||[],aspect=sc.atlasPlan?1100/1050:.7;
  const unitById=new Map(sc.units.map(u=>[u.id,u])),moveByName=new Map((TK.BATTLE_MOVEMENTS[sc.title]||[]).map(m=>[m.name,m]));
  const pj=(lo,la)=>[(lo-meta.bounds[0])/(meta.bounds[2]-meta.bounds[0])*W,(meta.bounds[1]-la)/(meta.bounds[1]-meta.bounds[3])*H];
  const wp=(x,y)=>pj(TKGEO.LON0+x/TKGEO.K/TKGEO.CX,TKGEO.LAT0-y/TKGEO.K);
  const inside=(x,y)=>x>=0&&x<=W&&y>=0&&y<=H;
  function text(c,txt,x,y,size=12,color='#254532',align='center'){
   c.font=`600 ${size}px ${FONT}`;c.textAlign=align;c.textBaseline='middle';c.lineJoin='round';c.lineWidth=3;c.strokeStyle='rgba(251,250,233,.96)';c.strokeText(txt,x,y);c.fillStyle=color;c.fillText(txt,x,y);
  }
  function path(c,pts,world=false,close=false){c.beginPath();for(let i=0;i<pts.length;i++){const p=world?wp(...pts[i]):[pts[i][0]*W,pts[i][1]*H];i?c.lineTo(...p):c.moveTo(...p);}if(close)c.closePath();}
  const riverPath=(c,pts)=>TK.riverPath(c,pts);
  function flatPath(c,pts,close){path(c,Array.from({length:pts.length/2},(_,i)=>[pts[i*2],pts[i*2+1]]),true,close);}
  // 等高帯は実標高格子の三角形を閾値で切って描く。山の丸印を散らす方式は使わない。
  function relief(c){
   c.fillStyle=palettes[0];c.fillRect(0,0,W,H);if(!data)return;
   const nx=data.width,ny=data.height,a=data.values,sorted=Array.from(a).filter(v=>v>0).sort((a,b)=>a-b),lo=sorted[Math.floor(sorted.length*.05)]||0,hi=sorted[Math.floor(sorted.length*.96)]||100;
   const step=Math.max(10,Math.ceil((hi-lo)/6/10)*10),base=Math.floor(lo/step)*step;sc.atlasReliefStep=step;
   for(let level=1;level<8;level++){const threshold=base+level*step;c.beginPath();
    for(let y=0;y<ny-1;y++)for(let x=0;x<nx-1;x++){
     const v0=a[y*nx+x],v1=a[y*nx+x+1],v2=a[(y+1)*nx+x+1],v3=a[(y+1)*nx+x];
     if(Math.max(v0,v1,v2,v3)<threshold)continue;
     // 閾値の内部は横一列を一つの矩形にまとめる。境界だけを補間するため描画呼出が大幅に減る。
     if(Math.min(v0,v1,v2,v3)>=threshold){const start=x;while(x+1<nx-1&&Math.min(a[y*nx+x+2],a[(y+1)*nx+x+2])>=threshold)x++;c.rect(start*W/(nx-1),y*H/(ny-1),(x-start+1)*W/(nx-1),H/(ny-1));continue;}
     const p=[[x,y,v0],[x+1,y,v1],[x+1,y+1,v2],[x,y+1,v3]];
     for(const tri of [[p[0],p[1],p[2]],[p[0],p[2],p[3]]]){const poly=[];for(let j=0;j<3;j++){const v=tri[j],q=tri[(j+1)%3],vIn=v[2]>=threshold,qIn=q[2]>=threshold;if(vIn)poly.push(v);if(vIn!==qIn){const f=(threshold-v[2])/(q[2]-v[2]);poly.push([v[0]+f*(q[0]-v[0]),v[1]+f*(q[1]-v[1])]);}}if(poly.length<3)continue;poly.forEach((v,i)=>i?c.lineTo(v[0]*W/(nx-1),v[1]*H/(ny-1)):c.moveTo(v[0]*W/(nx-1),v[1]*H/(ny-1)));c.closePath();}
    }c.fillStyle=palettes[level];c.fill();
   }
  }
  function backdrop(){if(!W||!data&&!sc.atlasPlan&&!error)return;const cacheKey=meta.file+'|'+W+'|'+H+'|'+D+'|'+G.date().y+'|'+!!data;if(!error&&backgrounds.has(cacheKey)){bg=backgrounds.get(cacheKey);return;}bg=document.createElement('canvas');bg.width=W*D;bg.height=H*D;const c=bg.getContext('2d');c.scale(D,D);relief(c);
   // 現代の水域は比較用。旧河道・埋立前の海岸の復元として扱わない。
   c.save();c.beginPath();c.rect(0,0,W,H);c.clip();
   const land=new Path2D();for(const poly of TKGEO.land)for(const ring of poly){for(let i=0;i<ring.length;i+=2){const p=wp(ring[i],ring[i+1]);i?land.lineTo(...p):land.moveTo(...p);}land.closePath();}
   const mask=new Path2D();mask.rect(-2,-2,W+4,H+4);mask.addPath(land);c.fillStyle='#bbdbe1';c.fill(mask,'evenodd');
   if(data?.comparisonRivers){for(const r of data.comparisonRivers){const pts=r.points.map(p=>pj(...p));if(!TK.waterLineVisible(pts,(x,y)=>[x,y]))continue;riverPath(c,pts);c.strokeStyle=r.kind==='stream'?'#6fa4b6':'#4b94b2';c.lineWidth=r.kind==='stream'?.85:1.3;c.stroke();}}
   else{
   for(const r of TKGEO.rivers){if(TK.KOREAN_RIVERS_DETAIL?.length&&r.every((v,i)=>i%2?TKGEO.LAT0-v/TKGEO.K>34.8:v/TKGEO.K/TKGEO.CX+TKGEO.LON0>124&&v/TKGEO.K/TKGEO.CX+TKGEO.LON0<131))continue;const pts=Array.from({length:r.length/2},(_,i)=>wp(r[i*2],r[i*2+1]));if(!TK.waterLineVisible(pts,(x,y)=>[x,y]))continue;riverPath(c,pts);c.strokeStyle='#4b94b2';c.lineWidth=1.3;c.stroke();}
   for(const river of (TK.REGIONAL_RIVERS||[]).filter(r=>!TK.KOREAN_RIVERS_DETAIL?.length||!['漢江','南漢江','洛東江'].includes(r.name)))for(const line of river.lines){const pts=line.map(p=>pj(...p));if(!TK.waterLineVisible(pts,(x,y)=>[x,y]))continue;riverPath(c,pts);c.strokeStyle='#4b94b2';c.lineWidth=1.3;c.stroke();}
   for(const river of TK.KOREAN_RIVERS_DETAIL||[]){if(river.bounds&&(river.bounds[0]>meta.bounds[2]||river.bounds[2]<meta.bounds[0]||river.bounds[1]>meta.bounds[1]||river.bounds[3]<meta.bounds[3]))continue;const pts=river.points.map(p=>pj(...p));if(!TK.waterLineVisible(pts,(x,y)=>[x,y]))continue;riverPath(c,pts);c.strokeStyle='#4b94b2';c.lineWidth=1.3;c.stroke();}
   }
   for(const poly of TKGEO.lakes){c.beginPath();for(const ring of poly){const pts=ring.map?ring:[];for(let i=0;i<pts.length;i+=2){const p=wp(pts[i],pts[i+1]);i?c.lineTo(...p):c.moveTo(...p);}c.closePath();}c.fillStyle='#a7d1df';c.fill('evenodd');}
   for(const w of TK.periodWaters?.((sc.eventDate||[1560])[0])||[]){c.beginPath();for(const ring of w.rings){ring.forEach((v,i)=>{const p=pj(...v);i?c.lineTo(...p):c.moveTo(...p);});c.closePath();}c.fillStyle='rgba(105,160,173,.62)';c.fill('evenodd');c.setLineDash([2,3]);c.strokeStyle='#66999d';c.lineWidth=.7;c.stroke();c.setLineDash([]);}
   for(const h of TK.HISTORIC_WATERS||[]){flatPath(c,h.poly[0],true);c.fillStyle=h.kind==='marsh'?'rgba(112,151,138,.28)':'rgba(118,166,186,.4)';c.fill();c.setLineDash([1,3]);c.strokeStyle='#668a83';c.lineWidth=1;c.stroke();c.setLineDash([]);const p=pj(...h.at);if(inside(...p))text(c,h.label,...p,10,'#315766');}
   for(const l of TK.waterComparisonOverlay?TK.MODERN_LAKES||[]:[]){c.beginPath();for(const ring of l.rings){ring.forEach((v,i)=>{const p=pj(...v);i?c.lineTo(...p):c.moveTo(...p);});c.closePath();}c.fillStyle='rgba(118,166,186,.6)';c.fill('evenodd');c.setLineDash([3,3]);c.strokeStyle='#426f80';c.lineWidth=.8;c.stroke();c.setLineDash([]);const p=pj(...l.rings[0][0]);if(inside(...p))text(c,l.name+'（比較湖岸）',...p,9,'#315766');}
   for(const r of G.ROADS){const pts=TK.roadDisplay(r).pts.map(p=>wp(...p));if(!pts.some(p=>inside(...p)))continue;c.beginPath();pts.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.strokeStyle='#81735a';c.lineWidth=1.25;c.setLineDash([5,4]);c.stroke();}c.setLineDash([]);
   c.restore();
   // 史料を読図した城郭平面図は独立した概略図として、現代標高と混ぜない。
   if(sc.atlasPlan){c.fillStyle='#e9ebcf';c.fillRect(0,0,W,H);for(const f of sc.feats||[]){
    if(!f.pts)continue;path(c,f.pts,false,!['road','dryMoat'].includes(f.k));
    if(f.k==='landform'){c.fillStyle='#a4c58f';c.fill();}
    if(['water','sea','lake'].includes(f.k)){c.fillStyle='#acd5e2';c.fill();c.strokeStyle='#5e9cae';c.lineWidth=1;c.stroke();}
    if(f.k==='town'){c.fillStyle='#ddd6b7';c.fill();}
    if(f.k==='bailey'){c.fillStyle='#f2edce';c.fill();c.strokeStyle='#746b4e';c.lineWidth=1.4;c.stroke();}
    if(f.k==='dryMoat'){c.strokeStyle='#768864';c.lineWidth=4;c.stroke();c.strokeStyle='#edf0d7';c.lineWidth=1.4;c.stroke();}
    if(f.k==='road'){c.strokeStyle='#897b61';c.lineWidth=1.2;c.stroke();}
   }for(const f of sc.feats||[])if(f.n&&f.x!=null&&!['caption','keep'].includes(f.k))text(c,f.n,f.x*W,f.y*H,W>650?12:10);}
   else {const seen=[];for(const p of meta.points||[]){const [x,y]=pj(p.lon,p.lat);if(seen.some(q=>Math.hypot(q[0]-x,q[1]-y)<40))continue;seen.push([x,y]);c.fillStyle='#435940';c.fillRect(x-3,y-3,6,6);text(c,p.name,x,y+12,W>650?11:9);}
    if(!meta.points.length&&!units.length){const [x,y]=pj(meta.geo[0],meta.geo[1]);text(c,meta.label,x,y-10,W>650?13:11);text(c,'地域の位置・戦場の境界ではありません',x,y+12,10,'#617057');}
   }
   if(!sc.atlasPlan)for(const l of sc.atlasLandmarks||[]){const [x,y]=pj(...l.point);if(inside(x,y))text(c,l.name,clamp(x,35,W-35),clamp(y-53,14,H-14),W>650?14:11,'#536546');}
   if(error)text(c,error,W/2,H/2,12,'#8a3633');else if(!data&&!sc.atlasPlan)text(c,'地形を読み込んでいます',W/2,30,11);if(!error){backgrounds.set(cacheKey,bg);if(backgrounds.size>4)backgrounds.delete(backgrounds.keys().next().value);}
  }
  const boxes=[],placements=new Map();
  const pinFor=g=>{if(!g.point)return null;if(sc.atlasPlan)return [W*.56,H*.48];const u=unitById.get(g.members[0]),p=G.battlePhasePoint(sc,u?.g||u?.n,t,g.point);return pj(...p);};
  function selectionPanel(ids){const el=cv.closest('.battle-stage')?.querySelector('.atlas-selection');if(!el)return;el.replaceChildren();el.hidden=!ids.length;if(!ids.length)return;
   const head=document.createElement('strong');head.textContent=ids.length>1?'表示位置が重なる部隊（'+ids.length+'隊）':'部隊の記録';el.append(head);
   for(const id of ids){const g=groups.find(g=>g.id===id||g.members.includes(id));if(!g)continue;const u=unitById.get(g.members[0]);if(!u)continue;const button=document.createElement('button');button.type='button';button.className='atlas-unit-choice';button.dataset.unitId=u.id;const face=opt.face?.(u.g,14,COL[g.side]);if(face){const im=document.createElement('img');im.src=face.toDataURL();im.width=28;im.height=28;im.alt='';button.append(im);}const name=document.createElement('span');name.textContent=u.g||u.n;button.append(name);button.onclick=()=>{selected=g.id;frameDraw();};el.append(button);}
   const close=document.createElement('button');close.type='button';close.textContent='閉じる';close.className='mini';close.onclick=()=>{selected=null;el.hidden=true;frameDraw();};el.append(close);
  }
  function groupDraw(){const located=groups.filter(g=>g.point&&t>=(sc.mapVisibleFrom?.[g.members[0]]||0)),pins=located.map(pinFor),named=[],badged=new Set(),active=new Set(G.battleActiveUnits(sc,t));
   for(const [index,g]of located.entries()){const u=unitById.get(g.members[0]);if(!u)continue;const [x,y]=pins[index],near=located.filter((q,j)=>Math.hypot(pins[j][0]-x,pins[j][1]-y)<20),sel=selected===g.id||selected===g.parentId||g.members.includes(selected),col=u.turn&&t>=u.turn[0]?'#b47712':COL[g.side]||COL.unknown;
    ctx.save();const visibleFrom=sc.mapVisibleFrom?.[u.id]||0;if(visibleFrom)ctx.globalAlpha=clamp((t-visibleFrom)/2,0,1);ctx.save();ctx.translate(x,y);const move=moveByName.get(u.g||u.n),side=u.turn&&t>=u.turn[0]?u.turn[1]:u.side;let aim=null;if(move&&t>move.from){const f=G.battlePhasePoint(sc,u.g||u.n,Math.min(move.to,t+.05),g.point),p=G.battlePhasePoint(sc,u.g||u.n,Math.max(move.from,Math.min(move.to,t)-.05),g.point),A=pj(...p),B=pj(...f);if(Math.hypot(B[0]-A[0],B[1]-A[1])>1e-6)aim=[B[0]-A[0],B[1]-A[1]];}if(!aim){let best=Infinity;for(const [j,q] of located.entries()){const v=unitById.get(q.members[0]),op=v.turn&&t>=v.turn[0]?v.turn[1]:v.side;if(op===side)continue;const a=pins[j],d=Math.hypot(a[0]-x,a[1]-y);if(d>1&&d<best){best=d;aim=[a[0]-x,a[1]-y];}}}if(aim)ctx.rotate(Math.atan2(aim[1],aim[0])+Math.PI/2);TKCounter.path(ctx,W<560?22:28,W<560?15:19);ctx.fillStyle=col;ctx.fill();ctx.strokeStyle=sel?'#e5ad3f':'#fff8e7';ctx.lineWidth=sel?2.5:active.has(u.id)?2.2:1.3;ctx.lineJoin='round';ctx.stroke();ctx.restore();
    const crestKey=G.armyCrestKey({clan:u.clan,gens:[],commanders:[u.g||u.n],until:sc.title}),crest=G.kamonImage(crestKey);ctx.save();ctx.strokeStyle='#574732';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(x+10,y-2);ctx.lineTo(x+10,y-26);ctx.stroke();ctx.fillStyle=crest?'#fff8e7':col;ctx.fillRect(x+10,y-25,15,15);ctx.strokeStyle=col;ctx.strokeRect(x+10,y-25,15,15);if(crest)ctx.drawImage(crest,x+12,y-23,11,11);ctx.restore();
    if(near.length===1||sel){const face=opt.face?.(u.g,12,col);if(face)ctx.drawImage(face,x-26,y-30,24,24);const label=u.g||u.n;ctx.font=`600 12px ${FONT}`;const w=ctx.measureText(label).width+8,b={x:x+18,y:y-10,w,h:18};if(sel||!named.some(a=>b.x<a.x+a.w&&b.x+b.w>a.x&&b.y<a.y+a.h&&b.y+b.h>a.y)){text(ctx,label,b.x,b.y+9,12,'#302719','left');named.push(b);}}
    if(near.length>1&&!badged.has(g.id)){near.forEach(q=>badged.add(q.id));const leader=unitById.get(near[0].members[0]);if(leader){const face=opt.face?.(leader.g,13,col);if(face)ctx.drawImage(face,x-30,y-33,26,26);text(ctx,leader.g||leader.n,x+18,y-17,11,'#302719','left');}}

    boxes.push({x:x-20,y:y-30,w:40,h:67,id:g.id});ctx.restore();
   }
   cv.dataset.mapGroups=String(groups.length);cv.dataset.mapParticipants=String(groups.reduce((n,g)=>n+g.members.length,0));cv.dataset.locatedGroups=String(located.length);
  }
  function frameDraw(){if(dead)return;cv.style.visibility=data||sc.atlasPlan||error?'visible':'hidden';cv.parentElement.classList.toggle('atlas-loading',!data&&!sc.atlasPlan&&!error);if(!bg)return;ctx.setTransform(D,0,0,D,0,0);ctx.clearRect(0,0,W,H);ctx.drawImage(bg,0,0,W,H);boxes.length=0;
   if(groups.length){groupDraw();cv.dataset.mapReady=data||sc.atlasPlan?'true':'false';cv.dataset.mapUnits=String(groups.length);return;}
   const pins=units.map(u=>u.point?pj(...u.point):[u.x*W,u.y*H]);
   for(const [index,u] of units.entries()){const [x,y]=pins[index],col=COL[u.side]||COL.unknown,sel=selected===u.id,r=W>650?10:7;
    ctx.save();ctx.translate(x,y);ctx.rotate(u.angle||0);ctx.beginPath();ctx.moveTo(-r,-r*.25);ctx.lineTo(-r*.36,-r*.25);ctx.lineTo(-r*.36,-r);ctx.lineTo(r*.36,-r);ctx.lineTo(r*.36,-r*.25);ctx.lineTo(r,-r*.25);ctx.lineTo(r,r*.65);ctx.lineTo(-r,r*.65);ctx.closePath();ctx.fillStyle=col;ctx.fill();ctx.lineWidth=sel?3:1.4;ctx.strokeStyle=sel?'#e4ac28':'#fffdf0';ctx.stroke();ctx.restore();
    // 文字だけをずらし、部隊の位置は保持。引出線を付けて別位置の部隊と誤認させない。
    const txt=u.label||u.name||u.g,size=W>650?12:10;ctx.font=`600 ${size}px sans-serif`;const tw=ctx.measureText(txt).width+8,bh=size+7,candidates=[];
    for(let row=-6;row<=6;row++)for(let col=-3;col<=3;col++){const bx=clamp(x-tw/2+col*(tw/2+8),4,W-tw-4),by=clamp(y+14+row*(bh+3),4,H-bh-42);candidates.push({bx,by,d:Math.hypot(bx+tw/2-x,by+bh/2-y)});}
    candidates.sort((a,b)=>a.d-b.d);
    const free=p=>!boxes.some(b=>p.bx<b.x+b.w+2&&p.bx+tw+2>b.x&&p.by<b.y+b.h+2&&p.by+bh+2>b.y)&&!pins.some(q=>p.bx<q[0]+10&&p.bx+tw>q[0]-10&&p.by<q[1]+10&&p.by+bh>q[1]-10);
    const place=candidates.find(free)||candidates[0];const {bx,by}=place;
    boxes.push({x:bx,y:by,w:tw,h:bh,id:u.id});ctx.strokeStyle=col;ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(x,y+6);ctx.lineTo(bx+tw/2,by);ctx.stroke();ctx.fillStyle='rgba(252,250,233,.86)';ctx.fillRect(bx,by,tw,bh);text(ctx,txt,bx+tw/2,by+bh/2,size,col);
    if(sel){const im=opt.face?.(u.g||u.name,19,col);if(im)ctx.drawImage(im,clamp(x-20,0,W-40),clamp(y-56,0,H-40),40,40);}
   }
   cv.dataset.mapReady=data||sc.atlasPlan?'true':'false';cv.dataset.mapUnits=String(units.length);
  }
  function size(){const r=cv.parentElement.getBoundingClientRect(),next=Math.max(240,Math.round(Math.min(r.width,sc.atlasPlan?Math.max(240,(innerHeight-300)/aspect):r.width))),d=Math.min(2,devicePixelRatio||1);if(next===W&&d===D&&bg)return;placements.clear();W=next;H=Math.round(W*aspect);D=d;cv.style.width=W+'px';cv.style.height=H+'px';cv.style.margin='0 auto';cv.width=W*D;cv.height=H*D;backdrop();frameDraw();}
  const controller=TKBattlePresentation.record(cv,sc,{...opt,onProgress(v){t=v;opt.onProgress?.(v);const key=Math.floor(t*20)+'|'+selected+'|'+sc.units.filter(u=>u.turn&&t>=u.turn[0]).map(u=>u.id).join(',');if(key!==lastKey){lastKey=key;frameDraw();}}});
  const onClick=e=>{const r=cv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top,hit=boxes.filter(b=>x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h);if(hit.length){selected=hit[0].id;const g=groups.find(g=>g.id===selected),p=pinFor(g),ids=groups.filter(q=>q.point&&Math.hypot(...pinFor(q).map((v,i)=>v-p[i]))<20).map(q=>q.id);selectionPanel(ids);frameDraw();}};

  cv.addEventListener('click',onClick);const ro=new ResizeObserver(size);size();ro.observe(cv.parentElement);
  load(meta).then(d=>{if(dead)return;data=d;backdrop();frameDraw();if(pendingPlay){pendingPlay=false;controller.play();}}).catch(()=>{if(dead)return;error='地形を読み込めません。ページを再読み込みしてください。';backdrop();frameDraw();});
  return {...controller,play(){if(!data&&!sc.atlasPlan){pendingPlay=true;return;}controller.play();},pause(){pendingPlay=false;controller.pause();},get playing(){return pendingPlay||controller.playing;},get t(){return controller.t;},get ended(){return controller.ended;},get speed(){return controller.speed;},select(id){if(t<(sc.mapVisibleFrom?.[id]||0))controller.seek(sc.mapVisibleFrom[id]);selected=id;selectionPanel([id]);frameDraw();},unitStates(){return groups.filter(g=>g.point).map(g=>{const u=unitById.get(g.members[0]),move=moveByName.get(u.g||u.n),side=u.turn&&t>=u.turn[0]?(u.turn[1]||'a'):u.side,status=t<(sc.mapVisibleFrom?.[u.id]||0)?'本戦の布陣':move&&t>move.from&&t<move.to?'移動中':G.battleActiveUnits(sc,t).includes(u.id)?'交戦':t>=100?'戦闘終了':'布陣';return {id:u.id,side,status,point:G.battlePhasePoint(sc,u.g||u.n,t,g.point)};});},destroy(){dead=true;controller.destroy();ro.disconnect();cv.removeEventListener('click',onClick);}};
 }
 return {make,preload(title){const m=TK.BATTLE_ATLAS[title];return m?load(m):Promise.resolve(null);}};
})();
