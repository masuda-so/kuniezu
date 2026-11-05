"use strict";
/* 日朝とも主要河川だけを地図の情報量に合わせて表示する。細流の全件表示は行わない。 */
(function(){
 const major=new Set(['압록강','두만강','대동강','청천강','한강','남한강','북한강','임진강','낙동강','금강','섬진강','영산강','예성강','례성강','성천강']);
 TK.HYDRO_AUDIT={koreanBefore:10457,koreanLoaded:TK.KOREAN_RIVERS_DETAIL.length};
 TK.KOREAN_RIVERS_DETAIL=TK.KOREAN_RIVERS_DETAIL.filter(r=>r.name.split(/\s+/).some(n=>major.has(n)));
 TK.RIVER_NAME_EQUIVALENTS={'豆満江':'두만강','鴨緑江':'압록강','漢江':'한강','南漢江':'남한강','洛東江':'낙동강'};
 TK.HYDRO_AUDIT.koreanAfter=TK.KOREAN_RIVERS_DETAIL.length;
 if(TK.RESEARCH_SOURCES.koreaRiverDetail)TK.RESEARCH_SOURCES.koreaRiverDetail.locator='2026-10-30版の全10,457区間を原資料として保持。多言語併記を照合し、通常表示は主要河川'+TK.HYDRO_AUDIT.koreanAfter+'区間に限定。';
 // 縮尺に対して短すぎる線は日本・朝鮮ともに描かない。史料付き旧河道もデータからは消さない。
 TK.waterLineVisible=function(pts,project){if(pts.length<2)return false;let length=0;for(let i=1;i<pts.length;i++){const a=project(...pts[i-1]),b=project(...pts[i]);length+=Math.hypot(b[0]-a[0],b[1]-a[1]);}return length>=7;};
 // 投影済みの線を共通入力とする。地理座標への変換は読込側で一度だけ行う。
 const geometries=new WeakMap();
 TK.riverGeometry=function(points){if(geometries.has(points))return geometries.get(points);let length=0,x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;for(let i=0;i<points.length;i++){const [x,y]=points[i];x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);if(i)length+=Math.hypot(x-points[i-1][0],y-points[i-1][1]);}const record={points,length,bounds:[x0,y0,x1,y1]};geometries.set(points,record);return record;};
 TK.riverVisible=function(record,view,scale){const [x0,y0,x1,y1]=record.bounds;return record.points.length>=2&&record.length*scale>=7&&x0<=view[2]&&x1>=view[0]&&y0<=view[3]&&y1>=view[1];};
 // 概略資料と詳細資料を同じ河川ごとにまとめ、二重の流路を描かない。
 TK.regionalRiverRecords=function(regional,detailed,project){const groups=new Map(),canonical=n=>TK.RIVER_NAME_EQUIVALENTS[n]||n;for(const r of regional){let row=groups.get(r.name);if(!row){row={...r,border:false,lines:[]};groups.set(r.name,row);}row.border=row.border||r.border;row.lines.push(...r.lines);}
  return [...groups.values()].map(r=>{const detailRows=detailed.filter(d=>d.name.split(/\s+/).some(n=>canonical(n)===canonical(r.name))),lines=detailRows.length?detailRows.map(d=>d.points):r.lines,geometries=lines.map(line=>TK.riverGeometry(line.map(p=>project(...p)))),longest=geometries.reduce((a,b)=>!a||b.length>a.length?b:a,null);return {...r,geometrySource:detailRows.length?'koreaRiverDetail':'regionalRivers',detailRows,detailed:!!detailRows.length,geometries,mid:longest?.points[Math.floor(longest.points.length/2)]};});
 };
 TK.riverPath=function(c,pts,maxCut=2){c.beginPath?.();if(!pts.length)return;c.moveTo(...pts[0]);for(let i=1;i<pts.length-1;i++){const a=pts[i-1],b=pts[i],d=pts[i+1],l=Math.hypot(b[0]-a[0],b[1]-a[1]),r=Math.hypot(d[0]-b[0],d[1]-b[1]),cut=Math.min(maxCut,l/4,r/4);if(!l||!r){c.lineTo(...b);continue;}c.lineTo(b[0]+(a[0]-b[0])*cut/l,b[1]+(a[1]-b[1])*cut/l);c.quadraticCurveTo(...b,b[0]+(d[0]-b[0])*cut/r,b[1]+(d[1]-b[1])*cut/r);}if(pts.length>1)c.lineTo(...pts.at(-1));c.lineCap='round';c.lineJoin='round';};
})();
