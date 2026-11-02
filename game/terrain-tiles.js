"use strict";
/* Mapzen Terrain Tiles (USGS / NOAA), Terrarium DEM. 現代標高であり古地形ではない。
   地理院DEM・Mapzen DEMを同じ陰影計算で描く。親タイルを残してから詳細を重ね、読込中の白い矩形を防ぐ。 */
window.TKTerrain=(function(){
 const cache=new Map(),pending=[],active=new Set();let running=0,loaded=0,failed=0,lastZoom=6,revision=0,frame=0;
 let watched=[],readySignature='';
 const timings=[],clock=()=>typeof performance!=='undefined'?performance.now():Date.now();
 const signature=()=>watched.filter(g=>g.every(t=>t.ready||t.error)||g[0]?.z===6&&g.some(t=>t.ready)).map(g=>g.map(t=>t.provider+'/'+t.z+'/'+t.x+'/'+t.y+(t.ready?'+':t.error?'!':'?')).join(',')).join('|');
 function settled(){const next=signature();if(next!==readySignature){readySignature=next;revision++;if(window.TKUI&&!TKUI.modal)TKUI.baseDirty=true;}}
 const sourceCoverage=new Map();
 function setCoverage(provider,polygons){const boxes=polygons.map(poly=>{let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;const ring=poly[0];for(let i=0;i<ring.length;i+=2){x0=Math.min(x0,ring[i]);y0=Math.min(y0,ring[i+1]);x1=Math.max(x1,ring[i]);y1=Math.max(y1,ring[i+1]);}return [x0,y0,x1,y1];});sourceCoverage.set(provider,boxes);}
 function mayCover(provider,z,x,y){const boxes=sourceCoverage.get(provider);if(!boxes)return true;const {K,CX,LON0,LAT0}=TKGEO,x0=(x/2**z*360-180-LON0)*K*CX,x1=((x+1)/2**z*360-180-LON0)*K*CX,y0=(LAT0-yLat(y,z))*K,y1=(LAT0-yLat(y+1,z))*K;return boxes.some(b=>b[0]<=x1&&b[2]>=x0&&b[1]<=y1&&b[3]>=y0);}
 const lonX=(v,z)=>(v+180)/360*2**z,latY=(v,z)=>(1-Math.asinh(Math.tan(v*Math.PI/180))/Math.PI)/2*2**z;
 const yLat=(v,z)=>Math.atan(Math.sinh(Math.PI*(1-2*v/2**z)))*180/Math.PI;
 // 画像の符号化だけを吸収し、陰影計算は全地域で共通にする。
 function heightFromRgb(provider,r,g,b){if(provider==='gsi'){const n=r*65536+g*256+b;return n===8388608?NaN:(n>8388608?n-16777216:n)*.01;}return r*256+g+b/256-32768;}
 function shadeElevations(h,meters,a){const sample=(i,v)=>Number.isFinite(h[i])?h[i]:v;for(let y=0;y<256;y++)for(let x=0;x<256;x++){const i=y*256+x,v=h[i];if(!Number.isFinite(v)){a[i*4+3]=0;continue;}
   const dx=(sample(y*256+Math.min(255,x+1),v)-sample(y*256+Math.max(0,x-1),v))/(meters*(x===0||x===255?1:2));
   const dy=(sample(Math.min(255,y+1)*256+x,v)-sample(Math.max(0,y-1)*256+x,v))/(meters*(y===0||y===255?1:2));
   const light=(dx*.5+dy*.5+.7071)/Math.sqrt(dx*dx+dy*dy+1),ink=Math.max(0,Math.min(1,(.78-light)*1.65));
   a[i*4]=Math.round(245-ink*90);a[i*4+1]=Math.round(240-ink*93);a[i*4+2]=Math.round(221-ink*89);a[i*4+3]=255;
  }return a;}
 function shade(im,t){const cv=document.createElement('canvas');cv.width=cv.height=256;const c=cv.getContext('2d',{willReadFrequently:true});c.drawImage(im,0,0);
  const data=c.getImageData(0,0,256,256),a=data.data,h=new Float32Array(65536);for(let i=0;i<h.length;i++)h[i]=a[i*4+3]?heightFromRgb(t.provider,a[i*4],a[i*4+1],a[i*4+2]):NaN;
  const meters=40075016.686*Math.cos(yLat(t.y+.5,t.z)*Math.PI/180)/(2**t.z*256);shadeElevations(h,meters,a);c.putImageData(data,0,0);return cv;
 }
 function pump(){while(running<6&&pending.length){const t=pending.shift();running++;t.started=clock();const im=new Image();im.crossOrigin='anonymous';t.request=im;active.add(t);
  im.onload=()=>{if(!active.delete(t))return;try{const arrived=clock();t.im=project(shade(im,t),t);timings.push({provider:t.provider,z:t.z,x:t.x,y:t.y,loadMs:arrived-t.started,processMs:clock()-arrived});if(timings.length>80)timings.shift();t.ready=true;loaded++;}catch(e){t.error=true;failed++;}running--;settled();pump();};
  im.onerror=()=>{if(!active.delete(t))return;t.error=true;failed++;running--;settled();pump();};
  im.src=t.provider==='gsi'?`https://cyberjapandata.gsi.go.jp/xyz/dem_png/${t.z}/${t.x}/${t.y}.png`:t.z===6&&t.x>=53&&t.x<=58&&t.y>=23&&t.y<=27?`terrain/overview/6-${t.x}-${t.y}.png`:`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${t.z}/${t.x}/${t.y}.png`;
 }}
 function get(z,x,y,provider='dem'){const key=provider+'/'+z+'/'+x+'/'+y;let t=cache.get(key);if(!t){t={z,x,y,provider};cache.set(key,t);pending.push(t);}return t;}
 // 行ごとに緯度から参照元の行を求める。64回の画像転送を一度の書込みにまとめる。
 function project(im,t){const cv=document.createElement('canvas');cv.width=cv.height=256;const c=cv.getContext('2d',{willReadFrequently:true});
  const north=yLat(t.y,t.z),south=yLat(t.y+1,t.z),src=im.getContext('2d').getImageData(0,0,256,256).data,out=c.createImageData(256,256),dst=out.data;
  for(let row=0;row<256;row++){
   const sy=Math.max(0,Math.min(255,(latY(north-(row+.5)/256*(north-south),t.z)-t.y)*256-.5)),a=Math.floor(sy),b=Math.min(255,a+1),f=sy-a;
   for(let x=0;x<1024;x++)dst[row*1024+x]=src[a*1024+x]*(1-f)+src[b*1024+x]*f;
  }c.putImageData(out,0,0);
  t.north=north;t.south=south;return cv;
 }
 function draw(c,view,scale,dpr,clip,japanClip){frame++;const {K,CX,LON0:lon0,LAT0:lat0}=TKGEO;
  const requested=[];
  const z=Math.max(6,Math.min(14,Math.ceil(Math.log2(K*CX*scale*dpr*360/256))));if(z!==lastZoom){for(const t of [...active])if(t.z!==z&&t.z!==6&&!(t.z===8&&z>8&&t.provider==='dem')){t.request.onload=t.request.onerror=null;t.request.src='';active.delete(t);running--;cache.delete(t.provider+'/'+t.z+'/'+t.x+'/'+t.y);}}lastZoom=z;
  for(let i=pending.length-1;i>=0;i--)if(pending[i].z!==z&&pending[i].z!==6&&!(pending[i].z===8&&z>8&&pending[i].provider==='dem')){const t=pending.splice(i,1)[0];cache.delete(t.provider+'/'+t.z+'/'+t.x+'/'+t.y);}
  const west=Math.max(118,view[0]/K/CX+lon0),east=Math.min(147,view[2]/K/CX+lon0),north=Math.min(47,lat0-view[1]/K),south=Math.max(24,lat0-view[3]/K);if(west>=east||south>=north)return;
  c.save();if(clip)c.clip(clip);c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
  const layer=(provider,bounds)=>{
   const [w,e,n,s]=bounds;if(w>=e||s>=n)return;
   let selected=[];
   for(let level=6;level<=z;level++){
    const tiles=[],needed=[];let complete=true;
    for(let y=Math.floor(latY(n,level));y<=Math.floor(latY(s,level));y++)for(let x=Math.floor(lonX(w,level));x<=Math.floor(lonX(e,level));x++){
     // 中間標高を先にそろえ、詳細一式の到着まで全体画像だけにしない。
     if(!mayCover(provider,level,x,y))continue;
     const request=level===6||level===z||provider==='dem'&&level===8&&z>8;
     const t=request?get(level,x,y,provider):cache.get(provider+'/'+level+'/'+x+'/'+y);
     if(t&&request)needed.push(t);
     if(t)t.seen=frame;if(!t||(!t.ready&&!t.error))complete=false;if(t?.ready)tiles.push(t);
    }
    // 詳細がそろうまでは同じ倍率の親画像を保つ。タイルごとの斑な切替をしない。
    if((complete||level===6)&&tiles.length)selected.push(...tiles);
    if(needed.length)requested.push(needed);
    // 縮小直後は目標段階が未取得で、粗い段階だけになり起伏が一瞬消える。取得済みのより細かい段階を代用として重ね、目標段階がそろったら外す。
    if(level===z&&!complete){const finer=[];for(const t of cache.values()){if(t.provider!==provider||!t.ready||t.z<=z||t.z>z+4)continue;const tw=(t.x/2**t.z*360-180),te=((t.x+1)/2**t.z*360-180);if(te<w||tw>e||t.south>n||t.north<s)continue;finer.push(t);}
     finer.sort((a,b)=>a.z-b.z);for(const t of finer)t.seen=frame;selected.push(...finer);}
   }
   for(const t of selected){t.drawnFrame=frame;const level=t.z,x0=(t.x/2**level*360-180-lon0)*K*CX,w=360/2**level*K*CX;
    const y0=(lat0-t.north)*K,y1=(lat0-t.south)*K;c.drawImage(t.im,x0,y0,w,y1-y0+.008);
   }
  };
  layer('dem',[west,east,north,south]);
  if(japanClip||(west>130&&south>30)){
   c.save();if(japanClip)c.clip(japanClip);
   layer('gsi',[Math.max(128,west),Math.min(146,east),Math.min(46,north),Math.max(29,south)]);c.restore();
  }
  c.restore();watched=requested;readySignature=signature();
  // 同倍率で別地域へ移った際、旧画面の待機画像で現在地の取得を塞がない。
  for(const t of [...active])if(t.seen!==frame&&t.z!==6){t.request.onload=t.request.onerror=null;t.request.src='';active.delete(t);running--;cache.delete(t.provider+'/'+t.z+'/'+t.x+'/'+t.y);}
  for(let i=pending.length-1;i>=0;i--)if(pending[i].seen!==frame&&pending[i].z!==6){const t=pending.splice(i,1)[0];cache.delete(t.provider+'/'+t.z+'/'+t.x+'/'+t.y);}
  pending.sort((a,b)=>a.z-b.z);pump();
  // 同じ倍率で横へ移動し続けても、画面外の詳細タイルが蓄積しないようにする。
  if(cache.size>256)for(const [key,t] of [...cache].sort((a,b)=>(a[1].seen||0)-(b[1].seen||0))){if(cache.size<=192)break;if(t.z!==6&&t.seen!==frame&&(t.ready||t.error))cache.delete(key);}
 }
 return {draw,setCoverage,getRevision:()=>revision,heightFromRgb,shadeElevations,stats:()=>({timings:timings.map(t=>({...t})),tiles:[...cache.values()].map(t=>({provider:t.provider,z:t.z,x:t.x,y:t.y,ready:!!t.ready,error:!!t.error,drawn:t.drawnFrame===frame})),loaded,failed,pending:pending.length,running,zoom:lastZoom,cached:cache.size,revision,provider:'GSI DEM / Mapzen DEM; shared hillshade',gsiLoaded:[...cache.values()].filter(t=>t.provider==='gsi'&&t.ready).length})};
})();
