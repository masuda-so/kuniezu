/* 旧保存の時計移行。計画中は入力も、現在のゲーム状態も変更しない。 */
(function(){
 'use strict';
 const C=window.TKCalendar;
 function plan(original,chosen,{events=[],documentedSamples=[]}={}){
  if(original.clockVersion===C.version)return {state:JSON.parse(JSON.stringify(original)),changed:false};
  if(original.clockVersion!=null)throw Error('この保存の暦には対応していません');
  const dates=C.legacyDateChoices(original);
  const same=(a,b)=>a.y===b.y&&a.m===b.m&&a.d===b.d;
  if(dates.requiresSelection&&!chosen){const error=new Error('移行先の日付を選んでください');error.code='clock-date-selection';error.dates=dates;throw error;}
  chosen=chosen||dates.date;
  if(!dates.choices.some(d=>same(d,chosen)))throw Error('表示された実在日から選んでください');
  const s=JSON.parse(JSON.stringify(original)),base=C.toJD(s.y0,s.m0,1),oldNow=s.t,newNow=C.toJD(chosen.y,chosen.m,chosen.d)-base;
  const fraction=Number.isFinite(s.visualFraction)?Math.max(0,Math.min(1,s.visualFraction)):0;
  const invalid=[];
  const overdueMotion=[];
  const event=title=>events.find(e=>e.title===title&&e.k!=='premarch');
  const dateTime=date=>C.toJD(...date)-base;
  const relative=t=>Number.isFinite(t)?newNow+(t-oldNow):t;
  const stamp=(t,key)=>{
   if(!Number.isFinite(t))return t;
   const date=C.legacyDate(original,t);
   try{return C.toJD(date.y,date.m,date.d)-base+(t-Math.floor(t));}
   catch(error){if(!(error instanceof RangeError))throw error;invalid.push({key,time:t,date});return relative(t);}
  };
  const fields=(row,keys,convert)=>{if(!row)return;for(const k of keys)if(Number.isFinite(row[k]))row[k]=convert(row[k],k);};
  const rows=(list,keys,convert)=>{for(const row of list||[])fields(row,keys,convert);};
  // 機械的な期限と経過日数は、当日からの残り・経過を保つ。
  fields(s,['lastInc','lastRaidEv'],relative);
  for(const key of ['war','negT'])for(const id of Object.keys(s[key]||{}))s[key][id]=(key==='war'?stamp:relative)(s[key][id],key+'.'+id);
  rows(s.pendMoves,['after','until'],relative);rows(s.pendAppear,['until'],relative);
  fields(s.retainer,['t'],relative);rows(s.hunts,['t1','next'],relative);
  rows(s.branchSieges,['end'],relative);rows(s.arcs,['t0','t1'],relative);
  rows(s.altQ,['t'],relative);rows(s.jpend,['until'],relative);
  rows(s.castleFires,['start','until'],relative);rows(s.improvements?.projects,['start','end'],relative);
  for(const row of Object.values(s.works||{}))fields(row,['start','end'],relative);
  for(const row of Object.values(s.plans||{}))fields(row,['until'],relative);
  rows(s.sites,['t'],relative);
  for(const key of ['sceneQ','observerQ'])rows(s[key],['t'],relative);
  for(const key of ['log','chron'])for(const row of s[key]||[])fields(row,['t'],(t)=>stamp(t,key));
  // 日数・兵糧・兵数・無期限同盟の番兵値は変換しない。
  // 表示線の進行率を維持する。仮想の表示開始時刻であり、史実の出発日ではない。
  const oldSample=oldNow+fraction,newSample=newNow+fraction;
  function rebase(row,keys,convert,endOverride,id){
   if(!row)return;
   const [a,b]=keys,start=row[a],end=row[b];
   fields(row,keys,convert);
   if(Number.isFinite(endOverride))row[b]=endOverride;
   if(!row.line||!Number.isFinite(start)||!Number.isFinite(end)||end<=start||oldSample<start||oldSample>=end)return;
   const f=(oldSample-start)/(end-start);
   if(row[b]<=newSample){overdueMotion.push(id);return;}
   row[a]=(newSample-f*row[b])/(1-f);
  }
  for(const u of s.units||[]){
   fields(u,['releaseAt'],relative);
   const historical=u.hist&&u.mission==='show'&&u.until&&u.until!=='#hold';
   const e=event(u.until==='#hold'?u.historyTitle:u.until);
   fields(u.schedule,['start','end'],stamp);
   if(u.schedule&&historical){if(u.depart)u.schedule.start=dateTime(u.depart);if(u.arrive)u.schedule.end=dateTime(u.arrive);else if(e)u.schedule.end=dateTime(e.d);}
   if(u.until==='#hold'&&e?.holdUntil)u.releaseAt=dateTime(e.holdUntil);
   rebase(u.visualTravel,['start','end'],historical?stamp:relative,historical?u.schedule?.end:undefined,'unit:'+u.id);
  }
  for(const g of s.gens||[]){fields(g,['exile'],relative);const e=event(g.tr?.planned);rebase(g.tr,['t0','t1'],relative,e?dateTime(e.d):undefined,'person:'+g.id);}
  for(const [id,b] of Object.entries(s.personLocationDisplay?.bridges||{}))rebase(b,['start','end'],stamp,undefined,'bridge:'+id);
  const documentedBridges={};
  for(const row of documentedSamples){
   const end=dateTime(row.nextDate);
   if(end<=newSample){overdueMotion.push(row.id);continue;}
   documentedBridges[row.id]={line:JSON.parse(JSON.stringify(row.line)),start:newSample,end,historicalObservation:false};
  }
  s.clockMigrationDisplay={documentedBridges};
  s.t=newNow;s.clockVersion=C.version;
  return {state:s,changed:true,oldNow,newNow,oldSampleTime:oldSample,newSampleTime:newSample,dates,invalidTimestamps:invalid,overdueMotion};
 }
 // 実行中の旧時計を読む専用。呼出側が旧保存を一時状態へ載せ、採取後に戻す。
 function sampleDocumented(G,TK){
  const time=G.visualTime(),out=[];
  function remaining(line,start,target){
   function foot(p,from=0){let best=null;for(let i=from;i<line.length-1;i++){
    const a=line[i],b=line[i+1],dx=b[0]-a[0],dy=b[1]-a[1],f=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1))),dist=Math.hypot(p[0]-a[0]-f*dx,p[1]-a[1]-f*dy);
    if(!best||dist<best.dist)best={i,f,dist};
   }return best;}
   if(!line||line.length<2)return [start,target];
   const a=foot(start),b=foot(target,a.i);
   return [start,...line.slice(a.i+1,b.i+1).map(p=>p.slice(0,2)),target];
  }
  for(const u of G.documentedArmies()){
   const r=u.record;if(r.point)continue;
   let stops;
   if(u.id==='documented:ieyasu1600')stops=TK.IEYASU_1600_ITINERARY.rows;
   else if(r.itinerary)stops=r.itinerary.rows;
   else if(r.stops)stops=r.stops.map(row=>({date:row[0],point:row.slice(1)}));
   else if(r.end&&r.track)stops=[{date:r.end,point:r.track.at(-1)}];
   const next=stops?.find(row=>G.evT({d:row.date})>time),p=G.historyPoint(u);
   if(!next||!p)continue;
   const target=G.PJ(...next.point),line=remaining(G.historyGeometry(u),p.slice(0,2),target);
   out.push({id:u.id,nextDate:next.date.slice(),line});
  }
  return out;
 }
 function installDisplay(G){
  const point=G.historyPoint,geometry=G.historyGeometry;
  const bridge=u=>{const b=G.S()?.clockMigrationDisplay?.documentedBridges?.[u.id],t=G.visualTime();return b&&t>=b.start&&t<b.end?b:null;};
  G.historyPoint=u=>{const b=bridge(u);return b?G.visualPathPoint(b.line,(G.visualTime()-b.start)/(b.end-b.start)):point(u);};
  G.historyGeometry=u=>bridge(u)?.line||geometry(u);
 }
 window.TKClockMigration=Object.freeze({plan,sampleDocumented,installDisplay});
})();
