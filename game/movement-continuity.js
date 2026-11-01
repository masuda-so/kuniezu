"use strict";
/* 表示位置と人物の移動を同じ経路で追跡する。史実の到着日・領主変更日は動かさない。 */
(function(){
 G.visualTime=()=>G._visualSampleTime??(G.S().t+(G._inSimulation||window.TKUI?.mode&&TKUI.mode!=='game'?0:Math.max(0,Math.min(1,window.TKUI?.acc||0))));
 G.visualEventTime=e=>G.evT(e);
 const dateEnd=u=>u.schedule?.end??G.evT(TK.HIST.find(e=>e.title===u.until&&e.k!=='premarch')||{d:[G.date().y,G.date().m,G.date().d+10]});
 G.battleArrivalPoint=function(u){const sc=TK.BATTLES[u.until||u.historyTitle];if(!sc)return null;const names=u.commanders||u.gens.map(id=>G.gen(id)?.n);for(const name of names){const row=sc.units.find(v=>v.g===name||v.n===name),group=row&&(sc.atlasGroups||[]).find(g=>g.members.includes(row.id));if(group?.point)return G.PJ(...group.point);}return null;};
 const canonical=n=>TK.PORTRAIT_ALIAS[n]||n,events=new Map();for(const e of TK.HIST){if(!e.who||e.admin||e.documentedMarch||e.k==='premarch')continue;const k=canonical(e.who);if(!events.has(k))events.set(k,[]);events.get(k).push(e);}for(const es of events.values())es.sort((a,b)=>(a.d[0]-b.d[0])*360+(a.d[1]-b.d[1])*30+a.d[2]-b.d[2]);
 // 軍勢記録へ切り替わる場合は、その既存記録の開始地点・時刻へ接続する。
 // 開始日が表示上の仮置きかどうかは原記録に残し、新しい史実日を生成しない。
 const recordHandoff=u=>{const names=new Set((u.commanders||u.gens.map(id=>G.gen(id)?.n)).map(canonical)),end=dateEnd(u);return (TK.DOCUMENTED_MARCHES||[]).filter(r=>r.names.some(n=>names.has(canonical(n)))&&G.evT({d:r.start})>=G.S().t&&G.evT({d:r.start})<=end).sort((a,b)=>G.evT({d:a.start})-G.evT({d:b.start}))[0];};
 G.documentedPerson=n=>(G.documentedArmies?.()||[]).some(u=>u.commanders.some(m=>canonical(m)===canonical(n)));
 const corridorFor=u=>{if(!TK.HISTORY_ONLY||u.histRet||u.state==='return'||u.mission==='return')return null;const names=(u.commanders||u.gens?.map(id=>G.gen(id)?.n)||[]).map(canonical);return (TK.CAMPAIGN_CORRIDORS||[]).find(r=>r.title===(u.until||u.historyTitle)&&r.commanders.some(n=>names.includes(canonical(n))));};
 let corridorState;const corridorLines=new Map();
 G.historyTravelLine=function(u,A,B){const r=corridorFor(u);if(!r)return G.visualBetween(A,B);if(corridorState!==G.S()){corridorState=G.S();corridorLines.clear();}const key=r.id+'|'+A.join(',')+'|'+B.join(',');let line=corridorLines.get(key);if(!line){const points=[A,...r.waypoints.map(w=>G.PJ(...w.point)),B];line=[];for(let i=1;i<points.length;i++)line.push(...G.visualBetween(points[i-1],points[i]).slice(line.length?1:0));corridorLines.set(key,line);}u.corridorId=r.id;u.routeSourceIds=r.sourceIds;u.routeNote=r.routeNote;u.routeCertainty=r.status;u.routeReference={personIds:r.personIds,locationIds:r.referenceLocationIds,sourceIds:r.sourceIds,use:r.referenceUse};return line;};
 // 概略進路を採用する軍の出発判定も、その距離を使う。22km/日は推定のゲーム係数。
 G.historicalMarchDays=function(ev,who,src,to){const probe={until:ev.title,gens:who?[who.id]:[],commanders:[ev.marchWho||who?.n]},r=corridorFor(probe);if(!r)return 0;const A=G.C[src],B=G.battleArrivalPoint(probe)||[G.C[to].x,G.C[to].y],line=G.historyTravelLine(probe,[A.x,A.y],B);return Math.ceil(G.visualPathLength(line)*111.32/200/r.marchKmPerDay);};
 const geo=G.historyGeometry;G.historyGeometry=u=>u.visualTravel?.line||u.visualRouteLine||geo(u);
 // 時刻付き記録のない軍も、次の日次計算と同じ進捗を道上で補間する。
 const nativeForecasts=new WeakMap();
 G.nativeMarchPoint=function(u){if(u.state!=='march'||!u.path[u.seg+1])return null;const a=u.path[u.seg],b=u.path[u.seg+1],e=G.EDGES[G.ekey(a,b)];if(!e)return null;const state=G.S(),key=[state.t,u.seg,u.pos,u.food,u.troops,u.days,u.marchDays,u.spd,u.mission,u.stopAt,u.clan].join('|');let forecast=nativeForecasts.get(u);if(!forecast||forecast.state!==state||forecast.path!==u.path||forecast.key!==key){
  const v={...u,days:(u.days||0)+1,marchDays:(u.marchDays??0)+1,_marchMonth:G.date(G.S().t+1).m};
  v.food=Math.max(0,u.food-u.troops*.012*(G.yoshoEffects?G.yoshoEffects(u,a,b,e).food:1));
  let end=u.pos+(G.marchFactors(v,a,b)?.speed||1)/e.days*(u.spd||1);
  if(u.mission==='show'&&u.seg>=u.path.length-2)end=Math.min(end,u.stopAt||.6);
  if(u.seg===u.path.length-2&&end>=.86&&end<1){const owner=G.S().castles[b].owner;if(owner!==u.clan&&!G.allied(owner,u.clan))end=1;}
  forecast={state,path:u.path,key,end:Math.min(1,end)};nativeForecasts.set(u,forecast);}
  const f=Math.max(0,Math.min(1,G.visualTime()-G.S().t));return G.visualEdgePoint(a,b,u.pos+(forecast.end-u.pos)*f);
 };
 const hp=G.historyPoint;
 G.historyPoint=function(u){if(u.battlePoint)return [...u.battlePoint,u.battleAngle??null];if(u.visualTravel){const q=u.visualTravel,t=G.visualTime();return G.visualPathPoint(q.line,(t-q.start)/Math.max(1,q.end-q.start));}if(u.schedule&&u.hist&&!u.histRet&&u.state!=='return'&&u.path.length>1){const q=u.schedule,weights=q.weights||[],total=weights.reduce((a,b)=>a+b,0);if(total){let d=total*Math.max(0,Math.min(1,(G.visualTime()-q.start)/Math.max(1,q.end-q.start))),seg=0;while(seg<weights.length-1&&d>weights[seg])d-=weights[seg++];const v={...u,seg,pos:d/(weights[seg]||1)};return hp(v)||G.visualEdgePoint(u.path[seg],u.path[seg+1],v.pos);}}return hp(u)||G.nativeMarchPoint(u);};
 G.personPoint=function(g){const documented=(G.documentedArmies?.()||[]).find(u=>u.commanders.some(n=>canonical(n)===canonical(g.n)));if(documented)return G.historyPoint(documented);if(g.tr?.line)return G.visualPathPoint(g.tr.line,(G.visualTime()-g.tr.t0)/Math.max(1,g.tr.t1-g.tr.t0));const u=G.S().units.find(u=>u.gens.includes(g.id));if(u)return G.historyPoint(u)||G.visualEdgePoint(u.path[u.seg],u.path[Math.min(u.seg+1,u.path.length-1)],u.pos);const c=G.C[g.loc];return c?[c.x,c.y,null]:null;};
 // エンジン日次冒頭の再追跡で、日末に採った位置を日初の位置に戻さない。
 G.trackContinuousMoves=function(){if(G._continuousDayAdvance)return;const s=G.S();if(s.player==='__none'&&!G.auditVisualMoves)return;const byGen=new Map();for(const u of s.units)for(const id of u.gens)byGen.set(id,u);for(const u of G.documentedArmies?.()||[])for(const n of u.commanders){const g=G.genByName(n);if(g)byGen.set(g.id,u);}
  for(const g of s.gens){if(g.dead){g.tr=null;continue;}const u=byGen.get(g.id),previous=g._visualPoint;
   if(u){const key=u.path.join('>')+'|'+u.until+'|'+(u.histRet?'return':'out')+'|'+(u.schedule?.start||0);
    if(u.hist&&(u.mission==='show'&&u.until||u.histRet||u.state==='return')&&!u.record&&u._visualRouteKey!==key){{const origin=G.C[u.path[0]],from=previous||[origin.x,origin.y],returning=u.histRet||u.state==='return',handoff=!returning&&recordHandoff(u),recordPoint=handoff&&(handoff.point||handoff.track?.[0]||handoff.stops?.[0]?.slice(1)),target=(recordPoint&&G.PJ(...recordPoint))||(!returning&&G.battleArrivalPoint(u))||[G.C[u.path.at(-1)].x,G.C[u.path.at(-1)].y],line=G.historyTravelLine(u,from.slice(0,2),target),start=previous?Math.max(s.t,returning?s.t:u.schedule?.start||s.t):(u.schedule?.start??s.t),end=returning?s.t+Math.max(1,Math.ceil(G.visualPathLength(line)*111.32/200/30)):(handoff?G.evT({d:handoff.start}):dateEnd(u));u.visualRouteLine=line;if(end>start&&line.length>1)u.visualTravel={line,start,end};}u._visualRouteKey=key;}
    const p=G.historyPoint(u)||G.visualEdgePoint(u.path[u.seg],u.path[Math.min(u.seg+1,u.path.length-1)],u.pos);g._visualPoint=p.slice(0,2);g.tr=null;g.lu=true;
   }else{const target=G.C[g.loc];if(target&&previous&&(g.lu||g.ll&&g.ll!==g.loc||!g.tr&&Math.hypot(target.x-previous[0],target.y-previous[1])>1e-6)){
     const line=G.visualBetween(previous.slice(0,2),[target.x,target.y]),length=G.visualPathLength(line),days=Math.max(1,Math.ceil(length*111.32/200/30));
     if(length>1e-6)g.tr={p:[g.ll||g.loc,g.loc],line,t0:s.t,t1:s.t+days};
    }
    if(g.tr&&s.t>=g.tr.t1){const end=G.visualPathPoint(g.tr.line,1),distance=target?Math.hypot(end[0]-target.x,end[1]-target.y):0;if(distance>1e-6){const line=G.visualBetween(end.slice(0,2),[target.x,target.y]);g.tr={p:[g.loc,g.loc],line,t0:s.t,t1:s.t+Math.max(1,Math.ceil(G.visualPathLength(line)*111.32/200/30))};}else g.tr=null;}
    // 時点付き行軍の最初の観測地点へ、既存道路で接続する。中間日は表示用の推定。
    if(!g.tr&&target&&previous){const r=(TK.DOCUMENTED_MARCHES||[]).filter(r=>!r.point&&r.names.some(n=>canonical(n)===canonical(g.n))&&G.evT({d:r.start})>s.t&&G.evT({d:r.start})<=s.t+90).sort((a,b)=>G.evT({d:a.start})-G.evT({d:b.start}))[0];if(r){const dest=G.PJ(...(r.track?.[0]||r.stops[0].slice(1))),end=G.evT({d:r.start});if(Math.hypot(previous[0]-dest[0],previous[1]-dest[1])>1e-6){const line=G.visualBetween(previous.slice(0,2),dest),days=Math.ceil(G.visualPathLength(line)*111.32/200/22);if(days>0&&end-s.t<=days)g.tr={p:[g.loc,r.from],line,t0:s.t,t1:end,planned:r.title,anchorRecord:r.id,estimated:true,sourceIds:r.source};}}}
    if(!g.tr&&target&&previous){const next=(events.get(canonical(g.n))||[]).find(e=>G.visualEventTime(e)>s.t&&G.visualEventTime(e)<=s.t+90),to=next&&(next.castles?.[0]||next.at);if(next&&G.C[to]&&to!==g.loc&&G.visualEventTime(next)-s.t<=Math.ceil(Math.hypot(G.C[to].x-target.x,G.C[to].y-target.y)*111.32/200/22*2)+3){const end=G.visualEventTime(next),probe={until:next.title,gens:[g.id]},dest=G.battleArrivalPoint(probe)||[G.C[to].x,G.C[to].y],line=G.visualBetween([target.x,target.y],dest),days=Math.ceil(G.visualPathLength(line)*111.32/200/22);if(days>0&&end-s.t<=days)g.tr={p:[g.loc,to],line,t0:s.t,t1:end,planned:next.title};}}
    const p=g.tr?.line?G.visualPathPoint(g.tr.line,(s.t-g.tr.t0)/Math.max(1,g.tr.t1-g.tr.t0)):target?[target.x,target.y]:null;if(p)g._visualPoint=p.slice(0,2);g.lu=false;
   }g.ll=g.loc;
  }
 };
 const day=G.day;G.day=function(){G._inSimulation=true;try{if(G.S().player!=='__none'||G.auditVisualMoves){G._visualSampleTime=G.S().t+1;for(const g of G.S().gens){if(g.dead||!g._visualPoint)continue;const p=G.personPoint(g);if(p)g._visualPoint=p.slice(0,2);}G._visualSampleTime=null;}G._continuousDayAdvance=true;try{day();}finally{G._continuousDayAdvance=false;}G.trackContinuousMoves();}finally{G._visualSampleTime=null;G._inSimulation=false;}};
 const init=G.newGame;G.newGame=function(...a){const s=init(...a);for(const g of s.gens){delete g._visualPoint;g.ll=g.loc;g.lu=false;g.tr=null;}for(const u of s.units){delete u._visualRouteKey;delete u.visualTravel;}G.trackContinuousMoves();return s;};
})();
