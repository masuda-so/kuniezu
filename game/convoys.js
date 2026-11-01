"use strict";
(function(){
 G.marchGroupKey=u=>u.state==='march'?[G.armyIdentity(u).command,u.until||u.historyTitle||'',u.path.join('>'),u.seg,u.mission,u.schedule?.start||u.depart||'',u.schedule?.end||''].join('|'):null;
 G.convoyLayout=function(units,z,project,position){const rows=units.map(u=>{const world=position(u),[x,y]=project(...world);return {u,id:u.id,world,x,y};}),used=new Set(),out=[];
  for(const row of rows){if(used.has(row.id))continue;const key=G.marchGroupKey(row.u),near=key?rows.filter(p=>!used.has(p.id)&&G.marchGroupKey(p.u)===key&&Math.hypot(p.x-row.x,p.y-row.y)<40&&Math.hypot(p.world[0]-row.world[0],p.world[1]-row.world[1])<=8):[row];near.forEach(p=>used.add(p.id));near.sort((a,b)=>(b.u.troops||0)-(a.u.troops||0));
   if(z<3.2&&near.length>1){const lead=near[0];out.push({...lead,members:near.map(p=>({id:p.id,x:p.x,y:p.y})),combined:true,displayUnit:{...lead.u,troops:near.reduce((n,p)=>n+(p.u.troops||0),0)}});continue;}
   for(const [rank,p]of near.entries()){let q=p.world;if(near.length>1){const u=p.u,line=u.visualTravel?.line||G.historyGeometry?.(u)||G.visualEdgeGeo(u.path[u.seg],u.path[Math.min(u.seg+1,u.path.length-1)]);if(line?.length>1)q=G.offsetVisualPoint(line,p.world,(rank-(near.length-1)/2)*44/z,(near.length-1)*44/z);}
    const [x,y]=project(...q);out.push({...p,x,y,displayUnit:{...p.u,_displayPoint:q,_displayAngle:q[2],_convoySize:near.length},members:[{id:p.id,x,y}]});}
  }return out;
 };
})();
