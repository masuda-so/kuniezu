"use strict";
/* 城どうしの境の置き換え（日朝共通の算法）。tools/geo/apply-castle-regions.cjs の出力 TK.CASTLE_REGIONS を、
   読み込み時に TKGEO.terr と TKGEO.edges へ当てる。2城の領域の和（国・道の外枠）は変えない。
   境は地形の越えにくさ（共通DEMの傾斜・主要河川）による推定で、領有・郡境の史料ではない。根拠は TK.CASTLE_REGIONS の各項目に残す。 */
(function(){
 const R=TK.CASTLE_REGIONS?.regions||{};
 for(const [key,r] of Object.entries(R)){
  if(!TKGEO.terr[r.a]||!TKGEO.terr[r.b])continue;
  TKGEO.terr[r.a]=r.terr[r.a];TKGEO.terr[r.b]=r.terr[r.b];
  const e=TKGEO.edges.find(x=>(x[0]===r.a&&x[1]===r.b)||(x[0]===r.b&&x[1]===r.a));
  if(e)e[2]=r.edge.map(l=>l.slice());
 }
 TK.castleRegionBasis=(a,b)=>R[a+'-'+b]||R[b+'-'+a]||null;
})();
