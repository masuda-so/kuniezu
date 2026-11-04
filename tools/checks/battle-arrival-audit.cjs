/* 再生通知・参加名・陣営・位置を全期間で突合。史料照合の代用にはしない。 */
const fs=require('node:fs'),{G,TK,TKGEO}=require('./history-focus.cjs').model();
G.newGame('s1560','oda');G.S().player='__none';G.auditVisualMoves=true;G.trackContinuousMoves();
const canonical=n=>TK.PORTRAIT_ALIAS[n]||n||'';
const rows=new Map(Object.entries(TK.BATTLES).map(([title,b])=>[title,{title,kind:b.deploymentKind,category:b.presentationCategory||null,eventDate:b.eventDate,expected:b.eventDate?G.evT({d:b.eventDate}):null,sources:b.sources,observations:[]}]));
const targetDays=new Set([...rows.values()].map(r=>r.expected).filter(Number.isFinite));
function snapshot(t,phase){const out=[];G._visualSampleTime=t;try{
 for(const u of [...(G.visibleNativeArmies?.()||G.S().units),...(G.documentedArmies?.()||[])]){
  const p=G.historyPoint(u);out.push({id:u.id,samplePhase:phase,title:u.until||u.historyTitle||null,clan:u.clan,names:u.commanders||u.gens.map(id=>G.gen(id)?.n).filter(Boolean),state:u.state,schedule:u.schedule&&{start:u.schedule.start,end:u.schedule.end},record:u.record?.id,troops:u.troops,point:p?.slice(0,2),path:u.path});
 }
}finally{delete G._visualSampleTime;}return out;}
function inside(point,bounds){if(!point||!bounds)return null;const [lo,la]=[TKGEO.LON0+point[0]/TKGEO.K/TKGEO.CX,TKGEO.LAT0-point[1]/TKGEO.K];return lo>=bounds[0]&&lo<=bounds[2]&&la<=bounds[1]&&la>=bounds[3];}
function classify(title,armies){const b=TK.BATTLES[title],bounds=TK.BATTLE_ATLAS[title]?.bounds,units=[],sides={a:{direct:[],clanOnly:[],inFrame:[],locatedGroups:0,unlocatedGroups:0},b:{direct:[],clanOnly:[],inFrame:[],locatedGroups:0,unlocatedGroups:0}};
 for(const g of b.atlasGroups||[])if(sides[g.side])sides[g.side][g.point?'locatedGroups':'unlocatedGroups']++;
 const names=new Set(b.units.map(v=>canonical(v.g||v.n)));
 for(const u of armies){const ns=u.names.map(canonical),direct=b.units.filter(v=>ns.includes(canonical(v.g||v.n)));if(u.title!==title&&!ns.some(n=>names.has(n)))continue;
  const directSides=[...new Set(direct.map(v=>v.side))],clanSides=directSides.length?[]:['a','b'].filter(side=>b.sides[side]?.clan===u.clan||b.units.some(v=>v.side===side&&v.clan===u.clan));
  const assigned=directSides.length?directSides:clanSides.length===1?clanSides:[],within=inside(u.point,bounds),row={...u,matchingSides:assigned,matchBasis:directSides.length?'commander-name':assigned.length?'clan-only':'unassigned',insideReplayFrame:within};units.push(row);
  for(const side of assigned)if(sides[side]){sides[side][directSides.length?'direct':'clanOnly'].push(u.id);if(within)sides[side].inFrame.push(u.id);}
 }
 for(const side of Object.values(sides))for(const key of ['direct','clanOnly','inFrame'])side[key]=[...new Set(side[key])];
 return {units,sides,unmatchedSides:['a','b'].filter(s=>!sides[s].direct.length&&!sides[s].clanOnly.length),sidesOutsideFrame:['a','b'].filter(s=>(sides[s].direct.length||sides[s].clanOnly.length)&&!sides[s].inFrame.length)};
}
const end=G.evT({d:[1615,12,30]}),alerts=[];
while(G.S().t<end){const next=G.S().t+1,before=targetDays.has(next)?snapshot(next,'before-event'):[];G.day();const after=(G.S().sceneQ||[]).length?snapshot(G.S().t,'after-event'):[],seen=new Set();
 for(const q of G.S().sceneQ||[]){const title=q.title||q,row=rows.get(title);if(!row||seen.has(title))continue;seen.add(title);const unique=new Map();for(const u of [...before,...after])if(!unique.has(u.id+'|'+u.samplePhase))unique.set(u.id+'|'+u.samplePhase,u);const classified=classify(title,[...unique.values()]),ob={date:G.date(),t:G.S().t,triggerT:q.t??G.S().t,...classified};row.observations.push(ob);
  if(row.category!=='march'&&row.kind!=='campaign')for(const u of ob.units)if(u.title===title&&u.schedule?.end>ob.triggerT)alerts.push({title,names:u.names,trigger:ob.date,scheduledEnd:G.date(u.schedule.end),lateDays:u.schedule.end-ob.triggerT});
 }
 for(const q of ['evQ','sceneQ','battleQ','propQ','prisonQ','observerQ'])G.S()[q]=[];
}
const all=[...rows.values()],missing=all.filter(r=>!r.observations.length).map(r=>r.title),unmatched=all.filter(r=>r.observations.length&&!r.observations.some(o=>o.units.some(u=>u.title===r.title))).map(r=>({title:r.title,noncombat:r.category==='march'||r.kind==='campaign'}));
const sideCandidates=all.flatMap(r=>r.observations.filter(o=>o.unmatchedSides.length||o.sidesOutsideFrame.length).map(o=>({title:r.title,date:o.date,noncombat:r.category==='march'||r.kind==='campaign',unmatchedSides:o.unmatchedSides,sidesOutsideFrame:o.sidesOutsideFrame})));
const result={visualTrackingEnabled:G.auditVisualMoves===true,scope:'1560〜1615年末の実行照合。同名目的の軍に加え、登録参加将名の別戦役軍も抽出。陣営は名前一致/家のみ推定を区別。表示範囲外は不在・遅着の確定ではなく照合候補。地形枠自体の史実精度も別。',registered:all.length,observed:all.length-missing.length,missing,withoutMatchingTitle:unmatched,sideCandidates,alerts,battles:all};
fs.writeFileSync('data/audits/battle-arrival-audit.json',JSON.stringify(result,null,2)+'\n');
fs.writeFileSync('data/audits/battle-arrival-side-candidates.json',JSON.stringify({scope:'画面用の連続移動を有効にした照合候補。範囲外・不対応は史実上の遅着や不在の証明ではない。',visualTrackingEnabled:true,bothSidesUnmatched:sideCandidates.filter(r=>r.unmatchedSides.length===2).length,oneSideUnmatched:sideCandidates.filter(r=>r.unmatchedSides.length===1).length,someSideOutsideFrame:sideCandidates.filter(r=>r.sidesOutsideFrame.length).length,candidates:sideCandidates},null,2)+'\n');console.log(JSON.stringify({registered:all.length,observed:all.length-missing.length,missing,withoutMatchingTitle:unmatched,sideCandidateCount:sideCandidates.length,lateArrivalCount:alerts.length},null,2));
