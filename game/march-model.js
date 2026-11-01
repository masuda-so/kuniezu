"use strict";
/* 地形の負荷と史実の日程を分離。日程のある軍を雪や推定速度で遅刻させない。 */
(function(){
G.marchFactors=function(u,a,b){const e=G.EDGES[G.ekey(a,b)];if(!e)return null;const month=u._marchMonth??G.date().m;
 const snow=(!e.sea&&(month===12||month<=2)&&(G.C[a].snow||G.C[b].snow))?.45:1;
 const supply=u.food<=0?.55:1,fatigue=1-Math.min(.25,Math.max(0,(u.marchDays??u.days??0)-7)*.005);
 const scale=1/(1+.1*Math.log2(1+Math.max(0,u.troops||0)/3000)*(1+.6*(e.rough||0)));
 return {days:e.days/(snow*supply*fatigue*scale),speed:snow*supply*fatigue*scale,
  factors:[['道筋',e.sea?'海路':e.road?e.roads.join('・'):'街道未照合の連絡線'],['地勢',`起伏 ${Math.round(e.rough*100)}・既存所要日数に反映`],['渡河',`${e.river||0}箇所・既存所要日数に反映`],['冬季',snow===1?'追加負荷なし':'積雪地域の速度 ×0.45'],['補給',supply===1?'兵糧あり':'兵糧不足 ×0.55'],['疲労',`速度 ×${fatigue.toFixed(2)}`],['隊列',`兵数による速度 ×${scale.toFixed(2)}`]],
  note:'係数はゲーム上の仮定。個別日の降雨・積雪・橋・渡船の稼働は未確認。史実行軍は記録の日程を優先。'};
};
G.scheduleHistorical=function(u){const s=G.S();if(!u.hist||u.mission!=='show'||!u.until||u.until==='#hold')return false;
 const ev=TK.HIST.find(e=>e.title===u.until&&e.k!=='premarch');if(!ev)return false;
 if(!u.schedule||u.schedule.key!==u.until){u.schedule={key:u.until,start:u.depart?G.evT({d:u.depart}):s.t,end:u.arrive?G.evT({d:u.arrive}):G.evT(ev)};u.historyTitle=u.until;}
 const q=u.schedule,pathKey=u.path.join('>');
 // 日々の疲労や季節の切替で重みが変わると、同じ道の上を逆戻りしてしまう。出発時に固定する。
 if(q.pathKey!==pathKey){q.pathKey=pathKey;q.weights=u.path.slice(1).map((b,i)=>G.marchFactors(u,u.path[i],b)?.days||1);}
 const weights=q.weights,total=weights.reduce((a,b)=>a+b,0);
 const progress=s.t>=q.end?1:Math.max(0,Math.min(1,(s.t-q.start)/Math.max(1,q.end-q.start)));let dist=total*progress,seg=0;
 while(seg<weights.length-1&&dist>weights[seg])dist-=weights[seg++];
 u.seg=progress>=1?weights.length-1:seg;u.pos=progress>=1?1:Math.min(1,dist/(weights[seg]||1));u.state=progress>=1||s.t<q.start?'camp':'march';
 return true;
};
G.marchPhase=u=>{const s=G.S(),q=u.schedule;if(q&&s.t<q.start)return {key:'waiting',name:'出陣前・待機'};if(u.histRet||u.state==='return')return {key:'return',name:'帰陣'};if(u.state==='siege')return {key:'siege',name:'攻囲'};if(u.state==='battle')return {key:'battle',name:'交戦'};if(q&&s.t>=q.end||u.state==='camp')return {key:'camp',name:'着陣・滞陣'};return {key:'march',name:'行軍中'};};
const routeCache=new Map();
const imagawaApproach=u=>G.gen(u.gens[0])?.n==='今川義元'&&u.historyTitle==='桶狭間の戦い'&&u.until;
G.marchDestination=u=>imagawaApproach(u)?'沓掛城（合戦前日の宿営）':G.cname(u.path.at(-1));
G.historyGeometry=function(u){if(!imagawaApproach(u)||u.seg<u.path.length-2)return null;
 const site=G.YOSHO.find(y=>y.n==='沓掛城');if(!site)return null;
 const a=u.path[u.seg],b=u.path[u.seg+1],key=a+'>'+b+':'+site.x+':'+site.y;
 if(routeCache.has(key))return routeCache.get(key);
 // 東海道の概略線を沓掛に最も近い地点までたどり、最後は城跡へ接続する。
 const geo=G.edgeGeo(a,b);let best=0,bd=Infinity,foot=geo[0];
 for(let i=1;i<geo.length;i++){const p=geo[i-1],q=geo[i],dx=q[0]-p[0],dy=q[1]-p[1],t=Math.max(0,Math.min(1,((site.x-p[0])*dx+(site.y-p[1])*dy)/(dx*dx+dy*dy||1))),v=[p[0]+dx*t,p[1]+dy*t],d=Math.hypot(site.x-v[0],site.y-v[1]);if(d<bd){bd=d;best=i;foot=v;}}
 const line=[...geo.slice(0,best),foot,[site.x,site.y]];routeCache.set(key,line);return line;
};
G.historyPoint=function(u){const line=G.historyGeometry(u);if(!line)return null;const lens=line.slice(1).map((p,i)=>Math.hypot(p[0]-line[i][0],p[1]-line[i][1]));let d=lens.reduce((a,b)=>a+b,0)*u.pos,i=0;while(i<lens.length-1&&d>lens[i])d-=lens[i++];const p=line[i],q=line[i+1],t=d/(lens[i]||1);return [p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t,Math.atan2(q[1]-p[1],q[0]-p[0])];};
const hist=G.hist;
G.hist=function(){for(const u of G.S().units)G.scheduleHistorical(u);hist();for(const u of G.S().units)G.scheduleHistorical(u);};
})();
