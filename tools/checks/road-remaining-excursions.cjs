/* 現在の表示線を再検査。閉路は審査対象であり、史実の支線とは断定しない。 */
const fs=require('node:fs'),{G,TK}=require('./history-focus.cjs').model();
const inverse=p=>[p[0]/(200*Math.cos(36*Math.PI/180))+129.2,41.75-p[1]/200];
const km=(a,b)=>Math.hypot((a[0]-b[0])*Math.cos((a[1]+b[1])*Math.PI/360),a[1]-b[1])*111.32;
const rows=[];
for(const road of G.ROADS){
 const display=TK.roadDisplay(road),points=display.pts.map(inverse),first=new Map(),cum=[0],candidates=[];
 for(let i=0;i<points.length;i++){
  if(i)cum.push(cum[i-1]+km(points[i-1],points[i]));
  const key=points[i].map(x=>x.toFixed(6)).join(',');
  if(!first.has(key))first.set(key,i);
  else {const j=first.get(key),length=cum[i]-cum[j];if(i-j>1&&length>.25)candidates.push({first:j,last:i,lengthKm:length,junction:points[i]});}
 }
 candidates.sort((a,b)=>a.first-b.first||b.last-a.last);
 let end=-1;const independent=[];
 for(const row of candidates){if(row.first<end)continue;end=row.last;independent.push(row);}
 if(independent.length)rows.push({name:road.name,modernReference:!!display.modernReference,vertices:points.length,candidates:independent});
}
rows.sort((a,b)=>Math.max(...b.candidates.map(c=>c.lengthKm))-Math.max(...a.candidates.map(c=>c.lengthKm)));
const result={scope:'全表示街道の整理後の同一点閉路（250m超）を棚卸し。長短を問わず個別審査し、実在支線・別ルートと探索上の往復を分ける。非閉路の枝、交差、近接形状は別途検査が必要。削除処理ではない。',roads:G.ROADS.length,flaggedRoads:rows.length,candidates:rows.reduce((n,r)=>n+r.candidates.length,0),rows};
fs.writeFileSync('data/audits/road-remaining-excursions.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({roads:result.roads,flaggedRoads:result.flaggedRoads,candidates:result.candidates,largest:rows.slice(0,8).map(r=>({name:r.name,km:Math.max(...r.candidates.map(c=>c.lengthKm)),junction:r.candidates.reduce((a,b)=>a.lengthKm>b.lengthKm?a:b).junction}))},null,2));
