'use strict';
/* Offline reproduction of legacy comparison-line decisions; never loaded by the game. */
module.exports=function(points,reviewed=[]){const keys=points.map(p=>p.join(',')),first=new Map(),last=new Map(),cum=[0];for(let i=0;i<points.length;i++){if(!first.has(keys[i]))first.set(keys[i],i);last.set(keys[i],i);if(i){const a=points[i-1],b=points[i];cum.push(cum.at(-1)+Math.hypot((b[0]-a[0])*Math.cos((a[1]+b[1])*Math.PI/360),b[1]-a[1])*111.32);}}
  const candidates=[...first].map(([k,a])=>[a,last.get(k)]).filter(([a,b])=>b-a>=2&&cum[b]-cum[a]>.05).sort((a,b)=>a[0]-b[0]||b[1]-a[1]),cuts=[];let covered=-1;
  for(const [a,b]of candidates){if(a<covered||a===0&&b===points.length-1)continue;const edges=new Map();for(let i=a+1;i<=b;i++){const f=keys[i-1],t=keys[i];if(f===t)continue;const key=f<t?f+'>'+t:t+'>'+f,dir=f<t?0:1,row=edges.get(key)||[0,0,cum[i]-cum[i-1]];row[dir]++;edges.set(key,row);}const length=cum[b]-cum[a],returnRatio=[...edges.values()].reduce((n,e)=>n+2*Math.min(e[0],e[1])*e[2],0)/length;
   const approved=reviewed.some(r=>r.junction[0]===points[a][0]&&r.junction[1]===points[a][1]&&length>=r.lengthRange[0]&&length<=r.lengthRange[1]);if(returnRatio<.999&&!approved)continue;cuts.push({first:a,last:b,lengthKm:length,returnRatio,reviewed:approved,junction:points[a]});covered=b;}
  const out=[];let i=0;for(const cut of cuts){out.push(...points.slice(i,cut.first+1));i=cut.last+1;}out.push(...points.slice(i));return {points:out,excursions:cuts,removedVertices:points.length-out.length};
 };
