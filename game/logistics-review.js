"use strict";
/* 施設・渡河を共通経路へ適用する。係数はゲーム上の仮定、史実の固定到着日は変更しない。 */
(function(){
 let index=new Map(),facilityIndex=new Map();const cell=24,key=(x,y)=>Math.floor(x/cell)+','+Math.floor(y/cell);
 function add(a,b){for(let x=Math.floor(Math.min(a[0],b[0])/cell);x<=Math.floor(Math.max(a[0],b[0])/cell);x++)for(let y=Math.floor(Math.min(a[1],b[1])/cell);y<=Math.floor(Math.max(a[1],b[1])/cell);y++){const k=x+','+y;if(!index.has(k))index.set(k,[]);index.get(k).push([a,b]);}}
 function crossing(a,b,c,d){const rx=b[0]-a[0],ry=b[1]-a[1],sx=d[0]-c[0],sy=d[1]-c[1],v=rx*sy-ry*sx;if(Math.abs(v)<1e-9)return null;const t=((c[0]-a[0])*sy-(c[1]-a[1])*sx)/v,u=((c[0]-a[0])*ry-(c[1]-a[1])*rx)/v;return t>1e-5&&t<.99999&&u>=0&&u<=1?t:null;}
 let hitsCache=new WeakMap();
 function hits(line){if(hitsCache.has(line))return hitsCache.get(line);const lens=line.slice(1).map((b,i)=>Math.hypot(b[0]-line[i][0],b[1]-line[i][1])),L=lens.reduce((a,b)=>a+b,0),ds=[];let passed=0;
  for(let i=1;i<line.length;i++){const a=line[i-1],b=line[i],candidates=new Set();for(let x=Math.floor(Math.min(a[0],b[0])/cell);x<=Math.floor(Math.max(a[0],b[0])/cell);x++)for(let y=Math.floor(Math.min(a[1],b[1])/cell);y<=Math.floor(Math.max(a[1],b[1])/cell);y++)for(const s of index.get(x+','+y)||[])candidates.add(s);for(const [c,d]of candidates){const t=crossing(a,b,c,d);if(t!=null)ds.push(passed+t*lens[i-1]);}passed+=lens[i-1];}
  ds.sort((a,b)=>a-b);const clean=ds.filter((d,i)=>!i||d-ds[i-1]>.9).map(d=>d/Math.max(1e-9,L));hitsCache.set(line,clean);return clean;
 }
 G.routeCrossings=hits;
 // Existing campaigns retain their pacing so loading mid-march preserves position.
 const newGame=G.newGame;
 G.newGame=function(...args){
  const state=newGame(...args);
  state.riverPacingVersion=2;
  return state;
 };
 let crossingPlans=[new WeakMap(),new WeakMap()];
 G.visualDistanceFraction=function(line,f){
  const fixedDistance=G.S()?.riverPacingVersion===2;
  const cache=crossingPlans[Number(fixedDistance)];
  let plan=cache.get(line);
  if(plan===undefined){
   const crossings=hits(line);
   plan=null;
   if(crossings.length){
    // 300 metres on either side is a display parameter, in game distance units.
    const radius=fixedDistance ? (0.3*200/111.32)/G.visualPathLength(line) : .025;
    const limits=[0,1,...crossings.flatMap(x=>[Math.max(0,x-radius),Math.min(1,x+radius)])].sort((a,b)=>a-b);
    const parts=[];
    let cost=0;
    for(let i=1;i<limits.length;i++){
     const start=limits[i-1],end=limits[i];
     const factor=crossings.some(x=>Math.abs((start+end)/2-x)<=radius)?2.5:1;
     const weight=(end-start)*factor;
     parts.push({start,factor,weight});
     cost+=weight;
    }
    plan={parts,cost};
   }
   cache.set(line,plan);
  }
  if(!plan)return f;
  if(f<=0)return 0;
  if(f>=1)return 1;
  let remaining=f*plan.cost;
  for(const part of plan.parts){
   if(remaining<=part.weight)return part.start+remaining/part.factor;
   remaining-=part.weight;
  }
  return 1;
 };
 const pointDist=(p,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p.x-a[0])*dx+(p.y-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-a[0]-t*dx,p.y-a[1]-t*dy);};
 const facilitiesCache=new WeakMap();
 function routeFacilities(line){if(facilitiesCache.has(line))return facilitiesCache.get(line);const found=new Set();for(let i=1;i<line.length;i++){const a=line[i-1],b=line[i];for(let x=Math.floor((Math.min(a[0],b[0])-3.6)/cell);x<=Math.floor((Math.max(a[0],b[0])+3.6)/cell);x++)for(let y=Math.floor((Math.min(a[1],b[1])-3.6)/cell);y<=Math.floor((Math.max(a[1],b[1])+3.6)/cell);y++)for(const site of facilityIndex.get(x+','+y)||[])found.add(site);}const sites=[...found].filter(y=>line.slice(1).some((p,i)=>pointDist(y,line[i],p)<3.6));facilitiesCache.set(line,sites);return sites;}
 const contexts=new WeakMap();
 // 施設は駒のいる場所・当日の区間で判定。経路全体や別の拠点間の施設を混ぜない。
 G.marchRouteContext=function(u,a,b){const state=G.S(),q=u.visualTravel,day=state.t-(G._continuousDayAdvance?1:0),key=[day,u.seg,u.pos,a,b,q?.start,q?.end].join('|');let c=contexts.get(u);if(c&&c.state===state&&c.key===key&&c.travel===q)return c;
  if(q?.line?.length>1&&q.end>q.start){const span=q.end-q.start,from=(day-q.start)/span,to=(day+1-q.start)/span,line=G.visualPathSlice(q.line,from,to),point=G.visualPathPoint(q.line,from);c={state,key,travel:q,line,point,crossings:hits(line).length,basis:'display-route-daily-segment'};}
  else {const whole=G.visualEdgeGeo(a,b),point=G.visualEdgePoint(a,b,u.pos||0);c={state,key,travel:q,line:[point.slice(0,2),point.slice(0,2)],point,crossings:hits(whole).length,basis:'current-edge-position'};}
  contexts.set(u,c);return c;
 };
 G.yoshoEffects=function(u,a,b,e){const s=G.S(),context=G.marchRouteContext(u,a,b),line=context.line,effects=new Map();e={...e,river:context.crossings};
  for(const y of new Set([...routeFacilities(line),...(G.YOSHO_AT[a]||[]),...(G.YOSHO_AT[b]||[])])){if(!G.yActive(y)||!['宿','馬','橋','関','湊'].includes(y.kind))continue;if(!line.slice(1).some((p,i)=>pointDist(y,line[i],p)<3.6))continue;const owner=G.yOwner(y),own=owner===u.clan||G.allied(owner,u.clan),foe=!own&&G.atWar(owner,u.clan);let speed=1,food=1;
   if(y.kind==='宿'&&own&&!e.sea){speed=1.2;food=.7;}else if(y.kind==='馬'&&own&&!e.sea)speed=1.05;else if(y.kind==='湊'&&own&&e.sea)speed=1.25;else if(y.kind==='関'&&foe&&!e.sea)speed=.8;else if(y.kind==='橋'&&e.river&&!e.sea)speed=own?1.15:foe?.85:1;
   if(speed!==1&&!effects.has(y.kind))effects.set(y.kind,{name:y.n,speed,food});}
  const rows=[...effects.values()];return {speed:Math.max(.65,Math.min(1.45,rows.reduce((n,x)=>n*x.speed,1))),food:rows.some(x=>x.food<1)?.7:1,rows};
 };
 const factors=G.marchFactors;
 G.marchFactors=function(u,a,b){const r=factors(u,a,b);if(!r)return r;const edge=G.EDGES[G.ekey(a,b)],infra=G.yoshoEffects(u,a,b,edge),crossings=edge.sea?0:G.marchRouteContext(u,a,b).crossings,ratio=edge.sea?1:(1+.12*Math.min(2,edge.river))/(1+.12*Math.min(2,crossings));return {...r,days:r.days/infra.speed/ratio,speed:r.speed*infra.speed*ratio,facilities:infra,factors:[...r.factors.map(([k,v])=>k==='渡河'?[k,crossings+'箇所・渡河中は減速']:[k,v]),...infra.rows.map(x=>[x.name,'速度 ×'+x.speed.toFixed(2)+(x.food<1?'・兵糧消費 ×0.70':'')])],note:r.note+' 施設は稼働中・通過経路付近だけを対象とし、同種施設の効果は重複加算しません。'};};
 const build=G.build;G.build=function(){build();hitsCache=new WeakMap();crossingPlans=[new WeakMap(),new WeakMap()];index=new Map();facilityIndex=new Map();for(const y of G.YOSHO){const k=key(y.x,y.y);if(!facilityIndex.has(k))facilityIndex.set(k,[]);facilityIndex.get(k).push(y);}for(const r of TKGEO.rivers){if(TKGEO.inKoreaBox(r))continue;for(let i=2;i<r.length;i+=2)add([r[i-2],r[i-1]],[r[i],r[i+1]]);}for(const r of TK.KOREAN_RIVERS_DETAIL||[])for(let i=1;i<r.points.length;i++)add(G.PJ(...r.points[i-1]),G.PJ(...r.points[i]));for(const r of TK.REGIONAL_RIVERS||[])for(const l of r.lines)for(let i=1;i<l.length;i++)add(G.PJ(...l[i-1]),G.PJ(...l[i]));
  for(const e of Object.values(G.EDGES)){if(e.sea)continue;const before=e.river||0,hs=hits(G.edgeGeo(e.a,e.b));e.crossings=hs;e.river=hs.length;e.days=e.days/(1+.12*Math.min(2,before))*(1+.12*Math.min(2,e.river));}
 };
})();
