"use strict";
/* ラスター地図の実行時部品。game/map/ の領域画像（1画素1領域）を読み、「領域ID→色」の表で塗った画像を地図平面へ貼る。
   表示の細かさに合わせて 100m（provinces/）・400m（provinces-4/）・800m（provinces-8/）のどれかを選ぶ。
   日が進んでも、領主が変わった時だけ表を引き直す。読み込み中のタイルは一段粗いものを代わりに貼る。 */
window.TKRaster=(function(){
 let man=null,defs=[],ready=false,revision=0,onChange=null;const byColor=new Map(),tiles=new Map(),order=[];
 const key=(f,t)=>f+':'+t.file;
 // 通信のない検査環境（node の vm）では読まない。描画は従来の線の領域へ戻る。
 if(typeof fetch==='function'&&typeof document!=='undefined')Promise.all([fetch('map/manifest.json').then(r=>r.json()),fetch('map/definition.csv').then(r=>r.text())]).then(([m,csv])=>{
  man=m;defs=csv.trim().split('\n').slice(1).map(l=>{const p=l.split(';');return {id:+p[0],rgb:[+p[1],+p[2],+p[3]],key:p[4],name:p[5],kind:p[6]};});
  for(const d of defs)byColor.set(d.rgb[0]<<16|d.rgb[1]<<8|d.rgb[2],d.id);
  ready=true;for(const t of level(8).tiles)load(8,t);revision++;onChange?.();
 }).catch(()=>{});
 function level(f){return f===1?{factor:1,dir:'provinces',tiles:man.tiles}:man.levels.find(l=>l.factor===f);}
 function load(f,t){const k=key(f,t);if(tiles.has(k))return tiles.get(k);const rec={state:'loading',t,f,ids:null,canvas:null,sig:''};tiles.set(k,rec);
  fetch('map/'+level(f).dir+'/'+t.file).then(r=>r.blob()).then(b=>createImageBitmap(b)).then(bm=>{const cv=document.createElement('canvas');cv.width=bm.width;cv.height=bm.height;const c=cv.getContext('2d',{willReadFrequently:true});c.drawImage(bm,0,0);const px=c.getImageData(0,0,bm.width,bm.height).data,ids=new Uint16Array(bm.width*bm.height);
   for(let i=0;i<ids.length;i++)ids[i]=byColor.get(px[i*4]<<16|px[i*4+1]<<8|px[i*4+2])||0;rec.ids=ids;rec.state='ready';revision++;onChange?.();})
   .catch(()=>{rec.state='error';});
  order.push(k);while(order.length>48){const old=order.shift();if(!old.startsWith('8:'))tiles.delete(old);}return rec;}
 // 表示の細かさ：画面1物理画素あたりの地図単位に対し、画素が1.5倍より粗くならない最も粗い段を選ぶ。
 function pickFactor(z,dpr){const unit=1/(z*dpr);for(const f of [8,4])if(man.projection.stepUnits*f<=unit*1.5)return f;return 1;}
 function canvasFor(rec,colorOf,sig){if(rec.canvas&&rec.sig===sig)return rec.canvas;const {width:w,height:h}=rec.t;const cv=rec.canvas||document.createElement('canvas');cv.width=w;cv.height=h;const c=cv.getContext('2d'),im=c.createImageData(w,h),d=im.data,cache=new Map();
  for(let i=0;i<rec.ids.length;i++){const id=rec.ids[i];if(!id)continue;let col=cache.get(id);if(col===undefined){col=colorOf(defs[id])||null;cache.set(id,col);}if(!col)continue;const o=i*4;d[o]=col[0];d[o+1]=col[1];d[o+2]=col[2];d[o+3]=col[3];}
  c.putImageData(im,0,0);rec.canvas=cv;rec.sig=sig;return cv;}
 /* c は地図平面の座標で描く文脈（setTransform 済み）。view=[x0,y0,x1,y1]。colorOf(def)→[r,g,b,a]（a は0〜255）か null。 */
 function paint(c,view,z,dpr,colorOf,sig){if(!ready)return false;const f=pickFactor(z,dpr);let complete=true;
  const draw=(ff,t,rec)=>{const s=man.projection.stepUnits*ff,x=man.projection.origin[0]+t.col*man.tile*s,y=man.projection.origin[1]+t.row*man.tile*s;c.drawImage(canvasFor(rec,colorOf,sig+'|'+ff),x,y,t.width*s,t.height*s);};
  const visible=ff=>{const s=man.projection.stepUnits*ff,span=man.tile*s;return level(ff).tiles.filter(t=>{const x=man.projection.origin[0]+t.col*span,y=man.projection.origin[1]+t.row*span;return x<view[2]&&x+t.width*s>view[0]&&y<view[3]&&y+t.height*s>view[1];});};
  c.save();c.imageSmoothingEnabled=false;
  // 細かいタイルが届いていない区画だけ、粗い段（800m、起動時に読み込み済み）をその区画に切り抜いて敷く。
  // 両方を重ねると半透明の色が二重になり、タイルの形に濃い帯が出るため。
  for(const t of visible(f)){const rec=load(f,t);if(rec.state==='ready'){draw(f,t,rec);continue;}complete=false;if(f===8)continue;
   const s=man.projection.stepUnits*f,x=man.projection.origin[0]+t.col*man.tile*s,y=man.projection.origin[1]+t.row*man.tile*s;c.save();c.beginPath();c.rect(x,y,t.width*s,t.height*s);c.clip();
   for(const q of visible(8)){const r8=tiles.get(key(8,q));if(r8?.state==='ready')draw(8,q,r8);}c.restore();}
  c.restore();return complete;}
 // 地図平面の点の領域（当たり判定・検査用）。読み込み済みの最も細かい段で引く。
 function idAt(x,y){if(!ready)return null;for(const f of [1,4,8]){const s=man.projection.stepUnits*f,cx=Math.floor((x-man.projection.origin[0])/s),cy=Math.floor((y-man.projection.origin[1])/s),t=level(f).tiles.find(t=>t.col===Math.floor(cx/man.tile)&&t.row===Math.floor(cy/man.tile)),rec=t&&tiles.get(key(f,t));if(rec?.state==='ready')return defs[rec.ids[(cy-t.row*man.tile)*t.width+(cx-t.col*man.tile)]]||null;}return null;}
 return {paint,idAt,ready:()=>ready,revision:()=>revision,defs:()=>defs,onChange(fn){onChange=fn;}};
})();
