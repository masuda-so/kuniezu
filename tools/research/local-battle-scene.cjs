'use strict';
// この関数本体だけを生成JavaScriptへ埋込可能。Node・外部クロージャ依存なし。
function filterLocalScene(original,spec){
 const fail=message=>{throw Error('Invalid local scene scope: '+message);};
 const clone=value=>Array.isArray(value)?value.map(clone):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,clone(v)])):value;
 const window=spec.sourceClockWindow;
 if(!Array.isArray(window)||window.length!==2||!window.every(Number.isFinite)||window[0]<0||window[1]>100||window[0]>=window[1])fail('clock window');
 if(!spec.childTitle||!spec.date||!spec.scope)fail('title/date/scope');
 const [start,end]=window,map=t=>(t-start)*100/(end-start);
 const unitIds=new Set(spec.allowUnitIds),groupIds=new Set(spec.allowGroupIds);
 if(!unitIds.size||unitIds.size!==spec.allowUnitIds.length||!groupIds.size||groupIds.size!==spec.allowGroupIds.length)fail('empty/duplicate allowlist');
 const sourceUnits=new Map((original.units||[]).map(u=>[u.id,u]));
 const sourceGroups=new Map((original.atlasGroups||[]).map(g=>[g.id,g]));
 for(const id of unitIds)if(!sourceUnits.has(id))fail('unknown unit '+id);
 for(const id of groupIds)if(!sourceGroups.has(id))fail('unknown group '+id);
 const sc=clone(original);sc.title=spec.childTitle;sc.date=spec.date;sc.place=spec.scope;
 sc.sourceClock={title:original.title,from:start,to:end};
 // mapVisibleUntilはexclusive。完全に窓外の参陣窓を子へ持ち込まない。
 const effectiveIds=new Set([...unitIds].filter(id=>{const u=sourceUnits.get(id),from=Math.max(original.mapVisibleFrom?.[id]??0,u.from??0),until=Math.min(original.mapVisibleUntil?.[id]??Infinity,u.hideAt??Infinity);return from<=end&&until>start&&from<until;}));
 const ease=f=>f<.5?2*f*f:1-Math.pow(-2*f+2,2)/2;
 const at=(path,t)=>{if(t<=path[0][0])return path[0].slice(1);for(let i=1;i<path.length;i++)if(t<=path[i][0]){const a=path[i-1],b=path[i],f=ease((t-a[0])/(b[0]-a[0]));return a.slice(1).map((v,j)=>v+(b[j+1]-v)*f);}return path[path.length-1].slice(1);};
 sc.units=sc.units.filter(u=>effectiveIds.has(u.id)).map(u=>{
  if(u.sourcePath||u.pathClock)fail('nested path clock '+u.id);
  const path=u.path;if(!Array.isArray(path)||!path.length||path.some((p,i)=>!Array.isArray(p)||p.length!==3||!p.every(Number.isFinite)||(i&&p[0]<=path[i-1][0])))fail('path '+u.id);
  u.sourcePath=clone(path);u.pathClock={from:start,to:end};
  // 旧rendererの開始位置用。動きの評価はatUnitでsourcePathを使う。
  u.path=[[0,...at(path,start)],...path.filter(p=>p[0]>start&&p[0]<end).map(p=>[map(p[0]),...p.slice(1)]),[100,...at(path,end)]];
  for(const key of ['from','die','rout','hideAt'])if(u[key]!=null){if(!Number.isFinite(u[key]))fail(key+' '+u.id);if(u[key]>end&&key!=='from')delete u[key];else u[key]=map(u[key]);}
  if(u.fire){if(u.fire.length!==2||!u.fire.every(Number.isFinite)||u.fire[0]>u.fire[1])fail('fire '+u.id);if(u.fire[1]<start||u.fire[0]>end)delete u.fire;else u.fire=[map(Math.max(start,u.fire[0])),map(Math.min(end,u.fire[1]))];}
  if(u.turn){if(!Number.isFinite(u.turn[0]))fail('turn '+u.id);if(u.turn[0]>end)delete u.turn;else u.turn=[map(u.turn[0]),...u.turn.slice(1)];}
  return u;
 });
 const filterGroups=groups=>groups.filter(g=>groupIds.has(g.id)).map(g=>{g.members=g.members.filter(id=>effectiveIds.has(id));if(!g.members.length)fail('empty group '+g.id);return g;});
 sc.atlasGroups=filterGroups(sc.atlasGroups||[]);sc.atlasUnits=filterGroups(sc.atlasUnits||[]);
 const located=new Set(sc.atlasGroups.flatMap(g=>g.members));
 if([...effectiveIds].some(id=>!located.has(id)))fail('unit has no retained group');
 for(const key of ['mapVisibleFrom','mapVisibleUntil'])if(sc[key])sc[key]=Object.fromEntries(Object.entries(sc[key]).filter(([id])=>effectiveIds.has(id)).map(([id,t])=>[id,map(t)]));
 for(const key of ['mapExitLabels','motionFallbacks'])if(sc[key])sc[key]=Object.fromEntries(Object.entries(sc[key]).filter(([id])=>effectiveIds.has(id)));
 const timeline=(rows,allowed)=>rows.filter(b=>allowed.includes(b[0])&&b[0]>=start&&b[0]<=end).map(b=>[map(b[0]),b[1],...(b[2]?[b[2].filter(id=>effectiveIds.has(id))]:[])]);
 for(const t of [...(spec.keepBeatSourcePercentages||[]),...(spec.keepCalendarSourcePercentages||[])])if(!Number.isFinite(t)||t<start||t>end)fail('timeline outside source window');
 sc.beats=timeline(sc.beats||[],spec.keepBeatSourcePercentages||[]);sc.researchBeats=timeline(sc.researchBeats||[],spec.keepBeatSourcePercentages||[]);sc.calendar=timeline(sc.calendar||[],spec.keepCalendarSourcePercentages||[]);
 sc.atlasLandmarks=(sc.atlasLandmarks||[]).filter(p=>(spec.allowLandmarkNames||[]).includes(p.name));
 sc.feats=(sc.feats||[]).filter(f=>!(spec.excludeFeatureNames||[]).includes(f.n));
 for(const side of Object.values(sc.sides||{}))side.tr='—';
 return {scene:sc,movementKey:sc.title,movements:[]};
}
// motion.jsのat(path,t)に渡す時計だけ変換。UIの討死等は子時計のまま。
function sourceUnitClock(u,t){return u.pathClock?u.pathClock.from+t/100*(u.pathClock.to-u.pathClock.from):t;}
module.exports={filterLocalScene,sourceUnitClock};
