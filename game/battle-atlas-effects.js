"use strict";
/* 合戦図の動きの演出（旧 bscene.js の粉・煙・雨霧・足跡・組み合いを、地勢図の布陣へ移したもの）。
   動かすのは登録済みの段階移動・交戦の組・鉄砲隊・討死/退却・天候だけで、無根拠の経路や陣地を作らない。 */
window.TKBattleEffects=(function(){
 const TAU=Math.PI*2,clamp=(v,a,b)=>v<a?a:v>b?b:v,FONT='"Shippori Mincho B1","Hiragino Mincho ProN","Yu Mincho",serif';
 function srnd(seed){let s=seed>>>0||1;return ()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296;};}
 // 区間の前後4で立ち上がる山形。旧図の雨・霧と同じ。
 const bell=(iv,t)=>{if(!iv||t<iv[0]-4||t>iv[1]+4)return 0;return clamp(Math.min(t-iv[0]+4,iv[1]+4-t)/6,0,1);};
 function create(opt={}){
  const parts=[],R=srnd(opt.seed||1234),angles=new Map();
  function spawn(x,y,kind,dir){if(parts.length>500)return;
   if(kind==='spark')for(let i=0;i<3;i++)parts.push({x,y,vx:(R()-.5)*90,vy:(R()-.5)*90-20,l:.35+R()*.3,a:0,k:'s'});
   if(kind==='dust')parts.push({x:x+(R()-.5)*18,y:y+(R()-.5)*12,vx:(R()-.5)*8,vy:-6-R()*6,l:1.2,a:0,k:'d',r:4+R()*5});
   if(kind==='smoke')parts.push({x,y,vx:Math.cos(dir)*18+(R()-.5)*6,vy:Math.sin(dir)*18-6,l:1.6,a:0,k:'m',r:3+R()*3});
   if(kind==='flash')parts.push({x,y,dir,l:.12,a:0,k:'f'});}
  function step(dt){for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.a+=dt;if(p.a>p.l){parts.splice(i,1);continue;}
   if(p.k==='s'){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=120*dt;}else if(p.k==='d'){p.x+=p.vx*dt;p.y+=p.vy*dt;}else if(p.k==='m'){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.97;}}}
  function draw(c){for(const p of parts){const f=1-p.a/p.l;
   if(p.k==='s'){c.fillStyle=`rgba(255,${180+Math.round(60*f)},80,${f})`;c.fillRect(p.x-1,p.y-1,2.2,2.2);}
   else if(p.k==='d'){c.beginPath();c.arc(p.x,p.y,p.r*(1.6-f*.6),0,TAU);c.fillStyle=`rgba(150,125,90,${.22*f})`;c.fill();}
   else if(p.k==='m'){c.beginPath();c.arc(p.x,p.y,p.r*(2.4-f*1.4),0,TAU);c.fillStyle=`rgba(235,232,225,${.55*f})`;c.fill();}
   else if(p.k==='f'){c.strokeStyle=`rgba(255,220,120,${f})`;c.lineWidth=2;c.beginPath();c.moveTo(p.x,p.y);c.lineTo(p.x+Math.cos(p.dir)*14,p.y+Math.sin(p.dir)*14);c.stroke();}}}
  // 向きは急に回さず、再生中は少しずつ追う。停止・頭出しでは目標へ揃える。
  function heading(id,target,dt,snap){if(!Number.isFinite(target))return angles.get(id);if(snap||!angles.has(id)){angles.set(id,target);return target;}let a=angles.get(id),d=target-a;while(d>Math.PI)d-=TAU;while(d<-Math.PI)d+=TAU;a+=d*clamp(dt*6,0,1);angles.set(id,a);return a;}
  // 組み合い：橙の脈動。強さ k は交戦の経過で弱め、最新の交戦だけ薄く残す。
  function clash(c,x,y,now,k,kb=1){const p=.5+.5*Math.sin(now/90);c.beginPath();c.arc(x,y,(14+p*6)*kb+6,0,TAU);c.fillStyle=`rgba(255,120,50,${(.12+p*.12)*k})`;c.fill();}
  function ring(c,x,y,now,k,r=22){const p=.5+.5*Math.sin(now/90);c.beginPath();c.arc(x,y,r+p*5,0,TAU);c.fillStyle=`rgba(255,110,50,${(.18+p*.22)*k})`;c.fill();}
  // 通った跡：地色の縁取りに陣営色の破線。点列は段階移動の典拠点をそのまま結ぶ概略で、細かな通過路ではない。
  function trail(c,pts,col,kb=1){if(pts.length<2)return;c.save();c.lineCap='round';c.lineJoin='round';const path=()=>{c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));};path();c.strokeStyle='rgba(255,252,240,.55)';c.lineWidth=4.2*kb+2;c.stroke();path();c.strokeStyle=col;c.globalAlpha=.62;c.lineWidth=2.4*kb+1;c.setLineDash([7*kb,5*kb]);c.stroke();c.restore();}
  // 雨と霧。記録のある合戦（sc.rain / sc.fog）だけ。
  const r2=srnd(5);
  function weather(c,W,H,sc,t,now){const rn=bell(sc.rain,t);if(rn>0){c.fillStyle=`rgba(60,70,85,${.16*rn})`;c.fillRect(0,0,W,H);c.strokeStyle=`rgba(210,220,235,${.5*rn})`;c.lineWidth=1;const off=(now/3)%40,rr=srnd(5);c.beginPath();for(let i=0;i<W*H/2600*rn;i++){const x=rr()*W,y=(rr()*H+off*(1+rr()))%H;c.moveTo(x,y);c.lineTo(x-4,y+13);}c.stroke();}
   const fg=bell(sc.fog,t);if(fg>0){c.fillStyle=`rgba(240,240,236,${.62*fg})`;c.fillRect(0,0,W,H);}return rn>0||fg>0;}
  const weatherActive=(sc,t)=>bell(sc.rain,t)>0||bell(sc.fog,t)>0;
  // 幟（地図の凸駒と同じ）：駒の右肩に立て、上に家紋（なければ家名の一字）、下に陣営色の細い帯、棹の先に乳。再生中だけ先端を揺らし、紋は回さない。
  function flag(c,x,y,k,col,crest,now,wave,mark){const wv=wave?Math.sin(now/260+x)*1.2*k:0,px=Math.round(x)+.5,top=Math.round(y-34*k)+.5,fw=Math.round(15*k),fh=Math.round(30*k);c.save();c.strokeStyle='#2a1d10';c.lineWidth=1.2;c.beginPath();c.moveTo(px,y+10*k);c.lineTo(px,top-4*k);c.stroke();c.fillStyle='#2a1d10';c.beginPath();c.arc(px,top-4.5*k,1.6*k,0,TAU);c.fill();
   c.beginPath();c.moveTo(px+1,top);c.lineTo(px+1+fw,top+wv);c.lineTo(px+1+fw,top+fh+wv*.6);c.lineTo(px+1,top+fh);c.closePath();c.fillStyle='#fdf7e6';c.fill();c.save();c.clip();c.fillStyle=col;c.fillRect(px+1,top+fh-5*k,fw,6*k);if(crest)c.drawImage(crest,px+1+(fw-14*k)/2,top+2*k+wv*.3,14*k,14*k);else if(mark){c.fillStyle=col;c.font=`800 ${Math.round(10*k)}px ${FONT}`;c.textAlign='center';c.textBaseline='middle';c.fillText(mark,px+1+fw/2,top+9*k);}c.restore();c.strokeStyle='#2a1d10';c.lineWidth=1;c.stroke();c.restore();}
  function cross(c,x,y,k=1){c.strokeStyle='#b0221a';c.lineWidth=2.4;c.beginPath();c.moveTo(x-9*k,y-9*k);c.lineTo(x+9*k,y+9*k);c.moveTo(x+9*k,y-9*k);c.lineTo(x-9*k,y+9*k);c.stroke();}
  return {spawn,step,draw,heading,clash,ring,trail,weather,weatherActive,flag,cross,bell,rnd:R,get count(){return parts.length;},clear(){parts.length=0;angles.clear();}};
 }
 return {create,bell};
})();
