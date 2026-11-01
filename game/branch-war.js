"use strict";
/* 支城へも通常の軍勢を送り、共通の攻城式・兵糧・武将・撤退を使う。 */
(function(){
 const previousOffer=G.branchOffer,previousDay=G.branchDay;
 const site=id=>G.YOSHO.find(y=>y.id===id&&y.kind==='城');
 G.branchUnit=id=>G.S().units.find(u=>u.branch===id&&u.mission==='attack');
 G.branchInfo=function(id){const S=G.S(),y=site(id);if(!y)return null;const c=S.castles[y.at],owner=G.yOwner(y),stored=S.branchGarrisons?.[id];
  if(stored&&stored.owner===owner&&stored.base===c.owner)return stored;
  return {owner,base:c.owner,troops:owner===c.owner?Math.floor(Math.min(800,c.troops*.15)):0,dur:450,durMax:450,morale:65,train:c.train};
 };
 G.branchOffer=function(id,k=G.S().player,tac='chikara'){const S=G.S(),r=previousOffer(id,k);if(!r.ok)return r;
  if(G.branchUnit(id))return {ok:false,msg:'すでに軍勢が攻略に向かっています。'};
  const candidates=[r.y.at,...G.ADJ[r.y.at]].filter(at=>S.castles[at].owner===k&&S.castles[at].troops>=2000&&G.idleGens(at).length&&!G.unitAt(at).some(u=>u.clan!==k));
  candidates.sort((a,b)=>S.castles[b].troops-S.castles[a].troops);if(!candidates.length)return {ok:false,msg:'領内か隣接する自城に、兵2,000以上と出陣できる武将が必要です。'};
  const from=candidates[0],troops=Math.min(10000,Math.floor(S.castles[from].troops*.6/100)*100),food=Math.round(troops*.012*(tac==='hyoro'?180:90));
  if(S.clans[k].food<food)return {ok:false,msg:`出陣の兵糧${food}が必要です。`};
  return {...r,from,troops,food,days:null,loss:null,gids:G.idleGens(from).sort((a,b)=>(b.t+b.b)-(a.t+a.b)).slice(0,2).map(g=>g.id)};
 };
 G.attackBranch=function(id,k=G.S().player,tac='chikara'){const S=G.S(),r=G.branchOffer(id,k,tac);if(!r.ok)return r;if(!G.TACTICS[tac])return {ok:false,msg:'攻め方を選んでください。'};
  S.branchGarrisons=S.branchGarrisons||{};const y=r.y,guard=G.branchInfo(id);
  if(!S.branchGarrisons[id]||S.branchGarrisons[id].owner!==guard.owner||S.branchGarrisons[id].base!==guard.base){if(guard.owner===S.castles[y.at].owner)S.castles[y.at].troops-=guard.troops;S.branchGarrisons[id]=guard;}
  // 支城の占領者は本城の領主と異なる場合がある。外交判定も占領者に対して行う。
  const u=G.launch(k,r.from,y.at,r.gids,r.troops,r.food,'branch',tac);
  if(!u)return {ok:false,msg:'行軍経路を確保できませんでした。'};
  u.branch=id;u.branchBase=S.castles[y.at].owner;u.mission='attack';S.clans[k].gold-=200;
  S.war=S.war||{};S.war[G.ekey(k,r.owner)]=S.t;G.addRel(k,r.owner,-15);G.diverge(k,'branch');G.diverge(r.owner,'branch');
  G.chron({alt:true,title:y.n+'へ出陣',text:`${G.gen(r.gids[0]).n}ら${Math.round(r.troops)}が${G.TACTICS[tac].n}に向かった。日数と損害は行軍・兵糧・武将・守備兵によって変わる。`,d:G.date()},true);
  return {ok:true,msg:y.n+'へ軍勢を送りました。',unit:u.id};
 };
 G.branchArrive=function(u){const y=site(u.branch);if(!y){G._retreat(u);return;}u.state='branch-march';u.pos=0;u.seg=u.path.length-1;u.branchLeg=Math.max(1,Math.hypot(y.x-G.C[y.at].x,y.y-G.C[y.at].y)/25);};
 G.branchRetreat=function(u){u.mission='return';u.branchReturn=true;u.state='branch-return';u.pos=0;};
 G.withdrawBranch=function(id,k=G.S().player){const u=G.branchUnit(id);if(!u||u.clan!==k)return {ok:false,msg:'自家の攻略中の軍勢ではありません。'};if(u.state==='battle')return {ok:false,msg:'野戦の采配が終わってから撤退してください。'};if(u.state.startsWith('branch-'))G.branchRetreat(u);else G._retreat(u);return {ok:true,msg:'軍勢に撤退を命じました。'};};
 G.branchXY=function(u){const y=site(u.branch);if(!y)return null;const p=G.C[y.at],f=u.state==='branch-siege'?1:u.state==='branch-return'?1-u.pos:u.pos;return [p.x+(y.x-p.x)*f,p.y+(y.y-p.y)*f,Math.atan2(y.y-p.y,y.x-p.x)];};
 G.branchDay=function(){previousDay();const S=G.S();for(const [id,d] of Object.entries(S.branchGarrisons||{})){const y=site(id);if(!y||G.yOwner(y)!==d.owner||S.castles[y.at].owner!==d.base)delete S.branchGarrisons[id];}
  for(const u of S.units.slice()){
   if(!u.branch||!['branch-march','branch-siege','branch-return'].includes(u.state))continue;const y=site(u.branch);
   if(u.state==='branch-return'){u.pos+=1/(u.branchLeg||1);if(u.pos>=1){u.state='siege';G._retreat(u);}continue;}
   const owner=y&&G.yOwner(y);if(!y||!G.yActive(y)||!S.clans[u.clan]?.alive||S.castles[y.at].owner!==u.branchBase||G.allied(u.clan,owner)||owner===u.clan){G.branchRetreat(u);continue;}
   if(u.state==='branch-march'){u.pos+=1/(u.branchLeg||1);if(u.pos>=1){u.pos=1;u.state='branch-siege';}continue;}
   const d=G.branchInfo(y.id);S.branchGarrisons=S.branchGarrisons||{};S.branchGarrisons[y.id]=d;
   const a=G.unitStats(u),r=G.siegeStep({tr:u.troops,t:a.t,b:a.b,mor:u.morale,train:u.train},{tr:d.troops,t:45,b:45,mor:d.morale,train:d.train},d.dur>0,u.tac);
   const terrain=/山城/.test(y.desc)&&!/平山城/.test(y.desc)?1.35:/平山城/.test(y.desc)?1.15:1;
   d.dur=Math.max(0,d.dur-r.dDur/terrain);d.troops=Math.max(0,d.troops-r.dLoss/terrain);d.morale=Math.max(0,d.morale-r.dMor);u.troops=Math.max(0,u.troops-r.aLoss*terrain);u.morale=Math.max(0,u.morale-r.aMor);
   if(u.troops<u.troops0*.3||u.morale<15){G.chron({alt:true,title:y.n+'から撤退',text:'損害または士気の低下で攻城を続けられなくなった。',d:G.date()},true);G.branchRetreat(u);continue;}
   if(d.troops<=0||d.morale<=8){const troops=Math.min(500,Math.floor(u.troops*.2));u.troops-=troops;S.branches=S.branches||{};S.branches[y.id]={owner:u.clan,base:S.castles[y.at].owner};S.branchGarrisons[y.id]={...d,owner:u.clan,troops,morale:60,dur:Math.max(100,d.dur)};
    G.chron({alt:true,title:y.n+'を攻略',text:`${G.CNK(u.clan)}が守備兵${troops}を置き、残る軍勢は帰還する。`,d:G.date()},true);G.branchRetreat(u);}
  }
 };
 const income=G.monthIncome;G.monthIncome=function(k){const r=income(k);for(const [id,d] of Object.entries(G.S().branchGarrisons||{})){const y=site(id);if(y&&G.yOwner(y)===k)r.food+=Math.round(d.troops*.07);}return r;};
})();
