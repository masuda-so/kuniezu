"use strict";
/* ===== 合戦図の描画（陣立図ふうに、凸の駒を動かして合戦を見せる） ===== */
(function(){
const TAU=Math.PI*2;
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
function hex2(h){const n=parseInt(String(h).slice(1),16);return [n>>16,n>>8&255,n&255];}
function mix(h,w,t){const a=hex2(h),b=hex2(w);return `rgb(${a.map((v,i)=>Math.round(v+(b[i]-v)*t)).join(',')})`;}
function rgba(h,al){const a=hex2(h);return `rgba(${a[0]},${a[1]},${a[2]},${al})`;}
function srnd(seed){let s=seed>>>0||1;return ()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296;};}
const FONT='"Shippori Mincho B1","Hiragino Mincho ProN","Yu Mincho",serif';
// 青海波（合戦図の海）
const seaTile=(()=>{const R=22,c=document.createElement('canvas');c.width=R*2;c.height=R;const x=c.getContext('2d');const bg='#7f9fbe';x.fillStyle=bg;x.fillRect(0,0,R*2,R);
 const wave=(cx,cy)=>{x.beginPath();x.arc(cx,cy,R,0,TAU);x.fillStyle=bg;x.fill();for(let k=0;k<4;k++){const r=R*(1-k*.24)-1;if(r<2)break;x.beginPath();x.arc(cx,cy,r,0,TAU);x.lineWidth=k?1:1.4;x.strokeStyle=k?'rgba(220,235,248,.45)':'rgba(235,245,255,.6)';x.stroke();}};
 for(let row=-2;row<=4;row++){const cy=row*R/2,off=(row&1)?R:0;for(let col=-2;col<=3;col++)wave(col*R*2+off,cy);}return c;})();

// 経路を t で補間
function at(path,t){if(!path||!path.length)return [.5,.5];if(t<=path[0][0])return [path[0][1],path[0][2]];
 for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i];if(t<=b[0]){const k=(t-a[0])/Math.max(1e-6,b[0]-a[0]);const e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;return [a[1]+(b[1]-a[1])*e,a[2]+(b[2]-a[2])*e];}}
 const l=path[path.length-1];return [l[1],l[2]];}
// 滑らかな線（中点を通る二次曲線）
function smooth(c,pts){if(pts.length<2)return;c.moveTo(pts[0][0],pts[0][1]);if(pts.length===2){c.lineTo(pts[1][0],pts[1][1]);return;}
 for(let i=1;i<pts.length-1;i++){const mx=(pts[i][0]+pts[i+1][0])/2,my=(pts[i][1]+pts[i+1][1])/2;c.quadraticCurveTo(pts[i][0],pts[i][1],mx,my);}
 const l=pts[pts.length-1];c.lineTo(l[0],l[1]);}

function make(cv,sc,opt){
 opt=opt||{};const CC=opt.color||(k=>'#888');
 const ctx=cv.getContext('2d');let W=0,H=0,DPR=Math.min(2,devicePixelRatio||1),bg=null;
 const st={t:0,speed:1,playing:false,raf:0,last:0,beat:-1,ended:false};
 const U=sc.units.map(u=>({...u,ang:null,alpha:1,lost:0}));
 const byId={};U.forEach(u=>byId[u.id]=u);
 const beats=(sc.beats||[]).map(b=>({t:b[0],txt:b[1]||'',cl:b[2]||null})).sort((p,q)=>p.t-q.t);
 const clashes=[];beats.forEach((b,i)=>{if(b.cl){let e=b.t+12;for(let j=i+1;j<beats.length;j++)if(beats[j].t>b.t+2){e=Math.min(b.t+16,Math.max(b.t+8,beats[j].t+4));break;}clashes.push({a:b.cl[0],b:b.cl[1],t0:b.t,t1:e});}});
 const parts=[],LB=[];const R=srnd(1234);
 const X=x=>m+x*(W-2*m),Y=y=>m+y*(H-2*m);let m=18;
 function size(){st.cart=null;const r=cv.parentElement.getBoundingClientRect();W=Math.max(280,Math.round(r.width));H=Math.round(W*(opt.aspect||.62));m=Math.round(W*.03);
  cv.style.width=W+'px';cv.style.height=H+'px';cv.width=W*DPR;cv.height=H*DPR;drawBg();}
 function label(c,t,x,y,s,col,w,align){c.font=`${w||700} ${s}px ${FONT}`;c.textAlign=align||'center';c.textBaseline='middle';c.lineJoin='round';c.lineWidth=3.2;c.strokeStyle='rgba(246,239,220,.92)';c.strokeText(t,x,y);c.fillStyle=col||'#3a2a18';c.fillText(t,x,y);}
 function drawBg(){bg=document.createElement('canvas');bg.width=W*DPR;bg.height=H*DPR;const c=bg.getContext('2d');c.scale(DPR,DPR);
  // 紙
  // 布陣図のように、陸は淡い黄緑の地色で塗る（田畑や野の広がり）。紙の目は薄く残す
  {const g=c.createLinearGradient(0,0,W,H);g.addColorStop(0,'#dcd7a2');g.addColorStop(.5,'#d3d197');g.addColorStop(1,'#cbc890');c.fillStyle=g;c.fillRect(0,0,W,H);}
  const r=srnd(77);
  // 野の濃淡（ゆるやかなまだら）
  for(let i=0;i<40;i++){const x=r()*W,y=r()*H,R=30+r()*90;const g=c.createRadialGradient(x,y,0,x,y,R);const t=r()<.5;g.addColorStop(0,t?'rgba(150,165,95,.16)':'rgba(240,230,180,.18)');g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(x-R,y-R,R*2,R*2);}
  for(let i=0;i<W*H/110;i++){c.fillStyle=`rgba(${r()<.5?'95,100,55':'255,255,235'},${.025+r()*.04})`;c.fillRect(r()*W,r()*H,1+r()*1.5,1+r()*1.5);}
  const fs=sc.feats||[];
  const coast=(pts,amp,seed)=>{const rr=srnd(seed);const o=[];const onB=p=>p[0]<=.002||p[0]>=.998||p[1]<=.002||p[1]>=.998;
   for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];o.push(a);if(onB(a)&&onB(b)&&(a[0]===b[0]||a[1]===b[1]))continue;
    const L=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.max(1,Math.ceil(L/.012)),nx=-(b[1]-a[1])/(L||1),ny=(b[0]-a[0])/(L||1);let ph=rr()*6;
    for(let j=1;j<n;j++){const t=j/n,e=Math.sin(t*Math.PI);const d=(Math.sin(t*9+ph)*.5+Math.sin(t*23+ph*2)*.3+(rr()-.5)*.5)*amp*e;o.push([a[0]+(b[0]-a[0])*t+nx*d,a[1]+(b[1]-a[1])*t+ny*d]);}}
   return o.map(p=>[X(p[0]),Y(p[1])]);};
  for(const f of fs)if(f.k==='sea'||f.k==='lake'){const P=coast(f.pts,f.k==='sea'?.012:.006,f.pts.length*7+3);const path=()=>{c.beginPath();smooth(c,P);c.closePath();};
   path();c.strokeStyle=f.k==='lake'?'rgba(150,170,110,.6)':'rgba(230,218,170,.95)';c.lineWidth=f.k==='lake'?6:10;c.lineJoin='round';c.stroke(); // 砂浜・岸の草
   path();c.fillStyle=c.createPattern(seaTile,'repeat');c.fill();
   c.save();path();c.clip();const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'rgba(255,255,255,.08)');g.addColorStop(1,'rgba(20,40,70,.18)');c.fillStyle=g;c.fillRect(0,0,W,H);c.restore();
   path();c.strokeStyle='rgba(60,80,105,.75)';c.lineWidth=1.3;c.stroke();
   c.save();path();c.clip();c.strokeStyle='rgba(255,255,255,.7)';c.lineWidth=1;path();c.setLineDash([5,7]);c.lineWidth=5;c.strokeStyle='rgba(255,255,255,.35)';c.stroke();c.setLineDash([]);c.restore();
   if(f.n){let sx=0,sy=0;for(const p of f.pts){sx+=p[0];sy+=p[1];}sx/=f.pts.length;sy/=f.pts.length;label(c,f.n,X(sx),Y(sy),12,'#3d5d78',600);}}
  // 沼地：葦の茂み
  for(const f of fs)if(f.k==='marsh'){const P=coast(f.pts,.01,11);c.save();c.beginPath();smooth(c,P);c.closePath();c.fillStyle='rgba(150,170,150,.35)';c.fill();c.clip();
   for(let i=0;i<W*H/260;i++){const x=r()*W,y=r()*H;c.strokeStyle='rgba(70,100,70,.45)';c.lineWidth=.8;c.beginPath();c.moveTo(x,y);c.lineTo(x-1.5,y-5);c.moveTo(x,y);c.lineTo(x+1.5,y-5);c.stroke();
    if(r()<.15){c.fillStyle='rgba(120,150,175,.35)';c.beginPath();c.ellipse(x,y+3,6,2,0,0,TAU);c.fill();}}c.restore();}
  // 実際の地形（遊び手の野戦では、その場所の地図を下に敷く）
  if(sc.bg){c.save();c.globalAlpha=.9;c.drawImage(sc.bg,0,0,W,H);c.restore();c.save();c.globalCompositeOperation='multiply';c.fillStyle='rgba(222,226,170,.55)';c.fillRect(0,0,W,H);c.restore();}
  // 田（村の周りに田畑の区画）
  for(const f of fs)if(f.k==='village'){const x=X(f.x),y=Y(f.y);c.save();c.translate(x,y);c.rotate((r()-.5)*.5);c.strokeStyle='rgba(120,130,70,.35)';c.lineWidth=.6;
   for(let i=-3;i<=3;i++)for(let j=-2;j<=2;j++){if(r()<.25)continue;const w=11+r()*4,h=8+r()*3;c.fillStyle=`rgba(${170+r()*25},${178+r()*20},${110+r()*20},.28)`;c.fillRect(i*15-w/2+18,j*11-h/2,w,h);c.strokeRect(i*15-w/2+18,j*11-h/2,w,h);}c.restore();}
  // 山：絵図のように峰を重ねて描く（奥の峰ほど上、北西から光）
  for(const f of fs)if(f.k==='hill'){const cx=X(f.x),cy=Y(f.y),R=f.r*(W-2*m);const n=Math.max(2,Math.min(6,Math.round(R/14)+1));const pk=[];
   for(let i=0;i<n;i++){const a=r()*TAU,d=(i?r()*.55:0)*R;pk.push({x:cx+Math.cos(a)*d,y:cy+Math.sin(a)*d*.55,w:R*(i?.45+r()*.35:.8),h:R*(i?.4+r()*.35:.75)});}
   pk.sort((p,q)=>p.y-q.y);
   const sh=c.createRadialGradient(cx+R*.15,cy+R*.25,R*.2,cx,cy+R*.1,R*1.2);sh.addColorStop(0,'rgba(90,75,45,.22)');sh.addColorStop(1,'rgba(90,75,45,0)');c.fillStyle=sh;c.beginPath();c.ellipse(cx+R*.08,cy+R*.18,R*1.15,R*.6,0,0,TAU);c.fill();
   for(const p of pk){const L=p.x-p.w,Rr=p.x+p.w,base=p.y+p.h*.35,top=p.y-p.h*.65,skew=(r()-.5)*p.w*.3;
    const path=()=>{c.beginPath();c.moveTo(L,base);c.bezierCurveTo(L+p.w*.35,base-p.h*.2,p.x+skew-p.w*.35,top+p.h*.15,p.x+skew,top);c.bezierCurveTo(p.x+skew+p.w*.35,top+p.h*.15,Rr-p.w*.35,base-p.h*.2,Rr,base);c.closePath();};
    const g=c.createLinearGradient(L,top,Rr,base);g.addColorStop(0,'rgba(205,200,150,.95)');g.addColorStop(.45,'rgba(150,150,100,.92)');g.addColorStop(1,'rgba(95,100,65,.92)');
    path();c.fillStyle=g;c.fill();
    // 陰の側（右）にけば
    c.save();path();c.clip();c.strokeStyle='rgba(55,60,35,.35)';c.lineWidth=.8;for(let k=0;k<9;k++){const t=.15+k*.09;const x0=p.x+skew+p.w*t*.6,y0=top+p.h*t*.5;c.beginPath();c.moveTo(x0,y0);c.quadraticCurveTo(x0+p.w*.12,y0+p.h*.35,x0+p.w*.08,base);c.stroke();}
    c.fillStyle='rgba(255,250,225,.18)';c.beginPath();c.moveTo(p.x+skew,top);c.lineTo(L+p.w*.3,base);c.lineTo(L,base);c.closePath();c.fill();c.restore();
    c.strokeStyle='rgba(50,42,25,.75)';c.lineWidth=1.2;c.beginPath();c.moveTo(L,base);c.bezierCurveTo(L+p.w*.35,base-p.h*.2,p.x+skew-p.w*.35,top+p.h*.15,p.x+skew,top);c.bezierCurveTo(p.x+skew+p.w*.35,top+p.h*.15,Rr-p.w*.35,base-p.h*.2,Rr,base);c.stroke();
    // 峰の木立
    for(let k=0;k<3;k++){const tx=p.x+skew+(r()-.5)*p.w*.6,ty=top+p.h*(.25+r()*.4);c.fillStyle='rgba(60,80,45,.45)';c.beginPath();c.arc(tx,ty,1.6+r()*1.6,0,TAU);c.fill();}}
   if(f.n)label(c,f.n,cx,cy-R*.75-8,12,'#4a3a20');}
  for(const f of fs)if(f.k==='forest'){const cx=X(f.x),cy=Y(f.y),rr=f.r*(W-2*m);const n=Math.round(rr*.5)+4;
   for(let i=0;i<n;i++){const a=r()*TAU,d=Math.sqrt(r())*rr;const x=cx+Math.cos(a)*d,y=cy+Math.sin(a)*d*.75;c.beginPath();c.arc(x,y,3.2+r()*2,0,TAU);c.fillStyle=`rgba(${90+r()*20},${110+r()*20},70,.55)`;c.fill();c.strokeStyle='rgba(60,75,40,.45)';c.lineWidth=.6;c.stroke();}}
  {const RV=fs.filter(f=>f.k==='river').map(f=>{const pts=f.pts.map(p=>[X(p[0]),Y(p[1])]);const w=(f.w||1.4)*W/320;
    const dense=[];for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1];const L=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.max(1,Math.ceil(L/6));for(let j=0;j<n;j++){const t=j/n;dense.push([a[0]+(b[0]-a[0])*t+Math.sin((i*n+j)*.7)*.8,a[1]+(b[1]-a[1])*t+Math.cos((i*n+j)*.6)*.8]);}}dense.push(pts[pts.length-1]);
    return {f,pts,w,dense};});
   c.lineCap='round';c.lineJoin='round';
   // 下流ほど太く：川を四つに分けて、少しずつ太くする（つなぎ目は重ねて描く）
   const layer=(col,add)=>{for(const R of RV){const n=R.dense.length,K=4;for(let k=0;k<K;k++){const a=Math.floor(k*n/K),b=Math.min(n,Math.floor((k+1)*n/K)+2);const part=R.dense.slice(a,b);if(part.length<2)continue;c.beginPath();smooth(c,part);c.strokeStyle=col;c.lineWidth=(R.w+add)*(.8+.4*k/(K-1));c.stroke();}}};
   layer('rgba(196,200,140,.75)',11);layer('rgba(110,135,95,.38)',5);layer('#5d84a6',2.2);layer('#94b6d2',0);
   for(const R of RV){c.beginPath();smooth(c,R.dense);c.strokeStyle='rgba(255,255,255,.4)';c.lineWidth=Math.max(.6,R.w*.22);c.setLineDash([8,12]);c.stroke();c.setLineDash([]);}
   for(const R of RV)if(R.f.n){const i=Math.floor(R.pts.length/2);const a=R.pts[i-1]||R.pts[0],b=R.pts[i];label(c,R.f.n,(a[0]+b[0])/2,(a[1]+b[1])/2-11,11.5,'#355a78',600);}}
  for(const f of fs)if(f.k==='road'){const pts=f.pts.map(p=>[X(p[0]),Y(p[1])]);const main=/東海道|東山道|北陸道|山陽道|北国|街道/.test(f.n||'');
   c.lineCap='round';c.lineJoin='round';c.beginPath();smooth(c,pts);c.strokeStyle='rgba(120,90,55,.45)';c.lineWidth=main?5.5:4;c.stroke();c.beginPath();smooth(c,pts);c.strokeStyle='rgba(226,206,160,.95)';c.lineWidth=main?3.6:2.4;c.stroke();
   if(main){for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1],L=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.floor(L/16);const nx=-(b[1]-a[1])/(L||1),ny=(b[0]-a[0])/(L||1);
     for(let j=0;j<n;j++){if(r()<.3)continue;const t=(j+.5)/n,x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t;for(const sd of [-1,1]){c.fillStyle='rgba(50,85,45,.6)';c.beginPath();c.arc(x+nx*6*sd,y+ny*6*sd,1.7,0,TAU);c.fill();}}}}
   if(f.n){const p=pts[Math.max(1,Math.floor(pts.length*.3))];label(c,f.n,p[0],p[1]+11,10.5,'#7a5a34',500);}}
  for(const f of fs)if(f.k==='fence'){const pts=f.pts.map(p=>[X(p[0]),Y(p[1])]);if(f.closed)pts.push(pts[0]);c.strokeStyle='#5b3c1f';c.lineWidth=2;c.beginPath();smooth(c,pts);if(f.closed)c.closePath();c.stroke();
   for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1],L=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.ceil(L/7);for(let j=0;j<n;j++){const x=a[0]+(b[0]-a[0])*j/n,y=a[1]+(b[1]-a[1])*j/n;c.beginPath();c.moveTo(x-3,y-3);c.lineTo(x+3,y+3);c.lineWidth=1.3;c.stroke();}}
   if(f.n){const p=pts[0];label(c,f.n,p[0],p[1]-10,11,'#5b3c1f');}}
  for(const f of fs){const x=X(f.x),y=Y(f.y);
   if(f.k==='village'){c.fillStyle='rgba(120,88,54,.7)';for(const [dx,dy] of [[-6,0],[3,-4],[5,4],[-2,6]]){c.fillRect(x+dx-2.5,y+dy-2,5,4);}if(f.n)label(c,f.n,x,y+15,11,'#5a4426',600);}
   if(f.k==='castle'){// 城：水堀と石垣、曲輪、天守（布陣図の城の描き方）
    const R=(W/760)*(f.s||1)*16;const rr=srnd((f.n||'c').length*31+Math.round(x));const rot=(rr()-.5)*.25;
    c.save();c.translate(x,y);c.rotate(rot);
    const rnd=(w,h,r0)=>{c.beginPath();c.moveTo(-w+r0,-h);c.lineTo(w-r0,-h);c.quadraticCurveTo(w,-h,w,-h+r0);c.lineTo(w,h-r0);c.quadraticCurveTo(w,h,w-r0,h);c.lineTo(-w+r0,h);c.quadraticCurveTo(-w,h,-w,h-r0);c.lineTo(-w,-h+r0);c.quadraticCurveTo(-w,-h,-w+r0,-h);c.closePath();};
    if(f.s>=1.6){rnd(R*1.85,R*1.45,R*.5);c.fillStyle='rgba(225,215,170,.6)';c.fill();c.setLineDash([3,3]);c.strokeStyle='#5b3c1f';c.lineWidth=1.2;c.stroke();c.setLineDash([]);} // 総構え
    rnd(R*1.3,R*1.05,R*.25);c.fillStyle='#5f8fb8';c.fill();c.strokeStyle='rgba(40,60,90,.8)';c.lineWidth=1;c.stroke(); // 外堀
    rnd(R*1.05,R*.82,R*.15);c.fillStyle='#d8d2bd';c.fill();c.strokeStyle='#6b6458';c.lineWidth=1.6;c.stroke(); // 石垣・二の丸
    rnd(R*.62,R*.5,R*.08);c.fillStyle='#5f8fb8';c.fill(); // 内堀
    rnd(R*.48,R*.37,R*.05);c.fillStyle='#ece6d2';c.fill();c.strokeStyle='#6b6458';c.lineWidth=1.3;c.stroke(); // 本丸
    // 天守
    c.fillStyle='#f7f2e2';c.fillRect(-R*.2,-R*.28,R*.4,R*.3);c.fillStyle='#3b3128';c.beginPath();c.moveTo(-R*.3,-R*.26);c.lineTo(0,-R*.5);c.lineTo(R*.3,-R*.26);c.closePath();c.fill();
    c.beginPath();c.moveTo(-R*.25,R*.04);c.lineTo(R*.25,R*.04);c.lineTo(R*.2,-R*.02);c.lineTo(-R*.2,-R*.02);c.closePath();c.fill();
    c.restore();if(f.n)label(c,f.n,x,y+R*1.05+12,12,'#2a1d10',800);}
   if(f.k==='fort'){c.strokeStyle='#4a3a28';c.lineWidth=1.6;c.strokeRect(x-6,y-6,12,12);c.beginPath();c.moveTo(x+6,y-6);c.lineTo(x+6,y-15);c.stroke();c.fillStyle='#b8402c';c.fillRect(x+6,y-15,7,4.5);if(f.n)label(c,f.n,x,y+15,10.5,'#4a3a28',600);}}
  // 方位
  c.save();c.translate(W-m-12,m+14);c.strokeStyle='#5a4426';c.fillStyle='#5a4426';c.lineWidth=1;c.beginPath();c.moveTo(0,-10);c.lineTo(4,4);c.lineTo(0,1);c.lineTo(-4,4);c.closePath();c.fill();label(c,'北',0,-18,10,'#5a4426');c.restore();
  // 縁
  const v=c.createRadialGradient(W/2,H/2,Math.min(W,H)*.3,W/2,H/2,Math.max(W,H)*.75);v.addColorStop(0,'rgba(60,70,30,0)');v.addColorStop(1,'rgba(60,70,30,.22)');c.fillStyle=v;c.fillRect(0,0,W,H);
  c.strokeStyle='rgba(70,48,22,.6)';c.lineWidth=1.5;c.strokeRect(4.5,4.5,W-9,H-9);c.lineWidth=.6;c.strokeRect(8.5,8.5,W-17,H-17);}

 function posOf(u,t){let [x,y]=at(u.path,t);
  if(u.rout!=null&&t>u.rout&&(u.path[u.path.length-1][0]<=u.rout)){const e=nearestEnemy(u,u.rout);const [ex,ey]=e?at(e.path,u.rout):[.5,.5];const [ox,oy]=at(u.path,u.rout);const d=Math.hypot(ox-ex,oy-ey)||1;const k=(t-u.rout)*.006;x=ox+(ox-ex)/d*k;y=oy+(oy-ey)/d*k;}
  // 組み合っている間は少し寄せ合う
  for(const cl of clashes){if(t<cl.t0||t>cl.t1)continue;if(cl.a!==u.id&&cl.b!==u.id)continue;const o=byId[cl.a===u.id?cl.b:cl.a];if(!o)continue;const [ox,oy]=at(o.path,t);const d=Math.hypot(ox-x,oy-y);if(d<.001)continue;
   const want=.045,k=clamp((d-want)/d,0,1)*Math.sin(Math.PI*(t-cl.t0)/(cl.t1-cl.t0))*.45;x+=(ox-x)*k;y+=(oy-y)*k;}
  return [x,y];}
 function alive(u,t){return u.die==null||t<u.die;}
 // 寝返り：turn=[時, 新しい側]
 function sd(u,t){return u.turn&&t>=u.turn[0]?u.turn[1]:u.side;}
 function nearestEnemy(u,t){let b=null,bd=1e9;const [x,y]=at(u.path,t);for(const v of U){if(sd(v,t)===sd(u,t)||!alive(v,t)||v.extra)continue;const [a,c]=at(v.path,t);const d=Math.hypot(a-x,c-y);if(d<bd){bd=d;b=v;}}return b;}
 function heading(u,t){const [x0,y0]=posOf(u,Math.max(0,t-1.2)),[x1,y1]=posOf(u,t+1.2);const dx=x1-x0,dy=(y1-y0)*(H/W);
  if(Math.hypot(dx,dy)>.0015)return Math.atan2(dy,dx);
  const e=nearestEnemy(u,t);if(e){const [a,b]=at(e.path,t),[x,y]=at(u.path,t);return Math.atan2((b-y)*(H/W),a-x);}return sd(u,t)==='a'?0:Math.PI;}
 function piece(c,u,x,y,ang,k,t){
  const bw=30*k,bh=20*k,hw=16*k,hh=11*k;const dead=!alive(u,t),routed=u.rout!=null&&t>u.rout;const side=sd(u,t);
  const col=dead?'#8a8174':CC((sc.sides&&sc.sides[side]&&sc.sides[side].clan)||u.clan);
  c.save();c.globalAlpha=u.alpha;c.translate(x,y);c.rotate(ang+Math.PI/2);
  const shape=()=>{c.beginPath();c.moveTo(-bw/2,bh/2);c.lineTo(-bw/2,-bh/2+hh/2);c.lineTo(-hw/2,-bh/2+hh/2);c.lineTo(-hw/2,-bh/2-hh/2);c.lineTo(hw/2,-bh/2-hh/2);c.lineTo(hw/2,-bh/2+hh/2);c.lineTo(bw/2,-bh/2+hh/2);c.lineTo(bw/2,bh/2);c.closePath();};
  c.save();c.shadowColor='rgba(0,0,0,.45)';c.shadowBlur=4;c.shadowOffsetY=2;shape();c.fillStyle=col;c.fill();c.restore();
  shape();c.lineJoin='round';c.lineWidth=1.4;c.strokeStyle=side==='a'&&opt.mine?'#f2d27c':'rgba(255,250,235,.95)';c.stroke();
  c.fillStyle='rgba(0,0,0,.22)';c.fillRect(-bw/2+1.5,bh/2-4*k,bw-3,3*k);
  c.restore();
  if(!dead){c.save();c.globalAlpha=u.alpha;const fx=x+bw*.42,fy=y-bh*.35;const wv=Math.sin(performance.now()/260+(u.id||'').length)*1.5;c.strokeStyle='#3a2a18';c.lineWidth=1.2;c.beginPath();c.moveTo(fx,fy+6*k);c.lineTo(fx,fy-14*k);c.stroke();
   c.fillStyle=CC(u.clan);c.beginPath();c.moveTo(fx,fy-14*k);c.lineTo(fx+6*k+wv,fy-13*k);c.lineTo(fx+6*k+wv*.6,fy-4*k);c.lineTo(fx,fy-5*k);c.closePath();c.fill();c.strokeStyle='rgba(255,250,235,.8)';c.lineWidth=.6;c.stroke();c.restore();}
  c.save();c.globalAlpha=u.alpha;
  const ch=({yari:'槍',kiba:'騎',teppo:'鉄',ikki:'門',suigun:'船'})[u.arm]||'槍';
  c.font=`800 ${Math.round(12*k)}px ${FONT}`;c.textAlign='center';c.textBaseline='middle';c.lineWidth=2.6;c.strokeStyle='rgba(20,12,4,.65)';c.strokeText(ch,x,y+1);c.fillStyle='#fff7e2';c.fillText(ch,x,y+1);
  if(dead){c.strokeStyle='#b0221a';c.lineWidth=2.4;c.beginPath();c.moveTo(x-9*k,y-9*k);c.lineTo(x+9*k,y+9*k);c.moveTo(x+9*k,y-9*k);c.lineTo(x-9*k,y+9*k);c.stroke();}
  const im=opt.face&&u.g?opt.face(u.g,Math.round(9*k),CC(u.clan)):null;
  if(im)c.drawImage(im,x-bw/2-im.css*.7,y-bh/2-im.css*.8,im.css,im.css);
  const main=u.g||u.n,subt=(dead?'討死':routed?'敗走':'')+(u.g&&u.n&&u.n!==u.g?(dead||routed?'・':'')+u.n:'');
  LB.push({x,y:y+bh/2+hh/2+6*k,t:main,s:Math.round(clamp(10*k,9.5,11.5)),col:dead?'#7a2218':'#1f160c',bc:col,sub:subt,sc:dead?'#9a2a1c':routed?'#6b5a44':'#5a4426',pr:(dead?0:1e6)+(u.tr||0),al:u.alpha,gone:dead&&t-u.die>12,top:y-bh/2-hh-4*k});
  c.restore();}
 function spawn(x,y,kind,dir){if(parts.length>400)return;
  if(kind==='spark')for(let i=0;i<3;i++)parts.push({x,y,vx:(R()-.5)*90,vy:(R()-.5)*90-20,l:.35+R()*.3,a:0,k:'s'});
  if(kind==='dust')parts.push({x:x+(R()-.5)*18,y:y+(R()-.5)*12,vx:(R()-.5)*8,vy:-6-R()*6,l:1.2,a:0,k:'d',r:4+R()*5});
  if(kind==='smoke')parts.push({x,y,vx:Math.cos(dir)*18+(R()-.5)*6,vy:Math.sin(dir)*18-6,l:1.6,a:0,k:'m',r:3+R()*3});
  if(kind==='flash')parts.push({x,y,dir,l:.12,a:0,k:'f'});}
 function frame(dt){
  const t=st.t;const c=ctx;c.setTransform(DPR,0,0,DPR,0,0);c.drawImage(bg,0,0,W,H);
  const kb=W/760;
  // 通った跡
  for(const u of U){if(u.path.length<2)continue;const pts=[];for(let s=u.path[0][0];s<=Math.min(t,u.path[u.path.length-1][0]);s+=1.5){const [x,y]=posOf(u,s);pts.push([X(x),Y(y)]);}
   if(pts.length>1){const cc=CC(u.clan).startsWith('#')?CC(u.clan):'#888888';c.beginPath();smooth(c,pts);c.strokeStyle='rgba(255,252,240,.55)';c.lineWidth=4.2*kb+2;c.lineCap='round';c.lineJoin='round';c.stroke();c.beginPath();smooth(c,pts);c.strokeStyle=rgba(cc,.62);c.lineWidth=2.4*kb+1;c.stroke();}}
  // 組み合い
  for(const cl of clashes){if(t<cl.t0||t>cl.t1)continue;const a=byId[cl.a],b=byId[cl.b];if(!a||!b)continue;const [ax,ay]=posOf(a,t),[bx,by]=posOf(b,t);const mx=X((ax+bx)/2),my=Y((ay+by)/2);
   const p=.5+.5*Math.sin(performance.now()/90);c.beginPath();c.arc(mx,my,(14+p*6)*kb+6,0,TAU);c.fillStyle=`rgba(255,120,50,${.12+p*.12})`;c.fill();
   if(st.playing&&R()<dt*40)spawn(mx+(R()-.5)*16,my+(R()-.5)*10,'spark');if(st.playing&&R()<dt*14)spawn(mx,my,'dust');}
  // 駒
  LB.length=0;const order=U.slice().sort((a,b)=>alive(a,t)-alive(b,t));
  for(const u of order){if(t<(u.from||0)||(u.hideAt!=null&&t>u.hideAt))continue;const [x,y]=posOf(u,t);let a=heading(u,t);
   if(u.ang==null)u.ang=a;let d=a-u.ang;while(d>Math.PI)d-=TAU;while(d<-Math.PI)d+=TAU;u.ang+=d*clamp(dt*6,0,1);if(!st.playing&&dt===0)u.ang=a;
   const dead=!alive(u,t),routed=u.rout!=null&&t>u.rout;u.alpha=dead?clamp(1-(t-u.die)/10,.32,1):routed?clamp(1-(t-u.rout)/14,.45,1):1;
   if(x<-.2||x>1.2||y<-.2||y>1.2)continue;
   const k=clamp(.72+Math.sqrt(u.tr||1000)/150,.8,1.5)*clamp(kb,.62,1.1);
   piece(c,u,X(x),Y(y),u.ang,k,t);
   if(u.fire&&t>=u.fire[0]&&t<=u.fire[1]&&alive(u,t)){const e=nearestEnemy(u,t);if(e){const [ex,ey]=posOf(e,t);const dir=Math.atan2(Y(ey)-Y(y),X(ex)-X(x));const fx=X(x)+Math.cos(dir)*16*k,fy=Y(y)+Math.sin(dir)*16*k;
    if(st.playing&&R()<dt*16){spawn(fx+(R()-.5)*12,fy+(R()-.5)*12,'flash',dir);spawn(fx,fy,'smoke',dir);}}}}
  // 名札（重なるものは上に逃がすか、小さい隊の大将名を省く）
  const boxes=[];const hit=(b)=>boxes.some(o=>b[0]<o[2]&&b[2]>o[0]&&b[1]<o[3]&&b[3]>o[1]);
  c.font=`800 11px ${FONT}`;
  for(const L of LB.sort((a,b)=>b.pr-a.pr)){if(L.gone)continue;const w=c.measureText(L.t).width*L.s/11+6;const w2=L.sub?c.measureText(L.sub).width*.9+6:0;const ww=Math.max(w,w2)/2;
   const hgt=L.sub?L.s+12:L.s+2;let y0=L.y-L.s/2;let b=[L.x-ww,y0,L.x+ww,y0+hgt];
   if(hit(b)){y0=L.top-hgt;b=[L.x-ww,y0,L.x+ww,y0+hgt];}
   if(hit(b)){const b1=[L.x-w/2,L.y-L.s/2,L.x+w/2,L.y+L.s/2];if(hit(b1))continue;b=b1;L.sub='';y0=L.y-L.s/2;}
   boxes.push(b);c.save();c.globalAlpha=Math.max(.55,L.al);
   // 布陣図の名札：白い札に、家の色の縁
   c.font=`800 ${L.s}px ${FONT}`;const tw=c.measureText(L.t).width+8;c.fillStyle='rgba(255,252,240,.93)';c.fillRect(L.x-tw/2,y0-1,tw,L.s+3);c.strokeStyle=L.bc||'#5a4426';c.lineWidth=1.2;c.strokeRect(L.x-tw/2+.5,y0-.5,tw-1,L.s+2);
   c.fillStyle=L.col;c.textAlign='center';c.textBaseline='middle';c.fillText(L.t,L.x,y0+L.s/2+1);
   if(L.sub)label(c,L.sub,L.x,y0+L.s+8,9.5,L.sc,600);c.restore();}
  // 粉
  for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.a+=dt;if(p.a>p.l){parts.splice(i,1);continue;}const f=1-p.a/p.l;
   if(p.k==='s'){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=120*dt;c.fillStyle=`rgba(255,${180+Math.round(60*f)},80,${f})`;c.fillRect(p.x-1,p.y-1,2.2,2.2);}
   else if(p.k==='d'){p.x+=p.vx*dt;p.y+=p.vy*dt;c.beginPath();c.arc(p.x,p.y,p.r*(1.6-f*.6),0,TAU);c.fillStyle=`rgba(150,125,90,${.22*f})`;c.fill();}
   else if(p.k==='m'){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.97;c.beginPath();c.arc(p.x,p.y,p.r*(2.4-f*1.4),0,TAU);c.fillStyle=`rgba(235,232,225,${.55*f})`;c.fill();}
   else if(p.k==='f'){c.strokeStyle=`rgba(255,220,120,${f})`;c.lineWidth=2;c.beginPath();c.moveTo(p.x,p.y);c.lineTo(p.x+Math.cos(p.dir)*14,p.y+Math.sin(p.dir)*14);c.stroke();}}
  // 雨と霧
  const bell=(iv)=>{if(!iv||t<iv[0]-4||t>iv[1]+4)return 0;return clamp(Math.min(t-iv[0]+4,iv[1]+4-t)/6,0,1);};
  const rn=bell(sc.rain);if(rn>0){c.fillStyle=`rgba(60,70,85,${.16*rn})`;c.fillRect(0,0,W,H);c.strokeStyle=`rgba(210,220,235,${.5*rn})`;c.lineWidth=1;const off=(performance.now()/3)%40;c.beginPath();
   const r2=srnd(5);for(let i=0;i<W*H/2600*rn;i++){const x=r2()*W,y=(r2()*H+off*(1+r2()))%H;c.moveTo(x,y);c.lineTo(x-4,y+13);}c.stroke();}
  const fg=bell(sc.fog);if(fg>0){c.fillStyle=`rgba(240,240,236,${.62*fg})`;c.fillRect(0,0,W,H);}
  // 題簽（布陣図の題）
  {const ttl=opt.title||sc.title||'';if(ttl){const ds=String(sc.date||'');const era=(ds.match(/^[^年]*年/)||[''])[0];const md=ds.slice(era.length).split('（')[0];
   const lines=[[ttl,15,800],['布陣図',12,700],[era,12,600],[md,12,600]].filter(l=>l[0]);c.font=`800 15px ${FONT}`;let w=0;for(const [tx,sz,wt] of lines){c.font=`${wt} ${sz}px ${FONT}`;w=Math.max(w,c.measureText(tx).width);}
   const bw2=w+22,bh2=lines.reduce((a,l)=>a+l[1]+5,0)+12;
   if(!st.cart){const cand=[[m+10,m+10],[m+10,H-m-14-bh2],[W-m-10-bw2,H-m-14-bh2],[W-m-10-bw2,m+34]];let best=cand[0],bs=1e9;
    for(const [cx0,cy0] of cand){let n=0;for(const u2 of U)for(let tt=0;tt<=100;tt+=5){const [ux,uy]=at(u2.path,tt);const px=X(ux),py=Y(uy);if(px>cx0-30&&px<cx0+bw2+30&&py>cy0-30&&py<cy0+bh2+40)n++;}
     for(const f of (sc.feats||[]))if(f.n&&f.x!=null){const px=X(f.x),py=Y(f.y);if(px>cx0-10&&px<cx0+bw2+10&&py>cy0-10&&py<cy0+bh2+10)n+=3;}
     if(n<bs){bs=n;best=[cx0,cy0];}}st.cart=best;}
   const [bx,by]=st.cart;
   c.fillStyle='rgba(18,14,10,.88)';c.fillRect(bx,by,bw2,bh2);c.strokeStyle='rgba(255,252,240,.85)';c.lineWidth=1.2;c.strokeRect(bx+3.5,by+3.5,bw2-7,bh2-7);
   let yy=by+9;for(const [tx,sz,wt] of lines){c.font=`${wt} ${sz}px ${FONT}`;c.fillStyle='#fbf6e8';c.textAlign='center';c.textBaseline='top';c.fillText(tx,bx+bw2/2,yy);yy+=sz+5;}}}
  // 進み具合
  c.fillStyle='rgba(70,48,22,.2)';c.fillRect(m,H-7,W-2*m,2.5);c.fillStyle='rgba(150,40,26,.85)';c.fillRect(m,H-7,(W-2*m)*t/100,2.5);
 }
 function curBeat(t){let b=-1;for(let i=0;i<beats.length;i++)if(beats[i].t<=t&&beats[i].txt)b=i;return b;}
 function step(now){const dt=st.last?Math.min(.1,(now-st.last)/1000):0;st.last=now;
  if(st.playing){st.t=Math.min(100,st.t+dt*st.speed*(100/(opt.dur||42)));if(st.t>=100){st.playing=false;st.ended=true;opt.onEnd&&opt.onEnd();opt.onState&&opt.onState();}}
  const b=curBeat(st.t);if(b!==st.beat){st.beat=b;opt.onBeat&&opt.onBeat(b>=0?beats[b]:null,beats.filter((x,i)=>i<=b&&x.txt));}
  frame(st.playing?dt:Math.min(dt,.03));st.raf=requestAnimationFrame(step);}
 const ro=new ResizeObserver(()=>{size();});
 size();ro.observe(cv.parentElement);st.raf=requestAnimationFrame(step);
 return {play(){if(st.t>=100){st.t=0;U.forEach(u=>u.ang=null);}st.playing=true;st.ended=false;opt.onState&&opt.onState();},pause(){st.playing=false;opt.onState&&opt.onState();},
  toggle(){st.playing?this.pause():this.play();},get playing(){return st.playing;},get t(){return st.t;},get ended(){return st.ended;},
  setSpeed(s){st.speed=s;opt.onState&&opt.onState();},get speed(){return st.speed;},
  seek(t){st.t=clamp(t,0,100);parts.length=0;U.forEach(u=>u.ang=null);},
  destroy(){cancelAnimationFrame(st.raf);ro.disconnect();}};
}

/* ===== 遊び手の野戦から合戦図をつくる ===== */
const FORM_POS={ // 手前（敵の方）が +x。先頭が本陣
 kakuyoku:[[-.08,0],[.0,-.12],[.0,.12],[.05,-.24],[.05,.24]],
 gyorin:[[-.08,0],[.08,0],[.02,-.075],[.02,.075],[-.04,-.15],[-.04,.15]],
 hoshi:[[-.09,0],[.11,0],[.05,0],[0,-.065],[0,.065],[-.04,0]],
 houen:[[0,0],[.08,0],[.03,-.1],[.03,.1],[-.07,-.07],[-.07,.07]]};
const FNAME=['本陣','先手','右備','左備','後備','遊軍'];
function gen(res,o){
 // o: {a:{clan,gens:[名],arm,n}, b:{...}, seed, place}
 const r=srnd(o.seed||7);const units=[],beats=[];
 const sh=(side)=>side==='a'?1:-1;
 const mk=(side,form)=>{const S0=o[side],s=sh(side),cx0=side==='a'?.16:.84,cx1=side==='a'?.38:.62;const tr0=side==='a'?res.a0:res.b0;
  const F=FORM_POS[form],n=F.length;F.forEach((p,i)=>{const g=S0.gens[i]||'';const arm=i===0?S0.arm:(S0.arm==='teppo'&&i<3?'teppo':S0.arm==='kiba'&&i%2?'kiba':'yari');
   const y=.5+p[1]*1.15,x0=cx0+p[0]*s*.7,x1=cx1+p[0]*s;
   units.push({id:side+i,side,clan:S0.clan,n:FNAME[i],g,tr:Math.round(tr0/n*(i===0?1.3:.94)),arm,path:[[0,x0,y],[22,x1,y]],ord:i,px:p[0]});});};
 mk('a',res.fa);mk('b',res.fb);
 const A=units.filter(u=>u.side==='a'),B=units.filter(u=>u.side==='b');
 // 本隊のほかの小さな隊：物見（合戦の前に敵を探って戻る）と小荷駄（後ろで兵糧を守る）
 const EX={a:{},b:{}};
 for(const side of ['a','b']){const S0=o[side],s=sh(side),cx0=side==='a'?.16:.84,tr0=side==='a'?res.a0:res.b0;const yy=r()<.5?.28:.72;
  const sc={id:side+'s',side,clan:S0.clan,n:'物見',g:'',tr:120,arm:'kiba',path:[[0,cx0+s*.04,.5],[5,.5-s*.07,yy],[12,.5-s*.05,yy+(r()-.5)*.08],[19,cx0+s*.06,.5]],ord:9,px:-3,extra:1,hideAt:20};
  const sp={id:side+'k',side,clan:S0.clan,n:'小荷駄',g:'',tr:Math.max(200,Math.round(tr0*.06/100)*100),arm:'yari',path:[[0,cx0-s*.11,.5+(r()<.5?-.2:.2)]],ord:8,px:-2,extra:1};
  units.push(sc,sp);EX[side]={sc,sp};}
 beats.push([5,'両軍の物見が野を駆け、敵の陣立てを探る。']);
 const front=L=>L.slice().sort((p,q)=>q.px-p.px);
 beats.push([0,`${o.place?o.place+'で、':''}${o.a.n}と${o.b.n}が向かい合う。${res.rain?'雨が降りしきる。':''}${res.river?'間には川が流れている。':''}`]);
 const FN={kakuyoku:'鶴翼',gyorin:'魚鱗',hoshi:'鋒矢',houen:'方円'};
 const beatF=o.formBeat||'';
 beats.push([12,`法螺貝が鳴り、陣太鼓が響く。味方は${FN[res.fa]}、敵は${FN[res.fb]}の陣を敷いた。${beatF}`]);
 {const AN={teppo:'鉄砲',kiba:'騎馬',yari:'長槍の足軽',ikki:'門徒',suigun:'水軍'};const t=[];
  if(res.armA==='teppo'||res.armB==='teppo')t.push(res.rain?'雨で火縄が湿り、鉄砲は思うように撃てない。':(res.armA==='teppo'?'味方の鉄砲が':'敵の鉄砲が')+'緒戦に火を噴く。');
  if(res.armA==='kiba'||res.armB==='kiba')t.push((res.rough<.08?'開けた野は騎馬の駆ける地。':'起伏の多い地で、騎馬は動きにくい。'));
  if(t.length)beats.push([19,t.join('')]);}
 if(res.ta==='hiku'||res.tb==='hiku'){const W=res.ta==='hiku'?A:B,P=res.ta==='hiku'?B:A,s=res.ta==='hiku'?-1:1;
  W.forEach(u=>{const l=u.path[u.path.length-1];u.path.push([30,l[1],l[2]],[70,l[1]+s*.7,l[2]]);u.rout=34;});
  P.forEach(u=>{const l=u.path[u.path.length-1];u.path.push([34,l[1],l[2]],[70,l[1]-s*.14,l[2]]);});
  beats.push([30,res.ta==='hiku'?'味方は戦わずに兵を引いた。':'敵は戦わずに兵を引いた。']);
  beats.push([72,res.ta==='hiku'?`殿が追い討ちを受けたが、大きな損害は出なかった（−${(res.rounds[0]||{}).la||0}）。`:`敵は退いた。${o.b.n}を追い払った。`]);
  return {units,beats,feats:o.feats?o.feats.concat(feats(res,r,true)):feats(res,r),bg:o.bg||null,rain:res.rain?[0,100]:null,place:o.place};}
 // 奇襲
 let t=24;
 const flank=(L,E,side,ok)=>{const u=L[L.length-1];const s=sh(side);const l=u.path[u.path.length-1];const ey=l[2]<.5?.06:.94;const tx=side==='a'?.66:.34;
  u.path.push([24,l[1],l[2]],[34,l[1]+s*.12,ey],[44,tx+s*.02,ey],[52,tx,ok?.5+(l[2]<.5?-.18:.18):ey+(ey<.5?.08:-.08)]);if(!ok)u.path.push([60,tx-s*.05,ey],[72,l[1],ey<.5?.2:.8]);return u;};
 if(res.ta==='kishu'){const u=flank(A,B,'a',res.kishuA);beats.push([24,`${u.g||u.n}の隊が、敵の目を盗んで回り込む。`]);beats.push([52,res.kishuA?'奇襲が当たった！ 敵の横腹に突き崩しをかけた。':'奇襲は見破られ、回り込んだ隊は待ち伏せを受けた。',[u.id,front(B)[res.kishuA?2:1].id]]);t=54;}
 if(res.tb==='kishu'){const u=flank(B,A,'b',res.kishuB);beats.push([26,`敵の一隊が姿を消した。`]);beats.push([t<54?50:56,res.kishuB?'敵の伏兵が横から現れた！ 味方は崩れかける。':'回り込もうとした敵の一隊を、物見が見つけて打ち払った。',[u.id,front(A)[res.kishuB?1:2].id]]);t=Math.max(t,58);}
 // 合戦の三合
 const nr=res.rounds.length;const span=(92-Math.max(t,30))/Math.max(1,nr);let ca=0,cb=0;let tt=Math.max(t,30);
 // 鶴翼なら、外の両翼が敵の横へ回り込む
 const WING={};
 for(const [side,L,form] of [['a',A,res.fa],['b',B,res.fb]]){if(form!=='kakuyoku'||res.ta==='hiku'||res.tb==='hiku')continue;const s=sh(side);
  const ws=L.filter(u=>u.path.length<=2&&Math.abs(u.path[u.path.length-1][2]-.5)>.2);
  ws.forEach(u=>{const l=u.path[u.path.length-1];const up=l[2]<.5;u.path.push([tt-4,l[1],l[2]],[tt+16,.5+s*.02,up?.16:.84],[tt+30,.5+s*.07,up?.24:.76]);u.wing=1;});
  if(ws.length){WING[side]=ws;beats.push([tt-2,side==='a'?'鶴翼の両翼が大きく開き、敵の横へ回り込む。':'敵の両翼が大きく開き、こちらの横を窺う。']);}}
 const fa=front(A).filter(u=>u.path.length<=2),fb=front(B).filter(u=>u.path.length<=2);
 for(const u of units)if(u.arm==='teppo'&&!res.rain)u.fire=[tt-6,tt+span*.6];
 res.rounds.forEach((rd,i)=>{const t0=tt+i*span,t1=t0+span*.55,t2=t0+span*.9;
  const pa=fa.slice(0,Math.min(fa.length,2+i)),pb=fb.slice(0,Math.min(fb.length,2+i));
  pa.forEach((u,j)=>{const l=u.path[u.path.length-1];const y=l[2];u.path.push([t0,l[1],y],[t1,.465,y*.85+.5*.15],[t2,.44,y]);});
  pb.forEach((u,j)=>{const l=u.path[u.path.length-1];const y=l[2];u.path.push([t0,l[1],y],[t1,.535,y*.85+.5*.15],[t2,.56,y]);});
  ca+=rd.la;cb+=rd.lb;
  const txt=`${['一','二','三','四'][i]}合目。味方 −${rd.la.toLocaleString()}、敵 −${rd.lb.toLocaleString()}。${rd.la>rd.lb*1.4?'押されている。':rd.lb>rd.la*1.4?'押している。':'互角の押し合い。'}`;
  beats.push([t0+2,txt,[pa[0]&&pa[0].id,pb[0]&&pb[0].id]]);
  if(pa[1]&&pb[1])beats.push([t0+3,'',[pa[1].id,pb[1].id]]);
  // 討たれる隊
  const kill=(L,lost,tr0)=>{const k=Math.floor(lost/tr0*L.length*.85);let dead=L.filter(u=>u.die!=null).length;for(const u of front(L)){if(dead>=k)break;if(u.die==null&&u.ord!==0){u.die=t1+1;dead++;}}};
  kill(A,ca,res.a0);kill(B,cb,res.b0);});
 const tE=Math.min(94,tt+nr*span);
 const rout=(L,s)=>L.forEach(u=>{if(u.die!=null)return;const l=u.path[u.path.length-1];u.path.push([tE,l[1],l[2]],[100,l[1]-s*.6,l[2]+(r()-.5)*.2]);u.rout=tE;});
 const hold=(L,s)=>L.forEach(u=>{if(u.die!=null||u.wing)return;const l=u.path[u.path.length-1];u.path.push([tE,l[1],l[2]],[100,l[1]+s*.08,l[2]]);});
 // 遊軍：勝ち戦なら最後の合に横から加わる
 const lastT=tt+(nr-1)*span;
 for(const [side,L,win] of [['a',A,res.end==='winA'],['b',B,res.end==='winB']]){if(!win)continue;const s=sh(side);
  const rv=L.find(u=>u.n==='遊軍'&&u.path.length<=2&&u.die==null)||L.find(u=>u.n==='後備'&&u.path.length<=2&&u.die==null);
  if(rv){const l=rv.path[rv.path.length-1];const up=l[2]<.5;rv.path.push([lastT,l[1],l[2]],[lastT+span*.4,.5-s*.02,up?.3:.7],[lastT+span*.85,.5+s*.05,up?.38:.62]);
   beats.push([lastT+1,`${side==='a'?'味方':'敵'}の${rv.n}${rv.g?'・'+rv.g:''}が横合いから押し出し、最後の一押しに加わる。`,[rv.id,(side==='a'?front(B):front(A))[0].id]]);}
  (WING[side]||[]).forEach(u=>{if(u.die!=null)return;const l=u.path[u.path.length-1];u.path.push([tE,l[1],l[2]],[Math.min(99,tE+8),.5+s*.13,l[2]<.5?.36:.64]);});}
 // 負けた側：後備が殿となって踏みとどまる
 const rear=(L,s,who)=>{const u=L.find(x=>x.n==='後備'&&x.die==null&&!x.wing)||null;if(!u)return null;u.rg=1;return u;};
 const routR=(L,s)=>{const rg=rear(L,s);L.forEach(u=>{if(u.die!=null)return;const l=u.path[u.path.length-1];
   if(u===rg){u.path.push([tE,l[1],l[2]],[tE+4,l[1]+s*.04,l[2]],[Math.min(99,tE+12),l[1]+s*.03,l[2]],[100,l[1]-s*.3,l[2]]);u.rout=Math.min(99,tE+12);return;}
   u.path.push([tE,l[1],l[2]],[100,l[1]-s*.6,l[2]+(r()-.5)*.2]);u.rout=tE;});return rg;};
 const exEnd=(side,lost)=>{const {sp}=EX[side];if(!sp)return;const l=sp.path[sp.path.length-1];const s=sh(side);
   if(lost){sp.path.push([tE-4,l[1],l[2]],[100,l[1]-s*.4,l[2]]);sp.rout=tE-4;}};
 if(res.end==='winA'){const rg=routR(B,-1);hold(A,1);exEnd('b',1);if(rg)beats.push([tE+3,`敵の後備${rg.g?'・'+rg.g:''}が殿となって踏みとどまり、追い討ちを食い止める。`,[rg.id,front(A)[0].id]]);}
 else if(res.end==='winB'){const rg=routR(A,1);hold(B,-1);exEnd('a',1);if(rg)beats.push([tE+3,`味方の後備${rg.g?'・'+rg.g:''}が殿をつとめ、退く本隊を守る。`,[rg.id,front(B)[0].id]]);}

 if(res.end==='winA')beats.push([tE,`敵は崩れた！ ${o.b.n}は散り散りに逃げていく。`]);
 else if(res.end==='winB')beats.push([tE,`味方は崩れた。${o.a.n}は退くほかない。`]);
 else {A.forEach(u=>{if(u.die!=null)return;const l=u.path[u.path.length-1];u.path.push([tE,l[1],l[2]],[100,l[1]-.12,l[2]]);});B.forEach(u=>{if(u.die!=null)return;const l=u.path[u.path.length-1];u.path.push([tE,l[1],l[2]],[100,l[1]+.12,l[2]]);});beats.push([tE,'日が暮れ、両軍は兵を引いた。勝ち負けはつかない。']);}
 beats.sort((p,q)=>p[0]-q[0]);
 return {units,beats,feats:o.feats?o.feats.concat(feats(res,r,true)):feats(res,r),bg:o.bg||null,rain:res.rain?[0,100]:null,place:o.place};
}
function feats(res,r,lite){const f=[];if(lite){for(let i=0;i<3;i++)f.push({k:'forest',x:.1+r()*.8,y:r()<.5?.15+r()*.15:.75+r()*.12,r:.025+r()*.03});return f;}
 if(res.river)f.push({k:'river',w:1.6,pts:[[.5+(r()-.5)*.04,-.02],[.49+(r()-.5)*.05,.3],[.51+(r()-.5)*.05,.6],[.5+(r()-.5)*.05,1.02]],n:'川'});
 f.push({k:'road',pts:[[0,.5+(r()-.5)*.1],[.3,.48+(r()-.5)*.08],[.7,.52+(r()-.5)*.08],[1,.5+(r()-.5)*.1]],n:'街道'});
 const nh=2+Math.floor(r()*3);for(let i=0;i<nh;i++){const top=r()<.5;f.push({k:'hill',x:.15+r()*.7,y:top?.05+r()*.12:.85+r()*.1,r:.05+r()*.05,n:''});}
 for(let i=0;i<3;i++)f.push({k:'forest',x:.1+r()*.8,y:r()<.5?.18+r()*.1:.75+r()*.1,r:.03+r()*.03});
 f.push({k:'village',x:.25+r()*.5,y:r()<.5?.3:.72,n:''});
 return f;}
window.TKB={make,gen,seaTile};
})();
