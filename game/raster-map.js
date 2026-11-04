"use strict";
/* 年代別の地図の版（game/map/versions.json）。ゲームの日付が期間 [from,to) に入る版を一つ選ぶ。塗り・当たり判定・境界線は同じ版を使う。 */
window.TKMapVersion=(function(){let list=[],lastT=null,lastS=null,cur=null;
 if(typeof fetch==='function'&&typeof document!=='undefined')fetch('map/versions.json',{cache:'no-cache'}).then(r=>r.ok?r.json():{versions:[]}).then(v=>{list=v.versions||[];lastT=null;lastS=null;window.TKRaster?.bump?.();window.TKEdges?.bump?.();}).catch(()=>{});
 // 記憶は「遊んでいる場（G.S() の参照）」と日付の両方で引く。シナリオやセーブが替わって同じ t になっても古い版を使わない。
 function active(){const S=window.G?.S?.();const t=S?S.t:null;if(t===lastT&&S===lastS)return cur;lastT=t;lastS=S;cur=null;if(t==null)return null;
  for(const v of list){const a=G.evT({d:v.period[0]}),b=G.evT({d:v.period[1]});if(t>=a&&t<b){cur=v;break;}}return cur;}
 return {active,list:()=>list};})();
/* タイルを地図平面へ貼る時、四隅を画面の画素の格子に丸める。隣り合うタイルは同じ端を共有し、端数の位置での
   アンチエイリアスの隙間（タイルの形の細い線）も重なりも出ない。変換は拡大と平行移動だけ（回転しない）とする。 */
window.TKDrawTile=function(c,img,x,y,w,h){const m=c.getTransform(),X0=Math.round(m.a*x+m.e),Y0=Math.round(m.d*y+m.f),X1=Math.round(m.a*(x+w)+m.e),Y1=Math.round(m.d*(y+h)+m.f);
 if(X1>X0&&Y1>Y0)c.drawImage(img,(X0-m.e)/m.a,(Y0-m.f)/m.d,(X1-X0)/m.a,(Y1-Y0)/m.d);};
/* ラスター地図の実行時部品。game/map/ の領域画像（1画素1領域）を読み、「領域ID→色」の表で塗った画像を地図平面へ貼る。
   表示の細かさに合わせて 100m（provinces/）・400m（provinces-4/）・800m（provinces-8/）のどれかを選ぶ。
   日が進んでも、領主が変わった時だけ表を引き直す。読み込み中のタイルは一段粗いものを代わりに貼る。 */
window.TKRaster=(function(){
 let man=null,defs=[],seaId=1,ready=false,revision=0,onChange=null;const byColor=new Map(),tiles=new Map(),order=[];
 const key=(f,t)=>f+':'+t.file;
 // 通信のない検査環境（node の vm）では読まない。描画は従来の線の領域へ戻る。
 if(typeof fetch==='function'&&typeof document!=='undefined')Promise.all([fetch('map/manifest.json',{cache:'no-cache'}).then(r=>r.json()),fetch('map_data/definition.csv',{cache:'no-cache'}).then(r=>r.text()),fetch('map_data/default.map',{cache:'no-cache'}).then(r=>r.text())]).then(([m,csv,dm])=>{
  // 正本 map_data（CK3 の書式）：definition.csv は `id;R;G;B;name;x;`（id 0 は予約）、海・湖は default.map の sea_zones・lakes。defs は id で引く。
  const list=k=>new Set(((dm.match(new RegExp(k+'\\s*=\\s*LIST\\s*\\{([^}]*)\\}'))||[])[1]||'').trim().split(/\s+/).filter(Boolean).map(Number)),sea=list('sea_zones'),lake=list('lakes');
  man=m;defs=[];for(const l of csv.split(/\r?\n/)){const p=l.split(';'),id=+p[0];if(!id)continue;defs[id]={id,rgb:[+p[1],+p[2],+p[3]],key:p[4],kind:sea.has(id)?'sea':lake.has(id)?'lake':'land'};}
  for(const d of defs)if(d){byColor.set(d.rgb[0]<<16|d.rgb[1]<<8|d.rgb[2],d.id);if(d.key==='sea')seaId=d.id;}
  ready=true;for(const t of level(8).tiles)load(8,t);revision++;onChange?.();
 }).catch(()=>{});
 function baseLevel(f){return f===1?{factor:1,dir:'provinces',tiles:man.tiles}:man.levels.find(l=>l.factor===f);}
 // 版があれば同じ段・同じ列行のタイルを置き換える（重ねない）。版で新しく陸になったタイルも足す。
 let verMemo=null,verKey='';
 function level(f){const v=TKMapVersion.active(),k=(v?.id||'')+'|'+f;if(verKey===k&&verMemo)return verMemo;const base=baseLevel(f);
  const sub=new Map((v?.tiles||[]).filter(t=>t.factor===f).map(t=>[t.col+','+t.row,t]));if(!sub.size){verKey=k;return verMemo=base;}
  const tiles=base.tiles.map(t=>{const r=sub.get(t.col+','+t.row);if(!r)return t;sub.delete(t.col+','+t.row);return {...t,file:r.file,url:r.file,sha256:r.sha256};});
  for(const r of sub.values())tiles.push({col:r.col,row:r.row,file:r.file,url:r.file,sha256:r.sha256,width:man.tile,height:man.tile});
  verKey=k;return verMemo={...base,tiles};}
 function load(f,t){const k=key(f,t);const had=tiles.get(k);if(had&&!(had.state==='error'&&performance.now()>had.retry))return had;const rec={state:'loading',t,f,ids:null,canvas:null,sig:'',tries:(had?.tries||0)+1};tiles.set(k,rec);
  fetch('map/'+(t.url||level(f).dir+'/'+t.file)+(t.sha256?'?v='+t.sha256.slice(0,10):'')).then(r=>r.blob()).then(b=>createImageBitmap(b)).then(bm=>{const cv=document.createElement('canvas');cv.width=bm.width;cv.height=bm.height;const c=cv.getContext('2d',{willReadFrequently:true});c.drawImage(bm,0,0);const px=c.getImageData(0,0,bm.width,bm.height).data,ids=new Uint16Array(bm.width*bm.height);bm.close?.();cv.width=cv.height=0;// 区画番号だけ残し、復号に使った画像と下書きはすぐ手放す
   for(let i=0;i<ids.length;i++)ids[i]=byColor.get(px[i*4]<<16|px[i*4+1]<<8|px[i*4+2])||seaId;rec.ids=ids;rec.state='ready';revision++;onChange?.();})
   .catch(e=>{rec.state='error';rec.err=String(e);rec.retry=performance.now()+1000*rec.tries;if(rec.tries<5)setTimeout(()=>{revision++;onChange?.();},1000*rec.tries);});
  order.push(k);for(let n=order.length;order.length>48&&n>0;n--){const old=order.shift(),r=tiles.get(old);if(old.startsWith('8:')||r?.canvases&&[...r.canvases.values()].some(cv=>painted.find(e=>e.cv===cv&&e.used>=paintSeq-8))){order.push(old);continue;}if(r?.canvases)for(const cv of r.canvases.values()){cv.width=cv.height=0;const i=painted.findIndex(e=>e.cv===cv);if(i>=0)painted.splice(i,1);}tiles.delete(old);}return rec;}
 // 表示の細かさ：画面1物理画素あたりの地図単位に対し、画素が1.5倍より粗くならない最も粗い段を選ぶ。
 function pickFactor(z,dpr){const unit=1/(z*dpr);for(const f of [8,4])if(man.projection.stepUnits*f<=unit*1.5)return f;return 1;}
 // 色分けの種類（sig）ごとに塗った画像を控える。陸・湖・領主など複数の塗りを交互に使っても作り直さない（1タイル最大6種）。
 // 塗った画像は全タイル合わせて CANVAS_BUDGET 枚まで（1枚 1024²×4 バイト）。直近の描画で使ったものは消さない（同じ画面で陸・湖・領主の型を交互に使うため）。
 const CANVAS_BUDGET=96,painted=[];let paintSeq=0;
 function trimCanvases(){for(let i=0;painted.length>CANVAS_BUDGET&&i<painted.length;){const e=painted[i];if(e.used>=paintSeq-8){i++;continue;}painted.splice(i,1);const cv=e.rec.canvases?.get(e.sig);if(cv===e.cv){e.rec.canvases.delete(e.sig);cv.width=cv.height=0;}}}
 function canvasFor(rec,colorOf,sig){rec.canvases=rec.canvases||new Map();let cv=rec.canvases.get(sig);if(cv){rec.canvases.delete(sig);rec.canvases.set(sig,cv);const e=painted.find(x=>x.cv===cv);if(e)e.used=paintSeq;return cv;}
  const {width:w,height:h}=rec.t;cv=document.createElement('canvas');cv.width=w;cv.height=h;const c=cv.getContext('2d'),im=c.createImageData(w,h),d=im.data,cache=new Map();
  for(let i=0;i<rec.ids.length;i++){const id=rec.ids[i];let col=cache.get(id);if(col===undefined){col=colorOf(defs[id])||null;cache.set(id,col);}if(!col)continue;const o=i*4;d[o]=col[0];d[o+1]=col[1];d[o+2]=col[2];d[o+3]=col[3];}
  c.putImageData(im,0,0);rec.canvases.set(sig,cv);painted.push({rec,sig,cv,used:paintSeq});while(rec.canvases.size>6){const [k,old]=rec.canvases.entries().next().value;rec.canvases.delete(k);old.width=old.height=0;const i=painted.findIndex(x=>x.cv===old);if(i>=0)painted.splice(i,1);}trimCanvases();return cv;}
 /* c は地図平面の座標で描く文脈（setTransform 済み）。view=[x0,y0,x1,y1]。colorOf(def)→[r,g,b,a]（a は0〜255）か null。 */
 function paint(c,view,z,dpr,colorOf,sig){if(!ready)return false;paintSeq++;const f=pickFactor(z,dpr);let complete=true;
  const draw=(ff,t,rec)=>{const s=man.projection.stepUnits*ff,x=man.projection.origin[0]+t.col*man.tile*s,y=man.projection.origin[1]+t.row*man.tile*s;TKDrawTile(c,canvasFor(rec,colorOf,sig+'|'+ff),x,y,t.width*s,t.height*s);};
  const visible=ff=>{const s=man.projection.stepUnits*ff,span=man.tile*s;return level(ff).tiles.filter(t=>{const x=man.projection.origin[0]+t.col*span,y=man.projection.origin[1]+t.row*span;return x<view[2]&&x+t.width*s>view[0]&&y<view[3]&&y+t.height*s>view[1];});};
  c.save();c.imageSmoothingEnabled=false;
  // 細かいタイルが届いていない区画だけ、粗い段（800m、起動時に読み込み済み）をその区画に切り抜いて敷く。
  // 両方を重ねると半透明の色が二重になり、タイルの形に濃い帯が出るため。
  for(const t of visible(f)){const rec=load(f,t);if(rec.state==='ready'){draw(f,t,rec);continue;}complete=false;if(f===8)continue;
   const s=man.projection.stepUnits*f,x=man.projection.origin[0]+t.col*man.tile*s,y=man.projection.origin[1]+t.row*man.tile*s;c.save();c.beginPath();c.rect(x,y,t.width*s,t.height*s);c.clip();
   for(const q of visible(8)){const r8=tiles.get(key(8,q));if(r8?.state==='ready')draw(8,q,r8);}c.restore();}
  c.restore();return complete;}
 // 地図平面の点の領域（当たり判定・検査用）。読み込み済みの最も細かい段で引き、100m の段が無ければ読み始める。
 // 返り値は definition の行に、引いた段（factor）を添えたもの。粗い段だけで「海」と決めつけないよう呼び出し側で factor を見る。
 function pickAt(x,y){if(!ready)return null;for(const f of [1,4,8]){const s=man.projection.stepUnits*f,cx=Math.floor((x-man.projection.origin[0])/s),cy=Math.floor((y-man.projection.origin[1])/s),t=level(f).tiles.find(t=>t.col===Math.floor(cx/man.tile)&&t.row===Math.floor(cy/man.tile));
  if(!t){if(f===1&&cx>=0&&cy>=0&&cx<man.width&&cy<man.height)return {...defs[seaId],factor:1};continue;}const rec=f===1?load(f,t):tiles.get(key(f,t));if(rec?.state==='ready'){const d=defs[rec.ids[(cy-t.row*man.tile)*t.width+(cx-t.col*man.tile)]];return d?{...d,factor:f}:null;}}return null;}
 function idAt(x,y){return pickAt(x,y);}
 // 正本の画像（provinces.png）が覆う地図平面の範囲。地図の表示範囲はこれに合わせる。
 const bounds=()=>man&&{x0:man.projection.origin[0],y0:man.projection.origin[1],x1:man.projection.origin[0]+man.width*man.projection.stepUnits,y1:man.projection.origin[1]+man.height*man.projection.stepUnits};
 return {bump(){verMemo=null;revision++;onChange?.();},paint,idAt,pickAt,bounds,ready:()=>ready,revision:()=>revision,defs:()=>defs,onChange(fn){onChange=fn;}};
})();

/* 地形の陰影（Copernicus DEM GLO-90 から開発時に作った画像。game/map/relief.json）。
   実行時に外部の標高タイルを取り寄せて計算することはしない。表示の細かさで 100m・400m・800m の段を選び、
   細かい段が届くまでは 800m の段を下に敷く（陰影は陸で不透明なので二重にならない）。 */
window.TKRelief=(function(){
 let man=null,ready=false,revision=0,onChange=null;const tiles=new Map(),order=[];let pinned=new Set();// pinned：描画中の一回で使うタイル。上限を超えても閉じない（閉じた画像を描くと例外になる）
 if(typeof fetch==='function'&&typeof document!=='undefined')Promise.all([fetch('map/relief.json',{cache:'no-cache'}).then(r=>r.json()),fetch('map/manifest.json',{cache:'no-cache'}).then(r=>r.json())]).then(([r,grid])=>{
  man={...r,origin:grid.projection.origin,step:grid.projection.stepUnits,tile:grid.tile};ready=true;for(const t of level(8).tiles)load(8,t);revision++;onChange?.();}).catch(()=>{});
 const level=f=>man.levels.find(l=>l.factor===f);
 // 読み込みに失敗したタイルは1秒後に読み直す（同時に多く読むと一時的に失敗することがある）。
 function load(f,t){const k=f+':'+t.file;const had=tiles.get(k);if(had&&!(had.state==='error'&&performance.now()>had.retry))return had;const rec={state:'loading',im:null,tries:(had?.tries||0)+1};tiles.set(k,rec);
  fetch('map/'+level(f).dir+'/'+t.file+(t.sha256?'?v='+t.sha256.slice(0,10):'')).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.blob();}).then(b=>createImageBitmap(b)).then(im=>{rec.im=im;rec.state='ready';revision++;onChange?.();}).catch(e=>{rec.state='error';rec.err=String(e);rec.retry=performance.now()+1000*rec.tries;if(rec.tries<5)setTimeout(()=>{revision++;onChange?.();},1000*rec.tries);});
  order.push(k);for(let n=order.length;order.length>64&&n>0;n--){const old=order.shift();if(old.startsWith('8:')||pinned.has(old)){order.push(old);continue;}tiles.get(old)?.im?.close?.();tiles.delete(old);}return rec;}
 function pick(z,dpr){const unit=1/(z*dpr);for(const f of [8,4])if(man.step*f<=unit*1.5)return f;return 1;}
 function paint(c,view,z,dpr){if(!ready)return false;const f=pick(z,dpr);let complete=true;
  const vis=ff=>{const s=man.step*ff,span=man.tile*s;return level(ff).tiles.filter(t=>{const x=man.origin[0]+t.col*span,y=man.origin[1]+t.row*span;return x<view[2]&&x+t.width*s>view[0]&&y<view[3]&&y+t.height*s>view[1];});};
  const draw=(ff,t,rec)=>{const s=man.step*ff;TKDrawTile(c,rec.im,man.origin[0]+t.col*man.tile*s,man.origin[1]+t.row*man.tile*s,t.width*s,t.height*s);};
  pinned=new Set([...[f,4,8].flatMap(ff=>vis(ff).map(t=>ff+':'+t.file))]);
  c.save();c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
  // 代わりの段は 800m を敷き、その上に 400m（細かい段が 100m の時は先に読み始める）を重ねる。
  const fine=vis(f).map(t=>[t,load(f,t)]);if(fine.some(([,r])=>r.state!=='ready')&&f!==8){complete=false;
   for(const t of vis(8)){const r=tiles.get('8:'+t.file);if(r?.state==='ready')draw(8,t,r);}
   if(f===1)for(const t of vis(4)){const r=load(4,t);if(r.state==='ready')draw(4,t,r);}}
  for(const [t,r] of fine)if(r.state==='ready')draw(f,t,r);c.restore();return complete;}
 return {paint,ready:()=>ready,revision:()=>revision,notice:()=>man&&{notice:man.notice,disclaimer:man.disclaimer,license:man.license},onChange(fn){onChange=fn;},states:()=>Object.fromEntries([...tiles].map(([k,r])=>[k,r.state+(r.err?' '+r.err:'')]))};
})();

/* 境界線（game/map/edges.json）。領域画像から生成した共有辺で、塗りと同じ版・同じ段から取る（Codex との契約）。
   段は TKRaster と同じ選び方。細かい段のタイルが届くまでは、届いている粗い段を使い、塗りの段と食い違う線は重ねない。 */
window.TKEdges=(function(){
 let man=null,grid=null,ready=false,revision=0,onChange=null;const tiles=new Map();
 if(typeof fetch==='function'&&typeof document!=='undefined')Promise.all([fetch('map/edges.json',{cache:'no-cache'}).then(r=>r.json()),fetch('map/manifest.json',{cache:'no-cache'}).then(r=>r.json())]).then(([e,g])=>{man=e;grid=g;ready=true;revision++;onChange?.();}).catch(()=>{});
 let verMemo=null,verKey='';
 const level=f=>{const v=TKMapVersion.active(),k=(v?.id||'')+'|'+f;if(verKey===k&&verMemo)return verMemo;const base=man.levels.find(l=>l.factor===f);
  const sub=new Map((man.versions||[]).filter(x=>v&&x.id===v.id&&x.factor===f).map(x=>[x.col+','+x.row,x]));if(!sub.size){verKey=k;return verMemo=base;}
  const tiles=base.tiles.map(t=>{const r=sub.get(t.col+','+t.row);if(!r)return t;sub.delete(t.col+','+t.row);return {...t,file:r.file,sha256:r.sha256};});for(const r of sub.values())tiles.push({col:r.col,row:r.row,file:r.file,sha256:r.sha256});
  verKey=k;return verMemo={...base,tiles};};
 function load(f,t){const k=f+':'+t.file;let rec=tiles.get(k);if(rec&&!(rec.state==='error'&&performance.now()>rec.retry))return rec;rec={state:'loading',tries:(rec?.tries||0)+1};tiles.set(k,rec);
  fetch('map/'+level(f).dir+'/'+t.file+'?v='+t.sha256.slice(0,10)).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json();}).then(items=>{rec.items=items.map(it=>{const p=new Path2D();for(const l of it.lines){p.moveTo(l[0],l[1]);for(let i=2;i<l.length;i+=2)p.lineTo(l[i],l[i+1]);}return {a:it.a,b:it.b,kind:it.kind,p};});rec.state='ready';revision++;onChange?.();})
   .catch(e=>{rec.state='error';rec.retry=performance.now()+1000*rec.tries;if(rec.tries<5)setTimeout(()=>{revision++;onChange?.();},1000*rec.tries);});return rec;}
 function pick(z,dpr){const unit=1/(z*dpr),s=grid.projection.stepUnits;for(const f of [8,4])if(s*f<=unit*1.5)return f;return 1;}
 // view の範囲の辺。塗りと同じ段 f のタイルがそろっていない時は、そろっている段（粗い方）だけを返す。
 function inView(view,z,dpr){if(!ready)return null;const want=pick(z,dpr),s0=grid.projection.stepUnits,[X0,Y0]=grid.projection.origin,T=grid.tile;
  for(const f of [want,...[4,8].filter(v=>v>want)]){const s=s0*f,span=T*s,vis=level(f).tiles.filter(t=>{const x=X0+t.col*span,y=Y0+t.row*span;return x<view[2]&&x+span>view[0]&&y<view[3]&&y+span>view[1];});
   const recs=vis.map(t=>load(f,t));if(recs.every(r=>r.state==='ready'))return recs.flatMap(r=>r.items);}
  return null;}
 return {bump(){verMemo=null;revision++;onChange?.();},ready:()=>ready,revision:()=>revision,inView,onChange(fn){onChange=fn;}};
})();
/* 河川（正本 map_data/rivers.png の1画素幅の中心線を tools/map/build-river-lines.cjs が辿った線 map/rivers-lines.json）。現代の参考の河道。
   日本・朝鮮とも同じ線・同じ描き方。名前の表示と国境の破線は、従来の主要河川の一覧（TK.REGIONAL_RIVERS）と名前が合う河川だけ。 */
window.TKRivers=(function(){let recs=null,revision=0,onChange=null;
 if(typeof fetch==='function'&&typeof document!=='undefined')fetch('map/rivers-lines.json',{cache:'no-cache'}).then(r=>r.json()).then(d=>{
  const canon=n=>TK.RIVER_NAME_EQUIVALENTS?.[n]||n,major=new Map();for(const r of TK.REGIONAL_RIVERS||[]){const k=canon(r.name),o=major.get(k)||{name:r.name,border:false};o.border=o.border||!!r.border;major.set(k,o);}
  recs=d.features.map(f=>{const geometries=f.lines.map(l=>TK.riverGeometry(Array.from({length:l.length/2},(_,i)=>[l[i*2],l[i*2+1]]))),m=major.get(canon(f.name)),longest=geometries.reduce((a,b)=>!a||b.length>a.length?b:a,null);
   return {id:f.id,name:m?m.name:null,border:!!m?.border,geometries,mid:m&&longest?longest.points[Math.floor(longest.points.length/2)]:null};});
  revision++;onChange?.();}).catch(()=>{});
 return {ready:()=>!!recs,records:()=>recs||[],revision:()=>revision,onChange(fn){onChange=fn;}};
})();
