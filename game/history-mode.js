"use strict";
/* 現行版は史実の観察専用。旧分岐コードは archive/ に退避し読まない。 */
TK.FORKS=[];TK.ARCS={};TK.INCIDENTS=[];
(function(){
 const none=()=>null;
 G.events=function(){const s=G.S();s.evQ=[];s.battleQ=[];s.propQ=[];s.prisonQ=[];};
 G.decideCheck=none;G.eventView=none;G.chooseEvent=none;G.altResolve=none;
 const refused=()=>({ok:false,msg:'現在は史実の観察専用です。'});
 for(const key of ['attackBranch','withdrawBranch','cmd','startWork','ryugen','hikinuki','recruit','negaeri','truce','shinzen','proposeAlly','submitTo','demandVassal'])G[key]=refused;
 for(const key of ['launch','moveGen','hobi','hobi2','breakAlly','becomeIndependent','diverge','arcOff','aiMilitary','branchAI'])G[key]=none;
 const init=G.newGame;
 G.newGame=function(...args){const s=init(...args);s.historyOnly=1;s.settings={...s.settings,fiction:false,battleScene:false,relief:false,scenes:'mine',scenePolicyVersion:2};s.auto=false;for(const u of s.units)G.scheduleHistorical?.(u);return s;};
 const set=G.setS;
 G.setS=function(s){
  // 分岐済み保存を黙って別の歴史に変換しない。元の保存はそのまま残す。
  if(s&&(Object.values(s.div||{}).some(Boolean)||(s.arcs||[]).length||(s.altQ||[]).length||Object.keys(s.branches||{}).length))throw Error('非史実ルートの保存は観察専用版では読み込めません。元の保存は残っています。');
  if(s){s.historyOnly=1;s.settings={...s.settings,fiction:false,battleScene:false,relief:false};if(!s.settings.scenePolicyVersion){if(s.settings.scenes!==false)s.settings.scenes='mine';s.settings.scenePolicyVersion=2;}s.evQ=[];s.battleQ=[];s.propQ=[];s.auto=false;}
  return set(s);
 };
 G.sceneIsRelevant=function(b,k){return !!k&&k!=='unknown'&&(b.participantClans||[b.sides?.a?.clan,b.sides?.b?.clan,...(b.units||[]).map(u=>u.clan)]).includes(k);};
})();
