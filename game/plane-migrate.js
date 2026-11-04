"use strict";
/* 地図平面の切り替え（旧来の簡易平面 → ランベルト正角円錐図法。docs/architecture/map-projection.md）。
   ここより前に読み込むモジュールは、TKGEO の定数（K・CX・LON0・LAT0）で旧平面の座標を作り、TKGEO や TK.* に書き込む。
   このモジュールがそれらを一度だけ新平面へ変換し、以後の実行時（G.build・描画・当たり判定・保存の読み込み）は新平面だけを使う。
   読込順：central-offices.js の後、raster-map.js・ui.js の前。これより後で旧平面の座標を作ってはいけない（TKGEO.project / unproject を使う）。 */
(function(){
 const P=window.TKProjection,GEO=window.TKGEO;if(!P||!GEO||GEO.plane)return;
 const L=P.legacy;if(GEO.K!==L.K||Math.abs(GEO.CX-L.CX)>1e-12||GEO.LON0!==L.LON0||GEO.LAT0!==L.LAT0)throw Error('geo.js の投影の定数が map-projection.js の legacy と違う');
 const flat=a=>P.convertFlat(a),polys=arr=>arr.map(poly=>poly.map(flat));
 for(const id in GEO.terr)GEO.terr[id]=polys(GEO.terr[id]);
 for(const id in GEO.neutral||{})GEO.neutral[id]=polys(GEO.neutral[id]);
 GEO.edges=GEO.edges.map(([a,b,lines])=>[a,b,lines.map(flat)]);
 GEO.pborders=GEO.pborders.map(flat);GEO.rivers=GEO.rivers.map(flat);GEO.lakes=polys(GEO.lakes);
 // land と japanLand は同じ多角形の配列を共有する（japanLand は land の先頭部分）。変換後も同じ配列を指すよう、多角形ごとに一度だけ変換する
 const seen=new Map(),once=poly=>{let v=seen.get(poly);if(!v){v=poly.map(flat);seen.set(poly,v);}return v;};
 GEO.land=GEO.land.map(once);if(GEO.japanLand)GEO.japanLand=GEO.japanLand.map(once);
 for(const id in GEO.cpos){const [x,y]=P.fromLegacy(GEO.cpos[id][0],GEO.cpos[id][1]);GEO.cpos[id]=[+x.toFixed(1),+y.toFixed(1)];}
 // 国名の名札：位置と、文字の向き（a）。正角図法では向きがその場所の北の傾きだけ回る
 for(const p of GEO.plabels){const [x,y]=P.fromLegacy(p.x,p.y);if(Number.isFinite(p.a))p.a=+(p.a-P.plane.northAngle(x,y)).toFixed(4);p.x=+x.toFixed(1);p.y=+y.toFixed(1);}
 // 読み込み時に旧平面で作られた TK.* の座標
 if(TK.ROADFIX)for(const k in TK.ROADFIX){const f=TK.ROADFIX[k];if(f?.[2])f[2]=f[2].map(([x,y])=>P.fromLegacy(x,y));}// 点数の照合（engine.js）は新平面の距離で行うので、合わない街道は経緯度から引き直される
 for(const r of TK.LOCAL_MOVEMENT_ROUTES||[])for(const pt of r.points||[]){const [x,y]=P.fromLegacy(pt[0],pt[1]);pt[0]=x;pt[1]=y;}// 同じ配列を各モジュールが参照するので、その場で書き換える
 for(const h of TK.HISTORIC_WATERS||[])if(h.poly)h.poly=h.poly.map(flat);
 // 旧平面の範囲 [0,0]-[W,H] を新平面へ写した外接長方形（カメラの初期値などの目安）
 {let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;for(const [x,y] of [[0,0],[GEO.W,0],[0,GEO.H],[GEO.W,GEO.H],[GEO.W/2,0],[GEO.W/2,GEO.H]]){const [X,Y]=P.fromLegacy(x,y);x0=Math.min(x0,X);y0=Math.min(y0,Y);x1=Math.max(x1,X);y1=Math.max(y1,Y);}
  GEO.X0=x0;GEO.Y0=y0;GEO.W=x1-x0;GEO.H=y1-y0;}
 // 以後の実行時の式。K・CX・LON0・LAT0 は旧平面の定数として残す（この後に読むモジュールが座標を作るのに使ってはいけない）
 GEO.plane=P.plane;GEO.project=P.project;GEO.unproject=P.unproject;GEO.fromLegacy=P.fromLegacy;GEO.toLegacy=P.toLegacy;GEO.legacy=L;
 // 平たい線 [x,y,x,y,…] が朝鮮の比較範囲（北緯34.8度以北、東経124〜131度）に収まるか（旧来の判定を新平面で行う）
 GEO.inKoreaBox=r=>{for(let i=0;i+1<r.length;i+=2){const [lo,la]=P.unproject(r[i],r[i+1]);if(!(la>34.8&&lo>124&&lo<131))return false;}return r.length>0;};
 // 保存データ：旧平面の座標を持つ欄を新平面へ。新しい局は作った時に印を付ける。印の無い保存は旧平面とみなす
 const TAG='lcc-135-30-42';GEO.planeTag=TAG;
 const pt=p=>{if(Array.isArray(p)&&Number.isFinite(p[0])&&Number.isFinite(p[1])){const [x,y]=P.fromLegacy(p[0],p[1]);p[0]=x;p[1]=y;}return p;};
 const line=l=>{if(Array.isArray(l))for(const p of l)pt(p);return l;};
 const xy=o=>{if(o&&Number.isFinite(o.x)&&Number.isFinite(o.y)){const [x,y]=P.fromLegacy(o.x,o.y);o.x=x;o.y=y;}};
 function migrate(s){
  for(const id in s.cst||{})xy(s.cst[id]);
  for(const r of s.ruins||[])xy(r);for(const id in s.forts||{})xy(s.forts[id]);for(const f of s.castleFires||[])xy(f);
  for(const p of s.sites||[])if(Number.isFinite(p.x)&&Number.isFinite(p.y2)){const [x,y]=P.fromLegacy(p.x,p.y2);p.x=x;p.y2=y;}// sites の y は年、平面の y は y2
  for(const u of s.units||[]){if(u.visualTravel)line(u.visualTravel.line);line(u.visualRouteLine);}
  for(const g of s.gens||[]){if(g.tr)line(g.tr.line);pt(g._visualPoint);}
  for(const b of Object.values(s.personLocationDisplay?.bridges||{}))line(b?.line);
  s.planeProjection=TAG;}
 const hook=()=>{const G=window.G;if(!G?.setS||!G.newGame)return false;
  const set=G.setS;G.setS=function(s){if(s&&s.planeProjection!==TAG)migrate(s);return set(s);};
  const init=G.newGame;G.newGame=function(...a){const s=init(...a);if(s&&!s.planeProjection)s.planeProjection=TAG;return s;};return true;};
 if(!hook())throw Error('plane-migrate.js は engine.js とその拡張の後に読み込む');
})();
