"use strict";
/* 本城の領域内を、本城と支城への直線距離で分ける。史実の領界を示すものではない。 */
(function(root){
 function clip(ring,a,b){const out=[],nx=b.x-a.x,ny=b.y-a.y,c=(b.x*b.x+b.y*b.y-a.x*a.x-a.y*a.y)/2;
  const val=(x,y)=>nx*x+ny*y-c;
  for(let i=0;i<ring.length;i+=2){const j=(i+2)%ring.length,ax=ring[i],ay=ring[i+1],bx=ring[j],by=ring[j+1],va=val(ax,ay),vb=val(bx,by),ina=va<=1e-8,inb=vb<=1e-8;
   if(ina)out.push(ax,ay);if(ina!==inb){const t=va/(va-vb);out.push(ax+(bx-ax)*t,ay+(by-ay)*t);}}
  return out.length>=6?out:[];
 }
 function split(polys,seeds){return seeds.map((seed,i)=>{const polygons=[];
  for(const poly of polys){const rings=[];for(let ri=0;ri<poly.length;ri++){let r=poly[ri];for(let j=0;j<seeds.length&&r.length;j++){if(i===j)continue;const b=seeds[j];if(Math.hypot(seed.x-b.x,seed.y-b.y)<1e-7){if(j<i)r=[];continue;}r=clip(r,seed,b);}if(!ri&&!r.length)break;if(r.length)rings.push(r);}if(rings.length)polygons.push(rings);}
  return {...seed,polygons};});}
 const api={clip,split};root.TKGeometry=api;if(typeof module!=='undefined')module.exports=api;
 if(!root.G)return;
 const cache=new Map();
 root.G.branchCells=function(id){const G=root.G,C=G.C[id];if(!C||!root.TKGEO.terr[id])return [];
  const ys=(G.YOSHO_AT[id]||[]).filter(y=>y.kind==='城'&&G.yActive(y));
  const sig=C.x+','+C.y+'|'+ys.map(y=>y.id).join('|');const prev=cache.get(id);if(prev&&prev.sig===sig)return prev.cells;
  const seeds=[{id,x:C.x,y:C.y,main:true},...ys.map(y=>({id:y.id,x:y.x,y:y.y,site:y}))];
  const cells=split(root.TKGEO.terr[id],seeds);cache.set(id,{sig,cells});return cells;
 };
})(typeof window!=='undefined'?window:globalThis);
