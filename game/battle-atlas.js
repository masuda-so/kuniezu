"use strict";
/* 地形と部隊の史料は独立。位置の根拠のない人物を、画面上の空き場所へ配置しない。 */
window.TKBattleAtlas=(function(){
 const cache=new Map(),decoded=new Map(),backgrounds=new Map(),COL={a:'#c83339',b:'#216d9f',unknown:'#665b49'};
 const FONT='"Shippori Mincho B1","Hiragino Mincho ProN","Yu Mincho",serif';
 const palettes=['#dce9cd','#cce0b9','#b6d39f','#9dc48a','#82b373','#6c9e62','#5b8855','#4b744b'];
 function load(meta){let p=cache.get(meta.file);if(!p){p=fetch('atlas/'+meta.file).then(r=>{if(!r.ok)throw Error('地形データを読めません');return r.json();}).then(d=>{const raw=atob(d.heights),a=new Int16Array(d.width*d.height);for(let i=0;i<a.length;i++)a[i]=(raw.charCodeAt(i*2)+raw.charCodeAt(i*2+1)*256)-32768;d.values=a;decoded.set(meta.file,d);if(decoded.size>12)decoded.delete(decoded.keys().next().value);return d;});cache.set(meta.file,p);if(cache.size>12)cache.delete(cache.keys().next().value);}return p;}
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 // 全国の陸地・河川・湖・街道の外接矩形を一度だけ求め、合戦図の範囲外の線は投影せずに飛ばす（背景作成が重かった）。
 const BB=new WeakMap();
 const bbFlat=a=>{let b=BB.get(a);if(!b){let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;for(let i=0;i+1<a.length;i+=2){const x=a[i],y=a[i+1];if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}b=[x0,y0,x1,y1];BB.set(a,b);}return b;};
 const bbPairs=a=>{let b=BB.get(a);if(!b){let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;for(const p of a){const x=p[0],y=p[1];if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}b=[x0,y0,x1,y1];BB.set(a,b);}return b;};
 function make(cv,sc,opt){
  const title=opt.title,meta=TK.BATTLE_ATLAS[title],ctx=cv.getContext('2d');let W=0,H=0,D=1,bg=null,data=decoded.get(meta.file)||null,dead=false,selected=null,error='',lastKey='',frame;
  let t=0,pendingPlay=false,fxRaf=0,fxLast=0,lastSnap=true;const fx=TKBattleEffects.create({seed:(meta.file||'').length*131+sc.units.length});const groups=(sc.atlasGroups||[]).flatMap(g=>g.members.map((id,i)=>({...g,id:g.id+'-'+i,label:sc.units.find(u=>u.id===id)?.g||g.label,members:[id],parentId:g.id,point:g.point}))),units=sc.atlasUnits||[],notes=sc.atlasNotes||[],aspect=sc.atlasSchematic?.9:sc.atlasPlan?1100/1050:.7;
  const unitById=new Map(sc.units.map(u=>[u.id,u])),groupOf=new Map(),moveByName=new Map((TK.BATTLE_MOVEMENTS[sc.title]||[]).map(m=>[m.name,m]));
  if(sc.atlasSchematic)cv.setAttribute('aria-label',sc.title+'の攻撃順序を示す模式図');
  // 位置の記録がない隊は、推定の配置（TKBattleMotion）が置けるときだけ別枠で描く。groups（記録の群）には混ぜない。
  const recordedIds=new Set(groups.filter(g=>g.point).flatMap(g=>g.members)),estGroups=sc.atlasPlan?[]:sc.units.filter(u=>!recordedIds.has(u.id)).map(u=>({id:'est-'+u.id,label:u.g||u.n,members:[u.id],side:u.side,point:null,estimated:true}));
  // 推定経路は一定の基準平面で一度だけ計算し、表示幅・地区拡大は投影だけを変える。
  const motionW=1000,motionH=700;
  const motionProject=(lo,la)=>[(lo-meta.bounds[0])/(meta.bounds[2]-meta.bounds[0])*motionW,(meta.bounds[1]-la)/(meta.bounds[1]-meta.bounds[3])*motionH];
  let motion=null;
  function motionPlan(){if(motion)return motion;const base=new Map();for(const g of groups)if(g.point)base.set(g.members[0],motionProject(...g.point));const sourced=new Set(sc.units.filter(u=>moveByName.has(u.g||u.n)).map(u=>u.id));motion=window.TKBattleMotion&&!sc.atlasPlan?TKBattleMotion.plan(sc,base,motionW,motionH,side=>{const p=opponentHomePoint(side);return p&&motionProject(...p);},sourced):{pos:()=>null,estimated:new Set(),placed:new Set(),basis:'none'};return motion;}
  const estAt=(g,tt)=>{const p=motionPlan().pos(g.members[0],tt);return p?[p[0]/motionW*W*VS-VX,p[1]/motionH*H*VS-VY]:null;};
  // 表示範囲（全体か、選んだ地区の拡大）。VS は倍率、VX・VY は拡大後の左上のずれ（画面の画素）。
  let VS=1,VX=0,VY=0,viewIndex=0,views=[];
  const pj=(lo,la)=>[(lo-meta.bounds[0])/(meta.bounds[2]-meta.bounds[0])*W*VS-VX,(meta.bounds[1]-la)/(meta.bounds[1]-meta.bounds[3])*H*VS-VY];
  const unproject=p=>[meta.bounds[0]+(p[0]+VX)/(W*VS)*(meta.bounds[2]-meta.bounds[0]),meta.bounds[1]-(p[1]+VY)/(H*VS)*(meta.bounds[1]-meta.bounds[3])];
  const wp=(x,y)=>pj(...TKGEO.unproject(x,y));
  const inside=(x,y)=>x>=0&&x<=W&&y>=0&&y<=H;
  const onView=(b,proj)=>{const p=proj(b[0],b[1]),q=proj(b[2],b[3]);return Math.max(p[0],q[0])>-60&&Math.min(p[0],q[0])<W+60&&Math.max(p[1],q[1])>-60&&Math.min(p[1],q[1])<H+60;};
  function text(c,txt,x,y,size=12,color='#254532',align='center'){
   c.font=`600 ${size}px ${FONT}`;const width=Math.min(c.measureText(txt).width,W-8),left=align==='left'?0:align==='right'?width:width/2,right=width-left;
   x=clamp(x,4+left,W-4-right);y=clamp(y,4+size/2,H-4-size/2);
   c.textAlign=align;c.textBaseline='middle';c.lineJoin='round';c.lineWidth=3;c.strokeStyle='rgba(251,250,233,.96)';c.strokeText(txt,x,y,width);c.fillStyle=color;c.fillText(txt,x,y,width);
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
  function backdrop(){if(!W||!data&&!sc.atlasPlan&&!error)return;const cacheKey=meta.file+'|'+W+'|'+H+'|'+D+'|'+G.date().y+'|'+!!data+'|'+VS.toFixed(3)+'|'+Math.round(VX)+'|'+Math.round(VY);if(!error&&backgrounds.has(cacheKey)){bg=backgrounds.get(cacheKey);return;}bg=document.createElement('canvas');bg.width=W*D;bg.height=H*D;const c=bg.getContext('2d');c.scale(D,D);if(sc.atlasSchematic){c.fillStyle='#f3eedb';c.fillRect(0,0,W,H);text(c,sc.atlasSchematic.title,W/2,22,W<560?13:16,'#493c28');text(c,'攻撃を命じられた部隊',W*.22,H*.16,W<560?10:12,'#9a3435');text(c,'豊臣方の河口砦',W*.77,H*.16,W<560?10:12,'#216d9f');text(c,sc.atlasSchematic.caption,W/2,H-17,W<560?8:11,'#665b49');backgrounds.set(cacheKey,bg);if(backgrounds.size>4)backgrounds.delete(backgrounds.keys().next().value);return;}c.save();c.translate(-VX,-VY);c.scale(VS,VS);relief(c);c.restore();
   // 現代の水域は比較用。旧河道・埋立前の海岸の復元として扱わない。
   c.save();c.beginPath();c.rect(0,0,W,H);c.clip();
   const land=new Path2D();for(const poly of TKGEO.land)for(const ring of poly){if(!onView(bbFlat(ring),wp))continue;for(let i=0;i<ring.length;i+=2){const p=wp(ring[i],ring[i+1]);i?land.lineTo(...p):land.moveTo(...p);}land.closePath();}
   const mask=new Path2D();mask.rect(-2,-2,W+4,H+4);mask.addPath(land);c.fillStyle='#bbdbe1';c.fill(mask,'evenodd');
   // 河川は陸域の内側だけに描く。比較河川の線が粗い海岸線の外（海上）へはみ出して見えないようにする。
   c.save();c.clip(land);
   if(data?.comparisonRivers){for(const r of data.comparisonRivers){const pts=r.points.map(p=>pj(...p));if(!TK.waterLineVisible(pts,(x,y)=>[x,y]))continue;riverPath(c,pts);c.strokeStyle=r.kind==='stream'?'#6fa4b6':'#4b94b2';c.lineWidth=r.kind==='stream'?.85:1.3;c.stroke();}}
   else{
   for(const r of TKGEO.rivers){if(!onView(bbFlat(r),wp))continue;if(TK.KOREAN_RIVERS_DETAIL?.length&&TKGEO.inKoreaBox(r))continue;const pts=Array.from({length:r.length/2},(_,i)=>wp(r[i*2],r[i*2+1]));if(!TK.waterLineVisible(pts,(x,y)=>[x,y]))continue;riverPath(c,pts);c.strokeStyle='#4b94b2';c.lineWidth=1.3;c.stroke();}
   for(const river of (TK.REGIONAL_RIVERS||[]).filter(r=>!TK.KOREAN_RIVERS_DETAIL?.length||!['漢江','南漢江','洛東江'].includes(r.name)))for(const line of river.lines){if(!onView(bbPairs(line),pj))continue;const pts=line.map(p=>pj(...p));if(!TK.waterLineVisible(pts,(x,y)=>[x,y]))continue;riverPath(c,pts);c.strokeStyle='#4b94b2';c.lineWidth=1.3;c.stroke();}
   for(const river of TK.KOREAN_RIVERS_DETAIL||[]){if(river.bounds&&(river.bounds[0]>meta.bounds[2]||river.bounds[2]<meta.bounds[0]||river.bounds[1]>meta.bounds[1]||river.bounds[3]<meta.bounds[3]))continue;const pts=river.points.map(p=>pj(...p));if(!TK.waterLineVisible(pts,(x,y)=>[x,y]))continue;riverPath(c,pts);c.strokeStyle='#4b94b2';c.lineWidth=1.3;c.stroke();}
   }
   c.restore();
   for(const poly of TKGEO.lakes){if(!poly.some(ring=>ring.map&&onView(bbFlat(ring),wp)))continue;c.beginPath();for(const ring of poly){const pts=ring.map?ring:[];for(let i=0;i<pts.length;i+=2){const p=wp(pts[i],pts[i+1]);i?c.lineTo(...p):c.moveTo(...p);}c.closePath();}c.fillStyle='#a7d1df';c.fill('evenodd');}
   for(const w of TK.periodWaters?.((sc.eventDate||[1560])[0])||[]){c.beginPath();for(const ring of w.rings){ring.forEach((v,i)=>{const p=pj(...v);i?c.lineTo(...p):c.moveTo(...p);});c.closePath();}c.fillStyle='rgba(105,160,173,.62)';c.fill('evenodd');c.setLineDash([2,3]);c.strokeStyle='#66999d';c.lineWidth=.7;c.stroke();c.setLineDash([]);}
   for(const h of TK.HISTORIC_WATERS||[]){if(!h.poly)continue;flatPath(c,h.poly[0],true);c.fillStyle=h.kind==='marsh'?'rgba(112,151,138,.28)':'rgba(118,166,186,.4)';c.fill();c.setLineDash([1,3]);c.strokeStyle='#668a83';c.lineWidth=1;c.stroke();c.setLineDash([]);const p=pj(...h.at);if(inside(...p))text(c,h.label,...p,10,'#315766');}
   for(const l of TK.waterComparisonOverlay?TK.MODERN_LAKES||[]:[]){c.beginPath();for(const ring of l.rings){ring.forEach((v,i)=>{const p=pj(...v);i?c.lineTo(...p):c.moveTo(...p);});c.closePath();}c.fillStyle='rgba(118,166,186,.6)';c.fill('evenodd');c.setLineDash([3,3]);c.strokeStyle='#426f80';c.lineWidth=.8;c.stroke();c.setLineDash([]);const p=pj(...l.rings[0][0]);if(inside(...p))text(c,l.name+'（比較湖岸）',...p,9,'#315766');}
   for(const r of G.ROADS){const raw=TK.roadDisplay(r).pts;if(!onView(bbPairs(raw),wp))continue;const pts=raw.map(p=>wp(...p));if(!pts.some(p=>inside(...p)))continue;c.beginPath();pts.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.strokeStyle='#81735a';c.lineWidth=1.25;c.setLineDash([5,4]);c.stroke();}c.setLineDash([]);
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
   else {const seen=[];for(const p of meta.points||[]){const [x,y]=pj(p.lon,p.lat);if(!inside(x,y)||seen.some(q=>Math.hypot(q[0]-x,q[1]-y)<40))continue;seen.push([x,y]);c.fillStyle='#435940';c.fillRect(x-3,y-3,6,6);text(c,p.name,x,y+12,W>650?11:9);}
    if(!meta.points.length&&!units.length){const [x,y]=pj(meta.geo[0],meta.geo[1]);text(c,meta.label,x,y-10,W>650?13:11);text(c,'地域の位置・戦場の境界ではありません',x,y+12,10,'#617057');}
   }
   if(!sc.atlasPlan)for(const l of sc.atlasLandmarks||[]){const [x,y]=pj(...l.point);if(inside(x,y))text(c,l.name,clamp(x,35,W-35),clamp(y-53,14,H-14),W>650?14:11,'#536546');}
   if(error)text(c,error,W/2,H/2,12,'#8a3633');else if(!data&&!sc.atlasPlan)text(c,'地形を読み込んでいます',W/2,30,11);if(!error){backgrounds.set(cacheKey,bg);if(backgrounds.size>4)backgrounds.delete(backgrounds.keys().next().value);}
  }
  const boxes=[];
  const schematicAt=(g,tt)=>{const p=window.TKBattleMotion?.at(sc.atlasSchematic?.paths?.[g.members[0]],tt);return p?[p[0]*W,p[1]*H]:null;};
  const mapped=g=>!!(g.point||sc.atlasSchematic?.paths?.[g.members[0]]);
  const pinFor=g=>{if(sc.atlasSchematic?.paths?.[g.members[0]])return schematicAt(g,t);if(g.estimated)return estAt(g,t);if(!g.point)return null;if(sc.atlasPlan)return [W*.56,H*.48];const u=unitById.get(g.members[0]);if(u&&!moveByName.has(u.g||u.n)){const e=estAt(g,t);if(e)return e;}const p=G.battlePhasePoint(sc,u?.g||u?.n,t,g.point);return pj(...p);};
  const isEst=g=>g.estimated||motionPlan().estimated.has(g.members[0]);
  const selectionGroup=id=>groups.find(g=>g.id===id)||estGroups.find(g=>g.id===id)||groups.find(g=>g.members.includes(id))||estGroups.find(g=>g.members.includes(id));
  const selectionPortraits=[];
  function selectionPanel(ids){const el=cv.closest('.battle-stage')?.querySelector('.atlas-selection');if(!el)return;selectionPortraits.length=0;el.replaceChildren();el.hidden=!ids.length;if(!ids.length)return;
   const head=document.createElement('strong');head.textContent=ids.length>1?'表示位置が重なる部隊（'+ids.length+'隊）':'部隊の記録';el.append(head);
   for(const id of ids){const g=selectionGroup(id);if(!g)continue;const u=unitById.get(g.members[0]);if(!u)continue;const button=document.createElement('button');button.type='button';button.className='atlas-unit-choice';button.dataset.unitId=u.id;const face=opt.face?.(u.g,14,COL[sideOf(u)]);if(face){const im=document.createElement('img');im.src=face.toDataURL();im.width=28;im.height=28;im.alt='';button.append(im);selectionPortraits.push({u,im,side:sideOf(u)});}const name=document.createElement('span');name.textContent=u.g||u.n;button.append(name);button.onclick=()=>{selected=g.id;frameDraw();};el.append(button);}
   const close=document.createElement('button');close.type='button';close.textContent='閉じる';close.className='mini';close.onclick=()=>{selected=null;selectionPortraits.length=0;el.hidden=true;frameDraw();};el.append(close);
  }
  const homeCache={};function opponentHomePoint(side){if(side in homeCache)return homeCache[side];const st=G.S?.(),clan=sc.sides?.[side]?.clan,cap=st?.clans?.[clan]?.cap,C=cap&&G.C[cap];return homeCache[side]=C?TKGEO.unproject(C.x,C.y):null;}
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
  function groupDraw(dt,now,playing){const located=locatedGroups(),pins=located.map(pinFor),named=[];
   groupOf.clear();located.forEach((g,i)=>groupOf.set(g.members[0],{g,pin:pins[i]}));
   const kb=clamp(W/760,.62,1.1),small=W<560;
   // 駒は投影地点に固定する。同地点の隊も別の地理位置へ押し離さず、名札だけを分ける。
   const disp=pins;
   // 交戦の組（beats の第3要素）。開城・撤退へ進んだら以前の交戦を止める。
   const stage=(sc.beats||[]).filter(b=>b[0]<=t).at(-1),beat=stage?.[2]?.length?stage:null,active=new Set(beat?beat[2]:[]),clashK=beat?Math.max(.35,1-(t-beat[0])/16):0;
   const livePin=id=>{const r=groupOf.get(id);if(!r)return null;const u=unitById.get(id);return u&&!isDead(u)?r.pin:null;};
   if(beat)for(let i=0;i+1<beat[2].length;i+=2){const a=livePin(beat[2][i]),b=livePin(beat[2][i+1]);if(!a||!b)continue;const d=Math.hypot(a[0]-b[0],a[1]-b[1]);
    if(d<Math.max(150,W*.28)){const mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2;fx.clash(ctx,mx,my,now,clashK,kb);if(playing&&fx.rnd()<dt*40*clashK)fx.spawn(mx+(fx.rnd()-.5)*16,my+(fx.rnd()-.5)*10,'spark');if(playing&&fx.rnd()<dt*14*clashK)fx.spawn(mx,my,'dust');}
    else for(const p of [a,b]){fx.ring(ctx,p[0],p[1],now,clashK,small?18:22);if(playing&&fx.rnd()<dt*8*clashK)fx.spawn(p[0],p[1],'dust');}}
   // 段階移動の足跡は駒より下に描く。
   for(const [index,g]of located.entries()){const u=unitById.get(g.members[0]);const move=u&&moveByName.get(u.g||u.n);if(move&&t>move.from)fx.trail(ctx,traversed(move,pins[index]),COL[sideOf(u)]||COL.unknown,kb);else if(u&&isEst(g)&&t>0){const from=visibleFrom(u),pts=[];for(let k=0;k<=24;k++){const tt=from+(t-from)*k/24,p=estAt(g,tt);if(p)pts.push(p);}let len=0;for(let k=1;k<pts.length;k++)len+=Math.hypot(pts[k][0]-pts[k-1][0],pts[k][1]-pts[k-1][1]);if(len>6)fx.trail(ctx,pts,COL[sideOf(u)]||COL.unknown,kb,true);}}
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
    ctx.save();ctx.translate(x,y);if(Number.isFinite(ang))ctx.rotate(ang);const cw=small?18:28,ch=small?13:19;TKCounter.path(ctx,cw,ch);ctx.fillStyle=col;ctx.fill();ctx.save();TKCounter.path(ctx,cw,ch);ctx.clip();const tint=ctx.createLinearGradient(0,-ch*.55,0,ch*.55);tint.addColorStop(0,'rgba(255,255,240,.20)');tint.addColorStop(.5,'rgba(255,255,240,0)');tint.addColorStop(1,'rgba(30,15,0,.14)');ctx.fillStyle=tint;ctx.fillRect(-cw,-ch,cw*2,ch*2);ctx.restore();TKCounter.path(ctx,cw,ch);ctx.strokeStyle=sel?'#e5ad3f':'#2a1d10';ctx.lineWidth=sel?2.6:active.has(u.id)?2.4:1.7;ctx.lineJoin='round';ctx.setLineDash(g.estimated?[3,2]:[]);ctx.stroke();ctx.restore();
    // 鉄砲：記録の射撃区間（fire）か、鉄砲隊が交戦中の間、相手へ向けて発砲の閃光と煙を出す。射線は引かない。
    const firing=!dead&&!routed&&(u.fire?t>=u.fire[0]&&t<=u.fire[1]:u.arm==='teppo'&&active.has(u.id));
    if(firing){let tp=u.fireTarget?livePin(u.fireTarget):null;if(!tp){let best=Infinity;for(const [j,q] of located.entries()){const v=unitById.get(q.members[0]);if(sideOf(v)===side||isDead(v))continue;const d=Math.hypot(pins[j][0]-x,pins[j][1]-y);if(d>1&&d<best){best=d;tp=pins[j];}}}
     if(tp){const dir=Math.atan2(tp[1]-y,tp[0]-x),fxp=[x+Math.cos(dir)*16*kb,y+Math.sin(dir)*16*kb];if(playing&&fx.rnd()<dt*16){fx.spawn(fxp[0]+(fx.rnd()-.5)*12,fxp[1]+(fx.rnd()-.5)*12,'flash',dir);fx.spawn(fxp[0],fxp[1],'smoke',dir);}}}
    const crestKey=G.armyCrestKey({clan:u.clan,gens:[],commanders:[u.g||u.n],until:sc.title}),crest=G.kamonImage(crestKey,11),family=crestKey&&TK.CLANS[crestKey]?G.CN(crestKey):u.clan&&TK.CLANS[u.clan]?G.CN(u.clan):'';const flagK=small?.55:1,flagX=clamp(x+(small?11:19),4,W-19*flagK-3),flagY=clamp(y,42*flagK+3,H-10*flagK-3);fx.flag(ctx,flagX,flagY,flagK,col,crest,now,playing&&!dead,family?family.replace(/家$/,'').slice(0,1):'');
    if(dead)fx.cross(ctx,x,y);
    const status=dead?'討死':routed?'退却':'';
    {
     // 名札だけを動かす。密集時は引き出し線で対応する駒を示す。
     const label=(u.g||u.n)+(status?'・'+status:'');ctx.font=`600 12px ${FONT}`;const w=ctx.measureText(label).width+10,h=18;
     const right=x+(small?30:36),left=x-w-(small?32:38),below=y+(small?22:26),above=y-(small?58:66);
     const cands=[
      {x:right,y:y-16},{x:x-w/2,y:below},{x:left,y:y-16},{x:x-w/2,y:above},
      {x:right,y:below},{x:left,y:below},{x:right,y:above},{x:left,y:above},
      {x:x-w/2,y:below+h+5},{x:x-w/2,y:above-h-5}
     ];
     const clash=b=>named.some(a=>b.x<a.x+a.w&&b.x+b.w>a.x&&b.y<a.y+a.h&&b.y+b.h>a.y)||disp.some((q,j)=>(j!==index||!!sc.atlasSchematic)&&b.x<q[0]+(small?17:22)&&b.x+b.w>q[0]-(small?23:34)&&b.y<q[1]+(small?10:14)&&b.y+b.h>q[1]-(small?23:38));
     const box=p=>({x:clamp(p.x,2,W-w-2),y:clamp(p.y,2,H-h-2),w,h});
     let b=cands.map(box).find(b=>!clash(b));
     for(let radius=64;!b&&radius<=120;radius+=28){
      const around=Array.from({length:12},(_,i)=>{
       const angle=i*Math.PI/6;
       return box({x:x+Math.cos(angle)*radius-w/2,y:y+Math.sin(angle)*radius-h/2});
      });
      b=around.find(b=>!clash(b));
     }
     if(!b&&sel)b=box(cands[0]);
     if(b){const faceSize=small?16:24,face=opt.face?.(u.g,faceSize/2,col);if(face)ctx.drawImage(face,clamp(x-(small?23:34),2,W-faceSize-2),clamp(y-faceSize/2,2,H-faceSize-2),faceSize,faceSize);
      const tx=clamp(x,b.x,b.x+w),ty=clamp(y,b.y,b.y+h),d=Math.hypot(tx-x,ty-y);
      if(d>12){ctx.beginPath();ctx.moveTo(x+(tx-x)*12/d,y+(ty-y)*12/d);ctx.lineTo(tx,ty);ctx.strokeStyle=col;ctx.lineWidth=.85;ctx.stroke();}
      boxes.push({...b,id:g.id,label:true});ctx.fillStyle='rgba(253,247,230,.94)';ctx.fillRect(b.x,b.y,w,h);ctx.strokeStyle='#2a1d10';ctx.lineWidth=.8;ctx.strokeRect(b.x+.5,b.y+.5,w-1,h-1);ctx.fillStyle=col;ctx.fillRect(b.x,b.y,3,h);ctx.font=`600 12px ${FONT}`;ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillStyle=status?'#7a2218':'#302719';ctx.fillText(label,b.x+7,b.y+h/2+.5);named.push(b);}}
    boxes.push(small?{x:x-24,y:y-25,w:48,h:50,id:g.id}:{x:x-36,y:y-40,w:72,h:76,id:g.id});ctx.restore();
   }
   const estCount=located.filter(isEst).length;if(estCount){const msg=located.some(g=>g.estimated)?'点線の軌跡・破線の駒＝推定の動きと配置（史料の記録ではない）':'点線の軌跡＝推定の動き（史料の記録ではない）';ctx.save();ctx.font=`600 ${small?9.5:11}px ${FONT}`;const w=ctx.measureText(msg).width+14;ctx.fillStyle='rgba(253,247,230,.9)';ctx.fillRect(8,H-30,w,20);ctx.strokeStyle='rgba(42,29,16,.5)';ctx.lineWidth=.8;ctx.strokeRect(8.5,H-29.5,w-1,19);ctx.fillStyle='#4a3a26';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText(msg,15,H-20);ctx.restore();}
   cv.dataset.estimatedGroups=String(estCount);cv.dataset.estimatedPlaced=String(located.filter(g=>g.estimated).length);cv.dataset.motionBasis=sc.atlasSchematic?'documented-sequence-schematic':motionPlan().basis;cv.dataset.schematicGroups=String(located.filter(g=>sc.atlasSchematic?.paths?.[g.members[0]]).length);
   lastSnap=!playing;
   cv.dataset.mapGroups=String(groups.length);cv.dataset.mapParticipants=String(groups.reduce((n,g)=>n+g.members.length,0));cv.dataset.locatedGroups=String(located.length);
  }
  function frameDraw(dt=0,now=performance.now()){if(dead)return;refreshSelectionPortraits();cv.style.visibility=data||sc.atlasPlan||error?'visible':'hidden';cv.parentElement.classList.toggle('atlas-loading',!data&&!sc.atlasPlan&&!error);if(!bg)return;ctx.setTransform(D,0,0,D,0,0);ctx.clearRect(0,0,W,H);ctx.drawImage(bg,0,0,W,H);boxes.length=0;const playing=controller?.playing&&dt>0;
   if(groups.length){groupDraw(dt,now,playing);fx.step(dt);ctx.save();fx.draw(ctx);ctx.restore();fx.weather(ctx,W,H,sc,t,now);cv.dataset.fxParts=String(fx.count);cv.dataset.mapReady=data||sc.atlasPlan?'true':'false';cv.dataset.mapUnits=String(groups.length);return;}
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
  // 範囲の広い合戦は、隊の位置のまとまり（地区）ごとに拡大して見られるようにする。
  function refreshViews(){VS=1;VX=0;VY=0;const pts=groups.filter(g=>g.point).map(g=>({g,p:pj(...g.point)}));const th=Math.min(W,H)*.2,cl=[];
   for(const q of pts){const hit=cl.filter(c=>c.some(o=>Math.hypot(o.p[0]-q.p[0],o.p[1]-q.p[1])<th));if(!hit.length)cl.push([q]);else{const m=hit.flat();for(const h of hit)cl.splice(cl.indexOf(h),1);cl.push([...m,q]);}}
   const xs=pts.map(q=>q.p[0]),ys=pts.map(q=>q.p[1]),spread=pts.length?Math.max(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys)):0;
   views=[];if(cl.length>=2&&spread>Math.min(W,H)*.4&&!sc.atlasPlan){views.push({name:'全体',s:1,x:0,y:0});
    for(const c of cl.sort((a,b)=>b.length-a.length).slice(0,5)){const cx=c.reduce((n,q)=>n+q.p[0],0)/c.length,cy=c.reduce((n,q)=>n+q.p[1],0)/c.length;
     const marks=[...(sc.atlasLandmarks||[]).map(m=>({name:m.name,lon:m.point[0],lat:m.point[1]})),...(meta.points||[])],named=marks.map(pt=>({n:pt.name,d:Math.hypot(...pj(pt.lon,pt.lat).map((v,i)=>v-[cx,cy][i]))})).filter(m=>!views.some(v=>v.name===m.n+'付近')).sort((a,b)=>a.d-b.d)[0];
     const name=named&&named.d<Math.min(W,H)*.3?named.n+'付近':(c[0].g.label||'').replace(/・.*$/,'').slice(0,10)||('地区'+views.length);
     const bw=Math.max(...c.map(q=>q.p[0]))-Math.min(...c.map(q=>q.p[0]))+Math.min(W,H)*.3,bh=Math.max(...c.map(q=>q.p[1]))-Math.min(...c.map(q=>q.p[1]))+Math.min(W,H)*.3,z=clamp(Math.min(W/bw,H/bh),1.4,3.5);
     views.push({name,s:z,x:clamp(cx*z-W/2,0,W*z-W),y:clamp(cy*z-H/2,0,H*z-H)});}}
   if(viewIndex>=views.length)viewIndex=0;const v=views[viewIndex];[VS,VX,VY]=v?[v.s,v.x,v.y]:[1,0,0];renderViews();}
  function renderViews(){const stage=cv.closest('.battle-stage');if(!stage)return;let bar=stage.querySelector('.atlas-views');if(!views.length){bar?.remove();return;}
   if(!bar){bar=document.createElement('div');bar.className='atlas-views';bar.setAttribute('role','group');bar.setAttribute('aria-label','表示する地区');stage.insertBefore(bar,stage.firstChild);}
   bar.replaceChildren(...views.map((v,i)=>{const b=document.createElement('button');b.type='button';b.className='mini';b.textContent=v.name;b.setAttribute('aria-pressed',String(i===viewIndex));b.onclick=()=>{viewIndex=i;[VS,VX,VY]=[v.s,v.x,v.y];motion=null;renderViews();backdrop();frameDraw();};return b;}));cv.dataset.atlasViews=String(views.length);}
  function size(){const r=cv.parentElement.getBoundingClientRect(),dock=cv.closest('.battle-stage')?.querySelector('.battle-dock')?.getBoundingClientRect().height||110,room=Math.max(240,(innerHeight-Math.max(0,r.top)-dock-28)/aspect),next=Math.max(240,Math.round(Math.min(r.width,room))),d=Math.min(2,devicePixelRatio||1);if(next===W&&d===D&&bg)return;W=next;H=Math.round(W*aspect);D=d;cv.style.width=W+'px';cv.style.height=H+'px';cv.style.margin='0 auto';cv.width=W*D;cv.height=H*D;refreshViews();backdrop();frameDraw();}
  // 再生中・粉が残る間・停止直後の静止描画を、一つの描画ループで行う。停止後は粉が消えると止まる（雨・霧は静止画で描く）。
  function loop(now){if(dead){fxRaf=0;return;}const dt=fxLast?Math.min(.1,(now-fxLast)/1000):0;fxLast=now;const live=controller.playing||fx.count>0;frameDraw(live?dt:0,now);if(!live){fxRaf=0;fxLast=0;return;}fxRaf=requestAnimationFrame(loop);}
  function wake(){if(!fxRaf){fxLast=0;fxRaf=requestAnimationFrame(loop);}}
  let controller=null;controller=TKBattlePresentation.record(cv,sc,{...opt,onProgress(v){t=v;opt.onProgress?.(v);wake();if(!controller?.playing){const key=Math.floor(t*20)+'|'+selected+'|'+sc.units.filter(u=>u.turn&&t>=u.turn[0]).map(u=>u.id).join(',');if(key!==lastKey){lastKey=key;frameDraw();}}}});
  const onClick=e=>{const r=cv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top,hit=boxes.filter(b=>x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h);if(hit.length){
   const label=hit.findLast(b=>b.label);selected=(label||hit[0]).id;
   const g=selectionGroup(selected);
   if(label)selectionPanel([selected]);
   else if(g){const p=pinFor(g),ids=locatedGroups().filter(q=>{const pin=pinFor(q);return p&&pin&&inside(...pin)&&Math.hypot(pin[0]-p[0],pin[1]-p[1])<20;}).map(q=>q.id);selectionPanel(ids);}
   frameDraw();
  }};

  cv.addEventListener('click',onClick);const ro=new ResizeObserver(size);size();ro.observe(cv.parentElement);
  if(!sc.atlasSchematic)load(meta).then(d=>{if(dead)return;data=d;backdrop();frameDraw();if(pendingPlay){pendingPlay=false;controller.play();}}).catch(()=>{if(dead)return;error='地形を読み込めません。ページを再読み込みしてください。';backdrop();frameDraw();});
  return {...controller,play(){if(!data&&!sc.atlasPlan){pendingPlay=true;return;}controller.play();wake();},pause(){pendingPlay=false;controller.pause();},seek(v){controller.seek(v);fx.clear();lastSnap=true;frameDraw();},get playing(){return pendingPlay||controller.playing;},get t(){return controller.t;},get ended(){return controller.ended;},get speed(){return controller.speed;},select(id){const u=unitById.get(id);if(u){const {from,until}=G.battleUnitWindow(sc,u);if(!visible(u)){controller.seek(t<from?Math.min(from+2,(from+until)/2,100):Math.max(from,until-1));fx.clear();lastSnap=true;}}selected=id;selectionPanel([id]);frameDraw();},unitStates(){return groups.map(g=>{const u=unitById.get(g.members[0]),move=moveByName.get(u.g||u.n),side=sideOf(u),status=t>=G.battleUnitWindow(sc,u).until?(sc.mapExitLabels?.[u.id]||'退去'):t<(sc.mapVisibleFrom?.[u.id]||0)?'参陣前':t<(u.from||0)?'着陣前':u.die!=null&&t>=u.die?'討死':u.rout!=null&&t>u.rout?'退却':move&&t>move.from&&t<move.to?'移動中':G.battleActiveUnits(sc,t).includes(u.id)?'交戦':t>=100?'戦闘終了':sc.atlasSchematic?(u.side==='b'?'守備':u.id===sc.atlasSchematic.lead&&t>=sc.atlasSchematic.capturedAt?'攻略':'攻撃命令'):'布陣';const schematic=!!(sc.atlasSchematic||sc.atlasPlan),drawGroup=g.point||schematic?g:estGroups.find(e=>e.members[0]===u.id)||g,screenPoint=pinFor(drawGroup);return {id:u.id,side,status,visible:visible(u),point:g.point?G.battlePhasePoint(sc,u.g||u.n,t,g.point):null,screenPoint,renderedPoint:!schematic&&screenPoint?unproject(screenPoint):null,positionBasis:schematic?'schematic':!screenPoint?'unplaced':!g.point?'estimated-placement':isEst(g)?'estimated-motion':'recorded'};});},destroy(){dead=true;cv.closest('.battle-stage')?.querySelector('.atlas-views')?.remove();if(fxRaf)cancelAnimationFrame(fxRaf);fxRaf=0;controller.destroy();ro.disconnect();cv.removeEventListener('click',onClick);}};
 }
 return {make,preload(title){const m=TK.BATTLE_ATLAS[title];return m&&!TK.BATTLES[title]?.atlasSchematic?load(m):Promise.resolve(null);}};
})();
