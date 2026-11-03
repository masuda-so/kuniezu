"use strict";
// 拡大の上限：ラスター地図の1画素（100m）が画面の1画素より粗く見えない倍率（docs/architecture/raster-map.md）。
const MAXZ=5.5;
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
// 外部書体はゲーム開始を待たせない。到着後に地図の文字幅と狭幅の帯を更新する。
let fontRevision=0;
// 書体の読込完了ごとに下層を作り直すと重い。読込が落ち着いてから一度だけ反映する。
let fontTimer=0;document.fonts?.addEventListener('loadingdone',()=>{clearTimeout(fontTimer);fontTimer=setTimeout(()=>{fontRevision++;U.baseDirty=true;if(S&&U.mode==='game')renderAll();},400);});
G.build();G.buildBattleCatalog();

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
const ensureLand=()=>{};
// 角を落とす（チャイキン法）。今の市町村境を元にした境のギザギザを和らげる。開いた線は端を動かさない
function chaikin(a,closed,it){for(let k=0;k<it;k++){const n=a.length/2;if(n<3)return a;const o=[];if(!closed){o.push(a[0],a[1]);}
  // 削る量は辺の4分の1、ただし最大1.5単位（約800m）。長い直線の辺（データの切り口など）の大きな角を三角形に削らない。
  const m=closed?n:n-1;for(let i=0;i<m;i++){const j=(i+1)%n;const x0=a[i*2],y0=a[i*2+1],x1=a[j*2],y1=a[j*2+1],len=Math.hypot(x1-x0,y1-y0),f=len>6?1.5/len:.25;o.push(x0+(x1-x0)*f,y0+(y1-y0)*f,x1+(x0-x1)*f,y1+(y0-y1)*f);}
  if(!closed){o.splice(2,2);o.splice(o.length-2,2);o.push(a[a.length-2],a[a.length-1]);}a=o;}return a;}
const P2=(arr,it)=>{const p=new Path2D();for(const poly of arr)for(let ring of poly){if(it)ring=chaikin(ring,true,it);p.moveTo(ring[0],ring[1]);for(let i=2;i<ring.length;i+=2)p.lineTo(ring[i],ring[i+1]);p.closePath();}return p;};
const L2=(arr,it)=>{const p=new Path2D();for(let l of arr){if(it)l=chaikin(l,false,it);p.moveTo(l[0],l[1]);for(let i=2;i<l.length;i+=2)p.lineTo(l[i],l[i+1]);}return p;};
const TERR={};for(const id in GEO.terr)TERR[id]=P2(GEO.terr[id],2);
if(GEO.japanLand)TKTerrain.setCoverage('gsi',GEO.japanLand);
const JAPAN=GEO.japanLand?P2(GEO.japanLand,1):null;
// 間引かない陸地の輪郭は最大縮尺（8倍）でだけ使うので、起動時には作らず初めて要る時に作る。
let LANDFULL=null;function fullLand(){if(!LANDFULL){LANDFULL=P2(GEO.japanLand||GEO.land,1);if(GEO.japanLand)LANDFULL.addPath(P2(GEO.land.slice(GEO.japanLand.length),1));COAST.set(LANDFULL,coastPath(GEO.land));}return LANDFULL;}
// 陸地の輪郭は約15万点あり、描画のたびのクリップ・縁取りが重い。縮尺ごとに画面で0.35px未満の折れを間引いた輪郭を使う（当たり判定は元の LAND）。
function simplifyRing(r,tol){const n=r.length/2;if(n<8)return r;const keep=new Uint8Array(n);keep[0]=keep[n-1]=1;const st=[[0,n-1]];const t2=tol*tol;
 while(st.length){const [a,b]=st.pop();const ax=r[a*2],ay=r[a*2+1],bx=r[b*2],by=r[b*2+1],dx=bx-ax,dy=by-ay,L=dx*dx+dy*dy||1e-12;let mi=-1,md=t2;
  for(let i=a+1;i<b;i++){const px=r[i*2]-ax,py=r[i*2+1]-ay;let d;const t=(px*dx+py*dy)/L;if(t<=0)d=px*px+py*py;else if(t>=1){const qx=r[i*2]-bx,qy=r[i*2+1]-by;d=qx*qx+qy*qy;}else{const cx=px-t*dx,cy=py-t*dy;d=cx*cx+cy*cy;}if(d>md){md=d;mi=i;}}
  if(mi>0){keep[mi]=1;st.push([a,mi],[mi,b]);}}
 const o=[];for(let i=0;i<n;i++)if(keep[i])o.push(r[i*2],r[i*2+1]);return o;}
const landLOD=new Map();
function landFor(z){const lv=Math.max(-3,Math.min(3,Math.floor(Math.log2(Math.max(.01,z)))));if(lv>=3)return fullLand();let p=landLOD.get(lv);if(p)return p;
 const tol=.35/2**lv,min=tol*1.5,simp=arr=>arr.map(poly=>poly.map(ring=>{let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;for(let i=0;i<ring.length;i+=2){x0=Math.min(x0,ring[i]);x1=Math.max(x1,ring[i]);y0=Math.min(y0,ring[i+1]);y1=Math.max(y1,ring[i+1]);}return x1-x0<min&&y1-y0<min?null:simplifyRing(ring,tol);}).filter(Boolean)).filter(poly=>poly.length);
 p=P2(simp(GEO.japanLand||GEO.land),1);if(GEO.japanLand)p.addPath(P2(simp(GEO.land.slice(GEO.japanLand.length)),1));
 COAST.set(p,coastPath(simp(GEO.land)));landLOD.set(lv,p);return p;}
// 海岸の縁取り：陸地の輪郭のうち、データの切り口（TKGEO.landCuts の直線上の辺）を引かない。切り口は本来の海岸ではない。
const COAST=new WeakMap();
function coastPath(arr){const cut=GEO.landCuts||{x:[],y:[]},onX=v=>cut.x.some(c=>Math.abs(v-c)<.02),onY=v=>cut.y.some(c=>Math.abs(v-c)<.02),p=new Path2D();
 for(const poly of arr)for(let ring of poly){ring=chaikin(ring,true,1);const n=ring.length/2;let pen=false;
  for(let i=0;i<n;i++){const a=i*2,b=((i+1)%n)*2,x0=ring[a],y0=ring[a+1],x1=ring[b],y1=ring[b+1];
   const skip=(Math.abs(y0-y1)<1e-6&&onY(y0))||(Math.abs(x0-x1)<1e-6&&onX(x0));if(skip){pen=false;continue;}if(!pen){p.moveTo(x0,y0);pen=true;}p.lineTo(x1,y1);}}
 return p;}
let LANDV=null;
(window.requestIdleCallback||(f=>setTimeout(f,200)))(function warm(dl){for(const lv of [-3,-2,-1,0,1,2,3]){if(!landLOD.has(lv)||!roadLOD.has(lv)){landFor(2**lv);roadsFor(2**lv);if(dl?.timeRemaining&&dl.timeRemaining()<5){(window.requestIdleCallback||(f=>setTimeout(f,200)))(warm);return;}}}});
const LAKES=P2(GEO.lakes,1),RIVERS=L2(GEO.rivers.filter(r=>!TK.KOREAN_RIVERS_DETAIL?.length||!r.every((v,i)=>i%2?GEO.LAT0-v/GEO.K>34.8:v/GEO.K/GEO.CX+GEO.LON0>124&&v/GEO.K/GEO.CX+GEO.LON0<131)),1),PBORD=L2(GEO.pborders,2);
const EDGE=GEO.edges.map(([a,b,ls])=>({a,b,p:L2(ls,2)}));
const REGIONAL_RIVERS=TK.regionalRiverRecords(TK.REGIONAL_RIVERS||[],TK.KOREAN_RIVERS_DETAIL||[],G.PJ);
const regionalDetailRows=new Set(REGIONAL_RIVERS.flatMap(r=>r.detailRows));
// 地域に関係なく、投影済み河川へ同じ可視判定・丸め・線幅を使う。
const riverLines=[...(TK.JAPAN_RIVERS_OSM?.rivers||[]).map(r=>r.points.map(p=>G.PJ(...p))),...GEO.rivers.filter(r=>!r.every((v,i)=>i%2?GEO.LAT0-v/GEO.K>34.8:v/GEO.K/GEO.CX+GEO.LON0>124&&v/GEO.K/GEO.CX+GEO.LON0<131)).map(r=>Array.from({length:r.length/2},(_,i)=>[r[i*2],r[i*2+1]])),...(TK.KOREAN_RIVERS_DETAIL||[]).filter(r=>!regionalDetailRows.has(r)).map(r=>r.points.map(p=>G.PJ(...p)))].map(TK.riverGeometry);
const riverPathCache=new WeakMap();
function riverView(){const a=s2w(0,0),b=s2w(VW,VH);return [a[0],a[1],b[0],b[1]];}
function riverPath(r,z){let cached=riverPathCache.get(r);if(!cached||cached.z!==z){const path=new Path2D();TK.riverPath(path,r.points,2/z);cached={z,path};riverPathCache.set(r,cached);}return cached.path;}
function drawMapRivers(c,z){const view=riverView();c.save();c.clip(LANDV);c.strokeStyle='rgba(95,135,175,.75)';c.lineWidth=1.1/z;c.lineCap='round';c.lineJoin='round';for(const r of riverLines)if(TK.riverVisible(r,view,z))c.stroke(riverPath(r,z));c.restore();}
function drawRegionalRivers(c,z){const view=riverView();c.save();c.clip(LANDV);c.lineCap='round';c.lineJoin='round';for(const r of REGIONAL_RIVERS){let visible=false;for(const line of r.geometries){if(!TK.riverVisible(line,view,z))continue;visible=true;const path=riverPath(line,z);if(r.border){c.setLineDash([5/z,4/z]);c.strokeStyle='rgba(96,67,48,.6)';c.lineWidth=2.8/z;c.stroke(path);}c.setLineDash([]);c.strokeStyle='rgba(95,135,175,.75)';c.lineWidth=1.1/z;c.stroke(path);}if(visible&&z>.5&&r.mid){c.font=`${11/z}px sans-serif`;c.lineWidth=3/z;c.strokeStyle='rgba(251,246,226,.9)';c.strokeText(r.name,r.mid[0]+5/z,r.mid[1]-5/z);c.fillStyle='#315f7a';c.fillText(r.name,r.mid[0]+5/z,r.mid[1]-5/z);}}c.restore();}
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
const hasFace=n=>TK.faceOf(n)>=0||!!(TK.EXTRA_PORTRAITS?.[n]||TK.EXTRA_PORTRAITS?.[TK.PORTRAIT_ALIAS[n]]);
const extraFaceImages=new Map();
for(const [name,extra] of Object.entries(TK.EXTRA_PORTRAITS||{}).filter(([n])=>TK.faceOf(n)<0)){const im=new Image();im.onload=()=>{pcache.clear();urlCache.clear();U.baseDirty=true;if(U.mode!=='title')renderAll();};im.src=extra.src;extraFaceImages.set(name,im);}
function portrait(name,r,ring,col){
 const idx=TK.faceOf(name);let extra=TK.EXTRA_PORTRAITS?.[name]||TK.EXTRA_PORTRAITS?.[TK.PORTRAIT_ALIAS[name]];let source=faceImg,crop=[(idx%FCOLS)*FT,Math.floor(idx/FCOLS)*FT,FT,FT];
 if(extra){let im=extraFaceImages.get(name);if(!im){im=new Image();im.onload=()=>{pcache.clear();urlCache.clear();U.baseDirty=true;if(U.mode!=='title')renderAll();};im.src=extra.src;extraFaceImages.set(name,im);}if(!im.complete||!im.naturalWidth){if(idx<0)return null;extra=null;}else{source=im;crop=extra.crop;}}else if(idx<0||!faceReady)return null;
 const key=name+'|'+idx+'|'+r+'|'+ring+'|'+col;if(pcache.has(key))return pcache.get(key);
 const s=Math.ceil(r*2+6),c=document.createElement('canvas');c.width=s*PDPR;c.height=s*PDPR;c.css=s;const x=c.getContext('2d');x.scale(PDPR,PDPR);
 const cx=s/2,cy=s/2;
 x.save();x.beginPath();x.arc(cx,cy,r,0,7);x.clip();x.fillStyle='#e4dcc3';x.fillRect(cx-r,cy-r,r*2,r*2);const correction=extra?null:(TK.PORTRAIT_LAYOUT?.[name]||TK.PORTRAIT_LAYOUT?.[TK.PORTRAIT_ALIAS[name]]);
 if(correction&&!extra){const scale=Math.max(1,correction.scale||1),side=FT/scale,left=Math.max(0,Math.min(FT-side,(FT-side)/2-(correction.x||0)/scale)),upper=Math.max(0,Math.min(FT-side,(FT-side)/2-(correction.y||0)/scale));crop=[crop[0]+left,crop[1]+upper,side,side];}
 x.drawImage(source,...crop,cx-r,cy-r,r*2,r*2);x.restore();
 x.beginPath();x.arc(cx,cy,r,0,7);x.lineWidth=ring?2.6:1.6;x.strokeStyle=col||'#e9c873';x.stroke();
 if(ring){x.beginPath();x.arc(cx,cy,r+1.6,0,7);x.lineWidth=1;x.strokeStyle='rgba(20,14,8,.8)';x.stroke();}
 pcache.set(key,c);return c;
}
function faceHTML(name,size,k){const r=size==='sm'?15:size==='xl'?46:size==='lg'?30:20;const s=r*2+6;
 const c=portrait(name,r,size!=='sm',k?G.CC(k):null);
 if(!c)return `<span class="noface ${size||''}" style="width:${s}px;height:${s}px;--c:${k?G.CC(k):'#777'}">${esc(({'明宗':'朝'})[name]||(name||'').slice(0,1))}</span>`;
 const key=name+'|'+TK.faceOf(name)+'|'+r+'|'+k;let u=urlCache.get(key);if(!u){u=c.toDataURL();urlCache.set(key,u);}return `<img class="face ${size||''}" src="${u}" alt="${esc(name)}" width="${s}" height="${s}">`;}

// 家を選ぶ画面の印。登録紋があれば家紋、なければ家名の一字を家の色の丸に出す。
function familyMarkHTML(k,size=22){const r=G.kamonRecord(k);if(r)return `<span class="crest fmark" style="width:${size}px;height:${size}px">${kamonHTML(k,size)}</span>`;const name=G.CN(k)||'';return `<span class="crest fmark letter" style="width:${size}px;height:${size}px;--c:${G.CC(k)}" aria-label="${esc(name)}の印">${esc(({joseon:'朝',ming:'明'})[k]||name.replace(/家$/,'').slice(0,1))}</span>`;}
function kamonHTML(k,size=26){const r=G.kamonRecord(k);return r?`<img class="kamon" src="${esc(G.kamonDisplaySource(k))}" width="${size}" height="${size}" alt="${esc(G.CN(k))}の家紋">`:'';}
/* ===== カメラ ===== */
const base=$('#base'),top_=$('#top'),bctx=base.getContext('2d'),tctx=top_.getContext('2d');
const cam={x:GEO.W*.55,y:GEO.H*.52,z:.4};let DPR=1,VW=0,VH=0;
function resize(){DPR=Math.min(2,devicePixelRatio||1);VW=base.clientWidth;VH=base.clientHeight;for(const c of [base,top_]){const w=Math.round(VW*DPR),h=Math.round(VH*DPR);if(c.width!==w)c.width=w;if(c.height!==h)c.height=h;}U.baseDirty=true;}
addEventListener('resize',()=>{TL.sig='';});addEventListener('resize',()=>{resize();if(U.mode==='title')fitTitle();else clampCam();});
let tlNode=null;function narrowTL(){tlNode=tlNode||document.getElementById('tline');return !tlNode||tlNode.hidden||document.body.classList.contains('narrowSel');}
// 描画中は画面の中心が変わらないので、一度の描画で何千回も呼ぶ座標変換のために結果を控える。
let vcMemo=null;function vc(){return vcMemo||vcCalc();}
function vcCalc(){const mob=VW<=820;let l=0,r=0,t=0,b=0;
 if(U.mode==='game'){if(mob){t=U.hudTop||104;b=U.sel?VH*.46:196;}else{const nar=U.sel&&VW<1200;l=nar?0:320;r=U.sel?360:0;t=72;b=narrowTL()?0:70;}}
 else if(U.mode==='pick'){if(mob)b=VH*.52;else r=400;}
 return [l+(VW-l-r)/2,t+(VH-t-b)/2,VW-l-r,VH-t-b];}
const w2s=(x,y)=>{const c=vc();return [(x-cam.x)*cam.z+c[0],(y-cam.y)*cam.z+c[1]];};
U.pos=id=>w2s(G.C[id].x,G.C[id].y);
U.cam=(x,y,z)=>{U.sel=null;side.hidden=true;cam.x=x;cam.y=y;cam.z=z;clampCam();U.baseDirty=true;};
const s2w=(x,y)=>{const c=vc();return [(x-c[0])/cam.z+cam.x,(y-c[1])/cam.z+cam.y];};
function clampCam(){const c=vc(),CW=CONT.x1-CONT.x0,CH=CONT.y1-CONT.y0;
 // 背景はパネルの下まで画面を覆う。縦長では横方向をドラッグして見る。
 cam.z=Math.max(VW/CW,VH/CH,Math.min(MAXZ,cam.z));
 // 地図の端を、年表・家の欄・再生バーに隠れない見える範囲の端まで動かせるようにする（端の武将・城を選べるように）。
 const hx=c[2]/2/cam.z,hy=c[3]/2/cam.z;
 cam.x=Math.max(CONT.x0+hx,Math.min(CONT.x1-hx,cam.x));
 cam.y=Math.max(CONT.y0+hy,Math.min(CONT.y1-hy,cam.y));U.baseDirty=true;syncZoomControl();}
const CONT={x0:-1014.1,x1:2688.7,y0:-755.3,y1:3459.7};
// 表示範囲の基準（docs/architecture/raster-map.md）：西＝与那国島（国土地理院の最西端、東経122°55′57″）、北＝宗谷岬（北緯45°31′35″）、
// 東＝納沙布岬（東経145°49′01″）、南＝与那国島の緯度（北緯24°27′05″）。左下の角を国土地理院の最西端（与那国島）にそろえ、琉球諸島を入れる。朝鮮・明が絡むため西は国土地理院の端を使う。
function syncZoomControl(){const nav=$('#mapZoom');if(nav)nav.hidden=U.mode==='title';const el=$('#mapZoomRange');if(!el)return;const min=Math.max(VW/(CONT.x1-CONT.x0),VH/(CONT.y1-CONT.y0));el.value=Math.round(Math.log(cam.z/min)/Math.log(MAXZ/min)*100);el.setAttribute('aria-valuetext',Math.round(cam.z/min*100)+'%');}
function setMapZoom(z){anim=null;beginZoom();cam.z=z;clampCam();tip(null);}
function fitAll(){[cam.x,cam.y]=G.PJ(135,36);cam.z=0;clampCam();}
function fitTitle(){[cam.x,cam.y]=G.PJ(136.6,35.5);cam.z=VW<=820?Math.max(.8,VH/1100):Math.max(.6,VW/2350,VH/1600);clampCam();}
U.fitAll=fitAll;U.mapBounds=()=>({bounds:{...CONT},camera:{...cam},viewport:vc(),corners:[w2s(CONT.x0,CONT.y0),w2s(CONT.x1,CONT.y1)]});
let anim=null;function focus(id,z){const c=G.C[id];anim={x:c.x,y:c.y,z:z||Math.max(cam.z,1.3),t:0};}

/* ===== 境と街道 ===== */
function borderStyle(oa,ob){const key=G.relationKind(oa,ob).key,em=U.dipView?1.35:1;
 const styles={ally:{c:'#177a82',w:2.3,d:[7,3]},lord:{c:'#80619e',w:2,d:[8,3,2,3]},vassal:{c:'#80619e',w:2,d:[8,3,2,3]},war:{c:'#c52f49',w:2.8,d:[8,4]},hostile:{c:'#c56c25',w:2.1,d:[3,3]}};
 const st=styles[key]||{c:'rgba(65,49,32,.65)',w:1.2,d:null};return {...st,w:st.w*em,cs:styles[key]?'rgba(255,248,226,.7)':null};}
function drawBorders(c,z,k0){if(!S)return;
 for(const e of EDGE){const oa=S.castles[e.a].owner,ob=S.castles[e.b].owner;if(oa!==ob||z<.8)continue;c.strokeStyle='rgba(60,45,30,.22)';c.lineWidth=.7/z;c.setLineDash([]);c.stroke(e.p);}
 for(const e of EDGE){const oa=S.castles[e.a].owner,ob=S.castles[e.b].owner;if(oa===ob)continue;const st=borderStyle(oa,ob);const w=st.w*(k0||1)/z;
  if(st.cs){c.setLineDash([]);c.strokeStyle=st.cs;c.lineWidth=w+2.2/z;c.stroke(e.p);}
  c.setLineDash(st.d?st.d.map(v=>v/z):[]);c.strokeStyle=st.c;c.lineWidth=w;c.stroke(e.p);}
 c.setLineDash([]);
}

const ROADP=[];
function roadPaths(){if(ROADP.length)return ROADP;for(const raw of G.ROADS){const r=TK.roadDisplay(raw),pts=r.pts;const p=new Path2D();p.moveTo(pts[0][0],pts[0][1]);
  for(let i=1;i<pts.length;i++)p.lineTo(pts[i][0],pts[i][1]);
  // 名札は一番長い区間の中ほどに
  let bi=1,bl=0;for(let i=1;i<pts.length;i++){const l=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);if(l>bl&&i>1&&i<pts.length-1||bl===0){bl=l;bi=i;}}
  const A=pts[bi-1],B=pts[bi];ROADP.push({p,name:r.name,mx:(A[0]+B[0])/2,my:(A[1]+B[1])/2,ang:Math.atan2(B[1]-A[1],B[0]-A[0])});}return ROADP;}
function drawRoadLabels(c,z){c.save();for(const r of roadPaths()){c.save();c.translate(r.mx,r.my);let a=r.ang;if(a>Math.PI/2)a-=Math.PI;if(a<-Math.PI/2)a+=Math.PI;c.rotate(a);c.font=`700 ${11/z}px "Shippori Mincho B1",serif`;c.textAlign='center';c.textBaseline='bottom';c.lineWidth=3/z;c.strokeStyle='rgba(255,248,230,.9)';c.strokeText(r.name,0,-2/z);c.fillStyle='#6a3e1c';c.fillText(r.name,0,-2/z);c.restore();}c.restore();}

// 街道の名札は城の名札・肖像を描いたあとに、空いている所だけに置く（重なる所は出さない）
const RCUM=new Map();
function roadLabelsTop(c,z,fits,placed){if(z<.95)return;
 const list=G.ROADS.map(raw=>{const r=TK.roadDisplay(raw);let cum=RCUM.get(r);if(!cum){cum=[0];for(let i=1;i<r.pts.length;i++)cum.push(cum[i-1]+Math.hypot(r.pts[i][0]-r.pts[i-1][0],r.pts[i][1]-r.pts[i-1][1]));RCUM.set(r,cum);}return {r,cum,L:cum[cum.length-1]};}).sort((a,b)=>b.L-a.L);
 const at=(o,d)=>{const {r,cum}=o;d=Math.max(0,Math.min(o.L,d));let lo=1,hi=cum.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(cum[mid]<d)lo=mid+1;else hi=mid;}const i=lo;const a=r.pts[i-1],b=r.pts[i],t=(d-cum[i-1])/Math.max(1e-6,cum[i]-cum[i-1]);return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];};
 const ic=[];for(const C of G.CL){const [x,y]=w2s(C.x,C.y);if(x>-20&&y>-20&&x<VW+20&&y<VH+20)ic.push([x-11,y-14,22,22]);}
 const ok=(x,y,w,h)=>{if(!fits(x,y,w,h))return false;for(const r of ic)if(x<r[0]+r[2]&&x+w>r[0]&&y<r[1]+r[3]&&y+h>r[1])return false;return true;};
 c.save();c.font='700 10.5px "Shippori Mincho B1",serif';c.textAlign='center';c.textBaseline='middle';
 for(const o of list){const roadName=o.r.evidence?.label||o.r.name;const tw=c.measureText(roadName).width+6;const wl=tw/z;if(o.L<wl*1.5)continue;
  for(const f of [.5,.38,.62,.26,.74,.16,.84]){const d=o.L*f;const A=at(o,d-wl/2),B=at(o,d+wl/2),M=at(o,d);const [sx,sy]=w2s(M[0],M[1]);if(sx<tw/2||sy<12||sx>VW-tw/2||sy>VH-12)continue;
   const [ax,ay]=w2s(A[0],A[1]),[bx,by]=w2s(B[0],B[1]);if(Math.hypot(bx-ax,by-ay)<tw*.8)continue; // 曲がりくねった所は避ける
   let a=Math.atan2(by-ay,bx-ax);if(a>Math.PI/2)a-=Math.PI;if(a<-Math.PI/2)a+=Math.PI;
   const ca=Math.abs(Math.cos(a)),sa=Math.abs(Math.sin(a)),bw=tw*ca+13*sa,bh=tw*sa+13*ca;const ox=-Math.sin(a)*-7,oy=Math.cos(a)*-7;
   const bx0=sx+ox-bw/2,by0=sy+oy-bh/2;if(!ok(bx0,by0,bw,bh))continue;placed.push([bx0,by0,bw,bh]);
   c.save();c.translate(sx+ox,sy+oy);c.rotate(a);c.lineWidth=3;c.strokeStyle='rgba(255,248,230,.88)';c.strokeText(roadName,0,0);c.fillStyle='#6a3e1c';c.fillText(roadName,0,0);c.restore();break;}}
 c.restore();}
let SEAMASK=null;
// 全街道を一つの道筋にまとめ、縮尺ごとに画面で0.35px未満の折れを間引く（街道の線形データは変えない）。
const roadLOD=new Map();
function roadsFor(z){const lv=Math.max(-3,Math.min(4,Math.floor(Math.log2(Math.max(.01,z)))));let p=roadLOD.get(lv);if(p)return p;p=new Path2D();const tol=.35/2**lv;
 for(const raw of G.ROADS){const pts=TK.roadDisplay(raw).pts;const flat=[];for(const q of pts)flat.push(q[0],q[1]);const r=lv>=4?flat:simplifyRing(flat,tol);p.moveTo(r[0],r[1]);for(let i=2;i<r.length;i+=2)p.lineTo(r[i],r[i+1]);}
 roadLOD.set(lv,p);return p;}
function drawRoads(c,z,labels){
 // 海や湖を渡る区間（七里の渡し・今切の渡しなど）は、陸の線と変えて細い点線で描く
 if(!SEAMASK||SEAMASK.land!==LANDV){SEAMASK=new Path2D();SEAMASK.rect(-3000,-3000,8000,8000);SEAMASK.addPath(LANDV);SEAMASK.land=LANDV;}
 const roads=roadsFor(z);c.save();c.lineJoin='round';c.lineCap='round';c.clip(SEAMASK,'evenodd');c.setLineDash([2/z,3/z]);c.strokeStyle='rgba(240,232,210,.75)';c.lineWidth=1.4/z;c.stroke(roads);c.restore();
 c.save();c.lineJoin='round';c.lineCap='round';c.clip(LANDV);c.setLineDash([]);c.strokeStyle='rgba(255,248,230,.75)';c.lineWidth=3.2/z;c.stroke(roads);c.strokeStyle='rgba(116,107,90,.85)';c.lineWidth=1.2/z;c.stroke(roads);c.restore();c.save();
 if(labels)for(const r of roadPaths()){c.save();c.translate(r.mx,r.my);let a=r.ang;if(a>Math.PI/2)a-=Math.PI;if(a<-Math.PI/2)a+=Math.PI;c.rotate(a);c.font=`700 ${11/z}px "Shippori Mincho B1",serif`;c.textAlign='center';c.textBaseline='bottom';c.lineWidth=3/z;c.strokeStyle='rgba(255,248,230,.9)';c.strokeText(r.name,0,-2/z);c.fillStyle='#6a3e1c';c.fillText(r.name,0,-2/z);c.restore();}c.restore();}

function drawRoadLevels(c,z){if(!S||z<.55)return;c.save();c.clip(LANDV);for(const [id,L]of Object.entries(S.improvements?.roads||{})){if(L<=1)continue;const e=G.EDGES[id];if(!e)continue;const pts=G.visualEdgeGeo(e.a,e.b);c.beginPath();pts.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.setLineDash([]);c.strokeStyle=L>=4?'#695338':L===3?'#87704b':'#a0875b';c.lineWidth=(1.2+.35*(L-1))/z;c.lineJoin='round';c.stroke();}c.restore();}
/* ===== 下地の描画 ===== */
/* ===== 同盟の見える化 ===== */

// 同盟図の色：赤は交戦の色なので使わない。自家の同盟は緑、他は青・紫・山吹・藍・青緑など
const BLOC_MINE='#2e9a5a',BLOC_COL=['#3f7fd0','#8a5cc2','#c9a227','#1f9aa6','#4a5aa8','#8c8f3a','#a07850','#5f8fb8','#7a6aa8','#4f9c8a'];
function blocs(){const ks=G.alive(),par={};ks.forEach(k=>par[k]=k);const f=k=>par[k]===k?k:(par[k]=f(par[k]));
 for(let i=0;i<ks.length;i++)for(let j=i+1;j<ks.length;j++)if(G.allied(ks[i],ks[j]))par[f(ks[i])]=f(ks[j]);
 const g={};for(const k of ks){const r=f(k);(g[r]=g[r]||[]).push(k);}
 const list=Object.values(g).filter(a=>a.length>1).map(a=>a.sort((x,y)=>G.power(y)-G.power(x))).sort((a,b)=>b.reduce((s,k)=>s+G.power(k),0)-a.reduce((s,k)=>s+G.power(k),0));
 const of={};let j=0;list.forEach((a,i)=>{const col=a.includes(S.player)?BLOC_MINE:BLOC_COL[(j++)%BLOC_COL.length];a.forEach(k=>of[k]={i,col});});return {list,of};}
const branchPaths=new WeakMap();
function branchPath(cell){let p=branchPaths.get(cell);if(!p){p=P2(cell.polygons,0);branchPaths.set(cell,p);}return p;}
function drawBranchLands(c,z){if(U.mode!=='game'||!G.branchCells)return;c.save();c.clip(LANDV);
 for(const C of G.CL){const base=S.castles[C.id].owner;for(const cell of G.branchCells(C.id)){if(cell.main||!cell.polygons.length)continue;const owner=G.yOwner(cell.site),p=branchPath(cell);
  if(owner!==base){c.globalAlpha=.7;c.fillStyle=pastel(owner);c.fill(p,'evenodd');}
  if(z>.75&&(owner!==base||U.sel===C.id)){c.globalAlpha=.65;c.strokeStyle=owner===S.player?'#e7bb49':'#5f4934';c.lineWidth=1/z;c.setLineDash([3/z,3/z]);c.stroke(p);}}
 }c.restore();}
const modernWater=(TK.waterComparisonOverlay?TK.MODERN_LAKES||[]:[]).map(l=>({n:l.name,p:P2([l.rings.map(r=>r.flatMap(p=>G.PJ(...p)))],0),at:G.PJ(...l.rings[0][0])}));
const historicWater=(TK.HISTORIC_WATERS||[]).map(l=>({...l,p:l.poly?P2([l.poly],0):null,point:G.PJ(...l.at)}));
const periodWater=(TK.PERIOD_WATERS||[]).map(w=>({...w,p:P2([w.rings.map(r=>r.flatMap(p=>G.PJ(...p)))],0),at:G.PJ(...w.rings[0][0])}));
function drawPeriodWater(c,z){const year=S?G.date().y:1560;c.save();c.clip(LANDV);for(const w of periodWater){if(w.from&&year<w.from||w.until&&year>=w.until)continue;c.fillStyle='rgba(112,165,178,.62)';c.fill(w.p,'evenodd');c.strokeStyle='rgba(64,113,121,.65)';c.lineWidth=.7/z;c.setLineDash([2/z,3/z]);c.stroke(w.p);}c.restore();}
function drawWaterEvidence(c,z){c.save();c.clip(LANDV);for(const l of historicWater){if(l.p){c.fillStyle=l.kind==='marsh'?'rgba(112,151,138,.28)':'rgba(118,166,186,.4)';c.fill(l.p,'evenodd');c.setLineDash([1/z,3/z]);c.strokeStyle='#668a83';c.lineWidth=.8/z;c.stroke(l.p);}if(z>1){c.save();c.setLineDash([]);c.font=`${10/z}px sans-serif`;c.fillStyle='#315766';c.textAlign='center';c.fillText(l.label,l.point[0],l.point[1]);c.restore();}}for(const l of modernWater){c.fillStyle='rgba(118,166,186,.65)';c.fill(l.p,'evenodd');c.setLineDash([3/z,3/z]);c.strokeStyle='#426f80';c.lineWidth=.8/z;c.stroke(l.p);if(z>1){c.save();c.setLineDash([]);c.font=`${10/z}px sans-serif`;c.fillStyle='#315766';c.fillText(l.n+'（比較湖岸）',l.at[0]+3/z,l.at[1]-5/z);c.restore();}}c.restore();}
// 周囲を含めた地形だけを一度合成し、日付更新や小さなパンでは貼り直す。
// 勢力・道路・湖岸は別に描くため、領主の変化を古い画像で隠さない。
let terrainSurface=null;
function terrainBackdrop(c,view,z){
 const revision=TKTerrain.getRevision(),pad=128/z,px=DPR*z;
 const valid=terrainSurface&&terrainSurface.revision===revision&&terrainSurface.z===z&&terrainSurface.dpr===DPR&&terrainSurface.vw===VW&&terrainSurface.vh===VH&&view[0]>=terrainSurface.x&&view[1]>=terrainSurface.y&&view[2]<=terrainSurface.x+terrainSurface.w&&view[3]<=terrainSurface.y+terrainSurface.h;
 if(!valid){const x=view[0]-pad,y=view[1]-pad,w=view[2]-view[0]+pad*2,h=view[3]-view[1]+pad*2;
  if(w*h*px*px>10000000){terrainSurface=null;TKTerrain.draw(c,view,z,DPR,LANDV,JAPAN);return;}
  const cv=document.createElement('canvas');cv.width=Math.ceil(w*px);cv.height=Math.ceil(h*px);const tc=cv.getContext('2d');tc.setTransform(px,0,0,px,-x*px,-y*px);TKTerrain.draw(tc,[x,y,x+w,y+h],z,DPR,LANDV,JAPAN);
  terrainSurface={cv,x,y,w:cv.width/px,h:cv.height/px,z,dpr:DPR,vw:VW,vh:VH,revision};
 }
 const t=terrainSurface;c.drawImage(t.cv,t.x,t.y,t.w,t.h);
}
// 領域（definition.csv の一行）→ 塗る色 [r,g,b,a]。城の領域だけ領主の色で塗り、海・湖・未割当・中立地は塗らない。
const rgbCache=new Map(),rgbCtx=document.createElement('canvas').getContext('2d');
function cssRGB(css){if(rgbCache.has(css))return rgbCache.get(css);rgbCtx.fillStyle='#000';rgbCtx.fillStyle=css;const v=rgbCtx.fillStyle,m=v.startsWith('#')?[1,3,5].map(i=>parseInt(v.slice(i,i+2),16)):v.match(/\d+(\.\d+)?/g).slice(0,3).map(Number);rgbCache.set(css,m);return m;}
function rasterColor(flat){return d=>{if(!d||!d.key.startsWith('castle:'))return null;const st=S?.castles[d.key.slice(7)];if(!st)return null;const k=st.owner,a=flat?(k===S.player?.5:.35):(k===S.player?.44:.32);return [...cssRGB(pastel(k)),Math.round(a*255)];};}
window.TKRaster?.onChange(()=>{U.baseDirty=true;U.wakeLoop?.();});
function paintBase(c,pad=0){LANDV=landFor(cam.z);
 const cc=vc();c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,c.canvas.width,c.canvas.height);
 c.fillStyle='#e2dac6';c.fillRect(0,0,c.canvas.width,c.canvas.height);
 const z=cam.z,tx=cc[0]-cam.x*z+pad,ty=cc[1]-cam.y*z+pad;
 c.setTransform(DPR*z,0,0,DPR*z,DPR*tx,DPR*ty);
 c.save();c.beginPath();c.rect(CONT.x0,CONT.y0,CONT.x1-CONT.x0,CONT.y1-CONT.y0);c.clip();
 const flat=U.mapStyle!=='relief';const [x0,y0]=s2w(-pad,-pad),[x1,y1]=s2w(VW+pad,VH+pad);
 if(flat){ // 白地図：白い陸、淡い水色の海、細い国境
  {const pat=c.createPattern(seaTile,'repeat');pat.setTransform(new DOMMatrix([Math.max(.12,.19/z),0,0,Math.max(.12,.19/z),0,0]));c.fillStyle=pat;c.fillRect(x0-50,y0-50,x1-x0+100,y1-y0+100);}
  c.save();c.shadowColor='rgba(40,70,110,.38)';c.shadowBlur=10*DPR;c.fillStyle='#fbfaf6';c.fill(LANDV);c.restore();
 }else{
 const pat=c.createPattern(seaTile,'repeat');const ps=Math.max(.12,.19/z);pat.setTransform(new DOMMatrix([ps,0,0,ps,0,0])); // 地図に貼りつける（ズームしても模様が地図と一緒に動く）
 c.fillStyle=pat;c.fillRect(x0-50,y0-50,x1-x0+100,y1-y0+100);
 c.fillStyle='#ece2c6';c.fill(LANDV);}
 if(!flat&&window.TKTerrain)terrainBackdrop(c,[x0,y0,x1,y1],z);
 if(S){c.save();c.clip(LANDV);c.globalCompositeOperation='source-over';/* 根拠のない矩形で明の支配域を塗らない。遼東の地域・都司は出典付き地点として表示。 */
  // 領主の色はラスター地図（game/map の領域画像）で塗る。画像が届くまでは従来の線の領域で塗る。
  const rasterSig=territorySignature()+'|'+flat+'|'+S.player;
  if(!(window.TKRaster?.ready()&&TKRaster.paint(c,[x0,y0,x1,y1],z,DPR,rasterColor(flat),rasterSig)))
  for(const C of G.CL){const k=S.castles[C.id].owner;c.globalAlpha=flat?(k===S.player?.5:.35):(k===S.player?.44:.32);c.fillStyle=pastel(k);c.fill(TERR[C.id]);}
  c.restore();}
 // 地図全体の明るさを抑える：陸に古い紙の焼けた色を薄く重ねる（地形の陰影・勢力の色は残る）。
 if(!flat){c.save();c.clip(LANDV);c.globalCompositeOperation='multiply';c.fillStyle='rgba(168,146,110,.55)';c.fillRect(x0-50,y0-50,x1-x0+100,y1-y0+100);c.restore();}

 if(S)drawBranchLands(c,z);
 if(flat){c.strokeStyle='rgba(95,135,175,.75)';c.lineWidth=1.1/z;c.lineJoin='round';drawMapRivers(c,z);
  if(z>.45){c.strokeStyle='rgba(110,110,110,.5)';c.lineWidth=.8/z;c.stroke(PBORD);}
  if(S&&z>.5)drawRoads(c,z,false);drawBorders(c,z);
  c.save();c.clip(LANDV);c.fillStyle='#aac4df';c.fill(LAKES);c.strokeStyle='rgba(110,135,170,.55)';c.lineWidth=.7/z;c.stroke(LAKES);c.restore();
   c.strokeStyle='rgba(100,125,160,.7)';c.lineWidth=.8/z;c.stroke(COAST.get(LANDV)||LANDV);
 }else{
 c.strokeStyle='rgba(95,135,175,.75)';c.lineWidth=1.1/z;c.lineJoin='round';drawMapRivers(c,z);
 if(z>.55){c.save();c.setLineDash([3/z,3/z]);c.strokeStyle='rgba(70,55,35,.38)';c.lineWidth=.9/z;c.stroke(PBORD);c.restore();}
 if(S&&z>.5)drawRoads(c,z,false);
 drawRoadLevels(c,z);drawBorders(c,z);
 c.save();c.clip(LANDV);c.fillStyle='#93b4d2';c.fill(LAKES);c.strokeStyle='rgba(50,70,100,.55)';c.lineWidth=.8/z;c.stroke(LAKES);c.restore();
 c.strokeStyle='rgba(25,35,60,.6)';c.lineWidth=1.1/z;c.stroke(COAST.get(LANDV)||LANDV);
 }

 drawWaterEvidence(c,z);drawPeriodWater(c,z);
 drawRegionalRivers(c,z);
 c.restore();c.strokeStyle='rgba(76,62,42,.6)';c.lineWidth=1.5/z;c.strokeRect(CONT.x0,CONT.y0,CONT.x1-CONT.x0,CONT.y1-CONT.y0);
 c.setTransform(DPR,0,0,DPR,pad*DPR,pad*DPR);
 for(const pl of GEO.plabels){const size=Math.min(46,pl.r*z*.62);if(size<13)continue;const [sx,sy]=w2s(pl.x,pl.y);if(sx<-60-pad||sy<-80-pad||sx>VW+60+pad||sy>VH+80+pad)continue;
  c.font=`800 ${size}px "Shippori Mincho B1",serif`;c.textAlign='center';c.textBaseline='middle';c.fillStyle=U.mapStyle!=='relief'?`rgba(60,60,70,${size>30?.2:.28})`:`rgba(55,40,25,${size>30?.24:.3})`;
  const ch=[...pl.n];ch.forEach((t,i)=>c.fillText(t,sx,sy+(i-(ch.length-1)/2)*size*1.02));}
 for(const p of TK.CONTEXT_PLACES||[]){const [sx,sy]=w2s(...G.PJ(...p.at));if(sx<0||sy<0||sx>VW||sy>VH||z<.55)continue;c.fillStyle='#674a37';c.beginPath();c.arc(sx,sy,2.5,0,Math.PI*2);c.fill();c.font='12px serif';c.textAlign='left';c.lineWidth=3;c.strokeStyle='#ece6cc';c.strokeText(p.name+'（'+p.detail+'）',sx+6,sy-5);c.fillText(p.name+'（'+p.detail+'）',sx+6,sy-5);}
 c.textAlign='left';
}
// 地形だけでなく海岸・領域・街道も合成して再利用する。座標を変えず等倍で切り出す。
// 状態の変更と視点の変更を分離し、領主交替・同盟・年代・表示設定は必ず無効化する。
let baseSurface=null;
U.baseCacheStats={builds:0,hits:0};
function drawBase(){
 if(baseSurface&&performance.now()<(U.zoomUntil||0)&&baseSurface.state===S){
  const cc=vc(),ratio=cam.z/baseSurface.z;
  const x=cc[0]+(baseSurface.x-cam.x)*cam.z-(baseSurface.cc[0]+160)*ratio;
  const y=cc[1]+(baseSurface.y-cam.y)*cam.z-(baseSurface.cc[1]+160)*ratio;
  const cw=baseSurface.cv.width/DPR*ratio,ch=baseSurface.cv.height/DPR*ratio,ov=Math.max(0,Math.min(VW,x+cw)-Math.max(0,x))*Math.max(0,Math.min(VH,y+ch)-Math.max(0,y))/(VW*VH);
  if(ov>=.85||performance.now()-(U.zoomRebuildAt||0)<120){
  bctx.setTransform(1,0,0,1,0,0);bctx.fillStyle='#1c3157';bctx.fillRect(0,0,base.width,base.height);
  bctx.drawImage(baseSurface.cv,x*DPR,y*DPR,baseSurface.cv.width*ratio,baseSurface.cv.height*ratio);U.baseDirty=false;return;}
 }
 // 地形タイルが届くたびに下層全体を描き直すと、広い画面（題名・家選び）で1回数百msかかる。
 // 到着の反映は700msごとにまとめ、カメラの動画中は待つ。最後の反映は必ず行う。
 const liveRevision=U.mapStyle==='relief'?(window.TKTerrain?.getRevision?.()||0):0,nowMs=performance.now();
 if(liveRevision!==U.terrainRevShown){if(!anim&&nowMs-(U.terrainRevAt||0)>=700){U.terrainRevShown=liveRevision;U.terrainRevAt=nowMs;}else{clearTimeout(U.terrainRevTimer);U.terrainRevTimer=setTimeout(()=>{U.baseDirty=true;},anim?120:Math.max(60,700-(nowMs-(U.terrainRevAt||0))));}}
 if(performance.now()<(U.zoomUntil||0))U.zoomRebuildAt=performance.now();
 const cc=vc(),revision=U.terrainRevShown||0;
 const key=[cam.z,DPR,VW,VH,...cc,U.mode,U.mapStyle,U.dipView,U.sel,S?.player,territorySignature(),JSON.stringify(S?.vassal||{}),JSON.stringify(S?.improvements?.roads||{}),revision,fontRevision,TK.waterPhase?.(S?G.date().y:1560),window.TKRaster?.revision()||0].join('|');
 const pad=160,dx=baseSurface?(cam.x-baseSurface.x)*cam.z:0,dy=baseSurface?(cam.y-baseSurface.y)*cam.z:0;
 const valid=baseSurface&&baseSurface.state===S&&baseSurface.key===key&&Math.abs(dx)<=pad&&Math.abs(dy)<=pad;
 if(!valid){
  // 大画面での過剰なメモリ確保を避ける。縮小画像を拡大する方式にはしない。
  if((VW+pad*2)*(VH+pad*2)*DPR*DPR>12000000){baseSurface=null;paintBase(bctx);U.baseCacheStats.builds++;U.baseDirty=false;return;}
  const cv=document.createElement('canvas');cv.width=Math.ceil((VW+pad*2)*DPR);cv.height=Math.ceil((VH+pad*2)*DPR);
  paintBase(cv.getContext('2d'),pad);baseSurface={cv,key,state:S,x:cam.x,y:cam.y,z:cam.z,cc:cc.slice()};U.baseCacheStats.builds++;
 }else U.baseCacheStats.hits++;
 const t=baseSurface,sx=(pad+(cam.x-t.x)*cam.z)*DPR,sy=(pad+(cam.y-t.y)*cam.z)*DPR;
 bctx.setTransform(1,0,0,1,0,0);bctx.clearRect(0,0,base.width,base.height);bctx.drawImage(t.cv,sx,sy,base.width,base.height,0,0,base.width,base.height);U.baseDirty=false;
}

/* ===== 上層の描画 ===== */
let tNow=0;
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
// 駒の位置：城と城の間は、街道があれば街道の道筋をたどる
// その日の終わりの位置（計算上）
function rawPos(u){const hp=G.historyPoint&&G.historyPoint(u);if(hp)return hp;if(u.branch&&['branch-march','branch-siege','branch-return'].includes(u.state)){const p=G.branchXY(u);if(p)return p;}if(u.state==='siege'||(u.state==='battle'&&u.seg>=u.path.length-1)){const L=u.path.length;if(L>=2){const r=G.visualEdgePoint(u.path[L-2],u.path[L-1],.86);return r;}const C=G.C[u.path[L-1]];return [C.x,C.y,null];}
 const a=u.path[u.seg],b=u.path[Math.min(u.seg+1,u.path.length-1)];if(a===b){const C=G.C[a];return [C.x,C.y,null];}
 let f=u.pos;const last=u.seg>=u.path.length-2&&(u.mission==='attack'||u.state==='battle');if(last)f=Math.min(f,.86);
 return G.visualEdgePoint(a,b,Math.max(0,Math.min(1,f)));}
// 前日と当日の進捗を道沿いに補間する。道の長さは再利用する。
function unitPos(u){return G.historyPoint?.(u)||rawPos(u);}
function uXY(u){const r=unitPos(u);return [r[0],r[1]];}
function unitXY(u){const r=unitPos(u);return [r[0],r[1]];}
function castleIcon(c,x,y,s,col,mine,cap,region){
 if(region){c.save();c.translate(x,y);c.strokeStyle=col;c.lineWidth=2;c.fillStyle='#eee5cc';c.beginPath();c.moveTo(-s,-s*.7);c.lineTo(s,-s*.7);c.lineTo(s*1.1,s*.65);c.lineTo(-s*1.1,s*.65);c.closePath();c.fill();c.stroke();c.fillStyle=col;c.fillRect(-s*.2,0,s*.4,s*.65);for(let i=-1;i<=1;i++)c.fillRect(i*s*.7-s*.12,-s,s*.24,s*.4);c.restore();return;}
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
 return `<div class="yline">${ys.map(y=>`<div${G.yActive(y)?'':' class="yoff"'}><b><i class="yk">${y.kind}</i>${esc(y.n)}${G.yActive(y)?'':'（いまは働いていない）'}</b><small>${esc(G.YOSHO_FX[y.kind].fx)}${y.kind==='城'?' ・ 支配：'+esc(G.CNK(G.yOwner(y))):''}${G.yOwner(y)===S.player?'':' ・ 押さえれば'+G.CNK(S.player)+'の力に'}</small><small class="yd">${esc(y.desc)}</small></div>`).join('')}</div>`;}
const YK_COL={城:'#3b3128',金:'#e0b43a',銀:'#c9ced6',寺:'#b5462f',鉄:'#44454a',市:'#c88a2c',馬:'#7a5a34',湊:'#2f6f9e',関:'#5b3c1f',宿:'#8a6b3a',橋:'#8a6b3a'};
function drawYosho(c,z,lvl,placed){if(z<.6)return;const big=new Set(['金','銀','寺','湊','関']);
 for(const y of (G.YOSHO||[])){if(lvl===0&&!big.has(y.kind))continue;const [x,sy]=w2s(y.x,y.y);if(x<-40||sy<-20||x>VW+40||sy>VH+20)continue;const k=G.yOwner(y);const level=G.siteLevel(y),s=(lvl===0?3.8:4.8)*(1+.1*(level-1));const on=G.yActive(y);
  c.save();c.globalAlpha=on?1:.35;c.translate(x,sy);c.rotate(Math.PI/4);c.fillStyle=k?mix(G.CC(k),'#ffffff',.3):'#999';c.strokeStyle=YK_COL[y.kind]||'rgba(40,28,14,.9)';c.lineWidth=1.8;c.fillRect(-s,-s,s*2,s*2);c.strokeRect(-s,-s,s*2,s*2);if(level>=3){c.strokeStyle='#846d32';c.lineWidth=1;c.strokeRect(-s-2,-s-2,s*2+4,s*2+4);}c.restore();
  c.save();c.globalAlpha=on?1:.4;c.font=`800 ${lvl===0?7:8.5}px "Shippori Mincho B1",serif`;c.textAlign='center';c.textBaseline='middle';c.fillStyle='#2a1d10';c.fillText(TK.KOREA_SITES?.[y.n]?.role==='宮殿'?'宮':y.kind,x,sy+.5);c.restore();
  if(lvl>=1&&on){const name=G.siteName?.(y)||y.n,w=name.length*10.5+6;if(!placed||fitsP(placed,x+6,sy-8,w,16)){jText(c,name,x+8,sy,'#5a3a1a',10.5);if(placed)placed.push([x+6,sy-8,w,16]);}}
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
}
// 焼けた城の煙は時間で揺れるので、動く層に描く。描いたら true（動きが続く）。
function drawSmoke(c){let any=false;
 for(const C of G.CL){const o=S.cst&&S.cst[C.id];if(!o||!o.burnt)continue;const [x,y]=w2s(C.x,C.y);if(x<-40||y<-40||x>VW+40||y>VH+40)continue;any=true;
  const t=tNow/400;for(let i=0;i<3;i++){const a=(t+i*.33)%1;c.globalAlpha=(1-a)*.5;c.fillStyle='#4a4038';c.beginPath();c.arc(x+3+Math.sin(a*6+i)*3,y-10-a*16,2.5+a*4,0,7);c.fill();}c.globalAlpha=1;}
 return any;}
// 上層は三つに分けて描く。選択した国の縁取り（下敷き）と、城・名札・肖像・街道名・合戦地などの静止層は、
// 日付・視点・選択が変わった時だけ別のキャンバスへ描いて控える。行軍の道筋・駒・移動中の人物・煙・攻城の輪など
// 時間で動くものだけを毎回描き、控えた層を従来と同じ重なり順で重ねる。
const layer=()=>{const cv=document.createElement('canvas');return {cv,c:cv.getContext('2d'),on:false};};
const UNDER=layer(),STILL=layer();
function beginLayer(c,z,cc,world){c.setTransform(DPR,0,0,DPR,0,0);c.clearRect(0,0,VW,VH);
 c.save();const clip0=w2s(CONT.x0,CONT.y0),clip1=w2s(CONT.x1,CONT.y1);c.beginPath();c.rect(clip0[0],clip0[1],clip1[0]-clip0[0],clip1[1]-clip0[1]);c.clip();
 if(world){c.save();c.setTransform(DPR*z,0,0,DPR*z,DPR*(cc[0]-cam.x*z),DPR*(cc[1]-cam.y*z));}}
function fitLayer(L){if(L.cv.width!==top_.width)L.cv.width=top_.width;if(L.cv.height!==top_.height)L.cv.height=top_.height;}
function blit(c,L){c.save();c.setTransform(1,0,0,1,0,0);c.drawImage(L.cv,0,0);c.restore();}
// still が真なら静止層も描き直す。戻り値は、時間で動く表示（攻城の輪・煙・交戦中の駒）が画面にあるか。
function drawTop(still){LANDV=landFor(cam.z);vcMemo=vcCalc();try{return drawTopLayers(still);}finally{vcMemo=null;}}
function drawTopLayers(still){
 const c=tctx;c.setTransform(DPR,0,0,DPR,0,0);c.clearRect(0,0,VW,VH);if(!S)return false;
 const z=cam.z,cc=vc(),lvl=z<.75?0:z<1.4?1:2;
 if(still||STILL.cv.width!==top_.width||STILL.cv.height!==top_.height){drawUnder(z,cc);drawStill(z,cc,lvl);U.drawStats.still++;}
 let animated=false;
 c.save();const clip0=w2s(CONT.x0,CONT.y0),clip1=w2s(CONT.x1,CONT.y1);c.beginPath();c.rect(clip0[0],clip0[1],clip1[0]-clip0[0],clip1[1]-clip0[1]);c.clip();
 if(UNDER.on)blit(c,UNDER);
 c.save();c.setTransform(DPR*z,0,0,DPR*z,DPR*(cc[0]-cam.x*z),DPR*(cc[1]-cam.y*z));
 for(const u of G.visibleNativeArmies?.()||S.units){if(G.marchPhase?.(u).key==='waiting')continue;const tg=u.path[u.path.length-1];const mine=u.clan===S.player,threat=S.castles[tg].owner===S.player&&u.mission==='attack';
  if(z<.7&&!mine&&u.troops<6000&&S.castles[tg].owner!==S.player)continue;
  const col=G.armyIdentity(u).color;const [px,py,pa]=unitPos(u);const sa=u.path[u.seg],sb=u.path[Math.min(u.seg+1,u.path.length-1)];
  const wholeRoute=G.historyGeometry?.(u),geo=wholeRoute||(sa!==sb?G.visualEdgeGeo(sa,sb):[[G.C[sa].x,G.C[sa].y]]);
  // 通ってきた道筋（今の城と城の間）
  const doneP=[],restP=[];{const dx=px,dy=py;let best=0,bd=1e9;for(let i=0;i<geo.length;i++){const d=Math.hypot(geo[i][0]-dx,geo[i][1]-dy);if(d<bd){bd=d;best=i;}}
   for(let i=0;i<geo.length;i++){if(i<=best)doneP.push(geo[i]);if(i>=best)restP.push(geo[i]);}
   if(best>0){const q=geo[best],r=geo[best-1];const ahead=Math.hypot(q[0]-r[0],q[1]-r[1])<Math.hypot(px-r[0],py-r[1]);if(!ahead){doneP.pop();restP.unshift(q);}}}
  c.lineCap='round';c.lineJoin='round';c.strokeStyle='rgba(255,250,235,.85)';c.lineWidth=(mine||threat?7:5)/z;c.beginPath();c.moveTo(doneP[0][0],doneP[0][1]);for(const q of doneP)c.lineTo(q[0],q[1]);c.lineTo(px,py);c.stroke();
  c.strokeStyle=col;c.lineWidth=(mine||threat?4.4:3)/z;c.stroke();
  if(G.marchPhase(u).key==='march'){c.setLineDash([5/z,4/z]);c.strokeStyle=threat?'rgba(220,60,40,.9)':mix(col,'#000000',.2);c.lineWidth=1.8/z;c.beginPath();c.moveTo(px,py);for(const q of restP)c.lineTo(q[0],q[1]);
   for(let k=u.seg+1;!wholeRoute&&k<u.path.length-1;k++){const g2=G.visualEdgeGeo(u.path[k],u.path[k+1]);for(const q of g2)c.lineTo(q[0],q[1]);}c.stroke();c.setLineDash([]);}
  // 描画位置を求めた同じ経路の接線を使う。停止しても向きと位置は変えない。
  const ang=Number.isFinite(pa)?pa:(ANG.get(u.id)??-Math.PI/2);
  ANG.set(u.id,ang);
 }
 c.restore();
 // 攻城の輪は城の記号の下に、焼けた城の煙も城の記号の下に描く。
 {const sieged={};for(const u of S.units)if(u.state==='siege')sieged[u.path[u.path.length-1]]=1;
 for(const C of G.CL){if(!sieged[C.id])continue;const [x,y]=w2s(C.x,C.y);if(x<-40||y<-40||x>VW+40||y>VH+40)continue;animated=true;
  const s=(3.6+Math.sqrt(C.koku)*.7)*Math.min(1.9,.65+z*.4)*Math.min(1,z/.4);
  if(sieged[C.id]){const p=.5+.5*Math.sin(tNow/170);c.beginPath();c.arc(x,y-s*.2,s*2+p*4,0,7);c.strokeStyle=`rgba(220,60,40,${.45+p*.4})`;c.lineWidth=2.2;c.stroke();}}}
 if(drawSmoke(c))animated=true;
 blit(c,STILL);
 // 旅の途中の武将（城を移る時も道を通って行く）
 for(const g of S.gens){if(!G.inTransit(g)||G.documentedPerson?.(g.n))continue;const imp=G.isLeader(g)||lvl>=1;if(!imp)continue;const p=g.tr.p;if(!p||p.length<2)continue;
  const pos=G.personPoint(g);if(!pos)continue;const [x,y]=w2s(...pos);
  if(x<-40||y<-40||x>VW+40||y>VH+40)continue;const r=G.isLeader(g)?13:10;const im=portrait(g.n,r,true,G.CC(g.clan));
  c.save();c.globalAlpha=.92;c.beginPath();c.arc(x,y,r+5,0,7);c.fillStyle='rgba(20,14,8,.35)';c.fill();if(im)c.drawImage(im,x-im.css/2,y-im.css/2,im.css,im.css);else{c.beginPath();c.arc(x,y,r,0,7);c.fillStyle=G.CC(g.clan);c.fill();}
  if(lvl>=1){c.font='700 10.5px "Shippori Mincho B1",serif';c.textAlign='center';c.textBaseline='top';c.lineWidth=3;c.strokeStyle='rgba(255,250,236,.92)';const t=g.n+' 移動中';c.strokeText(t,x,y+r+4);c.fillStyle='#2a1d10';c.fillText(t,x,y+r+4);c.textAlign='left';}
  c.restore();}
 // 各隊を実位置の凸で描き、重なりは選択用の案内を添える。
 let mapUnits=[...(G.visibleNativeArmies?.()||S.units),...(G.documentedArmies?.()||[])];if(U.deploymentPreview?.t===S.t){const deployment=G.deploymentArmies(U.deploymentPreview.title),names=new Set(deployment.flatMap(u=>u.commanders));mapUnits=mapUnits.filter(u=>!(u.commanders||u.gens.map(id=>G.gen(id)?.n)).some(n=>names.has(n))).concat(deployment);}
 U.mapUnits=mapUnits;renderDeployNote();const candidates=G.convoyLayout(mapUnits.filter(u=>G.marchPhase?.(u).key!=='waiting'),z,w2s,uXY);
 const v=vc(),area=U.mode==='game'?{left:v[0]-v[2]/2+8,top:v[1]-v[3]/2+8,width:Math.max(120,v[2]-16),height:Math.max(120,v[3]-16)}:{left:0,top:0,width:VW,height:VH};
 const outside={left:[],right:[],top:[],bottom:[],more:[]},laid=[];
 for(const p of candidates){if(p.x<0||p.x>VW||p.y<0||p.y>VH){outside[p.x<0?'left':p.x>VW?'right':p.y<0?'top':'bottom'].push(p);continue;}laid.push({...p,anchorX:p.x,anchorY:p.y});}
 // 画面上で重なる駒：同じ指揮（家）の軍は一つの駒にまとめて兵数を合算し、拡大して離れれば自然に分かれる。
 // 指揮の違う軍が重なる時は、少しずつ押し離して双方を見せ、元の位置へ細い線を引く。
 {const sorted=laid.map((p,i)=>({p,i,u:p.displayUnit||p.u||mapUnits.find(u=>u.id===p.id)})).sort((a,b)=>(b.u?.troops||0)-(a.u?.troops||0)),gone=new Set(),R=26;
  for(const a of sorted){if(gone.has(a.i)||!a.u)continue;const cmd=G.armyIdentity(a.u).command;const mates=sorted.filter(b=>b!==a&&!gone.has(b.i)&&b.u&&G.armyIdentity(b.u).command===cmd&&Math.hypot(b.p.x-a.p.x,b.p.y-a.p.y)<R);if(!mates.length)continue;
   for(const b of mates)gone.add(b.i);const all=[a,...mates],troops=all.reduce((n,q)=>n+(q.u.troops||0),0);
   laid[a.i]={...a.p,members:all.flatMap(q=>q.p.members||[{id:q.p.id,x:q.p.x,y:q.p.y}]),stacked:all.length,displayUnit:{...a.u,troops,_stackSize:all.length,_convoySize:Math.max(a.u._convoySize||1,all.length)}};}
  for(let i=laid.length-1;i>=0;i--)if(gone.has(i))laid.splice(i,1);
  for(let it=0;it<4;it++)for(let i=0;i<laid.length;i++)for(let j=i+1;j<laid.length;j++){const A=laid[i],B=laid[j],dx=B.x-A.x,dy=B.y-A.y,d=Math.hypot(dx,dy),min=30;if(d>=min)continue;const ux=d>.01?dx/d:1,uy=d>.01?dy/d:0,push=(min-d)/2;
   for(const [P,sg] of [[A,-1],[B,1]]){const nx=P.x+ux*push*sg,ny=P.y+uy*push*sg;if(Math.hypot(nx-P.anchorX,ny-P.anchorY)<=22){P.x=nx;P.y=ny;}}}}
 const layout={visible:laid,outside};U.armyGroups=laid;

 U._UP=new Map(laid.flatMap(p=>p.members.map(m=>[m.id,[m.x,m.y]])));U.outsideArmies=layout.outside;
 renderArmyEdges(layout.outside,area,mapUnits);
 for(const p of laid){const u=p.displayUnit||p.u||mapUnits.find(u=>u.id===p.id),overlap=u._convoySize>1||laid.some(q=>q!==p&&Math.hypot(q.x-p.x,q.y-p.y)<18);if(Math.hypot(p.x-p.anchorX,p.y-p.anchorY)>3){c.save();c.strokeStyle='rgba(42,29,16,.55)';c.lineWidth=1;c.beginPath();c.moveTo(p.anchorX,p.anchorY);c.lineTo(p.x,p.y);c.stroke();c.beginPath();c.arc(p.anchorX,p.anchorY,2,0,7);c.fillStyle='#2a1d10';c.fill();c.restore();}drawCounter(c,p.x,p.y,u,G.armyIdentity(u).command===S.player,lvl,overlap);if(p.stacked>1){const k=lvl===0?.85:lvl===1?1:1.2,tx=p.x-18*k,ty=p.y-16*k,txt=p.stacked+'隊';c.save();c.font=`700 ${Math.round(10*k)}px "Zen Kaku Gothic New",sans-serif`;const w=c.measureText(txt).width+8;c.fillStyle='rgba(29,23,18,.92)';c.beginPath();c.roundRect?c.roundRect(tx-w/2,ty-8*k,w,16*k,8*k):c.rect(tx-w/2,ty-8*k,w,16*k);c.fill();c.strokeStyle='#d9b866';c.lineWidth=1;c.stroke();c.fillStyle='#efe3c4';c.textAlign='center';c.textBaseline='middle';c.fillText(txt,tx,ty+.5);c.restore();}}
 animated=animated||laid.some(p=>(p.displayUnit||p.u||mapUnits.find(u=>u.id===p.id))?.state==='battle');
 c.restore();
 return animated;
}
function drawUnder(z,cc){UNDER.on=!!(U.sel||U.picking||(U.mode==='pick'&&U.pickClan));if(!UNDER.on)return;fitLayer(UNDER);const c=UNDER.c;beginLayer(c,z,cc,true);
 c.save();if(U.sel||U.picking||(U.mode==='pick'&&U.pickClan))c.clip(LANDV);
 if(U.sel){c.fillStyle='rgba(255,240,190,.16)';c.fill(TERR[U.sel]);c.shadowColor='rgba(240,200,100,.9)';c.shadowBlur=10*DPR;c.strokeStyle='#f2d27c';c.lineWidth=2.6/z;c.stroke(TERR[U.sel]);c.shadowBlur=0;}
 if(U.picking){c.setLineDash([6/z,4/z]);c.strokeStyle='#ff6a4d';c.lineWidth=2.4/z;for(const n of G.ADJ[U.picking]){const o=S.castles[n].owner;if(o!==S.player&&!G.allied(S.player,o))c.stroke(TERR[n]);}c.setLineDash([]);}
 if(U.mode==='pick'&&U.pickClan){c.strokeStyle='#f2d27c';c.lineWidth=2.4/z;const pr=G.preList().find(x=>x.k===U.pickClan);for(const C of G.CL)if(S.castles[C.id].owner===U.pickClan||(pr&&pr.castles.includes(C.id)))c.stroke(TERR[C.id]);}
 c.restore();
 c.restore();c.restore();}
function drawStill(z,cc,lvl){fitLayer(STILL);const c=STILL.c;beginLayer(c,z,cc,true);
 if(U.sel&&U.mode==='game'){const k=S.castles[U.sel].owner,ck=S.clans[k];if(ck){const A=G.C[ck.cap]||G.C[U.sel];
  for(const j of G.alive()){if(j===k)continue;const al=G.allied(k,j),war=!al&&G.atWar(k,j);if(!al&&!war)continue;const B=G.C[S.clans[j].cap];if(!B)continue;
   const mx=(A.x+B.x)/2,my=(A.y+B.y)/2,dx=B.x-A.x,dy=B.y-A.y,L=Math.hypot(dx,dy)||1,cx=mx-dy/L*L*.18,cy=my+dx/L*L*.18;
   c.beginPath();c.moveTo(A.x,A.y);c.quadraticCurveTo(cx,cy,B.x,B.y);c.lineCap='round';c.strokeStyle='rgba(255,250,235,.5)';c.lineWidth=3/z;c.setLineDash([]);c.stroke();
   c.strokeStyle=al?'rgba(31,138,72,.75)':'rgba(196,40,28,.75)';c.lineWidth=1.6/z;c.setLineDash(al?[8/z,5/z]:[]);c.stroke();c.setLineDash([]);
   c.beginPath();c.arc(B.x,B.y,3.5/z,0,7);c.fillStyle=al?'#23864a':'#c4281c';c.fill();c.strokeStyle='#fff';c.lineWidth=1/z;c.stroke();}}}
 c.restore();
 const placed=[];const fits=(x,y,w,h)=>{for(const r of placed)if(x<r[0]+r[2]&&x+w>r[0]&&y<r[1]+r[3]&&y+h>r[1])return false;return true;};
 drawJokaku(c,z,lvl,placed);drawYosho(c,z,lvl,placed);
 for(const C of G.CL){const [x,y]=w2s(C.x,C.y);if(x<-40||y<-40||x>VW+40||y>VH+40)continue;const st=S.castles[C.id],k=st.owner;const cap=S.clans[k]&&S.clans[k].cap===C.id;
  const s=(3.6+Math.sqrt(C.koku)*.7)*Math.min(1.9,.65+z*.4)*Math.min(1,z/.4);
  castleIcon(c,x,y,s,deep(k),k===S.player,cap,TK.KOREA_NODES?.[C.id]);}
 const counts={};for(const C of G.CL){const k=S.castles[C.id].owner;counts[k]=(counts[k]||0)+1;}
 const priority=C=>{const k=S.castles[C.id].owner;return (C.id===U.sel?1e6:0)+(k===S.player?1e5:0)+(S.clans[k]?.cap===C.id?counts[k]*1000:0)+C.koku;};
 const order=G.CL.map(C=>({C,p:priority(C)})).sort((a,b)=>b.p-a.p).map(o=>o.C);
 for(const C of order){const st=S.castles[C.id],k=st.owner;const [x,y]=w2s(C.x,C.y);if(x<-80||y<-80||x>VW+80||y>VH+80)continue;
  const gs=G.castleGens(C.id).filter(g=>!G.inTransit(g));const lead=gs.find(g=>G.isLeader(g));const cl=S.clans[k];
  const big=lead&&(z>=.25||k===S.player||U.sel===C.id)&&(G.clanCastles(k).length>=2||k===S.player||U.mode==='pick'||lvl>=1||U.sel===C.id);const im=big?portrait(lead.n,Math.round((lvl===0?15:lvl===1?19:23)*(k===S.player?1.12:1)),true,G.CC(k)):null;
  let didPortrait=false;
  if(big&&!im&&(G.clanCastles(k).length>=2||k===S.player||U.mode==='pick')&&fits(x-40,y-34,80,18)){placed.push([x-40,y-34,80,18]);plate(c,lead.n,x,y-24,k,true);didPortrait=true;}
  if(big&&im){const r=Math.round((lvl===0?15:lvl===1?19:23)*(k===S.player?1.12:1));
   const cand=[[0,-r-32],[-r-34,-r-14],[r+34,-r-14],[0,r+32],[-r-38,10],[r+38,10]];
   const ps0=U.pslot[C.id]||0;const ord=[ps0,...cand.map((_,i)=>i).filter(i=>i!==ps0)];
   for(const ci of ord){const [dx,dy]=cand[ci];const px=x+dx,py=y+dy;const w=Math.max(r*2+8,lead.n.length*12+14),h=r*2+26;if(!fits(px-w/2,py-r-4,w,h))continue;
    placed.push([px-w/2,py-r-4,w,h]);U.pslot[C.id]=ci;
    // 城と肖像を結ぶ線：城の中心から肖像の中心へ向かう同じ直線上で、城の記号の縁から肖像の輪の縁までを途切れなく結ぶ。
    {const L=Math.hypot(dx,dy)||1,ux=dx/L,uy=dy/L,cs=(3.6+Math.sqrt(C.koku)*.7)*Math.min(1.9,.65+z*.4)*.55,sx=x+ux*cs,sy=y+uy*cs,ex=px-ux*(r+1.5),ey=py-uy*(r+1.5);
     if((ex-sx)*ux+(ey-sy)*uy>2){c.save();c.lineCap='round';c.strokeStyle='rgba(42,29,16,.55)';c.lineWidth=3;c.beginPath();c.moveTo(sx,sy);c.lineTo(ex,ey);c.stroke();c.strokeStyle='rgba(240,214,140,.95)';c.lineWidth=1.3;c.stroke();c.beginPath();c.arc(sx,sy,1.8,0,7);c.fillStyle='rgba(240,214,140,.95)';c.fill();c.restore();}}
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
 for(const st of (S.sites||[])){if(S.t-st.t>540)continue;const C=G.C[st.at];let [x,y]=st.x!=null?w2s(st.x,st.y2):w2s(C.x+14,C.y+12);if(x<-80||y<-40||x>VW+80||y>VH+40)continue;
  const fade=Math.max(.35,1-(S.t-st.t)/540);c.globalAlpha=fade;c.save();c.translate(x,y);c.strokeStyle='#7a1c12';c.lineWidth=2.6;c.lineCap='round';c.beginPath();c.moveTo(-7,-7);c.lineTo(7,7);c.moveTo(7,-7);c.lineTo(-7,7);c.stroke();c.restore();
  c.font='800 12px "Shippori Mincho B1",serif';c.textBaseline='middle';const t=st.n+'の戦い';const label=/戦い|変|城|攻め|平定|乱|殺し|開城|落城|征伐|一揆/.test(st.n)?st.n:t;c.lineWidth=3.4;c.strokeStyle='rgba(255,248,230,.95)';c.strokeText(label,x+11,y+1);c.fillStyle='#7a1c12';c.fillText(label,x+11,y+1);c.font='600 10px "Zen Kaku Gothic New",sans-serif';c.lineWidth=3;c.strokeText(st.y+'年',x+11,y+14);c.fillStyle='#5a3a26';c.fillText(st.y+'年',x+11,y+14);c.globalAlpha=1;}
 c.restore();
}
// 布陣プレビュー：位置の記録がない側は地図の点にせず、合戦地に添えた札へ陣営ごとに名前を並べる。
function renderDeployNote(){const el=$('#deployNote');if(!el)return;const P=U.deploymentPreview;const rows=P&&P.t===S?.t&&G.deploymentUnlocated?G.deploymentUnlocated(P.title):[];
 if(!rows.length){if(!el.hidden){el.hidden=true;el._k='';}return;}
 const site=rows[0].site?w2s(...G.PJ(...rows[0].site)):[VW/2,VH/2];const k=P.title+'|'+rows.map(r=>r.side+r.names.join()).join('/');
 if(el._k!==k){el._k=k;el.innerHTML=`<b>${esc(P.title)}</b><small>持場の記録がない参加者</small>`+rows.map(r=>`<div class="dn-row" style="--army:${r.side==='a'?'#c83339':'#216d9f'}"><i></i><span>${esc(r.name)}</span><em>${esc(r.names.filter(n=>n!==r.name).slice(0,4).join('・'))}${r.names.length>4?' ほか'+(r.names.length-4)+'名':''}</em></div>`).join('');}
 el.hidden=false;el.style.left=Math.round(Math.max(8,Math.min(VW-el.offsetWidth-8,site[0]+28)))+'px';el.style.top=Math.round(Math.max(8,Math.min(VH-el.offsetHeight-90,site[1]-el.offsetHeight/2)))+'px';}
// 画面外の隊は実位置を変えず、方向・隊数だけを端に示す。
function renderArmyEdges(groups,a,units){const el=$('#armyEdges');if(!el)return;
 const positions={left:[a.left,a.top+a.height/2,'translateY(-50%)','◀'],right:[a.left+a.width,a.top+a.height/2,'translate(-100%,-50%)','▶'],top:[a.left+a.width/2,a.top,'translateX(-50%)','▲'],bottom:[a.left+a.width/2,a.top+a.height,'translate(-50%,-100%)','▼'],more:[a.left+a.width,a.top+a.height,'translate(-100%,-100%)','一覧']};
 const html=U.mode!=='game'?'':Object.entries(groups).filter(([,ps])=>ps.length).map(([side,ps])=>{const [x,y,tr,arrow]=positions[side];const names=ps.map(p=>{const u=units.find(u=>u.id===p.id);return u?.commanders?.join('・')||u?.gens.map(id=>G.gen(id)?.n).filter(Boolean).join('・')||G.CNK(u?.clan);});return `<button data-act="army-edge" data-side="${side}" style="left:${Math.round(x)}px;top:${Math.round(y)}px;transform:${tr}" title="${esc(names.join('／'))}" aria-label="${side==='more'?'密集して表示できない軍勢':'画面外の軍勢'} ${ps.length}隊">${arrow} ${ps.length}隊</button>`;}).join('');
 if(el._html!==html){el._html=html;el.innerHTML=html;}
}
// 経路の向きは平滑化し、名札は水平に保つ。
const ANG=new Map();
function relation(k){return G.relationKind(S.player,k);}
const troopScale=t=>Math.max(.9,Math.min(1.15,1+.06*Math.log2(Math.max(1000,t)/4000)));
function drawCounter(c,x,y,u,mine,lvl,compact=false){const t2=G.armOf(u),identity=G.armyIdentity(u);const k=(lvl===0?.85:lvl===1?1:1.2)*troopScale(u.troops),INK='#2a1d10';
 const world=u._displayPoint||unitPos(u),line=G.historyGeometry?.(u)||(u.state==='march'&&u.path?.length>1?G.visualEdgeGeo(u.path[u.seg],u.path[Math.min(u.seg+1,u.path.length-1)]):null);const heading=G.visualCounterHeading?.(line,world,cam.z)??u._displayAngle??world[2];if(Number.isFinite(heading))ANG.set(u.id,heading);const ang=(heading??ANG.get(u.id)??-Math.PI/2)+Math.PI/2;const bw=32*k,bh=21*k,hh=10*k;
 if(u.state==='battle'){const p=.5+.5*Math.sin(tNow/90+u.id);c.beginPath();c.arc(x,y,22*k+p*5,0,7);c.fillStyle=`rgba(255,110,50,${.18+p*.22})`;c.fill();}
 // 陣立図ふうの駒：家の色の地に上からの淡い光（立体の影ではない）と墨線一本。
 c.save();c.translate(x,y);c.rotate(ang);
 const shape=()=>TKCounter.path(c,bw,bh);
 shape();c.fillStyle=identity.color;c.fill();
 c.save();shape();c.clip();const tint=c.createLinearGradient(0,-bh*.55,0,bh*.55);tint.addColorStop(0,'rgba(255,255,240,.20)');tint.addColorStop(.5,'rgba(255,255,240,0)');tint.addColorStop(1,'rgba(30,15,0,.14)');c.fillStyle=tint;c.fillRect(-bw,-bh,bw*2,bh*2);c.restore();
 shape();c.lineJoin='round';c.lineWidth=mine?2.4:1.7;c.strokeStyle=mine?'#d9b866':INK;c.stroke();
 c.restore();
 // 兵種は駒の中。向きが変わっても文字は回さない。
 c.font=`800 ${Math.round((compact?9:12)*k)}px ${compact?'"Zen Kaku Gothic New",sans-serif':'"Shippori Mincho B1",serif'}`;c.textAlign='center';c.textBaseline='middle';const rgb=identity.color.slice(1).match(/.{2}/g)?.map(v=>parseInt(v,16));c.fillStyle=rgb&&rgb.length===3&&rgb[0]*.299+rgb[1]*.587+rgb[2]*.114>160?INK:'#fff7e2';c.fillText(compact?(u.troops?(u.hist?'約':'')+man(u.troops):'—'):G.ARMS[t2].k,x,y+1*k);
 // 幟：駒の右肩に立て、上に家紋（なければ家名の一字）、下に陣営色の帯。画素に合わせて線をにじませない。
 const crest=G.kamonImage(G.armyCrestKey(u),14*k),px=Math.round(x+bw/2+5*k)+.5,top=Math.round(y-34*k)+.5,fw=Math.round(15*k),fh=Math.round(30*k);
 c.save();c.strokeStyle=INK;c.lineWidth=1.2;c.beginPath();c.moveTo(px,y+10*k);c.lineTo(px,top-4*k);c.stroke();c.fillStyle=INK;c.beginPath();c.arc(px,top-4.5*k,1.6*k,0,7);c.fill();
 c.fillStyle='#fdf7e6';c.fillRect(px+1,top,fw,fh);c.fillStyle=identity.color;c.fillRect(px+1,top+fh-5*k,fw,5*k);c.strokeStyle=INK;c.lineWidth=1;c.strokeRect(px+1,top,fw,fh);
 if(crest)c.drawImage(crest,px+1+(fw-14*k)/2,top+2*k,14*k,14*k);else{c.fillStyle=deep(u.clan);c.font=`800 ${Math.round(10*k)}px "Shippori Mincho B1",serif`;c.textAlign='center';c.textBaseline='middle';c.fillText(({joseon:'朝',ming:'明'})[u.clan]||G.CN(u.clan).replace(/家$/,'').slice(0,1),px+1+fw/2,top+9*k);}
 c.restore();
 // 大将の顔は駒の左、中央の高さ。
 const g=G.gen(u.gens[0])||(u.commanders?.length?{n:u.commanders[0],clan:u.clan}:null),im=g&&hasFace(g.n)&&(lvl>=1||G.isLeader(g))?portrait(g.n,Math.round(10*k),true,G.CC(u.clan)):null;
 if(im)c.drawImage(im,x-bw/2-im.css*.78,y-im.css/2-2*k,im.css,im.css);
 if(compact){c.textAlign='left';return;}
 // 名札一枚：上段に大将の名、下段に兵数。生成りの札に墨の枠、左端に家の色。
 const name=lvl>=1&&g?g.n:'',txt=u.troops?(u.hist?'約':'')+man(u.troops):'兵数未詳';c.font=`700 ${Math.round(11*k)}px "Shippori Mincho B1",serif`;const w1=name?c.measureText(name).width:0;c.font=`800 ${Math.round(10.5*k)}px "Shippori Mincho B1",serif`;const w2=c.measureText(txt).width;
 const tw=Math.round(Math.max(w1,w2)+12*k),th=Math.round((name?26:14)*k),tx=Math.round(x-tw/2)+.5,ty=Math.round(y+Math.hypot(bw/2,bh/2+hh/2)+3*k)+.5;
 c.fillStyle='rgba(253,247,230,.96)';c.fillRect(tx,ty,tw,th);c.strokeStyle=mine?'#d9b866':INK;c.lineWidth=mine?1.4:1;c.strokeRect(tx,ty,tw,th);c.fillStyle=identity.color;c.fillRect(tx,ty,3*k,th);
 c.textAlign='center';c.textBaseline='middle';c.fillStyle=INK;if(name){c.font=`700 ${Math.round(11*k)}px "Shippori Mincho B1",serif`;c.fillText(name,x+1.5*k,ty+7*k);}c.font=`800 ${Math.round(10.5*k)}px "Shippori Mincho B1",serif`;c.fillText(txt,x+1.5*k,ty+(name?19.5:7)*k);
 if(u.state==='siege'||u.state==='battle'){c.strokeStyle='#c4281c';c.lineWidth=2;const sx=x-bw/2-4*k,sy=y-bh/2-6*k;c.beginPath();c.moveTo(sx-4,sy-4);c.lineTo(sx+4,sy+4);c.moveTo(sx+4,sy-4);c.lineTo(sx-4,sy+4);c.stroke();}
 c.textAlign='left';
}

/* ===== 入力 ===== */
const ptrs=new Map();let drag=null,moved=false,pinch=null;
top_.addEventListener('pointerdown',e=>{top_.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});moved=false;
 if(ptrs.size===1)drag={x:e.clientX,y:e.clientY,cx:cam.x,cy:cam.y};
 if(ptrs.size===2){const [a,b]=[...ptrs.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y),z:cam.z};moved=true;}});
let hoverEv=null,hoverRaf=0,topRect=null;addEventListener('resize',()=>{topRect=null;});
function hoverFrame(){hoverRaf=0;const e=hoverEv;if(!e||ptrs.size)return;const r=topRect||(topRect=top_.getBoundingClientRect());const army=hitArmy(e.clientX-r.left,e.clientY-r.top);if(army){top_.style.cursor='pointer';tipArmy(army,e);return;}const h=hit(e.clientX-r.left,e.clientY-r.top);if(h!==U.hover){U.hover=h;top_.style.cursor=h?'pointer':'grab';}const y=hitY(e.clientX-r.left,e.clientY-r.top);if(y){tipY(y,e);return;}tip(h,e);}
top_.addEventListener('pointermove',e=>{
 if(!ptrs.has(e.pointerId)){hoverEv=e;if(!hoverRaf)hoverRaf=requestAnimationFrame(hoverFrame);return;}
 if(false){const r=top_.getBoundingClientRect();const army=hitArmy(e.clientX-r.left,e.clientY-r.top);if(army){top_.style.cursor='pointer';tipArmy(army,e);return;}const h=hit(e.clientX-r.left,e.clientY-r.top);if(h!==U.hover){U.hover=h;top_.style.cursor=h?'pointer':'grab';}const y=hitY(e.clientX-r.left,e.clientY-r.top);if(y){tipY(y,e);return;}tip(h,e);return;}
 ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(pinch&&ptrs.size===2){beginZoom();const [a,b]=[...ptrs.values()];cam.z=pinch.z*Math.hypot(a.x-b.x,a.y-b.y)/pinch.d;clampCam();return;}
 if(drag){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>5)moved=true;if(moved){anim=null;cam.x=drag.cx-dx/cam.z;cam.y=drag.cy-dy/cam.z;clampCam();tip(null);}}});
const endPtr=e=>{const tap=ptrs.size===1&&!moved;ptrs.delete(e.pointerId);if(ptrs.size<2)pinch=null;if(!ptrs.size)drag=null;
 if(tap&&e.type==='pointerup'){const r=top_.getBoundingClientRect();onTap(e.clientX-r.left,e.clientY-r.top);}};
top_.addEventListener('pointerup',endPtr);top_.addEventListener('pointercancel',endPtr);
top_.addEventListener('pointerleave',()=>{U.hover=null;tip(null);});
let zoomFinish;
function beginZoom(){U.zoomUntil=performance.now()+260;clearTimeout(zoomFinish);zoomFinish=setTimeout(()=>{U.zoomUntil=0;U.baseDirty=true;},270);}
top_.addEventListener('wheel',e=>{e.preventDefault();beginZoom();const r=top_.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top;const [wx,wy]=s2w(mx,my);
 cam.z*=Math.exp(-e.deltaY*.0015);clampCam();const [nx,ny]=s2w(mx,my);cam.x+=wx-nx;cam.y+=wy-ny;clampCam();anim=null;},{passive:false});
function hit(sx,sy){if(!S)return null;let best=null,bd=16*16;for(const C of G.CL){const [x,y]=w2s(C.x,C.y);const d=(x-sx)**2+(y-sy)**2;if(d<bd){bd=d;best=C.id;}}
 if(best)return best;const [wx,wy]=s2w(sx,sy);bctx.setTransform(1,0,0,1,0,0);if(!bctx.isPointInPath(landFor(Math.max(cam.z,4)),wx,wy))return null;for(const C of G.CL)if(bctx.isPointInPath(TERR[C.id],wx,wy))return C.id;return null;}
const tipEl=$('#tip');
function hitArmy(x,y){return U.mode==='game'&&U.armyGroups?.filter(g=>Math.hypot(g.x-x,g.y-y)<24).sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0];}
function armyDepartureText(u){
 const start=u.schedule?.start;
 if(!Number.isFinite(start)||G.isHistoryReturning(u))return '';
 return `${u.depart?'出陣':'出陣（推定）'}：${G.dstr(start)}`;
}
function tipArmy(group,e){const ids=group.members.map(m=>m.id),units=(U.mapUnits||[]).filter(u=>ids.includes(u.id));tipEl.innerHTML=units.map(u=>{const n=u.commanders||u.gens.map(id=>G.gen(id)?.n).filter(Boolean),identity=G.armyIdentity(u),relation=G.relationKind(S.player,identity.command),departure=armyDepartureText(u);return `<div class="tph">${n[0]?faceHTML(n[0],'sm',u.clan):''}${kamonHTML(G.armyCrestKey(u),24)}<div><b>${esc(n.join('・')||G.CNK(u.clan)+'軍')}</b><span>${esc(identity.name)} ・ ${esc(relation.name)}</span></div></div><p>${esc(G.marchPhase(u).name)}${u.troops?' ・ '+man(u.troops):''} ・ 士気${Math.round(u.morale||0)}</p><p>目的地：${esc(G.marchDestination(u))}</p>${departure?`<p>${esc(departure)}</p>`: ''}`;}).join('');tipEl.hidden=false;placeTip(e);}
function hitY(sx,sy){if(!S||cam.z<.6)return null;let best=null,bd=10*10;for(const y of (G.YOSHO||[])){const [x,yy]=w2s(y.x,y.y);const d=(x-sx)**2+(yy-sy)**2;if(d<bd){bd=d;best=y;}}return best;}
// 施設の詳しい様子
function tipY(y,e){if(!y||(e&&e.pointerType==='touch')||U.mode==='title'){tipEl.hidden=true;return;}const v=G.sitePresentation(y),level=G.siteLevel(y);tipEl.innerHTML=`<div class="tph"><div><b>${esc(v.title)}</b><span>${esc(v.role)}${G.yActive(y)?' ・ Lv.'+level:''}</span></div></div><p>${esc(v.description)}</p>${v.state?'<p>'+esc(v.state)+'</p>':''}${G.yActive(y)?'<span class="tdl">'+esc(G.infrastructureText('site',y.id))+'</span>':''}`;tipEl.hidden=false;placeTip(e);}
function placeTip(e){let x=e.clientX+14,y=e.clientY+14;const w=tipEl.offsetWidth,h=tipEl.offsetHeight;if(x+w>VW-8)x=e.clientX-w-14;if(y+h>VH-8)y=VH-h-8;tipEl.style.left=Math.max(8,x)+'px';tipEl.style.top=Math.max(8,y)+'px';}

function tip(id,e){if(!id||!S||(e&&e.pointerType==='touch')||U.mode==='title'||id===U.sel){tipEl.hidden=true;return;}const st=S.castles[id],k=st.owner;const gs=G.castleGens(id);
 // 城の詳しい様子：持ち主と当主、城主、兵・堅さ・石高・民忠、囲む軍勢、向かってくる軍勢
 const cl=S.clans[k];const L=cl&&G.gen(cl.leader);const lord=gs.slice().sort((a,b)=>(b.t+b.b)-(a.t+a.b))[0];const me=S.player;
 const rel=relation(k).name;
 const sieg=S.units.filter(u=>u.state==='siege'&&u.path[u.path.length-1]===id);const inc=S.units.filter(u=>u.state==='march'&&u.path[u.path.length-1]===id&&u.clan!==k);
 const gn=u=>u.gens.map(g=>(G.gen(g)||{}).n).filter(Boolean)[0]||'';
 tipEl.innerHTML=`<div class="tph">${lord?faceHTML(lord.n,'sm',k):''}<div><b>${esc(G.cname(id))}${cl&&cl.cap===id?' <em class="tcap">本拠</em>':''}</b><span>${esc(G.C[id].prov)}国 ・ ${G.CNK(k)}（${esc(rel)}）</span></div></div>
  <span>当主 ${esc(L?L.n:'—')}${lord&&(!L||lord.id!==L.id)?` ・ 城主 ${esc(lord.n)}`:''}</span>
  <dl class="tdl"><dt>兵</dt><dd>${fmt(st.troops)}</dd><dt>堅さ</dt><dd>${fmt(st.dur)}</dd><dt>石高</dt><dd>${Math.round(st.koku)}万石</dd><dt>民忠</dt><dd>${Math.round(st.loyal)}</dd></dl>
  ${gs.length>1?`<span>在城 ${gs.slice(0,4).map(g=>esc(g.n)).join('、')}${gs.length>4?' ほか'+(gs.length-4)+'人':''}</span>`:''}
  ${sieg.length?`<span class="tw">囲まれている：${sieg.map(u=>`${G.CN(u.clan)} ${man(u.troops)}${gn(u)?'（'+esc(gn(u))+'）':''}`).join('、')}</span>`:''}
  ${inc.length?`<span class="tw">向かってくる：${inc.map(u=>`${G.CN(u.clan)} ${man(u.troops)}`).join('、')}</span>`:''}`;
 tipEl.hidden=false;const r=top_.getBoundingClientRect();const tw=tipEl.offsetWidth||230,th=tipEl.offsetHeight||100;let x=e.clientX-r.left+14,y=e.clientY-r.top+14;const lim=side.hidden?VW:side.getBoundingClientRect().left-r.left;if(x+tw>lim-6)x=e.clientX-r.left-tw-14;tipEl.style.left=Math.max(6,x)+'px';tipEl.style.top=Math.max(6,Math.min(VH-th-6,y))+'px';}
function onTap(sx,sy){const group=U.armyGroups?.filter(p=>Math.abs(p.x-sx)<48&&sy>p.y-40&&sy<p.y+48).sort((a,b)=>Math.hypot(a.x-sx,a.y-sy)-Math.hypot(b.x-sx,b.y-sy))[0];if(group&&U.mode==='game'){const near=U.armyGroups.filter(p=>Math.hypot(p.x-group.x,p.y-group.y)<18);openModal('army-list',{ids:[...new Set(near.flatMap(p=>p.members.map(m=>m.id)))],sameLocation:near.every(p=>Math.hypot(p.x-group.x,p.y-group.y)<1),nearby:true});return;}const id=hit(sx,sy);if(U.mode==='game'&&!U.modal){const y=hitY(sx,sy);if(y&&y.kind==='城'&&G.yActive(y)){openModal('branch',{id:y.id});return;}}
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
let last=performance.now(),camSig='',hold=0,topSig='',lastTop=0,lastStill=0,topAnimated=false,lastMotion='';
// 前回描いた隊と移動中の人物の画面位置（半画素単位）。変わらなければ動く層を描き直さない。
function motionSig(){if(!S)return '';vcMemo=vcCalc();try{let s='';for(const u of U.mapUnits||[]){const p=unitPos(u);if(!p)continue;const q=w2s(p[0],p[1]);s+=Math.round(q[0]*2)+','+Math.round(q[1]*2)+';';}
 for(const g of S.gens){if(!G.inTransit(g))continue;const p=G.personPoint(g);if(!p)continue;const q=w2s(p[0],p[1]);s+=Math.round(q[0]*2)+','+Math.round(q[1]*2)+';';}return s;}finally{vcMemo=null;}}U.drawStats={base:0,top:0,still:0};
function loop(now){
 const dt=Math.min(.25,(now-last)/1000);last=now;tNow=now;
 if(anim){anim.t+=dt*2.4;const k=Math.min(1,anim.t),e=1-Math.pow(1-k,3);cam.x+=(anim.x-cam.x)*e;cam.y+=(anim.y-cam.y)*e;cam.z+=(anim.z-cam.z)*e;if(k>=1)anim=null;clampCam();}
 if(U.mode==='game'&&S&&!S.over&&!U.modal){
  if(hold>0)hold-=dt;
  else if(U.speed>0){U.acc+=dt*SPEEDS[U.speed]/4;let n=0;while(U.acc>=1&&n<140&&!U.modal&&hold<=0){G.day();U.acc--;n++;snapMaybe();if(S.over||S.unified||S.observerQ?.length||S.sceneQ?.length)break;}if(n){tick();renderTL();}}
 }
 if(U.mode==='game'&&S&&!U.modal&&S.sceneQ?.length&&(!U.deploymentPreview||now>=U.deploymentPreview.until))tick();
 if(U.mode==='game'&&S&&(S.over||S.unified)&&!U.ended&&!U.modal){U.ended=true;setTimeout(()=>openModal('end'),900);}
 const sig=cam.x.toFixed(2)+cam.y.toFixed(2)+cam.z.toFixed(4)+VW+VH+(U.sel?1:0);if(sig!==camSig){camSig=sig;U.baseDirty=true;}
 const dirty=U.baseDirty;if(dirty){drawBase();U.drawStats.base++;}
 const ts=[camSig,S?.t,U.hover,U.mode,U.pickClan,U.dipView,U.sel,U.picking].join('|');
 // 静止層は日付・視点・選択が変わった時（再生中は念のため1秒ごとにも）だけ描き直し、再生中は動く層だけを約30回/秒で重ねる。
 const still=dirty||ts!==topSig||(U.speed>0&&now-lastStill>1000);
 // 低速では駒が半画素も動かないフレームが多いので、画面上の位置が変わらない間は描かない。
 const due=!U.modal&&U.speed>0&&now-lastTop>33,motion=still||due?motionSig():'';
 // 攻城の輪・煙・交戦の明滅だけが動いている間は約20回/秒で足りる。
 if(still||due&&(motion!==lastMotion||topAnimated&&now-lastTop>50)){topAnimated=drawTop(still);U.drawStats.top++;lastTop=now;lastMotion=motion;if(still){lastStill=now;topSig=ts;}}
 // 停止して何も変わらない状態が続いたら、毎フレームの呼び出しをやめて0.2秒ごとの確認に落とす。操作が来たらすぐ戻す。
 if(dirty||still||anim||U.speed>0||hold>0||ptrs.size||S?.sceneQ?.length||U.deploymentPreview&&now<U.deploymentPreview.until)lastBusy=now;
 if(now-lastBusy>1500){loopSleeping=true;loopTimer=setTimeout(wakeLoop,200);}else requestAnimationFrame(loop);
}
let lastBusy=0,loopSleeping=false,loopTimer=0;
function wakeLoop(){if(!loopSleeping)return;loopSleeping=false;clearTimeout(loopTimer);requestAnimationFrame(loop);}
U.wakeLoop=wakeLoop;
for(const type of ['pointerdown','pointermove','wheel','keydown','resize','focus'])addEventListener(type,wakeLoop,{capture:true,passive:true});
let uiT=0,terrSig='';
function territorySignature(){return S?JSON.stringify(S.branches||{})+'|'+G.date().y+'|'+G.CL.map(c=>S.castles[c.id].owner).join(',')+'|'+G.alive().map(k=>S.clans[k].leader).join(',')+'|'+Object.keys(S.ally).filter(k=>S.ally[k]>0).join(',')+'|'+Object.keys(S.war||{}).filter(k=>S.t-S.war[k]<300).join(','):'';}
function tick(){
 const waterPhase=TK.waterPhase?.(G.date().y);if(U.waterPhase!==waterPhase){U.waterPhase=waterPhase;U.baseDirty=true;}
 const sig=territorySignature();if(sig!==terrSig){terrSig=sig;U.baseDirty=true;if(U.dipView){U.blocs=null;setTimeout(renderLegend,0);}}
 const now=performance.now();if(now-uiT>300){uiT=now;renderTop();renderSide();renderNext();}
 if(S.prisonQ.length){S.prisonQ.length=0;G.prisoners(S.player).forEach(g=>G.release(g));}
 if(S.propQ.length&&!U.modal){openModal('prop');}
 if(S.battleQ&&S.battleQ.length&&!U.modal){const q=S.battleQ.shift();if(G.battleInfo(q.a,q.b))openModal('battle',{a:q.a,b:q.b});}
 while(S.sceneQ&&S.sceneQ.length&&!U.modal){const q=S.sceneQ[0],t=typeof q==='string'?q:q.title,b=TK.BATTLES?.[t];if(!b||!sceneWanted(b)){S.sceneQ.shift();continue;}if(!U.deploymentPreview||U.deploymentPreview.title!==t){TKBattleAtlas.preload(t).catch(()=>{});U.deploymentPreview={title:t,t:S.t,until:performance.now()+2400};U.previewSpeed=U.speed;U.speed=0;U.baseDirty=true;renderTop();return;}if(performance.now()<U.deploymentPreview.until)return;S.sceneQ.shift();U.speed=U.previewSpeed||0;openModal('scene',{title:t,triggerT:typeof q==='string'?S.t:q.t});break;}
 if(S.observerQ?.length&&!U.modal)openModal('observer-branch');
 if(S.evQ&&S.evQ.length&&!U.modal){if(G.eventView())openModal('event');else S.evQ.shift();}
 if((S.over||S.unified)&&!U.ended){U.ended=true;setTimeout(()=>openModal('end'),900);}
 if(S.extinct===1&&!U.modal&&!U.ffwd){S.extinct=2;openModal('extinct');}
 if(S.t-(U.lastSave??S.t)>=30)autosave();
}
function setSpeed(v){if(v===0&&U.speed>0)autosave();U.speed=v;if(v>0)U.lastSp=v;renderTop();renderTL&&renderTL();}


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
 while(S.t<lim&&!S.over&&!S.unified&&performance.now()-s0<9000){G.day();n++;
  while(S.evQ&&S.evQ.length){const v=G.eventView();if(!v){S.evQ.shift();continue;}const h=v.opts.findIndex(o=>o.hist);const nd=v.opts.findIndex(o=>!/歴史が分かれる/.test(o.d||''));G.chooseEvent(h>=0?h:(nd>=0?nd:0));}
  if(S.battleQ&&S.battleQ.length){for(const q of S.battleQ){for(const id of [q.a,q.b]){const u=S.units.find(x=>x.id===id);if(u)u.bq=0;}}S.battleQ.length=0;}
  if(S.sceneQ)S.sceneQ.length=0;if(S.propQ)S.propQ.length=0;snapMaybe();}
 }finally{U.ffwd=0;}renderChron();
 terrSig='';U.baseDirty=true;renderAll();renderLegend();renderTL();toast(`${G.dstr()}まで進めた`);if(S.extinct===1&&!U.modal){S.extinct=2;openModal('extinct');}}
// 帯の向きは画面の大きさで決まるので、大きさが変わった時だけ調べる（毎日のスタイル再計算を避ける）。
let tlVKey='',tlVVal=false;function tlV(){const k=innerWidth+'x'+innerHeight;if(k!==tlVKey){tlVKey=k;tlVVal=!!tlEl&&getComputedStyle(tlEl).flexDirection==='column';}return tlVVal;}
function renderTL(){if(!tlEl)return;if(!S||U.mode!=='game'){tlEl.hidden=true;return;}tlEl.hidden=false;
 const [t0,t1]=tlRange();const f=t=>((t-t0)/Math.max(1,t1-t0)*100).toFixed(2)+'%';const V=tlV();const P=V?'top':'left',Z=V?'height':'width';
 {const b0=Math.max(t0,tlBase());const pc=t=>(t-t0)/Math.max(1,t1-t0)*100;for(const [id,t] of [['#tlFill',S.t],['#tlHead',TL.head||S.t]]){const el=$(id);for(const k of ['width','height','left','top'])if(k!==P&&k!==Z)setStyle(el,k,'');setStyle(el,P,pc(b0).toFixed(2)+'%');setStyle(el,Z,Math.max(0,pc(t)-pc(b0)).toFixed(2)+'%');}}
 {const kn=$('#tlKnob');setStyle(kn,V?'left':'top','');setStyle(kn,P,f(S.t));}
 const d=G.date();{const el=$('#tlD'),h=`<b>${G.eraK()}</b><small>${G.monK()}（${d.y}）</small>`;if(el._h!==h){el._h=h;el.innerHTML=h;}}
 setText($('#tlPlay'),U.speed?'❚❚':'▶');setAttr($('#tlPlay'),'aria-label',U.speed?'止める':'進める');
 {const b=$('#tlNow');b.hidden=false;const back=TL.head>S.t+20,title=back?'いちばん新しい時へ戻る':'次の大きな出来事まで進める';if(b.title!==title)b.title=title;setAttr(b,'aria-label',title);}
 // 先の印は TL.head を過ぎた時だけ変わるので、日ごとに作り直さず、残りの印の数と次の印で判定する。
 const fut=tlFuture(),sig=t0+'|'+t1+'|'+tlBase()+'|'+TL.marks.length+'|'+V+'|'+fut.length+'|'+(fut[0]?.t??'');if(TL.sig!==sig){TL.sig=sig;
  const ya=G.date(t0).y,yb=G.date(t1).y;const step=yb-ya>20?5:yb-ya>8?2:1;let h='';for(let y=Math.ceil(ya/step)*step;y<=yb;y+=step){const tt=(y-S.y0)*360+(1-S.m0)*30;if(tt<t0||tt>t1)continue;h+=`<i class="ty" style="${P}:${f(tt)}">${y}</i>`;}
  {const b=tlBase();if(b>t0+20){h+=`<i class="tpre" style="left:0;width:${f(b)}" title="このシナリオより前（押すと史実をたどってその時から始められる）"></i>`;
   {const sn=new Set();for(const e of TK.HIST){if(e.k==='premarch'||!e.title||sn.has(e.title)||!(e.big||/戦い|変|落城|征伐|陣|役|統一/.test(e.title)))continue;sn.add(e.title);const t=G.evT(e);if(t<t0||t>=b)continue;h+=`<i class="tm past" style="left:${f(t)}" title="${esc(G.dstr(t)+' '+e.title)}"></i>`;}}}}
  for(const m of fut){if(m.t<t0||m.t>t1)continue;h+=`<i class="tm fut" style="${P}:${f(m.t)}" title="${esc(G.dstr(m.t)+' '+m.n+'（これから）')}"></i>`;}
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
let pressLock=0;addEventListener('pointerdown',e=>{if(e.target.closest('#me,#drawer,#era,#chron,#pick,#armyDetails'))pressLock=1;},true);addEventListener('pointerup',()=>{setTimeout(()=>{pressLock=0;if(pendingR){pendingR=0;U.baseDirty=true;if(U.mode==='game'){renderTop();renderSide();}}},60);},true);addEventListener('pointercancel',()=>{pressLock=0;},true);
document.addEventListener('change',e=>{if(e.target.id==='compactSpeed')setSpeed(+e.target.value);});
let pendingR=0;window.__pl=()=>pressLock;function setHTML(el,html){if(pressLock){pendingR=1;return false;}if(el._h===html)return false;el._h=html;el.innerHTML=html;return true;}
// 同じ値なら書き換えない（再生中に年表や札の DOM を毎回書き換えない）。
function setText(el,v){if(el&&el.textContent!==v)el.textContent=v;}
function setAttr(el,k,v){if(el&&el.getAttribute(k)!==v)el.setAttribute(k,v);}
function setStyle(el,k,v){if(el&&el.style[k]!==v)el.style[k]=v;}
function histRate(){const ok=S.hOk||0,ng=S.hNg||0;return ok+ng?Math.round(ok/(ok+ng)*100):100;}
function syncHUD(){const era=$('#era'),me=$('#me');if(innerWidth<=820){if(me.parentElement!==era)era.append(me);}else if(me.parentElement===era)$('#app').append(me);}
function renderTop(){
 if(!S||U.mode!=='game')return;const d=G.date(),k=S.player;
 setHTML($('#eraTxt'),`<span class="e1">${G.eraK()}</span><span class="e2">${G.monK()}${G.dayK()}</span><span class="e3" title="1582年10月15日より前はユリウス暦、それ以後はグレゴリオ暦">西暦${G.dstrW()}</span>`);
 document.querySelectorAll('[data-act="speed"]').forEach(b=>{setAttr(b,'aria-pressed',String(+b.dataset.v===U.speed));const cur=!U.speed&&+b.dataset.v===(U.lastSp||1);if(b.classList.contains('cur')!==cur)b.classList.toggle('cur',cur);});
 {const pp=$('#ppBtn');if(pp){setText(pp,U.speed?'❚❚':'▶');if(pp.classList.contains('on')!==!!U.speed)pp.classList.toggle('on',!!U.speed);setAttr(pp,'aria-label',U.speed?'止める':'時を進める');}}
 syncHUD();const alive=S.clans[k]&&S.clans[k].alive,L=alive?G.gen(S.clans[k].leader):null;
 const meHTML=alive?`${L?faceHTML(L.n,'sm',k):''}${kamonHTML(k,24)}<div><b>${G.CNK(k)}</b>${L?officeBadge(L.n):''}<small>城 ${G.clanCastles(k).length} ・ 兵 ${man(G.clanTroops(k))}</small></div>
  ${(()=>{const h=histRate();return `<button type="button" class="hstate ${h<100||S.div[k]?'chg':''}" data-act="open" data-m="histv" title="史実データの確認状況">史実観察</button>`;})()}
  ${S.div[k]?`<button class="mini ${S.auto?'on':''}" data-act="auto" title="自家の戦も自動で行う">${S.auto?'采配を任せている':'自分で采配'}</button>`:''}`:(G.retainer()?(()=>{const R=G.retainer();return `${faceHTML(R.leader,'sm',R.parent)}<div><b>${esc(G.CN(k))}家</b><small>${esc(R.leader)}・${esc(G.CNK(R.parent))}の家臣</small></div>`;})():`<div><b>${k==='__none'?'観察中':'観戦中'}</b><small>${k==='__none'?'家を選ばずに史実を観察':G.CNK(k)+'は滅んだ'}</small></div>`);
 setHTML($('#me'),meHTML+`<span class="tools"><select id="compactSpeed" aria-label="時間の速さ">${[1,2,3,4,5,6,7,8].map(v=>`<option value="${v}" ${v===(U.speed||U.lastSp||1)?'selected':''}>×${SPEEDS[v]}</option>`).join('')}</select><button class="tbtn" type="button" data-act="army-list">軍勢</button><button class="tbtn" type="button" data-act="dipview" aria-pressed="${U.dipView}">${VW<=820?(U.dipView?'標準境界':'関係境界'):(U.dipView?'境界強調を解除':'境界を強調')}</button><button class="tbtn" type="button" data-act="open" data-m="dip">諸家</button><button class="tbtn" type="button" data-act="open" data-m="menu" aria-label="操作と保存">操作</button></span>`);
 if(!renderTop._l||renderTop._l!==innerWidth+'|'+$('#me').offsetHeight){renderTop._l=innerWidth+'|'+$('#me').offsetHeight;requestAnimationFrame(layoutHUD);}
}

/* ===== 年表 ===== */
const chronEl=$('#chron');
function officeBadge(name){const r=G.centralOffice?.(name);return r?`<span class="office-badge" title="${esc(r.polity+'の'+r.office)}">${esc(r.office)}</span>`:'';}
function chronItem(e){const who=e.who&&hasFace(e.who)?e.who:null;
 return `<div class="ci${e.ok?'':' off'}${e.big?' big':''}">${who?faceHTML(who,'sm'):'<span class="dot"></span>'}<div><time>${esc(e.s)}</time>${e.alt?'<em class="alt">もう一つの歴史</em>':''}${e.title?`<b>${esc(e.title)}</b>`:''}<p>${esc(G.playerText(e.text))}</p>${e.ok?'':'<em>歴史が変わり、起きなかった</em>'}</div></div>`;}
function renderChron(){if(!S)return;chronEl._h=null;chronEl.innerHTML=`<h3>年表</h3><div class="clist2">${S.chron.slice(0,14).map(chronItem).join('')||'<p class="hint">時が進むと、ここに出来事が記されていきます。</p>'}</div><div id="next"></div>`;renderNext();}
function renderNext(){const el=$('#next');if(!el||!S)return;const n=G.nextEvents(2);const html=n.length?`<h4>この先の${S.div[S.player]?'歴史':'史実'}</h4>${n.map(e=>`<div class="nx${e.alt?' alt':''}"><time>${e.d[0]}年${e.d[1]}月</time>${esc(e.title)}</div>`).join('')}`:'';if(el._h!==html){el._h=html;el.innerHTML=html;}}
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
 el.innerHTML=`<div class="bmain">${who?faceHTML(who,'xl'):''}<div><small>${esc(e.s)}</small><h2>${esc(e.title)}</h2><p>${esc(G.playerText(e.text))}</p></div></div>${rest?`<div class="bstk"><small class="bsh">相前後して</small>${rest}</div>`:''}`;
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
 const credit=R($('#credit'));$('#app').style.setProperty('--credit-reserve',Math.ceil(credit?.height||0)+8+'px');
 const re=R(era);if(!re)return;
 syncHUD();if(narrow){me.style.top='';if(ch)ch.style.top='';}else{me.style.top='';if(ch&&getComputedStyle(ch).top!=='auto')ch.style.top=Math.round(re.bottom+8)+'px';}
 const rm=R(me);let topBand=Math.max(re.bottom,rm?rm.bottom:0);const lg=$('#legend');if(lg){lg.style.top=narrow?Math.round(topBand+8)+'px':'';if(narrow&&U.dipView)topBand=Math.max(topBand,lg.getBoundingClientRect().bottom); }U.hudTop=topBand+8;U.baseDirty=true;
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
  if(mine)btn=`${impactHTML([S.player])}<button class="act" data-act="build" data-id="${id}" ${S.clans[S.player].gold<c.gold?'disabled':''}><b>築城</b><small>金${fmt(c.gold)} ・ ${Math.round(c.days/30)}か月</small></button>`;}
 else if(o&&o.burnt)line=`<p class="jline burnt">戦火で焼け落ち、堅さが落ちている</p>`;
 return {line,btn};}
function renderSide(){
 if(U.mode!=='game')return;
 document.body.classList.toggle('narrowSel',!!U.sel&&VW<1200&&VW>820);document.body.classList.toggle('mobsel',!!U.sel&&VW<=820);
 if(!U.sel){side.hidden=true;return;}side.hidden=false;
 const id=U.sel,C=G.C[id],c=S.castles[id],k=c.owner,cl=S.clans[k],me=S.player,mine=k===me,alive=S.clans[me]&&S.clans[me].alive;
 const gs=G.castleGens(id).sort((a,b)=>(G.isLeader(b)-G.isLeader(a))||(hasFace(b.n)-hasFace(a.n))||(b.t+b.b+b.c+b.s)-(a.t+a.b+a.c+a.s));
 const lord=gs[0];const bes=G.unitAt(id).filter(u=>u.clan!==k);
 let threat=0;for(const n of G.ADJ[id]){const o=S.castles[n].owner;if(o!==k&&!G.allied(k,o))threat+=S.castles[n].troops;}
 const rel=mine||!alive?'':`<span class="rtag" style="color:${relation(k).color}">${relation(k).name}</span>`;
 let acts='';const jok=jokakuInfo(id,mine);
 if(alive&&!TK.HISTORY_ONLY){
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
 <div class="ctop"><h2 class="cname">${esc(G.cname(id))}</h2><div class="crow"><span class="cplate" style="--c:${deep(k)}">${G.CNK(k)}${cl.cap===id?' ・ 本拠':''}</span><small>${esc(C.prov)}${TK.KOREA_NODES?.[id]?'道':'国'}</small>${rel}</div></div>
 ${TK.KOREA_NODES?.[id]?'<p class="note">朝鮮の拠点区分：'+esc(TK.KOREA_NODES[id][0])+'. 日本の本城・支城制度とは区別します。</p>':''}<div class="lord">${lord?faceHTML(lord.n,'lg',k):''}<div class="lordtx">${lord?`<b>${esc(lord.n)}</b><small>${G.isLeader(lord)?'当主':'城主'} ${G.ageLabel(lord)} ・ 統${lord.t} 武${lord.b} 知${lord.c}</small>`:'<small>城代が守る</small>'}
  ${gs.length>1?`<div class="gfaces">${gs.slice(1,8).map(g=>`<span title="${esc(g.n)}">${faceHTML(g.n,'sm',k)}</span>`).join('')}${gs.length>8?`<em>+${gs.length-8}</em>`:''}</div>`:''}</div></div>
 ${bes.length?`<div class="alert">${bes.map(u=>`${G.CN(u.clan)}軍 ${man(u.troops)}（${(G.TACTICS[u.tac]||G.TACTICS.chikara).n}）`).join('、')}に囲まれている</div>`:''}
 <div class="nums"><div><span>兵</span><b>${man(c.troops)}</b></div><div><span>堅さ</span><b>${fmt(c.dur)}</b></div><div><span>石高</span><b>${c.koku}<i>万石</i></b></div><div class="${threat>c.troops?'warn':''}"><span>隣の敵兵</span><b>${man(threat)}</b></div></div>
 ${G.historicalGarrison?.(id)?`<div class="alert"><b>この時期の史実の守備</b><p>${esc(G.historicalGarrison(id).join("・"))}</p><button class="mini" data-act="battle-view" data-title="伏見城の戦い">伏見城の攻防と出典</button></div>`:""}${terrLine(id)}${yoshoLine(id)}${branchHTML(id)}${jok.line}${acts}`);
}
function castleEvidenceHTML(y,descriptionShown=false){const e=G.castleEvidence(y);return e?`<p class="note"><b>史実上の役割：${esc(e.role)}</b>${descriptionShown?'':'<br>'+esc(e.description)}<br><a href="${esc(e.source)}" target="_blank" rel="noopener noreferrer" style="color:var(--gold2)">出典を読む</a></p>`:'';}
function branchHTML(id){const ys=G.yoshoOf(id).filter(y=>y.kind==='城'&&G.yActive(y));if(!ys.length)return '';if(TK.HISTORY_ONLY)return `<details><summary>周辺の城郭（${ys.length}）</summary>${ys.map(y=>`<div class="note"><b>${esc(y.n)}</b><p>${esc(G.sitePresentation(y).description)}</p>${castleEvidenceHTML(y,true)}${G.yOwner(y)===S.player?`<button class="mini" data-act="open" data-m="infrastructure" data-kind="site">施設の整備</button>`:''}</div>`).join('')}</details>`;
 return `<details><summary>追加拠点の支配と攻略（${ys.length}）</summary><p class="hint">支城の範囲は距離をもとに分けたゲーム上の仮の領域です。攻略するとその範囲の色と支城の収入が移り、敵の本城への防御補正を減らせます。本城の城主は変わりません。</p>${ys.map(y=>{const b=G.branchUnit(y.id)||S.branchSieges?.find(b=>b.id===y.id),r=G.branchOffer(y.id);return `<div class="note"><b>${esc(y.n)}</b> ・ ${esc(G.CNK(G.yOwner(y)))}<small style="display:block">${esc(y.desc)}</small>${b?`<p class="hint">${esc(G.CNK(b.clan))}が攻略中・${b.end?'あと'+Math.max(0,b.end-S.t)+'日':'兵'+fmt(b.troops)+'・士気'+Math.round(b.morale)}</p>`:G.yOwner(y)!==S.player?`<button class="mini" data-act="branch" data-id="${esc(y.id)}" ${r.ok?'':'disabled'}>支城の攻略</button><p class="hint">${r.ok?'通常軍勢で出陣します。兵糧・武将・守備兵によって日数と損害が変わります。':esc(r.msg)}</p>`:''}</div>`;}).join('')}</details>`;}
MODALS.branch=d=>{const y=G.YOSHO.find(y=>y.id===d.id);return `<header><h2>${esc(y?G.sitePresentation(y).title:'施設')}</h2><button class="ic" data-act="close" aria-label="閉じる">×</button></header>${y?`<p>${esc(G.dstr())}</p><p>${esc(G.sitePresentation(y).description)}</p><p>${esc(G.sitePresentation(y).state)}</p>${castleEvidenceHTML(y,true)}`:''}`;};
function renderAll(){U.baseDirty=true;renderTop();renderChron();renderSide();}
// 攻め先へ兵を出せる自城（2つ先まで、自領を通って行ける城）
// 同盟国の領内も、通行の許しが出れば通れる（3つ先まで）
function reachable(to){const me=S.player;return G.clanCastles(me).filter(m=>{if(S.castles[m].troops<1000||!G.idleGens(m).length)return false;if(G.ADJ[m].includes(to))return true;const p=G.findPath(m,to,me,'own')||G.findPath(m,to,me,'pass');return p&&p.length<=4;});}
function routeNote(m,to){if(G.ADJ[m].includes(to))return '隣接';const me=S.player;if(G.findPath(m,to,me,'own'))return '自領を通って';const p=G.findPath(m,to,me,'pass');if(!p)return '';const ks=[...new Set(p.slice(1,-1).map(id=>S.castles[id].owner).filter(o=>o!==me))];return ks.map(k=>G.CNK(k)).join('・')+'の領内を通って（通行の許し）';}

function impactHTML(keys){const ks=[...new Set(keys)].filter(k=>S.clans[k]&&!S.div[k]);return ks.length?`<p class="note">歴史への影響：実行すると${ks.map(k=>esc(G.CNK(k))).join('・')}が史実の筋書きを離れる場合があります。以後の史実の一部は起きなくなり、各家が独自に動きます。</p>`:'<p class="hint">関係する家はすでに史実の筋書きを離れています。</p>';}
/* ===== 操作 ===== */
document.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b||b.disabled)return;const f=ACT[b.dataset.act];if(f)f(b,e);});
document.addEventListener('change',e=>{const b=e.target.closest('[data-src]');if(!b||!U.atk)return;if(b.checked)U.atk.src.add(b.dataset.src);else U.atk.src.delete(b.dataset.src);updAtk();});
const ACT={
 'branch-withdraw':b=>{const r=G.withdrawBranch(b.dataset.id);closeModal();toast(r.msg,r.ok?'good':'bad');renderAll();},
 'branch-tac':b=>{U.mdata.tac=b.dataset.v;renderModal();},
 evpick:b=>{const m=G.chooseEvent(+b.dataset.i);closeModal();if(m)toast(m,'good');renderAll();U.baseDirty=true;},
 dipview:()=>{U.dipView=!U.dipView;document.body.classList.toggle('dipv',U.dipView);U.baseDirty=true;drawBase();renderTop();renderLegend();},
 branch:b=>openModal('branch',{id:b.dataset.id}),
 'branch-go':b=>{const r=G.attackBranch(b.dataset.id,S.player,U.mdata.tac||'chikara');closeModal();toast(r.msg,r.ok?'good':'bad');renderAll();U.baseDirty=true;},
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
   closeModal();U.sel=null;terrSig='';U.baseDirty=true;U.ended=false;renderAll();renderLegend();renderTL();toast(`${G.dstr()}の天下を開いた。史実の観察を続けます`);};
  setTimeout(step,20);},
 ffgo:b=>{const t=+b.dataset.t;closeModal();setTimeout(()=>tlForward(t),30);},
 mapstyle:()=>{U.mapStyle=U.mapStyle==='relief'?'flat':'relief';if(U.mapStyle==='relief')ensureLand();try{localStorage.setItem('tenka-mapstyle2',U.mapStyle);}catch(e){}U.baseDirty=true;drawBase();renderModal();},
 setting:b=>{const k=b.dataset.k;S.settings=S.settings||{};S.settings[k]=S.settings[k]===false;renderModal();},
 'prop':b=>{const p=S.propQ.shift();if(b.dataset.t==='yes'){S.ally[G.ekey(S.player,p.from)]=720;G.addRel(S.player,p.from,10);toast(`${G.CNK(p.from)}と同盟`,'good');}closeModal();},
 open:b=>{const name=b.dataset.m;if(U.modal&&name!=='menu'){(U.modalTrail||=[]).push({name:U.modal,data:U.mdata});openModal(name,{},true);}else openModal(name);},
 save:b=>{const ok=doSave(+b.dataset.v);renderModal();if(ok)toast('保存しました','good');},
 export:()=>exportSave(),
 import:()=>importSave(),
 load:b=>{if(doLoad(b.dataset.v)){closeModal();toast('読み込みました','good');}},
 'to-title':()=>{autosave();closeModal();showTitle();},
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
 ${impactHTML([S.player,S.castles[a.to].owner])}<footer><button class="btn" data-act="close">やめる</button><button class="btn pri" data-act="atk-go" id="atkGo">出陣する</button></footer>`;};
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


function renderLegend(){const el=$('#legend');if(!el||!S)return;el.innerHTML='<b>隣接する家の境界</b>'+[['#177a82','同盟・和睦','dashed'],['#80619e','主従','dotted'],['#c52f49','交戦','dashed'],['#c56c25','敵対','dotted'],['#776a54','関係未記録','dotted']].map(([c,n,d])=>`<span><i style="display:inline-block;width:18px;margin-right:5px;border-top:2px ${d} ${c};vertical-align:middle"></i>${n}</span>`).join('');requestAnimationFrame(layoutHUD);}


function forkImpact(v,i,o){if(v.kind!=='fork'||o.hist||!v.opts.some(x=>x.hist))return '';const a=TK.ARCS&&TK.ARCS[v.id],d=a&&(a.by?a.by[i]:a),titles=d&&d.titles||[];return titles.length?`<small>この選択で止まる史実：${titles.slice(0,4).map(esc).join('・')}${titles.length>4?' ほか'+(titles.length-4)+'件':''}</small>`:'';}
MODALS.event=()=>{const v=G.eventView();if(!v){setTimeout(closeModal,0);return '';}const d=G.date();const k=S.player;
 const who=v.who||(G.gen(S.clans[k].leader)||{}).n;
 return `<div class="evhead">${who?faceHTML(who,'xl',v.clan||k):''}<div><small class="eyebrow">${G.eraK()} ${G.monK()}（${d.y}年）${v.kind==='fork'?(v.opts.some(o=>o.hist)?' ・ 歴史の分かれ道':' ・ もう一つの歴史'):v.kind==='dyn'?' ・ 天下の動き（条件から生じる創作）':' ・ '+esc(G.CN(k))+'家の領国（創作）'}</small><h2>${esc(v.title)}</h2><p>${esc(v.text)}</p></div></div>
 <div class="evopts">${v.opts.map((o,i)=>`<button class="act${o.hist?' pri':''}" data-act="evpick" data-i="${i}"><b>${esc(o.t)}${v.kind==='fork'&&v.opts.some(x=>x.hist)?(o.hist?' <em class="tg h">史実</em>':' <em class="tg d">歴史が分かれる</em>'):(o.hist?' <em class="tg h">史実どおり</em>':/歴史が分かれる/.test(o.d||'')?' <em class="tg d">歴史が分かれる</em>':'')}</b><small>${esc((o.d||'').replace(/。?歴史が分かれる/,''))}</small>${forkImpact(v,i,o)}</button>`).join('')}</div>`;};
MODALS['domain-records']=()=>`<header><h2>領地再分配の記録</h2><button class="ic" data-act="close">×</button></header><p class="hint">代表拠点の所有者と、郡・城・名義上の領知を分けて確認できます。</p>${(S.domainRecords||[]).map(r=>`<h3>${esc(r.title)}</h3>${r.rows.map(x=>`<p><b>${esc(x.holder)}</b>：${esc(x.area)}<br><small>${esc(x.basis)}</small></p>`).join('')}<a href="${esc(r.source)}" target="_blank" rel="noopener">出典を開く</a>`).join('')||'<p>この時点の再分配記録はまだありません。</p>'}`;
MODALS['alliance-records']=()=>`<header><h2>盟約・和睦と軍事協力</h2><button class="ic" data-act="close">×</button></header><p class="hint">通称が定着した盟約と、関係の内容を説明する表示名を区別しています。臣従は対等な軍事同盟とは別です。</p>${TK.ALLIANCE_HISTORY.map(r=>{const q=TK.RESEARCH_SOURCES[r.source];return `<details class="kbi"><summary>${esc(r.name)} <small>${r.from[0]}～${r.to[0]}年</small></summary><p>${esc(r.note||'成立・解消の過程に幅があります。')} ${q?`<a href="${esc(q.url)}" target="_blank" rel="noopener">${esc(q.author)}：${esc(q.title)}</a>`:'出典照合中'}</p></details>`;}).join('')}`;
MODALS['observer-branch']=()=>`<header><h2>${esc(G.CNK(S.observerQ?.[0]?.parent||S.player))}から新たな領国が成立しました</h2><button class="ic" data-act="observer-stay" aria-label="宗家の観察を続ける">×</button></header><p>各領国の成立は史実に沿って進みます。ここでは、これから動きを追う家を選びます。</p><div class="dlist">${G.observerOptions().map(k=>`<button class="act" data-act="observer-select" data-id="${k}"><b>${esc(G.CNK(k))}</b><small>${esc(G.gen(S.clans[k].leader)?.n||'')} ・ ${esc(G.cname(S.clans[k].cap))}</small></button>`).join('')}</div><p class="hint">領地・同盟・合戦の結果は選択では変わりません。「尾張織田」「美濃織田」は信雄系・信孝系の識別用表示名です。</p>`;
ACT['observer-select']=el=>{if(G.chooseObserver(el.dataset.id)){closeModal();U.baseDirty=true;renderLegend();renderTop();autosave();}};
ACT['observer-stay']=()=>{S.observerQ=[];closeModal();};
MODALS.dip=()=>{const me=S.player;return `<header><div><small class="eyebrow">${G.CNK(me)}から見た直接の関係</small><h2>諸家の関係</h2><button class="mini" data-act="open" data-m="central-offices">政権の役職</button></div><button class="ic" data-act="close" aria-label="閉じる">×</button></header><p class="hint">主従、交戦記録、敵対、同盟・和睦を区別します。同盟相手の同盟国を自動的に味方とはしません。関係未記録は中立の保証ではありません。</p>${['lord','vassal','ally','war','hostile','none'].map(key=>{const ks=G.alive().filter(k=>k!==me&&relation(k).key===key);return `<h3 style="color:${G.relationKinds[key][1]}">${G.relationKinds[key][0]}（${ks.length}家）</h3><div class="dlist">${ks.map(k=>{const L=G.gen(S.clans[k].leader);return `<div class="drow">${L?faceHTML(L.n,'sm',k):''}<div class="dtx"><b>${esc(G.CNK(k))}</b>${L?officeBadge(L.n):''}<small>${G.clanCastles(k).length}拠点 ・ 兵${man(G.clanTroops(k))}</small>${key==='ally'||key==='vassal'||key==='lord'?`<small>${esc(G.allianceLabel(me,k))}</small>`:''}</div></div>`;}).join('')||'<p class="hint">該当なし</p>'}</div>`;}).join('')}`;};
/* ===== 合戦（野戦の采配と、史実の合戦図） ===== */
let SCN=null,sceneCloseTimer=null;
function cancelSceneClose(){clearTimeout(sceneCloseTimer);sceneCloseTimer=null;}
// 合戦図を見せるか：「すべて」「自家に関わる戦だけ」（はじめの設定）「見せない」
function sceneMode(){const v=S.settings&&S.settings.scenes;return v===false?'off':v==='all'?'all':'mine';}
function sceneWanted(B){if(B.presentationCategory==='march')return false;const m=sceneMode();return m==='all'||m==='mine'&&G.sceneIsRelevant(B,S.player);}
function stopScene(){cancelSceneClose();if(SCN){SCN.destroy();SCN=null;}}
function citeSource(r,i){const t=r.title||'',m=t.match(/^(.+?)[「『](.+?)[」』](.*)$/);const author=r.author||(m?m[1]:'作成者未確認'),title=r.author?t:m?m[2]+m[3]:t;return `<li><span>${esc(author)}.</span> <a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">「${esc(title)}」</a>. ${esc(r.year||'刊年未確認')}. ${esc(r.locator||'該当箇所・頁未照合')}. <small>参照 ${esc(r.accessed||'参照日未記録')} ／ 確認範囲：${esc(r.scope||'未照合')}</small></li>`;}
function battleSources(sc){return `<details class="battle-sources"><summary>出典と確認範囲（${(sc.sources||[]).length}件）</summary><ol>${(sc.sources||[]).map(id=>{const r=TK.RESEARCH_SOURCES?.[id]||TK.BATTLE_SOURCES?.[id];return r?citeSource(r):'';}).join('')}</ol>${sc.src?`<p class="hint">従来の参考メモ（書誌・本文・頁は未照合）：${esc(sc.src)}</p>`:''}${!(sc.sources||[]).length?'<p>個別の地形・部隊の根拠は未照合です。</p>':''}</details>`;}

function evidenceSceneHTML(sc,sideTxt){
 const mapped=new Map();for(const p of sc.atlasGroups||sc.atlasUnits||[]){mapped.set(p.id,p);for(const n of p.members||[])mapped.set(n,p);}
 const people=side=>sc.units.filter(u=>u.side===side).map(u=>{const n=u.g||u.n,p=mapped.get(u.id)||mapped.get(n),src=u.source&&(TK.RESEARCH_SOURCES[u.source]||TK.BATTLE_SOURCES[u.source]);return `<article class="evidence-person${p&&!p.dock?'':' atlas-unlocated'}">${faceHTML(n,'sm',u.clan)}<div>${p?`<button class="atlas-person-link" data-act="b-person" data-id="${esc(u.id)}">${esc(n)}</button>`:`<b>${esc(n)}</b>`}<small>${esc((p?.dock?'':p?.label||'').replace(/・[^・]*(?:不詳|未詳|未確認)/g,''))} ／ ${esc(u.arm?G.ARMS[u.arm]?.n||'':'')}</small>${src?`<a href="${esc(src.url)}" target="_blank" rel="noopener noreferrer">${esc(src.author||src.title)}の記録</a>`:''}</div></article>`;}).join('');
 return `<div class="bsc evidence-scene"><div class="battle-stage atlas-stage"><div class="bcv" aria-label="${esc(sc.atlasBasis)}"><canvas id="bCv" role="img" aria-label="${esc(sc.title)}の地形と布陣"></canvas></div><div class="atlas-selection" hidden></div><div class="battle-dock"><div class="battle-time"><b id="bClock">経過を読む</b></div><label class="battle-seek">経過<input id="bSeek" type="range" min="0" max="100" value="0" step="1" aria-label="経過の再生位置"></label><div class="bctl"><button class="ic" data-act="b-play" id="bPlay" aria-label="一時停止">❚❚</button><div class="bspd">${[1,2,4].map(v=>`<button class="mini" data-act="b-spd" data-v="${v}">×${v}</button>`).join('')}</div><button class="mini" data-act="b-re">最初から</button><span class="hint">経過の順序を再生</span></div><div class="bnar"><p id="bNow"></p></div></div></div>${sideTxt?`<div class="battle-totals">${sideTxt}</div>`:''}<details class="battle-roster"><summary>参加者・勢力（${sc.units.length}名・隊）</summary><div class="evidence-armies">${['a','b'].map(side=>`<section style="--army:${side==='a'?'#c83339':'#216d9f'}"><h3>${esc(sc.recordSides?.[side==='a'?0:1]||sc.sides[side].n)}</h3>${people(side)||'<p class="hint">参加者の個別記録を照合中</p>'}</section>`).join('')}</div>${sc.relatedPeople?.length?'<h3>関連する人物・連絡</h3>'+sc.relatedPeople.map(p=>`<p><b>${esc(p.n)}</b> ${esc(p.role)}</p>`).join(''):''}</details><details><summary>図の根拠・経過の全項目</summary><p>${esc(sc.reviewNote||'この戦いの経過と史料を読む。')}</p><ol class="evidence-events">${(sc.beats||[]).filter(b=>b[1]).map(b=>`<li>${esc(b[1])}</li>`).join('')}</ol></details></div>`;
}

function sceneHTML(sc,sideTxt){
 if(sc.displayPolicy)return evidenceSceneHTML(sc,sideTxt);
 return `<div class="bsc"><div class="battle-stage"><div class="bcv" tabindex="0" aria-label="合戦図。拡大時は上下左右にスクロールできます"><canvas id="bCv"></canvas></div>
 <div class="battle-dock"><div class="battle-time"><b id="bClock">${esc(sc.calendar?.[0]?.[1]||'開戦前')}</b></div>
 <label class="battle-seek">経過<input id="bSeek" type="range" min="0" max="100" value="0" step="1" aria-label="合戦の進行位置"></label>
 <div class="bctl"><button class="ic" data-act="b-play" id="bPlay" aria-label="一時停止">❚❚</button><div class="bspd">${[1,2,4].map(v=>`<button class="mini" data-act="b-spd" data-v="${v}">×${v}</button>`).join('')}</div><button class="mini" data-act="b-re">最初から</button><button class="mini" data-act="b-routes" aria-pressed="false">進軍経路</button></div></div></div>
 
 <div class="bnar" id="bNar"><p id="bNow">　</p></div><p class="hint">${esc(sc.mapNote||(sc.layoutStatus==='unresearched'?'布陣未考証。左右の配置は勢力比較で、実際の陣地ではありません。':'地形・配置と経路は模式図です。個々の座標・時刻は未考証です。'))} ${esc(sc.replayBasis||'')} 再生の％は実際の時計時刻ではありません。</p>
 ${sideTxt?`<div class="battle-totals">${sideTxt}</div>`:''}
 <details class="battle-roster"><summary>部隊・武将（${sc.units.length}）</summary><p class="hint">札を押すと図の駒を強調。重なって読めない名前も、ここでは省略しません。</p><div class="battle-roster-grid">${sc.units.map(u=>`<button class="battle-person" data-act="b-person" data-id="${esc(u.id)}" style="--army:${u.side==='a'?'#c83c39':'#247fc1'}"><b>${esc(u.g||u.n)}</b><small data-status="${esc(u.id)}">${esc(u.role||'在陣')}</small></button>`).join('')}</div></details></div>`;
}

ACT['zoom-in']=()=>setMapZoom(cam.z*1.35);ACT['zoom-out']=()=>setMapZoom(cam.z/1.35);ACT['zoom-fit']=()=>{anim=null;fitAll();};
document.addEventListener('input',e=>{if(e.target.id==='mapZoomRange'){const min=Math.max(VW/(CONT.x1-CONT.x0),VH/(CONT.y1-CONT.y0));setMapZoom(min*Math.pow(MAXZ/min,+e.target.value/100));}});
document.addEventListener('input',e=>{if(e.target.id==='bSeek'&&SCN){cancelSceneClose();const target=+e.target.value;SCN.pause();SCN.seek(target);const b=$('#bPlay');if(b)b.textContent='▶';}});
function mountScene(sc,onEnd){stopScene();const cv=$('#bCv');if(!cv&&sc.displayPolicy!=='record')return;
 const upd=()=>{const seek=$('#bSeek');if(seek&&SCN)seek.value=SCN.t;const b=$('#bPlay');if(b&&SCN){b.textContent=SCN.playing?'❚❚':'▶';b.setAttribute('aria-label',SCN.playing?'一時停止':'再生');}document.querySelectorAll('[data-act="b-spd"]').forEach(x=>x.classList.toggle('on',SCN&&+x.dataset.v===SCN.speed));};
 const drawn=sc.displayPolicy==='atlas'?sc:sc.displayPolicy?TKBattlePresentation.view(sc):sc;const factory=sc.displayPolicy==='atlas'?TKBattleAtlas.make:sc.displayPolicy==='record'?TKBattlePresentation.record:TKB.make;
 SCN=factory(cv,drawn,{color:G.CC,mine:true,aspect:drawn.aspect||.62,dur:sc.dur||44,title:(U.modal==='scene'&&U.mdata&&U.mdata.title)||(U.mdata&&U.mdata.place?U.mdata.place+'の戦い':''),face:(n,r,col)=>portrait(n,r,true,col),
  onProgress:t=>{const seek=$('#bSeek');if(seek&&document.activeElement!==seek)seek.value=t;const clock=$('#bClock'),p=$('#bProgress');if(p)p.textContent=Math.round(t)+'%';if(clock){const marks=sc.calendar||[[0,'布陣'],[20,'交戦'],[80,'終盤'],[100,'終了']];clock.textContent=marks.filter(x=>x[0]<=t).at(-1)?.[1]||'';}if(SCN)for(const row of SCN.unitStates()){const b=document.querySelector('[data-act="b-person"][data-id="'+row.id+'"]');if(b){b.style.setProperty('--army',row.side==='a'?'#c83c39':'#247fc1');const el=b.querySelector('small');if(el)el.textContent=row.status;}}},onBeat:(b,all)=>{const el=$('#bNow');if(el)el.textContent=b?b.txt:'　';},onState:upd,onEnd:()=>{upd();onEnd&&onEnd();}});
 upd();SCN.play();}
Object.assign(ACT,{
 'b-person':b=>{
  if(!SCN)return;
  SCN.select(b.dataset.id);
  const stage=$('.battle-stage');
  if(stage&&stage.getBoundingClientRect().bottom<b.getBoundingClientRect().top)
   stage.scrollIntoView({block:'start'});
 },
 'b-play':()=>{cancelSceneClose();SCN&&SCN.toggle();},
 'b-spd':b=>SCN&&SCN.setSpeed(+b.dataset.v),
 'b-re':()=>{cancelSceneClose();if(SCN){SCN.seek(0);SCN.play();}},
 'b-close':()=>{if(U.modal==='battle'&&U.mdata.res==null)return;stopScene();closeModal();},
 'b-form':b=>{U.mdata.fa=b.dataset.v;renderModal();},
 'b-tac':b=>{U.mdata.ta=b.dataset.v;renderModal();},
 'b-auto':()=>{const d=U.mdata,I=G.battleInfo(d.a,d.b);if(!I)return;const r=I.b.troops/Math.max(1,I.a.troops);d.fa=r<.75?'kakuyoku':r>1.3?'gyorin':['kakuyoku','gyorin','hoshi'][Math.floor(Math.random()*3)];d.ta=I.ca>=I.cb+15||I.rough>.2?'kishu':r>2.5?'hiku':'shomen';renderModal();},
 'b-routes':b=>{if(!SCN)return;const on=SCN.toggleRoutes();b.setAttribute('aria-pressed',String(on));b.classList.toggle('on',on);},
 'b-go':()=>goBattle(),
 'b-scenes':()=>{S.settings.scenes=false;renderModal();toast('史実の合戦図を出さない（メニューで戻せます）');},
 'scenemode':()=>{const m=sceneMode();S.settings.scenes=m==='mine'?'all':m==='all'?false:'mine';renderModal();},
 'b-field':()=>{S.settings.battleScene=S.settings.battleScene===false;renderModal();toast(S.settings.battleScene===false?'野戦は自動で戦います':'野戦の采配をあなたが取ります');},
});
MODALS['battle-list']=()=>`<header><h2>合戦と史料</h2><button class="ic" data-act="close" aria-label="閉じる">×</button></header><p class="hint">史料の確認範囲に合わせ、参加者・経過・参考図を表示します。未確認の部隊の移動は再生しません。</p><div class="acts" style="flex-direction:column">${Object.entries(TK.BATTLES).map(([title,b])=>`<button class="act" data-act="battle-view" data-title="${esc(title)}"><b>${esc(title)}</b><small>${esc(b.date||'')} ・ ${b.atlasBasis||'合戦地勢図'} ・ ${esc(b.evidenceScope)}</small></button>`).join('')}</div>`;
ACT['battle-view']=b=>{if(U.modal)(U.modalTrail||(U.modalTrail=[])).push({name:U.modal,data:U.mdata});openModal('scene',{title:b.dataset.title},true);};
MODALS.scene=d=>{const B=TK.BATTLES[d.title];if(!B)return '';const sd=B.sides;
 const side=(s,i)=>`<span class="bside" style="--c:${deep(s.clan)}"><i style="background:${i===0?'#c83c39':'#247fc1'}"></i>${esc(s.n)} ${esc(s.tr)}</span>`;
 return `<header><div><small class="eyebrow">${B.displayPolicy==='record'?'合戦の記録':'史料と参考図'} ・ ${esc(B.date)}</small><h2>${esc(d.title)}</h2><small class="hint">${esc(B.place)}</small>${(()=>{const e=TK.HIST.find(e=>e.title===d.title&&e.k!=='premarch');return e?.datePrecision?'<p class=hint>日付の精度：'+esc(e.datePrecision)+'</p>':'';})()}</div><button class="ic" data-act="b-close" aria-label="閉じる">×</button></header>
 <p class="battle-anchor">地図の日付：${esc(G.dstr(d.triggerT??S.t))} ／ 合戦図は上記の期間を再生します。</p>${sceneHTML(B,side(sd.a,0)+side(sd.b,1))}${!B.displayPolicy&&TK.BATTLE_SITES&&TK.BATTLE_SITES[d.title]?`<button class="btn wide" data-act="site-map" data-title="${esc(d.title)}">確認済みの陣跡を地図で比較</button>`:''}${battleSources(B)}<footer>${B.campaign?`<button class="mini" data-act="campaign" data-title="${esc(d.title)}">別戦線の動き</button>`:''}<span class="sp"></span><button class="btn" data-act="b-close">地図へ戻る</button></footer>`;};
ACT.campaign=b=>openModal('campaign',{title:b.dataset.title||'関ヶ原の戦い',stage:Math.max(0,TK.CAMPAIGN_API.stageAt(S.t))});
ACT['campaign-stage']=b=>{U.mdata.stage=+b.dataset.i;renderModal();};
ACT['campaign-back']=()=>openModal('scene',{title:U.mdata.title});
function campaignMap(){
 const sites=[['大坂・伏見・大津',135.65,34.95,110,480],['田辺',135.38,35.44,35,325],['関ヶ原・南宮山・岐阜',136.6,35.4,210,390],['上田・中山道',138.25,36.4,330,290],['宇都宮',139.88,36.55,660,355],['会津・福島',140.1,37.6,680,210],['山形・長谷堂',140.3,38.2,420,85],['伊達領・奥羽',140.85,38.2,700,120]];
 const points=sites.map(x=>G.PJ(x[1],x[2])),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),minX=Math.min(...xs)-80,minY=Math.min(...ys)-60,maxX=Math.max(...xs)+80,maxY=Math.max(...ys)+90;
 const scale=Math.min(650/(maxX-minX),430/(maxY-minY)),X=x=>80+(x-minX)*scale,Y=y=>55+(y-minY)*scale;
 const land=Object.values(TKGEO.terr).flatMap(ps=>ps.map(poly=>poly.map(r=>r.reduce((d,v,i)=>i%2?d:d+(i?'L':'M')+X(v).toFixed(1)+','+Y(r[i+1]).toFixed(1),'')+'Z').join(''))).join('');
 return `<details class="battle-sources" open><summary>戦線の位置を比べる</summary><svg viewBox="0 0 840 550" role="img" aria-label="関ヶ原戦役の各戦線の位置。部隊の移動経路を表す地図ではありません" style="width:100%;max-height:420px;background:#263c52"><defs><clipPath id="campaign-clip"><rect width="840" height="550"/></clipPath></defs><g clip-path="url(#campaign-clip)"><path d="${land}" fill="#e2ddba" stroke="#a8a080" stroke-width=".4" fill-rule="evenodd"/>${sites.map((p,i)=>{const [x,y]=points[i],px=X(x),py=Y(y);return `<path d="M${px},${py}L${p[3]},${p[4]}" stroke="#604d2c"/><circle cx="${px}" cy="${py}" r="6" fill="#e1ae4b" stroke="#332b20"/><text x="${p[3]}" y="${p[4]-5}" fill="#241e16" stroke="#faf1d4" stroke-width="4" paint-order="stroke" font-size="16" text-anchor="middle">${p[0]}</text>`;}).join('')}</g><text x="785" y="32" fill="white" font-size="18">北 ↑</text></svg><p class="hint">戦線の広がりを比べる位置図です。下の時点別記録と合わせて参照してください。</p></details>`;
}
MODALS.campaign=d=>{const C=TK.CAMPAIGNS.sekigahara,i=Math.max(0,Math.min(4,d.stage));return `<header><div><small>1600年・各地の戦線</small><h2>${C.title}</h2></div><button class="ic" data-act="close" aria-label="閉じる">×</button></header><p>本戦の将と別戦線の将を分けて、全${TK.CAMPAIGN_API.rows(i).length}名を表示しています。六連銭は真田家の家紋です。ここで時点を選んでもゲームの日付は変わりません。</p><div class="campaign-steps">${C.dates.map((dt,j)=>`<button class="mini ${i===j?'on':''}" data-act="campaign-stage" data-i="${j}">${dt[1]}/${dt[2]} ${C.labels[j]}</button>`).join('')}</div><p class="battle-anchor">表示時点：${G.dstr(G.evT({d:C.dates[i]}))} ／ 赤＝東軍、青＝西軍。所在地は戦線の範囲で、日別の細かな経路は未復元です。</p>${campaignMap()}<div class="campaign-grid">${C.groups.map(g=>`<section style="--army:${g.side==='a'||g.turn&&i===4?'#c83c39':'#247fc1'}"><h3>${esc(g.title)}</h3><b>参照戦線：${esc(g.place)}</b><div class="campaign-names">${g.names.map(n=>`<span>${esc(n)}</span>`).join('')}</div><p>${esc(g.notes[i])}</p><small>${g.sources.map(id=>`<a href="${esc(TK.BATTLE_SOURCES[id].url)}" target="_blank" rel="noopener noreferrer">${esc(TK.BATTLE_SOURCES[id].title)}</a>`).join(' ／ ')}</small></section>`).join('')}</div>${battleSources(C)}<footer><button class="btn pri" data-act="campaign-back">合戦図へ戻る</button></footer>`;};
ACT['army-list']=()=>openModal('army-list');
ACT['army-one']=b=>{const units=[...(G.visibleNativeArmies?.()||S.units),...(G.documentedArmies?.()||[])],u=units.find(u=>String(u.id)===b.dataset.id);if(u)openModal('army-list',{ids:[u.id]});};
MODALS['army-list']=(d={})=>{const armies=(U.mapUnits||[...(G.visibleNativeArmies?.()||S.units),...(G.documentedArmies?.()||[])]).filter(u=>!d.ids||d.ids.includes(u.id));return `<header><h2>軍勢の記録（${armies.length}隊）</h2><button class="ic" data-act="close" aria-label="閉じる">×</button></header><p class="hint">各隊の駒は所在地を動かさずに描いています。この一覧は、重なって見える隊を個別に確認するためのものです。</p><div class="campaign-grid">${armies.map(u=>`<section style="--army:${relation(u.clan).color}"><h3>${esc((u.commanders||u.gens.map(id=>G.gen(id)?.n).filter(Boolean)).join('・')||G.CNK(u.clan)+'軍')}</h3><p>${esc(G.marchPhase?.(u).name||u.state)}・${relation(u.clan).name}・${u.troops?man(u.troops):'兵数未詳'}・${esc(u.until||'通常の出陣')}</p><p>${esc(u.record?.originName||(u.record?.id==='motoyasu'?'大高城':G.cname(u.origin)))} → ${esc(G.marchDestination?.(u)||G.cname(u.path.at(-1)))}</p><small>${esc(G.armyIdentity(u).name)}</small>${u.record?'':marchInfo(u)}${u.record?'<ol>'+u.record.source.map((id,i)=>citeSource(TK.RESEARCH_SOURCES[id]||TK.BATTLE_SOURCES?.[id]||{title:id},i)).join('')+'</ol>':''}</section>`).join('')}</div>`};
function battlePlace(I){const a=I.a,id=a.path[Math.min(a.seg+1,a.path.length-1)]||a.path[a.path.length-1];return G.cname(id).replace(/城$|館$|御所$/,'')+'の辺り';}
ACT['site-map']=b=>{stopScene();openModal('site-map',{title:b.dataset.title});};
ACT['site-back']=b=>openModal('scene',{title:b.dataset.title});
MODALS['site-map']=d=>{const sites=TK.BATTLE_SITES[d.title];if(!sites)return '';const lat0=sites.reduce((s,p)=>s+p.lat,0)/sites.length,lon0=sites.reduce((s,p)=>s+p.lon,0)/sites.length;
 const km=p=>[(p.lon-lon0)*111.32*Math.cos(lat0*Math.PI/180),-(p.lat-lat0)*111.32];const ps=sites.map(km);
 const minX=Math.min(...ps.map(p=>p[0]))-.5,maxX=Math.max(...ps.map(p=>p[0]))+.5,minY=Math.min(...ps.map(p=>p[1]))-.4,maxY=Math.max(...ps.map(p=>p[1]))+.4;
 const scale=Math.min(660/(maxX-minX),350/(maxY-minY)),X=x=>380+(x-(minX+maxX)/2)*scale,Y=y=>230+(y-(minY+maxY)/2)*scale;
 const grid=[];for(let x=Math.ceil(minX*2)/2;x<maxX;x+=.5)grid.push(`<path d="M${X(x)} 35V425"/>`);for(let y=Math.ceil(minY*2)/2;y<maxY;y+=.5)grid.push(`<path d="M35 ${Y(y)}H725"/>`);
 return `<header><div><small class="eyebrow">${esc(d.title)} ・ 陣跡の位置比較</small><h2>現在の陣跡を基準に見る</h2></div><button class="ic" data-act="close" aria-label="閉じる">×</button></header><p class="hint">公式観光サイトに示された4地点を、同じ縮尺で配置しました。上が北、右が東です。川・道・起伏や、合戦当日の部隊の広がり・動きは描いていません。</p>
 <svg viewBox="0 0 760 480" role="img" aria-label="関ヶ原の確認済み陣跡4地点の位置関係" style="width:100%;background:#efe5cb;border-radius:4px"><g stroke="#c4b794" stroke-width="1">${grid.join('')}</g><text x="700" y="25" font-size="18" fill="#352a19">北 ↑</text>${sites.map((p,i)=>{const x=X(ps[i][0]),y=Y(ps[i][1]);return `<circle cx="${x}" cy="${y}" r="18" fill="${G.CC(p.clan)}" stroke="#302519"/><text x="${x}" y="${y+8}" text-anchor="middle" font-size="24" fill="white">${i+1}</text>`;}).join('')}<path d="M45 445v8h${.5*scale}v-8" fill="none" stroke="#302519" stroke-width="3"/><text x="45" y="475" fill="#302519" font-size="17">500 m（概算）</text></svg>
 <ol>${sites.map(p=>`<li><a href="${esc(p.source)}" target="_blank" rel="noopener noreferrer" style="color:var(--gold2)">${esc(p.n)}</a></li>`).join('')}</ol><footer><button class="btn pri" data-act="site-back" data-title="${esc(d.title)}">布陣図へ戻る</button></footer>`;};
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
 {const pt=c.createPattern(TKB.seaTile,'repeat');pt.setTransform(new DOMMatrix([1/k,0,0,1/k,0,0]));c.fillStyle=pt;c.fillRect(x0,y0,w,h);}c.save();c.strokeStyle='rgba(222,206,160,.95)';c.lineWidth=9/k;c.lineJoin='round';c.stroke(COAST.get(LANDV)||LANDV);c.restore();c.fillStyle='#efe5cb';c.fill(LANDV);
 if(window.TKTerrain)TKTerrain.draw(c,[x0,y0,x0+w,y0+h],k,1,LAND);
 c.fillStyle='#94b6d2';c.fill(LAKES);c.strokeStyle='rgba(60,80,105,.6)';c.lineWidth=1/k;c.stroke(LAKES);c.strokeStyle='rgba(60,80,105,.75)';c.lineWidth=1.3/k;c.stroke(COAST.get(LANDV)||LANDV);
 const feats=[];
 for(const l of GEO.rivers){const pts=[];for(let i=0;i<l.length;i+=2){if(inside(l[i],l[i+1]))pts.push(L(l[i],l[i+1]));else if(pts.length>1){feats.push({k:'river',w:1.2,pts:pts.splice(0)});}else pts.length=0;}if(pts.length>1)feats.push({k:'river',w:1.2,pts});}
 for(const r of G.ROADS){let pts=[];for(const q of r.pts){if(inside(q[0],q[1]))pts.push(L(q[0],q[1]));else if(pts.length>1){feats.push({k:'road',pts,n:r.name});pts=[];}else pts=[];}if(pts.length>1)feats.push({k:'road',pts,n:r.name});}
 for(const C of G.CL){if(!inside(C.x,C.y))continue;const q=L(C.x,C.y);if(q[0]<.03||q[0]>.97||q[1]<.05||q[1]>.95)continue;feats.push({k:'castle',x:q[0],y:q[1],n:G.cname(C.id)});}
 for(const y of (G.YOSHO||[])){if(!inside(y.x,y.y))continue;const q=L(y.x,y.y);feats.push({k:'village',x:q[0],y:q[1],n:y.n});}
 return {bg:cv,feats};}
/* ===== モーダル ===== */
const modal=$('#modal');
function openModal(name,data,keepTrail=false){U.wakeLoop?.();if(!keepTrail)U.modalTrail=[];if(TK.HISTORY_ONLY&&['event','attack','envoy','chat','jiritsu','prison','prop','relief','battle'].includes(name))return;stopScene();U.modal=name;document.body.dataset.modal=name;U.mdata=data||{};if(U.mode==='game'&&S){uiT=performance.now();renderTop();renderSide();}renderModal();modal.hidden=false;}
function closeModal(){U.modalTrail=[];if(U.modal==='import-confirm')U.pendingImport=null;stopScene();if(U.chatCtl){U.chatCtl.abort();U.chatCtl=null;}U.modal=null;delete document.body.dataset.modal;modal.hidden=true;modal.innerHTML='';renderAll();}
function renderModal(){const f=MODALS[U.modal];if(!f)return;modal.innerHTML=`<div class="mbox ${U.modal}" role="dialog" aria-modal="true">${U.modalTrail?.length?'<button class="mini modal-back" data-act="modal-back">戻る</button>':''}${f(U.mdata)}</div>`;const log=$('#chatLog');if(log)log.scrollTop=log.scrollHeight;const ci=$('#chatIn');if(ci&&!U.mdata.busy)ci.focus();if(U.modal==='attack')updAtk();if(U.modal==='scene'&&!SCN){const B=TK.BATTLES[U.mdata.title];const md=U.mdata;if(B)mountScene(B,()=>{const active=SCN;sceneCloseTimer=setTimeout(()=>{if(SCN===active&&SCN.ended&&U.modal==='scene'&&U.mdata===md)closeModal();},1400);});}else if(U.modal==='battle'&&U.mdata.res&&!SCN){const d=U.mdata;mountScene(d.sc,()=>{d.done=true;d.reveal&&d.reveal();autoBack(d,3800);});}}
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
 return `<header>${L?faceHTML(L.n,'lg',j):''}<div><small class="eyebrow">${G.CNK(j)} 当主</small><h2>${esc(L?L.n:'')}</h2><small>${G.clanCastles(j).length}城 ・ 兵${man(G.clanTroops(j))} ・ ${relation(j).name}</small></div><button class="ic" data-act="close" aria-label="閉じる">×</button></header>
 ${impactHTML([k,j])}${opts}${d.msg?`<p class="note">${esc(d.msg)}</p>`:''}`;};
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
 <p>登録された史実の出来事を日付順にたどります。</p>${nx.length?`<h3>途中で起こる主な出来事</h3><div class="hlist">${nx.map(m=>`<div><b>${esc(m.n)}</b><small>${esc(G.dstr(m.t))}</small></div>`).join('')}</div>${more>0?`<p class="hint">ほか ${more} 件</p>`:''}`:''}
 <footer><button class="btn" data-act="close">やめる</button><button class="btn pri" data-act="ffgo" data-t="${d.t}">早送りする</button></footer>`;};
MODALS.histv=()=>`<header><h2>史実データの確認状況</h2><button class="ic" data-act="close" aria-label="閉じる">×</button></header><p>史実の観察専用です。現在のデータには未考証の兵数・道筋・城郭が含まれます。</p><p>適用済みの出来事 ${S.hOk||0} 件。適用できなかった出来事 ${S.hNg||0} 件。</p><button class="btn" data-act="open" data-m="battle-list">合戦ごとの確認状況</button><button class="btn" data-act="open" data-m="research">街道・地図・進軍の出典</button>`;
function marchInfo(u){const a=u.path[u.seg],b=u.path[u.seg+1],f=b&&G.marchFactors(u,a,b);return f?`<details><summary>行軍の条件</summary><dl>${f.factors.map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl><small>${esc(f.note)}</small></details>`:'';}
MODALS.research=()=>`<header><h2>地図と行軍の資料</h2><button class="ic" data-act="close" aria-label="閉じる">×</button></header><p>城の記録、街道、古地図、合戦の出典を読むことができます。</p><h3>道と地形</h3><p>軍勢は街道をたどり、峠・川・積雪のある道では歩みが遅くなります。大軍は隊列と補給に時間を要し、宿や橋、港の整備で負担を軽くできます。</p><h3>歴史地図</h3><p>古地図と所在地の資料を照合しています。標高と細かな水路には現代の比較資料を含みます。</p><ol class="research-sources">${Object.values(TK.RESEARCH_SOURCES).map(citeSource).join('')}</ol>`;

const menuHeader=t=>`<header><div><small class="eyebrow">天下分け目の国絵図</small><h2>${t}</h2></div><button class="ic" data-act="close" aria-label="地図へ戻る">×</button></header>`;
const menuLink=(m,t,d)=>`<button class="menu-link" data-act="open" data-m="${m}"><span><b>${t}</b><small>${d}</small></span><span aria-hidden="true">›</span></button>`;
MODALS['image-credits']=()=>`${menuHeader('出典と利用条件')}<h3>地図・標高・道路</h3><p class="credit-list">${document.getElementById('credit')?.innerHTML||''}</p><h3>家紋</h3>${Object.entries(TK.KAMON_FILES).map(([k,r])=>`<article class="infra-card"><header>${kamonHTML(k,32)}<b>${esc(G.CN(k))}</b></header><p>${esc(r.artist.replace(/<[^>]*>/g,''))}</p><a href="${esc(r.source)}" target="_blank" rel="noopener">原図</a> ・ <a href="${esc(r.licenseUrl||r.source)}" target="_blank" rel="noopener">${esc(r.license)}</a></article>`).join('')}<h3>肖像</h3>${Object.entries(TK.EXTRA_PORTRAITS).map(([n,r])=>`<p>${faceHTML(n,'sm')}<a href="${esc(r.source)}" target="_blank" rel="noopener">${esc(n)}の原画</a>${r.note?' ・ '+esc(r.note):''}</p>`).join('')}`;
MODALS.infrastructure=d=>{const kind=d.kind||'road',s=G.S(),ids=kind==='road'?Object.keys(G.EDGES).filter(id=>G.improvementOwner('road',id)===s.player):G.YOSHO.filter(y=>G.yOwner(y)===s.player&&G.yActive(y)&&y.kind!=='社').map(y=>y.id);return `${menuHeader('街道・施設の整備')}<p>金 <b>${fmt(s.clans[s.player]?.gold||0)}</b>　整備は領内に残り、行軍・補給・守りに役立ちます。</p><div class="infra-tabs"><button class="btn ${kind==='road'?'pri':''}" data-act="infra-tab" data-kind="road">街道</button><button class="btn ${kind==='site'?'pri':''}" data-act="infra-tab" data-kind="site">施設</button></div><div class="infra-list">${ids.map(id=>{const r=G.improvementOffer(kind,id),e=G.EDGES[id],y=kind==='site'&&G.YOSHO.find(y=>y.id===id),title=y?y.n:G.cname(e.a)+'―'+G.cname(e.b),text=G.infrastructureText(kind,id),progress=r.project?Math.min(100,Math.round((s.t-r.project.start)/(r.project.end-r.project.start)*100)):0;return `<article class="infra-card"><header><b>${esc(title)}</b><span class="infra-level">Lv.${r.level}${' ◆'.repeat(r.level-1)}</span></header><p>${esc(text)}</p>${r.project?`<progress max="100" value="${progress}" aria-label="整備の進捗"></progress><small>あと${Math.max(0,r.project.end-s.t)}日で Lv.${r.project.to}</small>`:r.level<4?`<button class="btn" data-act="infra-upgrade" data-kind="${kind}" data-id="${esc(id)}" ${r.ok?'':'disabled'}>Lv.${r.next}へ整備　金${r.cost}・${r.days}日</button>${!r.ok?'<small>'+esc(r.reason)+'</small>':''}`:'<small>整備は最高段階です</small>'}</article>`;}).join('')||'<p>この時点では、整備できる対象がありません。</p>'}</div><p class="hint">史実の出陣・着陣日は保ちます。整備は補給・疲労・区間ごとの行軍や守備に反映されます。</p>`;};
ACT['infra-tab']=b=>openModal('infrastructure',{kind:b.dataset.kind});
ACT['infra-upgrade']=b=>{const r=G.startImprovement(b.dataset.kind,b.dataset.id);toast(r.msg,r.ok?'good':'bad');if(r.ok){autosave();U.baseDirty=true;renderModal();}};
MODALS.menu=()=>`${menuHeader('操作と保存')}<p class="save-status">${U.saveError?'自動保存に失敗しました。保存・読込からファイルに書き出せます。':'自動保存：'+esc(readMeta('auto')||'まだありません')}</p><nav class="menu-links" aria-label="ゲームの操作">${menuLink('army-list','軍勢一覧','出陣・行軍・在陣する各隊')}${menuLink('dip','諸家の関係','同盟・主従・交戦')}${menuLink('infrastructure','街道・施設の整備','道普請・補給・守備を充実')}${menuLink('menu-save','保存・読込','自動保存・手動の保存枠・ファイル')}${menuLink('menu-settings','表示設定','地形・勢力の色・合戦の表示')}${menuLink('menu-library','合戦と史料','合戦一覧・出典・考証の範囲')}${menuLink('menu-help','操作案内','地図・時間・軍勢の見方')}</nav><footer><button class="btn" data-act="to-title">タイトルへ</button><button class="btn pri" data-act="close">地図へ戻る</button></footer>`;
MODALS['menu-save']=()=>{const slots=[1,2,3].map(n=>{const m=readMeta(n);return `<div class="slot"><span><b>保存枠 ${n}</b><small>${m?esc(m):'空き'}</small></span><button class="mini" data-act="save" data-v="${n}" aria-label="保存枠${n}に保存">保存</button><button class="mini" data-act="load" data-v="${n}" aria-label="保存枠${n}から読込" ${m?'':'disabled'}>読込</button></div>`;}).join('');return `${menuHeader('保存・読込')}<p class="hint">ゲーム内30日ごと・停止時・画面を離れる時に、このブラウザへ自動保存します。</p><div class="slot"><span><b>自動保存</b><small>${esc(readMeta('auto')||'まだありません')}${U.saveError?' ／ 直近の保存に失敗':''}</small></span><button class="mini" data-act="load" data-v="auto" ${readMeta('auto')?'':'disabled'}>読込</button></div>${slots}<h3>ファイルに残す</h3><p class="hint">別のブラウザや端末に移す場合は、ファイルへ書き出してください。</p><div class="mtop"><button class="btn" data-act="export">書き出す</button><button class="btn" data-act="import">取り込む</button></div>`;};
MODALS['menu-settings']=()=>`${menuHeader('表示設定')}<div class="setting-row"><label for="mapStyleSetting">地図の描き方</label><select id="mapStyleSetting"><option value="relief" ${U.mapStyle==='relief'?'selected':''}>地形図</option><option value="flat" ${U.mapStyle!=='relief'?'selected':''}>白地図</option></select></div><div class="setting-row"><label for="relationSetting">外交境界の線</label><select id="relationSetting"><option value="clan" ${!U.dipView?'selected':''}>標準</option><option value="relation" ${U.dipView?'selected':''}>境界を強調</option></select></div><div class="setting-row"><label for="sceneSetting">合戦を自動で開く</label><select id="sceneSetting"><option value="mine" ${sceneMode()==='mine'?'selected':''}>自軍が参加する合戦</option><option value="all" ${sceneMode()==='all'?'selected':''}>すべて</option><option value="off" ${sceneMode()==='off'?'selected':''}>開かない</option></select></div><p class="hint">布陣を確かめられない合戦は、経過・参加者・史料を表示します。合戦一覧からいつでも開けます。</p>`;
MODALS['menu-library']=()=>`${menuHeader('合戦と史料')}<nav class="menu-links">${menuLink('battle-list','合戦一覧','布陣図・参加者・経過')}${menuLink('domain-records','領地再分配の記録','清須会議・宗家と各領国')}${menuLink('alliance-records','盟約と軍事協力','呼称・期間・主従の区別')}${menuLink('research','地図と行軍の出典','街道・湖岸・城の座標')}${menuLink('histv','史実データの確認状況','日付・支配・人物の照合範囲')}${menuLink('menu-about','この作品について','史料・画像・地図の権利表示')}</nav>`;
MODALS['menu-help']=()=>`${menuHeader('操作案内')}${HELP}`;
MODALS['menu-about']=()=>`${menuHeader('この作品について')}${ABOUT}`;
ACT['modal-back']=()=>{const last=U.modalTrail?.pop();if(last)openModal(last.name,last.data,true);};
document.addEventListener('change',e=>{if(e.target.id==='sceneSetting'){S.settings.scenes=e.target.value==='off'?false:e.target.value;autosave();}if(e.target.id==='mapStyleSetting'){U.mapStyle=e.target.value;try{localStorage.setItem('tenka-mapstyle2',U.mapStyle);}catch(_){}U.baseDirty=true;}if(e.target.id==='relationSetting'){U.dipView=e.target.value==='relation';U.baseDirty=true;renderLegend();renderTop();}});
const ABOUT=`<h3>この作品について</h3><div class="help">
 <p><b>史実の扱い</b>　出来事の日付や城の持ち主は、通説をもとに置いています。年代や人物の比定には諸説あるものも含みます。現在は史実の観察専用です。未照合の出来事・配置は考証を継続しています。</p>
 <p><b>地図</b>　国土地理院の「地球地図日本」「標高タイル」「明治期の低湿地」を加工して作成しました。明治期の低湿地と手作業の補いで、後の埋め立てや干拓の前の海岸に近づけています。戦国期の正確な海岸線ではありません。国境は今の市町村境をもとに、令制国の範囲へまとめたものです。</p>
 <p><b>肖像</b>　Wikimedia Commons にある肖像画を切り抜いて使っています。肖像の多くは、壮年から晩年に描かれた像か、亡くなった後に描かれた像です。六角義賢・山県昌景・太田資正・大友義統・前田玄以・山本勘助・北条氏照・武田信繁などは、江戸後期〜明治の浮世絵・肖像集に描かれた後世の想像図です。徳川家康の若い頃は「三方ヶ原戦役画像（しかみ像）」を使っていますが、江戸初期の作とされ、若い家康を写したものではありません。</p>
 <p><b>家紋と肖像</b>　家紋は家を見分ける代表的な意匠として表示しています。肖像には後世の想像図を含みます。<button class="mini" data-act="open" data-m="image-credits">原画・作者と利用条件</button></p>
 <p><b>書体</b>　しっぽり明朝 B1、Zen 角ゴシック New（SIL Open Font License 1.1）。</p>
 <p><b>制作</b>　開発にAIを使用しています。プレイ中のAI生成機能はありません。</p>
 <p><b>保存</b>　保存はこのブラウザの中だけに残ります。</p></div>`;
const HELP=`<div class="help"><p><b>年代を進める</b>　左上の ▶ で進み、もう一度押すと止まります。下の年表で過去の配置も確認できます。</p><p><b>地図を読む</b>　ドラッグで移動、ホイール・ピンチで拡大縮小。凸駒は軍勢の実位置です。同じ道を進む隊は、拡大すると前後の駒を見分けられます。カーソルを合わせると各隊の情報が表示されます。</p><p><b>城と武将</b>　城を押すと在城者、周辺施設にカーソルを合わせるとその時点の施設情報を表示します。大名の本拠・各城・連絡や守備の拠点を確認できます。</p><p><b>史実の観察専用</b>　非史実の分岐・任意の攻撃・外交・創作イベント・AI生成は停止しています。従来の分岐した保存は書き換えません。</p><p><b>地形と史料</b>　現代標高の陰影と歴史地図は別の資料です。湖岸・街道の未確定部分は、メニューの出典と照合状況で確認できます。</p></div>`;

/* ===== 保存 ===== */
const SAVE_KEY2='kuniezu-history-v1-',LEGACY_SAVE_KEY='tenka-haichizu-v7-';
function doSave(n){S.visualFraction=Math.max(0,Math.min(1,U.acc||0));const d=G.date();let r;try{r=TKStorage.write(localStorage,SAVE_KEY2+n,S,`${G.eraK()}${G.monK()}${G.dayK()}（${d.y}） ${G.CNK(S.player)}`);}catch(error){r={ok:false,error};}
 U.saveFailure=r.ok?null:{name:r.error?.name||'SaveError',message:r.error?.message||'保存処理が失敗しました'};
 if(!r.ok)toast('保存できませんでした。ブラウザの保存容量や設定を確認し、ファイルに書き出してください。','bad');return r.ok;}
function exportSave(){try{const blob=new Blob([TKStorage.encode(S)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`天下分け目の国絵図-${G.date().y}-${G.date().m}-${G.date().d}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('保存データを書き出しました','good');}catch(_){toast('書き出せませんでした','bad');}}
function importSave(){const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.hidden=true;document.body.append(input);input.addEventListener('cancel',()=>input.remove(),{once:true});
 input.onchange=async()=>{const file=input.files[0];input.remove();if(!file)return;try{if(file.size>20000000)throw new Error('size');const next=cleanSave(TKStorage.decode(await file.text()));if(!next)throw new Error('shape');U.pendingImport=next;openModal('import-confirm');}catch(_){toast('取り込めませんでした。国絵図の保存ファイルを選んでください。','bad');}};input.click();}
MODALS['import-confirm']=()=>`<header><h2>保存ファイルを取り込む</h2></header><p>現在のプレイを、選んだファイルの続きに切り替えます。現在のプレイを残す場合は、先に保存または書き出しをしてください。</p><footer><button class="btn" data-act="import-cancel">やめる</button><button class="btn pri" data-act="import-go">取り込む</button></footer>`;
ACT['import-cancel']=()=>{U.pendingImport=null;openModal('menu');};
ACT['import-go']=()=>{if(!U.pendingImport)return;const previous=S;try{S=U.pendingImport;G.setS(S);G.fixHist();U.sel=null;U.ended=false;enterGame();closeModal();U.pendingImport=null;toast('ファイルから再開しました','good');}catch(_){S=previous;G.setS(S);U.pendingImport=null;enterGame();openModal('menu');toast('取り込めませんでした。元のプレイに戻しました。','bad');}};
function autosave(){if(!S||U.mode!=='game')return false;S.visualFraction=Math.max(0,Math.min(1,U.acc||0));const now=Date.now();if(U.saveRetry&&now<U.saveRetry)return false;
 const ok=doSave('auto');if(ok){U.lastSave=S.t;U.savedAt=now;U.saveRetry=0;U.saveError=false;}else{U.saveRetry=now+10000;U.saveError=true;}return ok;}
setInterval(()=>{if(U.mode==='game'&&S&&S.t!==U.lastSave)autosave();},45000);
addEventListener('pagehide',()=>autosave());
document.addEventListener('visibilitychange',()=>{if(document.hidden)autosave();});
function readMeta(n){try{const key=localStorage.getItem(SAVE_KEY2+n)?SAVE_KEY2:LEGACY_SAVE_KEY;const raw=localStorage.getItem(key+n);if(!raw)return null;const meta=localStorage.getItem(key+n+'-meta');if(meta)return meta;const save=JSON.parse(raw);return Number.isFinite(save.t)?'保存データあり（日時の表示情報なし）':null;}catch(e){return null;}}
// 保存データは書き換えられうるので、読み込む前に形を確かめ、文字列から記号を除く（画面に差し込まれても動かないように）
function cleanSave(o){if(!o||typeof o!=='object'||typeof o.t!=='number'||!o.castles||!o.clans||!Array.isArray(o.gens)||!Array.isArray(o.units)||!o.player)return null;
 if(!TK.SCEN[o.sc]&&!TK.SCEN[o.scen])return null;let n=0;
 const walk=v=>{if(++n>3e6)throw new Error('too big');if(typeof v==='string')return v.replace(/[<>&"'`\u0000-\u001f]/g,'').slice(0,600);if(Array.isArray(v)){for(let i=0;i<v.length;i++)v[i]=walk(v[i]);return v;}
  if(v&&typeof v==='object'){for(const k of Object.keys(v)){if(k==='__proto__'||k==='constructor'||k==='prototype'){delete v[k];continue;}v[k]=walk(v[k]);}return v;}
  return typeof v==='number'&&!isFinite(v)?0:v;};
 o=walk(o);if(!Number.isFinite(o.t)||!Number.isFinite(o.y0)||!Number.isFinite(o.m0)||!o.div||!o.rel||!o.ally||!o.flags||!Array.isArray(o.chron)||!Array.isArray(o.log))return null;
 if(!o.clans[o.player]&&!o.retainer)return null;
 for(const id of Object.keys(G.C)){const c=o.castles[id];if(!c||!o.clans[c.owner]||!Number.isFinite(c.troops)||c.troops<0)return null;}
 for(const u of o.units){if(!u||!o.clans[u.clan]||!Array.isArray(u.path)||u.path.some(id=>!G.C[id])||!Array.isArray(u.gens))return null;}
 for(const key of ['evQ','sceneQ','battleQ','propQ','prisonQ'])if(!Array.isArray(o[key]))o[key]=[];
 if(o.branchSieges!=null&&!Array.isArray(o.branchSieges))return null;
 if(o.branches!=null&&(typeof o.branches!=='object'||Array.isArray(o.branches)))return null;
 for(const [id,b] of Object.entries(o.branches||{})){if(!G.YOSHO.some(y=>y.id===id&&y.kind==='城')||!b||!o.clans[b.owner]||!o.clans[b.base])return null;}
 for(const b of o.branchSieges||[]){if(!b||!G.YOSHO.some(y=>y.id===b.id&&y.kind==='城')||!o.clans[b.clan]||!o.clans[b.base]||!o.clans[b.owner]||!G.C[b.from]||!Number.isFinite(b.end)||b.troops!==1000||b.loss!==200)return null;}
 if(o.branchGarrisons!=null&&(typeof o.branchGarrisons!=='object'||Array.isArray(o.branchGarrisons)))return null;
 for(const u of o.units){if(u.branch&&!G.YOSHO.some(y=>y.id===u.branch&&y.kind==='城'))return null;if(u.state?.startsWith('branch-')&&(!u.branch||!Number.isFinite(u.branchLeg)||u.branchLeg<=0))return null;}
 for(const [id,d] of Object.entries(o.branchGarrisons||{})){if(!G.YOSHO.some(y=>y.id===id)||!d||!o.clans[d.owner]||!o.clans[d.base]||!Number.isFinite(d.troops)||d.troops<0||!Number.isFinite(d.dur)||!Number.isFinite(d.morale))return null;}
 o.settings=o.settings||{};return o;}
function doLoad(n){const previous=S;try{const s=(localStorage.getItem(SAVE_KEY2+n)||localStorage.getItem(LEGACY_SAVE_KEY+n));if(!s)return false;if(s.length>2e7)throw new Error('size');const o=cleanSave(JSON.parse(s));if(!o)throw new Error('shape');S=o;G.setS(S);G.fixHist();U.sel=null;U.ended=false;enterGame();return true;}catch(e){if(S!==previous){S=previous;G.setS(S);}toast(e.message.includes('非史実')?e.message:'読み込めませんでした（保存データが壊れているか、古い形式です）','bad');return false;}}

/* ===== タイトルと大名選び ===== */
const title=$('#title');
function showTitle(){$('#pick').hidden=true;anim=null;U.mode='title';U.sel=null;U.ended=false;$('#app').dataset.mode='title';side.hidden=true;
 G.newGame('s1560','oda');S=G.S();S.player='__none';resize();fitTitle();U.baseDirty=true;
 const meta=readMeta('auto');title.hidden=false;
 title.innerHTML=`<div class="tbox"><div class="tt"><span class="tsub">見ているだけで史実が動く</span><h1>天下分け目の国絵図</h1><p><span class="ph">その年、誰が、どの城にいたのか。</span><br><span class="ph">街道と城、武将の動きをたどる。</span></p></div>
 <div class="tbtns"><button class="btn pri big" data-act="new">はじめる</button>${meta?`<button class="btn big" data-act="continue"><b>続きから</b><small>${esc(meta)}</small></button>`:''}<button class="btn big ghost" data-act="help-title">遊び方</button></div>
 <div class="help" id="titleHelp" hidden>${HELP}</div></div>`;}
function showScen(){anim=null;U.mode='title';$('#app').dataset.mode='title';$('#pick').hidden=true;side.hidden=true;U.sel=null;resize();fitTitle();title.hidden=false;
 title.innerHTML=`<div class="tbox wide"><h2 class="th">配置図を選ぶ</h2><div class="scens">${Object.values(TK.SCEN).sort((a,b)=>a.year*12+a.month-b.year*12-b.month).map(sc=>`<button class="scard" data-act="scen" data-id="${sc.id}"><span class="sy">${sc.era}（${sc.year}）</span><span class="sn"><b>${sc.title}</b></span><span class="sl">${esc(sc.lead)}</span></button>`).join('')}</div>
 <div class="tbtns"><button class="btn" data-act="back-title">戻る</button></div></div>`;}
function showPick(sid){U.pickScen=sid;U.pickRegion='all';U.mode='pick';$('#app').dataset.mode='pick';title.hidden=true;
 const sc=TK.SCEN[sid];G.newGame(sid,sc.owners?Object.keys(sc.owners)[0]:'oda');S=G.S();S.player='__none';resize();fitTitle();
 // 配置図を変えたら、その時代の主役の家を初めに選んでおく
 const DEF={s1585:'hashiba',s1592:'hashiba',s1600:'tokugawa'};const al=k=>k&&S.clans[k]&&S.clans[k].alive;
 U.pickClan=[DEF[sid],'oda','hashiba'].find(al)||Object.keys(S.clans).filter(al).sort((a,b)=>G.power(b)-G.power(a))[0];renderPick();}
const PICK_REGIONS={'東北':['陸奥','出羽','蝦夷'],'関東':['常陸','下野','上野','下総','上総','安房','武蔵','相模'],'甲信越':['甲斐','信濃','越後','佐渡'],'東海':['尾張','美濃','三河','遠江','駿河','伊豆','伊勢','伊賀','志摩','飛騨'],'北陸':['越中','越前','加賀','能登','若狭'],'近畿':['近江','山城','大和','摂津','河内','和泉','紀伊','丹波','丹後','但馬'],'中国・四国':['因幡','伯耆','出雲','石見','隠岐','播磨','美作','備前','備中','備後','安芸','周防','長門','讃岐','阿波','伊予','土佐'],'九州':['筑前','筑後','豊前','豊後','肥前','肥後','日向','大隅','薩摩','壱岐'],'朝鮮・対馬':['対馬']};
function pickRegion(k){const p=G.C[S.clans[k]?.cap]?.prov;return k==='joseon'?'朝鮮・対馬':Object.keys(PICK_REGIONS).find(n=>PICK_REGIONS[n].includes(p))||'その他';}
document.addEventListener('change',e=>{if(e.target.id==='pickRegion'){U.pickRegion=e.target.value;renderPick();}});
function renderPick(){
 const sc=TK.SCEN[U.pickScen],all=Object.keys(S.clans).filter(j=>S.clans[j].alive),list=all.filter(j=>!U.pickRegion||U.pickRegion==='all'||pickRegion(j)===U.pickRegion).sort((a,b)=>G.power(b)-G.power(a));if(list.length&&!list.includes(U.pickClan))U.pickClan=list[0];
 const PRE=G.preList();const pre=PRE.find(x=>x.k===U.pickClan);if(!pre&&!(S.clans[U.pickClan]&&S.clans[U.pickClan].alive))U.pickClan=list[0];
 const k=U.pickClan;const L=pre?(G.genByName(pre.leader)||{n:pre.leader}):G.gen(S.clans[k].leader);
 const preCard=x=>{const LL=G.genByName(x.leader);return `<button class="pc${x.k===k?' on':''}" data-act="pick" data-clan="${x.k}">${familyMarkHTML(x.k)}${faceHTML(x.leader,'sm',x.k)}<span>${G.CN(x.k)}<small>${esc(x.leader)}・${esc(G.CNK(x.parent))}に従う（${x.d[0]}年に自立）</small></span></button>`;};
 const top=list;
 $('#pick').hidden=false;
 $('#pick').innerHTML=`<div class="phead"><small class="eyebrow">${sc.era}（${sc.year}）</small><h2>${esc(sc.title)}</h2></div>
 <div class="pcur">${L?faceHTML(L.n,'xl',k):''}<div><small class="eyebrow">${familyMarkHTML(k,30)}${G.CNK(k)} 当主</small><h2>${esc(L?L.n:'')}</h2><small>${pre?`いまは${G.CNK(pre.parent)}の下で${pre.castles.length}城を預かる ・ ${pre.d[0]}年${pre.d[1]}月に自立${pre.title?'（'+esc(pre.title)+'）':''}`:`${G.clanCastles(k).length}城 ・ ${Math.round(G.clanKoku(k))}万石`}</small></div></div>
 <button class="btn pri big wide" data-act="start">${G.CNK(k)}で見守る</button>
 <p class="hint">地図の城をタップしても大名家を選べます。</p>${PRE.length?`<h4 class="ph4">主家に従う家（のちに自立する家）</h4><p class="hint">城を持たない家臣として始まり、登録された史実の日に独立します。</p><div class="pgrid">${PRE.map(preCard).join('')}</div>`:''}
 <label class="pick-region">地域<select id="pickRegion"><option value="all">すべての地域</option>${Object.keys(PICK_REGIONS).map(r=>`<option value="${r}" ${U.pickRegion===r?'selected':''}>${r}</option>`).join('')}</select></label><div class="pgrid pick-all">${top.map(j=>{const LL=G.gen(S.clans[j].leader);return `<button class="pc${j===k?' on':''}" data-act="pick" data-clan="${j}">${familyMarkHTML(j)}${LL?faceHTML(LL.n,'sm',j):''}<span>${G.CN(j)}<small>${esc(LL?LL.n:'')}</small></span></button>`;}).join('')}</div>

 <div class="tbtns"><button class="btn" data-act="back-scen">戻る</button></div>`;}
function startGame(){G.newGame(U.pickScen,U.pickClan);S=G.S();S.hsig=G.histSig();S.chats={};U.sel=null;U.ended=false;enterGame();
 const R0=G.retainer();const cap=R0?((G.genByName(R0.leader)||{}).loc||R0.castles[0]):S.clans[S.player].cap;focus(cap,VW<=820?1.1:1.3);if(R0)setTimeout(()=>toast(`${R0.leader}は${G.CNK(R0.parent)}の家臣として始まります。登録された史実の日に独立します`),2600);setSpeed(0);openModal('intro',{step:0});}
const INTRO=[['時を進める','左上の ▶ で進み、もう一度押すと止まります。×1では4秒で1日進みます。速度は ×128 まで切り替えられます。'],['城と軍勢を見る','城を押すと城主や在城者を確認できます。周辺の城や施設の説明はカーソルを合わせるか、タップして開きます。軍勢は凸駒で表示します。'],['史料と照合する','現在は史実の観察専用です。合戦図の出典には確認範囲と未確認部分を明記しています。メニューから保存・読み込みと資料の確認ができます。']];
MODALS.intro=d=>{const i=Math.max(0,Math.min(2,d.step||0)),v=INTRO[i];return `<header><div><small>はじめの操作 ${i+1} / 3</small><h2>${v[0]}</h2></div></header><p>${v[1]}</p><footer><button class="btn" data-act="close">案内を閉じる</button>${i?'<button class="btn" data-act="intro-prev">戻る</button>':''}<button class="btn pri" data-act="intro-next">${i===2?'地図へ':'次へ'}</button></footer>`;};
ACT['army-edge']=b=>{const ps=U.outsideArmies?.[b.dataset.side];if(!ps?.length)return;if(b.dataset.side==='more'){openModal('army-list');return;}const units=[...(G.visibleNativeArmies?.()||S.units),...(G.documentedArmies?.()||[])],u=units.find(u=>u.id===ps[0].id);if(u){const [x,y]=uXY(u);U.cam(x,y,Math.max(cam.z,1.2));}};
ACT['intro-next']=()=>{const i=U.mdata.step||0;if(i===2)closeModal();else openModal('intro',{step:i+1});};
ACT['intro-prev']=()=>openModal('intro',{step:(U.mdata.step||0)-1});
function enterGame(){U.mode='game';U.acc=Math.max(0,Math.min(1,S.visualFraction||0));U.deploymentPreview=null;$('#app').dataset.mode='game';title.hidden=true;$('#pick').hidden=true;terrSig='';U.dipView=false;document.body.classList.remove('dipv');renderLegend();S.chats=S.chats||{};
 G.setS(S);resize();U.speed=0;U.lastSave=S.t;U.saveRetry=0;renderAll();tlReset();autosave();}

/* ===== 起動 ===== */
resize();
const hot=window.claude&&window.claude.hot;
function start(data){if(data&&data.S){S=data.S;G.setS(S);enterGame();}else showTitle();}
if(hot&&hot.snapshot)hot.snapshot(()=>({S:U.mode==='game'?S:null}));
// ほかの部品（史料集・AIの分かれ道）から使う入口
U.motionSnapshot=()=>U.mapUnits?.map(u=>({id:u.id,point:unitPos(u),crest:G.armyCrestKey(u),troops:u.troops}));
MODALS['central-offices']=()=>`<header><h2>秀吉没後の豊臣政権</h2><button class="ic" data-act="close" aria-label="閉じる">×</button></header><p>家の領地や同盟関係とは別に、政権で担った役割を表示します。</p>${G.centralOfficeRecords().length?['五大老','五奉行'].map(office=>`<h3>${office}</h3><div class="dlist">${G.centralOfficeRecords().filter(r=>r.office===office).map(r=>`<div class="drow">${faceHTML(r.name,'sm')}<div class="dtx"><b>${esc(r.name)}</b>${officeBadge(r.name)}</div></div>`).join('')}</div>`).join(''):'<p>この一覧は秀吉没後から関ヶ原本戦までの役職を扱います。</p>'}<p class="note"><a href="${TK.RESEARCH_SOURCES.toyotomiOffices.url}" target="_blank" rel="noopener">役職の出典を読む</a></p>`;

U.api={MODALS,ACT,esc,faceHTML,toast:(...a)=>toast(...a),renderModal:()=>renderModal(),closeModal:()=>closeModal(),renderAll:()=>renderAll()};
requestAnimationFrame(loop);
if(hot&&hot.ready)hot.ready(start);else start(hot&&hot.data||{});
})();
