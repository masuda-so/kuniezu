"use strict";
(function(){
const $=s=>document.querySelector(s);
const fmt=n=>Math.round(n).toLocaleString('ja-JP');
const man=n=>n>=10000?(Math.round(n/1000)/10)+'万':fmt(n);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const GEO=window.TKGEO;
const U={pslot:{},dipView:false,mode:'title',sel:null,modal:null,mdata:{},pickScen:null,pickClan:null,hover:null,speed:0,acc:0,baseDirty:true,chatCtl:null,picking:null};
try{U.mapStyle=localStorage.getItem('tenka-mapstyle2')||'relief';}catch(e){U.mapStyle='relief';}
window.TKUI=U;U.open=(n,d)=>openModal(n,d);
let S=null;
G.build();

/* ===== 漢数字 ===== */
const KD='〇一二三四五六七八九';
function kan(n){if(n<=10)return n===10?'十':KD[n];if(n<20)return '十'+(n%10?KD[n%10]:'');return KD[Math.floor(n/10)]+'十'+(n%10?KD[n%10]:'');}
function eraKan(y,mo,da){const e=G.era(y,mo,da);const m=e.match(/^(..)(\d+|元)年$/);if(!m)return e;return m[1]+(m[2]==='元'?'元':kan(+m[2]))+'年';}
function monKan(m){return (m===1?'正':kan(m))+'月';}

/* ===== 色 ===== */
function hex2(h){const n=parseInt(h.slice(1),16);return [n>>16,n>>8&255,n&255];}
function mix(h,w,t){const a=hex2(h),b=hex2(w);return `rgb(${a.map((v,i)=>Math.round(v+(b[i]-v)*t)).join(',')})`;}
const pastel=k=>mix(G.CC(k),'#ffffff',.28);
const deep=k=>mix(G.CC(k),'#1a1208',.35);
// 臣従先（主家が生きているときだけ）
const lordOf=k=>{const L=S&&S.vassal&&S.vassal[k];return L&&S.clans[L]&&S.clans[L].alive&&L!==k?L:null;};
const STRIPE={};const stripeTile=k=>STRIPE[k]||(STRIPE[k]=(()=>{const c=document.createElement('canvas');c.width=c.height=12;const x=c.getContext('2d');x.strokeStyle=mix(G.CC(k),'#ffffff',.1);x.lineWidth=3.2;x.beginPath();x.moveTo(-2,14);x.lineTo(14,-2);x.moveTo(-2,2);x.lineTo(2,-2);x.moveTo(10,14);x.lineTo(14,10);x.stroke();return c;})());

/* ===== 地図の素材 ===== */
// 起伏の絵は北の端（渡島半島の途中）で切れているので、境をぼかして陸の地色へなじませる
function hokFeather(c){const g=c.createLinearGradient(0,-1,0,26);g.addColorStop(0,'rgba(232,224,200,1)');g.addColorStop(1,'rgba(232,224,200,0)');c.fillStyle=g;c.fillRect(1600,-1,800,27);
 c.save();c.beginPath();c.rect(1600,-400,900,425);c.clip();for(const [w,a] of [[14,.07],[8,.08],[3.5,.1]]){c.strokeStyle=`rgba(120,98,62,${a})`;c.lineWidth=w;c.stroke(LAND);}
 c.font='700 26px "Shippori Mincho B1",serif';c.textAlign='center';c.fillStyle='rgba(110,90,60,.28)';c.fillText('蝦　夷　地',1990,-120);c.textAlign='left';c.restore();}
// 朝鮮の起伏の絵は北緯42度付近と遼東の西で切れるので、その外は陸の地色にぼかしてつなぐ
function korFeather(c){c.save();c.beginPath();c.rect(-1250,-700,1700,700+KOR_TOP+20);c.rect(-1250,-700,390,2300);c.clip();for(const [w,a] of [[14,.07],[8,.08],[3.5,.1]]){c.strokeStyle=`rgba(120,98,62,${a})`;c.lineWidth=w;c.stroke(LAND);}
 c.font='700 30px "Shippori Mincho B1",serif';c.textAlign='center';c.fillStyle='rgba(110,90,60,.3)';c.fillText('女　直',-330,-60);c.fillText('明（遼東）',-930,40);c.textAlign='left';c.restore();}
const landImg=new Image();let landReady=false;landImg.onload=()=>{landReady=true;U.baseDirty=true;};const korImg=new Image();korImg.onload=()=>{U.baseDirty=true;};const KOR_RECT=[-870,-20,960,1605];const ensureLand=()=>{if(!landImg.src){landImg.src='land.webp';korImg.src='korea.webp';}};if(U.mapStyle==='relief')ensureLand();
// 角を落とす（チャイキン法）。今の市町村境を元にした境のギザギザを和らげる。開いた線は端を動かさない
function chaikin(a,closed,it){for(let k=0;k<it;k++){const n=a.length/2;if(n<3)return a;const o=[];if(!closed){o.push(a[0],a[1]);}
  const m=closed?n:n-1;for(let i=0;i<m;i++){const j=(i+1)%n;const x0=a[i*2],y0=a[i*2+1],x1=a[j*2],y1=a[j*2+1];o.push(x0*.75+x1*.25,y0*.75+y1*.25,x0*.25+x1*.75,y0*.25+y1*.75);}
  if(!closed){o.splice(2,2);o.splice(o.length-2,2);o.push(a[a.length-2],a[a.length-1]);}a=o;}return a;}
const P2=(arr,it)=>{const p=new Path2D();for(const poly of arr)for(let ring of poly){if(it)ring=chaikin(ring,true,it);p.moveTo(ring[0],ring[1]);for(let i=2;i<ring.length;i+=2)p.lineTo(ring[i],ring[i+1]);p.closePath();}return p;};
const L2=(arr,it)=>{const p=new Path2D();for(let l of arr){if(it)l=chaikin(l,false,it);p.moveTo(l[0],l[1]);for(let i=2;i<l.length;i+=2)p.lineTo(l[i],l[i+1]);}return p;};
const KOREA_IDS=new Set(['busan','ulsan','jinju','daegu','sangju','jeonju','namwon','suncheon','chungju','gongju','hanseong','gaeseong','wonju','haeju','pyongyang','uiju','hamhung']);
// 朝鮮の起伏の絵は北緯40度あたりまで。そこから北は陸の地色にぼかしてつなぐ
const KOR_TOP=262;let KCP=null;const KORCLIP=()=>{if(!KCP){KCP=new Path2D();for(const id of KOREA_IDS)if(TERR[id])KCP.addPath(TERR[id]);}return KCP;};
const TERR={};for(const id in GEO.terr)TERR[id]=P2(GEO.terr[id],KOREA_IDS.has(id)?0:2);
const LAND=P2(GEO.land,1),LAKES=P2(GEO.lakes,1),RIVERS=L2(GEO.rivers,1),PBORD=L2(GEO.pborders,2);
const EDGE=GEO.edges.map(([a,b,ls])=>({a,b,p:L2(ls,2)}));
// 青海波
function seigaiha(){ // 青海波：同心の半円を半分ずつずらして重ねる（高解像度の1枚を繰り返す）
 const R=96,w=R*2,h=R,c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');
 const bg='#1b2f55';x.fillStyle=bg;x.fillRect(0,0,w,h);
 const wave=(cx,cy)=>{x.beginPath();x.arc(cx,cy,R,0,Math.PI*2);x.fillStyle=bg;x.fill();
  for(let k=0;k<5;k++){const r=R*(1-k*.2)-1.5;if(r<3)break;x.beginPath();x.arc(cx,cy,r,0,Math.PI*2);x.lineWidth=k===0?5:3.6;x.strokeStyle=k===0?'rgba(120,155,210,.36)':'rgba(150,185,232,.24)';x.stroke();}};
 for(let row=-2;row<=4;row++){const cy=row*R/2,off=(row&1)?R:0;for(let col=-2;col<=3;col++)wave(col*R*2+off,cy);}
 return c;}
const seaTile=seigaiha();
const paperTile=(()=>{const c=document.createElement('canvas');c.width=c.height=160;const x=c.getContext('2d');const im=x.createImageData(160,160);for(let i=0;i<im.data.length;i+=4){const v=232+Math.random()*23;im.data[i]=v;im.data[i+1]=v-3;im.data[i+2]=v-10;im.data[i+3]=255;}x.putImageData(im,0,0);
 x.strokeStyle='rgba(120,100,70,.12)';x.lineWidth=.6;for(let k=0;k<40;k++){x.beginPath();const y=Math.random()*160;x.moveTo(0,y);x.bezierCurveTo(50,y+Math.random()*6-3,110,y+Math.random()*6-3,160,y);x.stroke();}return c;})();


/* ===== 本人の肖像 ===== */
const faceImg=new Image();let faceReady=false;faceImg.onload=()=>{faceReady=true;pcache.clear();urlCache.clear();if(U.mode!=='title')renderAll();};faceImg.src='faces.webp';
const FT=128,FCOLS=10;
const pcache=new Map(),urlCache=new Map();const PDPR=Math.min(2,devicePixelRatio||1);
const hasFace=n=>TK.faceOf(n)>=0;
function portrait(name,r,ring,col){
 const idx=TK.faceOf(name);if(idx<0||!faceReady)return null;
 const key=idx+'|'+r+'|'+ring+'|'+col;if(pcache.has(key))return pcache.get(key);
 const s=Math.ceil(r*2+6),c=document.createElement('canvas');c.width=s*PDPR;c.height=s*PDPR;c.css=s;const x=c.getContext('2d');x.scale(PDPR,PDPR);
 const cx=s/2,cy=s/2;
 x.save();x.beginPath();x.arc(cx,cy,r,0,7);x.clip();x.drawImage(faceImg,(idx%FCOLS)*FT,Math.floor(idx/FCOLS)*FT,FT,FT,cx-r,cy-r,r*2,r*2);x.restore();
 x.beginPath();x.arc(cx,cy,r,0,7);x.lineWidth=ring?2.6:1.6;x.strokeStyle=col||'#e9c873';x.stroke();
 if(ring){x.beginPath();x.arc(cx,cy,r+1.6,0,7);x.lineWidth=1;x.strokeStyle='rgba(20,14,8,.8)';x.stroke();}
 pcache.set(key,c);return c;
}
function faceHTML(name,size,k){const r=size==='sm'?15:size==='xl'?46:size==='lg'?30:20;const s=r*2+6;
 const c=portrait(name,r,size!=='sm',k?G.CC(k):null);
 if(!c)return `<span class="noface ${size||''}" style="width:${s}px;height:${s}px;--c:${k?G.CC(k):'#777'}">${esc(({'明宗':'朝'})[name]||(name||'').slice(0,1))}</span>`;
 const key=TK.faceOf(name)+'|'+r+'|'+k;let u=urlCache.get(key);if(!u){u=c.toDataURL();urlCache.set(key,u);}return `<img class="face ${size||''}" src="${u}" alt="${esc(name)}" width="${s}" height="${s}">`;}

/* ===== カメラ ===== */
const base=$('#base'),top_=$('#top'),bctx=base.getContext('2d'),tctx=top_.getContext('2d');
const cam={x:GEO.W*.55,y:GEO.H*.52,z:.4};let DPR=1,VW=0,VH=0;
function resize(){DPR=Math.min(2,devicePixelRatio||1);VW=base.clientWidth;VH=base.clientHeight;for(const c of [base,top_]){c.width=Math.round(VW*DPR);c.height=Math.round(VH*DPR);}U.baseDirty=true;}
addEventListener('resize',()=>{TL.sig='';});addEventListener('resize',()=>{resize();clampCam();});
let tlNode=null;function narrowTL(){tlNode=tlNode||document.getElementById('tline');return !tlNode||tlNode.hidden||document.body.classList.contains('narrowSel');}
function vc(){const mob=VW<820;let l=0,r=0,t=0,b=0;
 if(U.mode==='game'){if(mob){t=104;b=U.sel?VH*.46:196;}else{const nar=U.sel&&VW<1200;l=nar?0:320;r=U.sel?360:0;t=72;b=narrowTL()?0:70;}}
 else if(U.mode==='pick'){if(mob)b=VH*.52;else r=400;}
 return [l+(VW-l-r)/2,t+(VH-t-b)/2,VW-l-r,VH-t-b];}
const w2s=(x,y)=>{const c=vc();return [(x-cam.x)*cam.z+c[0],(y-cam.y)*cam.z+c[1]];};
U.pos=id=>w2s(G.C[id].x,G.C[id].y);
U.cam=(x,y,z)=>{cam.x=x;cam.y=y;cam.z=z;clampCam();U.baseDirty=true;U.sel=null;side.hidden=true;};
const s2w=(x,y)=>{const c=vc();return [(x-c[0])/cam.z+cam.x,(y-c[1])/cam.z+cam.y];};
function clampCam(){const c=vc();const CW=CONT.x1-CONT.x0,CH=CONT.y1-CONT.y0;const mz=Math.max(c[2]/CW,c[3]/CH);cam.z=Math.max(mz,Math.min(8,cam.z));
 // 見えている幅が中身より広ければ真ん中に、狭ければ中身の端が画面の端を越えない所まで
 const hw=c[2]/2/cam.z,hh=c[3]/2/cam.z,m=0;
 cam.x=hw*2>=CW?(CONT.x0+CONT.x1)/2:Math.max(CONT.x0+hw-m,Math.min(CONT.x1-hw+m,cam.x));
 cam.y=hh*2>=CH?(CONT.y0+CONT.y1)/2:Math.max(CONT.y0+hh-m,Math.min(CONT.y1-hh+m,cam.y));U.baseDirty=true;}
// 地図の端（朝鮮の北・満洲の西・蝦夷の南端）は、海へ溶けこませて切れ目を見せない
const MIST=[{x0:-1600,x1:400,y0:-700,y1:-131,L:111,side:'b'},{x0:-1600,x1:-1003,y0:-700,y1:1600,L:133,side:'r'},{x0:1500,x1:2400,y0:-600,y1:-201,L:81,side:'b'},{x0:2267,x1:2700,y0:-600,y1:-60,L:67,side:'l'}];
let mistCv=null;
function edgeMist(c){ // 地図の外へ続く陸は、海の模様へなめらかに溶かす（切れ目や色の塊を見せない）
 const T=c.getTransform();const W=c.canvas.width,H=c.canvas.height;if(!mistCv)mistCv=document.createElement('canvas');if(mistCv.width!==W||mistCv.height!==H){mistCv.width=W;mistCv.height=H;}
 const m=mistCv.getContext('2d');const flat=U.mapStyle!=='relief';
 for(const z of MIST){m.setTransform(1,0,0,1,0,0);m.clearRect(0,0,W,H);m.setTransform(T);
  if(flat){m.fillStyle='#dfe9f3';}else{const pat=m.createPattern(seaTile,'repeat');pat.setTransform(new DOMMatrix([.14,0,0,.14,0,0]));m.fillStyle=pat;}
  const x0=z.side==='l'?z.x0-z.L:z.x0,x1=z.side==='r'?z.x1+z.L:z.x1,y1=z.side==='b'?z.y1+z.L:z.y1;m.fillRect(x0,z.y0,x1-x0,y1-z.y0);
  // 端に向かって濃く：境から L だけ手前で透明に
  const P=(x,y)=>[T.a*x+T.c*y+T.e,T.b*x+T.d*y+T.f];let g;
  if(z.side==='b'){const a=P(0,z.y1+z.L),b=P(0,z.y1-z.L*.35);g=m.createLinearGradient(a[0],a[1],b[0],b[1]);}else if(z.side==='l'){const a=P(z.x0-z.L,0),b=P(z.x0+z.L*.35,0);g=m.createLinearGradient(a[0],a[1],b[0],b[1]);}else{const a=P(z.x1+z.L,0),b=P(z.x1-z.L*.35,0);g=m.createLinearGradient(a[0],a[1],b[0],b[1]);}
  g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,1)');
  m.setTransform(1,0,0,1,0,0);m.globalCompositeOperation='destination-in';m.fillStyle=g;m.fillRect(0,0,W,H);m.globalCompositeOperation='source-over';
  c.save();c.setTransform(1,0,0,1,0,0);c.drawImage(mistCv,0,0);c.restore();}}
// 地図の中身の広がり（引いても寄っても、この外が大きく見えないようにする）
// 霞が濃くなりきる線の内側（引ききっても、この外は見えない）
const CONT={x0:-1045,x1:2285,y0:-168,y1:2195};
function fitAll(){const c=vc();cam.x=GEO.W*.53;cam.y=GEO.H*.55;cam.z=Math.min(c[2]/(GEO.W*.82),c[3]/(GEO.H*.84));clampCam();}
let anim=null;function focus(id,z){const c=G.C[id];anim={x:c.x,y:c.y,z:z||Math.max(cam.z,1.3),t:0};}

/* ===== 境と街道 ===== */
function borderStyle(oa,ob){const me=S.player;
 if(G.allied(oa,ob))return {c:'rgba(46,130,70,.95)',w:2.4,d:[6,4],cs:'rgba(255,255,255,.5)'};
 if(G.atWar(oa,ob))return {c:'rgba(196,40,28,.95)',w:(oa===me||ob===me)?4:3.2,d:null,cs:'rgba(255,230,210,.55)'};
 return {c:'rgba(40,28,16,.82)',w:(oa===me||ob===me)?2.6:2.1,d:null};}
function drawBorders(c,z,k0){if(!S)return;
 for(const e of EDGE){const oa=S.castles[e.a].owner,ob=S.castles[e.b].owner;if(oa!==ob||z<.8)continue;c.strokeStyle='rgba(60,45,30,.22)';c.lineWidth=.7/z;c.setLineDash([]);c.stroke(e.p);}
 for(const e of EDGE){const oa=S.castles[e.a].owner,ob=S.castles[e.b].owner;if(oa===ob)continue;const st=borderStyle(oa,ob);const w=st.w*(k0||1)/z;
  if(st.cs){c.setLineDash([]);c.strokeStyle=st.cs;c.lineWidth=w+2.2/z;c.stroke(e.p);}
  c.setLineDash(st.d?st.d.map(v=>v/z):[]);c.strokeStyle=st.c;c.lineWidth=w;c.stroke(e.p);}
 c.setLineDash([]);
 // 自家の外周
 const me=S.player;if(S.clans[me]&&S.clans[me].alive){c.strokeStyle='rgba(242,210,124,.95)';c.lineWidth=1.4/z;for(const e of EDGE){const oa=S.castles[e.a].owner,ob=S.castles[e.b].owner;if(oa!==ob&&(oa===me||ob===me))c.stroke(e.p);}}}
const ROADP=[];
function roadPaths(){if(ROADP.length)return ROADP;for(const r of G.ROADS){const pts=r.pts;const p=new Path2D();p.moveTo(pts[0][0],pts[0][1]);
  for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i];const mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2;if(i===1)p.lineTo(mx,my);else p.quadraticCurveTo(a[0],a[1],mx,my);if(i===pts.length-1)p.lineTo(b[0],b[1]);}
  // 名札は一番長い区間の中ほどに
  let bi=1,bl=0;for(let i=1;i<pts.length;i++){const l=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);if(l>bl&&i>1&&i<pts.length-1||bl===0){bl=l;bi=i;}}
  const A=pts[bi-1],B=pts[bi];ROADP.push({p,name:r.name,mx:(A[0]+B[0])/2,my:(A[1]+B[1])/2,ang:Math.atan2(B[1]-A[1],B[0]-A[0])});}return ROADP;}
function drawRoadLabels(c,z){c.save();for(const r of roadPaths()){c.save();c.translate(r.mx,r.my);let a=r.ang;if(a>Math.PI/2)a-=Math.PI;if(a<-Math.PI/2)a+=Math.PI;c.rotate(a);c.font=`700 ${11/z}px "Shippori Mincho B1",serif`;c.textAlign='center';c.textBaseline='bottom';c.lineWidth=3/z;c.strokeStyle='rgba(255,248,230,.9)';c.strokeText(r.name,0,-2/z);c.fillStyle='#6a3e1c';c.fillText(r.name,0,-2/z);c.restore();}c.restore();}

// 街道の名札は城の名札・肖像を描いたあとに、空いている所だけに置く（重なる所は出さない）
const RCUM=new Map();
function roadLabelsTop(c,z,fits,placed){if(z<.95)return;
 const list=G.ROADS.map(r=>{let cum=RCUM.get(r);if(!cum){cum=[0];for(let i=1;i<r.pts.length;i++)cum.push(cum[i-1]+Math.hypot(r.pts[i][0]-r.pts[i-1][0],r.pts[i][1]-r.pts[i-1][1]));RCUM.set(r,cum);}return {r,cum,L:cum[cum.length-1]};}).sort((a,b)=>b.L-a.L);
 const at=(o,d)=>{const {r,cum}=o;d=Math.max(0,Math.min(o.L,d));let i=1;while(i<cum.length-1&&cum[i]<d)i++;const a=r.pts[i-1],b=r.pts[i],t=(d-cum[i-1])/Math.max(1e-6,cum[i]-cum[i-1]);return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];};
 const ic=[];for(const C of G.CL){const [x,y]=w2s(C.x,C.y);if(x>-20&&y>-20&&x<VW+20&&y<VH+20)ic.push([x-11,y-14,22,22]);}
 const ok=(x,y,w,h)=>{if(!fits(x,y,w,h))return false;for(const r of ic)if(x<r[0]+r[2]&&x+w>r[0]&&y<r[1]+r[3]&&y+h>r[1])return false;return true;};
 c.save();c.font='700 10.5px "Shippori Mincho B1",serif';c.textAlign='center';c.textBaseline='middle';
 for(const o of list){const tw=c.measureText(o.r.name).width+6;const wl=tw/z;if(o.L<wl*1.5)continue;
  for(const f of [.5,.38,.62,.26,.74,.16,.84]){const d=o.L*f;const A=at(o,d-wl/2),B=at(o,d+wl/2),M=at(o,d);const [sx,sy]=w2s(M[0],M[1]);if(sx<tw/2||sy<12||sx>VW-tw/2||sy>VH-12)continue;
   const [ax,ay]=w2s(A[0],A[1]),[bx,by]=w2s(B[0],B[1]);if(Math.hypot(bx-ax,by-ay)<tw*.8)continue; // 曲がりくねった所は避ける
   let a=Math.atan2(by-ay,bx-ax);if(a>Math.PI/2)a-=Math.PI;if(a<-Math.PI/2)a+=Math.PI;
   const ca=Math.abs(Math.cos(a)),sa=Math.abs(Math.sin(a)),bw=tw*ca+13*sa,bh=tw*sa+13*ca;const ox=-Math.sin(a)*-7,oy=Math.cos(a)*-7;
   const bx0=sx+ox-bw/2,by0=sy+oy-bh/2;if(!ok(bx0,by0,bw,bh))continue;placed.push([bx0,by0,bw,bh]);
   c.save();c.translate(sx+ox,sy+oy);c.rotate(a);c.lineWidth=3;c.strokeStyle='rgba(255,248,230,.88)';c.strokeText(o.r.name,0,0);c.fillStyle='#6a3e1c';c.fillText(o.r.name,0,0);c.restore();break;}}
 c.restore();}
let SEAMASK=null;
function drawRoads(c,z,labels){
 // 海や湖を渡る区間（七里の渡し・今切の渡しなど）は、陸の線と変えて細い点線で描く
 if(!SEAMASK){SEAMASK=new Path2D();SEAMASK.rect(-3000,-3000,8000,8000);SEAMASK.addPath(LAND);}
 c.save();c.clip(SEAMASK,'evenodd');for(const r of roadPaths()){c.setLineDash([2/z,3/z]);c.strokeStyle='rgba(240,232,210,.75)';c.lineWidth=1.4/z;c.stroke(r.p);}c.restore();
 c.save();c.clip(LAND);for(const r of roadPaths()){c.setLineDash([]);c.strokeStyle='rgba(255,248,230,.75)';c.lineWidth=3.2/z;c.stroke(r.p);c.setLineDash([5/z,3/z]);c.strokeStyle='rgba(122,74,34,.9)';c.lineWidth=1.6/z;c.stroke(r.p);}c.setLineDash([]);c.restore();c.save();
 if(labels)for(const r of roadPaths()){c.save();c.translate(r.mx,r.my);let a=r.ang;if(a>Math.PI/2)a-=Math.PI;if(a<-Math.PI/2)a+=Math.PI;c.rotate(a);c.font=`700 ${11/z}px "Shippori Mincho B1",serif`;c.textAlign='center';c.textBaseline='bottom';c.lineWidth=3/z;c.strokeStyle='rgba(255,248,230,.9)';c.strokeText(r.name,0,-2/z);c.fillStyle='#6a3e1c';c.fillText(r.name,0,-2/z);c.restore();}c.restore();}

/* ===== 下地の描画 ===== */
/* ===== 同盟の見える化 ===== */
const hatchTile=(col=>{const c=document.createElement('canvas');c.width=c.height=14;const x=c.getContext('2d');x.strokeStyle=col;x.lineWidth=2.2;x.beginPath();x.moveTo(-2,16);x.lineTo(16,-2);x.moveTo(-2,2);x.lineTo(2,-2);x.moveTo(12,16);x.lineTo(16,12);x.stroke();return c;})('rgba(30,130,60,.55)');
// 同盟図の色：赤は交戦の色なので使わない。自家の同盟は緑、他は青・紫・山吹・藍・青緑など
const BLOC_MINE='#2e9a5a',BLOC_COL=['#3f7fd0','#8a5cc2','#c9a227','#1f9aa6','#4a5aa8','#8c8f3a','#a07850','#5f8fb8','#7a6aa8','#4f9c8a'];
function blocs(){const ks=G.alive(),par={};ks.forEach(k=>par[k]=k);const f=k=>par[k]===k?k:(par[k]=f(par[k]));
 for(let i=0;i<ks.length;i++)for(let j=i+1;j<ks.length;j++)if(G.allied(ks[i],ks[j]))par[f(ks[i])]=f(ks[j]);
 const g={};for(const k of ks){const r=f(k);(g[r]=g[r]||[]).push(k);}
 const list=Object.values(g).filter(a=>a.length>1).map(a=>a.sort((x,y)=>G.power(y)-G.power(x))).sort((a,b)=>b.reduce((s,k)=>s+G.power(k),0)-a.reduce((s,k)=>s+G.power(k),0));
 const of={};let j=0;list.forEach((a,i)=>{const col=a.includes(S.player)?BLOC_MINE:BLOC_COL[(j++)%BLOC_COL.length];a.forEach(k=>of[k]={i,col});});return {list,of};}
function drawBase(){
 const c=bctx,cc=vc();c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,base.width,base.height);
 const z=cam.z,tx=cc[0]-cam.x*z,ty=cc[1]-cam.y*z;
 c.setTransform(DPR*z,0,0,DPR*z,DPR*tx,DPR*ty);
 const flat=U.mapStyle!=='relief';const [x0,y0]=s2w(0,0),[x1,y1]=s2w(VW,VH);
 if(flat){ // 白地図：白い陸、淡い水色の海、細い国境
  {const pat=c.createPattern(seaTile,'repeat');pat.setTransform(new DOMMatrix([.14,0,0,.14,0,0]));c.fillStyle=pat;c.fillRect(x0-50,y0-50,x1-x0+100,y1-y0+100);}
  c.save();c.shadowColor='rgba(40,70,110,.38)';c.shadowBlur=10*DPR;c.fillStyle='#fbfaf6';c.fill(LAND);c.restore();
 }else{
 const pat=c.createPattern(seaTile,'repeat');const ps=.14;pat.setTransform(new DOMMatrix([ps,0,0,ps,0,0])); // 地図に貼りつける（ズームしても模様が地図と一緒に動く）
 c.fillStyle=pat;c.fillRect(x0-50,y0-50,x1-x0+100,y1-y0+100);
 if(landReady){c.save();c.shadowColor='rgba(5,10,25,.55)';c.shadowBlur=14*DPR;c.fillStyle='#e8e0c8';c.fill(LAND);c.restore();c.save();c.clip(LAND);c.imageSmoothingQuality='high';c.drawImage(landImg,0,0,GEO.W,GEO.H);if(korImg.complete&&korImg.naturalWidth){c.save();c.clip(KORCLIP());c.beginPath();c.rect(-1300,KOR_TOP,1800,2000);c.clip();c.drawImage(korImg,...KOR_RECT);const g=c.createLinearGradient(0,KOR_TOP,0,KOR_TOP+34);g.addColorStop(0,'rgba(232,224,200,1)');g.addColorStop(1,'rgba(232,224,200,0)');c.fillStyle=g;c.fillRect(-1300,KOR_TOP,1800,34);c.restore();}hokFeather(c);korFeather(c);c.restore();
  c.save();c.globalCompositeOperation='multiply';c.globalAlpha=.5;const pp=c.createPattern(paperTile,'repeat');pp.setTransform(new DOMMatrix([.6,0,0,.6,0,0]));c.fillStyle=pp;c.fill(LAND);c.restore();}
 else{c.fillStyle='#ddd5c2';c.fill(LAND);}}
 if(S){c.save();c.clip(LAND);c.globalCompositeOperation='multiply';
  if(U.dipView&&U.mode==='game'){const B=blocs();U.blocs=B;for(const C of G.CL){const k=S.castles[C.id].owner,b=B.of[k];c.globalAlpha=b?(flat?.6:.85):(flat?.25:.5);c.fillStyle=b?mix(b.col,'#ffffff',.25):'#d8d0bf';c.fill(TERR[C.id]);}}
  else for(const C of G.CL){const k=S.castles[C.id].owner;const L=k===S.player?null:lordOf(k);c.globalAlpha=flat?(k===S.player?.62:.46):(k===S.player?.8:.66);c.fillStyle=pastel(L||k);c.fill(TERR[C.id]);
   // 臣従している家：主家の色で塗り、自家の色の縞を重ねる（例：豊臣に従う織田信雄の領国）
   if(L){c.globalAlpha=flat?.7:.85;const sp=c.createPattern(stripeTile(k),'repeat');sp.setTransform(new DOMMatrix([.55,0,0,.55,0,0]));c.fillStyle=sp;c.fill(TERR[C.id]);}}
  c.restore();
  if(!U.dipView&&U.mode==='game'&&S.clans[S.player]){const hp=c.createPattern(hatchTile,'repeat');hp.setTransform(new DOMMatrix([.7,0,0,.7,0,0]));c.fillStyle=hp;
   for(const C of G.CL){const k=S.castles[C.id].owner;if(k!==S.player&&G.allied(S.player,k))c.fill(TERR[C.id]);}}}
 if(flat){c.strokeStyle='rgba(120,160,205,.55)';c.lineWidth=.9/z;c.lineJoin='round';c.stroke(RIVERS);
  if(z>.45){c.strokeStyle='rgba(110,110,110,.5)';c.lineWidth=.8/z;c.stroke(PBORD);}
  if(S&&z>.5)drawRoads(c,z,false);drawBorders(c,z);
  c.save();c.clip(LAND);c.fillStyle='#aac4df';c.fill(LAKES);c.strokeStyle='rgba(110,135,170,.55)';c.lineWidth=.7/z;c.stroke(LAKES);c.restore();
   c.strokeStyle='rgba(100,125,160,.7)';c.lineWidth=.8/z;c.stroke(LAND);
 }else{
 c.strokeStyle='rgba(95,135,175,.75)';c.lineWidth=1.1/z;c.lineJoin='round';c.stroke(RIVERS);
 if(z>.55){c.save();c.setLineDash([3/z,3/z]);c.strokeStyle='rgba(70,55,35,.38)';c.lineWidth=.9/z;c.stroke(PBORD);c.restore();}
 if(S&&z>.5)drawRoads(c,z,false);
 drawBorders(c,z);
 c.save();c.clip(LAND);c.fillStyle='#93b4d2';c.fill(LAKES);c.strokeStyle='rgba(50,70,100,.55)';c.lineWidth=.8/z;c.stroke(LAKES);c.restore();
 c.strokeStyle='rgba(25,35,60,.6)';c.lineWidth=1.1/z;c.stroke(LAND);
 }

 edgeMist(c);
 c.setTransform(DPR,0,0,DPR,0,0);
 for(const pl of GEO.plabels){const size=Math.min(46,pl.r*z*.62);if(size<13)continue;const [sx,sy]=w2s(pl.x,pl.y);if(sx<-60||sy<-80||sx>VW+60||sy>VH+80)continue;
  c.font=`800 ${size}px "Shippori Mincho B1",serif`;c.textAlign='center';c.textBaseline='middle';c.fillStyle=U.mapStyle!=='relief'?`rgba(60,60,70,${size>30?.2:.28})`:`rgba(55,40,25,${size>30?.24:.3})`;
  const ch=[...pl.n];ch.forEach((t,i)=>c.fillText(t,sx,sy+(i-(ch.length-1)/2)*size*1.02));}
 c.textAlign='left';
 U.baseDirty=false;
}

/* ===== 上層の描画 ===== */
let tNow=0;
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
const PREV=new Map();
function snapUnits(){PREV.clear();for(const u of S.units){const r=rawPos(u);PREV.set(u.id,[r[0],r[1]]);}}
// 駒の位置：城と城の間は、街道があれば街道の道筋をたどる
// その日の終わりの位置（計算上）
function rawPos(u){if(u.state==='siege'||(u.state==='battle'&&u.seg>=u.path.length-1)){const L=u.path.length;if(L>=2){const r=G.edgePoint(u.path[L-2],u.path[L-1],.86);return r;}const C=G.C[u.path[L-1]];return [C.x,C.y,null];}
 const a=u.path[u.seg],b=u.path[Math.min(u.seg+1,u.path.length-1)];if(a===b){const C=G.C[a];return [C.x,C.y,null];}
 let f=u.pos;const last=u.seg>=u.path.length-2&&(u.mission==='attack'||u.state==='battle');if(last)f=Math.min(f,.86);
 return G.edgePoint(a,b,Math.max(0,Math.min(1,f)));}
// 画面の位置：前の日の位置から今日の位置へ、時の進みに合わせてまっすぐ等速で動かす
function unitPos(u){const r=rawPos(u);const p=PREV.get(u.id);if(p&&U.speed&&!U.modal&&!U.ffwd){const k=Math.max(0,Math.min(1,U.acc));const d=Math.hypot(r[0]-p[0],r[1]-p[1]);if(d>0&&d<80)return [p[0]+(r[0]-p[0])*k,p[1]+(r[1]-p[1])*k,r[2]];}return r;}
function _unused(u){const a=0,b=0;let f=u.pos;
 return f;}
function uXY(u){const r=unitPos(u);return [r[0],r[1]];}
function unitXY(u){const r=unitPos(u);return [r[0],r[1]];}
function castleIcon(c,x,y,s,col,mine,cap){
 c.save();c.translate(x,y);c.lineJoin='round';const ol=mine?'#f2d27c':'rgba(30,22,14,.85)';
 // 影
 c.fillStyle='rgba(20,14,8,.28)';c.beginPath();c.ellipse(s*.25,s*.62,s*1.25,s*.38,0,0,7);c.fill();
 // 石垣（台形・陰影付き）
 c.beginPath();c.moveTo(-s*1.05,s*.55);c.lineTo(-s*.78,-s*.02);c.lineTo(s*.78,-s*.02);c.lineTo(s*1.05,s*.55);c.closePath();c.fillStyle='#9c9384';c.fill();
 c.beginPath();c.moveTo(s*.2,s*.55);c.lineTo(s*.25,-s*.02);c.lineTo(s*.78,-s*.02);c.lineTo(s*1.05,s*.55);c.closePath();c.fillStyle='#7d7568';c.fill();
 c.strokeStyle=ol;c.lineWidth=mine?1.6:1;c.beginPath();c.moveTo(-s*1.05,s*.55);c.lineTo(-s*.78,-s*.02);c.lineTo(s*.78,-s*.02);c.lineTo(s*1.05,s*.55);c.closePath();c.stroke();
 const tier=(w,y0,h)=>{c.fillStyle='#f6f1e4';c.fillRect(-w,y0-h,w*2,h);c.fillStyle='#d9d2c2';c.fillRect(w*.25,y0-h,w*.75,h);c.strokeStyle=ol;c.lineWidth=.9;c.strokeRect(-w,y0-h,w*2,h);
  c.beginPath();c.moveTo(-w*1.35,y0-h);c.quadraticCurveTo(-w*.6,y0-h-h*.15,0,y0-h-h*.75);c.quadraticCurveTo(w*.6,y0-h-h*.15,w*1.35,y0-h);c.closePath();c.fillStyle=col;c.fill();c.stroke();};
 tier(s*.62,-s*.02,s*.42);tier(s*.44,-s*.6,s*.34);if(s>5.5||cap)tier(s*.3,-s*1.08,s*.28);
 if(cap){c.fillStyle='#f2d27c';c.beginPath();c.moveTo(0,-s*1.62);c.lineTo(s*.12,-s*1.45);c.lineTo(-s*.12,-s*1.45);c.closePath();c.fill();}
 c.restore();
}
function plate(c,text,cx,cy,k,gold,small){c.font=`${small?'700 11px':'800 12px'} "Shippori Mincho B1",serif`;const w=c.measureText(text).width+(small?10:14),h=small?15:17;
 rr(c,cx-w/2,cy-h/2,w,h,2);c.fillStyle=gold?'rgba(20,14,8,.88)':deep(k);c.fill();c.strokeStyle=gold?'#d9b866':'rgba(255,246,220,.6)';c.lineWidth=1;c.stroke();
 c.textAlign='center';c.textBaseline='middle';c.fillStyle=gold?'#f3e3b4':'#fff7e2';c.fillText(text,cx,cy+.5);c.textAlign='left';return w;}
function prio(C){const k=S.castles[C.id].owner;return (C.id===U.sel?1e6:0)+(k===S.player?1e5:0)+(S.clans[k]&&S.clans[k].cap===C.id?G.clanCastles(k).length*1000:0)+C.koku;}
/* 城跡・砦・築城の計画と普請 */
function jText(c,t,x,y,col,size){c.font=`700 ${size||11}px "Shippori Mincho B1",serif`;c.textBaseline='middle';c.lineWidth=3;c.strokeStyle='rgba(255,250,236,.9)';c.strokeText(t,x,y);c.fillStyle=col;c.fillText(t,x,y);}
function terrLine(id){const t=G.ctype(id),h=(TK.CTERR||{})[id];const rv=G.ADJ[id].filter(n=>{const e=G.EDGES[G.ekey(id,n)];return e&&e.river&&!e.sea;}).map(n=>G.cname(n));
 return `<div class="tline2"><b>${t.n}</b>${t.def>1?`<em>守り ×${t.def}</em>`:''}<small>${esc(t.d)}${h&&h[0]?`（標高 ${h[0]}m）`:''}${rv.length?` ・ 川を渡る道：${esc(rv.slice(0,3).join('、'))}`:''}</small></div>`;}
function yoshoLine(id){const ys=G.yoshoOf(id);if(!ys.length)return '';const o=S.castles[id].owner;
 return `<div class="yline">${ys.map(y=>`<div${G.yActive(y)?'':' class="yoff"'}><b><i class="yk">${y.kind}</i>${esc(y.n)}${G.yActive(y)?'':'（いまは働いていない）'}</b><small>${esc(G.YOSHO_FX[y.kind].fx)}${o===S.player?'':' ・ 押さえれば'+G.CNK(S.player)+'の力に'}</small><small class="yd">${esc(y.desc)}</small></div>`).join('')}</div>`;}
const YK_COL={城:'#3b3128',金:'#e0b43a',銀:'#c9ced6',寺:'#b5462f',鉄:'#44454a',市:'#c88a2c',馬:'#7a5a34',湊:'#2f6f9e',関:'#5b3c1f',宿:'#8a6b3a',橋:'#8a6b3a'};
function drawYosho(c,z,lvl,placed){if(z<.6)return;const big=new Set(['金','銀','寺','湊','関']);
 for(const y of (G.YOSHO||[])){if(lvl===0&&!big.has(y.kind))continue;const [x,sy]=w2s(y.x,y.y);if(x<-40||sy<-20||x>VW+40||sy>VH+20)continue;const k=S.castles[y.at]?S.castles[y.at].owner:null;const s=lvl===0?3.8:4.8;const on=G.yActive(y);
  c.save();c.globalAlpha=on?1:.35;c.translate(x,sy);c.rotate(Math.PI/4);c.fillStyle=k?mix(G.CC(k),'#ffffff',.3):'#999';c.strokeStyle=YK_COL[y.kind]||'rgba(40,28,14,.9)';c.lineWidth=1.8;c.fillRect(-s,-s,s*2,s*2);c.strokeRect(-s,-s,s*2,s*2);c.restore();
  c.save();c.globalAlpha=on?1:.4;c.font=`800 ${lvl===0?7:8.5}px "Shippori Mincho B1",serif`;c.textAlign='center';c.textBaseline='middle';c.fillStyle='#2a1d10';c.fillText(y.kind,x,sy+.5);c.restore();
  if(lvl>=1&&on){const w=y.n.length*10.5+6;if(!placed||fitsP(placed,x+6,sy-8,w,16)){jText(c,y.n,x+8,sy,'#5a3a1a',10.5);if(placed)placed.push([x+6,sy-8,w,16]);}}
  if(placed)placed.push([x-6,sy-6,12,12]);c.textAlign='left';}}
let RUINLAB=[];const fitsP=(P,x,y,w,h)=>{for(const r of P)if(x<r[0]+r[2]&&x+w>r[0]&&y<r[1]+r[3]&&y+h>r[1])return false;return true;};
function drawJokaku(c,z,lvl,placed){RUINLAB=[];
 if(lvl>=1)for(const r of (S.ruins||[])){const [x,y]=w2s(r.x,r.y);if(x<-40||y<-20||x>VW+40||y>VH+20)continue;
  c.globalAlpha=.75;c.fillStyle='#8b8170';c.strokeStyle='rgba(60,50,40,.7)';c.lineWidth=1;c.beginPath();c.moveTo(x-5,y+3);c.lineTo(x-3.5,y-1.5);c.lineTo(x+3.5,y-1.5);c.lineTo(x+5,y+3);c.closePath();c.fill();c.stroke();
  c.globalAlpha=1;if(lvl>=2)RUINLAB.push([r.n+'跡',x,y]);}
 for(const id in (S.forts||{})){const f=S.forts[id];const [x,y]=w2s(f.x,f.y);if(x<-40||y<-20||x>VW+40||y>VH+20)continue;const k=f.clan;
  castleIcon(c,x,y,4.2*Math.min(1.6,.7+z*.35),k?deep(k):'#555',k===S.player,false);if(lvl>=1||z>.55)jText(c,f.n,x+8,y-4,'#3a2a14',11);}
 for(const id in (S.plans||{})){const p=S.plans[id];if(S.works&&S.works[id])continue;const C=G.C[id];const P=p.lon!=null?G.PJ(p.lon,p.lat):[C.x+10,C.y-10];const [x,y]=w2s(P[0],P[1]);if(x<-60||y<-30||x>VW+60||y>VH+30)continue;
  const mine=S.castles[id].owner===S.player;c.setLineDash([3,2]);c.strokeStyle=mine?'#b07a12':'rgba(90,70,40,.8)';c.lineWidth=1.6;c.strokeRect(x-6,y-6,12,12);c.setLineDash([]);
  if(lvl>=1||mine)jText(c,'計画 '+p.n,x+9,y,mine?'#8a5a06':'#5a4a30',11);}
 for(const id in (S.works||{})){const w=S.works[id];const p=w.p;const C=G.C[id];const P=p.lon!=null?G.PJ(p.lon,p.lat):[C.x,C.y];const [x,y]=w2s(P[0],P[1]);if(x<-60||y<-30||x>VW+60||y>VH+30)continue;
  const r=Math.max(0,Math.min(1,(S.t-w.start)/(w.end-w.start)));c.strokeStyle='#5a3a1a';c.lineWidth=1.4;for(let i=-1;i<=1;i++){c.beginPath();c.moveTo(x+i*5,y+6);c.lineTo(x+i*5,y-9);c.stroke();}c.beginPath();c.moveTo(x-8,y-4);c.lineTo(x+8,y-4);c.moveTo(x-8,y+1);c.lineTo(x+8,y+1);c.stroke();
  rr(c,x-14,y+9,28,4,2);c.fillStyle='rgba(30,20,10,.6)';c.fill();rr(c,x-14,y+9,28*r,4,2);c.fillStyle='#e0b85a';c.fill();
  jText(c,'普請中 '+p.n,x+12,y-6,'#6a3e10',11);}
 for(const C of G.CL){const o=S.cst&&S.cst[C.id];if(!o||!o.burnt)continue;const [x,y]=w2s(C.x,C.y);if(x<-40||y<-40||x>VW+40||y>VH+40)continue;
  const t=tNow/400;for(let i=0;i<3;i++){const a=(t+i*.33)%1;c.globalAlpha=(1-a)*.5;c.fillStyle='#4a4038';c.beginPath();c.arc(x+3+Math.sin(a*6+i)*3,y-10-a*16,2.5+a*4,0,7);c.fill();}c.globalAlpha=1;}
}
const DISP=new Map(),OFF=new Map();
function drawTop(){
 const c=tctx;c.setTransform(DPR,0,0,DPR,0,0);c.clearRect(0,0,VW,VH);if(!S)return;
 const z=cam.z,cc=vc();
 c.save();c.setTransform(DPR*z,0,0,DPR*z,DPR*(cc[0]-cam.x*z),DPR*(cc[1]-cam.y*z));
 if(U.sel){c.fillStyle='rgba(255,240,190,.16)';c.fill(TERR[U.sel]);c.shadowColor='rgba(240,200,100,.9)';c.shadowBlur=10*DPR;c.strokeStyle='#f2d27c';c.lineWidth=2.6/z;c.stroke(TERR[U.sel]);c.shadowBlur=0;}
 if(U.picking){c.setLineDash([6/z,4/z]);c.strokeStyle='#ff6a4d';c.lineWidth=2.4/z;for(const n of G.ADJ[U.picking]){const o=S.castles[n].owner;if(o!==S.player&&!G.allied(S.player,o))c.stroke(TERR[n]);}c.setLineDash([]);}
 if(U.mode==='pick'&&U.pickClan){c.strokeStyle='#f2d27c';c.lineWidth=2.4/z;const pr=G.preList().find(x=>x.k===U.pickClan);for(const C of G.CL)if(S.castles[C.id].owner===U.pickClan||(pr&&pr.castles.includes(C.id)))c.stroke(TERR[C.id]);}
 for(const u of S.units){const tg=u.path[u.path.length-1];const mine=u.clan===S.player,threat=S.castles[tg].owner===S.player&&u.mission==='attack';
  if(z<.7&&!mine&&u.troops<6000&&S.castles[tg].owner!==S.player)continue;
  const col=G.CC(u.clan);const [px,py,pa]=unitPos(u);const sa=u.path[u.seg],sb=u.path[Math.min(u.seg+1,u.path.length-1)];
  const geo=sa!==sb?G.edgeGeo(sa,sb):[[G.C[sa].x,G.C[sa].y]];
  // 通ってきた道筋（今の城と城の間）
  const doneP=[],restP=[];{const dx=px,dy=py;let best=0,bd=1e9;for(let i=0;i<geo.length;i++){const d=Math.hypot(geo[i][0]-dx,geo[i][1]-dy);if(d<bd){bd=d;best=i;}}
   for(let i=0;i<geo.length;i++){if(i<=best)doneP.push(geo[i]);if(i>=best)restP.push(geo[i]);}
   if(best>0){const q=geo[best],r=geo[best-1];const ahead=Math.hypot(q[0]-r[0],q[1]-r[1])<Math.hypot(px-r[0],py-r[1]);if(!ahead){doneP.pop();restP.unshift(q);}}}
  c.lineCap='round';c.lineJoin='round';c.strokeStyle='rgba(255,250,235,.85)';c.lineWidth=(mine||threat?7:5)/z;c.beginPath();c.moveTo(doneP[0][0],doneP[0][1]);for(const q of doneP)c.lineTo(q[0],q[1]);c.lineTo(px,py);c.stroke();
  c.strokeStyle=col;c.lineWidth=(mine||threat?4.4:3)/z;c.stroke();
  if(u.state==='march'){c.setLineDash([5/z,4/z]);c.strokeStyle=threat?'rgba(220,60,40,.9)':mix(col,'#000000',.2);c.lineWidth=1.8/z;c.beginPath();c.moveTo(px,py);for(const q of restP)c.lineTo(q[0],q[1]);
   for(let k=u.seg+1;k<u.path.length-1;k++){const g2=G.edgeGeo(u.path[k],u.path[k+1]);for(const q of g2)c.lineTo(q[0],q[1]);}c.stroke();c.setLineDash([]);}
  // 向き：止まっている軍は目ざす城の方を、進む軍は道の少し先の方を向く（道の細かな曲がりで向きが跳ねないように）
  let ang;const T=G.C[tg];
  if(u.state!=='march'||sa===sb){ang=Math.hypot(T.x-px,T.y-py)>2?Math.atan2(T.y-py,T.x-px):(pa??-Math.PI/2);}
  else{const E=G.EDGES[G.ekey(sa,sb)];const Ln=E&&E.cum?E.cum[E.cum.length-1]:30;const w=Math.min(.45,9/Math.max(1,Ln));const f=Math.max(0,Math.min(1,u.pos));const A=G.edgePoint(sa,sb,Math.max(0,f-w*.5)),B=G.edgePoint(sa,sb,Math.min(1,f+w));ang=Math.hypot(B[0]-A[0],B[1]-A[1])>.5?Math.atan2(B[1]-A[1],B[0]-A[0]):(pa??0);}
  const o=ANG.get(u.id);if(o!=null){let dd=ang-o;while(dd>Math.PI)dd-=2*Math.PI;while(dd<-Math.PI)dd+=2*Math.PI;ang=o+dd*.12;}
  ANG.set(u.id,ang);
 }
 if(U.sel&&U.mode==='game'){const k=S.castles[U.sel].owner,ck=S.clans[k];if(ck){const A=G.C[ck.cap]||G.C[U.sel];
  for(const j of G.alive()){if(j===k)continue;const al=G.allied(k,j),war=!al&&G.atWar(k,j);if(!al&&!war)continue;const B=G.C[S.clans[j].cap];if(!B)continue;
   const mx=(A.x+B.x)/2,my=(A.y+B.y)/2,dx=B.x-A.x,dy=B.y-A.y,L=Math.hypot(dx,dy)||1,cx=mx-dy/L*L*.18,cy=my+dx/L*L*.18;
   c.beginPath();c.moveTo(A.x,A.y);c.quadraticCurveTo(cx,cy,B.x,B.y);c.lineCap='round';c.strokeStyle='rgba(255,250,235,.85)';c.lineWidth=6.5/z;c.setLineDash([]);c.stroke();
   c.strokeStyle=al?'#1f8a48':'#c4281c';c.lineWidth=3.4/z;c.setLineDash(al?[8/z,5/z]:[]);c.stroke();c.setLineDash([]);
   c.beginPath();c.arc(B.x,B.y,6/z,0,7);c.fillStyle=al?'#23864a':'#c4281c';c.fill();c.strokeStyle='#fff';c.lineWidth=1.5/z;c.stroke();}}}
 c.restore();
 const lvl=z<.75?0:z<1.4?1:2;
 const placed=[];const fits=(x,y,w,h)=>{for(const r of placed)if(x<r[0]+r[2]&&x+w>r[0]&&y<r[1]+r[3]&&y+h>r[1])return false;return true;};
 const sieged={};for(const u of S.units)if(u.state==='siege')sieged[u.path[u.path.length-1]]=1;
 drawJokaku(c,z,lvl,placed);drawYosho(c,z,lvl,placed);
 for(const C of G.CL){const [x,y]=w2s(C.x,C.y);if(x<-40||y<-40||x>VW+40||y>VH+40)continue;const st=S.castles[C.id],k=st.owner;const cap=S.clans[k]&&S.clans[k].cap===C.id;
  const s=(3.6+Math.sqrt(C.koku)*.7)*Math.min(1.9,.65+z*.4);
  if(sieged[C.id]){const p=.5+.5*Math.sin(tNow/170);c.beginPath();c.arc(x,y-s*.2,s*2+p*4,0,7);c.strokeStyle=`rgba(220,60,40,${.45+p*.4})`;c.lineWidth=2.2;c.stroke();}
  castleIcon(c,x,y,s,deep(k),k===S.player,cap);}
 const order=G.CL.slice().sort((a,b)=>prio(b)-prio(a));
 for(const C of order){const st=S.castles[C.id],k=st.owner;const [x,y]=w2s(C.x,C.y);if(x<-80||y<-80||x>VW+80||y>VH+80)continue;
  const gs=G.castleGens(C.id).filter(g=>!G.inTransit(g));const lead=gs.find(g=>G.isLeader(g));const cl=S.clans[k];
  const big=lead&&(G.clanCastles(k).length>=2||k===S.player||U.mode==='pick'||lvl>=1||U.sel===C.id);const im=big?portrait(lead.n,Math.round((lvl===0?15:lvl===1?19:23)*(k===S.player?1.12:1)),true,G.CC(k)):null;
  let didPortrait=false;
  if(big&&!im&&(G.clanCastles(k).length>=2||k===S.player||U.mode==='pick')&&fits(x-40,y-34,80,18)){placed.push([x-40,y-34,80,18]);plate(c,lead.n,x,y-24,k,true);didPortrait=true;}
  if(big&&im){const r=Math.round((lvl===0?15:lvl===1?19:23)*(k===S.player?1.12:1));
   const cand=[[0,-r-24],[-r-30,-r-10],[r+30,-r-10],[0,r+26],[-r-34,10],[r+34,10]];
   const ps0=U.pslot[C.id]||0;const ord=[ps0,...cand.map((_,i)=>i).filter(i=>i!==ps0)];
   for(const ci of ord){const [dx,dy]=cand[ci];const px=x+dx,py=y+dy;const w=Math.max(r*2+8,lead.n.length*12+14),h=r*2+26;if(!fits(px-w/2,py-r-4,w,h))continue;
    placed.push([px-w/2,py-r-4,w,h]);U.pslot[C.id]=ci;
    const L=Math.hypot(dx,dy),cs=(3.6+Math.sqrt(C.koku)*.7)*Math.min(1.9,.65+z*.4)+3;c.strokeStyle='rgba(240,214,140,.85)';c.lineWidth=1.2;c.beginPath();c.moveTo(x+dx/L*cs,y-cs*.3+dy/L*cs);c.lineTo(px-dx/L*r,py-dy/L*r);c.stroke();
    c.drawImage(im,px-im.css/2,py-im.css/2,im.css,im.css);
    plate(c,lead.n,px,py+r+11,k,true);didPortrait=true;break;}}
  const showName=U.mode!=='title'&&(lvl>=1||U.sel===C.id||U.hover===C.id||(lvl===0&&cl&&cl.cap===C.id&&!didPortrait&&z>.55));
  if(!showName)continue;
  const nm=G.cname(C.id);c.font='700 12px "Shippori Mincho B1",serif';const nw=c.measureText(nm).width;
  const lord=!didPortrait&&lvl>=2?(lead||gs.slice().sort((a,b)=>(b.t+b.b+b.c+b.s)-(a.t+a.b+a.c+a.s))[0]):null;
  c.font='700 11px "Shippori Mincho B1",serif';const lw=lord?c.measureText(lord.n).width+10:0;
  const tw=lvl>=2?40:0,bw=Math.max(nw+tw,lw)+6,bh=lord?34:16;const lx=x+9,ly=y-8;
  if(!fits(lx,ly-2,bw,bh)&&U.sel!==C.id&&U.hover!==C.id)continue;placed.push([lx,ly-2,bw,bh]);
  c.font='700 12px "Shippori Mincho B1",serif';c.textBaseline='middle';c.lineWidth=3.2;c.strokeStyle='rgba(255,250,236,.92)';c.strokeText(nm,lx,ly+5);c.fillStyle='#24180c';c.fillText(nm,lx,ly+5);
  if(lvl>=2){c.font='500 10.5px "Zen Kaku Gothic New",sans-serif';const t=fmt(st.troops);c.lineWidth=3;c.strokeText(t,lx+nw+5,ly+5);c.fillStyle='#5a4126';c.fillText(t,lx+nw+5,ly+5);}
  if(lord)plate(c,lord.n,lx+lw/2,ly+23,k,false,true);
 }
 // 城跡の名は、城の名札を置いたあとの空いた所に（カーソルの位置で出たり消えたりしないように）
 for(const [t,x,y] of RUINLAB){const w=t.length*10.5+4;if(!fits(x+5,y-7,w,15))continue;placed.push([x+5,y-7,w,15]);c.globalAlpha=.8;jText(c,t,x+7,y+1,'#6b5e4c',10.5);c.globalAlpha=1;}
 if(lvl>=1)roadLabelsTop(c,z,fits,placed);
 // 旅の途中の武将（城を移る時も道を通って行く）
 for(const g of S.gens){if(!G.inTransit(g))continue;const imp=G.isLeader(g)||lvl>=1;if(!imp)continue;const p=g.tr.p;if(!p||p.length<2)continue;
  const f=Math.max(0,Math.min(1,(S.t+(U.speed?Math.min(1,U.acc):0)-g.tr.t0)/Math.max(1,g.tr.t1-g.tr.t0)));let L=0;const seg=[];for(let i=0;i<p.length-1;i++){const a=G.C[p[i]],b=G.C[p[i+1]];const l=Math.hypot(a.x-b.x,a.y-b.y);seg.push(l);L+=l;}
  let d=f*L,i=0;while(i<seg.length-1&&d>seg[i]){d-=seg[i];i++;}const A=G.C[p[i]],B=G.C[p[i+1]];const k2=seg[i]?d/seg[i]:0;const wx=A.x+(B.x-A.x)*k2,wy=A.y+(B.y-A.y)*k2;const [x,y]=w2s(wx,wy);
  if(x<-40||y<-40||x>VW+40||y>VH+40)continue;const r=G.isLeader(g)?13:10;const im=portrait(g.n,r,true,G.CC(g.clan));
  c.save();c.globalAlpha=.92;c.beginPath();c.arc(x,y,r+5,0,7);c.fillStyle='rgba(20,14,8,.35)';c.fill();if(im)c.drawImage(im,x-im.css/2,y-im.css/2,im.css,im.css);else{c.beginPath();c.arc(x,y,r,0,7);c.fillStyle=G.CC(g.clan);c.fill();}
  if(lvl>=1){c.font='700 10.5px "Shippori Mincho B1",serif';c.textAlign='center';c.textBaseline='top';c.lineWidth=3;c.strokeStyle='rgba(255,250,236,.92)';const t=g.n+' 移る';c.strokeText(t,x,y+r+4);c.fillStyle='#2a1d10';c.fillText(t,x,y+r+4);c.textAlign='left';}
  c.restore();}
 for(const st of (S.sites||[])){if(S.t-st.t>540)continue;const C=G.C[st.at];let [x,y]=st.x!=null?w2s(st.x,st.y2):w2s(C.x+14,C.y+12);if(x<-80||y<-40||x>VW+80||y>VH+40)continue;
  const fade=Math.max(.35,1-(S.t-st.t)/540);c.globalAlpha=fade;c.save();c.translate(x,y);c.strokeStyle='#7a1c12';c.lineWidth=2.6;c.lineCap='round';c.beginPath();c.moveTo(-7,-7);c.lineTo(7,7);c.moveTo(7,-7);c.lineTo(-7,7);c.stroke();c.restore();
  c.font='800 12px "Shippori Mincho B1",serif';c.textBaseline='middle';const t=st.n+'の戦い';const label=/戦い|変|城|攻め|平定|乱|殺し|開城|落城|征伐|一揆/.test(st.n)?st.n:t;c.lineWidth=3.4;c.strokeStyle='rgba(255,248,230,.95)';c.strokeText(label,x+11,y+1);c.fillStyle='#7a1c12';c.fillText(label,x+11,y+1);c.font='600 10px "Zen Kaku Gothic New",sans-serif';c.lineWidth=3;c.strokeText(st.y+'年',x+11,y+14);c.fillStyle='#5a3a26';c.fillText(st.y+'年',x+11,y+14);c.globalAlpha=1;}
 // 同じ場所に重なる軍勢は、少しずつずらして並べる（たくさんの軍勢が見分けられるように）
 // 駒は、計算上の位置へなめらかに寄っていく（一日ごとの飛びや、囲みに入る瞬間の飛びを見せない）
 const nowT=performance.now(),dtS=Math.min(.1,(nowT-(drawTop._t||nowT))/1000);drawTop._t=nowT;
 for(const id of [...DISP.keys()])if(!S.units.some(u=>u.id===id))DISP.delete(id);
 const UP=new Map(),cells=new Map();U._UP=UP;for(const u of S.units){let [wx,wy]=uXY(u);const p=w2s(wx,wy);UP.set(u.id,p);// 円く並べ直すのは、同じ城を囲む・同じ所に陣を張る軍勢だけ（進んでいる軍は道の上のまま）
  if(u.state==='march')continue;const k=u.state+'@'+u.path[u.path.length-1]+(u.state==='siege'?'':'@'+u.seg);(cells.get(k)||cells.set(k,[]).get(k)).push(u.id);}
 // 重なりは、兵の多い順に大将の駒を真ん中に残し、ほかを円く広げて元の場所へ細い線を引く。多すぎる時は「ほか n 隊」の札にまとめる
 const ORIG=new Map(),HIDE=new Set(),MORE=[];
 for(const ids of cells.values()){if(ids.length<2)continue;ids.sort((a,b)=>{const A=S.units.find(u=>u.id===a),B=S.units.find(u=>u.id===b);return (B.clan===S.player)-(A.clan===S.player)||B.troops-A.troops;});
  const p0=UP.get(ids[0]).slice();const cap=lvl>=2?8:lvl===1?6:4;const shown=ids.slice(0,cap),n=shown.length-1,R=Math.min(58,26+n*6);
  shown.forEach((id,i)=>{if(i===0)return;const p=UP.get(id);ORIG.set(id,p.slice());const a=-Math.PI/2+(i-1)*2*Math.PI/n;p[0]=p0[0]+Math.cos(a)*R;p[1]=p0[1]+Math.sin(a)*R*.8;});
  if(ids.length>cap){ids.slice(cap).forEach(id=>HIDE.add(id));MORE.push([p0[0],p0[1]+R*.8+30,ids.length-cap,ids.slice(cap).reduce((s,id)=>s+S.units.find(u=>u.id===id).troops,0)]);}}
 // 並べ直しの移動も、すっと動かす（瞬間に飛ばさない）
 for(const u of S.units){const p=UP.get(u.id);const o=ORIG.get(u.id)||p.slice();const tx=p[0]-o[0],ty=p[1]-o[1];const c0=OFF.get(u.id)||[0,0];const kk=Math.min(1,dtS*6);c0[0]+=(tx-c0[0])*kk;c0[1]+=(ty-c0[1])*kk;OFF.set(u.id,c0);if(ORIG.has(u.id)||Math.hypot(c0[0],c0[1])>.5){p[0]=o[0]+c0[0];p[1]=o[1]+c0[1];if(!ORIG.has(u.id))ORIG.set(u.id,o.slice());}}
 for(const id of [...OFF.keys()])if(!UP.has(id))OFF.delete(id);
 for(const [id,o] of ORIG){const p=UP.get(id);c.save();c.strokeStyle='rgba(255,250,235,.8)';c.lineWidth=2.6;c.beginPath();c.moveTo(o[0],o[1]);c.lineTo(p[0],p[1]);c.stroke();const u=S.units.find(x=>x.id===id);c.strokeStyle=G.CC(u.clan);c.lineWidth=1.2;c.stroke();c.beginPath();c.arc(o[0],o[1],2.6,0,7);c.fillStyle=G.CC(u.clan);c.fill();c.restore();}
 for(const u of S.units){if(HIDE.has(u.id))continue;let [x,y]=UP.get(u.id);if(x<-60||y<-40||x>VW+60||y>VH+40)continue;const mine=u.clan===S.player;
  if(z<.7&&!mine&&u.troops<6000&&S.castles[u.path[u.path.length-1]].owner!==S.player)continue;
  drawCounter(c,x,y,u,mine,lvl);}
 for(const [x,y,n,tr] of MORE){const t=`ほか ${n} 隊 ・ ${man(tr)}`;c.font='700 11px "Shippori Mincho B1",serif';const w=c.measureText(t).width+14;rr(c,x-w/2,y-9,w,18,9);c.fillStyle='rgba(20,14,8,.85)';c.fill();c.strokeStyle='rgba(242,210,124,.8)';c.lineWidth=1;c.stroke();c.fillStyle='#f2e6c8';c.textAlign='center';c.textBaseline='middle';c.fillText(t,x,y+.5);c.textAlign='left';}
}
/* 本隊のほかの隊：大軍は先手と小荷駄を連れて進み、城を囲めば四方に陣を張る */
function subPiece(c,x,y,ang,clan,mine,label){const k=.62,bw=30*k,bh=20*k,hw=16*k,hh=11*k;
 c.save();c.translate(x,y);c.rotate(ang);c.globalAlpha=.9;c.beginPath();c.moveTo(-bw/2,bh/2);c.lineTo(-bw/2,-bh/2+hh/2);c.lineTo(-hw/2,-bh/2+hh/2);c.lineTo(-hw/2,-bh/2-hh/2);c.lineTo(hw/2,-bh/2-hh/2);c.lineTo(hw/2,-bh/2+hh/2);c.lineTo(bw/2,-bh/2+hh/2);c.lineTo(bw/2,bh/2);c.closePath();
 c.fillStyle=G.CC(clan);c.fill();c.lineWidth=1;c.strokeStyle=mine?'#f2d27c':'rgba(255,250,235,.9)';c.stroke();c.restore();
 if(label){c.font='700 9.5px "Shippori Mincho B1",serif';c.textAlign='center';c.textBaseline='top';c.lineWidth=2.6;c.strokeStyle='rgba(255,250,236,.9)';c.strokeText(label,x,y+9);c.fillStyle='#3a2a18';c.fillText(label,x,y+9);c.textAlign='left';}}
function drawDetach(c,x,y,u,mine){if(u.troops<6000&&u.gens.length<2)return;const a=(ANG.get(u.id)??-Math.PI/2);const ca=Math.cos(a),sa=Math.sin(a);const gn=i=>{const g=G.gen(u.gens[i]);return g?g.n:'';};
 if(u.state==='siege'){const C=G.C[u.path[u.path.length-1]];const [cx,cy]=w2s(C.x,C.y);const n=u.troops>=20000?4:u.troops>=10000?3:2;const base=Math.atan2(y-cy,x-cx);
  for(let i=1;i<=n;i++){const t=base+i*2*Math.PI/(n+1);const R=34;const px=cx+Math.cos(t)*R,py=cy+Math.sin(t)*R-6;c.save();c.setLineDash([2,3]);c.strokeStyle='rgba(196,40,28,.5)';c.lineWidth=1;c.beginPath();c.moveTo(x,y);c.lineTo(px,py);c.stroke();c.restore();
   subPiece(c,px,py,Math.atan2(cy-py,cx-px)+Math.PI/2,u.clan,mine,i<u.gens.length?gn(i):'');}
  return;}
 if(u.state==='march'||u.state==='camp'){const d=46;
  subPiece(c,x+ca*d,y+sa*d,a+Math.PI/2,u.clan,mine,u.gens.length>1?gn(1)+'（先手）':'先手');
  if(u.troops>=10000)subPiece(c,x-ca*d*.9,y-sa*d*.9,a+Math.PI/2,u.clan,mine,'小荷駄');}}
/* 兵棋のコマ：家の色の札に、兵の種別の記号と兵数 */
/* 軍勢の駒：時代劇の陣立図でおなじみの「凸」の形。出っ張りが進む向きを指す */
const ANG=new Map();
// 駒の大きさは兵の数で変える（千で小さく、三万を超えると大きく）
const troopScale=t=>Math.max(.72,Math.min(1.5,.8+.22*Math.log2(Math.max(1000,t)/4000)));
function drawCounter(c,x,y,u,mine,lvl){const t2=G.armOf(u);const k=(lvl===0?.85:lvl===1?1:1.2)*troopScale(u.troops);
 const ang=(ANG.get(u.id)??-Math.PI/2)+Math.PI/2;const bw=30*k,bh=20*k,hw=16*k,hh=11*k;
 if(u.state==='battle'){const p=.5+.5*Math.sin(tNow/90+u.id);c.beginPath();c.arc(x,y,22*k+p*5,0,7);c.fillStyle=`rgba(255,110,50,${.18+p*.22})`;c.fill();}
 c.save();c.translate(x,y);c.rotate(ang);
 const shape=()=>{c.beginPath();c.moveTo(-bw/2,bh/2);c.lineTo(-bw/2,-bh/2+hh/2);c.lineTo(-hw/2,-bh/2+hh/2);c.lineTo(-hw/2,-bh/2-hh/2);c.lineTo(hw/2,-bh/2-hh/2);c.lineTo(hw/2,-bh/2+hh/2);c.lineTo(bw/2,-bh/2+hh/2);c.lineTo(bw/2,bh/2);c.closePath();};
 c.save();c.shadowColor='rgba(0,0,0,.5)';c.shadowBlur=4;c.shadowOffsetY=2;shape();c.fillStyle=G.CC(u.clan);c.fill();c.restore();
 shape();c.lineJoin='round';c.lineWidth=mine?2.2:1.4;c.strokeStyle=mine?'#f2d27c':'rgba(255,250,235,.95)';c.stroke();
 // 家の色を締める下帯
 c.fillStyle='rgba(0,0,0,.22)';c.fillRect(-bw/2+1.5,bh/2-4*k,bw-3,3*k);
 c.restore();
 c.font=`800 ${Math.round(12*k)}px "Shippori Mincho B1",serif`;c.textAlign='center';c.textBaseline='middle';c.lineWidth=2.6;c.strokeStyle='rgba(20,12,4,.65)';c.strokeText(G.ARMS[t2].k,x,y+1);c.fillStyle='#fff7e2';c.fillText(G.ARMS[t2].k,x,y+1);
 // 兵数の札
 const txt=man(u.troops);c.font=`800 ${Math.round(10.5*k)}px "Shippori Mincho B1",serif`;const tw=c.measureText(txt).width+8;const ty=y+bh/2+hh/2+5*k;
 rr(c,x-tw/2,ty-1,tw,13*k,2);c.fillStyle='rgba(20,14,8,.85)';c.fill();c.strokeStyle=mine?'#f2d27c':deep(u.clan);c.lineWidth=1;c.stroke();c.fillStyle='#fff7e2';c.textBaseline='top';c.fillText(txt,x,ty+.5);
 // 大将
 const g=G.gen(u.gens[0]);const im=g&&hasFace(g.n)&&(lvl>=1||G.isLeader(g))?portrait(g.n,Math.round(10*k),true,G.CC(u.clan)):null;
 if(im)c.drawImage(im,x-bw/2-im.css*.75,y-bh/2-im.css*.75,im.css,im.css);
 if(lvl>=1&&g){c.font='700 10.5px "Shippori Mincho B1",serif';c.textBaseline='bottom';c.lineWidth=3;c.strokeStyle='rgba(255,250,236,.92)';const ny=y-bh/2-hh-3;c.strokeText(g.n,x,ny);c.fillStyle='#2a1d10';c.fillText(g.n,x,ny);}
 if(u.state==='siege'||u.state==='battle'){c.strokeStyle='#c4281c';c.lineWidth=2;const sx=x+bw/2+5,sy=y-bh/2;c.beginPath();c.moveTo(sx-4,sy-4);c.lineTo(sx+4,sy+4);c.moveTo(sx+4,sy-4);c.lineTo(sx-4,sy+4);c.stroke();}
 c.textAlign='left';
}
/* ===== 入力 ===== */
const ptrs=new Map();let drag=null,moved=false,pinch=null;
top_.addEventListener('pointerdown',e=>{top_.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});moved=false;
 if(ptrs.size===1)drag={x:e.clientX,y:e.clientY,cx:cam.x,cy:cam.y};
 if(ptrs.size===2){const [a,b]=[...ptrs.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y),z:cam.z};moved=true;}});
top_.addEventListener('pointermove',e=>{
 if(!ptrs.has(e.pointerId)){const r=top_.getBoundingClientRect();const h=hit(e.clientX-r.left,e.clientY-r.top);if(h!==U.hover){U.hover=h;top_.style.cursor=h?'pointer':'grab';}if(!h){const y=hitY(e.clientX-r.left,e.clientY-r.top);if(y){tipY(y,e);return;}}tip(h,e);return;}
 ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(pinch&&ptrs.size===2){const [a,b]=[...ptrs.values()];cam.z=pinch.z*Math.hypot(a.x-b.x,a.y-b.y)/pinch.d;clampCam();return;}
 if(drag){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>5)moved=true;if(moved){anim=null;cam.x=drag.cx-dx/cam.z;cam.y=drag.cy-dy/cam.z;clampCam();tip(null);}}});
const endPtr=e=>{const tap=ptrs.size===1&&!moved;ptrs.delete(e.pointerId);if(ptrs.size<2)pinch=null;if(!ptrs.size)drag=null;
 if(tap&&e.type==='pointerup'){const r=top_.getBoundingClientRect();onTap(e.clientX-r.left,e.clientY-r.top);}};
top_.addEventListener('pointerup',endPtr);top_.addEventListener('pointercancel',endPtr);
top_.addEventListener('pointerleave',()=>{U.hover=null;tip(null);});
top_.addEventListener('wheel',e=>{e.preventDefault();const r=top_.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top;const [wx,wy]=s2w(mx,my);
 cam.z*=Math.exp(-e.deltaY*.0015);clampCam();const [nx,ny]=s2w(mx,my);cam.x+=wx-nx;cam.y+=wy-ny;clampCam();anim=null;},{passive:false});
function hit(sx,sy){if(!S)return null;let best=null,bd=16*16;for(const C of G.CL){const [x,y]=w2s(C.x,C.y);const d=(x-sx)**2+(y-sy)**2;if(d<bd){bd=d;best=C.id;}}
 if(best)return best;const [wx,wy]=s2w(sx,sy);bctx.setTransform(1,0,0,1,0,0);for(const C of G.CL)if(bctx.isPointInPath(TERR[C.id],wx,wy))return C.id;return null;}
const tipEl=$('#tip');
function hitY(sx,sy){if(!S||cam.z<.6)return null;let best=null,bd=10*10;for(const y of (G.YOSHO||[])){const [x,yy]=w2s(y.x,y.y);const d=(x-sx)**2+(yy-sy)**2;if(d<bd){bd=d;best=y;}}return best;}
// 施設の詳しい様子
function tipY(y,e){if(!y||(e&&e.pointerType==='touch')||U.mode==='title'){tipEl.hidden=true;return;}const o=S.castles[y.at]&&S.castles[y.at].owner;const fx=G.YOSHO_FX[y.kind]||{n:y.kind,fx:''};const on=G.yActive(y);
 tipEl.innerHTML=`<div class="tph"><div><b><i class="yk">${esc(y.kind)}</i> ${esc(y.n)}</b><span>${esc(fx.n)} ・ ${esc(G.cname(y.at))}の領内 ・ ${o?esc(G.CNK(o)):'—'}</span></div></div>
  <span>${esc(y.desc||'')}</span><span class="tdl">効き目：${esc(fx.fx)}${on?'':'（いまは働いていない）'}</span>${y.y0?`<span class="tdl">${y.y0}年ごろから</span>`:''}${y.y1?`<span class="tdl">${y.y1}年まで</span>`:''}${o&&o!==S.player?`<span class="tdl">${esc(G.cname(y.at))}を押さえれば、${esc(G.CNK(S.player))}の力になる</span>`:''}`;
 tipEl.hidden=false;const r=top_.getBoundingClientRect();let x=e.clientX-r.left+16,yy=e.clientY-r.top+14;const w=tipEl.offsetWidth,h=tipEl.offsetHeight;if(x+w>VW-8)x=e.clientX-r.left-w-16;if(yy+h>VH-8)yy=VH-h-8;tipEl.style.left=x+'px';tipEl.style.top=yy+'px';}
function tip(id,e){if(!id||!S||(e&&e.pointerType==='touch')||U.mode==='title'||id===U.sel){tipEl.hidden=true;return;}const st=S.castles[id],k=st.owner;const gs=G.castleGens(id);
 // 城の詳しい様子：持ち主と当主、城主、兵・堅さ・石高・民忠、囲む軍勢、向かってくる軍勢
 const cl=S.clans[k];const L=cl&&G.gen(cl.leader);const lord=gs.slice().sort((a,b)=>(b.t+b.b)-(a.t+a.b))[0];const me=S.player;
 const rel=k===me?'自家':G.allied&&G.allied(me,k)?'同盟':S.war&&S.war[G.ekey(me,k)]!=null&&S.t-S.war[G.ekey(me,k)]<300?'交戦中':'友好 '+Math.round(G.rel(me,k));
 const sieg=S.units.filter(u=>u.state==='siege'&&u.path[u.path.length-1]===id);const inc=S.units.filter(u=>u.state==='march'&&u.path[u.path.length-1]===id&&u.clan!==k);
 const gn=u=>u.gens.map(g=>(G.gen(g)||{}).n).filter(Boolean)[0]||'';
 tipEl.innerHTML=`<div class="tph">${lord?faceHTML(lord.n,'sm',k):''}<div><b>${esc(G.cname(id))}${cl&&cl.cap===id?' <em class="tcap">本城</em>':''}</b><span>${esc(G.C[id].prov)}国 ・ ${G.CNK(k)}（${esc(rel)}）</span></div></div>
  <span>当主 ${esc(L?L.n:'—')}${lord&&(!L||lord.id!==L.id)?` ・ 城主 ${esc(lord.n)}`:''}</span>
  <dl class="tdl"><dt>兵</dt><dd>${fmt(st.troops)}</dd><dt>堅さ</dt><dd>${fmt(st.dur)}</dd><dt>石高</dt><dd>${Math.round(st.koku)}万石</dd><dt>民忠</dt><dd>${Math.round(st.loyal)}</dd></dl>
  ${gs.length>1?`<span>在城 ${gs.slice(0,4).map(g=>esc(g.n)).join('、')}${gs.length>4?' ほか'+(gs.length-4)+'人':''}</span>`:''}
  ${sieg.length?`<span class="tw">囲まれている：${sieg.map(u=>`${G.CN(u.clan)} ${man(u.troops)}${gn(u)?'（'+esc(gn(u))+'）':''}`).join('、')}</span>`:''}
  ${inc.length?`<span class="tw">向かってくる：${inc.map(u=>`${G.CN(u.clan)} ${man(u.troops)}`).join('、')}</span>`:''}`;
 tipEl.hidden=false;const r=top_.getBoundingClientRect();const tw=tipEl.offsetWidth||230,th=tipEl.offsetHeight||100;let x=e.clientX-r.left+14,y=e.clientY-r.top+14;const lim=side.hidden?VW:side.getBoundingClientRect().left-r.left;if(x+tw>lim-6)x=e.clientX-r.left-tw-14;tipEl.style.left=Math.max(6,x)+'px';tipEl.style.top=Math.max(6,Math.min(VH-th-6,y))+'px';}
function onTap(sx,sy){const id=hit(sx,sy);
 if(U.mode==='pick'){if(id){U.pickClan=S.castles[id].owner;renderPick();}return;}
 tapCastle(id);}
function tapCastle(id){tipEl.hidden=true;
 if(U.mode==='pick'){if(id){U.pickClan=S.castles[id].owner;renderPick();}return;}
 if(U.mode!=='game'||U.modal)return;
 if(U.picking&&id){const o=S.castles[id].owner;if(G.ADJ[U.picking].includes(id)&&o!==S.player&&!G.allied(S.player,o)){doAttack(U.picking,id);return;}U.picking=null;}
 U.sel=id||null;renderSide();U.baseDirty=true;
 if(id){const c=vc();const [x,y]=w2s(G.C[id].x,G.C[id].y);const l=c[0]-c[2]/2,r=c[0]+c[2]/2,t=c[1]-c[3]/2,b=c[1]+c[3]/2;
  if(x<l+30||x>r-30||y<t+30||y>b-30)anim={x:G.C[id].x,y:G.C[id].y,z:cam.z,t:0};}}


/* ===== 進行 ===== */
const SPEEDS=[0,1,2,4,8,16,32,64,128];
let last=performance.now(),camSig='',hold=0;
function loop(now){
 const dt=Math.min(.25,(now-last)/1000);last=now;tNow=now;
 if(anim){anim.t+=dt*2.4;const k=Math.min(1,anim.t),e=1-Math.pow(1-k,3);cam.x+=(anim.x-cam.x)*e;cam.y+=(anim.y-cam.y)*e;cam.z+=(anim.z-cam.z)*e;if(k>=1)anim=null;clampCam();}
 if(U.mode==='title'){cam.x+=Math.sin(now/7000)*.12;}
 if(U.mode==='game'&&S&&!S.over&&!U.modal){
  if(hold>0)hold-=dt;
  else if(U.speed>0){U.acc+=dt*SPEEDS[U.speed];let n=0;while(U.acc>=1&&n<140&&!U.modal&&hold<=0){snapUnits();G.day();U.acc--;n++;snapMaybe();if(S.over||S.unified)break;}if(n){tick();renderTL();}}
 }
 if(U.mode==='game'&&S&&(S.over||S.unified)&&!U.ended&&!U.modal){U.ended=true;setTimeout(()=>openModal('end'),900);}
 const sig=cam.x.toFixed(2)+cam.y.toFixed(2)+cam.z.toFixed(4)+VW+VH+(U.sel?1:0);if(sig!==camSig){camSig=sig;U.baseDirty=true;}
 if(U.baseDirty)drawBase();drawTop();
 requestAnimationFrame(loop);
}
let uiT=0,terrSig='';
function tick(){
 const sig=G.CL.map(c=>S.castles[c.id].owner).join(',')+'|'+G.alive().map(k=>S.clans[k].leader).join(',')+'|'+Object.keys(S.ally).filter(k=>S.ally[k]>0).join(',')+'|'+Object.keys(S.war||{}).filter(k=>S.t-S.war[k]<300).join(',');if(sig!==terrSig){terrSig=sig;U.baseDirty=true;if(U.dipView){U.blocs=null;setTimeout(renderLegend,0);}}
 const now=performance.now();if(now-uiT>300){uiT=now;renderTop();renderSide();renderNext();}
 if(S.prisonQ.length){S.prisonQ.length=0;G.prisoners(S.player).forEach(g=>G.release(g));}
 if(S.propQ.length&&!U.modal){openModal('prop');}
 if(S.battleQ&&S.battleQ.length&&!U.modal){const q=S.battleQ.shift();if(G.battleInfo(q.a,q.b))openModal('battle',{a:q.a,b:q.b});}
 if(S.sceneQ&&S.sceneQ.length&&!U.modal){const t=S.sceneQ.shift();if(TK.BATTLES&&TK.BATTLES[t]&&sceneWanted(TK.BATTLES[t]))openModal('scene',{title:t});}
 if(S.evQ&&S.evQ.length&&!U.modal){if(G.eventView())openModal('event');else S.evQ.shift();}
 if((S.over||S.unified)&&!U.ended){U.ended=true;setTimeout(()=>openModal('end'),900);}
 if(S.extinct===1&&!U.modal&&!U.ffwd){S.extinct=2;openModal('extinct');}
 if(G.date().d===1&&S.t-(U.lastSave||0)>=30){U.lastSave=S.t;autosave();}
}
function setSpeed(v){U.speed=v;if(v>0)U.lastSp=v;renderTop();renderTL&&renderTL();}


/* ===== 時の巻き戻し（動画のようなタイムライン） ===== */
const TL={snaps:[],marks:[],dragging:false,head:0};
function snapMaybe(force){if(!S)return;const d=G.date();
 // 戻った後に時が進んだら、その先の記録は新しい歴史で置き換える
 if(TL.snaps.length&&TL.snaps[TL.snaps.length-1].t>S.t){TL.snaps=TL.snaps.filter(x=>x.t<=S.t);TL.marks=TL.marks.filter(m=>m.t<=S.t);TL.lastMark=Math.min(TL.lastMark??-1,S.t);TL.head=S.t;}
 TL.head=Math.max(TL.head||0,S.t);
 if(!force&&d.d!==1)return;const last=TL.snaps[TL.snaps.length-1];if(last&&last.t>=S.t)return;
 try{TL.snaps.push({t:S.t,s:JSON.stringify(S)});}catch(e){return;}
 {const have=new Set(TL.marks.map(m=>m.t+'|'+m.n));for(const e of S.chron){if(e.t>=(TL.lastMark??-1)&&(e.big||/戦い|変|落城|征伐|開城|滅亡|上洛|統一/.test(e.title||''))&&e.title&&!have.has(e.t+'|'+e.title)){have.add(e.t+'|'+e.title);TL.marks.push({t:e.t,n:e.title,big:!!e.big,alt:!!e.alt});}}}
 TL.lastMark=S.chron.length?S.chron[0].t:TL.lastMark;
 const lim=S.t-720;TL.snaps=TL.snaps.filter(x=>x.t>=lim||G.date(x.t).m%3===1||x===TL.snaps[0]);if(TL.snaps.length>260)TL.snaps.splice(1,1);}
function tlReset(){TL.snaps=[];TL.marks=[];TL.lastMark=-1;TL.head=S?S.t:0;snapMaybe(true);renderTL();}
const tlEl=$('#tline');
// 時の帯は、動画のように最初から最後（元和偃武、1615年）まで全体を見せる
const TL_END={d:[1615,6,10]};
const TL_START={d:[1560,5,1]};
// どのシナリオでも、帯は1560年から1615年までの同じ長さ（始まりより前は、史実をたどって開ける）
function tlBase(){return TL.snaps.length?TL.snaps[0].t:S.t;}
function tlRange(){const t0=Math.min(G.evT(TL_START),tlBase());const t1=Math.max(S.t,TL.head||0,G.evT(TL_END),t0+30);return [t0,t1];}
// これから先の史実（章のしおり）
function tlFuture(){const out=[];const t0=S.t;const seen=new Set();for(const e of TK.HIST){if(e.k==='premarch'||seen.has(e.title))continue;if(e.title)seen.add(e.title);if(!e.title||!(e.big||/戦い|変|落城|征伐|陣|役|統一|幕府|偃武/.test(e.title)))continue;const t=G.evT(e);if(t<=Math.max(t0,TL.head||0))continue;out.push({t,n:e.title,b:!!e.big});}return out;}
// 先へ進める：分かれ道では史実を選び、領国の出来事は歴史を変えない方を選んで、早送りする
function tlForward(t){if(t<=S.t+1)return;const lim=Math.min(t,G.evT(TL_END));let n=0;const s0=performance.now();U.ffwd=1;try{
 while(S.t<lim&&!S.over&&!S.unified&&performance.now()-s0<9000){snapUnits&&0;G.day();n++;
  while(S.evQ&&S.evQ.length){const v=G.eventView();if(!v){S.evQ.shift();continue;}const h=v.opts.findIndex(o=>o.hist);const nd=v.opts.findIndex(o=>!/歴史が分かれる/.test(o.d||''));G.chooseEvent(h>=0?h:(nd>=0?nd:0));}
  if(S.battleQ&&S.battleQ.length){for(const q of S.battleQ){for(const id of [q.a,q.b]){const u=S.units.find(x=>x.id===id);if(u)u.bq=0;}}S.battleQ.length=0;}
  if(S.sceneQ)S.sceneQ.length=0;if(S.propQ)S.propQ.length=0;snapMaybe();}
 }finally{U.ffwd=0;}renderChron();
 terrSig='';U.baseDirty=true;renderAll();renderLegend();renderTL();toast(`${G.dstr()}まで進めた（分かれ道は史実を選んだ）`);if(S.extinct===1&&!U.modal){S.extinct=2;openModal('extinct');}}
function tlV(){return tlEl&&getComputedStyle(tlEl).flexDirection==='column';}
function renderTL(){if(!tlEl)return;if(!S||U.mode!=='game'){tlEl.hidden=true;return;}tlEl.hidden=false;
 const [t0,t1]=tlRange();const f=t=>((t-t0)/Math.max(1,t1-t0)*100).toFixed(2)+'%';const V=tlV();const P=V?'top':'left',Z=V?'height':'width';
 {const b0=Math.max(t0,tlBase());const pc=t=>(t-t0)/Math.max(1,t1-t0)*100;for(const [id,t] of [['#tlFill',S.t],['#tlHead',TL.head||S.t]]){const el=$(id);el.style.width=el.style.height=el.style.left=el.style.top='';el.style[P]=pc(b0).toFixed(2)+'%';el.style[Z]=Math.max(0,pc(t)-pc(b0)).toFixed(2)+'%';}}
 {const kn=$('#tlKnob');kn.style.left=kn.style.top='';kn.style[P]=f(S.t);}
 const d=G.date();$('#tlD').innerHTML=`<b>${G.eraK()}</b><small>${G.monK()}（${d.y}）</small>`;
 $('#tlPlay').textContent=U.speed?'❚❚':'▶';$('#tlPlay').setAttribute('aria-label',U.speed?'止める':'進める');
 {const b=$('#tlNow');b.hidden=false;const back=TL.head>S.t+20;b.title=back?'いちばん新しい時へ戻る':'次の大きな出来事まで進める';b.setAttribute('aria-label',b.title);}
 const sig=t0+'|'+t1+'|'+tlBase()+'|'+TL.marks.length+'|'+V+'|'+(TL.head||0);if(TL.sig!==sig){TL.sig=sig;
  const ya=G.date(t0).y,yb=G.date(t1).y;const step=yb-ya>20?5:yb-ya>8?2:1;let h='';for(let y=Math.ceil(ya/step)*step;y<=yb;y+=step){const tt=(y-S.y0)*360+(1-S.m0)*30;if(tt<t0||tt>t1)continue;h+=`<i class="ty" style="${P}:${f(tt)}">${y}</i>`;}
  {const b=tlBase();if(b>t0+20){h+=`<i class="tpre" style="left:0;width:${f(b)}" title="このシナリオより前（押すと史実をたどってその時から始められる）"></i>`;
   {const sn=new Set();for(const e of TK.HIST){if(e.k==='premarch'||!e.title||sn.has(e.title)||!(e.big||/戦い|変|落城|征伐|陣|役|統一/.test(e.title)))continue;sn.add(e.title);const t=G.evT(e);if(t<t0||t>=b)continue;h+=`<i class="tm past" style="left:${f(t)}" title="${esc(G.dstr(t)+' '+e.title)}"></i>`;}}}}
  for(const m of tlFuture()){if(m.t<t0||m.t>t1)continue;h+=`<i class="tm fut" style="${P}:${f(m.t)}" title="${esc(G.dstr(m.t)+' '+m.n+'（これから）')}"></i>`;}
  for(const m of TL.marks){if(m.t<t0||m.t>t1)continue; h+=`<i class="tm${m.big?' big':''}${m.alt?' alt':''}" style="${P}:${f(m.t)}" title="${esc(G.dstr(m.t)+' '+m.n)}"></i>`;}
  $('#tlMarks').innerHTML=h;}
}
function tlSeek(t){if(t<tlBase()-3){TL.past=Math.round(t);return;}TL.past=null;if(t>(TL.head||S.t)+2&&t>S.t+2){if(S.t<(TL.head||0)){/* 戻った所から先は、いったん今いちばん先へ */}tlForward(t);return;}let best=TL.snaps[0];for(const x of TL.snaps)if(x.t<=t)best=x;if(!best||best.t===S.t)return;
 if(best.past){const pl=TL.pl||S.player;const n=G.adoptPast(best.s,pl);if(!n){G.setS(S);toast('その頃、'+G.CNK(pl)+'はまだ表舞台にいない','bad');return;}S=n;}else S=JSON.parse(best.s);G.setS(S);U.sel=null;U.modal=null;$('#modal').hidden=true;terrSig='';U.baseDirty=true;U.ended=false;renderAll();renderLegend();renderTL();}
if(tlEl){const tr=$('#tlTrack');
 const frac=e=>{const r=tr.getBoundingClientRect();return tlV()?(e.clientY-r.top)/r.height:(e.clientX-r.left)/r.width;};
 const tAt=e=>{const [t0,t1]=tlRange();const x=Math.max(0,Math.min(1,frac(e)));return t0+x*(t1-t0);};
 tr.addEventListener('pointerdown',e=>{TL.dragging=true;tr.setPointerCapture(e.pointerId);if(U.speed)setSpeed(0);const t=tAt(e);if(t<=(TL.head||S.t))tlSeek(t);else TL.fwd=t;});
 tr.addEventListener('pointermove',e=>{const [t0,t1]=tlRange();const x=frac(e);const t=t0+x*(t1-t0);const tip=$('#tlTip');tip.hidden=false;tip.style.left=tip.style.top='';tip.style[tlV()?'top':'left']=Math.max(0,Math.min(100,x*100))+'%';
  let near=null,bd=1e9;for(const m of TL.marks.concat(tlFuture())){const d=Math.abs(m.t-t);if(d<bd){bd=d;near=m;}}tip.textContent=near&&bd<(t1-t0)*.015?G.dstr(near.t)+' '+near.n:G.dstr(Math.round(t));if(TL.dragging){const t=tAt(e);if(t<=(TL.head||S.t))tlSeek(t);else TL.fwd=t;}});
 tr.addEventListener('pointerleave',()=>{$('#tlTip').hidden=true;});
 tr.addEventListener('pointerup',()=>{if(!TL.dragging)return;TL.dragging=false;if(TL.past!=null){const t=TL.past;TL.past=null;TL.fwd=0;openModal('past',{t});return;}if(TL.fwd){const t=TL.fwd;TL.fwd=0;openModal('ffwd',{t:Math.round(t)});return;}if(TL.head>S.t+20)toast(`${G.dstr()}に戻った。時を進めると、ここから歴史をやり直せる`);});
 $('#tlBack').addEventListener('click',()=>{if(U.speed)setSpeed(0);const prev=TL.snaps.filter(x=>x.t<S.t).pop();if(prev)tlSeek(prev.t);});
 $('#tlPlay').addEventListener('click',()=>{ACT.playpause();renderTL();});
 $('#tlNow').addEventListener('click',()=>{if(U.speed)setSpeed(0);if(TL.head>S.t+20){const last=TL.snaps[TL.snaps.length-1];if(last)tlSeek(last.t);return;}const n=tlFuture().find(m=>m.b&&m.t>S.t+5)||tlFuture().find(m=>m.t>S.t+5);if(n)openModal('ffwd',{t:Math.max(S.t+1,n.t-1)});});}
/* ===== 上部の札 ===== */
// 押している最中の書き換えでクリックが消えないよう、変化があるときだけ、押していない時に書き換える
let pressLock=0;addEventListener('pointerdown',e=>{if(e.target.closest('#me,#drawer,#era,#chron,#pick'))pressLock=1;},true);addEventListener('pointerup',()=>{setTimeout(()=>{pressLock=0;if(pendingR){pendingR=0;if(U.mode==='game'){renderTop();renderSide();}}},60);},true);addEventListener('pointercancel',()=>{pressLock=0;},true);
let pendingR=0;window.__pl=()=>pressLock;function setHTML(el,html){if(pressLock){pendingR=1;return false;}if(el._h===html)return false;el._h=html;el.innerHTML=html;return true;}
function histRate(){const ok=S.hOk||0,ng=S.hNg||0;return ok+ng?Math.round(ok/(ok+ng)*100):100;}
function renderTop(){
 if(!S||U.mode!=='game')return;const d=G.date(),k=S.player;
 setHTML($('#eraTxt'),`<span class="e1">${G.eraK()}</span><span class="e2">${G.monK()}${G.dayK()}</span><span class="e3">西暦${G.dstrW()}</span>`);
 document.querySelectorAll('[data-act="speed"]').forEach(b=>{b.setAttribute('aria-pressed',String(+b.dataset.v===U.speed));b.classList.toggle('cur',!U.speed&&+b.dataset.v===(U.lastSp||1));});
 {const pp=$('#ppBtn');if(pp){pp.textContent=U.speed?'❚❚':'▶';pp.classList.toggle('on',!!U.speed);pp.setAttribute('aria-label',U.speed?'止める':'時を進める');}}
 const alive=S.clans[k]&&S.clans[k].alive,L=alive?G.gen(S.clans[k].leader):null;
 const meHTML=alive?`${L?faceHTML(L.n,'sm',k):''}<div><b>${G.CNK(k)}</b><small>城 ${G.clanCastles(k).length} ・ 兵 ${man(G.clanTroops(k))}</small></div>
  ${(()=>{const h=histRate();return `<button type="button" class="hstate ${h<100||S.div[k]?'chg':''}" data-act="open" data-m="histv" title="史実からどれだけ離れたか">${h>=100&&!G.alive().some(j=>S.div[j])?'史実どおり':'史実度 '+h+'%'}</button>`;})()}
  ${S.div[k]?`<button class="mini ${S.auto?'on':''}" data-act="auto" title="自家の戦も自動で行う">${S.auto?'采配を任せている':'自分で采配'}</button>`:''}`:(G.retainer()?(()=>{const R=G.retainer();return `${faceHTML(R.leader,'sm',R.parent)}<div><b>${esc(G.CN(k))}家</b><small>${esc(R.leader)}・${esc(G.CNK(R.parent))}の家臣</small></div><button class="mini on" data-act="jiritsu" title="主家から独り立ちする">自立を図る</button>`;})():`<div><b>観戦中</b><small>${G.CNK(k)}は滅んだ</small></div>`);
 setHTML($('#me'),meHTML+`<span class="tools"><button class="tbtn" type="button" data-act="dipview" aria-pressed="${U.dipView}">同盟図</button><button class="tbtn" type="button" data-act="open" data-m="dip">外交</button><button class="tbtn" type="button" data-act="open" data-m="menu">メニュー</button></span>`);
 if(!renderTop._l||renderTop._l!==innerWidth+'|'+$('#me').offsetHeight){renderTop._l=innerWidth+'|'+$('#me').offsetHeight;requestAnimationFrame(layoutHUD);}
}

/* ===== 年表 ===== */
const chronEl=$('#chron');
function chronItem(e){const who=e.who&&hasFace(e.who)?e.who:null;
 return `<div class="ci${e.ok?'':' off'}${e.big?' big':''}">${who?faceHTML(who,'sm'):'<span class="dot"></span>'}<div><time>${esc(e.s)}</time>${e.alt?'<em class="alt">もう一つの歴史</em>':''}${e.title?`<b>${esc(e.title)}</b>`:''}<p>${esc(e.text)}</p>${e.ok?'':'<em>歴史が変わり、起きなかった</em>'}</div></div>`;}
function renderChron(){if(!S)return;chronEl._h=null;chronEl.innerHTML=`<h3>年表</h3><div class="clist2">${S.chron.slice(0,14).map(chronItem).join('')||'<p class="hint">時が進むと、ここに出来事が記されていきます。</p>'}</div><div id="next"></div>`;renderNext();}
function renderNext(){const el=$('#next');if(!el||!S)return;const n=G.nextEvents(2);el.innerHTML=n.length?`<h4>この先の${S.div[S.player]?'歴史':'史実'}</h4>${n.map(e=>`<div class="nx${e.alt?' alt':''}"><time>${e.d[0]}年${e.d[1]}月</time>${esc(e.title)}</div>`).join('')}`:'';}
G.onChron=e=>{if(U.mode!=='game'||U.ffwd)return;renderChron();if(e.big&&e.ok)bigCard(e);};
// 大きな出来事の札：続けて起きた出来事（会津征伐と三成の挙兵など）は、前の札を下に小さく残して重ねる
const BIGS=[];
function bigCard(e){const el=$('#big');const now=performance.now();
 for(let i=BIGS.length-1;i>=0;i--)if(now-BIGS[i].t>9000)BIGS.splice(i,1);
 if(BIGS.some(b=>b.e.title===e.title))return;
 // 結びつきの深い出来事（史実の with）は、少し前のことでも下に添える
 {const H=TK.HIST.find(h=>h.title===e.title&&h.with);if(H)for(const w of H.with){if(BIGS.some(b=>b.e.title===w))continue;const c=S.chron.find(x=>x.title===w&&x.ok);if(c)BIGS.unshift({e:c,t:now});}}
 BIGS.unshift({e,t:now});if(BIGS.length>3)BIGS.length=3;
 const who=e.who&&hasFace(e.who)?e.who:null;
 const rest=BIGS.slice(1).map(b=>{const w=b.e.who&&hasFace(b.e.who)?b.e.who:null;return `<div class="bst">${w?faceHTML(w,'sm'):''}<div><small>${esc(b.e.s)}</small><b>${esc(b.e.title)}</b></div></div>`;}).join('');
 el.innerHTML=`<div class="bmain">${who?faceHTML(who,'xl'):''}<div><small>${esc(e.s)}</small><h2>${esc(e.title)}</h2><p>${esc(e.text)}</p></div></div>${rest?`<div class="bstk"><small class="bsh">相前後して</small>${rest}</div>`:''}`;
 el.hidden=false;el.classList.remove('out');void el.offsetWidth;el.classList.add('in');
 const life=3600+(BIGS.length-1)*1400;
 hold=U.speed?3.2+(BIGS.length-1)*1.2:0;clearTimeout(bigCard.t);bigCard.t=setTimeout(()=>{el.classList.add('out');setTimeout(()=>{el.hidden=true;BIGS.length=0;},500);},life);}
// 出陣の知らせ：画面の上に小さく出す（自家・味方・敵・大軍・史実の出陣）
const NEWS=[];
G.onSortie=(u,to)=>{if(U.ffwd||U.mode!=='game'||!S)return;const me=S.player,o=S.castles[to]&&S.castles[to].owner;
 const rel=u.clan===me||o===me||G.allied(me,u.clan)||(u.hist&&u.until)||u.troops>=20000;if(!rel)return;
 const L=u.gens.length?G.gen(u.gens[0]):null;const el=$('#news');if(!el)return;
 const d=document.createElement('div');d.className='nw'+(u.clan===me?' me':o===me&&u.mission==='attack'?' foe':'');
 const why=u.until&&typeof u.until==='string'&&!u.until.startsWith('#')?`（${u.until}）`:'';
 d.innerHTML=`<i style="background:${G.CC(u.clan)}"></i><span>出陣　${esc(G.CNK(u.clan))}　${L?esc(L.n)+'隊 ':''}${man(u.troops)} → ${esc(G.cname(to))}<small>${esc(why)}</small></span>`;
 el.prepend(d);NEWS.push(d);while(el.children.length>3)el.lastChild.remove();layoutHUD();
 setTimeout(()=>{d.classList.add('out');setTimeout(()=>{d.remove();layoutHUD();},600);},4800);};
// 画面の部品の置き場を、実際の大きさから決める（文字の大きさや幅で見切れないように）
function layoutHUD(){const era=$('#era'),me=$('#me'),ch=$('#chron'),nw=$('#news'),ts=$('#toast');if(!era||!me)return;
 const R=el=>el&&!el.hidden&&el.offsetParent!==null?el.getBoundingClientRect():null;const narrow=innerWidth<=820;
 const re=R(era);if(!re)return;
 if(narrow){me.style.top=Math.round(re.bottom+6)+'px';}else{me.style.top='';if(ch&&getComputedStyle(ch).top!=='auto')ch.style.top=Math.round(re.bottom+8)+'px';}
 const rm=R(me);const topBand=Math.max(re.bottom,rm?rm.bottom:0);
 if(nw){let L=re.right+12,Rt=rm&&!narrow?rm.left-12:innerWidth-12;
  if(!narrow&&Rt-L>=380){nw.style.top='14px';nw.style.left=L+'px';nw.style.width=(Rt-L)+'px';nw.style.transform='none';}
  else{nw.style.top=Math.round(topBand+8)+'px';nw.style.left='12px';nw.style.width=(innerWidth-24)+'px';nw.style.transform='none';}
  nw.style.bottom='auto';}
 if(ts){const rn=nw&&nw.children.length?nw.getBoundingClientRect():null;const base=Math.max(narrow?topBand:re.top,rn&&rn.height?rn.bottom:0);ts.style.top=Math.round(Math.max(narrow?topBand+8:92,base+8))+'px';ts.style.bottom='auto';}}
addEventListener('resize',()=>requestAnimationFrame(layoutHUD));
G.onDiverge=()=>{toast('歴史が動いた。ここからは史実どおりには進まない','bad');renderTop();};
G.onLost=(at,by)=>toast(`${G.cname(at)}が${G.CNK(by)}に落とされた`,'bad');
G.onAttacked=(u,to)=>toast(`${G.CNK(u.clan)} ${man(u.troops)} が${G.cname(to)}へ迫る`,'bad');
G.onDestroy=(k,by)=>{if(by===S.player&&S.div[S.player])toast(`${G.CNK(k)}を平定した`,'good');};
G.onSuccession=(k,old,nx)=>{if(k===S.player&&nx)toast(`${old.n}が没し、${nx.n}が家督を継いだ`);};
G.onBattle=()=>{};G.onMonth=()=>{};G.onLog=()=>{};G.onEvent=()=>{};
let toastT;function toast(t,kind){const el=$('#toast');el.textContent=t;el.className='show '+(kind||'');clearTimeout(toastT);toastT=setTimeout(()=>{el.className='';},2800);}

/* ===== 城の札（右） ===== */
const MODALS={};
const side=$('#drawer');
function jokakuInfo(id,mine){const p=S.plans&&S.plans[id],w=S.works&&S.works[id],o=S.cst&&S.cst[id];let line='',btn='';
 if(w){const r=Math.round(Math.max(0,Math.min(1,(S.t-w.start)/(w.end-w.start)))*100);line=`<p class="jline">普請中：<b>${esc(w.n)}</b> ${r}%（あと${Math.max(1,Math.round((w.end-S.t)/30))}か月）</p>`;}
 else if(p){const c=G.planCost(p);line=`<p class="jline">計画：<b>${esc(p.n)}</b> <small>${esc(p.from||'')}家の構想${p.until!=null?' ・ 期限あり':''}</small></p>`;
  if(mine)btn=`<button class="act" data-act="build" data-id="${id}" ${S.clans[S.player].gold<c.gold?'disabled':''}><b>築城</b><small>金${fmt(c.gold)} ・ ${Math.round(c.days/30)}か月</small></button>`;}
 else if(o&&o.burnt)line=`<p class="jline burnt">戦火で焼け落ち、堅さが落ちている</p>`;
 return {line,btn};}
function renderSide(){
 if(U.mode!=='game')return;
 document.body.classList.toggle('narrowSel',!!U.sel&&VW<1200&&VW>=820);document.body.classList.toggle('mobsel',!!U.sel&&VW<820);
 if(!U.sel){side.hidden=true;return;}side.hidden=false;
 const id=U.sel,C=G.C[id],c=S.castles[id],k=c.owner,cl=S.clans[k],me=S.player,mine=k===me,alive=S.clans[me]&&S.clans[me].alive;
 const gs=G.castleGens(id).sort((a,b)=>(G.isLeader(b)-G.isLeader(a))||(hasFace(b.n)-hasFace(a.n))||(b.t+b.b+b.c+b.s)-(a.t+a.b+a.c+a.s));
 const lord=gs[0];const bes=G.unitAt(id).filter(u=>u.clan!==k);
 let threat=0;for(const n of G.ADJ[id]){const o=S.castles[n].owner;if(o!==k&&!G.allied(k,o))threat+=S.castles[n].troops;}
 const rel=mine||!alive?'':G.allied(me,k)?'<span class="rtag ally">同盟</span>':G.atWar(me,k)?'<span class="rtag war">交戦中</span>':`<span class="rtag">友好 ${Math.round(G.rel(me,k))}</span>`;
 let acts='';const jok=jokakuInfo(id,mine);
 if(alive){
  if(mine){const p=G.polOf(id);
   acts=`<div class="pols" role="group" aria-label="城の方針">${Object.entries(G.POL).map(([key,v])=>`<button class="pol${p===key?' on':''}" data-act="pol" data-v="${key}" title="${esc(v.d)}">${v.n}</button>`).join('')}</div><p class="hint">${esc(G.POL[p].d)}</p>
   <div class="arow"><button class="act pri" data-act="pick-target" ${!G.ADJ[id].some(n=>{const o=S.castles[n].owner;return o!==me&&!G.allied(me,o);})||c.troops<1000?'disabled':''}><b>出陣</b><small>攻める城を地図で選ぶ</small></button>
   ${jok.btn}${lord&&!G.isLeader(lord)?`<button class="act" data-act="hobi" data-g="${lord.id}" ${S.clans[me].gold<200||lord.loyal>=100?'disabled':''}><b>褒美</b><small>金200 ・ 忠誠 ${Math.round(lord.loyal)}</small></button>`:''}</div>`;}
  else{const can=!G.allied(me,k)&&reachable(id).length,negok=!G.allied(me,k)&&cl.cap!==id;
   acts=`<div class="arow">${can?`<button class="act pri" data-act="attack" data-to="${id}"><b>攻める</b><small>兵と攻め方を選ぶ</small></button>`:''}
   ${negok?(()=>{const why=G.negaeriWhy(me,id),cost=G.negaeriCost(id),lord=G.negaeriLord(id);return `<button class="act" data-act="negaeri" data-to="${id}" ${why||S.clans[me].gold<cost?'disabled':''} title="${esc(why||'')}"><b>寝返り</b><small>${why?esc(why):`${esc(lord.n)}を誘う ・ 金${cost} ・ ${Math.round(G.negaeriChance(me,id)*100)}%`}</small></button>`;})():''}
   <button class="act" data-act="envoy" data-clan="${k}"><b>使者</b><small>${G.CNK(k)}と交渉</small></button></div>`;}
 }
 setHTML(side,`<button class="ic close" data-act="desel" aria-label="閉じる">×</button>
 <div class="ctop"><h2 class="cname">${esc(G.cname(id))}</h2><div class="crow"><span class="cplate" style="--c:${deep(k)}">${G.CNK(k)}${cl.cap===id?' ・ 本城':''}</span><small>${esc(C.prov)}国</small>${rel}</div></div>
 <div class="lord">${lord?faceHTML(lord.n,'lg',k):''}<div class="lordtx">${lord?`<b>${esc(lord.n)}</b><small>${G.isLeader(lord)?'当主':'城主'} ${G.age(lord)}歳 ・ 統${lord.t} 武${lord.b} 知${lord.c}</small>`:'<small>城代が守る</small>'}
  ${gs.length>1?`<div class="gfaces">${gs.slice(1,8).map(g=>`<span title="${esc(g.n)}">${faceHTML(g.n,'sm',k)}</span>`).join('')}${gs.length>8?`<em>+${gs.length-8}</em>`:''}</div>`:''}</div></div>
 ${bes.length?`<div class="alert">${bes.map(u=>`${G.CN(u.clan)}軍 ${man(u.troops)}（${(G.TACTICS[u.tac]||G.TACTICS.chikara).n}）`).join('、')}に囲まれている</div>`:''}
 <div class="nums"><div><span>兵</span><b>${man(c.troops)}</b></div><div><span>堅さ</span><b>${fmt(c.dur)}</b></div><div><span>石高</span><b>${c.koku}<i>万石</i></b></div><div class="${threat>c.troops?'warn':''}"><span>隣の敵兵</span><b>${man(threat)}</b></div></div>
 ${terrLine(id)}${yoshoLine(id)}${jok.line}${acts}`);
}
function renderAll(){renderTop();renderChron();renderSide();}
// 攻め先へ兵を出せる自城（2つ先まで、自領を通って行ける城）
// 同盟国の領内も、通行の許しが出れば通れる（3つ先まで）
function reachable(to){const me=S.player;return G.clanCastles(me).filter(m=>{if(S.castles[m].troops<1000||!G.idleGens(m).length)return false;if(G.ADJ[m].includes(to))return true;const p=G.findPath(m,to,me,'own')||G.findPath(m,to,me,'pass');return p&&p.length<=4;});}
function routeNote(m,to){if(G.ADJ[m].includes(to))return '隣接';const me=S.player;if(G.findPath(m,to,me,'own'))return '自領を通って';const p=G.findPath(m,to,me,'pass');if(!p)return '';const ks=[...new Set(p.slice(1,-1).map(id=>S.castles[id].owner).filter(o=>o!==me))];return ks.map(k=>G.CNK(k)).join('・')+'の領内を通って（通行の許し）';}

/* ===== 操作 ===== */
document.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b||b.disabled)return;const f=ACT[b.dataset.act];if(f)f(b,e);});
document.addEventListener('change',e=>{const b=e.target.closest('[data-src]');if(!b||!U.atk)return;if(b.checked)U.atk.src.add(b.dataset.src);else U.atk.src.delete(b.dataset.src);updAtk();});
const ACT={
 evpick:b=>{const m=G.chooseEvent(+b.dataset.i);closeModal();if(m)toast(m,'good');renderAll();U.baseDirty=true;},
 dipview:()=>{U.dipView=!U.dipView;document.body.classList.toggle('dipv',U.dipView);U.baseDirty=true;drawBase();renderTop();renderLegend();},
 build:b=>{const r=G.startWork(S.player,b.dataset.id);toast(r.msg,r.ok?'good':'bad');renderAll();},
 speed:b=>setSpeed(+b.dataset.v),
 playpause:()=>setSpeed(U.speed?0:(U.lastSp||1)),
 desel:()=>{U.sel=null;U.picking=null;renderSide();},
 auto:()=>{S.auto=!S.auto;renderTop();toast(S.auto?'自家の戦も自動で行います':'出陣はあなたが命じます');},
 hobi:b=>{const g=G.gen(+b.dataset.g);if(G.hobi2(g))toast(`${g.n}に褒美を与えた（忠誠 ${Math.round(g.loyal)}）`,'good');renderSide();},
 pol:b=>{S.castles[U.sel].pol=b.dataset.v;toast(`${G.cname(U.sel)}を「${G.POL[b.dataset.v].n}」に`,'good');renderSide();},
 'pick-target':()=>{U.picking=U.sel;toast('攻める城を地図で選んでください');},
 attack:b=>openAttack(b.dataset.to,b.dataset.from),
 negaeri:b=>{const r=G.negaeri(S.player,b.dataset.to);G.diverge(S.player,'neg');G.diverge(S.castles[b.dataset.to].owner);toast(r.msg,r.ok?'good':'bad');U.baseDirty=true;renderAll();},
 tac:b=>{U.atk.tac=b.dataset.v;renderModal();},
 'atk-go':()=>goAttack(),
 envoy:b=>openModal('envoy',{clan:b.dataset.clan}),
 close:()=>closeModal(),
 pastgo:b=>{const tgt=[+b.dataset.y,+b.dataset.m,+b.dataset.d];const pl=S.player;b.disabled=true;const pr=$('#pastProg');
  const step=()=>{const done=G.pastStep(tgt,720);const P=G._past;if(pr)pr.textContent=`史実をたどっています… ${P.done[0]}年`;if(!done){setTimeout(step,0);return;}
   const key=y=>y.y*400+y.m*32+y.d;const sn=P.snaps.filter(x=>key(x)<=key({y:tgt[0],m:tgt[1],d:tgt[2]}));let last={y:P.done[0],m:P.done[1],d:P.done[2],s:P.cur};if(key(last)>key({y:tgt[0],m:tgt[1],d:tgt[2]})&&sn.length)last=sn.pop();
   const n=G.adoptPast(last.s,pl);if(!n){b.disabled=false;if(pr)pr.textContent=`${tgt[0]}年には、${G.CNK(pl)}はまだ表舞台にいない。`;return;}
   S=n;G.setS(S);TL.pl=pl;TL.snaps=sn.map(x=>({t:G.evT({d:[x.y,x.m,x.d]}),s:x.s,past:1})).filter(x=>x.t<S.t);TL.snaps.push({t:S.t,s:JSON.stringify(S)});TL.marks=[];TL.lastMark=S.chron.length?S.chron[0].t:-1;TL.head=S.t;TL.sig='';
   closeModal();U.sel=null;terrSig='';U.baseDirty=true;U.ended=false;renderAll();renderLegend();renderTL();toast(`${G.dstr()}の天下を開いた。ここから先は${G.CNK(pl)}の采配しだい`);};
  setTimeout(step,20);},
 ffgo:b=>{const t=+b.dataset.t;closeModal();setTimeout(()=>tlForward(t),30);},
 mapstyle:()=>{U.mapStyle=U.mapStyle==='relief'?'flat':'relief';if(U.mapStyle==='relief')ensureLand();try{localStorage.setItem('tenka-mapstyle2',U.mapStyle);}catch(e){}U.baseDirty=true;drawBase();renderModal();},
 setting:b=>{const k=b.dataset.k;S.settings=S.settings||{};S.settings[k]=S.settings[k]===false;renderModal();},
 'prop':b=>{const p=S.propQ.shift();if(b.dataset.t==='yes'){S.ally[G.ekey(S.player,p.from)]=720;G.addRel(S.player,p.from,10);toast(`${G.CNK(p.from)}と同盟`,'good');}closeModal();},
 open:b=>openModal(b.dataset.m),
 save:b=>{doSave(+b.dataset.v);renderModal();toast('保存しました','good');},
 load:b=>{if(doLoad(+b.dataset.v)){closeModal();toast('読み込みました','good');}},
 'to-title':()=>{closeModal();showTitle();},
 'watch':()=>{closeModal();U.ended=true;},
 // 自家が史実どおり表舞台を去ったとき、別の家を継いで続ける
 adopt:b=>{const j=b.dataset.clan;if(!S.clans[j]||!S.clans[j].alive)return;S.player=j;S.extinct=0;U.sel=null;closeModal();terrSig='';U.baseDirty=true;renderAll();renderLegend&&renderLegend();const cap=S.clans[j].cap;if(cap)focus(cap,Math.max(cam.z,1));toast(`${G.CNK(j)}として続けます`,'good');},
 new:()=>showScen(),continue:()=>{if(doLoad('auto'))toast('続きから再開','good');},
 scen:b=>showPick(b.dataset.id),
 pick:b=>{U.pickClan=b.dataset.clan;renderPick();const pr=G.preList().find(x=>x.k===U.pickClan);if(pr){focus(pr.castles[0],Math.max(cam.z,.9));return;}const ids=G.clanCastles(U.pickClan);if(ids.length)focus(S.clans[U.pickClan].cap||ids[0],Math.max(cam.z,.9));},
 'back-scen':()=>showScen(),'back-title':()=>showTitle(),start:()=>startGame(),
 'help-title':()=>{$('#titleHelp').hidden=!$('#titleHelp').hidden;}
};
addEventListener('keydown',e=>{if(e.target.closest('input,textarea'))return;if(U.mode!=='game')return;
 if(e.code==='Space'){e.preventDefault();ACT.playpause();}if(U.mode==='game'&&!U.modal&&/^[1-8]$/.test(e.key))setSpeed(+e.key);if(e.key==='Escape'){if(U.modal&&U.modal!=='prop'&&U.modal!=='event'&&!(U.modal==='battle'&&!U.mdata.res))closeModal();else{U.sel=null;U.picking=null;renderSide();}}});
function doAttack(from,to){openAttack(to,from);}
function openAttack(to,from){const src=reachable(to);if(!src.length){toast('兵を出せる城がありません','bad');return;}
 const adj=src.filter(m=>G.ADJ[m].includes(to)&&S.castles[m].troops>=3000);U.atk={to,src:new Set(from?[from,...adj.filter(m=>m!==from)]:adj.length?adj:src.filter(m=>G.ADJ[m].includes(to))),all:src,tac:'chikara',pct:75};
 if(!U.atk.src.size)U.atk.src.add(src[0]);U.picking=null;openModal('attack');}
function atkForce(){const a=U.atk;let tr=0,gs=[];for(const m of a.src){tr+=Math.floor(S.castles[m].troops*a.pct/100/100)*100;gs.push(...G.idleGens(m));}gs.sort((x,y)=>(y.t+y.b)-(x.t+x.b));return {tr,gs};}
MODALS.attack=()=>{const a=U.atk,to=a.to,c=S.castles[to],o=c.owner;const L=G.castleGens(to).sort((x,y)=>G.isLeader(y)-G.isLeader(x)||y.t-x.t)[0];
 return `<header>${L?faceHTML(L.n,'lg',o):''}<div><small class="eyebrow">${G.CNK(o)} ・ ${esc(G.C[to].prov)}国</small><h2>${esc(G.cname(to))}を攻める</h2><small>守兵 ${fmt(c.troops)} ・ 城の堅さ ${fmt(c.dur)} ・ 民忠 ${Math.round(c.loyal)}</small></div><button class="ic" data-act="close" aria-label="閉じる">×</button></header>
 <div class="agrid"><div><h3>兵を出す城</h3><div class="srcs">${a.all.map(m=>`<label class="src"><input type="checkbox" data-src="${m}" ${a.src.has(m)?'checked':''}><span>${esc(G.cname(m))}<small>兵 ${fmt(S.castles[m].troops)} ・ ${esc(routeNote(m,to))}</small></span></label>`).join('')}</div>
 <h3>出す兵の割合</h3><div class="pcts">${[50,75,90].map(p=>`<button class="pol${a.pct===p?' on':''}" data-act="pct" data-v="${p}"><b>${p}%</b></button>`).join('')}</div>
</div><div><h3>攻め方</h3><div class="tacs">${Object.entries(G.TACTICS).map(([key,v])=>`<button class="act${a.tac===key?' on':''}" data-act="tac" data-v="${key}"><b>${v.n}</b><small>${esc(v.d)}</small></button>`).join('')}</div>
 </div></div><div class="est" id="est"></div>
 <footer><button class="btn" data-act="close">やめる</button><button class="btn pri" data-act="atk-go" id="atkGo">出陣する</button></footer>`;};
ACT.pct=b=>{U.atk.pct=+b.dataset.v;renderModal();};
function updAtk(){const el=$('#est');if(!el||!U.atk)return;const a=U.atk,{tr,gs}=atkForce();const lead=gs.slice(0,3);
 if(!tr||!lead.length){el.innerHTML='<p class="hint">兵を出す城を選んでください。</p>';$('#atkGo').disabled=true;return;}
 const o=S.castles[a.to].owner;let reinf=0;for(const n of G.ADJ[a.to])if(S.castles[n].owner===o)reinf+=S.castles[n].troops*.3;
 const ga={t:Math.max(...lead.map(g=>g.t)),b:Math.max(...lead.map(g=>g.b)),train:60,mor:75};
 const r=G.simSiege(tr,ga,a.to,0,a.tac),r2=G.simSiege(tr,ga,a.to,reinf,a.tac);
 const v=r.win&&r2.win?['高い','green']:r.win?['五分','gold']:['低い','red'];
 const food=Math.round(tr*.012*(Math.min(r.days||120,160)+20));
 el.innerHTML=`<div class="kv"><span>総勢</span><b>${fmt(tr)}</b><span>大将</span><b>${esc(lead[0].n)}</b><span>勝算</span><b class="${v[1]}">${v[0]}</b><span>落城まで</span><b>${r.win?'約'+r.days+'日':'—'}</b><span>予想損害</span><b>${fmt(r.loss)}</b><span>兵糧</span><b class="${S.clans[S.player].food<food?'red':''}">${fmt(food)}</b></div>
 ${a.tac==='hyoro'?`<p class="hint">半月ごとに城内の内応を誘う。見込み ${Math.round(G.choryakuChance(lead,a.to,tr)*50)}%/回</p>`:''}${reinf>0?`<p class="hint">近くの${G.CN(o)}方の城から援軍が来るおそれがあります（約${man(reinf)}）。</p>`:''}`;
 $('#atkGo').disabled=S.clans[S.player].food<food*.5;}
const _rm=renderModal;
function goAttack(){const a=U.atk,me=S.player;const {gs}=atkForce();let n=0,first=null;
 for(const m of a.src){const c=S.castles[m];const tr=Math.floor(c.troops*a.pct/100/100)*100;const lg=G.idleGens(m).sort((x,y)=>(y.t+y.b)-(x.t+x.b)).slice(0,2);if(tr<300||!lg.length)continue;
  const food=Math.min(S.clans[me].food,Math.round(tr*.012*150));const u=G.launch(me,m,a.to,lg.map(g=>g.id),tr,food,'attack',a.tac);if(u){n++;first=first||lg[0];}}
 closeModal();if(n){toast(`${first.n}ら${n}隊、${G.cname(a.to)}へ${G.TACTICS[a.tac].n}`,'good');U.sel=null;U.baseDirty=true;renderAll();if(!U.speed)setSpeed(U.lastSp||1);}}


function renderLegend(){const el=$('#legend');if(!el)return;
 if(U.dipView){const B=U.blocs||blocs();el.innerHTML=`<b class="lgt">同盟図</b>${B.list.slice().sort((x,y)=>y.includes(S.player)-x.includes(S.player)).slice(0,6).map(a=>`<span><i class="sw" style="background:${B.of[a[0]].col}"></i>${a.includes(S.player)?'<b>自家の同盟</b> ':''}${a.slice(0,4).map(k=>esc(G.CN(k))).join('・')}${a.length>4?' ほか':''}</span>`).join('')||'<span>同盟を結んだ家はない</span>'}<span><i class="sw" style="background:#d8d0bf"></i>同盟なし</span>`;}
 else el.innerHTML=`<span class="l1"><i></i>自家の境</span><span class="l6"><i></i>同盟国</span>${S&&S.vassal&&Object.keys(S.vassal).some(k=>S.clans[k]&&S.clans[k].alive&&lordOf(k))?'<span class="l7" title="主家の色で塗り、自家の色の縞を重ねる"><i></i>臣従する家</span>':''}<span class="l2"><i></i>同盟の境</span><span class="l3"><i></i>交戦中</span><span class="l4"><i></i>街道</span><span class="l5"><i></i>築城の計画</span>`;}
MODALS.event=()=>{const v=G.eventView();if(!v){setTimeout(closeModal,0);return '';}const d=G.date();const k=S.player;
 const who=v.who||(G.gen(S.clans[k].leader)||{}).n;
 return `<div class="evhead">${who?faceHTML(who,'xl',v.clan||k):''}<div><small class="eyebrow">${G.eraK()} ${G.monK()}（${d.y}年）${v.kind==='fork'?(v.opts.some(o=>o.hist)?' ・ 歴史の分かれ道':' ・ もう一つの歴史'):v.kind==='dyn'?' ・ 天下の動き':' ・ '+esc(G.CN(k))+'家の領国'}</small><h2>${esc(v.title)}</h2><p>${esc(v.text)}</p></div></div>
 <div class="evopts">${v.opts.map((o,i)=>`<button class="act${o.hist?' pri':''}" data-act="evpick" data-i="${i}"><b>${esc(o.t)}${v.kind==='fork'&&v.opts.some(x=>x.hist)?(o.hist?' <em class="tg h">史実</em>':' <em class="tg d">歴史が分かれる</em>'):(o.hist?' <em class="tg h">史実どおり</em>':/歴史が分かれる/.test(o.d||'')?' <em class="tg d">歴史が分かれる</em>':'')}</b><small>${esc((o.d||'').replace(/。?歴史が分かれる/,''))}</small></button>`).join('')}</div>`;};
MODALS.dip=()=>{const me=S.player;const ks=G.alive().filter(k=>k!==me);
 const near=new Set();for(const id of G.clanCastles(me))for(const n of G.ADJ[id])near.add(S.castles[n].owner);
 const st=k=>G.allied(me,k)?(S.ally[G.ekey(me,k)]>1e8?2:1):G.atWar(me,k)?-1:0;
 ks.sort((a,b)=>(Math.abs(st(b))>0)-(Math.abs(st(a))>0)||near.has(b)-near.has(a)||G.power(b)-G.power(a));
 const row=k=>{const L=G.gen(S.clans[k].leader),s=st(k),d=S.ally[G.ekey(me,k)]||0;
  const tag=s===2?'<span class="rtag ally">盟約</span>':s===1?`<span class="rtag ally">${d>=360?'同盟':'和睦'} 残り${d>=360?Math.round(d/360)+'年':Math.max(1,Math.round(d/30))+'か月'}</span>`:s<0?'<span class="rtag war">交戦中</span>':`<span class="rtag">友好 ${Math.round(G.rel(me,k))}</span>`;
  const allies=ks.filter(j=>j!==k&&G.allied(k,j)).slice(0,3).map(j=>G.CN(j));
  return `<div class="drow">${L?faceHTML(L.n,'sm',k):''}<div class="dtx"><b>${esc(G.CNK(k))}</b><small>${G.clanCastles(k).length}城 ・ 兵${man(G.clanTroops(k))}${near.has(k)?' ・ 隣国':''}${allies.length?' ・ 同盟：'+allies.join('、'):''}</small></div>${tag}<button class="mini" data-act="envoy" data-clan="${k}">使者</button></div>`;};
 return `<header><div><small class="eyebrow">${G.CNK(me)}</small><h2>外交</h2></div><button class="ic" data-act="close" aria-label="閉じる">×</button></header><div class="dlist">${ks.slice(0,40).map(row).join('')}</div>`;};
/* ===== 合戦（野戦の采配と、史実の合戦図） ===== */
let SCN=null;
// 合戦図を見せるか：「すべて」「自家に関わる戦だけ」（はじめの設定）「見せない」
function sceneMode(){const v=S.settings&&S.settings.scenes;return v===false?'off':v==='all'?'all':'mine';}
function sceneWanted(B){const m=sceneMode();if(m==='off')return false;if(m==='all')return true;const k=S.player;if(!S.clans[k]||!S.clans[k].alive)return true;
 const cl=new Set([B.sides.a.clan,B.sides.b.clan,...B.units.map(u=>u.clan)]);if(cl.has(k))return true;
 for(const j of cl){if(S.clans[j]&&(G.allied(k,j)||(S.vassal&&(S.vassal[k]===j||S.vassal[j]===k))))return true;}
 // 自家の領国のすぐ近くでの戦も見せる
 if(B.at&&S.castles[B.at]){if(S.castles[B.at].owner===k||G.ADJ[B.at].some(n=>S.castles[n].owner===k))return true;}return false;}
function stopScene(){if(SCN){SCN.destroy();SCN=null;}}
function sceneHTML(sc,sideTxt){
 return `<div class="bsc"><div class="bcv"><canvas id="bCv"></canvas></div>
  <div class="bnar" id="bNar"><p id="bNow">　</p></div>
  <div class="bctl"><button class="ic" data-act="b-play" id="bPlay" aria-label="再生">▶</button>
   <div class="bspd">${[1,2,4].map(v=>`<button class="mini" data-act="b-spd" data-v="${v}">×${v}</button>`).join('')}</div>
   <button class="mini" data-act="b-re">最初から</button><span class="sp"></span>${sideTxt||''}</div></div>`;}
function mountScene(sc,onEnd){stopScene();const cv=$('#bCv');if(!cv)return;
 const upd=()=>{const b=$('#bPlay');if(b&&SCN)b.textContent=SCN.playing?'❚❚':'▶';document.querySelectorAll('[data-act="b-spd"]').forEach(x=>x.classList.toggle('on',SCN&&+x.dataset.v===SCN.speed));};
 SCN=TKB.make(cv,sc,{color:G.CC,mine:true,dur:sc.dur||44,title:(U.modal==='scene'&&U.mdata&&U.mdata.title)||(U.mdata&&U.mdata.place?U.mdata.place+'の戦い':''),face:(n,r,col)=>portrait(n,r,true,col),
  onBeat:(b,all)=>{const el=$('#bNow');if(el)el.textContent=b?b.txt:'　';},onState:upd,onEnd:()=>{upd();onEnd&&onEnd();}});
 upd();setTimeout(()=>SCN&&SCN.play(),350);}
Object.assign(ACT,{
 'b-play':()=>SCN&&SCN.toggle(),
 'b-spd':b=>SCN&&SCN.setSpeed(+b.dataset.v),
 'b-re':()=>{if(SCN){SCN.seek(0);SCN.play();}},
 'b-close':()=>{if(U.modal==='battle'&&U.mdata.res==null)return;stopScene();closeModal();},
 'b-form':b=>{U.mdata.fa=b.dataset.v;renderModal();},
 'b-tac':b=>{U.mdata.ta=b.dataset.v;renderModal();},
 'b-auto':()=>{const d=U.mdata,I=G.battleInfo(d.a,d.b);if(!I)return;const r=I.b.troops/Math.max(1,I.a.troops);d.fa=r<.75?'kakuyoku':r>1.3?'gyorin':['kakuyoku','gyorin','hoshi'][Math.floor(Math.random()*3)];d.ta=I.ca>=I.cb+15||I.rough>.2?'kishu':r>2.5?'hiku':'shomen';renderModal();},
 'b-go':()=>goBattle(),
 'b-scenes':()=>{S.settings.scenes=false;renderModal();toast('史実の合戦図を出さない（メニューで戻せます）');},
 'scenemode':()=>{const m=sceneMode();S.settings.scenes=m==='mine'?'all':m==='all'?false:'mine';renderModal();},
 'b-field':()=>{S.settings.battleScene=S.settings.battleScene===false;renderModal();toast(S.settings.battleScene===false?'野戦は自動で戦います':'野戦の采配をあなたが取ります');},
});
MODALS.scene=d=>{const B=TK.BATTLES[d.title];if(!B)return '';const sd=B.sides;
 const side=s=>`<span class="bside" style="--c:${deep(s.clan)}"><i style="background:${G.CC(s.clan)}"></i>${esc(s.n)} ${esc(s.tr)}</span>`;
 return `<header><div><small class="eyebrow">合戦図 ・ ${esc(B.date)}</small><h2>${esc(d.title)}</h2><small class="hint">${esc(B.place)}</small></div><button class="ic" data-act="b-close" aria-label="閉じる">×</button></header>
 ${sceneHTML(B,side(sd.a)+side(sd.b))}${B.src?`<p class="bsrc">出典：${esc(B.src)}</p>`:''}<footer><button class="mini" data-act="b-scenes">今後は合戦図を出さない</button><span class="sp"></span><button class="btn pri" data-act="b-close">地図へ戻る</button></footer>`;};
function battlePlace(I){const a=I.a,id=a.path[Math.min(a.seg+1,a.path.length-1)]||a.path[a.path.length-1];return G.cname(id).replace(/城$|館$|御所$/,'')+'の辺り';}
MODALS.battle=d=>{ensureLand();const I=G.battleInfo(d.a,d.b);if(!I){setTimeout(()=>{closeModal();},0);return '';}
 const ga=G.gen(I.a.gens[0]),gb=G.gen(I.b.gens[0]);
 if(d.res){const r=d.res;const la=r.a0-I.a.troops,lb=r.b0-I.b.troops;
  const head={winA:'勝ち戦',winB:'負け戦',draw:'引き分け',retreatA:'兵を引いた',retreatB:'敵が退いた'}[r.end];
  const hint=r.end==='winA'?'敵は崩れて退いていく。':r.end==='winB'?'味方は崩れた。近くの城へ退く。':r.end==='draw'?'互いに陣を構え直し、なおも睨み合う。':'';
  d.reveal=()=>{const h=$('#bHead'),x=$('#bRes'),q=$('#bLoss');if(h)h.textContent=head;if(x)x.textContent=hint;if(q)q.hidden=false;};
  return `<header><div><small class="eyebrow">野戦 ・ ${esc(d.place)}</small><h2 id="bHead">${d.done?head:'合戦の最中'}</h2></div><button class="ic" data-act="b-close" aria-label="閉じる">×</button></header>
  ${sceneHTML(d.sc,`<span id="bLoss" ${d.done?'':'hidden'}><span class="bside"><i style="background:${G.CC(I.a.clan)}"></i>味方 −${man(la)}</span> <span class="bside"><i style="background:${G.CC(I.b.clan)}"></i>敵 −${man(lb)}</span></span>`)}
  <footer><span class="hint" id="bRes">${d.done?hint:''}</span><span class="sp"></span><button class="btn pri" data-act="b-close">地図へ戻る</button></footer>`;}
 const fa=d.fa||'kakuyoku',ta=d.ta||'shomen';
 const card=(u,g,s,mine)=>`<div class="bcard${mine?' me':''}">${g?faceHTML(g.n,'lg',u.clan):''}<div><b>${esc(G.CN(u.clan))}軍</b><small>${g?esc(g.n):''}${u.gens.length>1?` ほか${u.gens.length-1}将`:''}</small><div class="bnum"><span>兵 <b>${man(u.troops)}</b></span><span>士気 <b>${Math.round(u.morale)}</b></span><span>統 ${s.t} ・ 武 ${s.b}</span><span>${G.ARMS[G.armOf(u)].n}</span></div></div></div>`;
 const terr=[I.rain?'雨':'晴れ',I.river?'川を挟む':'',I.rough>.15?'山がちで険しい':I.rough>.06?'起伏がある':'平地'].filter(Boolean).join(' ・ ');
 return `<header><div><small class="eyebrow">野戦 ・ ${esc(battlePlace(I))}</small><h2>敵の軍勢とぶつかる</h2><small class="hint">${terr}　奇襲は知略と地形・天気しだい（雨や険しい地は当たりやすい）</small></div></header>
 <div class="bvs">${card(I.a,ga,I.sa,1)}<b class="vs">対</b>${card(I.b,gb,I.sb,0)}</div>
 <h3>陣形</h3><div class="bopts">${Object.entries(G.FORMS).map(([k,f])=>`<button class="act${k===fa?' pri':''}" data-act="b-form" data-v="${k}"><b>${f.n}</b><small>${esc(f.d)}</small></button>`).join('')}</div>
 <p class="hint">鶴翼は魚鱗に、魚鱗は鋒矢に、鋒矢は鶴翼に強い。方円は損害を抑える。</p>
 <h3>采配</h3><div class="bopts b3">${Object.entries(G.SAKU).map(([k,f])=>`<button class="act${k===ta?' pri':''}" data-act="b-tac" data-v="${k}"><b>${f.n}</b><small>${esc(f.d)}${k==='kishu'?` ・ 知 ${I.ca} 対 ${I.cb}`:''}</small></button>`).join('')}</div>
 <footer><button class="mini" data-act="b-field">${S.settings.battleScene===false?'野戦の采配を取る':'今後は野戦を自動にする'}</button><span class="sp"></span><button class="btn" data-act="b-auto">おまかせ</button><button class="btn pri" data-act="b-go">合戦を始める</button></footer>`;};
function goBattle(){const d=U.mdata;const I=G.battleInfo(d.a,d.b);if(!I){closeModal();return;}
 const fa=d.fa||'kakuyoku',ta=d.ta||'shomen';const place=battlePlace(I);
 const nm=u=>u.gens.map(id=>(G.gen(id)||{}).n).filter(Boolean);
 const res=G.resolveBattle(d.a,d.b,fa,ta);if(!res){closeModal();return;}
 G.diverge(S.player,'battle');
 const FB=G.FORMS;const fb=res.fb;const fbt=FB[fa].beats===fb?'陣形の相性はこちらに分がある。':FB[fb].beats===fa?'陣形の相性は敵に分がある。':'';
 ensureLand();const T=battleTerrain(I);
 d.res=res;d.place=place;d.sc=TKB.gen(res,{bg:T.bg,feats:T.feats,a:{clan:I.a.clan,gens:nm(I.a),arm:G.armOf(I.a),n:G.CN(I.a.clan)+'軍'},b:{clan:I.b.clan,gens:nm(I.b),arm:G.armOf(I.b),n:G.CN(I.b.clan)+'軍'},seed:d.a*31+d.b*7+S.t,place,formBeat:fbt});
 d.sc.dur=26;stopScene();renderModal();U.baseDirty=true;}
// 合戦の場の、実際の地図（海・陸・地形・川・街道・城）を合戦図に敷く
let LAND3=null;
function battleTerrain(I){if(!LAND3)LAND3=P2(GEO.land,3);const LAND=LAND3;const pa=unitXY(I.a),pb=unitXY(I.b);const cx=(pa[0]+pb[0])/2,cy=(pa[1]+pb[1])/2,R=17,AR=.62;const x0=cx-R,y0=cy-R*AR,w=2*R,h=2*R*AR;
 const L=(x,y)=>[(x-x0)/w,(y-y0)/h],inside=(x,y)=>x>x0-4&&x<x0+w+4&&y>y0-4&&y<y0+h+4;
 const cv=document.createElement('canvas');cv.width=760;cv.height=Math.round(760*AR);const k=cv.width/w;const c=cv.getContext('2d');c.setTransform(k,0,0,k,-x0*k,-y0*k);
 {const pt=c.createPattern(TKB.seaTile,'repeat');pt.setTransform(new DOMMatrix([1/k,0,0,1/k,0,0]));c.fillStyle=pt;c.fillRect(x0,y0,w,h);}c.save();c.strokeStyle='rgba(222,206,160,.95)';c.lineWidth=9/k;c.lineJoin='round';c.stroke(LAND);c.restore();c.fillStyle='#efe5cb';c.fill(LAND);
 if(landReady){c.save();c.clip(LAND);c.globalAlpha=.85;c.drawImage(landImg,0,0,GEO.W,GEO.H);if(korImg.complete&&korImg.naturalWidth){c.save();c.clip(KORCLIP());c.beginPath();c.rect(-1300,KOR_TOP,1800,2000);c.clip();c.drawImage(korImg,...KOR_RECT);const g=c.createLinearGradient(0,KOR_TOP,0,KOR_TOP+34);g.addColorStop(0,'rgba(232,224,200,1)');g.addColorStop(1,'rgba(232,224,200,0)');c.fillStyle=g;c.fillRect(-1300,KOR_TOP,1800,34);c.restore();}hokFeather(c);korFeather(c);c.restore();c.save();c.globalCompositeOperation='multiply';c.fillStyle='rgba(239,225,190,.55)';c.fill(LAND);c.restore();}
 c.fillStyle='#94b6d2';c.fill(LAKES);c.strokeStyle='rgba(60,80,105,.6)';c.lineWidth=1/k;c.stroke(LAKES);c.strokeStyle='rgba(60,80,105,.75)';c.lineWidth=1.3/k;c.stroke(LAND);
 const feats=[];
 for(const l of GEO.rivers){const pts=[];for(let i=0;i<l.length;i+=2){if(inside(l[i],l[i+1]))pts.push(L(l[i],l[i+1]));else if(pts.length>1){feats.push({k:'river',w:1.2,pts:pts.splice(0)});}else pts.length=0;}if(pts.length>1)feats.push({k:'river',w:1.2,pts});}
 for(const r of G.ROADS){let pts=[];for(const q of r.pts){if(inside(q[0],q[1]))pts.push(L(q[0],q[1]));else if(pts.length>1){feats.push({k:'road',pts,n:r.name});pts=[];}else pts=[];}if(pts.length>1)feats.push({k:'road',pts,n:r.name});}
 for(const C of G.CL){if(!inside(C.x,C.y))continue;const q=L(C.x,C.y);if(q[0]<.03||q[0]>.97||q[1]<.05||q[1]>.95)continue;feats.push({k:'castle',x:q[0],y:q[1],n:G.cname(C.id)});}
 for(const y of (G.YOSHO||[])){if(!inside(y.x,y.y))continue;const q=L(y.x,y.y);feats.push({k:'village',x:q[0],y:q[1],n:y.n});}
 return {bg:cv,feats};}
/* ===== モーダル ===== */
const modal=$('#modal');
function openModal(name,data){U.modal=name;U.mdata=data||{};if(U.mode==='game'&&S){uiT=performance.now();renderTop();renderSide();}renderModal();modal.hidden=false;}
function closeModal(){stopScene();if(U.chatCtl){U.chatCtl.abort();U.chatCtl=null;}U.modal=null;modal.hidden=true;modal.innerHTML='';renderAll();}
function renderModal(){const f=MODALS[U.modal];if(!f)return;modal.innerHTML=`<div class="mbox ${U.modal}" role="dialog" aria-modal="true">${f(U.mdata)}</div>`;const log=$('#chatLog');if(log)log.scrollTop=log.scrollHeight;const ci=$('#chatIn');if(ci&&!U.mdata.busy)ci.focus();if(U.modal==='attack')updAtk();if(U.modal==='scene'&&!SCN){const B=TK.BATTLES[U.mdata.title];const md=U.mdata;if(B)mountScene(B,()=>autoBack(md));}else if(U.modal==='battle'&&U.mdata.res&&!SCN){const d=U.mdata;mountScene(d.sc,()=>{d.done=true;d.reveal&&d.reveal();autoBack(d,3800);});}}
// 合戦図が終わったら、少し余韻をおいて地図へ戻る（その間に操作したら戻らない）
function autoBack(md,ms){const t0=performance.now();let touched=false;const mark=()=>{touched=true;};modal.addEventListener('pointerdown',mark,{once:true});
 setTimeout(()=>{modal.removeEventListener('pointerdown',mark);if(touched||U.mdata!==md||!(U.modal==='scene'||U.modal==='battle'))return;stopScene();closeModal();},ms||2600);}

MODALS.envoy=d=>{const j=d.clan,k=S.player;const L=G.gen(S.clans[j].leader);const al=G.allied(k,j),war=!al&&G.atWar(k,j);const ad=S.ally[G.ekey(k,j)]||0;
 const vas=S.vassal&&(S.vassal[j]===k?'sub':S.vassal[k]===j?'lord':null);const strong=G.power(k)>=G.power(j);
 // 友好（贈り物）／横の関係（今の間柄で一つ）／上下の関係（国力で一つ）の三つに分ける
 const side=vas?`<button class="act" disabled><b>${vas==='sub'?'従属させている':'従属している'}</b><small>上下の関係が結ばれている</small></button>`
  :al?`<button class="act" data-act="dipl" data-t="break"><b>手切れ</b><small>${ad>1e8?'盟約':ad>=360?'同盟':'和睦'}を破る（諸家の信用が落ちる）</small></button>`
  :war?`<button class="act" data-act="dipl" data-t="truce"><b>和睦</b><small>戦をやめ、半年攻め合わない ・ 見込み ${Math.round(G.truceChance(k,j)*100)}%</small></button>`
  :`<button class="act" data-act="dipl" data-t="ally"><b>同盟</b><small>2年、共に戦う ・ 見込み ${Math.round(G.allyChance(k,j)*100)}%</small></button>`;
 const vc=G.vassalChance(k,j);
 const up=vas?'':strong?`<button class="act" data-act="dipl" data-t="vassal" ${vc<=0?'disabled':''}><b>臣従を求める</b><small>${vc>0?'見込み '+Math.round(vc*100)+'%':'国力が2.5倍以上で友好25以上'}</small></button>`
  :`<button class="act" data-act="dipl" data-t="submit"><b>臣従を申し出る</b><small>${G.CNK(j)}に従い、家を保つ（攻められなくなる）</small></button>`;
 const opts=`<div class="dopts"><button class="act" data-act="dipl" data-t="gift" ${S.clans[k].gold<300?'disabled':''}><b>贈り物</b><small>金300 ・ 友好を上げる</small></button>${side}${up}</div>`;
 return `<header>${L?faceHTML(L.n,'lg',j):''}<div><small class="eyebrow">${G.CNK(j)} 当主</small><h2>${esc(L?L.n:'')}</h2><small>${G.clanCastles(j).length}城 ・ 兵${man(G.clanTroops(j))} ・ ${vas?(vas==='sub'?'従属':'主家'):al?'同盟中':war?'交戦中':'友好 '+Math.round(G.rel(k,j))}</small></div><button class="ic" data-act="close" aria-label="閉じる">×</button></header>
 ${opts}${d.msg?`<p class="note">${esc(d.msg)}</p>`:''}`;};
ACT.dipl=b=>{const j=U.mdata.clan,k=S.player,t=b.dataset.t;let r;
 if(t==='ally')r=G.proposeAlly(k,j);else if(t==='truce')r=G.truce(k,j);else if(t==='gift')r=G.shinzen(k,j);else if(t==='vassal')r=G.demandVassal(k,j);else if(t==='submit')r=G.submitTo(k,j);else{G.breakAlly(k,j);r={ok:true,msg:`${G.CNK(j)}と手切れ`};}
 if(r.ok){G.diverge(k,'diplo');G.diverge(j);}U.mdata.msg=r.msg;if(!S.clans[j].alive){closeModal();toast(r.msg,'good');return;}renderModal();renderTop();U.baseDirty=true;};
MODALS.prop=()=>{const p=S.propQ[0];if(!p){setTimeout(closeModal,0);return '';}const L=G.gen(S.clans[p.from].leader);
 return `<header>${L?faceHTML(L.n,'lg',p.from):''}<div><small class="eyebrow">${G.CNK(p.from)}より</small><h2>同盟の申し入れ</h2></div></header><p>${G.CNK(p.from)}から、2年間の同盟を結びたいとの使者が来ました。</p><footer><button class="btn" data-act="prop" data-t="no">断る</button><button class="btn pri" data-act="prop" data-t="yes">同盟を結ぶ</button></footer>`;};
MODALS.extinct=()=>{const k=S.player,d=G.date();const L=Object.keys(S.clans).filter(j=>S.clans[j].alive&&j!==k).sort((a,b)=>G.power(b)-G.power(a)).slice(0,6);
 return `<div class="evt"><small>${G.eraK()} ${G.monK()}（${d.y}年）</small><h2>表舞台を去る</h2><p>${esc(G.CNK(k))}は、史実どおり大名としての力を失った。このまま天下の行く末を見守るか、いま残っている家を継いで続けることができます。</p></div>
 <h3>家を継いで続ける</h3><div class="acts" style="flex-wrap:wrap">${L.map(j=>{const g=G.gen(S.clans[j].leader);return `<button class="act" style="flex:1 1 30%" data-act="adopt" data-clan="${j}"><b>${esc(G.CNK(j))}</b><small>${g?esc(g.n)+' ・ ':''}${G.clanCastles(j).length}城</small></button>`;}).join('')}</div>
 <footer><button class="btn pri" data-act="close">このまま見守る</button></footer>`;};
MODALS.end=()=>{const k=S.player,alive=S.clans[k]&&S.clans[k].alive;const d=G.date();
 let title,text;if(S.unified){const u=S.unified;title='天下統一';text=u===k?`${G.CNK(k)}が日の本を一つにまとめた。`:`${G.CNK(u)}が天下を統一した。${alive?`${G.CNK(k)}は${G.clanCastles(k).length}城を保ち、大名として生き残った。`:`${G.CNK(k)}はすでに滅んでいた。`}`;}
 else if(S.over==='win'){title='天下統一';text=`${G.CNK(k)}が日の本を一つにまとめた。`;}else{title='御家滅亡';text=`${G.CNK(k)}は最後の城を失った。`;}
 return `<div class="evt"><small>${G.eraK()} ${G.monK()}（${d.y}年）</small><h2>${title}</h2><p>${esc(text)}</p><p class="hint">${S.div[k]?'あなたの采配で歴史は変わった。':'あなたは歴史に手を加えなかった。'}</p></div><footer><button class="btn" data-act="watch">地図を眺める</button><button class="btn pri" data-act="to-title">タイトルへ</button></footer>`;};
MODALS.past=d=>{const D=G.date(d.t);const k=S.player;const pv=TK.HIST.filter(e=>e.title&&e.big&&G.evT(e)<=d.t).slice(-5);
 return `<header><div><small class="eyebrow">時の帯 ・ このシナリオより前</small><h2>${D.y}年${D.m}月から始める</h2></div><button class="ic" data-act="close" aria-label="閉じる">×</button></header>
 <p>1560年から史実どおりに歴史をたどり、${D.y}年${D.m}月の天下を開きます。${esc(G.CNK(k))}の立場はそのままです（その頃に${esc(G.CNK(k))}がなければ開けません）。いまの進み具合は、この帯から消えます。</p>
 ${pv.length?`<h3>それまでの主な出来事</h3><div class="hlist">${pv.map(m=>`<div><b>${esc(m.title)}</b><small>${m.d[0]}年${m.d[1]}月</small></div>`).join('')}</div>`:''}
 <p class="hint" id="pastProg"></p>
 <footer><button class="btn" data-act="close">やめる</button><button class="btn pri" data-act="pastgo" data-y="${D.y}" data-m="${D.m}" data-d="${D.d}">史実をたどって開く</button></footer>`;};
MODALS.ffwd=d=>{const all=tlFuture().filter(m=>m.t<=d.t);
 // 長く飛ぶときは、大きな出来事を優先して6つまで（時の順に）
 const pick=(arr,n)=>{if(arr.length<=n)return arr.slice();if(n<=0)return [];if(n===1)return [arr[arr.length>>1]];const o=[];for(let i=0;i<n;i++)o.push(arr[Math.round(i*(arr.length-1)/(n-1))]);return o;};
 let nx=all;if(all.length>6){const KEY=/桶狭間|川中島|姉川|三方ヶ原|長篠|本能寺|山崎|賤ヶ岳|小牧|九州平定|小田原|文禄|慶長の役|関ヶ原|大坂/;
  const key=all.filter(m=>KEY.test(m.n)),big=all.filter(m=>m.b&&!KEY.test(m.n)),rest=all.filter(m=>!m.b&&!KEY.test(m.n));
  nx=pick(key,6);if(nx.length<6)nx=nx.concat(pick(big,6-nx.length));if(nx.length<6)nx=nx.concat(pick(rest,6-nx.length));nx.sort((a,b)=>a.t-b.t);}
 const more=all.length-nx.length;return `<header><div><small class="eyebrow">時の帯</small><h2>${esc(G.dstr(d.t))}まで進める</h2></div><button class="ic" data-act="close" aria-label="閉じる">×</button></header>
 <p>途中の分かれ道では史実の道を選び、領国の出来事は歴史を変えない方を選んで早送りします。</p>${nx.length?`<h3>途中で起こる主な出来事</h3><div class="hlist">${nx.map(m=>`<div><b>${esc(m.n)}</b><small>${esc(G.dstr(m.t))}</small></div>`).join('')}</div>${more>0?`<p class="hint">ほか ${more} 件</p>`:''}`:''}
 <footer><button class="btn" data-act="close">やめる</button><button class="btn pri" data-act="ffgo" data-t="${d.t}">早送りする</button></footer>`;};
MODALS.histv=()=>{const h=histRate();const dv=G.alive().filter(j=>S.div[j]);const F=S.hFail||[];
 return `<header><div><small class="eyebrow">史実との違い</small><h2>史実度 ${h}%</h2></div><button class="ic" data-act="close" aria-label="閉じる">×</button></header>
 <div class="hmeter"><i style="width:${h}%"></i></div><p class="hint">これまでに来た史実の出来事 ${(S.hOk||0)+(S.hNg||0)} のうち、史実どおりに起きたのは ${S.hOk||0}。</p>
 <h3>筋書きを離れて動いている家</h3>${dv.length?`<p>${dv.map(j=>esc(G.CNK(j))).join('、')}</p><p class="hint">これらの家は史実の筋書きではなく、自らの判断で動きます。</p>`:'<p class="hint">すべての家が史実の筋書きどおりに動いています。</p>'}
 <h3>起きなかった史実</h3>${F.length?`<div class="hlist">${F.slice(0,20).map(x=>`<div><b>${esc(x.title)}</b><small>${esc(x.s)}　${esc(x.text)}</small></div>`).join('')}</div>`:'<p class="hint">まだない。</p>'}
 ${S.arcs&&S.arcs.length?`<h3>分かれた流れ</h3><p class="hint">分かれ道で史実と違う道を選んだため、その前提の上に起こるはずだった史実は起こりません。</p>`:''}`;};
MODALS.menu=()=>{const slots=[1,2,3].map(n=>{const m=readMeta(n);return `<div class="slot"><span><b>枠${n}</b><small>${m?esc(m):'空き'}</small></span><button class="mini" data-act="save" data-v="${n}">保存</button><button class="mini" data-act="load" data-v="${n}" ${m?'':'disabled'}>読込</button></div>`;}).join('');
 const st=S.settings||{};const tg=(k,on,t,d)=>`<div class="tgl"><span><b>${t}</b><small>${d}</small></span><button class="mini ${on?'on':''}" data-act="setting" data-k="${k}">${on?'する':'しない'}</button></div>`;
 return `<header><h2>メニュー</h2><button class="ic" data-act="close" aria-label="閉じる">×</button></header>
 <div class="mtop"><button class="btn" data-act="close">続ける</button><button class="btn" data-act="to-title">タイトルへ戻る</button></div>
 <h3>設定</h3><div class="tgl"><span><b>地図の描き方</b><small>白地図（すっきり）か、地形図（山の陰影つき）か</small></span><button class="mini on" data-act="mapstyle">${U.mapStyle==='relief'?'地形図':'白地図'}</button></div><div class="tgl"><span><b>史実の合戦図</b><small>桶狭間・本能寺・関ヶ原などを陣立図で見せる</small></span><button class="mini on" data-act="scenemode">${({mine:'自家に関わる戦',all:'すべて',off:'見せない'})[sceneMode()]}</button></div>${tg('battleScene',st.battleScene!==false,'野戦の采配','自家の軍勢が敵とぶつかった時に陣形と采配を選ぶ')}${tg('relief',st.relief!==false,'後詰め','自家の城が囲まれた時、隣の城から援軍を送る')}
 <h3>保存</h3><p class="hint">毎月自動で保存されます（このブラウザ内）。</p>${slots}
 <details class="mfold"><summary>遊び方</summary>${HELP}</details><details class="mfold"><summary>この作品について</summary>${ABOUT}</details>`;};
const ABOUT=`<h3>この作品について</h3><div class="help">
 <p><b>史実の扱い</b>　出来事の日付や城の持ち主は、通説をもとに置いています。年代や人物の比定には諸説あるものも含みます。分かれ道の先の「もう一つの歴史」と、領国の出来事の多くは創作です。</p>
 <p><b>地図</b>　国土地理院の「地球地図日本」「標高タイル」「明治期の低湿地」を加工して作成しました。明治期の低湿地と手作業の補いで、後の埋め立てや干拓の前の海岸に近づけています。戦国期の正確な海岸線ではありません。国境は今の市町村境をもとに、令制国の範囲へまとめたものです。</p>
 <p><b>肖像</b>　Wikimedia Commons にある肖像画を切り抜いて使っています。肖像の多くは、壮年から晩年に描かれた像か、亡くなった後に描かれた像です。六角義賢・山県昌景・太田資正・大友義統・前田玄以・山本勘助・北条氏照・武田信繁などは、江戸後期〜明治の浮世絵・肖像集に描かれた後世の想像図です。徳川家康の若い頃は「三方ヶ原戦役画像（しかみ像）」を使っていますが、江戸初期の作とされ、若い家康を写したものではありません。</p>
 <p><b>肖像の権利表示</b>　次の人物の肖像は、表示が必要なライセンスの画像の可能性があり、出典を照合中です（公開までに差し替えか表示を確定します）：北条氏照（CC BY 4.0、緑亭川柳 編・葛飾北斎ほか 画）、島津義久（CC BY-SA 3.0、Ginger1192）、足利義栄（CC BY 3.0）。武田信繁は歌川国芳の浮世絵（パブリックドメイン）に差し替え、最上義光は肖像を外しました。いずれも Wikimedia Commons より。</p>
 <p><b>書体</b>　しっぽり明朝 B1、Zen 角ゴシック New（SIL Open Font License 1.1）。</p>
 <p><b>AIの使用</b>　このゲームの制作には AI（Anthropic の Claude）を使いました。ゲームの中では AI を使っていません。遊んだ内容が外へ送られることはありません。肖像や地図は AI で作った画像ではありません。</p>
 <p><b>保存</b>　保存はこのブラウザの中だけに残ります。</p></div>`;
const HELP=`<div class="help"><p><b>見ているだけで史実どおり</b>　始めたときは時が止まっています。左上の ▶ で時間を進めると（×1は1秒で1日、×128まで速められます。数字キー1〜8でも切り替え）、桶狭間から天下統一まで、大名と武将が史実の日付どおりに動きます。合戦の地には印が残ります。</p>
 <p><b>城を育てる</b>　自分の城を選び、人手を注ぐ先（農業＝石高と民忠／商業＝金／軍備＝兵と練度／普請＝城の堅さ）を一つ選ぶと、毎月その方向に自動で育ちます。戦火で焼けた城は、時が経つと少しずつ再建されます。</p>
 <p><b>城の移り変わり</b>　安土城・大坂城・長浜城など、史実の築城や焼失、移転も日付どおりに起こり、古い城は城跡として地図に残ります。歴史が変わって築かれなかった城や、計画だけで終わった城は「計画」として残り、その地を持つ大名が築城できます。</p>
 <p><b>攻める・守る</b>　敵の城を選んで「攻める」。隣り合う味方の城からも兵が集まり（外すこともできます）、力攻めか包囲かを選べます。包囲は兵糧を断ちながら城内の内応も誘います。城が囲まれると、隣の味方の城から自動で後詰めの援軍が向かいます。城主の忠誠が低い城は、その城主を「寝返り」に誘えます。本城や一門、忠義に厚い城主は動かず、金は城の大きさに応じてかかり、同じ城へは半年おけません。寝返っても兵の半ばは城を去ります。</p>
 <p><b>分かれ道と出来事</b>　桶狭間・本能寺など史実の分かれ道に立つと、当主として道を選べます。「史実」を選べば筋書きどおり、他を選べば歴史が分かれます。分かれた後は、その選択から生まれる「もう一つの歴史」の出来事や次の分かれ道が続きます。抜きん出た家への包囲網、京の掌握、家臣の謀反など、天下の動きに応じた出来事も起こります。領国でも豊作・一揆・南蛮商人などの出来事が起こり、対処を選びます。</p>
 <p><b>交渉と同盟</b>　使者は「贈り物（友好）」「今の間柄に応じた一手（同盟・和睦・手切れ）」「上下の関係（臣従を求める・臣従を申し出る）」の三つから選びます。右上の「外交」で各家との関係を一覧し、使者を送れます。「同盟図」を押すと、同盟で結ばれた家々が同じ色で塗り分けられます。普段の地図でも、自家の同盟国は緑の斜線で示されます。城を選ぶと、その家の同盟先（緑の破線）と交戦相手（赤線）が結ばれます。</p>
 <p><b>時の帯</b>　年表の右（スマホでは右端）の縦の帯は、始まりから元和偃武（1615年）までの全体です。上ほど昔で、色の濃い所が通ってきた時、淡い印はこれから起こる史実です。つまんで上へ動かすと過去の天下に戻ってやり直せ、下の未来を押すと、分かれ道で史実を選びながらその日まで早送りできます。</p>
 <p><b>天下統一の先</b>　秀吉の天下統一（1590年）の後も歴史は続きます。朝鮮半島への出兵（文禄・慶長の役）、関ヶ原の戦い、江戸幕府、大坂の陣を経て、豊臣家が滅ぶ元和偃武（1615年）で終わります。</p>
 <p><b>地形</b>　城は国土地理院の標高から、山城（守り×1.35）・平山城（×1.15）・平城に分かれ、攻め手の損害と城の落ちにくさが変わります。大きな川を渡る道は行軍が遅れ、川を背にした城攻めは難しくなります。山がちな道も遅く、野戦では開けた地で騎馬が、雨では鉄砲が鈍ります。</p>
 <p><b>史実度</b>　右上の札は、これまでの史実の出来事のうち、どれだけが史実どおりに起きたかを示します。押すと、起きなかった史実と、筋書きを離れた家が分かります。</p>
 <p><b>合戦</b>　自家の軍勢が野で敵とぶつかると、陣形（鶴翼・魚鱗・鋒矢・方円）と采配（正面・奇襲・退く）を選び、合戦図で戦の行方を見届けます。桶狭間・川中島・長篠は史実の陣立てを合戦図で再現します（メニューで切り替え）。</p>
 <p><b>軍勢の駒</b>　軍勢は兵棋の駒で表します。記号は兵の主力で、✕が足軽、斜線が騎馬（武田・南部）、✕に点が鉄砲（雑賀・島津、長篠前後からの織田・徳川など）、旗が一向門徒、舟が海を渡る水軍です。</p>
 <p><b>当時の地図</b>　江戸の日比谷入江、大坂の海岸と河内湖、尾張の海、児島湾、有明海、香取海、巨椋池、八郎潟など、後の埋め立てや干拓で陸になった所は当時の海や湖に戻しています。</p>
 <p><b>街道と要所</b>　東海道・東山道・北陸道など、戦国期の主な往還を引いています。軍勢は街道があれば街道をたどって進み、そのぶん早く着きます。街道の辻にある要所（◆）を持つと効き目があります。宿は味方の行軍を速めて兵糧を節し、関と橋は敵の行軍を遅らせ、湊は船を速めて商いを生みます。城を選ぶと、その領内の要所が分かります。</p>
 <p><b>歴史が分かれる</b>　攻めたり交渉したり築城したりすると、その相手は史実の筋書きを離れ、自分で考えて動き出します。</p></div>`;

/* ===== 保存 ===== */
const SAVE_KEY2='tenka-haichizu-v7-';
function doSave(n){try{const d=G.date();localStorage.setItem(SAVE_KEY2+n,JSON.stringify(S));localStorage.setItem(SAVE_KEY2+n+'-meta',`${G.eraK()}${G.monK()}（${d.y}） ${G.CNK(S.player)}`);}catch(e){}}
function autosave(){if(!S.over&&!S.unified)doSave('auto');}
function readMeta(n){try{return localStorage.getItem(SAVE_KEY2+n+'-meta');}catch(e){return null;}}
// 保存データは書き換えられうるので、読み込む前に形を確かめ、文字列から記号を除く（画面に差し込まれても動かないように）
function cleanSave(o){if(!o||typeof o!=='object'||typeof o.t!=='number'||!o.castles||!o.clans||!Array.isArray(o.gens)||!Array.isArray(o.units)||!o.player)return null;
 if(!TK.SCEN[o.sc]&&!TK.SCEN[o.scen])return null;let n=0;
 const walk=v=>{if(++n>3e6)throw new Error('too big');if(typeof v==='string')return v.replace(/[<>&"'`\u0000-\u001f]/g,'').slice(0,600);if(Array.isArray(v)){for(let i=0;i<v.length;i++)v[i]=walk(v[i]);return v;}
  if(v&&typeof v==='object'){for(const k of Object.keys(v)){if(k==='__proto__'||k==='constructor'||k==='prototype'){delete v[k];continue;}v[k]=walk(v[k]);}return v;}
  return typeof v==='number'&&!isFinite(v)?0:v;};
 return walk(o);}
function doLoad(n){try{const s=localStorage.getItem(SAVE_KEY2+n);if(!s)return false;if(s.length>2e7)throw new Error('size');const o=cleanSave(JSON.parse(s));if(!o)throw new Error('shape');S=o;G.setS(S);G.fixHist();U.sel=null;enterGame();return true;}catch(e){toast('読み込めませんでした（保存データが壊れているか、古い形式です）','bad');return false;}}

/* ===== タイトルと大名選び ===== */
const title=$('#title');
function showTitle(){U.mode='title';U.sel=null;U.ended=false;$('#app').dataset.mode='title';side.hidden=true;
 G.newGame('s1560','oda');S=G.S();S.player='__none';resize();fitAll();cam.z*=1.12;U.baseDirty=true;
 const meta=readMeta('auto');title.hidden=false;
 title.innerHTML=`<div class="tbox"><div class="tt"><span class="tsub">見ているだけで史実が動く</span><h1>国絵図</h1><p><span class="ph">その年、誰が、どの城にいたのか。</span><br><span class="ph">手を加えなければ史実どおりに、</span><span class="ph">手を加えれば、あなたの歴史に。</span></p></div>
 <div class="tbtns"><button class="btn pri big" data-act="new">はじめる</button>${meta?`<button class="btn big" data-act="continue"><b>続きから</b><small>${esc(meta)}</small></button>`:''}<button class="btn big ghost" data-act="help-title">遊び方</button></div>
 <div class="help" id="titleHelp" hidden>${HELP}</div></div>`;}
function showScen(){title.hidden=false;
 title.innerHTML=`<div class="tbox wide"><h2 class="th">配置図を選ぶ</h2><div class="scens">${Object.values(TK.SCEN).sort((a,b)=>a.year*12+a.month-b.year*12-b.month).map(sc=>`<button class="scard" data-act="scen" data-id="${sc.id}"><span class="sy">${sc.era}（${sc.year}）</span><span class="sn"><b>${sc.title}</b></span><span class="sl">${esc(sc.lead)}</span></button>`).join('')}</div>
 <div class="tbtns"><button class="btn" data-act="back-title">戻る</button></div></div>`;}
function showPick(sid){U.pickScen=sid;U.mode='pick';$('#app').dataset.mode='pick';title.hidden=true;
 const sc=TK.SCEN[sid];G.newGame(sid,sc.owners?Object.keys(sc.owners)[0]:'oda');S=G.S();S.player='__none';resize();fitAll();
 // 配置図を変えたら、その時代の主役の家を初めに選んでおく
 const DEF={s1585:'hashiba',s1592:'hashiba',s1600:'tokugawa'};const al=k=>k&&S.clans[k]&&S.clans[k].alive;
 U.pickClan=[DEF[sid],'oda','hashiba'].find(al)||Object.keys(S.clans).filter(al).sort((a,b)=>G.power(b)-G.power(a))[0];renderPick();}
function renderPick(){
 const sc=TK.SCEN[U.pickScen],list=Object.keys(S.clans).filter(j=>S.clans[j].alive).sort((a,b)=>G.power(b)-G.power(a));
 const PRE=G.preList();const pre=PRE.find(x=>x.k===U.pickClan);if(!pre&&!(S.clans[U.pickClan]&&S.clans[U.pickClan].alive))U.pickClan=list[0];
 const k=U.pickClan;const L=pre?(G.genByName(pre.leader)||{n:pre.leader}):G.gen(S.clans[k].leader);
 const preCard=x=>{const LL=G.genByName(x.leader);return `<button class="pc${x.k===k?' on':''}" data-act="pick" data-clan="${x.k}">${faceHTML(x.leader,'sm',x.k)}<span>${G.CN(x.k)}<small>${esc(x.leader)}・${esc(G.CNK(x.parent))}に従う（${x.d[0]}年に自立）</small></span></button>`;};
 const top=list.slice(0,VW<820?12:15);
 $('#pick').hidden=false;
 $('#pick').innerHTML=`<div class="phead"><small class="eyebrow">${sc.era}（${sc.year}）</small><h2>${esc(sc.title)}</h2></div>
 <div class="pcur">${L?faceHTML(L.n,'xl',k):''}<div><small class="eyebrow">${G.CNK(k)} 当主</small><h2>${esc(L?L.n:'')}</h2><small>${pre?`いまは${G.CNK(pre.parent)}の下で${pre.castles.length}城を預かる ・ ${pre.d[0]}年${pre.d[1]}月に自立${pre.title?'（'+esc(pre.title)+'）':''}`:`${G.clanCastles(k).length}城 ・ ${Math.round(G.clanKoku(k))}万石`}</small></div></div>
 <button class="btn pri big wide" data-act="start">${G.CNK(k)}で見守る</button>
 <p class="hint">地図の城をタップしても大名家を選べます。</p>${PRE.length?`<h4 class="ph4">主家に従う家（のちに自立する家）</h4><p class="hint">城を持たない家臣として始まります。史実の時が来ると「自立の時」を選べ、それより前でも「自立を図る」で独り立ちを試みられます。</p><div class="pgrid">${PRE.map(preCard).join('')}</div>`:''}
 <div class="pgrid">${top.map(j=>{const LL=G.gen(S.clans[j].leader);return `<button class="pc${j===k?' on':''}" data-act="pick" data-clan="${j}">${LL?faceHTML(LL.n,'sm',j):''}<span>${G.CN(j)}<small>${esc(LL?LL.n:'')}</small></span></button>`;}).join('')}</div>
 <details><summary>ほかの大名家（${list.length-top.length}）</summary><div class="pgrid">${list.slice(VW<820?12:15).map(j=>`<button class="pc${j===k?' on':''}" data-act="pick" data-clan="${j}"><span class="crest" style="--c:${G.CC(j)}"></span><span>${G.CN(j)}</span></button>`).join('')}</div></details>
 <div class="tbtns"><button class="btn" data-act="back-scen">戻る</button></div>`;}
function startGame(){G.newGame(U.pickScen,U.pickClan);S=G.S();S.hsig=G.histSig();S.chats={};U.sel=null;U.ended=false;enterGame();
 const R0=G.retainer();const cap=R0?((G.genByName(R0.leader)||{}).loc||R0.castles[0]):S.clans[S.player].cap;focus(cap,VW<820?1.1:1.3);if(R0)setTimeout(()=>toast(`${R0.leader}は${G.CNK(R0.parent)}の家臣として始まります。右上の「自立を図る」か、史実の時に自立を選べます`),2600);setSpeed(0);setTimeout(()=>toast('時は止まっています。左上の ▶ で時間が進みます'),900);}
function enterGame(){U.mode='game';U.acc=0;$('#app').dataset.mode='game';title.hidden=true;$('#pick').hidden=true;terrSig='';U.dipView=false;document.body.classList.remove('dipv');renderLegend();S.chats=S.chats||{};
 G.setS(S);resize();U.speed=0;renderAll();tlReset();}

/* ===== 起動 ===== */
resize();
const hot=window.claude&&window.claude.hot;
function start(data){if(data&&data.S){S=data.S;G.setS(S);enterGame();}else showTitle();}
if(hot&&hot.snapshot)hot.snapshot(()=>({S:U.mode==='game'?S:null}));
// ほかの部品（史料集・AIの分かれ道）から使う入口
U.api={MODALS,ACT,esc,toast:(...a)=>toast(...a),renderModal:()=>renderModal(),closeModal:()=>closeModal(),renderAll:()=>renderAll()};
requestAnimationFrame(loop);
if(hot&&hot.ready)hot.ready(start);else start(hot&&hot.data||{});
})();
