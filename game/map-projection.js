"use strict";
/* 地図平面の投影。ブラウザ（window.TKProjection）と Node（require）で同じ式を使う。
   平面の単位は従来どおり「標準緯線での緯度 1/200 度 ≈ 556.6m」、x は右、y は下。
   ・legacy：旧来の簡易平面 x=(経度-129.2)·200·cos36°、y=(41.75-緯度)·200。正本の画像（game/map/control/provinces.png など）の格子はこれ。
   ・lcc：ランベルト正角円錐図法（球）。表示とゲームの平面はこれ。経線は中央経線に向かって寄り、緯線は弧になる。
     中央経線 135°E、標準緯線 30°N・42°N、原点（0,0）は 135°E・36°N。北は中央経線の上でだけ真上を向く。
   投影の取り違えを防ぐため、経緯度→平面は project、平面→経緯度は unproject、旧平面→新平面は fromLegacy とだけ呼ぶ。 */
(function(root){
 const D=Math.PI/180,UNITS_PER_DEGREE=200;
 const legacy={K:UNITS_PER_DEGREE,CX:Math.cos(36*D),LON0:129.2,LAT0:41.75,
  project:(lon,lat)=>[(lon-129.2)*UNITS_PER_DEGREE*Math.cos(36*D),(41.75-lat)*UNITS_PER_DEGREE],
  unproject:(x,y)=>[x/UNITS_PER_DEGREE/Math.cos(36*D)+129.2,41.75-y/UNITS_PER_DEGREE]};
 function lcc(p){
  const lon0=p.lon0,lat0=p.lat0,lat1=p.lat1,lat2=p.lat2,R=UNITS_PER_DEGREE/D;// 球の半径（平面の単位）。緯度1度＝200単位
  const t=la=>Math.tan(Math.PI/4+la*D/2),c1=Math.cos(lat1*D),c2=Math.cos(lat2*D);
  const n=lat1===lat2?Math.sin(lat1*D):Math.log(c1/c2)/Math.log(t(lat2)/t(lat1)),F=c1*Math.pow(t(lat1),n)/n,rho=la=>R*F/Math.pow(t(la),n),rho0=rho(lat0);
  const wrap=d=>((d+540)%360)-180;
  return {type:'lcc',lon0,lat0,lat1,lat2,n,unitsPerDegree:UNITS_PER_DEGREE,
   // y は下向き。円錐の頂点（極側）は (0, -rho0)。北緯ほど r が小さく、y が小さい（上）
   project(lon,lat){const r=rho(lat),th=n*wrap(lon-lon0)*D;return [r*Math.sin(th),r*Math.cos(th)-rho0];},
   unproject(x,y){const Y=y+rho0,r=Math.sign(n)*Math.hypot(x,Y),th=Math.atan2(x,Y);return [lon0+th/n/D,(2*Math.atan(Math.pow(R*F/r,1/n))-Math.PI/2)/D];},
   // 縮尺係数（標準緯線で1）。距離を平面で測る時の目安
   scale(lat){return n*rho(lat)/(R*Math.cos(lat*D));},
   // 平面の点での真北の向き（画面の上から時計回りに測った角、ラジアン）。中央経線の東では北が左へ傾く（陸は右へ回って見える）
   northAngle(x,y){return Math.atan2(-x,y+rho0);}};}
 const DEFAULT={type:'lcc',lon0:135,lat0:36,lat1:30,lat2:42};
 const plane=lcc(DEFAULT);
 const api={legacy,lcc,params:DEFAULT,plane,project:plane.project,unproject:plane.unproject,
  fromLegacy:(x,y)=>plane.project(...legacy.unproject(x,y)),toLegacy:(x,y)=>legacy.project(...plane.unproject(x,y)),
  // 旧平面の [x,y,x,y,…] の平たい配列や [[x,y],…] の配列を新平面へ。入れ子はそのまま辿る
  convertFlat(a){const o=new Array(a.length);for(let i=0;i<a.length;i+=2){const q=api.fromLegacy(a[i],a[i+1]);o[i]=+q[0].toFixed(3);o[i+1]=+q[1].toFixed(3);}return o;},
  convertDeep(v){if(!Array.isArray(v))return v;if(v.length&&typeof v[0]==='number')return v.length===2?api.fromLegacy(v[0],v[1]).map(x=>+x.toFixed(3)):api.convertFlat(v);return v.map(api.convertDeep);}};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TKProjection=api;
})(typeof window!=='undefined'?window:globalThis);
